# Local stand-in backend (tests only)

Runs the site's real database migration, real row level security and real edge functions
without Docker: Postgres 16 + a small gateway that answers the Supabase URLs the site uses.
It imitates only what this site needs; production is a real Supabase project.

```bash
cd tools/local-stack && npm install          # once (deno, pg, supabase-js)
export LEMON_SQUEEZY_API_KEY=k LEMON_SQUEEZY_STORE_ID=77 LEMON_SQUEEZY_WEBHOOK_SECRET=whsec \
       TOOL_API_TOKEN=test-token-0123456789abcdefgh LEMON_SQUEEZY_API_URL=http://127.0.0.1:54399 \
       BASE44_API_URL=http://127.0.0.1:54399 BASE44_FILE_ORIGIN=http://127.0.0.1:54399
./start.sh                                   # recreates database "dn", prints URL + keys
node test.mjs <url> <anon key> <service key> # database rules + every edge function
node ui-smoke.mjs <site url> <url> <service key> <out dir>   # built site in Chromium, screenshots (restart the stack first)
```
