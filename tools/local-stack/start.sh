#!/bin/bash
# Start the local stand-in backend:  tools/local-stack/start.sh   (needs Postgres 16, node, deno)
# Prints the two values the site needs (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
PORT="${PORT:-54321}"; export JWT_SECRET="local-test-secret-local-test-secret"
export PATH="$HERE/node_modules/.bin:$PATH"; DENO="${DENO:-deno}"; PSQL="${PSQL:-psql -v ON_ERROR_STOP=1 -q}"
SU() { if [ "$(id -u)" = 0 ]; then su postgres -c "$1"; else bash -c "$1"; fi; }

SU "psql -qc 'drop database if exists dn'" && SU "psql -qc 'drop role if exists dn_gateway' -c 'drop role if exists anon' -c 'drop role if exists authenticated' -c 'drop role if exists service_role'"
SU "psql -qc 'create database dn'"
SU "$PSQL -d dn -f '$HERE/setup-db.sql'"
for m in "$ROOT"/supabase/migrations/*.sql; do      # storage lives outside this stand-in
  case "$m" in *storage*) continue;; esac
  SU "$PSQL -d dn -f '$m'"
done

jwt() { node --input-type=module -e "
import crypto from 'node:crypto';
const b=(v)=>Buffer.from(JSON.stringify(v)).toString('base64url');
const h=b({alg:'HS256',typ:'JWT'})+'.'+b({role:'$1',exp:4102444800});
console.log(h+'.'+crypto.createHmac('sha256','$JWT_SECRET').update(h).digest('base64url'));"; }
ANON="$(jwt anon)"; SERVICE="$(jwt service_role)"

i=0; PORTS="{"
for dir in "$ROOT"/supabase/functions/*/; do
  name="$(basename "$dir")"; [ "$name" = "_shared" ] && continue
  i=$((i+1)); p=$((PORT+i))
  DENO_SERVE_ADDRESS="tcp:127.0.0.1:$p" SUPABASE_URL="http://127.0.0.1:$PORT" SUPABASE_SERVICE_ROLE_KEY="$SERVICE" \
    $DENO run -A --quiet "$dir/index.ts" >"/tmp/dn-fn-$name.log" 2>&1 &
  PORTS="$PORTS\"$name\":$p,"
done
PORTS="${PORTS%,}}"
rm -rf /tmp/dn-local-files
FUNCTION_PORTS="$PORTS" PORT="$PORT" node "$HERE/gateway.mjs" >/tmp/dn-gateway.log 2>&1 &
sleep 2
echo "VITE_SUPABASE_URL=http://127.0.0.1:$PORT"
echo "VITE_SUPABASE_ANON_KEY=$ANON"
echo "SERVICE_ROLE_KEY=$SERVICE"
