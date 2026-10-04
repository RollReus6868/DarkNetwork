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

// stand-in for the Lemon Squeezy API
let checkouts = 0;
http.createServer(async (req, res) => {
  for await (const _ of req) { /* drain */ }
  checkouts += 1;
  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ data: { attributes: { url: "https://dark.lemonsqueezy.com/checkout/abc" } } }));
}).listen(54399, "127.0.0.1");

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAOCAYAAAAWo42rAAAAFElEQVR42mN8z8Dwn4EIwDiqkL4KAZKnGfWqGdyKAAAAAElFTkSuQmCC", "base64");
const errors = [];
const browser = await chromium.launch({ executablePath: fs.existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined });

async function open(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  // anything outside this machine (covers, fonts, lemon.js, YouTube) gets a placeholder
  await ctx.route((u) => !["127.0.0.1", "localhost"].includes(new URL(u).hostname), (r) =>
    r.request().resourceType() === "image" ? r.fulfill({ status: 200, contentType: "image/png", body: PNG }) : r.fulfill({ status: 200, body: "" }));
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

await page.goto(`${SITE}/books/${book.slug}`);
const [checkout] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/functions/v1/createEbookCheckout")),
  page.getByRole("button", { name: /Buy Now/ }).first().click(),
]);
assert.deepEqual(await checkout.json(), { url: "https://dark.lemonsqueezy.com/checkout/abc" });
assert.equal(checkouts, 1);

// Lemon Squeezy confirms the payment through the webhook
const { data: users } = await sb.from("profiles").select("*").eq("email", "buyer@example.com");
const raw = JSON.stringify({ meta: { event_name: "order_created" }, data: { id: "5001", attributes: { status: "paid", user_email: "buyer@example.com",
  total: 2699, currency: "USD", custom_data: { ebook_id: book.id, user_id: users[0].id }, first_order_item: { variant_id: 2204367 } } } });
const hook = await fetch(`${URL_}/functions/v1/lemonSqueezyWebhook`, { method: "POST", body: raw,
  headers: { "Content-Type": "application/json", "X-Signature": crypto.createHmac("sha256", "whsec").update(raw).digest("hex") } });
assert.equal(hook.status, 200);
await page.goto(`${SITE}/account`);
await page.getByRole("button", { name: /Download/ }).first().waitFor();
await page.shot("account_purchased");
const [dl] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/functions/v1/generateEbookDownloadUrl")),
  page.getByRole("button", { name: /Download/ }).first().click(),
]);
assert.equal(await (await fetch((await dl.json()).signed_url)).text(), "%PDF-1.4 the book");

await page.getByLabel("Mở khung chat").click();
await page.getByPlaceholder("Nhập tin nhắn…").fill("Is the Enoch book a new translation?");
await page.getByLabel("Gửi tin nhắn").click();
await page.getByText("Is the Enoch book a new translation?").first().waitFor();
await page.shot("chat");
await page.goto(`${SITE}/contact`);
const inputs = page.locator("form input, form textarea");
for (let i = 0; i < await inputs.count(); i++) await inputs.nth(i).fill(i === 1 ? "reader@example.com" : "Hello from the contact form");
await page.locator('form button[type="submit"]').click();
await page.waitForFunction(() => !document.querySelector("form textarea"), null, { timeout: 15000 });
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

await browser.close();
for (const e of errors) console.log("ERROR", e);
console.log("ui smoke:", errors.length ? "FAIL" : "OK", "- screenshots in", OUT);
process.exit(errors.length ? 1 : 0);
