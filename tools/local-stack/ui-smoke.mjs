// Drive the built site in headless Chromium against the local stack and save screenshots.
//   node tools/local-stack/ui-smoke.mjs <site url> <supabase url> <service key> <out dir>
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { entitiesProxy } from "../../supabase/functions/_shared/entities.js";

const { chromium } = await import(process.env.PLAYWRIGHT || "/opt/npm-tools/node_modules/playwright/index.mjs");
const [SITE, URL_, SERVICE, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const root = path.resolve(import.meta.dirname, "../..");
const seedFile = (n) => JSON.parse(fs.readFileSync(path.join(root, "seed", n), "utf8"));
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sb = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const db = entitiesProxy(sb);

// ---- seed: the repo's own sample content
const COVER = "https://media.base44.com/images/public/app/cover.png";
const ebooks = [...seedFile("book-of-enoch.ebook.json"), ...seedFile("ethiopian-canon.ebook.json"), ...seedFile("book-of-enoch-parts.ebook.json")]
  .map((e, i) => ({ ...e, cover_image: COVER, status: "published", sort_order: i + 1, lemon_squeezy_variant_id: "2204367", secure_file_uri: "book.pdf" }));
const [book] = await db.Ebook.bulkCreate(ebooks);
await db.Product.bulkCreate(seedFile("products.sample.json").map((p) => ({ ...p, slug: slug(p.title), status: "published" })));
await db.HeroSlide.create({ image: COVER, title: "Discover the Hidden Stories of Scripture", eyebrow: "Dark Network", cta1_label: "Browse books", cta1_url: "/books" });
await db.Testimonial.create({ rating: 5, text: "<p>Clear and honest.</p>", author: "A reader" });
await sb.storage.from("private-files").upload("book.pdf", new File(["%PDF-1.4 the book"], "book.pdf"));

// stand-in for the PayPal REST API (the stack runs with PAYPAL_API_URL=http://127.0.0.1:54397, PAYPAL_ENV=live)
const ppOrders = new Map();
let ppN = 0;
http.createServer(async (req, res) => {
  let raw = ""; for await (const c of req) raw += c;
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.url === "/v1/oauth2/token") return send(200, { access_token: "pp-token", expires_in: 32400 });
  const m = req.url.match(/^\/v2\/checkout\/orders(?:\/([A-Z0-9]+))?(\/capture)?$/);
  if (m && !m[1]) { const id = `ORDER${++ppN}X`; ppOrders.set(id, JSON.parse(raw)); return send(201, { id, status: "CREATED" }); }
  if (m && m[2]) {
    const unit = ppOrders.get(m[1]).purchase_units[0];
    return send(201, { id: m[1], status: "COMPLETED", payer: { email_address: "payer@example.com" },
      purchase_units: [{ ...unit, payments: { captures: [{ id: `CAP${m[1]}`, status: "COMPLETED", custom_id: unit.custom_id, amount: unit.amount }] } }] });
  }
  send(404, {});
}).listen(54397, "127.0.0.1");

// stand-in for the Printify API (the stack runs with PRINTIFY_API_URL=http://127.0.0.1:54395)
const pfOrders = [];
http.createServer(async (req, res) => {
  let raw = ""; for await (const c of req) raw += c;
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  const u = new URL(req.url, "http://x").pathname;
  if (u === "/v1/shops.json") return send(200, [{ id: 111, title: "Store", sales_channel: "custom_integration" }]);
  if (u === "/v1/shops/111/orders/shipping.json") {
    const qty = JSON.parse(raw).line_items.reduce((n, l) => n + l.quantity, 0);
    return send(200, { standard: 399 + 209 * (qty - 1) });
  }
  if (u === "/v1/shops/111/orders.json") { pfOrders.push(JSON.parse(raw)); return send(200, { id: `pforder${pfOrders.length}` }); }
  if (/send_to_production/.test(u)) return send(202, {});
  send(404, {});
}).listen(54395, "127.0.0.1");
const TEE_IMG = (c, side) => `https://img.test/${c}-${side}.png`;
const tee = await db.Product.create({
  title: "His Love Endures Tee", slug: "his-love-endures-tee", category: "Apparel", price: 21.99, status: "published",
  description: "<p>A soft, everyday tee.</p>", printify_product_id: "pf1", images: [TEE_IMG("black", "front"), TEE_IMG("black", "back")],
  options: [
    { name: "Colors", type: "color", values: [{ id: 1, title: "Black", colors: ["#000000"] }, { id: 2, title: "White", colors: ["#ffffff"] }] },
    { name: "Sizes", type: "size", values: [{ id: 10, title: "S" }, { id: 11, title: "M" }, { id: 12, title: "2XL" }] },
  ],
  variants: [
    { id: 101, title: "Black / S", options: [1, 10], extra: 0, available: true },
    { id: 102, title: "Black / M", options: [1, 11], extra: 0, available: true },
    { id: 103, title: "Black / 2XL", options: [1, 12], extra: 300, available: true },
    { id: 201, title: "White / S", options: [2, 10], extra: 0, available: true },
  ],
  variant_images: [
    { src: TEE_IMG("black", "front"), variant_ids: [101, 102, 103], is_default: true },
    { src: TEE_IMG("white", "front"), variant_ids: [201], is_default: true },
  ],
});
// like the real Printify shirts: White is Printify's default (gallery = 15 white mockups), Black second
const SIDES = ["front", "back", ...Array.from({ length: 13 }, (_, i) => `person-${i + 1}`)];
const SHADES = [["White", 2001, "#ffffff"], ["Black", 2002, "#000000"], ["Dark Chocolate", 2003, "#31221d"]];
const shade = (name) => name.toLowerCase().replace(" ", "-");
const heritage = await db.Product.create({
  title: "Africa Is in the Story Tee", slug: "africa-story-tee", category: "Apparel", price: 21.99, status: "published",
  description: "<p>Heritage tee.</p>", printify_product_id: "pf2", images: SIDES.map((side) => TEE_IMG("white", side)),
  options: [
    { name: "Colors", type: "color", values: SHADES.map(([title, id, hex]) => ({ id, title, colors: [hex] })) },
    { name: "Sizes", type: "size", values: [{ id: 14, title: "M" }] },
  ],
  variants: SHADES.map(([title, id]) => ({ id: id * 10, title: `${title} / M`, options: [id, 14], extra: 0, available: true })),
  variant_images: SHADES.flatMap(([title, id]) => SIDES.map((side, i) => ({ src: TEE_IMG(shade(title), side), variant_ids: [id * 10], is_default: i === 0 }))),
});
// stand-in for PayPal's button script (www.paypal.com/sdk/js): one button that runs the real createOrder / onApprove
const FAKE_PAYPAL_SDK = `window.paypal = { Buttons(o) { return {
  render(t) { const b = document.createElement("button"); b.type = "button"; b.textContent = "PayPal";
    b.style.cssText = "width:100%;padding:12px;background:#ffc439;border:0;border-radius:4px;font:700 16px sans-serif;color:#003087";
    b.onclick = async () => { try { const id = await o.createOrder(); await o.onApprove({ orderID: id }, { restart() {} }); } catch (e) { o.onError && o.onError(e); } };
    (typeof t === "string" ? document.querySelector(t) : t).appendChild(b); return Promise.resolve(); },
  close() { return Promise.resolve(); } }; } };`;

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAOCAYAAAAWo42rAAAAFElEQVR42mN8z8Dwn4EIwDiqkL4KAZKnGfWqGdyKAAAAAElFTkSuQmCC", "base64");
const errors = [];
const browser = await chromium.launch({ executablePath: fs.existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined });

async function open(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  // anything outside this machine (covers, fonts, lemon.js, YouTube) gets a placeholder
  await ctx.route((u) => !["127.0.0.1", "localhost"].includes(new URL(u).hostname), (r) =>
    r.request().resourceType() === "image" ? r.fulfill({ status: 200, contentType: "image/png", body: PNG }) : r.fulfill({ status: 200, body: "" }));
  await ctx.route((u) => /^https:\/\/www\.paypal\.com\/sdk\/js/.test(String(u)), (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_PAYPAL_SDK }));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror ${page.url()}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/status of 40[0-9]|Failed to load resource/.test(m.text())) errors.push(`console ${page.url()}: ${m.text()}`); });
  page.shot = async (name) => {
    await page.waitForTimeout(700);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) errors.push(`${width}px ${name}: page is ${over}px wider than the screen`);
    await page.screenshot({ path: path.join(OUT, `${width}_${name}.png`) });
  };
  return page;
}

// ---- books added later (tool: no number; Admin used to give the last number) and more than 8
// single books: the home "Full Editions" row shows every one, never-placed books first
const extra = Array.from({ length: 9 }, (_, i) => ({ ...ebooks.find((e) => !/part\s*\d/i.test(e.title)), id: undefined,
  title: `Standalone Title ${"ABCDEFGHI"[i]}`, slug: `standalone-${i + 1}`, sort_order: 100 + i, featured: false }));
await db.Ebook.bulkCreate(extra);
await db.Ebook.create({ ...extra[0], title: "Fresh Arrival", slug: "fresh-arrival", sort_order: 0 });
{
  const page = await open(1440, 900);
  await page.goto(SITE);
  const row = page.locator("section").filter({ hasText: "Full Editions" }).first();
  await row.locator(".dn-book h3").first().waitFor();
  const titles = await row.locator(".dn-book h3").allInnerTexts();
  const featured = ebooks.filter((e) => e.featured && !/part\s*\d/i.test(e.title)).length;   // "Featured" books stay in front
  assert.equal(titles[featured], "Fresh Arrival", `a new book leads the row after featured ones: ${titles.slice(0, featured + 2).join(" | ")}`);
  for (const t of ["Standalone Title I", "Fresh Arrival"]) assert.ok(titles.includes(t), `${t} on the home page`);
  await page.context().close();
}

// ---- visitor on a phone and on a desktop
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const page = await open(w, h);
  await page.goto(SITE);
  await page.getByText("Discover the Hidden Stories of Scripture").first().waitFor();
  await page.shot("home");
  await page.goto(`${SITE}/books`);
  await page.getByText(book.title).first().waitFor();
  await page.shot("books");
  await page.goto(`${SITE}/books/${book.slug}`);
  await page.getByRole("button", { name: /Buy Now/ }).first().waitFor();
  await page.shot("book");
  await page.goto(`${SITE}/shop`);
  await page.getByText("Lion of Judah").first().waitFor();
  await page.shot("shop");
  await page.context().close();
}

// ---- a customer: register, buy, download, chat, contact
const page = await open(1440, 900);
await page.goto(`${SITE}/register`);
assert.equal(await page.getByText("Continue with Google").count(), 0, "Google button is hidden until configured");
await page.fill("#email", "buyer@example.com");
for (const f of await page.locator('input[type="password"]').all()) await f.fill("secret123");
await page.shot("register");
await page.getByRole("button", { name: /Create account|Sign up|Register/i }).click();
await page.waitForURL(SITE + "/");
await page.goto(`${SITE}/account`);
await page.getByText("buyer@example.com").first().waitFor();
await page.shot("account_empty");

// a signed-in buyer pays with PayPal in the dialog and lands in their library
await page.goto(`${SITE}/books/${book.slug}`);
await page.getByRole("button", { name: /Buy Now/ }).first().click();
const dialog = page.getByRole("dialog");
await dialog.getByText("Total").waitFor();
await dialog.getByRole("button", { name: "PayPal" }).waitFor();
assert.equal(await dialog.getByText(/Test mode/).count(), 0, "no sandbox note when live");
await page.shot("paypal_dialog");
const [captured] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/functions/v1/paypalCheckout") && r.request().postData().includes('"capture"')),
  dialog.getByRole("button", { name: "PayPal" }).click(),
]);
assert.deepEqual(await captured.json(), { status: "paid", after: "/account" });
assert.equal(ppOrders.size, 1);
await page.waitForURL(`${SITE}/account`);
await page.goto(`${SITE}/account`);
await page.getByRole("button", { name: /Download/ }).first().waitFor();
await page.shot("account_purchased");
const [dl] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/functions/v1/generateEbookDownloadUrl")),
  page.getByRole("button", { name: /Download/ }).first().click(),
]);
assert.equal(await (await fetch((await dl.json()).signed_url)).text(), "%PDF-1.4 the book");

await page.getByLabel("Open chat").click();
await page.getByPlaceholder("Type a message…").fill("Is the Enoch book a new translation?");
await page.getByLabel("Send message").click();
await page.getByText("Is the Enoch book a new translation?").first().waitFor();
await page.shot("chat");
await page.goto(`${SITE}/contact`);
await page.waitForLoadState("networkidle");   // the form re-renders once sign-in is known; fill after that
const contact = page.locator("main form:has(textarea)");   // not the newsletter form nor the open chat panel
const inputs = contact.locator("input, textarea");
for (let i = 0; i < await inputs.count(); i++) await inputs.nth(i).fill((await inputs.nth(i).getAttribute("type")) === "email" ? "reader@example.com" : "Hello from the contact form");
await contact.locator('button[type="submit"]').click();
await page.getByText("Message Sent").waitFor({ timeout: 15000 });
await page.shot("contact_sent");
assert.equal(await page.getByText("You need an admin account").count(), 0);
await page.goto(`${SITE}/admin`);
await page.getByText("You need an admin account").waitFor();

// ---- the owner: sign in, admin lists, chat inbox
const owner = await open(1440, 900);
await createClient(URL_, process.env.ANON, { auth: { persistSession: false } }).auth.signUp({ email: "owner@example.com", password: "secret123" });
await sb.from("profiles").update({ role: "admin" }).eq("email", "owner@example.com");
await owner.goto(`${SITE}/login?returnTo=/admin`);
await owner.fill("#email", "owner@example.com");
await owner.fill("#password", "secret123");
await owner.shot("login");
await owner.getByRole("button", { name: /^Log in$/i }).click();
await owner.getByRole("tab").first().waitFor();
const tabs = await owner.getByRole("tab").allInnerTexts();
await owner.shot("admin");
await owner.getByRole("tab", { name: /ebook/i }).first().click();
await owner.getByText(book.title).first().waitFor();
await owner.shot("admin_ebooks");
const msgTab = owner.getByRole("tab").filter({ has: owner.locator('[aria-label$="tin nhắn chờ"]') });
assert.equal(await msgTab.count(), 1, `unread badge expected, tabs: ${tabs.join(" | ")}`);
await msgTab.click();
await owner.getByText("Is the Enoch book a new translation?").first().waitFor();
await owner.getByText(/Contact form/).first().waitFor();
await owner.shot("admin_messages");

// ---- Admin: DN Studio shortcut (a full page load, not a router link)
assert.equal(await owner.getByRole("link", { name: /Mở DN Studio/ }).getAttribute("href"), "/studio/");

// ---- Admin > Tài khoản: a signed-in customer is banned, signed out on reload, then unbanned
owner.on("dialog", (d) => d.accept());
await createClient(URL_, process.env.ANON, { auth: { persistSession: false } }).auth.signUp({ email: "fan@example.com", password: "secret123" });
const fanPage = await open(1440, 900);
await fanPage.goto(`${SITE}/login`);
await fanPage.fill("#email", "fan@example.com");
await fanPage.fill("#password", "secret123");
await fanPage.getByRole("button", { name: /^Log in$/i }).click();
await fanPage.getByText("My Account").first().waitFor();
await owner.getByRole("tab", { name: "Tài khoản" }).click();
const fanRow = owner.locator("li").filter({ hasText: "fan@example.com" });
await fanRow.waitFor();
assert.equal(await owner.locator("li").filter({ hasText: "owner@example.com" }).getByRole("button").count(), 0, "no buttons on your own account");
await owner.shot("admin_accounts");
await fanRow.getByRole("button", { name: "Chặn", exact: true }).click();
await fanRow.getByText("Bị chặn").waitFor();
await owner.shot("admin_accounts_banned");
await fanPage.reload();
await fanPage.getByText("Sign Up / Login").first().waitFor();
assert.equal(await fanPage.getByText("My Account").count(), 0, "a banned customer is signed out");
await fanRow.getByRole("button", { name: "Bỏ chặn", exact: true }).click();
await fanRow.getByRole("button", { name: "Chặn", exact: true }).waitFor();

// ---- Admin > Cài đặt: the NEW badge switch reaches the shop pages
const visitor = await open(1440, 900);
await visitor.goto(`${SITE}/books`);
await visitor.locator(".badge-new").first().waitFor();
await visitor.shot("books_new_badge");
await owner.getByRole("tab", { name: "Cài đặt" }).click();
await owner.getByRole("switch").click();
await owner.getByRole("button", { name: "Lưu" }).click();
await owner.getByText("Đã lưu cài đặt").first().waitFor();
await owner.shot("admin_settings_off");
// count right away and again once everything has loaded: a switched-off badge must not even flash
await visitor.reload({ waitUntil: "domcontentloaded" });
await visitor.locator(".dn-book").first().waitFor();
assert.equal(await visitor.locator(".badge-new").count(), 0, "badge switched off (first paint)");
await visitor.waitForLoadState("networkidle");
assert.equal(await visitor.locator(".badge-new").count(), 0, "badge switched off");
await owner.getByRole("switch").click();
await owner.getByRole("button", { name: "Lưu" }).click();
await owner.getByText("Đã lưu cài đặt").first().waitFor();

// ---- phone menu: Sign Up / Login is not hidden under the Chat and Donate buttons
for (const [w, h] of [[375, 667], [390, 844]]) {
  const phone = await open(w, h);
  await phone.goto(`${SITE}/`);
  await phone.getByRole("button", { name: "Open menu" }).click();
  const login = phone.getByRole("link", { name: "Sign Up / Login" });
  const box = await login.boundingBox();
  for (const x of [box.x + 20, box.x + box.width / 2]) {
    const ok = await phone.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.textContent.includes("Sign Up / Login"), [x, box.y + box.height / 2]);
    assert.ok(ok, `${w}px: Sign Up / Login covered at x=${x}`);
  }
  await phone.shot("menu");
  // the checkout choice a signed-out visitor gets: its buttons sit above the floating buttons
  await phone.goto(`${SITE}/books/${book.slug}`);
  await phone.getByRole("button", { name: /Buy Now/ }).first().click();
  for (const name of [/Log in or create account/, /Continue as guest/]) {
    const b = await phone.getByRole("button", { name }).boundingBox();
    for (const x of [b.x + 12, b.x + b.width / 2]) {
      const ok = await phone.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[role="dialog"]') !== null, [x, b.y + b.height / 2]);
      assert.ok(ok, `${w}px: checkout choice ${name} covered at x=${x}`);
    }
  }
  await phone.shot("checkout_choice");
  // a guest pays on the phone and lands on their private download page
  await phone.getByRole("button", { name: /Continue as guest/ }).click();
  const payBox = phone.getByRole("dialog");
  await payBox.getByRole("button", { name: "PayPal" }).waitFor();
  const over = await phone.evaluate(() => [...document.querySelectorAll('[role="dialog"] *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1).length);
  assert.equal(over, 0, `${w}px: the PayPal dialog is wider than the screen`);
  await phone.shot("paypal_dialog");
  await payBox.getByRole("button", { name: "PayPal" }).click();
  await phone.waitForURL(/\/download\?token=[0-9a-f]{64}$/);
  await phone.getByRole("button", { name: /Download/ }).first().waitFor();
  const [gdl] = await Promise.all([
    phone.waitForResponse((r) => r.url().includes("/functions/v1/generateEbookDownloadUrl") && r.request().postData().includes('"ebook_id"')),
    phone.getByRole("button", { name: /Download/ }).first().click(),
  ]);
  assert.equal(await (await fetch((await gdl.json()).signed_url)).text(), "%PDF-1.4 the book");
  await phone.shot("guest_download");
}


// ---- Printify colours: cards and the product page start on black (not Printify's white); Admin ›
// "Màu hiển thị mặc định" picks another; the ~15 small pictures keep their size and scroll sideways
{
  const cardSrc = async (pg) => {
    const card = pg.locator(`a[href="/shop/${heritage.slug}"] img`).first();
    await card.waitFor();
    return card.getAttribute("src");
  };
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const p = await open(w, h);
    await p.goto(`${SITE}/shop`);
    assert.equal(await cardSrc(p), TEE_IMG("black", "front"), "the shop card shows the black shirt");
    await p.goto(`${SITE}/shop/${heritage.slug}`);
    const box = p.locator("#pod-buy");
    await box.getByText("Black", { exact: true }).waitFor();          // the colour legend starts on Black
    const thumbs = p.getByTestId("product-thumbs");
    assert.equal(await thumbs.locator("button").count(), 15);
    const sizes = await thumbs.locator("button").evaluateAll((els) => els.map((e) => [e.offsetWidth, e.offsetHeight]));
    assert.ok(sizes.every(([bw, bh]) => bw === bh && bw >= 64), `small pictures stay square: ${JSON.stringify(sizes.slice(0, 3))}`);
    assert.ok(await thumbs.evaluate((e) => e.scrollWidth > e.clientWidth), "the row scrolls");
    assert.equal(await thumbs.locator("img").first().getAttribute("src"), TEE_IMG("black", "front"));
    await p.shot("pod_gallery");
    await p.getByRole("button", { name: "Next picture" }).click();
    await p.getByText("2 / 15").waitFor();
    assert.equal(await thumbs.locator("button").nth(1).getAttribute("aria-current"), "true");
    if (w > 800) {
      await p.getByRole("button", { name: "More pictures to the right" }).click();
      await p.waitForFunction(() => document.querySelector('[data-testid="product-thumbs"]').scrollLeft > 0);
      await p.getByRole("button", { name: "More pictures to the left" }).waitFor();
    }
    await box.getByRole("button", { name: "White" }).click();
    assert.equal(await thumbs.locator("img").first().getAttribute("src"), TEE_IMG("white", "front"));
    await p.getByText("1 / 15").waitFor();
  }

  // the owner picks Dark Chocolate in Admin
  await owner.goto(`${SITE}/admin`);
  await owner.getByRole("tab", { name: "Sản phẩm (Shop)" }).click();
  const row = owner.locator("div").filter({ has: owner.getByText(heritage.title, { exact: true }) })
    .filter({ has: owner.getByRole("button", { name: "Sửa" }) }).last();
  await row.waitFor();
  assert.equal(await row.locator("img").first().getAttribute("src"), TEE_IMG("black", "front"), "the admin list shows the black shirt");
  await row.getByRole("button", { name: "Sửa" }).click();
  const pick = owner.locator("select").filter({ has: owner.locator("option", { hasText: "Tự động (Black)" }) });
  await pick.waitFor();
  await pick.selectOption("Dark Chocolate");
  await owner.shot("admin_default_color");
  await owner.getByRole("button", { name: "Lưu", exact: true }).click();
  await owner.getByText("Đã lưu", { exact: true }).first().waitFor();
  assert.equal((await db.Product.get(heritage.id)).default_color, "Dark Chocolate");
  const p = await open(1440, 900);
  await p.goto(`${SITE}/shop`);
  assert.equal(await cardSrc(p), TEE_IMG("dark-chocolate", "front"));
  await p.goto(`${SITE}/shop/${heritage.slug}`);
  await p.locator("#pod-buy").getByText("Dark Chocolate", { exact: true }).waitFor();
  assert.equal((await db.Product.get(heritage.id)).images.length, 15, "the stored gallery is left as Printify made it");
}

// ---- a guest buys printed merch (Printify) on a phone and on a desktop: size / colour, cart, address, PayPal, order page
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const p = await open(w, h);
  await p.goto(`${SITE}/shop/${tee.slug}`);
  const box = p.locator("#pod-buy");
  await box.getByRole("button", { name: "2XL" }).waitFor();
  assert.equal(await p.getByText("Buy on Spring").count(), 0, "a Printify product never sends buyers to Spring");
  assert.match(await box.innerText(), /From\s*\$21\.99/);
  await box.getByRole("button", { name: /Add to Cart/ }).click();
  await box.getByText("Please choose a size.").waitFor();
  await box.getByRole("button", { name: "White" }).click();
  assert.equal(await box.getByRole("button", { name: "2XL" }).isDisabled(), true, "2XL is not made in white");
  await box.getByRole("button", { name: "Black" }).click();
  await box.getByRole("button", { name: "2XL" }).click();
  assert.match(await box.innerText(), /\$24\.99/);
  await box.getByRole("button", { name: "Increase quantity" }).click();
  await p.shot("pod_product");
  await box.getByRole("button", { name: /Add to Cart/ }).click();
  await box.getByText("Added to your cart.").waitFor();
  await box.getByRole("button", { name: "S", exact: true }).click();
  await box.getByRole("button", { name: /Add to Cart/ }).click();
  await p.goto(`${SITE}/cart`);
  await p.getByText("Black / 2XL").waitFor();
  assert.match(await p.locator("main").innerText(), /Checkout — \$71\.97/i);   // 2 × 24.99 + 21.99
  await p.shot("pod_cart");
  await p.getByRole("link", { name: /Checkout — \$71\.97/ }).click();
  await p.waitForURL(/\/checkout$/);
  const form = p.locator('form[aria-label="Shipping address"]');
  for (const [name, value] of [["email", "mary@example.com"], ["first_name", "Mary"], ["last_name", "Jones"], ["address1", "1 Peachtree St"], ["city", "Atlanta"], ["zip", "30303"]]) {
    await form.locator(`[name="${name}"]`).fill(value);
  }
  await form.locator('select[name="region"]').selectOption("GA");
  await form.getByRole("button", { name: /Continue to Payment/ }).click();
  await p.getByRole("button", { name: "PayPal" }).waitFor();
  const summary = await p.locator("aside").innerText();
  assert.match(summary, /\$8\.17/); assert.match(summary, /\$80\.14 USD/);   // shipping 3.99 + 2 × 2.09
  await p.shot("pod_checkout");
  await p.getByRole("button", { name: "PayPal" }).click();
  await p.waitForURL(/\/order\/[0-9a-f]{32}\?token=[0-9a-f]{32}$/);
  await p.getByText("Thank you for your order!").waitFor();
  await p.getByText("Printing").waitFor();
  await p.shot("pod_order");
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem("dark_pod_cart") || "[]").length), 0, "the cart empties after payment");
  await p.context().close();
}
assert.equal(pfOrders.length, 2, "each paid order went to Printify");
assert.deepEqual(pfOrders[0].line_items, [{ product_id: "pf1", variant_id: 103, quantity: 2 }, { product_id: "pf1", variant_id: 101, quantity: 1 }]);
await browser.close();
for (const e of errors) console.log("ERROR", e);
console.log("ui smoke:", errors.length ? "FAIL" : "OK", "- screenshots in", OUT);
process.exit(errors.length ? 1 : 0);
