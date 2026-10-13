// Small shared pieces of the phone app (Vietnamese: the owner's side of the site).
import { Loader2 } from "lucide-react";

export const nf = (n) => Number(n || 0).toLocaleString("vi-VN");
export const pct = (a, b) => (Number(b) ? Math.round((Number(a) / Number(b)) * 100) : 0);
export const usd = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
export const dur = (ms) => {
  const s = Math.round(Number(ms || 0) / 1000);
  return s < 60 ? `${s} giây` : `${Math.floor(s / 60)} phút ${s % 60} giây`;
};
export const when = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};
let regions = null;
try { regions = new Intl.DisplayNames(["vi"], { type: "region" }); } catch { /* old browser: show the code */ }
export const countryName = (code) => {
  if (!code) return "Chưa rõ";
  try { return regions?.of(code) || code; } catch { return code; }
};
export const CHANNELS = { Direct: "Truy cập trực tiếp", "Organic Search": "Tìm kiếm (Google…)", "Organic Video": "Video (YouTube)",
  "Organic Social": "Mạng xã hội", Referral: "Trang web khác", Email: "Email", Paid: "Quảng cáo trả phí" };
export const PAGE_NAMES = { "/": "Trang chủ", "/books": "Sách", "/bible-studies": "Bible Studies", "/watch": "Video", "/shop": "Cửa hàng",
  "/about": "Giới thiệu", "/faq": "Câu hỏi thường gặp", "/contact": "Liên hệ", "/cart": "Giỏ hàng", "/login": "Đăng nhập", "/register": "Đăng ký",
  "/account": "Tài khoản", "/free-resources": "Tài liệu miễn phí", "/download": "Trang tải sách", "/search": "Tìm kiếm", "/blog": "Blog" };

const TONES = { ok: "bg-emerald-500/15 text-emerald-300", warn: "bg-amber-500/15 text-amber-300", bad: "bg-red-500/15 text-red-300", muted: "bg-white/5 text-white/60" };
export const Pill = ({ tone = "muted", children }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}>{children}</span>
);

export const Stat = ({ label, value, hint }) => (
  <div className="min-w-0 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/5">
    <div className="truncate text-[11px] font-semibold text-white/55">{label}</div>
    <div className="truncate text-xl font-extrabold tabular-nums text-[#f3e9d6]">{value}</div>
    {hint ? <div className="truncate text-[11px] text-white/45">{hint}</div> : null}
  </div>
);
export const Stats = ({ children }) => <div className="grid grid-cols-2 gap-2">{children}</div>;

export const Card = ({ title, icon: Icon, children, right }) => (
  <section className="rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/5">
    {title ? (
      <div className="mb-3 flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-[#d4a64a]" /> : null}
        <h2 className="flex-1 font-body text-sm font-bold text-[#f3e9d6]">{title}</h2>
        {right}
      </div>
    ) : null}
    {children}
  </section>
);

// GA-style ranked list: name, number and a thin bar for its share.
export function Rank({ rows, name, value }) {
  if (!rows?.length) return <Empty />;
  const max = Math.max(1, ...rows.map(value));
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i} className="text-[13px]">
          <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-white/85">{name(r)}</span><b className="tabular-nums">{nf(value(r))}</b></div>
          <div className="mt-1 h-1 rounded-full bg-[#d4a64a]" style={{ width: `${Math.max(2, pct(value(r), max))}%` }} />
        </div>
      ))}
    </div>
  );
}

export const Empty = ({ text = "Chưa có dữ liệu." }) => <p className="py-2 text-[13px] text-white/45">{text}</p>;
export const Loading = () => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" />Đang tải…</div>
);
export const ErrorNote = ({ error }) => (error ? <div className="rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-200 ring-1 ring-red-500/20">{error}</div> : null);

// 7 / 28 / 90 days
export const Range = ({ days, onChange }) => (
  <div className="flex rounded-full bg-white/5 p-0.5 text-xs font-bold" role="group" aria-label="Khoảng thời gian">
    {[7, 28, 90].map((d) => (
      <button key={d} onClick={() => onChange(d)} className={`rounded-full px-3 py-1.5 ${days === d ? "bg-[#d4a64a] text-[#1a0f08]" : "text-white/60"}`}>{d} ngày</button>
    ))}
  </div>
);
