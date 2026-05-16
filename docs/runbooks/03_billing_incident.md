# Runbook 03 — Billing Incident Response

Covers: Stripe webhook delays, failed payments, subscription state mismatches,
and charge disputes.

---

## 1 — Stripe webhook delivery failure

**Symptom**: Subscription created in Stripe but org's `plan_id` not updated;
or invoice marked paid in Stripe but PATHS still shows "past due".

### Diagnose

1. Log in to the Stripe Dashboard → **Developers → Webhooks**.
2. Click on the endpoint (`https://api.paths.ai/api/v1/billing/webhook`).
3. Find the failing event and check the response body / status code.

### Common causes

| Response | Cause |
|---|---|
| `401 Unauthorized` | Webhook secret mismatch — see fix below |
| `500 Internal Server Error` | Code bug; check backend Sentry for the traceback |
| `400 Bad Request` | Stripe sent an event type we don't handle; safe to ignore |
| Timeout / no response | Backend was down at delivery time |

### Fix — webhook secret mismatch

```bash
# Get the current signing secret from Stripe Dashboard
# Update the secret on Fly.io
fly secrets set STRIPE_WEBHOOK_SECRET=whsec_... --app paths-backend
fly deploy --app paths-backend
```

### Fix — replay missed events

In the Stripe Dashboard → Webhooks → your endpoint → find the event → **Resend**.
You can also replay all events in a time range via the Stripe CLI:

```bash
stripe events resend <event_id>
# or replay a window
stripe trigger customer.subscription.updated
```

---

## 2 — Subscription state mismatch

**Symptom**: Org is on "free" plan in PATHS but Stripe shows an active Pro
subscription (or vice versa).

### Diagnose

```sql
SELECT s.id, s.plan_id, s.status, s.stripe_subscription_id,
       s.current_period_end, o.name
FROM subscriptions s
JOIN organizations o ON o.id = s.organization_id
WHERE o.id = '<org_id>';
```

Cross-check with the Stripe Dashboard using the `stripe_subscription_id`.

### Fix — force sync from Stripe

```bash
# In a Python shell against the production DB
from app.services.billing_service import sync_subscription_from_stripe
import asyncio
asyncio.run(sync_subscription_from_stripe("<stripe_subscription_id>"))
```

Or trigger a manual webhook replay as described above.

---

## 3 — Failed payment (dunning)

Stripe handles dunning (automatic retry) for 7 days by default.

1. Check the Stripe Dashboard → **Billing → Subscriptions → Unpaid**.
2. The `invoice.payment_failed` webhook will have been fired; confirm it was
   received by PATHS (check webhook logs).
3. PATHS sets the subscription `status=past_due` on receipt.
4. The org's users see an in-app banner (from the billing API).

### If the org's card is updated and payment succeeds

Stripe fires `invoice.payment_succeeded` → PATHS resets to `active`.
No manual action needed.

### If the org does not pay and the subscription is cancelled

Stripe fires `customer.subscription.deleted` → PATHS sets
`status=cancelled` and the org loses premium features.

---

## 4 — Charge dispute / chargeback

1. Stripe notifies you by email and creates a dispute.
2. You have 7 days to respond in the Stripe Dashboard.
3. Gather evidence: invoice, usage logs from the `audit_log` table, email
   correspondence from the `outreach_agent`.
4. **Do not refund while a dispute is open** — refunds don't resolve disputes
   and you'll lose both the money and the chargeback fee.

### Pull audit evidence for the disputed org

```sql
SELECT al.action, al.created_at, al.user_id, al.details
FROM audit_log al
JOIN users u ON u.id = al.user_id
WHERE u.organization_id = '<org_id>'
  AND al.created_at BETWEEN '<dispute_period_start>' AND '<dispute_period_end>'
ORDER BY al.created_at;
```

---

## 5 — Emergency: disable an org's access immediately

```sql
-- Deactivate all users in the org
UPDATE users SET is_active = false
WHERE organization_id = '<org_id>';

-- Mark subscription as cancelled
UPDATE subscriptions SET status = 'cancelled'
WHERE organization_id = '<org_id>';
```

Re-enable by setting `is_active = true` and `status = 'active'`.

---

## Contacts

| Escalation | Contact |
|---|---|
| Stripe support | https://support.stripe.com |
| Stripe status | https://status.stripe.com |
| Internal billing owner | billing@paths.ai |
