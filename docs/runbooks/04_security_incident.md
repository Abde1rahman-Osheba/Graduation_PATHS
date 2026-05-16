# Runbook 04 — Security Incident Response

Covers: suspected credential leak, active intrusion, key rotation,
and breach notification obligations.

---

## Severity tiers

| Tier | Description | Response time |
|---|---|---|
| P0 | Active intrusion / data exfiltration in progress | Immediate — escalate now |
| P1 | Confirmed credential leak (API key, JWT secret) | < 1 hour |
| P2 | Suspicious activity (anomalous logins, unexpected API usage) | < 4 hours |
| P3 | Potential vulnerability identified (no confirmed exploitation) | < 24 hours |

---

## P0 / P1 — Immediate containment

### 1. Revoke compromised credentials

```bash
# Rotate JWT secret key (invalidates ALL active sessions)
fly secrets set SECRET_KEY="$(openssl rand -hex 32)" --app paths-backend
fly deploy --app paths-backend

# Rotate Stripe keys (in Stripe Dashboard → Developers → API keys)
fly secrets set STRIPE_SECRET_KEY=sk_live_NEW_KEY --app paths-backend
fly secrets set STRIPE_WEBHOOK_SECRET=whsec_NEW_SECRET --app paths-backend

# Rotate OpenRouter key (in OpenRouter Dashboard)
fly secrets set OPENROUTER_API_KEY=sk-or-NEW_KEY --app paths-backend

# Rotate Qdrant API key (in Qdrant Cloud Dashboard)
fly secrets set QDRANT_API_KEY=NEW_KEY --app paths-backend

fly deploy --app paths-backend
```

### 2. Force all users to re-authenticate

Rotating `SECRET_KEY` invalidates all JWTs.  All users will be logged out
on their next request.

### 3. If an admin account is compromised

```sql
-- Deactivate the compromised account immediately
UPDATE users SET is_active = false
WHERE id = '<compromised_user_id>';

-- Inspect their recent actions
SELECT action, created_at, details
FROM audit_log
WHERE user_id = '<compromised_user_id>'
ORDER BY created_at DESC
LIMIT 100;
```

### 4. Block suspicious IP ranges (Fly.io)

```bash
# Add a firewall rule to Fly.io (replace with the actual CIDR)
flyctl ips allocate-v6 --app paths-backend
# Or use Cloudflare WAF if you're fronting with Cloudflare
```

---

## P0 — Active intrusion

1. **Snapshot the database** immediately before making any changes.
2. **Rotate all secrets** (see above).
3. **Take the backend offline** if data is actively being exfiltrated:
   ```bash
   fly scale count 0 --app paths-backend
   ```
4. **Preserve logs** — download them before they roll off:
   ```bash
   fly logs --app paths-backend > incident_$(date +%Y%m%d_%H%M%S).log
   ```
5. **Notify your hosting provider** (Fly.io support).
6. **Engage legal / DPO** — GDPR requires breach notification within 72 hours.

---

## Key rotation schedule

Even without an incident, rotate credentials periodically:

| Credential | Rotation schedule |
|---|---|
| `SECRET_KEY` | Every 90 days |
| Stripe API key | Every 6 months or on staff departure |
| OpenRouter API key | Every 6 months |
| Qdrant API key | Every 6 months |
| GitHub Actions secrets | On engineer off-boarding |

After rotation, run the CI pipeline to confirm deployments succeed.

---

## GDPR breach notification

Under UK GDPR / EU GDPR, a **personal data breach** must be reported to the
supervisory authority (ICO in the UK) within **72 hours** of becoming aware
of it, unless it is unlikely to result in a risk to individuals.

### Notify the ICO

- UK: https://ico.org.uk/for-organisations/report-a-breach/
- EU: your lead supervisory authority

### What to include

1. Nature of the breach (what data, how many individuals)
2. Categories and approximate number of records affected
3. Contact details of the Data Protection Officer
4. Likely consequences
5. Measures taken or proposed to address the breach

### Notify affected users

If the breach is likely to result in a high risk to individuals, you must
also **notify them directly** (email + in-app notification) without undue
delay.

Template (adapt as appropriate):

> Subject: Important security notice regarding your PATHS account
>
> We are writing to inform you of a security incident that may have affected
> your personal data on the PATHS platform.
>
> **What happened**: [brief description]
> **What data was affected**: [categories]
> **What we have done**: [containment steps]
> **What you should do**: [e.g. change your password, monitor for phishing]
>
> We sincerely apologise for this incident.  If you have any questions,
> please contact privacy@paths.ai.

---

## Post-incident review

Within 5 business days of containment:

1. **Timeline** — reconstruct the full sequence of events from logs.
2. **Root cause** — what vulnerability or process failure allowed this?
3. **Impact assessment** — which data was accessed, by whom, for how long?
4. **Remediation** — what code / config / process changes prevent recurrence?
5. **Write a post-mortem** and share it with the team.

---

## Contacts

| Role | Contact |
|---|---|
| Security lead | security@paths.ai |
| Data Protection Officer | privacy@paths.ai |
| Fly.io support | https://fly.io/docs/about/support/ |
| ICO (UK) | https://ico.org.uk |
