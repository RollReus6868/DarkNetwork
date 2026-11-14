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

// stand-in for the PayPal REST API (paypalCheckout / paypalWebhook run with PAYPAL_API_URL pointing here)
const pp = { orders: new Map(), captures: new Map(), n: 0, next: {}, requestIds: [] };
http.createServer(async (req, res) => {
  let raw = ""; for await (const c of req) raw += c;
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/v1/oauth2/token") {
    const ok = req.headers.authorization === `Basic ${Buffer.from("client-1:secret-1").toString("base64")}`;
    return ok ? send(200, { access_token: "pp-token", expires_in: 32400 }) : send(401, { error: "invalid_client" });
  }
  if (req.headers.authorization !== "Bearer pp-token") return send(401, { name: "AUTHENTICATION_FAILURE" });
  if (req.headers["paypal-request-id"]) pp.requestIds.push(req.headers["paypal-request-id"]);
  if (u.pathname === "/v1/notifications/verify-webhook-signature") {
    const b = JSON.parse(raw);
    return send(200, { verification_status: b.transmission_sig === "good" && b.webhook_id === "WH-1" ? "SUCCESS" : "FAILURE" });
  }
  const m = u.pathname.match(/^\/v2\/checkout\/orders(?:\/([A-Z0-9]+))?(\/capture)?$/);
  if (m && req.method === "POST" && !m[1]) {
    const id = `ORDER${++pp.n}X`;
    pp.orders.set(id, { id, status: "CREATED", body: JSON.parse(raw) });
    return send(201, { id, status: "CREATED" });
  }
  if (m && m[2]) {
    const o = pp.orders.get(m[1]);
    if (!o) return send(404, { name: "RESOURCE_NOT_FOUND" });
    if (pp.next.decline) { pp.next.decline = false; return send(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "INSTRUMENT_DECLINED" }] }); }
    if (o.status === "COMPLETED") return send(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] });
    const unit = o.body.purchase_units[0];
    const capture = { id: `CAP${pp.n}${o.id}`, status: pp.next.pending ? "PENDING" : "COMPLETED", custom_id: unit.custom_id,
      amount: pp.next.amount || unit.amount, links: [] };
    pp.next.pending = false; pp.next.amount = null;
    pp.captures.set(capture.id, { ...capture });
    o.status = "COMPLETED"; o.payer = { email_address: "payer@example.com" };
    o.purchase_units = [{ ...unit, payments: { captures: [capture] } }];
    return send(201, { id: o.id, status: o.status, payer: o.payer, purchase_units: o.purchase_units });
  }
  if (m && req.method === "GET") {
    const o = pp.orders.get(m[1]);
    return o ? send(200, { id: o.id, status: o.status, payer: o.payer, purchase_units: o.purchase_units || o.body.purchase_units }) : send(404, {});
  }
  const c = u.pathname.match(/^\/v2\/payments\/captures\/([A-Z0-9]+)$/);
  if (c) return pp.captures.has(c[1]) ? send(200, pp.captures.get(c[1])) : send(404, {});
  send(404, { name: "NOT_FOUND" });
}).listen(54397, "127.0.0.1");

// stand-in for the Printify API (podShop / printifyWebhook run with PRINTIFY_API_URL pointing here, token pfy-token)
const pf = { orders: new Map(), sent: [], hooks: [], n: 0, failCreate: false, shipping: [], made: new Map(), created: [], deleted: [], uploads: [], downloaded: [], variantCalls: [] };
const PF_BLUEPRINTS = [[12, "Unisex Jersey Short Sleeve Tee", "Bella+Canvas", "3001"], [36, "Unisex Ultra Cotton Tee", "Gildan", "2000"],
  [77, "Unisex Heavy Blend™ Hooded Sweatshirt", "Gildan", "18500"], [49, "Unisex Heavy Blend™ Crewneck Sweatshirt", "Gildan", "18000"],
  [1298, "Unisex Garment-Dyed Hoodie", "Comfort Colors", "1567"], [1687, "Unisex Nantucket Crewneck Sweatshirt (Embroidery)", "Lane Seven", "LS11004"],
  [70, "Stainless Steel Travel Mug", "Generic brand", ""], [1491, "Women's Hooded Blanket", "Generic brand", ""],
  [1729, "Distressed Dad Hat (Embroidery)", "OTTO Cap", "104-1018"], [10741, "Pet Hoodie with Collar Hole", "Generic brand", ""]];
const PF_HEX = { Black: "#000000", White: "#ffffff", Navy: "#1f2a44" };
const PF_SIZES = { 12: ["S", "M", "L", "XL", "2XL"], 77: ["S", "M", "L", "XL", "2XL"], 1298: ["S", "M"], 1687: ["S", "M"], 36: ["S"], 49: ["S"] };
const pfCost = (bp, size) => ({ 12: 1129, 77: 2158, 1298: 2500, 1687: 2737 }[bp] || 900) + (size === "2XL" ? 219 : 0);
const pfCatalogVariants = (bp) => {
  const colors = bp === 1687 ? ["Navy"] : ["Black", "White", "Navy", "Sold Out"];
  const sizes = PF_SIZES[bp] || ["S"];
  const area = bp === 1687 ? { position: "front_left_chest", decoration_method: "embroidery", width: 1200, height: 1200 } : { position: "front", decoration_method: "dtg", width: 3000, height: 3600 };
  return colors.flatMap((c, ci) => sizes.map((z, zi) => ({ id: bp * 1000 + ci * 10 + zi, title: `${c} / ${z}`, options: { color: c, size: z },
    placeholders: [area, { position: "neck", decoration_method: "dtf", width: 750, height: 750 }], decoration_methods: [area.decoration_method] })));
};
const PF_PRODUCT = {
  id: "pf1", title: "His Love Endures Tee", description: "<p>Soft tee</p>", tags: ["T-shirts"], blueprint_id: 12, print_provider_id: 99,
  options: [
    { name: "Colors", type: "color", values: [{ id: 1, title: "Black", colors: ["#000000"] }, { id: 2, title: "White", colors: ["#ffffff"] }, { id: 3, title: "Red", colors: ["#ff0000"] }] },
    { name: "Sizes", type: "size", values: [{ id: 10, title: "S" }, { id: 11, title: "XL" }, { id: 12, title: "2XL" }] },
  ],
  variants: [
    { id: 101, title: "Black / S", cost: 1129, price: 1463, is_enabled: true, is_default: true, is_available: true, options: [1, 10] },
    { id: 102, title: "Black / XL", cost: 1129, price: 1463, is_enabled: true, is_default: false, is_available: true, options: [1, 11] },
    { id: 103, title: "Black / 2XL", cost: 1348, price: 1700, is_enabled: true, is_default: false, is_available: true, options: [1, 12] },
    { id: 201, title: "White / S", cost: 1129, price: 1463, is_enabled: true, is_default: false, is_available: true, options: [2, 10] },
    { id: 203, title: "White / 2XL", cost: 1348, price: 1700, is_enabled: true, is_default: false, is_available: false, options: [2, 12] },
    { id: 301, title: "Red / S", cost: 1129, price: 1463, is_enabled: false, is_default: false, is_available: true, options: [3, 10] },
  ],
  images: [
    { src: "https://img.test/black-front.png", variant_ids: [101, 102, 103], position: "front", is_default: true },
    { src: "https://img.test/white-front.png", variant_ids: [201, 203], position: "front", is_default: false },
    { src: "https://img.test/black-back.png", variant_ids: [101, 102, 103], position: "back", is_default: false },
    { src: "https://img.test/red-front.png", variant_ids: [301], position: "front", is_default: false },
  ],
};
const PF_EMPTY = { ...PF_PRODUCT, id: "pf2", title: "Draft In Printify", variants: PF_PRODUCT.variants.map((v) => ({ ...v, is_enabled: false })) };
http.createServer(async (req, res) => {
  let raw = ""; for await (const c of req) raw += c;
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.headers.authorization !== "Bearer pfy-token" || !req.headers["user-agent"]) return send(401, { error: "Unauthenticated" });
  const u = new URL(req.url, "http://x"); const path = u.pathname; const body = raw ? JSON.parse(raw) : null;
  if (path === "/v1/shops.json") return send(200, [{ id: 7001, title: "Other", sales_channel: "etsy" }, { id: 111, title: "My new store", sales_channel: "custom_integration" }]);
  if (path === "/v1/shops/111/products.json" && req.method === "GET") return send(200, { current_page: 1, last_page: 1, data: [PF_PRODUCT, PF_EMPTY, ...pf.made.values()] });
  // ---- catalog + product creation (the tool's "make a product from a design")
  if (path === "/v1/catalog/blueprints.json") return send(200, PF_BLUEPRINTS.map(([id, title, brand, model]) => ({ id, title, brand, model, images: [`https://img.test/bp${id}.png`] })));
  const bpOne = path.match(/^\/v1\/catalog\/blueprints\/(\d+)\.json$/);
  if (bpOne) { const b = PF_BLUEPRINTS.find((x) => x[0] === Number(bpOne[1])); return b ? send(200, { id: b[0], title: b[1], brand: b[2], model: b[3], description: "<p>blank</p>", images: [`https://img.test/bp${b[0]}.png`] }) : send(404, {}); }
  const bpProv = path.match(/^\/v1\/catalog\/blueprints\/(\d+)\/print_providers\.json$/);
  if (bpProv) return send(200, Number(bpProv[1]) === 1298 ? [{ id: 39, title: "SwiftPOD" }, { id: 29, title: "Monster Digital" }] : [{ id: 29, title: "Monster Digital" }, { id: 99, title: "Printify Choice" }]);
  const bpVars = path.match(/^\/v1\/catalog\/blueprints\/(\d+)\/print_providers\/(\d+)\/variants\.json$/);
  if (bpVars) { pf.variantCalls.push([Number(bpVars[1]), Number(bpVars[2])]); return send(200, { id: Number(bpVars[2]), variants: pfCatalogVariants(Number(bpVars[1])) }); }
  if (path === "/v1/uploads/images.json") {
    let width = 64, height = 64;
    if (body.url) {   // Printify downloads the design from the site's public bucket
      const got = await fetch(body.url);
      if (!got.ok) return send(400, { errors: { reason: "Could not download image" } });
      pf.downloaded.push(Buffer.from(await got.arrayBuffer()).toString());
      width = 4500; height = 5400;
    } else if (!body.contents) return send(400, { errors: { reason: "No image" } });
    pf.uploads.push(body);
    return send(200, { id: `img${pf.uploads.length}`, file_name: body.file_name, width, height, size: 1, mime_type: "image/png", preview_url: "x" });
  }
  if (path === "/v1/shops/111/products.json" && req.method === "POST") {
    const enabled = body.variants.filter((v) => v.is_enabled);
    if (enabled.length > 100) return send(400, { errors: { reason: "Too many variants enabled. Maximum allowed: 100", code: 8251 } });
    const cat = pfCatalogVariants(body.blueprint_id);
    const id = `pfnew${++pf.n}`;
    const colors = [...new Set(cat.map((v) => v.options.color))], sizes = [...new Set(cat.map((v) => v.options.size))];
    const product = {
      id, title: body.title, description: body.description, blueprint_id: body.blueprint_id, print_provider_id: body.print_provider_id, tags: [],
      options: [
        { name: "Sizes", type: "size", values: sizes.map((t, i) => ({ id: 500 + i, title: t })) },   // sizes first, as some blanks do
        { name: "Colors", type: "color", values: colors.map((t, i) => ({ id: 900 + i, title: t, colors: [PF_HEX[t] || "#777777"] })) },
      ],
      variants: cat.map((v) => {
        const mine = body.variants.find((x) => x.id === v.id) || {};
        return { id: v.id, title: v.title, cost: pfCost(body.blueprint_id, v.options.size), price: mine.price ?? 0, is_enabled: Boolean(mine.is_enabled),
          is_default: false, is_available: v.options.color !== "Sold Out", options: [500 + sizes.indexOf(v.options.size), 900 + colors.indexOf(v.options.color)] };
      }),
      images: colors.map((c) => ({ src: `https://img.test/${id}-${c}.png`, variant_ids: cat.filter((v) => v.options.color === c).map((v) => v.id), position: "front", is_default: c === colors[0] })),
      print_areas: body.print_areas,
    };
    pf.made.set(id, product); pf.created.push(body);
    return send(200, product);
  }
  const delProd = path.match(/^\/v1\/shops\/111\/products\/(\w+)\.json$/);
  if (delProd && req.method === "DELETE") { pf.deleted.push(delProd[1]); pf.made.delete(delProd[1]); return send(200, {}); }
  if (path === "/v1/shops/111/orders/shipping.json") {
    pf.shipping.push(body);
    if (body.address_to.country === "KP") return send(400, { errors: { reason: "Unsupported country" } });
    const qty = body.line_items.reduce((n, l) => n + l.quantity, 0);
    return send(200, { standard: 399 + 209 * (qty - 1), express: 1500 });
  }
  if (path === "/v1/shops/111/orders.json" && req.method === "POST") {
    if (pf.failCreate) return send(400, { status: "error", errors: { reason: "No payment method on file" } });
    const id = `pforder${++pf.n}`;
    pf.orders.set(id, { id, status: "on-hold", body });
    return send(200, { id });
  }
  const send2p = path.match(/^\/v1\/shops\/111\/orders\/([a-z0-9]+)\/send_to_production\.json$/);
  if (send2p) { if (!pf.orders.has(send2p[1])) return send(404, {}); pf.sent.push(send2p[1]); pf.orders.get(send2p[1]).status = "sending-to-production"; return send(202, { id: send2p[1] }); }
  const getOrder = path.match(/^\/v1\/shops\/111\/orders\/([a-z0-9]+)\.json$/);
  if (getOrder) {
    const o = pf.orders.get(getOrder[1]);
    return o ? send(200, { id: o.id, status: o.status, shipments: o.shipments || [] }) : send(404, {});
  }
  if (path === "/v1/shops/111/webhooks.json" && req.method === "GET") return send(200, pf.hooks);
  if (path === "/v1/shops/111/webhooks.json" && req.method === "POST") { pf.hooks.push({ id: `wh${pf.hooks.length + 1}`, ...body }); return send(200, pf.hooks.at(-1)); }
  const delHook = path.match(/^\/v1\/shops\/111\/webhooks\/(\w+)\.json$/);
  if (delHook && req.method === "DELETE") { pf.hooks = pf.hooks.filter((h) => h.id !== delHook[1]); return send(200, {}); }
  send(404, { error: "Not found" });
}).listen(54395, "127.0.0.1");

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
assert.deepEqual({ ...a.checkout_data.custom, checkout_ref: "-" }, { ebook_ids: e1.id, user_id: buyer.id, checkout_ref: "-" });
assert.equal((await service.CheckoutAttempt.get(a.checkout_data.custom.checkout_ref)).total, 2699, "each checkout is remembered for the statistics");
assert.equal(co.after, "/account"); assert.match(a.product_options.redirect_url, /\/account$/);
assert.equal(lemon.body.data.relationships.variant.data.id, "2204367"); assert.equal(lemon.body.data.relationships.store.data.id, "77");
// a guest gets a secret download link instead of a library
const guestCo = await fn(client(), "createEbookCheckout", { ebook_id: e1.id });
const guestCustom = lemon.body.data.attributes.checkout_data.custom;
assert.equal(guestCustom.user_id, "guest"); assert.match(guestCustom.access_token, /^[0-9a-f]{64}$/);
assert.equal(guestCo.after, `/download?token=${guestCustom.access_token}`);
// cart: several ebooks in one checkout, total = sum of the database prices
await admin.db.Ebook.update(e2.id, { secure_file_uri: "a_book.pdf", lemon_squeezy_variant_id: "2204367", price: 4.99 });
await fn(client(), "createEbookCheckout", { ebook_ids: [e1.id, e2.id, e1.id] });
const cartAttrs = lemon.body.data.attributes;
assert.equal(cartAttrs.custom_price, 3198); assert.equal(cartAttrs.product_options.name, "2 ebooks from Dark Network");
assert.equal(cartAttrs.checkout_data.custom.ebook_ids, `${e1.id},${e2.id}`);
const cartToken = cartAttrs.checkout_data.custom.access_token;
const cartRef = cartAttrs.checkout_data.custom.checkout_ref;

// ---------------- webhook -> purchase -> download
const hook = async (payload, secret = "whsec") => {
  const raw = JSON.stringify(payload);
  const r = await fetch(`${URL_}/functions/v1/lemonSqueezyWebhook`, { method: "POST", body: raw,
    headers: { "Content-Type": "application/json", "X-Signature": crypto.createHmac("sha256", secret).update(raw).digest("hex") } });
  return { http: r.status, ...(await r.json()) };
};
const order = (id, custom, status = "paid", email = "buyer@example.com") => ({ meta: { event_name: "order_created", custom_data: custom },   // where Lemon Squeezy really puts it
  data: { id, attributes: { status, user_email: email, total: 2699, currency: "USD", first_order_item: { variant_id: 2204367 } } } });
assert.equal((await hook(order("1001", { ebook_id: e1.id, user_id: buyer.id }), "wrong")).http, 401);
assert.equal((await hook(order("1001", { ebook_id: e1.id, user_id: buyer.id }))).http, 200);
await hook(order("1001", { ebook_id: e1.id, user_id: buyer.id }));   // Lemon Squeezy retries: no duplicate
let mine = await buyer.db.EbookPurchase.filter({ user_id: buyer.id });
assert.equal(mine.length, 1); assert.equal(mine[0].download_access, true); assert.equal(mine[0].provider_variant_id, "2204367");
assert.deepEqual(await admin.db.EbookPurchase.list().then((r) => r.length), 1);
const other = await signUp("other@example.com");
assert.deepEqual(await other.db.EbookPurchase.list(), [], "customers never see each other's purchases");
assert.equal((await fn(other.sb, "generateEbookDownloadUrl", { ebook_id: e1.id })).status, 403);
assert.equal((await fn(client(), "generateEbookDownloadUrl", { ebook_id: e1.id })).status, 401, "a visitor gets no link");
const dl = await fn(buyer.sb, "generateEbookDownloadUrl", { ebook_id: e1.id });
assert.equal(await (await fetch(dl.signed_url)).text(), "%PDF-1.4 secret book");
assert.notEqual((await fetch(dl.signed_url.replace(/token=.{10}/, "token=0000000000"))).status, 200);

// guest cart order: the token (not the email) opens the downloads, and can be moved into an account
await hook(order("1002", { ebook_ids: `${e1.id},${e2.id}`, user_id: "guest", access_token: cartToken, checkout_ref: cartRef }, "paid", "other@example.com"));
await hook(order("1002", { ebook_ids: `${e1.id},${e2.id}`, user_id: "guest", access_token: cartToken, checkout_ref: cartRef }, "paid", "other@example.com"));
const guestRows = await admin.db.EbookPurchase.filter({ provider_order_id: "1002" });
assert.deepEqual(await service.CheckoutAttempt.get(cartRef).then((c) => [c.status, c.order_id, c.email]), ["paid", "1002", "other@example.com"]);
assert.deepEqual(guestRows.map((r) => Number(r.amount)).sort(), [2699, 499]);
const visitor = client();
assert.equal((await fn(visitor, "generateEbookDownloadUrl", { list: true, token: cartToken })).items.length, 2);
assert.equal((await fn(visitor, "generateEbookDownloadUrl", { list: true, token: "0".repeat(64) })).items.length, 0);
assert.equal((await fn(visitor, "generateEbookDownloadUrl", { list: true, token: "" })).status, 401);
assert.equal((await fn(visitor, "generateEbookDownloadUrl", { ebook_id: e1.id, token: "0".repeat(64) })).status, 403);
assert.equal(await (await fetch((await fn(visitor, "generateEbookDownloadUrl", { ebook_id: e2.id, token: cartToken })).signed_url)).text(), "%PDF-1.4 secret book");
assert.equal((await fn(buyer.sb, "generateEbookDownloadUrl", { list: true })).items.length, 1);
assert.equal((await fn(other.sb, "claimGuestPurchases", {})).status, 400, "the same email alone claims nothing");
assert.equal((await fn(other.sb, "claimGuestPurchases", { token: cartToken })).claimed, 2);
assert.equal((await fn(other.sb, "claimGuestPurchases", { token: cartToken })).claimed, 0);
assert.ok((await fn(other.sb, "generateEbookDownloadUrl", { ebook_id: e1.id })).signed_url);
// refund takes the download away
await hook({ meta: { event_name: "order_refunded" }, data: { id: "1002", attributes: { status: "refunded" } } });
assert.equal((await fn(other.sb, "generateEbookDownloadUrl", { ebook_id: e1.id })).status, 403);
assert.equal((await fn(visitor, "generateEbookDownloadUrl", { list: true, token: cartToken })).items.length, 0);

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
assert.equal((await fn(client(), "chatGuest", { action: "unread", ...guest })).unread, 1, "the visitor's badge counts the reply");
assert.equal((await fn(client(), "chatGuest", { action: "unread", guestKey: "someone-else-000" })).unread, 0);
const synced = await fn(client(), "chatGuest", { action: "sync", ...guest });
assert.equal((await fn(client(), "chatGuest", { action: "unread", ...guest })).unread, 0, "opening the chat clears it");
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
// pictures already on the site can be swapped for lighter copies (tool: Cài đặt › Nén lại ảnh)
assert.deepEqual((await tool({ action: "media_list" })).items.find((m) => m.id === made.id),
  { entity: "Ebook", id: made.id, title: "Tool Book", images: [up2.file_url] });
const lighter = await put("tool-book.webp", false, "RIFFwebp");
assert.equal((await tool({ action: "set_media", entity: "Ebook", id: made.id, images: ["https://evil.example/x.webp"] })).http, 400);
assert.equal((await tool({ action: "set_media", entity: "Video", id: made.id, images: [lighter] })).http, 400);
assert.equal((await tool({ action: "set_media", entity: "Ebook", id: made.id, images: [lighter, lighter] })).http, 409);
assert.equal((await tool({ action: "set_media", entity: "Ebook", id: "00000000-0000-0000-0000-000000000000", images: [lighter] })).http, 404);
assert.equal((await tool({ action: "set_media", entity: "Ebook", id: made.id, images: [lighter] }, "wrong-token-0123456789abcdef")).http, 401);
assert.equal((await tool({ action: "set_media", entity: "Ebook", id: made.id, images: [lighter] })).http, 200);
const lightened = await admin.db.Ebook.get(made.id);
assert.deepEqual([lightened.cover_image, lightened.price, lightened.status, lightened.title], [lighter, 7, "draft", "Tool Book"]);

// the tool answers the same chat inbox
const toolConvs = (await tool({ action: "chat_list" })).conversations;
const memberConv = toolConvs.find((c) => c.last_message_preview === "From a member");
assert.equal(memberConv.unread_for_admin, true);
assert.deepEqual((await tool({ action: "chat_thread", conversation_id: memberConv.id })).messages.map((m) => m.body), ["From a member"]);
assert.equal(await admin.db.ChatConversation.count({ unread_for_admin: true }), 0, "reading in the tool marks it read");
assert.equal((await tool({ action: "chat_reply", conversation_id: memberConv.id, body: " " })).http, 400);
assert.equal((await tool({ action: "chat_reply", conversation_id: memberConv.id, body: "Reply from the tool" })).message.sender_name, "Dark Network");
assert.equal((await fn(buyer.sb, "chatGuest", { action: "unread" })).unread, 1);
assert.equal((await fn(buyer.sb, "chatGuest", { action: "sync" })).messages.at(-1).body, "Reply from the tool");
assert.equal((await tool({ action: "chat_list" }, "wrong-token-0123456789abcdef")).http, 401);

// orders and the visit counter, as the tool sees them
const orders = (await tool({ action: "orders" })).items;
const cartOrder = orders.find((o) => o.order_id === "1002");
assert.deepEqual([cartOrder.email, cartOrder.status, cartOrder.total, cartOrder.items.length, cartOrder.buyer], ["other@example.com", "refunded", 3198, 2, "account"]);
assert.ok(!JSON.stringify(orders).includes(cartToken), "the private download token never leaves the site");
assert.deepEqual(await anon.PageView.create({ path: "/books", visitor_id: "v1" }), { path: "/books", visitor_id: "v1" });
await anon.PageView.create({ path: "/books", visitor_id: "v1" });
await anon.PageView.create({ path: "/", visitor_id: "v2" });
assert.deepEqual(await anon.PageView.list(), [], "visitors cannot read the counter");
assert.deepEqual(await anon.TrafficSummary.list().then((r) => Number(r[0].views_30d)), 0, "nor its summaries");
const traffic = await tool({ action: "traffic" });
assert.deepEqual([traffic.summary.views_today, traffic.summary.visitors_today, traffic.summary.views_30d, traffic.summary.visitors_7d], [3, 2, 3, 2]);
assert.deepEqual([traffic.days.length, traffic.days[0].views, traffic.pages[0].path, traffic.pages[0].views], [1, 3, "/books", 2]);

// statistics like Google Analytics: sessions, country, source, time on page, cart, checkouts
await anon.PageView.create({ path: `/books/${e1.slug}`, visitor_id: "v3", session_id: "s3", country: "US", referrer: "https://www.youtube.com/" });
await anon.SiteEvent.create({ name: "engage", visitor_id: "v3", session_id: "s3", path: `/books/${e1.slug}`, value: 15000 });
await anon.SiteEvent.create({ name: "add_to_cart", visitor_id: "v3", session_id: "s3", item_id: e1.id });
await assert.rejects(anon.SiteEvent.create({ name: "purchase", visitor_id: "v3" }), "only the known events");
assert.deepEqual(await anon.SiteEvent.list(), [], "visitors cannot read the events");
assert.deepEqual(await anon.CheckoutAttempt.list(), [], "nor the checkouts");
await assert.rejects(anon.CheckoutAttempt.create({ id: "fake", ebook_ids: [e1.id] }), "nor write checkouts");
const an = await tool({ action: "analytics", days: 28 });
assert.deepEqual([an.days_range, an.days.length, an.summary.users, an.summary.views, an.summary.engaged], [28, 28, 3, 4, 2]);
assert.deepEqual(an.channels.map((c) => [c.channel, c.sessions]).sort(), [["Direct", 2], ["Organic Video", 1]]);
assert.deepEqual([an.countries.find((c) => c.country === "US").users, an.pages.find((p) => p.path === `/books/${e1.slug}`).title], [1, e1.title]);
assert.deepEqual([an.funnel.book_views, an.funnel.add_to_cart, an.funnel.checkouts, an.funnel.checkouts_paid], [1, 1, 3, 1]);
assert.deepEqual(an.checkouts.find((c) => c.items.length === 2).status, "refunded");
assert.deepEqual([an.books.find((b) => b.id === e1.id).add_to_cart, an.realtime.users_30m, an.subscribers.total], [1, 3, 1]);
assert.equal((await tool({ action: "analytics", days: 5 })).days_range, 7, "only 7 / 28 / 90 days");
const rpc = await fetch(`${URL_}/rest/v1/rpc/tool_analytics`, { method: "POST", body: "{}",
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" } });
assert.ok(!rpc.ok, "visitors cannot call the statistics function");

// ---------------- the owner's phone app (/studio): adminApp + notifications
// stand-in push service (a phone's browser): receives what the site sends, decrypted with the phone's keys
const pushed = [];
let pushStatus = 201;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  pushed.push({ headers: req.headers, body: Buffer.concat(chunks) });
  res.writeHead(pushStatus); res.end();
}).listen(54398, "127.0.0.1");
const phone = crypto.createECDH("prime256v1"); phone.generateKeys();
const phoneAuth = crypto.randomBytes(16);
const subscription = { endpoint: "http://127.0.0.1:54398/push/abc", keys: { p256dh: phone.getPublicKey().toString("base64url"), auth: phoneAuth.toString("base64url") } };
const ece = (await import("http_ece")).default;
const openPush = ({ headers, body }) => {
  const [, jwt, k] = headers.authorization.match(/^vapid t=([^,]+), k=(.+)$/);
  return { jwt, k, message: JSON.parse(ece.decrypt(body, { version: "aes128gcm", privateKey: phone, authSecret: phoneAuth.toString("base64url") }).toString()) };
};
const waitPush = async (n) => { for (let i = 0; i < 50 && pushed.length < n; i++) await new Promise((r) => setTimeout(r, 100)); assert.equal(pushed.length, n); return openPush(pushed[n - 1]); };

assert.equal((await fn(client(), "adminApp", { action: "orders" })).status, 401, "visitors get nothing");
assert.equal((await fn(buyer.sb, "adminApp", { action: "orders" })).status, 403, "customers get nothing");
assert.equal((await fn(buyer.sb, "adminApp", { action: "push_subscribe", subscription })).status, 403);
const appOrders = (await fn(admin.sb, "adminApp", { action: "orders" })).items;
assert.deepEqual(appOrders.find((o) => o.order_id === "1002").items.length, 2, "same orders as the desktop tool");
assert.equal((await fn(admin.sb, "adminApp", { action: "analytics", days: 28 })).days_range, 28);
const key = (await fn(admin.sb, "adminApp", { action: "push_key" })).public_key;
assert.equal(Buffer.from(key, "base64url").length, 65, "a P-256 public key");
assert.equal((await fn(admin.sb, "adminApp", { action: "push_key" })).public_key, key, "made once, then kept");
assert.deepEqual(await anon.PushConfig.list(), [], "the private key never leaves the server");
assert.equal((await fn(admin.sb, "adminApp", { action: "push_subscribe", subscription: { ...subscription, endpoint: "http://evil.example/x" } })).status, 400);
assert.equal((await fn(admin.sb, "adminApp", { action: "push_subscribe", subscription, orders_seen: "2000-01-01T00:00:00Z" })).ok, true);
assert.equal((await fn(admin.sb, "adminApp", { action: "push_subscribe", subscription })).ok, true, "subscribing again updates the same row");
assert.equal((await service.PushSubscription.list()).length, 1);
assert.deepEqual(await anon.PushSubscription.list(), [], "subscriptions are server only");

// test button -> a notification the phone can decrypt, signed with the site's key
assert.equal((await fn(admin.sb, "adminApp", { action: "push_test", endpoint: subscription.endpoint })).ok, true);
let got = await waitPush(1);
assert.equal(got.k, key); assert.equal(pushed[0].headers["content-encoding"], "aes128gcm"); assert.equal(pushed[0].headers.ttl, "86400");
assert.equal(got.message.tag, "test");
const [h, c, sig] = got.jwt.split(".");
const claims = JSON.parse(Buffer.from(c, "base64url"));
assert.equal(claims.aud, "http://127.0.0.1:54398"); assert.ok(claims.exp > Date.now() / 1000 && claims.exp <= Date.now() / 1000 + 24 * 3600); assert.match(claims.sub, /^https:\/\//);
const vapidPublic = await crypto.webcrypto.subtle.importKey("raw", Buffer.from(key, "base64url"), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
assert.ok(await crypto.webcrypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, vapidPublic, Buffer.from(sig, "base64url"), Buffer.from(`${h}.${c}`)), "VAPID signature");

// a customer writes -> the owner's phone is told right away
await fn(client(), "chatGuest", { action: "send", guestKey: "guestkey-push-0001", body: "Is the Enoch book a PDF?" });
got = await waitPush(2);
assert.match(got.message.title, /^Tin nhắn mới/); assert.equal(got.message.body, "Is the Enoch book a PDF?"); assert.match(got.message.url, /^\/studio\/\?tab=chat&c=/);
assert.ok(got.message.badge >= 1, "the icon number counts customers waiting");
// a new paid order -> one notification, not one per Lemon Squeezy retry
await hook(order("2001", { ebook_id: e1.id, user_id: "guest" }, "paid", "fan@example.com"));
await hook(order("2001", { ebook_id: e1.id, user_id: "guest" }, "paid", "fan@example.com"));
got = await waitPush(3);
assert.equal(got.message.title, "Đơn hàng mới · $26.99"); assert.equal(got.message.body, "Book 1 · fan@example.com"); assert.equal(got.message.url, "/studio/?tab=orders");
await new Promise((r) => setTimeout(r, 500)); assert.equal(pushed.length, 3, "a retried order does not notify twice");
// the phone opened Orders: those orders no longer count on the icon
await fn(admin.sb, "adminApp", { action: "seen", endpoint: subscription.endpoint, orders_seen: new Date().toISOString() });
await fn(client(), "chatGuest", { action: "send", guestKey: "guestkey-push-0001", body: "Thanks" });
got = await waitPush(4);
assert.equal(got.message.badge, await service.ChatConversation.count({ unread_for_admin: true }));
// a phone that turned notifications off is forgotten by the site
pushStatus = 410;
await fn(client(), "chatGuest", { action: "send", guestKey: "guestkey-push-0001", body: "Hello?" });
await waitPush(5);
assert.equal((await service.PushSubscription.list()).length, 0);
pushStatus = 201;

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

// ---------------- site settings (Admin > Cài đặt): everyone reads, only admins write
assert.deepEqual(await anon.SiteSetting.list(), []);
await rejects(buyer.db.SiteSetting.create({ id: "new_badge", value: { enabled: false } }), /row-level security/);
await admin.db.SiteSetting.create({ id: "new_badge", value: { enabled: false, days: 30 } });
await admin.db.SiteSetting.update("new_badge", { value: { enabled: true, days: 14 } });
await rejects(buyer.db.SiteSetting.update("new_badge", { value: { enabled: false } }), /multiple \(or no\) rows|row-level/);
assert.deepEqual((await anon.SiteSetting.get("new_badge")).value, { enabled: true, days: 14 });
await rejects(admin.db.SiteSetting.create({ id: "Bad Key!", value: {} }), /check constraint/);

// ---------------- accounts (Admin > Tài khoản): adminUsers
const users = (sb) => fn(sb, "adminUsers", { action: "list" });
assert.equal((await users(client())).status, 401, "visitors get nothing");
assert.equal((await users(buyer.sb)).status, 403, "customers get nothing");
const fan = await signUp("fan@example.com");
let list = await users(admin.sb);
const row = (email) => list.items.find((u) => u.email === email);
assert.equal(list.status, 200);
assert.deepEqual([row("owner@example.com").role, row("owner@example.com").is_me, row("fan@example.com").role, row("fan@example.com").banned],
  ["admin", true, "user", false]);
assert.equal(typeof row("buyer@example.com").purchases, "number");
assert.ok(row("owner@example.com").last_sign_in_at === null || typeof row("owner@example.com").last_sign_in_at === "string");
const usr = (body) => fn(admin.sb, "adminUsers", body);
assert.equal((await usr({ action: "ban", id: admin.id })).status, 400, "nobody bans themselves");
assert.equal((await usr({ action: "set_role", id: admin.id, role: "user" })).status, 400, "nobody demotes themselves");
assert.equal((await fn(buyer.sb, "adminUsers", { action: "ban", id: fan.id })).status, 403);
// ban: no new sign-in, the open session sees its ban flag (the site then signs it out), no self-unban
assert.equal((await usr({ action: "ban", id: fan.id })).status, 200);
assert.equal((await client().auth.signInWithPassword({ email: "fan@example.com", password: "secret123" })).error.message, "User is banned");
assert.ok((await fan.sb.from("profiles").select("banned_at").eq("id", fan.id).single()).data.banned_at);
assert.equal((await fan.sb.from("profiles").update({ banned_at: null }).eq("id", fan.id).select()).data.length, 0, "no self-unban");
list = await users(admin.sb);
assert.equal(row("fan@example.com").banned, true);
assert.equal((await usr({ action: "set_role", id: fan.id, role: "admin" })).status, 400, "a banned account cannot become admin");
assert.equal((await usr({ action: "unban", id: fan.id })).status, 200);
const fanAgain = client();
assert.equal((await fanAgain.auth.signInWithPassword({ email: "fan@example.com", password: "secret123" })).error, null);
// admin by email (any case); an unknown email says to sign up first; admins cannot be banned until demoted
assert.match((await usr({ action: "set_role", email: "nobody@example.com", role: "admin" })).error, /đăng ký/);
assert.deepEqual(await usr({ action: "set_role", email: " FAN@example.com ", role: "admin" }), { status: 200, ok: true, email: "fan@example.com", role: "admin" });
const fanBook = await entitiesProxy(fanAgain).Ebook.create(ebook(77, { status: "draft" }));
assert.equal(fanBook.slug, "book-77", "the new admin can edit content");
assert.equal((await fn(fanAgain, "adminUsers", { action: "list" })).status, 200, "and open Admin > Tài khoản");
assert.equal((await usr({ action: "ban", id: fan.id })).status, 400, "an admin must be demoted before a ban");
assert.equal((await usr({ action: "set_role", id: fan.id, role: "user" })).status, 200);
await rejects(entitiesProxy(fanAgain).Ebook.update(fanBook.id, { price: 1 }), /multiple \(or no\) rows|row-level/);
await service.Ebook.delete(fanBook.id);

// ---------------- PayPal (paypalCheckout + paypalWebhook; the stack runs with PAYPAL_ENV=live)
const pay = (sb, body) => fn(sb, "paypalCheckout", body);
const ppHook = async (event, sig = "good") => {
  const r = await fetch(`${URL_}/functions/v1/paypalWebhook`, { method: "POST", body: JSON.stringify(event), headers: {
    "Content-Type": "application/json", "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://api.paypal.com/cert.pem",
    "paypal-transmission-id": "t-1", "paypal-transmission-sig": sig, "paypal-transmission-time": new Date().toISOString() } });
  return { http: r.status, ...(await r.json()) };
};
const p1 = await admin.db.Ebook.create(ebook(31, { price: 12.5, secure_file_uri: "a_book.pdf" }));
const p2 = await admin.db.Ebook.create(ebook(32, { price: 4.99, secure_file_uri: "a_book.pdf" }));
const pDraft = await admin.db.Ebook.create(ebook(33, { price: 3, status: "draft" }));
assert.deepEqual(await pay(client(), { action: "config" }), { status: 200, ready: true, env: "live", client_id: "client-1" });
assert.equal((await pay(client(), { action: "create" })).status, 400);
assert.equal((await pay(client(), { action: "create", ebook_ids: [pDraft.id] })).status, 400, "a draft cannot be bought");
assert.equal((await pay(client(), { action: "create", ebook_ids: ["nope"] })).status, 404);
assert.equal((await pay(client(), { action: "capture", order_id: "ORDERNOPE1" })).status, 404);

// a guest buys one book: price from the database, download key kept on the server
const g = await pay(client(), { action: "create", ebook_ids: [p1.id], price: 0.01 });
assert.equal(g.status, 200);
const gOrder = pp.orders.get(g.id).body.purchase_units[0];
const [gAttempt] = await service.CheckoutAttempt.filter({ order_id: g.id });
assert.deepEqual([gOrder.amount.value, gOrder.items[0].name, gOrder.items[0].category, gOrder.custom_id, gOrder.invoice_id],
  ["12.50", "Book 31", "DIGITAL_GOODS", gAttempt.id, gAttempt.id]);
assert.deepEqual([gAttempt.provider, gAttempt.total, gAttempt.status, gAttempt.user_id], ["paypal", 1250, "started", null]);
assert.match(gAttempt.access_token, /^[0-9a-f]{64}$/);
assert.ok(gOrder.description.endsWith(`/download?token=${gAttempt.access_token}`), "the guest link rides in the PayPal receipt");
assert.equal(pp.requestIds.at(-1), gAttempt.id, "create is idempotent on PayPal's side");
assert.equal(await service.EbookPurchase.count({ provider_order_id: g.id }), 0, "nothing is granted before payment");
const gPaid = await pay(client(), { action: "capture", order_id: g.id });
assert.deepEqual(gPaid, { status: "paid", after: `/download?token=${gAttempt.access_token}` });   // fn() keeps the body's own "status"
assert.deepEqual(await pay(client(), { action: "capture", order_id: g.id }), { status: "paid", after: `/download?token=${gAttempt.access_token}` }, "a second capture is harmless");
const gRows = await service.EbookPurchase.filter({ provider_order_id: g.id });
assert.deepEqual(gRows.map((r) => [r.provider, r.ebook_id, Number(r.amount), r.payment_status, r.download_access, r.customer_email, r.user_id]),
  [["paypal", p1.id, 1250, "paid", true, "payer@example.com", null]]);
assert.deepEqual(await service.CheckoutAttempt.get(gAttempt.id).then((a) => [a.status, a.email, Boolean(a.capture_id), Boolean(a.paid_date)]), ["paid", "payer@example.com", true, true]);
assert.equal((await fn(client(), "generateEbookDownloadUrl", { list: true, token: gAttempt.access_token })).items.length, 1);
assert.equal(await (await fetch((await fn(client(), "generateEbookDownloadUrl", { ebook_id: p1.id, token: gAttempt.access_token })).signed_url)).text(), "%PDF-1.4 secret book");

// a signed-in buyer's cart: one order, both books, each row with its own price, straight to the library
const shopper = await signUp("shopper@example.com");
const s1 = await pay(shopper.sb, { action: "create", ebook_ids: [p1.id, p2.id, p1.id] });
const sUnit = pp.orders.get(s1.id).body.purchase_units[0];
assert.deepEqual([sUnit.amount.value, sUnit.amount.breakdown.item_total.value, sUnit.items.length, sUnit.description], ["17.49", "17.49", 2, "2 ebooks from Dark Network"]);
assert.deepEqual(await pay(shopper.sb, { action: "capture", order_id: s1.id }), { status: "paid", after: "/account" });
assert.deepEqual((await shopper.db.EbookPurchase.filter({ user_id: shopper.id })).map((r) => Number(r.amount)).sort(), [1250, 499]);
assert.ok((await fn(shopper.sb, "generateEbookDownloadUrl", { ebook_id: p2.id })).signed_url);

// a declined card: PayPal lets the buyer choose another, then it goes through
const d1 = await pay(client(), { action: "create", ebook_ids: [p2.id] });
pp.next.decline = true;
const declined = await pay(client(), { action: "capture", order_id: d1.id });
assert.deepEqual([declined.status, declined.restart], [402, true]);
assert.equal((await pay(client(), { action: "capture", order_id: d1.id })).status, "paid");

// PayPal reports a different amount: no books
const m1 = await pay(client(), { action: "create", ebook_ids: [p1.id] });
pp.next.amount = { currency_code: "USD", value: "0.50" };
assert.equal((await pay(client(), { action: "capture", order_id: m1.id })).status, 409);
assert.equal(await service.EbookPurchase.count({ provider_order_id: m1.id }), 0);
assert.equal((await service.CheckoutAttempt.filter({ order_id: m1.id }))[0].status, "started", "statistics see it as not paid");

// a pending payment: no books until PayPal's webhook says COMPLETED (and only a verified webhook counts)
const w1 = await pay(client(), { action: "create", ebook_ids: [p2.id] });
pp.next.pending = true;
const wPending = await pay(client(), { action: "capture", order_id: w1.id });
assert.equal(wPending.status, "pending");
assert.equal((await service.CheckoutAttempt.filter({ order_id: w1.id }))[0].status, "started");
assert.equal(await service.EbookPurchase.count({ provider_order_id: w1.id }), 0);
const [wAttempt] = await service.CheckoutAttempt.filter({ order_id: w1.id });
const wCapture = { ...pp.captures.get(wAttempt.capture_id), status: "COMPLETED" };
const completed = { event_type: "PAYMENT.CAPTURE.COMPLETED", resource: wCapture };
assert.equal((await ppHook(completed, "forged")).http, 401);
assert.equal(await service.EbookPurchase.count({ provider_order_id: w1.id }), 0);
assert.deepEqual(await ppHook(completed), { http: 200, received: true, status: "paid" });
assert.deepEqual(await ppHook(completed), { http: 200, received: true, status: "paid" }, "PayPal retries: no duplicate");
assert.deepEqual((await service.EbookPurchase.filter({ provider_order_id: w1.id })).map((r) => [r.payment_status, r.download_access]), [["paid", true]]);

// refunds: partial keeps the download, full takes it away; a chargeback (reversal) too
const refund = (captureId) => ({ event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "REF1", status: "COMPLETED",
  links: [{ rel: "up", method: "GET", href: `https://api.paypal.com/v2/payments/captures/${captureId}` }] } });
const gCap = (await service.CheckoutAttempt.get(gAttempt.id)).capture_id;
pp.captures.get(gCap).status = "PARTIALLY_REFUNDED";
assert.deepEqual(await ppHook(refund(gCap)), { http: 200, received: true, updated: 1 });
assert.deepEqual((await service.EbookPurchase.filter({ provider_order_id: g.id })).map((r) => [r.payment_status, r.download_access]), [["partially_refunded", true]]);
pp.captures.get(gCap).status = "REFUNDED";
await ppHook(refund(gCap));
assert.deepEqual((await service.EbookPurchase.filter({ provider_order_id: g.id })).map((r) => [r.payment_status, r.download_access]), [["refunded", false]]);
assert.equal((await fn(client(), "generateEbookDownloadUrl", { list: true, token: gAttempt.access_token })).items.length, 0);
assert.equal((await service.CheckoutAttempt.get(gAttempt.id)).status, "refunded");
const sCap = (await service.CheckoutAttempt.filter({ order_id: s1.id }))[0].capture_id;
assert.deepEqual(await ppHook({ event_type: "PAYMENT.CAPTURE.REVERSED", resource: { id: sCap, status: "REVERSED" } }), { http: 200, received: true, updated: 2 });
assert.equal((await fn(shopper.sb, "generateEbookDownloadUrl", { ebook_id: p2.id })).status, 403);
assert.deepEqual(await ppHook({ event_type: "CHECKOUT.ORDER.APPROVED", resource: {} }), { http: 200, received: true, event: "CHECKOUT.ORDER.APPROVED" });

// the owner's lists count PayPal orders like the others
const toolOrders = (await tool({ action: "orders" })).items;
assert.ok(toolOrders.some((o) => o.order_id === w1.id || o.provider_order_id === w1.id || JSON.stringify(o).includes(w1.id)), "the desktop tool lists PayPal orders");

// while PAYPAL_ENV is "sandbox" only admins may pay (test money); everyone else keeps the old checkout
const { spawn } = await import("node:child_process");
const sandboxFn = spawn("deno", ["run", "-A", "--quiet", new URL("../../supabase/functions/paypalCheckout/index.ts", import.meta.url).pathname], {
  env: { ...process.env, PAYPAL_ENV: "sandbox", DENO_SERVE_ADDRESS: "tcp:127.0.0.1:54396", SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: SERVICE }, stdio: "ignore" });
const sandbox = async (sb, body) => {
  const token = sb ? (await sb.auth.getSession()).data.session.access_token : ANON;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch("http://127.0.0.1:54396", { method: "POST", body: JSON.stringify(body),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: ANON } });
      return { status: r.status, ...(await r.json()) };
    } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  throw new Error("sandbox function did not start");
};
try {
  assert.deepEqual(await sandbox(null, { action: "config" }), { status: 200, ready: false, env: "sandbox" });
  assert.deepEqual(await sandbox(shopper.sb, { action: "config" }), { status: 200, ready: false, env: "sandbox" });
  assert.equal((await sandbox(shopper.sb, { action: "create", ebook_ids: [p2.id] })).status, 503);
  assert.deepEqual(await sandbox(admin.sb, { action: "config" }), { status: 200, ready: true, env: "sandbox", client_id: "client-1" });
  assert.equal((await sandbox(admin.sb, { action: "create", ebook_ids: [p2.id] })).status, 200);
} finally {
  sandboxFn.kill();
}

// ---------------- print on demand (podShop + printifyWebhook + paypalWebhook; Printify played on 54395)
const pod = (sb, body) => fn(sb, "podShop", body);
assert.equal((await pod(client(), { action: "sync" })).status, 401);
assert.equal((await pod(shopper.sb, { action: "sync" })).status, 403);
assert.equal((await pod(shopper.sb, { action: "orders" })).status, 403);
const podSynced = await pod(admin.sb, { action: "sync" });
assert.deepEqual([podSynced.status, podSynced.created, podSynced.skipped, podSynced.updated], [200, ["His Love Endures Tee"], ["Draft In Printify"], []]);
let [tee] = await service.Product.filter({ printify_product_id: "pf1" });
assert.deepEqual([tee.status, tee.price, tee.category, tee.slug, tee.description], ["draft", 21.99, "Apparel", "his-love-endures-tee", "<p>Soft tee</p>"]);
assert.deepEqual(tee.options.map((o) => o.values.map((v) => v.title)), [["Black", "White"], ["S", "XL", "2XL"]], "only colours / sizes on sale");
assert.deepEqual(tee.variants.map((v) => [v.id, v.extra, v.available]), [[101, 0, true], [102, 0, true], [103, 300, true], [201, 0, true], [203, 300, false]],
  "2XL costs $2.19 more -> $21.99 + 2.19 = 24.18 -> rounded up to $24.99");
assert.deepEqual(tee.images, ["https://img.test/black-front.png", "https://img.test/black-back.png"]);
assert.ok(!JSON.stringify(tee).includes("1348"), "cost prices never reach the public product row");
// a second sync keeps the owner's price and pictures, refreshes the rest
await service.Product.update(tee.id, { price: 19.99, images: ["https://my.cdn/photo.jpg"] });
const resynced = await pod(admin.sb, { action: "sync" });
assert.deepEqual([resynced.created, resynced.updated], [[], ["His Love Endures Tee"]]);
tee = await service.Product.get(tee.id);
assert.deepEqual([tee.price, tee.images, tee.variants.find((v) => v.id === 103).extra], [19.99, ["https://my.cdn/photo.jpg"], 300], "$19.99 + 2.19 = 22.18 -> $22.99");
await service.Product.update(tee.id, { price: 21.99 });
await pod(admin.sb, { action: "sync" });
tee = await service.Product.get(tee.id);

const addr = { first_name: "Mary", last_name: "Jones", email: "Mary@Example.com ", phone: "", country: "US", region: "GA", address1: "1 Peachtree St", address2: "", city: "Atlanta", zip: "30303" };
const cartItems = [{ product_id: tee.id, variant_id: 101, quantity: 1 }, { product_id: tee.id, variant_id: 103, quantity: 2 }];
assert.equal((await pod(client(), { action: "quote", items: cartItems, address: addr })).status, 409, "a draft cannot be bought");
await service.Product.update(tee.id, { status: "published" });
assert.deepEqual(await pod(client(), { action: "config" }), { status: 200, ready: true, env: "live", client_id: "client-1" });
assert.equal((await pod(client(), { action: "quote", items: [], address: addr })).status, 400);
assert.equal((await pod(client(), { action: "quote", items: cartItems, address: { ...addr, zip: "" } })).status, 400);
assert.equal((await pod(client(), { action: "quote", items: cartItems, address: { ...addr, region: "" } })).status, 400, "a US address needs a state");
assert.equal((await pod(client(), { action: "quote", items: [{ product_id: tee.id, variant_id: 203, quantity: 1 }], address: addr })).status, 409, "out of stock");
assert.equal((await pod(client(), { action: "quote", items: [{ product_id: tee.id, variant_id: 301, quantity: 1 }], address: addr })).status, 409, "not on sale");
assert.equal((await pod(client(), { action: "quote", items: [{ product_id: tee.id, variant_id: 101, quantity: 0 }], address: addr })).status, 400);
assert.equal((await pod(client(), { action: "quote", items: cartItems, address: { ...addr, country: "KP", region: "" } })).status, 422);
const quote = await pod(client(), { action: "quote", items: [...cartItems, { product_id: tee.id, variant_id: "101", quantity: 1, price: 0.01 }], address: addr });
assert.deepEqual([quote.status, quote.subtotal, quote.shipping, quote.total], [200, 2199 * 2 + 2499 * 2, 399 + 209 * 3, 2199 * 2 + 2499 * 2 + 1026],
  "server prices; the same variant twice is one line");
assert.deepEqual(quote.lines.map((l) => [l.variant_id, l.quantity, l.unit_price, l.image]), [[101, 2, 2199, "https://img.test/black-front.png"], [103, 2, 2499, "https://img.test/black-front.png"]]);
assert.deepEqual(pf.shipping.at(-1).address_to, { first_name: "Mary", last_name: "Jones", email: "mary@example.com", phone: "", country: "US", region: "GA", address1: "1 Peachtree St", address2: "", city: "Atlanta", zip: "30303" });

// a guest buys two lines; PayPal gets the address, the shipping and the items
const pc = await pod(client(), { action: "create", items: cartItems, address: addr });
assert.equal(pc.status, 200);
const [po] = await service.PodOrder.filter({ paypal_order_id: pc.id });
const pu = pp.orders.get(pc.id).body.purchase_units[0];
assert.deepEqual([po.status, po.subtotal, po.shipping, po.total, po.user_id, po.email], ["started", 7197, 817, 8014, null, "mary@example.com"]);
assert.deepEqual([pu.custom_id, pu.amount.value, pu.amount.breakdown.item_total.value, pu.amount.breakdown.shipping.value], [`pod_${po.id}`, "80.14", "71.97", "8.17"]);
assert.deepEqual(pu.items.map((i) => [i.name, i.quantity, i.unit_amount.value, i.category]), [["His Love Endures Tee - Black / S", "1", "21.99", "PHYSICAL_GOODS"], ["His Love Endures Tee - Black / 2XL", "2", "24.99", "PHYSICAL_GOODS"]]);
assert.deepEqual(pu.shipping.address, { address_line_1: "1 Peachtree St", admin_area_2: "Atlanta", admin_area_1: "GA", postal_code: "30303", country_code: "US" });
assert.equal(pp.orders.get(pc.id).body.application_context.shipping_preference, "SET_PROVIDED_ADDRESS");
assert.ok(pu.description.endsWith(`/order/${po.id}?token=${po.access_token}`));
assert.deepEqual(await anon.PodOrder.list(), [], "visitors cannot read orders");
assert.equal(pf.orders.size, 0, "nothing goes to Printify before payment");

const pcPaid = await pod(client(), { action: "capture", order_id: pc.id });
assert.deepEqual([pcPaid.status, pcPaid.after], ["paid", `/order/${po.id}?token=${po.access_token}`]);
let poNow = await service.PodOrder.get(po.id);
assert.deepEqual([poNow.status, poNow.printify_order_id, poNow.printify_status, poNow.capture_id.startsWith("CAP")], ["in_production", "pforder1", "sending-to-production", true]);
const sentOrder = pf.orders.get("pforder1").body;
assert.deepEqual([sentOrder.external_id, sentOrder.shipping_method, sentOrder.send_shipping_notification, sentOrder.line_items],
  [po.id, 1, true, [{ product_id: "pf1", variant_id: 101, quantity: 1 }, { product_id: "pf1", variant_id: 103, quantity: 2 }]]);
assert.deepEqual(pf.sent, ["pforder1"]);
assert.deepEqual(await pod(client(), { action: "capture", order_id: pc.id }), pcPaid);
assert.equal(pf.orders.size, 1, "a second capture call does not order twice");

// the order page: by secret link, by the owner, never by someone else
const tracked = await pod(client(), { action: "track", id: po.id, token: po.access_token });
assert.deepEqual([tracked.order.status, tracked.order.total, tracked.order.items.length, tracked.order.address.name], ["in_production", 8014, 2, "Mary Jones"]);
assert.ok(!JSON.stringify(tracked).includes(po.capture_id) && !JSON.stringify(tracked).includes("pforder1"), "no payment or Printify ids for the buyer");
assert.equal((await pod(client(), { action: "track", id: po.id, token: "wrong" })).status, 404);
assert.equal((await pod(shopper.sb, { action: "track", id: po.id })).status, 404);
assert.equal((await pod(admin.sb, { action: "track", id: po.id })).status, 200);

// Printify webhooks: signed with HMAC(secret derived from the token)
const hookSecret = crypto.createHmac("sha256", "pfy-token").update("dn-printify-webhook").digest("hex");
const pfHook = async (event, secret = hookSecret) => {
  const raw = JSON.stringify(event);
  const r = await fetch(`${URL_}/functions/v1/printifyWebhook`, { method: "POST", body: raw, headers: {
    "Content-Type": "application/json", "x-pfy-signature": `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}` } });
  return { http: r.status, ...(await r.json()) };
};
const shipEvent = (type, extra) => ({ id: "e1", type, created_at: "2026-11-15 10:00:00+00:00", resource: { id: "pforder1", type: "order", data: { shop_id: 111, ...extra } } });
assert.equal((await pfHook(shipEvent("order:shipment:created", {}), "bad-secret")).http, 401);
assert.deepEqual(await pfHook(shipEvent("order:shipment:created", { shipped_at: "2026-11-15 10:00:00+00:00", carrier: { code: "usps", tracking_number: "9400111", tracking_url: "https://tools.usps.com/t?n=9400111" }, skus: [] })),
  { http: 200, received: true, status: "shipped" });
poNow = await service.PodOrder.get(po.id);
assert.deepEqual(poNow.shipments, [{ carrier: "usps", number: "9400111", url: "https://tools.usps.com/t?n=9400111", shipped_at: "2026-11-15 10:00:00+00:00" }]);
assert.deepEqual(await pfHook(shipEvent("order:updated", { status: "in-production" })), { http: 200, received: true, status: "shipped" }, "a late status never moves an order back");
assert.deepEqual(await pfHook(shipEvent("order:shipment:delivered", { delivered_at: "2026-11-18 10:00:00+00:00", carrier: { code: "usps", tracking_number: "9400111", tracking_url: "https://tools.usps.com/t?n=9400111" } })),
  { http: 200, received: true, status: "delivered" });
assert.deepEqual((await pfHook({ ...shipEvent("order:updated", {}), resource: { id: "nope", type: "order", data: {} } })), { http: 200, received: true, note: "unknown order" });

// a signed-in buyer: Printify refuses the order -> needs attention, the owner fixes it and sends it again
const myPod = await pod(shopper.sb, { action: "create", items: [{ product_id: tee.id, variant_id: 201, quantity: 1 }], address: { ...addr, email: "shopper@example.com" } });
pf.failCreate = true;
assert.equal((await pod(shopper.sb, { action: "capture", order_id: myPod.id })).status, "paid", "the buyer has paid: their page still opens");
let [myOrder] = await service.PodOrder.filter({ paypal_order_id: myPod.id });
assert.deepEqual([myOrder.status, myOrder.user_id, myOrder.printify_order_id], ["needs_attention", shopper.id, null]);
assert.match(myOrder.note, /No payment method on file/);
assert.deepEqual((await shopper.db.PodOrder.list()).map((o) => o.id), [myOrder.id], "a buyer reads their own orders only");
assert.equal((await pod(shopper.sb, { action: "retry", id: myOrder.id })).status, 403);
assert.equal((await pod(admin.sb, { action: "retry", id: po.id })).status, 400, "an order Printify already has is not sent again");
pf.failCreate = false;
const retried = await pod(admin.sb, { action: "retry", id: myOrder.id });
assert.deepEqual([retried.status, retried.order.status, retried.order.printify_order_id, retried.order.note], [200, "in_production", "pforder2", null]);
pf.orders.get("pforder2").status = "fulfilled";
pf.orders.get("pforder2").shipments = [{ carrier: "ups", number: "1Z9", url: "https://ups.test/1Z9", delivered_at: null }];
const refreshed = await pod(admin.sb, { action: "refresh", id: myOrder.id });
assert.deepEqual([refreshed.order.status, refreshed.order.printify_status, refreshed.order.shipments[0].number], ["shipped", "fulfilled", "1Z9"]);
const ordersList = await pod(admin.sb, { action: "orders" });
assert.deepEqual(ordersList.items.slice(0, 2).map((o) => o.id), [myOrder.id, po.id]);

// PayPal still checking the payment: the webhook finishes the order later; refunds reach print orders
const late = await pod(client(), { action: "create", items: [{ product_id: tee.id, variant_id: 102, quantity: 1 }], address: addr });
pp.next.pending = true;
assert.equal((await pod(client(), { action: "capture", order_id: late.id })).status, "pending");
let [lateOrder] = await service.PodOrder.filter({ paypal_order_id: late.id });
assert.equal(lateOrder.status, "started");
const lateCapture = pp.orders.get(late.id).purchase_units[0].payments.captures[0];
assert.deepEqual(await ppHook({ event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { ...lateCapture, status: "COMPLETED" } }), { http: 200, received: true, status: "paid" });
lateOrder = await service.PodOrder.get(lateOrder.id);
assert.deepEqual([lateOrder.status, lateOrder.printify_order_id], ["in_production", "pforder3"]);
assert.deepEqual(await ppHook({ event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { ...lateCapture, status: "COMPLETED" } }), { http: 200, received: true, status: "paid" });
assert.equal(pf.orders.size, 3, "a repeated webhook does not order twice");
pp.captures.set(lateCapture.id, { ...lateCapture, status: "REFUNDED" });
assert.deepEqual(await ppHook({ event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "REF1", links: [{ rel: "up", href: `https://api.paypal.com/v2/payments/captures/${lateCapture.id}` }] } }),
  { http: 200, received: true, updated: 1 });
assert.equal((await service.PodOrder.get(lateOrder.id)).status, "refunded");

// the owner connects Printify's webhooks (one per topic, signed with the derived secret)
const before = await pod(admin.sb, { action: "status" });
assert.deepEqual([before.shop_id, before.webhooks_ok], ["111", false]);
assert.deepEqual((await pod(admin.sb, { action: "webhooks" })).webhooks, ["order:updated", "order:sent-to-production", "order:shipment:created", "order:shipment:delivered"]);
await pod(admin.sb, { action: "webhooks" });
assert.equal(pf.hooks.length, 4, "connecting again replaces, never duplicates");
assert.ok(pf.hooks.every((h) => h.secret === hookSecret && h.url.endsWith("/functions/v1/printifyWebhook")));
assert.equal((await pod(admin.sb, { action: "status" })).webhooks_ok, true);
await service.Product.delete(tee.id);

// ---------------- the tool makes a print product from a design (toolApi pod_*; Printify played on 54395)
assert.equal((await tool({ action: "pod_catalog" }, "wrong-token-0123456789abcdef")).http, 401);
const cat1 = await tool({ action: "pod_catalog" });
assert.deepEqual(cat1.categories.map((c) => [c.key, c.all.map((b) => b.id)]),
  [["tshirts", [12, 36]], ["hoodies", [77, 1298]], ["sweatshirts", [49]], ["embroidery", [1687]]], "mugs, blankets, caps and pet clothes stay out");
assert.deepEqual(cat1.categories[0].bestsellers.map((b) => [b.id, b.from_cost]), [[12, null], [36, null]], "bestsellers in the owner's order; no price read yet");
const teeInfo = await tool({ action: "pod_blueprint", blueprint_id: 12 });
assert.deepEqual([teeInfo.provider, teeInfo.from_cost, teeInfo.default_price, teeInfo.category, teeInfo.embroidery],
  [{ id: 99, title: "Printify Choice" }, 1129, 2199, "tshirts", false], "Printify Choice first; tees at $21.99");
assert.deepEqual(teeInfo.colors.map((c) => [c.title, c.hex]), [["Black", "#000000"], ["White", "#ffffff"], ["Navy", "#1f2a44"], ["Sold Out", "#777777"]]);
assert.deepEqual(teeInfo.sizes.map((z) => z.title), ["S", "M", "L", "XL", "2XL"]);
assert.deepEqual(teeInfo.positions.map((p) => p.position), ["front"], "the neck label is not a design area");
assert.equal(pf.deleted.length, 1, "the price probe product is deleted at once");
assert.equal(pf.made.size, 0);
await tool({ action: "pod_blueprint", blueprint_id: 12 });
assert.equal(pf.deleted.length, 1, "kept for a week: no second probe");
const hoodInfo = await tool({ action: "pod_blueprint", blueprint_id: 77 });
assert.deepEqual([hoodInfo.from_cost, hoodInfo.default_price], [2158, 3199], "cost + $10 rounded up to .99");
assert.deepEqual((await tool({ action: "pod_blueprint", blueprint_id: 1298 })).provider, { id: 29, title: "Monster Digital" }, "a US provider when Printify Choice has none");
const embInfo = await tool({ action: "pod_blueprint", blueprint_id: 1687 });
assert.deepEqual([embInfo.embroidery, embInfo.positions.map((p) => p.position)], [true, ["front_left_chest"]]);
const cat2 = await tool({ action: "pod_catalog" });
assert.deepEqual(cat2.categories[1].bestsellers.map((b) => [b.id, b.from_cost, b.provider]), [[77, 2158, "Printify Choice"], [1298, 2500, "Monster Digital"]], "known prices show as From USD");

// the design goes to the site's storage first, Printify downloads it from there
const designUp = await tool({ action: "upload_url", name: "Lion-of-Judah.png" });
assert.equal((await fetch(designUp.upload_url, { method: "PUT", body: "PNGDATA" })).status, 200);
const black = teeInfo.colors.find((c) => c.title === "Black").id, white = teeInfo.colors.find((c) => c.title === "White").id;
const allSizes = teeInfo.sizes.map((z) => z.id);
const listing = { title: "Lion of Judah Tee", description: "<p>Bold.</p>", bible_inspiration: "<p>Rev 5:5</p>", seo_title: "Lion of Judah", meta_description: "Tee" };
assert.equal((await tool({ action: "pod_create", blueprint_id: 12, colors: [black], sizes: allSizes, design_url: "https://evil.example/x.png", listing })).http, 400, "only designs in the site's own bucket");
assert.equal((await tool({ action: "pod_create", blueprint_id: 12, colors: [], sizes: allSizes, design_url: designUp.ref, listing })).http, 400, "at least one colour");
assert.equal((await tool({ action: "pod_create", blueprint_id: 12, colors: [black], sizes: allSizes, design_url: designUp.ref, listing: { ...listing, description: "" } })).http, 400);
const made1 = await tool({ action: "pod_create", blueprint_id: 12, colors: [black, white], sizes: allSizes, design_url: designUp.ref, design_name: "Lion-of-Judah.png", listing });
assert.deepEqual([made1.http, made1.created, made1.price, made1.variants], [200, true, 21.99, 10]);
const sentProduct = pf.created.at(-1);
assert.deepEqual([sentProduct.blueprint_id, sentProduct.print_provider_id, sentProduct.title], [12, 99, "Lion of Judah Tee"]);
assert.equal(sentProduct.variants.filter((v) => v.is_enabled).length, 10);
assert.deepEqual([...new Set(sentProduct.variants.filter((v) => v.is_enabled).map((v) => v.price))].sort(), [2199, 2499], "2XL costs $2.19 more -> $24.99");
assert.deepEqual(sentProduct.print_areas[0].placeholders[0].position, "front");
assert.equal(sentProduct.print_areas[0].placeholders[0].images[0].scale, 1, "a 4500x5400 design fills the 3000x3600 area");
assert.equal(pf.downloaded.at(-1), "PNGDATA", "Printify got the design from the site");
assert.equal((await fetch(designUp.ref)).status, 400, "the design copy on the site is removed once Printify has it");
const siteTee = await service.Product.get(made1.id);
assert.deepEqual([siteTee.status, siteTee.title, siteTee.slug, siteTee.category, siteTee.price, siteTee.bible_inspiration, siteTee.printify_product_id],
  ["draft", "Lion of Judah Tee", "lion-of-judah-tee", "Apparel", 21.99, "<p>Rev 5:5</p>", made1.printify_product_id]);
assert.deepEqual(siteTee.options.find((o) => o.type === "color").values.map((v) => v.title), ["Black", "White"]);
assert.equal(siteTee.variants.length, 10);
assert.equal(siteTee.variants.find((v) => v.title === "Black / 2XL").extra, 300);
// too many colour × size combinations for Printify, and an embroidered design (chest area, scaled to fit)
const designUp2 = await tool({ action: "upload_url", name: "Cross.png" });
await fetch(designUp2.upload_url, { method: "PUT", body: "PNG2" });
const made2 = await tool({ action: "pod_create", blueprint_id: 1687, colors: embInfo.colors.map((c) => c.id), sizes: embInfo.sizes.map((z) => z.id), price: 39.5,
  design_url: designUp2.ref, listing: { ...listing, title: "Lion of Judah Tee" } });
assert.deepEqual([made2.http, made2.price], [200, 39.5]);
const emb = pf.created.at(-1).print_areas[0].placeholders[0];
assert.deepEqual([emb.position, emb.images[0].scale], ["front_left_chest", 0.8333], "a tall design fits inside the square chest area");
assert.equal((await service.Product.get(made2.id)).slug, "lion-of-judah-tee-2", "same name -> its own address");
// products designed in Printify itself come over with "Đồng bộ"
const toolSync = await tool({ action: "pod_sync" });
assert.deepEqual([toolSync.http, toolSync.updated.includes("Lion of Judah Tee"), toolSync.skipped], [200, true, ["Draft In Printify"]]);
// the real desktop tool against this toolApi (set TOOL_REPO=<DN-Product-Studio clone> and TOOL_PY=<its python>)
if (process.env.TOOL_REPO) {
  const script = `
import json, sys, tempfile
from pathlib import Path
sys.path.insert(0, ${JSON.stringify(process.env.TOOL_REPO)})
from PIL import Image
import webstore
c = webstore.SiteClient(sys.argv[1], "test-token-0123456789abcdefgh")
bp = c.pod_blueprint(12)
assert c.pod_catalog()["categories"][0]["key"] == "tshirts"
td = Path(tempfile.mkdtemp())
Image.new("RGBA", (4500, 5400), (0, 0, 0, 0)).save(td / "Tool-Made.png")
cols = [x["id"] for x in bp["colors"] if x["title"] in ("Black", "White")]
item = {"id": "x", "title": "Tool Made Tee", "file": str(td / "Tool-Made.png"), "price": 22.99,
        "spec": {"blueprint_id": 12, "colors": cols, "sizes": [z["id"] for z in bp["sizes"]], "position": "front"},
        "listing": {"description": "<p>From the tool.</p>", "bible_inspiration": "", "story_behind_design": "", "product_info": "",
                    "seo_title": "Tool Made Tee", "meta_description": "From the tool."}}
web = webstore.publish_design(item, c)
print(json.dumps({"web": web, "sync": c.pod_sync()}))`;
  const out = await new Promise((resolve, reject) => {
    const ch = spawn(process.env.TOOL_PY || "python3", ["-c", script, `${URL_}/functions/v1/toolApi`], { env: { ...process.env, NO_PROXY: "127.0.0.1,localhost" } });
    let so = "", se = "";
    ch.stdout.on("data", (d) => { so += d; });
    ch.stderr.on("data", (d) => { se += d; });
    ch.on("close", (code) => (code ? reject(new Error(`tool script failed:\n${se}`)) : resolve(JSON.parse(so))));
  });
  const toolTee = await service.Product.get(out.web.id);
  assert.deepEqual([out.web.status, toolTee.status, toolTee.title, toolTee.price, toolTee.variants.length, toolTee.printify_product_id],
    ["draft", "draft", "Tool Made Tee", 22.99, 10, out.web.printify_product_id], "the desktop tool makes a draft print product");
  assert.equal(pf.created.at(-1).print_areas[0].placeholders[0].images[0].scale, 1);
  assert.ok(Array.isArray(out.sync.created));
  console.log("  desktop tool -> toolApi pod flow: ok");
}
for (const p of await service.Product.list()) if (p.printify_product_id) await service.Product.delete(p.id);
for (const e of [p1, p2, pDraft]) await service.Ebook.delete(e.id);

void profiles; void service;
console.log("local stack: all checks passed");
process.exit(0);
