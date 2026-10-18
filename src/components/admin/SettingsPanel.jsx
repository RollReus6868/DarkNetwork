import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { useSiteSetting, saveSiteSetting } from "@/lib/siteSettings";

// Admin > Cài đặt: site-wide switches (stored in the site_setting table).
export default function SettingsPanel() {
  const { toast } = useToast();
  const current = useSiteSetting("new_badge");
  const [enabled, setEnabled] = useState(current.enabled);
  const [days, setDays] = useState(String(current.days));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(current.enabled);
    setDays(String(current.days));
  }, [current.enabled, current.days]);

  const dayCount = Math.round(Number(days));
  const validDays = Number.isFinite(dayCount) && dayCount >= 1 && dayCount <= 365;
  const changed = enabled !== current.enabled || dayCount !== current.days;

  const save = async () => {
    if (!validDays) return;
    setSaving(true);
    try {
      await saveSiteSetting("new_badge", { enabled, days: dayCount });
      toast({ title: "Đã lưu cài đặt", description: enabled ? `Nhãn NEW hiện trên sách thêm trong ${dayCount} ngày gần nhất.` : "Đã tắt nhãn NEW trên toàn web." });
    } catch (e) {
      toast({ title: "Không lưu được", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-heading text-2xl font-bold mb-1">Cài đặt</h2>
      <p className="text-sm text-muted-foreground mb-6">Áp dụng cho toàn bộ web, khách thấy ngay khi tải lại trang.</p>

      <section className="bg-card border border-border rounded p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor="new-badge-switch" className="font-semibold">Nhãn NEW trên bìa sách</label>
            <p className="text-sm text-muted-foreground mt-1">Tự hiện trên các ebook mới thêm vào web, ở trang chủ, Books, Shop và Tìm kiếm.</p>
          </div>
          <Switch id="new-badge-switch" checked={enabled} onCheckedChange={setEnabled} aria-label="Bật nhãn NEW" />
        </div>

        <div className={`mt-5 flex flex-wrap items-center gap-3 ${enabled ? "" : "opacity-50"}`}>
          <label htmlFor="new-badge-days" className="text-sm">Sách được coi là mới trong</label>
          <input
            id="new-badge-days"
            type="number"
            min={1}
            max={365}
            disabled={!enabled}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-20 bg-secondary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <span className="text-sm">ngày kể từ lúc thêm</span>
          <span className="ml-auto badge-new" aria-hidden="true">New</span>
        </div>
        {!validDays && <p className="text-xs text-red-400 mt-2">Nhập số ngày từ 1 đến 365.</p>}

        <div className="mt-5 flex justify-end">
          <button
            onClick={save}
            disabled={saving || !current.loaded || !changed || !validDays}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu
          </button>
        </div>
      </section>
    </div>
  );
}
