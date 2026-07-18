# Hunt's Pointe → SignalDesk integration setup

How to wire the "Send to SignalDesk" flow (the `push-signaldesk` /
`signaldesk-status` Supabase Edge Functions) to a running SignalDesk
(Hampton Roads / `hampton-roads-history`) deployment.

The seam is a signed server-to-server HMAC request: Hunt's Pointe stages a
**draft** in SignalDesk; a human editor publishes it in Payload. Nothing here
can publish.

---

## The two values you keep asking about

Neither is looked up from somewhere — you **generate** one and the other is
your **deployment URL**.

### `SIGNALDESK_INGEST_URL`

The public URL of the SignalDesk app plus the fixed ingest route:

```
https://<your-signaldesk-host>/api/integrations/hunts-pointe
```

- `/api/integrations/hunts-pointe` is fixed (the route in
  `hampton-roads-history/app/api/integrations/hunts-pointe/route.ts`).
- `<your-signaldesk-host>` is wherever `hampton-roads-history` is deployed —
  DigitalOcean App Platform (or Coolify). Use the URL that platform assigns
  (e.g. `https://hampton-roads-xxxx.ondigitalocean.app`) or your custom
  domain. **If SignalDesk isn't deployed yet, this URL doesn't exist yet —
  deploy first, then use its URL.**
- The status check derives `<host>/api/integrations/hunts-pointe/status`
  from this automatically. Override only via `SIGNALDESK_STATUS_URL` if
  needed.

### `SIGNALDESK_WEBHOOK_SECRET`

A strong random string **you create**. It must be byte-identical on both
sides so the HMAC signature verifies. Generate one:

```bash
openssl rand -hex 32
```

Set that same value in two places, under two different variable names:

| Side | Variable | Where |
|---|---|---|
| Hunt's Pointe (sender) | `SIGNALDESK_WEBHOOK_SECRET` | Supabase Edge Function secrets |
| SignalDesk (receiver) | `WEBHOOK_SECRET` | Hosting platform env (DO App Platform / Coolify) |

A mismatch → SignalDesk returns `401 Invalid or missing signature`.

---

## Where each variable lives

### Hunt's Pointe — Supabase Edge Function secrets

The push/status functions run on Supabase, so their config is set as
**function secrets** (not `.env`):

```bash
supabase secrets set \
  SIGNALDESK_INGEST_URL="https://<your-signaldesk-host>/api/integrations/hunts-pointe" \
  SIGNALDESK_WEBHOOK_SECRET="<the openssl value>"
```

or Supabase dashboard → project → **Edge Functions → Manage secrets**.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected by Supabase
automatically — you do **not** set those yourself.

### Hunt's Pointe — frontend (Vite) build vars

Set in the Hunt's Pointe build environment (Lovable / your host):

| Variable | Required? | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Base URL the preflight calls the functions at (`<url>/functions/v1/...`) |
| `VITE_SIGNALDESK_URL` | optional | Enables a clickable "Open in Payload" link in the receipt; without it the admin path shows as plain text |

### SignalDesk — server env (DigitalOcean App Platform / Coolify)

Add `WEBHOOK_SECRET` = `<the same openssl value>` (mark encrypted), then
redeploy. This is the only variable the *integration* needs beyond the
app's normal env (`NEXT_PUBLIC_SUPABASE_*`, `DATABASE_URI`,
`PAYLOAD_SECRET`, etc. — see `.env.example`).

---

## Verify it works

1. Same secret string in both `SIGNALDESK_WEBHOOK_SECRET` and
   `WEBHOOK_SECRET`? A mismatch → `401`.
2. `SIGNALDESK_INGEST_URL` ends in `/api/integrations/hunts-pointe` and
   points at the deployed SignalDesk host?
3. SignalDesk deployed and reachable before you test a push?
4. In Hunt's Pointe, open a document → **Send to SignalDesk** → run the
   preflight → **Stage review draft**. Success shows a receipt with the
   draft ID and revision; the draft appears in Payload under
   **Collections → Articles** as an unpublished review draft.

## What travels (and what can't)

- The push sends a versioned, schema-validated **EditorialPackage v1**
  envelope (see `supabase/functions/_shared/editorial-package.ts`): identity,
  revision + sha-256 checksum, editorial content, taxonomy, SEO, assets,
  provenance, a validation snapshot, and a publishing *proposal*.
- Idempotency key `hp:{document_id}:{version}` — a retry updates the same
  linked draft, never a duplicate.
- SignalDesk owns publishing. It rejects a stale revision (`409
  stale_revision`) or a story a human already moved into review
  (`409 editorial_locked`); the preflight surfaces both.
