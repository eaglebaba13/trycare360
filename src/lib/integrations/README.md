# Integration Layer — the ONE dispatch contract

Every business module (CRM, Clinical, Accounts, Marketing, Academy, Inventory)
MUST send third-party traffic through this layer. Direct `fetch()` to a
provider domain (`graph.facebook.com`, `api.razorpay.com`, etc.) from a
module is a review-block bug.

## Usage (from any server function)

```ts
import { dispatch } from "@/lib/integrations/dispatcher.server";

const res = await dispatch({
  supabase: context.supabase,
  tenantId: activeTenantId,
  providerCode: "whatsapp",
  action: "sendTemplate",
  payload: { to: "+9198...", template: "appointment_reminder", lang: "en_US" },
});

if (!res.ok) {
  // Auto-logged. Consider queueing to integration_jobs for retry.
}
```

## Async / retry

For non-blocking sends, insert a row into `integration_jobs` instead of
calling `dispatch()` inline; the cron-driven job worker
(`/api/public/integrations/process-jobs`) will pick it up with exponential
backoff, mark dead after `max_attempts`, and log every attempt.

## Adding a new provider

1. Insert a row in `integration_providers` (via Settings → Platform, or a
   migration). Define its `config_schema` JSON so the UI renders the right
   fields.
2. Add a matching adapter file entry under `src/lib/integrations/providers/`.
3. Nothing else. All UI, dashboards, logs, retry, and webhook plumbing
   already reads from the DB.

## Secrets

Credentials never live in the DB. Each connection stores a
`credentials_ref` — the name of a Lovable secret. The dispatcher reads
`process.env[credentials_ref]` at call time.
