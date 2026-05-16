# Runbook 01 — Running a Database Migration Safely

**Applies to**: any Alembic schema change on a live PATHS instance.

---

## Golden rules

1. **Migrations run before code deploys** — the new binary must be able to
   start against the migrated schema.
2. **Never edit a migration that's been applied to production** — create a
   new one that corrects it.
3. **All DDL is transactional** (PostgreSQL) — if a migration fails mid-way,
   Alembic rolls back automatically.  Verify with `alembic history`.
4. **Large table changes need zero-downtime patterns** — see the relevant
   section below.

---

## Standard workflow

```bash
# 1. Create the migration (auto-generates from ORM models)
alembic revision --autogenerate -m "add_column_foo_to_bar"

# 2. Review the generated file in alembic/versions/
#    Confirm the upgrade() and downgrade() are correct.
#    Pay special attention to:
#      - NOT NULL columns on large tables (see below)
#      - Index creation on tables with millions of rows (use CONCURRENTLY)
#      - Any DROP TABLE / DROP COLUMN (irreversible)

# 3. Test on a copy of the staging database
DATABASE_URL=<staging-copy-url> alembic upgrade head

# 4. If the test passes, run on staging
fly ssh console --app paths-backend-staging -C "alembic upgrade head"

# 5. Deploy the new backend image (migrations already applied)
fly deploy --app paths-backend-staging

# 6. Run on production immediately before the production deploy
fly ssh console --app paths-backend -C "alembic upgrade head"
fly deploy --app paths-backend
```

---

## Adding a NOT NULL column to a large table

Naively adding a NOT NULL column forces PostgreSQL to rewrite the entire table,
acquiring an ACCESS EXCLUSIVE lock that blocks all reads and writes.

**Safe pattern** (three separate migrations):

```python
# Migration 1 — add as nullable
op.add_column("candidates", sa.Column("new_col", sa.String, nullable=True))

# Migration 2 — backfill existing rows
op.execute("UPDATE candidates SET new_col = 'default' WHERE new_col IS NULL")

# Migration 3 — add NOT NULL constraint (after backfill)
op.alter_column("candidates", "new_col", nullable=False)
```

Deploy and verify between each step.

---

## Adding an index to a large table

Use `CONCURRENTLY` to avoid locking:

```python
op.create_index(
    "ix_candidates_email",
    "candidates",
    ["email"],
    postgresql_concurrently=True,
)
```

Note: `CONCURRENTLY` cannot run inside a transaction.  Add
`transaction_per_migration = False` to the `alembic.ini` if required, or
run the `CREATE INDEX` manually and mark the migration as applied.

---

## Rolling back

```bash
# Roll back one migration
alembic downgrade -1

# Roll back to a specific revision
alembic downgrade <revision_id>

# Roll back all
alembic downgrade base
```

Verify with: `alembic current`

---

## Checking migration state in production

```bash
fly ssh console --app paths-backend -C "alembic current"
fly ssh console --app paths-backend -C "alembic history --verbose"
```

---

## Apache AGE graph migrations

AGE graph operations (adding vertex/edge labels, indexes on properties) are
not handled by Alembic's autogenerate.  Add them manually in the migration:

```python
def upgrade():
    op.execute("SELECT create_vlabel('paths_graph', 'Skill')")
    op.execute(
        "SELECT * FROM ag_catalog.create_graph_path_index("
        "  'paths_graph', 'Candidate', 'id')"
    )
```

Always wrap in `try/except` in case the label already exists on some instances.
