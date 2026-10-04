# Dark Network website

React + Vite site. Backend: **Supabase** (database, sign-in, file storage, edge functions).
Hosting: any static host (Cloudflare Pages). Payments: Lemon Squeezy. Print on demand: Spring.

## Layout

- `src/` — the site. `src/api/base44Client.js` is the only file that talks to the backend.
- `supabase/migrations/` — database tables and access rules (row level security).
- `supabase/functions/` — server code: checkout, payment webhook, ebook download links, chat,
  `toolApi` (entry point of the DN Product Studio desktop tool).
- `tools/local-stack/` — local stand-in backend + end-to-end tests.

## Run locally

```bash
npm install
cp .env.example .env.local     # fill in the Supabase URL and anon key
npm run dev
```

## Deploy

- **Site**: Cloudflare Pages builds this repo (`npm run build`, output `dist`) with the three
  `VITE_…` variables from `.env.example`. `public/_redirects` sends every path to the app.
- **Database**: apply the files in `supabase/migrations/` in order.
- **Functions**: deploy every folder in `supabase/functions/` (JWT verification off, see
  `supabase/config.toml`; each function checks its caller itself).
- **Secrets** (Supabase > Edge Functions > Secrets): `LEMON_SQUEEZY_API_KEY`,
  `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_WEBHOOK_SECRET`, `TOOL_API_TOKEN`, `SITE_URL`.
- **Lemon Squeezy webhook**: `https://<project>.supabase.co/functions/v1/lemonSqueezyWebhook`
  (events `order_created`, `order_refunded`).
- **Admin**: sign up on the site, then set `role = 'admin'` for that account in the `profiles` table.

## Checks before committing

```bash
npx eslint src --quiet && npm run build
```
