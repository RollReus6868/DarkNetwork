import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Download, Link2, Send, ChevronDown, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { podAdmin } from "@/lib/podCart";

// Admin > Đơn áo: Printify connection (sync products, webhooks) and the print orders.
const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const STATUS = {
  started: ["Chưa thanh toán", "bg-zinc-500/20 text-zinc-300"],
  paid: ["Đã thanh toán", "bg-sky-500/20 text-sky-300"],
  in_production: ["Đang in", "bg-amber-500/20 text-amber-300"],
  shipped: ["Đã gửi hàng", "bg-indigo-500/20 text-indigo-300"],
  delivered: ["Đã giao", "bg-emerald-500/20 text-emerald-300"],
  needs_attention: ["Cần xử lý", "bg-red-500/25 text-red-300"],
  canceled: ["Đã huỷ", "bg-zinc-500/20 text-zinc-300"],
  refunded: ["Đã hoàn tiền", "bg-zinc-500/20 text-zinc-300"],
  partially_refunded: ["Hoàn một phần", "bg-zinc-500/20 text-zinc-300"],
};

function Badge({ status }) {
  const [label, cls] = STATUS[status] || [status, "bg-zinc-500/20 text-zinc-300"];
  return <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${cls}`}>{label}</span>;
}

export default function PodOrders() {
  const { toast } = useToast();
  const [info, setInfo] = useState(null);
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(null);

  const loadOrders = useCallback(async () => {
    try { setOrders((await podAdmin("orders")).items || []); } catch (e) { setOrders([]); toast({ title: "Không tải được đơn", description: e.message, variant: "destructive" }); }
  }, [toast]);
  const loadInfo = useCallback(async () => {
    try { setInfo(await podAdmin("status")); } catch (e) { setInfo({ error: e.message }); }
  }, []);
  useEffect(() => { loadInfo(); loadOrders(); }, [loadInfo, loadOrders]);

  const run = async (key, action, extra, done) => {
    setBusy(key);
    try {
      const r = await podAdmin(action, extra);
      done?.(r);
    } catch (e) {
      toast({ title: "Không thực hiện được", description: e.message, variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  const sync = () => run("sync", "sync", {}, (r) => toast({
    title: "Đã đồng bộ từ Printify",
    description: [
      r.created?.length ? `Thêm mới ${r.created.length} (ở trạng thái draft): ${r.created.join(", ")}` : "",
      r.updated?.length ? `Cập nhật ${r.updated.length}` : "",
      r.skipped?.length ? `Bỏ qua ${r.skipped.length} (không có biến thể đang bán)` : "",
      r.missing?.length ? `Không còn trên Printify: ${r.missing.join(", ")}` : "",
    ].filter(Boolean).join(" · ") || "Không có sản phẩm nào trong shop Printify.",
  }));
  const hooks = () => run("hooks", "webhooks", {}, () => { toast({ title: "Đã kết nối webhook Printify" }); loadInfo(); });
  const replace = (o) => setOrders((list) => list.map((x) => (x.id === o.id ? o : x)));

  return (
    <div className="space-y-8">
      <section className="border border-border rounded p-5 space-y-4 bg-card/40">
        <div>
          <h2 className="font-heading text-2xl font-bold">Printify</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Thiết kế sản phẩm trong Printify, rồi bấm &quot;Đồng bộ sản phẩm&quot;: sản phẩm mới vào tab Sản phẩm (Shop) ở trạng thái draft, giá mặc định $21.99 cho size rẻ nhất; size lớn tự cộng phần giá gốc chênh lệch (làm tròn lên .99). Sửa giá hoặc mô tả ở tab Sản phẩm rồi đổi sang published để bán.
          </p>
        </div>
        {!info ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : info.error ? (
          <p className="text-sm text-red-400">{info.error}</p>
        ) : (
          <ul className="text-sm space-y-1">
            <li>Shop Printify: <b>{info.shop_id}</b></li>
            <li>Webhook (báo đang in, mã vận đơn): {info.webhooks_ok ? <b className="text-emerald-400">đã kết nối</b> : <b className="text-amber-400">chưa kết nối, bấm &quot;Kết nối webhook&quot;</b>}</li>
            <li>PayPal: {info.paypal?.configured ? <b>{info.paypal.env}</b> : <b className="text-red-400">chưa cài</b>}</li>
          </ul>
        )}
        <div className="flex flex-wrap gap-3">
          <button onClick={sync} disabled={Boolean(busy)} className="btn-gold inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm uppercase tracking-wide disabled:opacity-50">
            {busy === "sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Đồng bộ sản phẩm
          </button>
          <button onClick={hooks} disabled={Boolean(busy)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm uppercase tracking-wide border border-primary text-primary hover:bg-primary/10 disabled:opacity-50">
            {busy === "hooks" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Kết nối webhook
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold">Đơn áo</h2>
          <button onClick={loadOrders} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><RefreshCw className="w-4 h-4" /> Tải lại</button>
        </div>
        <p className="text-sm text-muted-foreground">
          Khách trả tiền qua PayPal, web tự gửi đơn sang Printify để in và giao. Printify trừ tiền in + ship vào thẻ hoặc số dư Printify của bạn. Đơn &quot;Cần xử lý&quot;: đọc ghi chú, sửa trong Printify (ví dụ thêm thẻ thanh toán) rồi bấm &quot;Gửi lại&quot;.
        </p>
        {!orders ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed border-border rounded p-6 text-center">Chưa có đơn áo nào.</p>
        ) : (
          <ul className="border border-border rounded divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id}>
                <button onClick={() => setOpen(open === o.id ? null : o.id)} className="w-full flex flex-wrap items-center gap-3 p-4 text-left hover:bg-primary/5">
                  <Badge status={o.status} />
                  <span className="flex-1 min-w-[12rem]">
                    <span className="block font-semibold">{[o.address?.first_name, o.address?.last_name].join(" ")} · {money(o.total)}</span>
                    <span className="block text-xs text-muted-foreground">
                      #{o.id.slice(0, 8).toUpperCase()} · {new Date(o.created_date).toLocaleString("vi-VN")} · {(o.items || []).reduce((n, i) => n + i.quantity, 0)} món
                    </span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${open === o.id ? "rotate-180" : ""}`} />
                </button>
                {open === o.id && (
                  <div className="px-4 pb-4 space-y-3 text-sm">
                    {o.note && <p className="text-red-300 border border-red-500/40 rounded px-3 py-2">{o.note}</p>}
                    <ul className="space-y-1">
                      {(o.items || []).map((i, k) => (
                        <li key={k}>{i.quantity}× {i.title} <span className="text-muted-foreground">({i.variant_title})</span> · {money(i.unit_price * i.quantity)}</li>
                      ))}
                      <li className="text-muted-foreground">Ship {money(o.shipping)} · Tổng {money(o.total)}</li>
                    </ul>
                    <p className="text-foreground/80">
                      {o.email}{o.address?.phone ? ` · ${o.address.phone}` : ""}<br />
                      {o.address?.address1}{o.address?.address2 ? `, ${o.address.address2}` : ""}, {o.address?.city}, {o.address?.region} {o.address?.zip}, {o.address?.country}
                    </p>
                    <p className="text-muted-foreground">
                      PayPal: {o.paypal_order_id || "—"}{o.capture_id ? ` (capture ${o.capture_id})` : ""} · Printify: {o.printify_order_id || "chưa có"}{o.printify_status ? ` (${o.printify_status})` : ""}
                    </p>
                    {(o.shipments || []).map((s, k) => (
                      <p key={k}>Vận đơn: <b className="uppercase">{s.carrier}</b> {s.number} {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">theo dõi <ExternalLink className="w-3 h-3" /></a>}</p>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {o.printify_order_id && (
                        <button onClick={() => run(`r-${o.id}`, "refresh", { id: o.id }, (r) => replace(r.order))} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-border text-xs uppercase hover:border-primary disabled:opacity-50">
                          {busy === `r-${o.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Hỏi lại Printify
                        </button>
                      )}
                      {["paid", "needs_attention"].includes(o.status) && o.capture_id && (
                        <button onClick={() => run(`s-${o.id}`, "retry", { id: o.id }, (r) => { replace(r.order); toast({ title: r.order.status === "needs_attention" ? "Printify vẫn chưa nhận" : "Đã gửi sang Printify", description: r.order.note || "" }); })} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded btn-gold text-xs uppercase disabled:opacity-50">
                          {busy === `s-${o.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Gửi lại sang Printify
                        </button>
                      )}
                      <a href={`/order/${o.id}?token=${o.access_token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-border text-xs uppercase hover:border-primary">
                        Trang của khách <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
