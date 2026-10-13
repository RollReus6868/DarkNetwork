// DN Studio: the owner's phone app at /studio (install it with "Add to Home Screen").
// Orders, statistics, cart & checkouts, email sign-ups, customer chat, and notifications.
import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, ChartColumn, Loader2, LogOut, Mail, MessageCircle, Receipt, Settings, Share, ShoppingCart, SquarePlus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { app, chat, disablePush, enablePush, isInstalled, isIOS, markOrdersSeen, newOrders, pushSubscription, pushSupported, registerWorker, setIconBadge } from "./api";
import { Chat } from "./Chat";
import { Analytics, Cart, Emails, Orders } from "./pages";

const TABS = [
  ["orders", "Đơn hàng", Receipt],
  ["analytics", "Phân tích", ChartColumn],
  ["cart", "Giỏ hàng", ShoppingCart],
  ["emails", "Email", Mail],
  ["chat", "Tin nhắn", MessageCircle],
];
const TITLES = { orders: "Đơn hàng", analytics: "Phân tích", cart: "Giỏ hàng & thanh toán", emails: "Email đăng ký", chat: "Tin nhắn" };
const visible = () => document.visibilityState === "visible";
const fromUrl = (url) => {
  const q = new URL(url, window.location.origin).searchParams;
  return { tab: TABS.some(([id]) => id === q.get("tab")) ? q.get("tab") : null, conv: q.get("c") || "" };
};

function Login({ onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      await onDone();
    } catch (err) { setError(err.message || "Không đăng nhập được."); }
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center gap-3 px-6">
      <img src="/studio/icon-192.png" alt="" className="mx-auto mb-2 h-16 w-16 rounded-2xl" />
      <h1 className="text-center text-3xl font-bold text-[#f3e9d6]">DN Studio</h1>
      <p className="mb-2 text-center text-[13px] text-white/50">Đăng nhập bằng tài khoản admin của website.</p>
      <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email"
        className="h-12 rounded-xl bg-white/[0.06] px-4 text-[16px] text-[#f3e9d6] outline-none ring-1 ring-white/10 focus:ring-[#d4a64a]" />
      <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" aria-label="Mật khẩu"
        className="h-12 rounded-xl bg-white/[0.06] px-4 text-[16px] text-[#f3e9d6] outline-none ring-1 ring-white/10 focus:ring-[#d4a64a]" />
      {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
      <button disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#d4a64a] font-bold text-[#1a0f08] disabled:opacity-60">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}Đăng nhập</button>
    </form>
  );
}

// Notifications on/off for this phone, the "add to home screen" hint, sign out.
function SettingsSheet({ user, onClose, onSignOut }) {
  const [sub, setSub] = useState(undefined);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { pushSubscription().then(setSub).catch(() => setSub(null)); }, []);
  const run = (name, fn) => async () => {
    setBusy(name); setNote("");
    try { await fn(); } catch (e) { setNote(e.message || "Không làm được."); }
    setBusy("");
  };
  const iosNeedsInstall = isIOS() && !isInstalled();
  const btn = "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold disabled:opacity-50";
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full space-y-4 rounded-t-3xl bg-[#1b120b] p-5 ring-1 ring-white/10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
        <div className="flex items-center"><h2 className="flex-1 font-body text-base font-bold text-[#f3e9d6]">Cài đặt</h2>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full p-1.5 text-white/60"><X className="h-5 w-5" /></button></div>

        <section className="space-y-2.5">
          <h3 className="font-body text-[13px] font-bold text-white/80">Thông báo trên điện thoại này</h3>
          {iosNeedsInstall ? (
            <div className="space-y-1.5 rounded-xl bg-white/[0.05] p-3 text-[13px] leading-relaxed text-white/75">
              <p>iPhone chỉ cho phép thông báo khi app đã được thêm vào màn hình chính:</p>
              <p className="flex items-center gap-1.5">1. Mở trang này bằng <b>Safari</b>, bấm nút <Share className="inline h-4 w-4" /> <b>Chia sẻ</b>.</p>
              <p className="flex items-center gap-1.5">2. Chọn <SquarePlus className="inline h-4 w-4" /> <b>Thêm vào MH chính</b>.</p>
              <p>3. Mở <b>DN Studio</b> từ màn hình chính rồi quay lại đây bật thông báo.</p>
            </div>
          ) : !pushSupported() ? (
            <p className="text-[13px] text-white/60">Trình duyệt này không hỗ trợ thông báo. Trên Android hãy dùng Chrome, trên iPhone dùng Safari (iOS 16.4 trở lên).</p>
          ) : sub === undefined ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : sub ? (
            <>
              <p className="flex items-center gap-2 text-[13px] text-emerald-300"><BellRing className="h-4 w-4" />Đang bật: có đơn hàng hoặc tin nhắn mới là điện thoại báo ngay.</p>
              <button disabled={!!busy} onClick={run("test", async () => { await app("push_test", { endpoint: sub.endpoint }); setNote("Đã gửi. Thông báo sẽ hiện sau vài giây."); })}
                className={`${btn} bg-white/[0.07] text-[#f3e9d6]`}>{busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}Gửi thử một thông báo</button>
              <button disabled={!!busy} onClick={run("off", async () => { await disablePush(); setSub(null); })}
                className={`${btn} text-white/55`}>{busy === "off" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}Tắt thông báo</button>
            </>
          ) : (
            <button disabled={!!busy} onClick={run("on", async () => setSub(await enablePush()))} className={`${btn} bg-[#d4a64a] text-[#1a0f08]`}>
              {busy === "on" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}Bật thông báo</button>
          )}
          {note ? <p className="text-[13px] text-white/70">{note}</p> : null}
        </section>

        <section className="space-y-2 border-t border-white/5 pt-4">
          <p className="text-[12px] text-white/45">Đang đăng nhập: {user.email}</p>
          <button onClick={onSignOut} className={`${btn} bg-white/[0.05] text-red-300`}><LogOut className="h-4 w-4" />Đăng xuất</button>
        </section>
      </div>
    </div>
  );
}

export default function Studio() {
  const [user, setUser] = useState(undefined);   // undefined = checking, null = signed out
  const start = fromUrl(window.location.href);
  const [tab, setTab] = useState(() => start.tab || (() => { try { return sessionStorage.getItem("studio_tab"); } catch { return null; } })() || "orders");
  const [openConv, setOpenConv] = useState(start.conv);
  const [days, setDays] = useState(7);
  const [orders, setOrders] = useState(null);
  const [stats, setStats] = useState(null);
  const [convs, setConvs] = useState(null);
  const [errors, setErrors] = useState({});
  const [settings, setSettings] = useState(false);
  const [nOrders, setNOrders] = useState(0);

  const checkUser = useCallback(async () => {
    try { setUser(await base44.auth.me()); } catch { setUser(null); }
  }, []);
  useEffect(() => { checkUser(); registerWorker(); }, [checkUser]);
  const admin = user?.role === "admin";

  const fail = (k, e) => setErrors((x) => ({ ...x, [k]: e ? e.message || "Không tải được." : "" }));
  const loadOrders = useCallback(async () => {
    try { const d = await app("orders"); setOrders(d); setNOrders(newOrders(d.items)); fail("orders"); } catch (e) { fail("orders", e); }
  }, []);
  const loadChats = useCallback(async () => {
    try { setConvs((await chat("list")).conversations); fail("chat"); } catch (e) { fail("chat", e); }
  }, []);
  const loadStats = useCallback(async (d) => {
    try { setStats(await app("analytics", { days: d })); fail("stats"); } catch (e) { fail("stats", e); }
  }, []);

  // live data: right away, every 20 s (chat) / 60 s (the rest) while the app is on screen, and when it comes back
  useEffect(() => {
    if (!admin) return undefined;
    const all = () => { loadOrders(); loadChats(); };
    all();
    const fast = setInterval(() => visible() && loadChats(), 20000);
    const slow = setInterval(() => visible() && loadOrders(), 60000);
    const back = () => visible() && all();
    document.addEventListener("visibilitychange", back);
    const onMsg = (e) => {
      if (e.data?.type === "push") all();
      if (e.data?.type === "open") { const t = fromUrl(e.data.url); if (t.tab) setTab(t.tab); setOpenConv(t.conv); all(); }
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => { clearInterval(fast); clearInterval(slow); document.removeEventListener("visibilitychange", back); navigator.serviceWorker?.removeEventListener("message", onMsg); };
  }, [admin, loadOrders, loadChats]);

  const statsTab = tab === "analytics" || tab === "cart" || tab === "emails";
  useEffect(() => {
    if (!admin || !statsTab) return undefined;
    loadStats(days);
    const t = setInterval(() => visible() && loadStats(days), 60000);
    return () => clearInterval(t);
  }, [admin, statsTab, days, loadStats]);

  // opening Orders clears its red number
  useEffect(() => {
    if (tab === "orders" && orders?.items) { markOrdersSeen(orders.items); setNOrders(0); }
  }, [tab, orders]);
  useEffect(() => { try { sessionStorage.setItem("studio_tab", tab); } catch { /* ignore */ } window.scrollTo(0, 0); }, [tab]);

  const unread = (convs || []).filter((c) => c.unread_for_admin).length;
  useEffect(() => { if (admin) setIconBadge(unread + nOrders); }, [admin, unread, nOrders]);
  const onRead = useCallback((id) => setConvs((list) => (list || []).map((c) => (c.id === id ? { ...c, unread_for_admin: false } : c))), []);

  const pickDays = (d) => { setStats(null); setDays(d); };
  const signOut = async () => { await disablePush().catch(() => {}); setIconBadge(0); await base44.auth.logout(); setSettings(false); setUser(null); };

  if (user === undefined) return <div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#d4a64a]" /></div>;
  if (!user) return <Login onDone={checkUser} />;
  if (!admin) return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="text-[15px] text-[#f3e9d6]">Tài khoản {user.email} không phải admin của website.</p>
      <button onClick={signOut} className="rounded-xl bg-white/[0.07] px-5 py-2.5 text-sm font-bold text-[#f3e9d6]">Đăng nhập tài khoản khác</button>
    </div>
  );

  const count = { orders: nOrders, chat: unread };
  return (
    <div className="mx-auto min-h-[100dvh] max-w-xl">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-[#120b06]/90 px-4 pb-2.5 backdrop-blur" style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}>
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold text-[#f3e9d6]">{TITLES[tab]}</h1>
        <button onClick={() => setSettings(true)} aria-label="Cài đặt" className="rounded-full p-2 text-white/70"><Settings className="h-5 w-5" /></button>
      </header>
      <main className="px-4 pb-28 pt-1">
        {tab === "orders" && <Orders data={orders} error={errors.orders} />}
        {tab === "analytics" && <Analytics data={stats} error={errors.stats} days={days} setDays={pickDays} />}
        {tab === "cart" && <Cart data={stats} error={errors.stats} days={days} setDays={pickDays} />}
        {tab === "emails" && <Emails data={stats} error={errors.stats} days={days} setDays={pickDays} />}
        {tab === "chat" && <Chat list={convs} error={errors.chat} open={openConv} setOpen={(id) => { setOpenConv(id); if (!id) loadChats(); }} onRead={onRead} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-[#120b06]/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}
              className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold ${tab === id ? "text-[#d4a64a]" : "text-white/50"}`}>
              <span className="relative">
                <Icon className="h-6 w-6" />
                {count[id] ? <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e5242b] px-1 text-[10.5px] font-extrabold leading-none text-white ring-2 ring-[#120b06]">{count[id] > 99 ? "99+" : count[id]}</span> : null}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>
      {settings ? <SettingsSheet user={user} onClose={() => setSettings(false)} onSignOut={signOut} /> : null}
    </div>
  );
}
