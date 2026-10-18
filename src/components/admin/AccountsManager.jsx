import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Search, Loader2, ShieldCheck, ShieldOff, Ban, RotateCcw, UserPlus, RefreshCw } from "lucide-react";

// Admin > Tài khoản: every account that signed up on the site. Ban / unban, and give or take
// the admin role. The work is done by the adminUsers edge function (admins only).
const call = (action, payload = {}) => base44.functions.invoke("adminUsers", { action, ...payload }).then((r) => r.data);

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "admin", label: "Admin" },
  { id: "banned", label: "Bị chặn" },
  { id: "buyers", label: "Đã mua" },
];

export default function AccountsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(null);   // id (or "grant") of the action in progress
  const [grantEmail, setGrantEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await call("list")).items || []);
      setError("");
    } catch (e) {
      setError(e.message || "Không tải được danh sách tài khoản.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (key, action, payload, confirmText, doneText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    try {
      await call(action, payload);
      toast({ title: doneText });
      await load();
      return true;
    } catch (e) {
      toast({ title: "Không thực hiện được", description: e.message, variant: "destructive" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const grant = async (e) => {
    e.preventDefault();
    const email = grantEmail.trim().toLowerCase();
    if (!email) return;
    const ok = await act("grant", "set_role", { email, role: "admin" },
      `Cấp quyền admin cho ${email}?\nNgười này sẽ vào được trang Admin, sửa và xoá được mọi nội dung, xem đơn hàng và tin nhắn.`,
      `Đã cấp quyền admin cho ${email}`);
    if (ok) setGrantEmail("");
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((u) => {
      if (filter === "admin" && u.role !== "admin") return false;
      if (filter === "banned" && !u.banned) return false;
      if (filter === "buyers" && !u.purchases) return false;
      return !q || u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q);
    });
  }, [items, query, filter]);

  const counts = {
    all: items.length,
    admin: items.filter((u) => u.role === "admin").length,
    banned: items.filter((u) => u.banned).length,
    buyers: items.filter((u) => u.purchases).length,
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-2xl font-bold mb-1">Tài khoản</h2>
          <p className="text-sm text-muted-foreground">
            Các tài khoản đã đăng ký trên web. <strong className="text-foreground">Chặn</strong>: tài khoản không đăng nhập được nữa và bị
            đăng xuất ngay khi tải lại trang. <strong className="text-foreground">Admin</strong>: vào được trang này và DN Studio, sửa được mọi nội dung.
            Bạn không thể tự chặn hay tự gỡ quyền của chính mình.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded border border-border text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Tải lại
        </button>
      </div>

      <form onSubmit={grant} className="bg-card border border-border rounded p-4 mb-6">
        <label htmlFor="grant-email" className="block text-sm font-semibold mb-2">Cấp quyền admin cho email khác</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="grant-email"
            type="email"
            required
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            placeholder="email@vidu.com"
            className="flex-1 bg-secondary border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <button type="submit" disabled={busy === "grant"} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded font-semibold text-sm hover:bg-primary/90 disabled:opacity-50">
            {busy === "grant" ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Cấp quyền admin
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Người đó cần đăng ký tài khoản trên web trước bằng đúng email này.</p>
      </form>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo email hoặc tên…"
            aria-label="Tìm tài khoản"
            className="w-full bg-secondary border border-border rounded pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-2 rounded text-xs font-semibold whitespace-nowrap border transition-colors ${
                filter === f.id ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3 mb-4">{error}</p>}

      {loading && items.length === 0 ? (
        <div className="py-16 flex justify-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : shown.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground text-sm">Không có tài khoản nào khớp.</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded bg-card">
          {shown.map((u) => (
            <li key={u.id} className={`p-4 flex flex-col md:flex-row md:items-center gap-3 ${u.banned ? "bg-red-500/5" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold break-all">{u.email || "(không có email)"}</span>
                  {u.role === "admin" && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/40">Admin</span>}
                  {u.banned && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/40">Bị chặn</span>}
                  {u.is_me && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">Bạn</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {u.full_name && <>{u.full_name} · </>}
                  Đăng ký {fmt(u.created_at)} · Đăng nhập gần nhất {fmt(u.last_sign_in_at)} · {u.purchases} sách đã mua
                </p>
              </div>
              {!u.is_me && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  {u.role === "admin" ? (
                    <button
                      disabled={busy === u.id}
                      onClick={() => act(u.id, "set_role", { id: u.id, role: "user" }, `Gỡ quyền admin của ${u.email}?`, `Đã gỡ quyền admin của ${u.email}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded border border-border text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <ShieldOff className="w-3.5 h-3.5" /> Gỡ admin
                    </button>
                  ) : !u.banned && (
                    <button
                      disabled={busy === u.id}
                      onClick={() => act(u.id, "set_role", { id: u.id, role: "admin" },
                        `Cấp quyền admin cho ${u.email}?\nNgười này sẽ sửa và xoá được mọi nội dung, xem đơn hàng và tin nhắn.`,
                        `Đã cấp quyền admin cho ${u.email}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded border border-border text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Cấp admin
                    </button>
                  )}
                  {u.banned ? (
                    <button
                      disabled={busy === u.id}
                      onClick={() => act(u.id, "unban", { id: u.id }, `Bỏ chặn ${u.email}?`, `Đã bỏ chặn ${u.email}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded border border-border text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Bỏ chặn
                    </button>
                  ) : u.role !== "admin" && (
                    <button
                      disabled={busy === u.id}
                      onClick={() => act(u.id, "ban", { id: u.id },
                        `Chặn ${u.email}?\nTài khoản sẽ không đăng nhập được nữa${u.purchases ? ` và không vào được ${u.purchases} sách đã mua trong My Account` : ""}. Có thể bỏ chặn lại sau.`,
                        `Đã chặn ${u.email}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded border border-red-500/40 text-red-400 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {busy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Chặn
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
