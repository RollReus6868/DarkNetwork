import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowDown, ArrowUp, Loader2, Search, X } from "lucide-react";

const inputCls = "w-full bg-secondary border border-border rounded px-3 py-2 text-sm";

/**
 * Ordered picker for hand-picking related ebooks.
 * The order shown here (top to bottom) is the priority order used on the
 * ebook's page, so each row can be nudged up or down.
 */
export default function EbookPicker({ value, onChange, selfId }) {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const ids = Array.isArray(value) ? value : [];

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await base44.entities.Ebook.list("-created_date", 300);
        if (active) setAll(list);
      } catch {
        // Không tải được danh sách thì để trống, phần đã chọn vẫn giữ nguyên.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const byId = useMemo(() => new Map(all.map((e) => [e.id, e])), [all]);
  const rows = ids.map((id) => ({ id, ebook: byId.get(id), self: id === selfId }));

  const matches = (ebook) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${ebook.title} ${ebook.subtitle || ""}`.toLowerCase().includes(q);
  };
  const available = all.filter((e) => !ids.includes(e.id) && e.id !== selfId && matches(e));

  const move = (index, direction) => {
    const next = [...ids];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="border border-border rounded divide-y divide-border">
        {rows.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            Chưa chọn quyển nào. Để trống thì hệ thống tự gợi ý các quyển cùng bộ (cùng tên, khác Part).
          </p>
        )}
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2 px-3 py-2">
            <span className="w-5 flex-shrink-0 text-xs text-muted-foreground">{i + 1}</span>
            <span className={`flex-1 min-w-0 truncate text-sm ${row.ebook ? "" : "text-yellow-500"}`}>
              {row.ebook ? row.ebook.title : "Không tìm thấy ebook này (có thể đã bị xoá)"}
            </span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Ưu tiên lên" className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} title="Ưu tiên xuống" className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => onChange(ids.filter((id) => id !== row.id))} title="Bỏ chọn" className="p-1 text-muted-foreground hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm ebook để thêm…" className={`${inputCls} pl-9`} />
      </div>

      <div className="max-h-52 overflow-y-auto border border-border rounded divide-y divide-border">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : available.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">Không còn ebook nào phù hợp để thêm.</p>
        ) : (
          available.map((ebook) => (
            <button
              key={ebook.id}
              type="button"
              onClick={() => onChange([...ids, ebook.id])}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 hover:text-primary truncate"
            >
              {ebook.title}
              {ebook.status === "draft" && <span className="text-xs text-yellow-500"> · bản nháp</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}