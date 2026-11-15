import { useState } from "react";
import { Loader2, RotateCcw, Star, Upload, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { colorOption, colorEntries, colorVariantIds, displayColor } from "@/lib/podCart";

// Admin > Sản phẩm, Printify products with colours: the pictures of each colour (product.variant_images).
// Pick a colour, then choose its main picture, hide pictures or add your own. A hidden Printify mockup
// stays in the list with hidden: true, so "Đồng bộ sản phẩm" does not bring it back; it can be restored.
const inputCls = "w-full bg-background border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-primary";

export default function PodImagesEditor({ form, value, onChange, uploadUrl, label, hint }) {
  const color = colorOption(form);
  const shown = displayColor(form);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!color) return null;

  const list = Array.isArray(value) ? value : [];
  const current = color.values.find((v) => v.id === picked) || shown || color.values[0];
  const ids = new Set(colorVariantIds(form, current.id));
  const inColor = (img) => (img.variant_ids || []).some((id) => ids.has(id));
  const visible = colorEntries({ ...form, variant_images: list }, current.id);
  const hidden = colorEntries({ ...form, variant_images: list }, current.id, { all: true }).filter((img) => img.hidden);
  const count = (valueId) => colorEntries({ ...form, variant_images: list }, valueId).length;

  const setMain = (entry) => onChange(list.map((img) => (inColor(img) ? { ...img, is_default: img === entry } : img)));

  const remove = (entry) => {
    const rest = (entry.variant_ids || []).filter((id) => !ids.has(id));
    const wasMain = Boolean(entry.is_default);
    let next = list.flatMap((img) => {
      if (img !== entry) return [img];
      if (rest.length) return [{ ...img, variant_ids: rest }];          // shared with other colours: only leave this one
      if (img.own) return [];                                          // the owner's own upload: gone for good
      return [{ ...img, hidden: true, is_default: false }];           // a Printify mockup: hide, so a re-sync keeps it out
    });
    if (wasMain) {
      const first = next.find((img) => !img.hidden && inColor(img));
      if (first) next = next.map((img) => (img === first ? { ...img, is_default: true } : img));
    }
    onChange(next);
  };

  const restore = () => onChange(list.map((img) => (img.hidden && inColor(img) ? { ...img, hidden: false } : img)));

  const add = (urls) => {
    const clean = urls.map((u) => u.trim()).filter(Boolean);
    if (!clean.length) return;
    const noMain = visible.length === 0;
    onChange([...list, ...clean.map((src, i) => ({ src, variant_ids: [...ids], is_default: noMain && i === 0, own: true }))]);
  };

  const uploadFiles = async (files) => {
    setBusy(true);
    const urls = [];
    for (const file of files) {
      const url = await uploadUrl(file);
      if (url) urls.push(url);
    }
    setBusy(false);
    add(urls);
  };

  return (
    <div>
      {label}
      <div className="flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label="Chọn màu để sửa ảnh">
        {color.values.map((v) => {
          const active = v.id === current.id;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPicked(v.id)}
              className={`flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 text-sm ${active ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary"}`}
            >
              <span className="w-5 h-5 rounded-full border border-border" style={{ background: v.colors?.[0] || "#888" }} />
              {v.title}
              <span className="text-xs opacity-70">({count(v.id)})</span>
              {shown?.id === v.id && <span className="text-[10px] uppercase tracking-wide text-primary">mặc định</span>}
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-2">
          {visible.map((img, i) => (
            <div key={`${img.src}-${i}`} className="relative w-24 h-24 overflow-hidden rounded bg-white border border-border">
              <Image src={img.src} alt="" className="w-full h-full" fittingType="fill" />
              {i === 0 ? (
                <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[10px] text-center uppercase text-primary py-0.5">Ảnh chính</span>
              ) : (
                <button type="button" onClick={() => setMain(img)} title="Đặt làm ảnh chính của màu này" className="absolute bottom-0 inset-x-0 bg-black/60 hover:bg-black/80 text-[10px] text-white hover:text-primary py-0.5 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" /> Đặt ảnh chính
                </button>
              )}
              <button type="button" onClick={() => remove(img)} title="Xoá ảnh này khỏi màu" aria-label="Xoá ảnh" className="absolute top-0.5 right-0.5 bg-black/70 p-0.5 rounded text-white hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-2">Màu {current.title} chưa có ảnh nào. Khách chọn màu này sẽ thấy ảnh chung của sản phẩm.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 border border-dashed border-border rounded px-4 py-2.5 cursor-pointer hover:border-primary text-sm text-muted-foreground hover:text-primary">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên…</> : <><Upload className="w-4 h-4" /> Thêm ảnh cho màu {current.title}</>}
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; if (files.length) uploadFiles(files); }} />
        </label>
        {hidden.length > 0 && (
          <button type="button" onClick={restore} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
            <RotateCcw className="w-4 h-4" /> Khôi phục {hidden.length} ảnh đã xoá
          </button>
        )}
      </div>
      <textarea
        rows={2}
        defaultValue=""
        placeholder={`hoặc dán link ảnh cho màu ${current.title} (mỗi dòng một link) rồi bấm ra ngoài`}
        onBlur={(e) => { add(e.target.value.split("\n")); e.target.value = ""; }}
        className={`${inputCls} mt-2`}
      />
      {hint}
    </div>
  );
}
