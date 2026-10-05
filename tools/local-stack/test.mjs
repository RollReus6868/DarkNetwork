// End-to-end checks of the database rules and the real edge functions.
//   tools/local-stack/start.sh   then   node tools/local-stack/test.mjs <url> <anon key> <service key>
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import { entitiesProxy } from "../../supabase/functions/_shared/entities.js";

import pg from "pg";
const [URL_, ANON, SERVICE] = process.argv.slice(2);
const pgAdmin = async (sql) => { const c = new pg.Client({ connectionString: process.env.ADMIN_DATABASE_URL }); await c.connect(); await c.query(sql); await c.end(); };
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const client = () => createClient(URL_, ANON, opts);
const service = entitiesProxy(createClient(URL_, SERVICE, opts));
const rejects = (p, re) => assert.rejects(p, re);

// stand-in for the Lemon Squeezy API (the checkout function is started with LEMON_SQUEEZY_API_URL pointing here)
let lemon;
const OLD = "https://media.base44.com/images/public/6aa80a3918e73ce9a7b4d0f7";
http.createServer(async (req, res) => {
  let raw = ""; for await (const c of req) raw += c;
  if (req.url.startsWith("/images/public/")) return res.end("old image bytes");
  if (req.url.includes("/entities/Product")) {       // also plays the old Base44 API for the import test
    res.writeHead(200, { "Content-Type": "application/json" });
    const img = (n) => `http://127.0.0.1:54399/old/${n}.png`.replace("http://127.0.0.1:54399/old", OLD);
    return res.end(JSON.stringify([
      { id: "6aa81b07e8694e59afee18f0", created_date: "2026-09-14T16:04:23.427000", updated_date: "2026-09-14T16:04:23.427000", created_by_id: "u1", created_by: "x@y.z", is_sample: false,
        title: "Exodus Route T-Shirt", slug: "exodus-route-t-shirt", category: "Apparel", price: 28, images: [img("a"), img("b")], description: `<p>Tee <img src="${img("a")}"></p>`, spring_url: "https://spring.com/x", status: "published" },
      { id: "6aa81b07e8694e59afee18f1", created_date: "2026-09-15T10:00:00", title: "Mug", slug: "old-mug", category: "Mugs", price: 18, images: [img("c")], description: "<p>Mug</p>", spring_url: "https://spring.com/y", status: "draft" },
    ]));
  }
  lemon = { auth: req.headers.authorization, body: JSON.parse(raw) };
  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ data: { attributes: { url: "https://store.lemonsqueezy.com/checkout/abc" } } }));
}).listen(54399, "127.0.0.1");

const fn = async (sb, name, body) => {
  const { data, error } = await sb.functions.invoke(name, { body });
  if (error) return { status: error.context.status, ...(await error.context.json().catch(() => ({}))) };
  return { status: 200, ...data };
};
const signUp = async (email) => {
  const sb = client();
  const { data, error } = await sb.auth.signUp({ email, password: "secret123" });
  assert.equal(error, null); assert.ok(data.session.access_token);
  return { sb, db: entitiesProxy(sb), id: data.user.id };
};
const ebook = (n, extra = {}) => ({ title: `Book ${n}`, slug: `book-${n}`, description: "<p>d</p>", price: 9.99, cover_image: "https://x/c.jpg", ...extra });

// ---------------- visitors
const anon = entitiesProxy(client());
assert.deepEqual(await anon.Ebook.list("-created_date", 10), []);
await rejects(anon.Ebook.create(ebook(1)), /row-level security/);
assert.deepEqual(await anon.Subscriber.create({ email: "a@b.c", source: "Home" }), { email: "a@b.c", source: "Home" });
assert.deepEqual(await anon.Subscriber.list(), [], "visitors cannot read the subscriber list");
assert.deepEqual(await anon.ChatConversation.list(), []);
assert.deepEqual(await anon.EbookPurchase.list(), []);

// ---------------- accounts and roles
const admin = await signUp("owner@example.com");
const buyer = await signUp("buyer@example.com");
assert.equal((await client().auth.signUp({ email: "buyer@example.com", password: "secret123" })).error.message, "User already registered");
assert.equal((await client().auth.signInWithPassword({ email: "buyer@example.com", password: "nope" })).error.message, "Invalid login credentials");
await rejects(buyer.db.Ebook.create(ebook(1)), /row-level security/);
await rejects(admin.db.Ebook.create(ebook(1)), /row-level security/, "a new account is never admin by itself");
const profiles = entitiesProxy(createClient(URL_, SERVICE, opts)).Profiles;
assert.equal((await createClient(URL_, SERVICE, opts).from("profiles").update({ role: "admin" }).eq("id", admin.id).select()).data[0].role, "admin");
assert.equal((await buyer.sb.from("profiles").update({ role: "admin" }).eq("id", buyer.id).select()).data.length, 0, "nobody can promote themselves");
assert.deepEqual((await buyer.sb.from("profiles").select("*")).data.map((p) => p.email), ["buyer@example.com"], "a user sees only their own profile");

// ---------------- admin CRUD exactly as the Admin page calls it
const e1 = await admin.db.Ebook.create(ebook(1, { faq: [{ question: "q", answer: "a" }], what_you_learn: ["x", "y"] }));
assert.equal(e1.status, "published"); assert.equal(e1.price, 9.99); assert.equal(e1.featured, false);
assert.deepEqual(e1.faq, [{ question: "q", answer: "a" }]); assert.match(e1.id, /^[0-9a-f]{32}$/);
await rejects(admin.db.Ebook.create(ebook(1)), /duplicate key/);
const [e2, e3] = await admin.db.Ebook.bulkCreate([ebook(2, { status: "draft", sort_order: 2 }), ebook(3, { sort_order: 1 })]);
assert.deepEqual((await anon.Ebook.filter({ status: "published" }, "sort_order", 50)).map((e) => e.slug), ["book-1", "book-3"]);
assert.deepEqual((await anon.Ebook.list("-sort_order", 2)).map((e) => e.slug), ["book-2", "book-3"]);
assert.equal((await anon.Ebook.get(e2.id)).title, "Book 2");
await rejects(anon.Ebook.get("missing"), /not found/);
assert.equal((await admin.db.Ebook.update(e2.id, { price: 12.5, featured: true })).price, 12.5);
assert.ok(new Date((await anon.Ebook.get(e2.id)).updated_date) >= new Date(e2.updated_date));
await admin.db.Ebook.bulkUpdate([{ id: e1.id, sort_order: 5 }, { id: e3.id, sort_order: 6 }]);
assert.equal((await admin.db.Ebook.updateMany({ id: [e2.id, e3.id] }, { $set: { status: "published" } })).length, 2);
assert.equal(await anon.Ebook.count({ status: "published" }), 3);
await rejects(buyer.db.Ebook.update(e1.id, { price: 0 }), /multiple \(or no\) rows|row-level/);
await buyer.db.Ebook.delete(e1.id);
assert.equal(await anon.Ebook.count(), 3, "a non-admin delete removes nothing");
await admin.db.Ebook.deleteMany({ id: [e3.id] });
assert.equal(await anon.Ebook.count(), 2);

// ---------------- files
const pdf = new File(["%PDF-1.4 secret book"], "Sách Enoch (1).pdf", { type: "application/pdf" });
assert.match((await buyer.sb.storage.from("private-files").upload("x.pdf", pdf)).error.message, /row-level security/);
assert.equal((await admin.sb.storage.from("private-files").upload("a_book.pdf", pdf)).error, null);
const cover = await admin.sb.storage.from("public-files").upload("c.jpg", new File(["jpg"], "c.jpg"));
assert.equal(cover.error, null);
assert.equal(await (await fetch(admin.sb.storage.from("public-files").getPublicUrl("c.jpg").data.publicUrl)).text(), "jpg");
assert.notEqual((await fetch(`${URL_}/storage/v1/object/public/private-files/a_book.pdf`)).status, 200, "private files have no public link");
await admin.db.Ebook.update(e1.id, { secure_file_uri: "a_book.pdf", lemon_squeezy_variant_id: "2204367", price: 26.99 });

// ---------------- checkout: name + price from the database, shared variant
assert.equal((await fn(buyer.sb, "createEbookCheckout", {})).status, 400);
assert.equal((await fn(buyer.sb, "createEbookCheckout", { ebook_id: e2.id })).status, 400, "no variant id -> not purchasable");
const co = await fn(buyer.sb, "createEbookCheckout", { ebook_id: e1.id });
assert.equal(co.url, "https://store.lemonsqueezy.com/checkout/abc");
const a = lemon.body.data.attributes;
assert.equal(lemon.auth, "Bearer k"); assert.equal(a.custom_price, 2699); assert.equal(a.product_options.name, "Book 1");
assert.deepEqual(a.checkout_data.custom, { ebook_id: e1.id, user_id: buyer.id });
assert.equal(lemon.body.data.relationships.variant.data.id, "2204367"); assert.equal(lemon.body.data.relationships.store.data.id, "77");
await fn(client(), "createEbookCheckout", { ebook_id: e1.id });
assert.equal(lemon.body.data.attributes.checkout_data.custom.user_id, "guest");

// ---------------- webhook -> purchase -> download
const hook = async (payload, secret = "whsec") => {
  const raw = JSON.stringify(payload);
  const r = await fetch(`${URL_}/functions/v1/lemonSqueezyWebhook`, { method: "POST", body: raw,
    headers: { "Content-Type": "application/json", "X-Signature": crypto.createHmac("sha256", secret).update(raw).digest("hex") } });
  return { http: r.status, ...(await r.json()) };
};
const order = (id, custom, status = "paid", email = "buyer@example.com") => ({ meta: { event_name: "order_created" },
  data: { id, attributes: { status, user_email: email, total: 2699, currency: "USD", custom_data: custom, first_order_item: { variant_id: 2204367 } } } });
assert.equal((await hook(order("1001", { ebook_id: e1.id, user_id: buyer.id }), "wrong")).http, 401);
assert.equal((await hook(order("1001", { ebook_id: e1.id, user_id: buyer.id }))).http, 200);
await hook(order("1001", { ebook_id: e1.id, user_id: buyer.id }));   // Lemon Squeezy retries: no duplicate
let mine = await buyer.db.EbookPurchase.filter({ user_id: buyer.id });
assert.equal(mine.length, 1); assert.equal(mine[0].download_access, true); assert.equal(mine[0].provider_variant_id, "2204367");
assert.deepEqual(await admin.db.EbookPurchase.list().then((r) => r.length), 1);
const other = await signUp("other@example.com");
assert.deepEqual(await other.db.EbookPurchase.list(), [], "customers never see each other's purchases");
assert.equal((await fn(other.sb, "generateEbookDownloadUrl", { ebook_id: e1.id })).status, 403);
assert.equal((await fn(client(), "generateEbookDownloadUrl", { ebook_id: e1.id })).status, 500, "a visitor gets no link");
const dl = await fn(buyer.sb, "generateEbookDownloadUrl", { ebook_id: e1.id });
assert.equal(await (await fetch(dl.signed_url)).text(), "%PDF-1.4 secret book");
assert.notEqual((await fetch(dl.signed_url.replace(/token=.{10}/, "token=0000000000"))).status, 200);

// guest purchase, claimed after the same email signs in
await hook(order("1002", { ebook_id: e1.id, user_id: "guest" }, "paid", "other@example.com"));
assert.equal((await fn(other.sb, "claimGuestPurchases", {})).claimed, 1);
assert.equal((await fn(other.sb, "claimGuestPurchases", {})).claimed, 0);
assert.ok((await fn(other.sb, "generateEbookDownloadUrl", { ebook_id: e1.id })).signed_url);
// refund takes the download away
await hook({ meta: { event_name: "order_refunded" }, data: { id: "1002", attributes: { status: "refunded" } } });
assert.equal((await fn(other.sb, "generateEbookDownloadUrl", { ebook_id: e1.id })).status, 403);

// ---------------- chat (also carries the contact form)
const guest = { guestKey: "guestkey-12345678" };
assert.equal((await fn(client(), "chatGuest", { action: "sync" })).status, 400);
assert.deepEqual(await fn(client(), "chatGuest", { action: "sync", ...guest }), { status: 200, conversation: null, messages: [] });
const sent = await fn(client(), "chatGuest", { action: "send", ...guest, body: "  Hello there  " });
assert.equal(sent.message.body, "Hello there");
await fn(buyer.sb, "chatGuest", { action: "send", body: "From a member" });
assert.equal((await fn(client(), "chatGuest", { action: "sync", guestKey: "someone-else-000" })).messages.length, 0);
assert.equal((await fn(buyer.sb, "chatAdmin", { action: "list" })).status, 403);
assert.equal((await fn(client(), "chatAdmin", { action: "list" })).status, 500);
assert.equal(await admin.db.ChatConversation.count({ unread_for_admin: true }), 2);
const convs = (await fn(admin.sb, "chatAdmin", { action: "list" })).conversations;
assert.deepEqual(convs.map((c) => c.last_message_preview), ["From a member", "Hello there"]);
assert.equal((await fn(admin.sb, "chatAdmin", { action: "thread", conversationId: sent.conversationId })).messages.length, 1);
assert.equal(await admin.db.ChatConversation.count({ unread_for_admin: true }), 1);
await fn(admin.sb, "chatAdmin", { action: "reply", conversationId: sent.conversationId, body: "Hi!" });
const synced = await fn(client(), "chatGuest", { action: "sync", ...guest });
assert.deepEqual(synced.messages.map((m) => [m.sender_role, m.body]), [["visitor", "Hello there"], ["admin", "Hi!"]]);

// ---------------- the desktop tool's entry point
const tool = async (body, token = "test-token-0123456789abcdefgh") => {
  const r = await fetch(`${URL_}/functions/v1/toolApi`, { method: "POST", body: JSON.stringify(body),
    headers: { "X-Tool-Token": token, "Content-Type": "application/json" } });
  return { http: r.status, ...(await r.json()) };
};
assert.equal((await tool({ action: "ping" }, "wrong-token-0123456789abcdef")).http, 401);
assert.deepEqual(await tool({ action: "ping" }), { http: 200, ok: true, site: "Dark Network" });
const put = async (name, priv, bytes) => {
  const u = await tool({ action: "upload_url", name, private: priv });
  assert.equal(u.http, 200, JSON.stringify(u));
  assert.equal((await fetch(u.upload_url, { method: "PUT", body: bytes, headers: { "Content-Type": "application/pdf" } })).status, 200);
  return u.ref;
};
assert.equal((await tool({ action: "upload_url", name: "virus.exe" })).http, 400);
const up1 = { file_uri: await put("Tool Book (1).pdf", true, "%PDF tool") };
const up2 = { file_url: await put("tool-book.jpg", false, "%PDF tool") };
assert.match(up1.file_uri, /^[0-9a-f]{8}_Tool-Book-1-\.pdf$/); assert.equal(await (await fetch(up2.file_url)).text(), "%PDF tool");
assert.notEqual((await fetch(`${URL_}/storage/v1/object/public/private-files/${up1.file_uri}`)).status, 200);
// a book copied from the old site gets its PDF back by the original file name
await admin.db.Ebook.update(e2.id, { secure_file_uri: "mp/private/6aa80a3918e73ce9a7b4d0f7/2ee2042ac_Jubilees_0-Start-Here.pdf", lemon_squeezy_variant_id: "1", status: "published" });
assert.deepEqual((await tool({ action: "pending_pdfs" })).items, [{ title: "Book 2", file_name: "Jubilees_0-Start-Here.pdf" }]);
assert.equal((await tool({ action: "attach_pdf", file_name: "Jubilees_0-Start-Here.pdf", file_uri: "../../etc/passwd" })).http, 400);
assert.deepEqual((await tool({ action: "attach_pdf", file_name: "jubilees_0-start-here.PDF", file_uri: up1.file_uri })).attached, ["Book 2"]);
assert.deepEqual((await tool({ action: "pending_pdfs" })).items, []);
await hook(order("1003", { ebook_id: e2.id, user_id: buyer.id }));
assert.equal(await (await fetch((await fn(buyer.sb, "generateEbookDownloadUrl", { ebook_id: e2.id })).signed_url)).text(), "%PDF tool");
const data = { title: "Tool Book", slug: "tool-book", description: "<p>x&nbsp;y</p>", price: 4.99, cover_image: up2.file_url, secure_file_uri: up1.file_uri, status: "published" };
const made = await tool({ action: "upsert", entity: "Ebook", data });
assert.deepEqual([made.http, made.status, made.created], [200, "draft", true]);
const rec = await anon.Ebook.get(made.id);
assert.deepEqual([rec.status, rec.description, rec.price], ["draft", "<p>x y</p>", 4.99]);
assert.equal((await tool({ action: "upsert", entity: "Ebook", data })).http, 409);
assert.equal((await tool({ action: "upsert", entity: "Ebook", data: { ...data, price: 6 }, overwrite: true })).created, false);
assert.equal((await tool({ action: "upsert", entity: "Ebook", id: made.id, data: { ...data, price: 7 } })).http, 200);
assert.equal((await anon.Ebook.get(made.id)).price, 7);
assert.equal((await tool({ action: "list", entity: "Ebook" })).items.length, 3);
assert.equal((await tool({ action: "upsert", entity: "Product", data: { title: "Mug", slug: "mug" } })).http, 400);

// ---------------- one-time import from the old Base44 app (its API is played by the server on 54399)
const imp = async (body) => Promise.resolve().then(() => fetch(`${URL_}/functions/v1/importFromBase44`, { method: "POST", body: JSON.stringify(body),
  headers: { "X-Import-Key": "import-key-0123456789abcdefgh", "Content-Type": "application/json" } })).then(async (r) => ({ http: r.status, ...(await r.json()) }));
assert.equal((await imp({ action: "records", entity: "Product" })).http, 401, "off until the key table exists");
await pgAdmin(`create table public.import_key (key text primary key); alter table public.import_key enable row level security;
  grant all on public.import_key to service_role; insert into public.import_key values ('import-key-0123456789abcdefgh')`);
assert.deepEqual(await anon.ImportKey.list(), [], "the key is not readable from outside");
assert.deepEqual(await imp({ action: "records", entity: "Product" }), { http: 200, entity: "Product", found: 2, created: 2, updated: 0 });
assert.deepEqual(await imp({ action: "records", entity: "Product" }), { http: 200, entity: "Product", found: 2, created: 0, updated: 2 });
const old = await anon.Product.get("6aa81b07e8694e59afee18f0");
assert.deepEqual([old.title, old.price, old.created_date.slice(0, 10), old.status], ["Exodus Route T-Shirt", 28, "2026-09-14", "published"]);
assert.deepEqual(await imp({ action: "files", entity: "Product", limit: 1 }), { http: 200, entity: "Product", copied: 2, remaining: 1 });
assert.deepEqual(await imp({ action: "files", entity: "Product", limit: 5 }), { http: 200, entity: "Product", copied: 1, remaining: 0 });
assert.deepEqual(await imp({ action: "files", entity: "Product" }), { http: 200, entity: "Product", copied: 0, remaining: 0 });
const moved = await anon.Product.get("6aa81b07e8694e59afee18f0");
assert.ok(moved.images.every((u) => u.startsWith(URL_)) && moved.description.includes(`src="${URL_}`), JSON.stringify(moved.images));
assert.equal(await (await fetch(moved.images[0])).text(), "old image bytes");
assert.equal((await imp({ action: "records", entity: "EbookPurchase" })).http, 400);

void profiles; void service;
console.log("local stack: all checks passed");
process.exit(0);
