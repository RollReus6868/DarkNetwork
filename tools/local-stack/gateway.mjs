// A small stand-in for a Supabase project, for testing this site without Docker:
// real Postgres (with the real migration + row level security), a PostgREST-compatible
// subset for /rest/v1, minimal /auth/v1 and /storage/v1, and /functions/v1 forwarded to
// the real edge functions running under Deno. See README.md. NOT for production.
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import pg from "pg";

const PORT = Number(process.env.PORT || 54321);
const SECRET = process.env.JWT_SECRET || "local-test-secret-local-test-secret";
const FILES = process.env.FILES_DIR || "/tmp/dn-local-files";
const FUNCTIONS = JSON.parse(process.env.FUNCTION_PORTS || "{}");   // { name: port }
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgres://dn_gateway:dn@127.0.0.1:5432/dn" });

const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
export function sign(claims) {
  const head = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}`;
  return `${head}.${crypto.createHmac("sha256", SECRET).update(head).digest("base64url")}`;
}
function verify(token) {
  const [h, p, s] = String(token || "").split(".");
  if (!s || crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url") !== s) return null;
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  return claims.exp && claims.exp < Date.now() / 1000 ? null : claims;
}
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw Object.assign(new Error(`bad identifier ${name}`), { status: 400 });
  return `"${name}"`;
};

// ---- run SQL as the caller's database role, with their JWT claims (this is what makes RLS apply)
async function asCaller(claims, fn) {
  const role = ["anon", "authenticated", "service_role"].includes(claims?.role) ? claims.role : "anon";
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims || {})]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// ---- /rest/v1: the subset of PostgREST this site uses
function where(params, values) {
  const parts = [];
  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(key)) continue;
    const [op, ...rest] = raw.split(".");
    const val = rest.join(".");
    if (op === "eq") { values.push(val); parts.push(`${ident(key)}::text = $${values.length}`); }
    else if (op === "is" && val === "null") parts.push(`${ident(key)} is null`);
    else if (op === "in") {
      const list = val.replace(/^\(|\)$/g, "").split(",").map((v) => v.replace(/^"|"$/g, ""));
      values.push(list); parts.push(`${ident(key)}::text = any($${values.length})`);
    } else throw Object.assign(new Error(`unsupported filter ${key}=${raw}`), { status: 400 });
  }
  return parts.length ? ` where ${parts.join(" and ")}` : "";
}
async function rest(req, res, url, body, claims) {
  const table = `public.${ident(url.pathname.split("/")[3])}`;
  const params = [...url.searchParams];
  const prefer = req.headers.prefer || "";
  const wantRows = prefer.includes("return=representation");
  const values = [];
  let sql;
  if (req.method === "GET" || req.method === "HEAD") {
    const filter = where(params, values);
    let tail = filter;
    const order = url.searchParams.get("order");
    if (order) tail += " order by " + order.split(",").map((o) => {
      const [col, ...mods] = o.split(".");
      return `${ident(col)} ${mods.includes("desc") ? "desc" : "asc"} nulls ${mods.includes("nullsfirst") ? "first" : "last"}`;
    }).join(", ");
    if (url.searchParams.get("limit")) tail += ` limit ${Number(url.searchParams.get("limit"))}`;
    if (req.method === "HEAD") {
      const n = await asCaller(claims, (c) => c.query(`select count(*)::int as n from ${table}${filter}`, values));
      res.writeHead(200, { "Content-Range": `*/${n.rows[0].n}` });
      return res.end();
    }
    sql = `select coalesce(json_agg(t), '[]') as rows from (select * from ${table}${tail}) t`;
  } else if (req.method === "POST") {
    const records = Array.isArray(body) ? body : [body];
    const all = [...new Set(records.flatMap((r) => Object.keys(r)))];
    // like PostgREST: a key missing from one record is NULL, unless "Prefer: missing=default"
    const groups = prefer.includes("missing=default") ? records.map((r) => [Object.keys(r), [r]]) : [[all, records]];
    const inserts = groups.map(([keys, recs]) => {
      const cols = keys.map(ident).join(", ");
      values.push(JSON.stringify(recs));
      return `insert into ${table} (${cols}) select ${cols} from json_populate_recordset(null::${table}, $${values.length}::json)`;
    });
    // RETURNING (which needs read permission) only when the caller asked for the rows
    sql = wantRows
      ? `with ${inserts.map((q, i) => `x${i} as (${q} returning *)`).join(", ")}
         select coalesce(json_agg(x), '[]') as rows from (${inserts.map((_q, i) => `select * from x${i}`).join(" union all ")}) x`
      : `with ${inserts.map((q, i) => `x${i} as (${q})`).join(", ")} select null as rows`;
  } else if (req.method === "PATCH") {
    const cols = Object.keys(body).map(ident).join(", ");
    values.push(JSON.stringify(body));
    sql = `with x as (update ${table} set (${cols}) = (select ${cols} from json_populate_record(null::${table}, $1::json))${where(params, values)} returning *)
           select coalesce(json_agg(x), '[]') as rows from x`;
  } else if (req.method === "DELETE") {
    sql = `with x as (delete from ${table}${where(params, values)} returning *) select coalesce(json_agg(x), '[]') as rows from x`;
  } else return json(res, 405, { message: "method" });

  const rows = (await asCaller(claims, (c) => c.query(sql, values))).rows[0]?.rows;
  if (req.method !== "GET" && !wantRows) { res.writeHead(req.method === "POST" ? 201 : 204); return res.end(); }
  if ((req.headers.accept || "").includes("vnd.pgrst.object")) {
    if (rows.length !== 1) return json(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rows.length} rows` });
    return json(res, 200, rows[0]);
  }
  return json(res, req.method === "POST" ? 201 : 200, rows);
}

// ---- /auth/v1: accounts live in auth.users (passwords in clear: test stand-in only)
const session = (u) => {
  const user = { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: {}, user_metadata: {}, created_at: u.created_at };
  return { access_token: sign({ sub: u.id, role: "authenticated", email: u.email }), token_type: "bearer", expires_in: 3600,
           expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: sign({ sub: u.id, refresh: true }), user };
};
async function auth(req, res, url, body, claims) {
  const route = url.pathname.split("/")[3];
  const q = (sql, v) => pool.query(sql, v);
  if (route === "signup") {
    if (String(body.password || "").length < 6) return json(res, 422, { code: 422, error_code: "weak_password", msg: "Password should be at least 6 characters." });
    if ((await q("select 1 from auth.users where email = $1", [body.email])).rowCount) return json(res, 422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
    const u = (await q("insert into auth.users (email, password) values ($1, $2) returning *", [body.email, body.password])).rows[0];
    return json(res, 200, session(u));
  }
  if (route === "token") {
    const grant = url.searchParams.get("grant_type");
    const u = grant === "refresh_token"
      ? (await q("select * from auth.users where id = $1", [verify(body.refresh_token)?.sub])).rows[0]
      : (await q("select * from auth.users where email = $1 and password = $2", [body.email, body.password])).rows[0];
    if (!u) return json(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
    return json(res, 200, session(u));
  }
  if (route === "user") {
    const u = claims?.sub && (await q("select * from auth.users where id = $1", [claims.sub])).rows[0];
    if (!u) return json(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    if (req.method === "PUT" && body.password) await q("update auth.users set password = $2 where id = $1", [u.id, body.password]);
    return json(res, 200, session(u).user);
  }
  if (route === "logout") { res.writeHead(204); return res.end(); }
  if (route === "recover") return json(res, 200, {});
  return json(res, 404, { msg: "not found" });
}

// ---- /storage/v1: files on disk; the same rule as the storage policy (admin or service role writes)
async function storage(req, res, url, raw, claims) {
  const parts = url.pathname.split("/").slice(3);   // object, [public|sign], bucket, ...path
  const mode = ["public", "sign"].includes(parts[1]) ? parts[1] : "";
  const [bucket, ...rest] = parts.slice(mode ? 2 : 1);
  const file = path.join(FILES, bucket, rest.join("/").replace(/\.\./g, ""));
  if (req.method === "POST" && mode === "sign") {
    if (claims?.role !== "service_role") return json(res, 403, { message: "new row violates row-level security policy" });
    if (!fs.existsSync(file)) return json(res, 404, { message: "Object not found" });
    const token = sign({ url: `${bucket}/${rest.join("/")}`, exp: Math.floor(Date.now() / 1000) + Number(JSON.parse(raw).expiresIn || 60) });
    return json(res, 200, { signedURL: `/object/sign/${bucket}/${rest.join("/")}?token=${token}` });
  }
  if (req.method === "POST") {
    const admin = claims?.role === "service_role" || (await asCaller(claims, (c) => c.query("select public.is_admin() as ok"))).rows[0].ok;
    if (!admin) return json(res, 403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
    const form = await new Request("http://x", { method: "POST", headers: { "content-type": req.headers["content-type"] }, body: raw }).formData();
    const blob = [...form.values()].find((v) => typeof v !== "string");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(await blob.arrayBuffer()));
    return json(res, 200, { Key: `${bucket}/${rest.join("/")}`, Id: crypto.randomUUID() });
  }
  if (req.method === "GET") {
    const allowed = (mode === "public" && bucket === "public-files") ||
      (mode === "sign" && verify(url.searchParams.get("token"))?.url === `${bucket}/${rest.join("/")}`);
    if (!allowed || !fs.existsSync(file)) return json(res, 400, { message: "not allowed or missing" });
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    return res.end(fs.readFileSync(file));
  }
  return json(res, 405, { message: "method" });
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Expose-Headers": "Content-Range" };
function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const claims = verify(bearer) || verify(req.headers.apikey);
  try {
    const parse = () => (raw.length ? JSON.parse(raw.toString()) : {});
    if (url.pathname.startsWith("/rest/v1/")) return await rest(req, res, url, parse(), claims);
    if (url.pathname.startsWith("/auth/v1/")) return await auth(req, res, url, parse(), verify(bearer));
    if (url.pathname.startsWith("/storage/v1/object/")) return await storage(req, res, url, raw, claims);
    if (url.pathname.startsWith("/functions/v1/")) {
      const port = FUNCTIONS[url.pathname.split("/")[3]];
      if (!port) return json(res, 404, { message: "function not found" });
      const headers = { ...req.headers };
      delete headers.host; delete headers["content-length"];
      const r = await fetch(`http://127.0.0.1:${port}/`, { method: req.method, headers, body: raw.length ? raw : undefined });
      res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "application/json" });
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    return json(res, 404, { message: "not found" });
  } catch (e) {
    const status = e.status || (e.code === "42501" ? (claims?.role === "authenticated" ? 403 : 401) : e.code === "23505" ? 409 : 400);
    return json(res, status, { code: e.code || "", message: e.message, details: e.detail || null });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`local stack on http://127.0.0.1:${PORT}`));
