// Web Push to the owner's phones (the /studio app), with no library: WebCrypto only.
// RFC 8291 (message encryption, aes128gcm) + RFC 8292 (VAPID). db = full-access entities.

const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(s).length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};
const hkdf = async (salt, ikm, info, length) => new Uint8Array(await crypto.subtle.deriveBits(
  { name: "HKDF", hash: "SHA-256", salt, info },
  await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), length * 8));

// The site's VAPID key pair, created and stored the first time it is needed (nobody handles a secret).
export async function vapidKeys(db) {
  let row = await db.PushConfig.get("vapid").catch(() => null);
  if (!row) {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const created = {
      id: "vapid",
      public_key: b64url(await crypto.subtle.exportKey("raw", pair.publicKey)),
      private_jwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
    };
    await db.PushConfig.create(created).catch(() => null);   // two first calls at once: keep the one stored first
    row = await db.PushConfig.get("vapid");
  }
  return { publicKey: row.public_key, privateKey: await crypto.subtle.importKey("jwk", row.private_jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]) };
}

// The encrypted body for one subscription (exported for the tests).
export async function encryptPayload(text, p256dh, authSecret) {
  const uaPublic = unb64url(p256dh);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const peer = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: peer }, local.privateKey, 256));
  const ikm = await hkdf(unb64url(authSecret), shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(enc.encode(text), new Uint8Array([2]))));
  const header = new Uint8Array(21);
  new DataView(header.buffer).setUint32(16, 4096);
  header.set(salt, 0);
  header[20] = asPublic.length;
  return concat(header, asPublic, sealed);
}

async function vapidHeader(endpoint, vapid, subject) {
  const head = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, vapid.privateKey, enc.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64url(signature)}, k=${vapid.publicKey}`;
}

// Sends one notification. Returns the push service's HTTP status (201 = accepted, 404/410 = phone unsubscribed).
export async function sendPush(sub, message, vapid, subject = "https://darknetworkofficial.uk") {
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidHeader(sub.endpoint, vapid, subject),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body: await encryptPayload(JSON.stringify(message), sub.p256dh, sub.auth),
  });
  await res.body?.cancel();
  return res.status;
}

// Red number on the app icon: customers waiting for a reply + orders this phone has not seen.
async function badgeFor(db, sub, unreadChats) {
  if (!sub.orders_seen) return unreadChats;
  const fresh = (await db.EbookPurchase.filter({ payment_status: "paid" }, "-created_date", 200))
    .filter((p) => new Date(p.purchase_date || p.created_date) > new Date(sub.orders_seen));
  return unreadChats + new Set(fresh.map((p) => p.provider_order_id || p.id)).size;
}

// To every phone that turned notifications on. Never throws: a notification must not break a sale or a chat.
export async function notifyOwner(db, { title, body, url, tag }) {
  try {
    const subs = await db.PushSubscription.list("-created_date", 50);
    if (!subs.length) return 0;
    const vapid = await vapidKeys(db);
    const unreadChats = await db.ChatConversation.count({ unread_for_admin: true });
    let sent = 0;
    for (const sub of subs) {
      try {
        const status = await sendPush(sub, { title, body, url, tag, badge: await badgeFor(db, sub, unreadChats) }, vapid);
        if (status === 404 || status === 410) await db.PushSubscription.delete(sub.id);
        else if (status < 300) { sent += 1; await db.PushSubscription.update(sub.id, { last_ok: new Date().toISOString() }); }
      } catch { /* one phone failing does not stop the others */ }
    }
    return sent;
  } catch {
    return 0;
  }
}

// Keeps the function alive until the notification is sent without making the caller wait (Supabase), else waits.
export function inBackground(promise) {
  if (globalThis.EdgeRuntime?.waitUntil) globalThis.EdgeRuntime.waitUntil(promise);
  else return promise;
}
