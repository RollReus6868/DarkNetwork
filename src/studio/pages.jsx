// Orders, statistics, cart & checkouts and email sign-ups (the same numbers as the desktop tool).
import { useState } from "react";
import { BookOpen, Check, Copy, CreditCard, Filter, Globe, Mail, Radio, Signpost, Split, FileText, TrendingUp } from "lucide-react";
import { CHANNELS, PAGE_NAMES, Card, Empty, ErrorNote, Loading, Pill, Range, Rank, Stat, Stats, countryName, dur, nf, pct, usd, when } from "./ui";

const ORDER_STATUS = { paid: ["ok", "Đã thanh toán"], refunded: ["bad", "Đã hoàn tiền"], partially_refunded: ["warn", "Hoàn một phần"], pending: ["muted", "Chờ thanh toán"] };
const CHECKOUT_STATUS = { paid: ["ok", "Thanh toán thành công"], started: ["warn", "Chưa thanh toán"], refunded: ["bad", "Đã hoàn tiền"], partially_refunded: ["warn", "Hoàn một phần"] };

function OrderRow({ email, date, items, total, status, meta, statusMap }) {
  const [tone, label] = statusMap[status] || ["muted", status || "Chưa rõ"];
  return (
    <div className="rounded-2xl bg-white/[0.035] p-3.5 ring-1 ring-white/5">
      <div className="flex items-start gap-2">
        <b className="min-w-0 flex-1 break-words text-[14px] text-[#f3e9d6]">{email}</b>
        <b className="tabular-nums text-[15px] text-[#f3e9d6]">{usd(total)}</b>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
        <Pill tone={tone}>{label}</Pill><span>{when(date)}</span>{meta}
      </div>
      <ul className="mt-2 space-y-0.5 text-[12px] text-white/60">{items.map((t, i) => <li key={i} className="break-words">• {t}</li>)}</ul>
    </div>
  );
}

export function Orders({ data, error }) {
  if (!data && !error) return <Loading />;
  const items = data?.items || [];
  const paid = items.filter((i) => i.status === "paid");
  return (
    <div className="space-y-3">
      <Stats>
        <Stat label="Đơn đã thanh toán" value={nf(paid.length)} />
        <Stat label="Doanh thu" value={usd(paid.reduce((n, i) => n + Number(i.total || 0), 0))} hint="gồm thuế, chưa trừ phí" />
        <Stat label="Sách đã bán" value={nf(paid.reduce((n, i) => n + i.items.length, 0))} />
        <Stat label="Đơn hoàn tiền" value={nf(items.filter((i) => i.status === "refunded").length)} />
      </Stats>
      <ErrorNote error={error} />
      {items.length ? items.map((o) => (
        <OrderRow key={o.order_id} email={o.email || "(không có email)"} date={o.date} items={o.items} total={o.total} status={o.status} statusMap={ORDER_STATUS}
          meta={<span>{o.buyer === "account" ? "Có tài khoản" : "Khách vãng lai"}</span>} />
      )) : <Empty text="Chưa có đơn hàng nào." />}
    </div>
  );
}

const vsPrev = (cur, prev) => {
  if (!Number(prev)) return "";
  const d = pct(Number(cur) - Number(prev), prev);
  return `${d >= 0 ? "▲" : "▼"} ${Math.abs(d)}% so với kỳ trước`;
};

// Users per day: this period (line) against the period before (dashed). Tap a day to read its numbers.
function DayChart({ days, range }) {
  const [pick, setPick] = useState(null);
  if (!days?.length) return <Empty />;
  const max = Math.max(1, ...days.map((d) => Math.max(d.users, d.prev_users)));
  const x = (i) => (days.length === 1 ? 50 : (i / (days.length - 1)) * 100);
  const y = (v) => 100 - (v / max) * 100;
  const line = (k) => days.map((d, i) => `${x(i).toFixed(2)},${y(Number(d[k])).toFixed(2)}`).join(" ");
  const label = (d) => `${d.day.slice(8)}/${d.day.slice(5, 7)}`;
  const shown = days[pick ?? days.length - 1];
  return (
    <div>
      <div className="mb-2 text-[12px] text-white/60"><b className="text-[#f3e9d6]">{label(shown)}</b>: {nf(shown.users)} người dùng, {nf(shown.views)} lượt xem · kỳ trước {nf(shown.prev_users)}</div>
      <div className="relative ml-6 h-36">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
          {[0, 50, 100].map((v) => <line key={v} x1="0" x2="100" y1={v} y2={v} stroke="rgba(255,255,255,.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <polyline points={line("prev_users")} fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <polyline points={line("users")} fill="none" stroke="#d4a64a" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {pick != null ? <line x1={x(pick)} x2={x(pick)} y1="0" y2="100" stroke="rgba(212,166,74,.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
        <div className="absolute inset-0 flex">{days.map((d, i) => <button key={d.day} aria-label={label(d)} className="flex-1" onClick={() => setPick(i)} />)}</div>
        <span className="absolute -left-6 -top-2 w-5 text-right text-[10px] text-white/40">{nf(max)}</span>
        <span className="absolute -left-6 bottom-[-6px] w-5 text-right text-[10px] text-white/40">0</span>
      </div>
      <div className="ml-6 mt-1 flex justify-between text-[11px] text-white/40"><span>{label(days[0])}</span><span>{label(days[days.length - 1])}</span></div>
      <div className="mt-2 flex gap-4 text-[11px] font-semibold text-white/55">
        <span className="flex items-center gap-1.5"><i className="inline-block w-4 border-t-2 border-[#d4a64a]" />{range} ngày qua</span>
        <span className="flex items-center gap-1.5"><i className="inline-block w-4 border-t-2 border-dashed border-white/40" />kỳ trước</span>
      </div>
    </div>
  );
}

export function Analytics({ data, error, days, setDays }) {
  const a = data || {}, s = a.summary || {}, rt = a.realtime || {};
  const minutes = rt.minutes || [];
  return (
    <div className="space-y-3">
      <Range days={days} onChange={setDays} />
      <ErrorNote error={error} />
      {!data ? <Loading /> : <>
        <Stats>
          <Stat label="Người dùng" value={nf(s.users)} hint={vsPrev(s.users, s.prev_users)} />
          <Stat label="Người dùng mới" value={nf(s.new_users)} />
          <Stat label="Phiên truy cập" value={nf(s.sessions)} hint={vsPrev(s.sessions, s.prev_sessions)} />
          <Stat label="Lượt xem trang" value={nf(s.views)} hint={vsPrev(s.views, s.prev_views)} />
          <Stat label="Tương tác TB" value={dur(s.engage_ms / Math.max(1, s.users))} hint="mỗi người dùng" />
          <Stat label="Tỷ lệ tương tác" value={`${pct(s.engaged, s.sessions)}%`} hint={`${nf(s.engaged)} phiên`} />
        </Stats>
        <Card title="Người dùng mỗi ngày" icon={TrendingUp}><DayChart days={a.days} range={days} /></Card>
        <Card title="Đang hoạt động" icon={Radio}>
          <div className="flex gap-6">
            <div><div className="text-3xl font-extrabold tabular-nums">{nf(rt.users_30m)}</div><div className="text-[11px] text-white/50">trong 30 phút qua</div></div>
            <div><div className="text-3xl font-extrabold tabular-nums">{nf(rt.users_5m)}</div><div className="text-[11px] text-white/50">trong 5 phút qua</div></div>
          </div>
          <div className="mt-3 flex h-10 items-end gap-[2px]" aria-label="Người dùng mỗi phút">
            {minutes.map((n, i) => <div key={i} className="flex-1 rounded-sm bg-white/5" style={{ height: "100%" }}><div className="w-full rounded-sm bg-[#d4a64a]" style={{ height: `${pct(n, Math.max(1, ...minutes))}%`, marginTop: `${100 - pct(n, Math.max(1, ...minutes))}%` }} /></div>)}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-white/40"><span>-30 phút</span><span>bây giờ</span></div>
          {rt.countries?.length ? <div className="mt-3"><Rank rows={rt.countries} name={(r) => countryName(r.country)} value={(r) => r.users} /></div> : null}
        </Card>
        <Card title="Người dùng theo quốc gia" icon={Globe}><Rank rows={a.countries} name={(r) => countryName(r.country)} value={(r) => r.users} /></Card>
        <Card title="Lượt xem theo trang" icon={FileText}><Rank rows={a.pages} name={(r) => r.title || PAGE_NAMES[r.path] || r.path} value={(r) => r.views} /></Card>
        <Card title="Phiên theo kênh" icon={Split}><Rank rows={a.channels} name={(r) => CHANNELS[r.channel] || r.channel} value={(r) => r.sessions} /></Card>
        <Card title="Nguồn truy cập" icon={Signpost}>
          {a.sources?.length ? <div className="divide-y divide-white/5">{a.sources.map((r) => (
            <div key={r.source} className="py-2 text-[12px]">
              <div className="flex gap-2"><b className="min-w-0 flex-1 truncate text-[13px] text-white/85">{r.source}</b><span className="text-white/50">{CHANNELS[r.channel] || r.channel}</span></div>
              <div className="mt-0.5 text-white/50">{nf(r.users)} người dùng · {nf(r.sessions)} phiên · {pct(r.engaged, r.sessions)}% tương tác · TB {dur(r.engage_ms / Math.max(1, r.sessions))}</div>
            </div>))}</div> : <Empty />}
        </Card>
        <p className="px-1 text-[11px] leading-relaxed text-white/40">Số liệu do website tự đếm, có thể lệch so với Google Analytics. Không tính lượt của bạn khi đăng nhập admin.</p>
      </>}
    </div>
  );
}

export function Cart({ data, error, days, setDays }) {
  const a = data || {}, f = a.funnel || {};
  const steps = [["Xem trang sách", f.book_views], ["Thêm vào giỏ hàng", f.add_to_cart], ["Vào trang thanh toán", f.checkouts], ["Thanh toán thành công", f.checkouts_paid]];
  return (
    <div className="space-y-3">
      <Range days={days} onChange={setDays} />
      <ErrorNote error={error} />
      {!data ? <Loading /> : <>
        <Stats>
          <Stat label="Thêm vào giỏ" value={nf(f.add_to_cart)} />
          <Stat label="Vào thanh toán" value={nf(f.checkouts)} />
          <Stat label="Thanh toán thành công" value={nf(f.checkouts_paid)} hint={f.checkouts ? `${pct(f.checkouts_paid, f.checkouts)}% số lần vào` : ""} />
          <Stat label="Đơn hàng" value={nf(f.orders)} hint="đã thanh toán" />
        </Stats>
        <Card title="Phễu mua hàng" icon={Filter}>
          <div className="space-y-3">{steps.map(([label, n], k) => (
            <div key={label} className="text-[13px]">
              <div className="flex"><span className="flex-1 text-white/85">{label}</span><b className="tabular-nums">{nf(n)}</b></div>
              <div className="mt-1 h-2 rounded-full bg-[#d4a64a]" style={{ width: `${Math.max(2, pct(n, Math.max(1, steps[0][1])))}%` }} />
              {/* "Buy now" skips the cart, so a later step can be larger: no percentage then */}
              {k && Number(n) <= Number(steps[k - 1][1]) ? <div className="mt-0.5 text-[11px] text-white/45">{pct(n, steps[k - 1][1])}% của bước trước</div> : null}
            </div>))}</div>
        </Card>
        <Card title="Theo từng sách" icon={BookOpen}>
          {a.books?.length ? <div className="divide-y divide-white/5">{a.books.map((b) => (
            <div key={b.id} className="py-2">
              <div className="break-words text-[13px] text-white/85">{b.title}</div>
              <div className="mt-0.5 text-[12px] text-white/50">{nf(b.views)} lượt xem · {nf(b.add_to_cart)} thêm giỏ · {nf(b.checkouts)} vào thanh toán · {nf(b.sold)} đã bán</div>
            </div>))}</div> : <Empty />}
        </Card>
        <h2 className="flex items-center gap-2 px-1 pt-1 font-body text-sm font-bold text-[#f3e9d6]"><CreditCard className="h-4 w-4 text-[#d4a64a]" />Các lần vào thanh toán</h2>
        {a.checkouts?.length ? a.checkouts.map((c, i) => (
          <OrderRow key={i} email={c.email || (c.account ? "Khách có tài khoản" : "Khách vãng lai (chưa để lại email)")} date={c.date} items={c.items}
            total={c.total} status={c.status} statusMap={CHECKOUT_STATUS} meta={c.order_id ? <span>#{c.order_id}</span> : null} />
        )) : <Empty text="Chưa có khách nào vào trang thanh toán trong khoảng này." />}
        <p className="px-1 text-[11px] leading-relaxed text-white/40">“Chưa thanh toán” là khách đã mở trang thanh toán nhưng không trả tiền (bỏ ngang, thẻ bị từ chối…).</p>
      </>}
    </div>
  );
}

export function Emails({ data, error, days, setDays }) {
  const sub = data?.subscribers || {};
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText((sub.items || []).map((r) => r.email).join("\n"));
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };
  return (
    <div className="space-y-3">
      <Range days={days} onChange={setDays} />
      <ErrorNote error={error} />
      {!data ? <Loading /> : <>
        <Stats><Stat label="Tổng số email" value={nf(sub.total)} /><Stat label={`Mới trong ${days} ngày`} value={nf(sub.in_range)} /></Stats>
        <Card title="Mới nhất ở trên" icon={Mail} right={sub.items?.length ? (
          <button onClick={copy} className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-[#d4a64a]">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Đã copy" : "Copy tất cả"}</button>) : null}>
          {sub.items?.length ? <div className="divide-y divide-white/5">{sub.items.map((r, i) => (
            <div key={i} className="py-2"><div className="break-all text-[13px] font-semibold text-white/85">{r.email}</div>
              <div className="text-[11px] text-white/45">{r.source || ""} · {when(r.date)}</div></div>))}</div> : <Empty text="Chưa có ai đăng ký." />}
        </Card>
      </>}
    </div>
  );
}
