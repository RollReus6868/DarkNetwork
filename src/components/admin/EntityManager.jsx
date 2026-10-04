import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import EbookPicker from "@/components/admin/EbookPicker";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus, Pencil, Trash2, X, Loader2, Upload, Save, Copy, Search, Star, FileUp, Lock, ArrowUp, ArrowDown, GripVertical,
  Eye, EyeOff,
} from "lucide-react";
import { sortByCustomOrder } from "@/lib/displayOrder";

/**
 * Generic admin CRUD manager for a Base44 entity.
 *
 * fields: [{ key, label, type, required, options, placeholder, hint, half }]
 *   type: text | number | select | boolean | textarea | richtext | url
 *         | image | images | stringlist | faqlist | privatefile | publicfile
 *         | ebookpicker
 */

export function slugify(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const inputCls = "w-full bg-secondary border border-border rounded px-3 py-2 text-sm";
const labelCls = "text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block";

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "blockquote"],
    ["clean"],
  ],
};

function isEmptyValue(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.replace(/<[^>]*>/g, "").trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export default function EntityManager({
  entity,
  title,
  description,
  fields,
  defaults = {},
  getThumb,
  getSubtitle,
  importExample,
  bulk = false,
}) {
  const api = base44.entities[entity];
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | id
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await api.list("-created_date", 500));
      setSelected(new Set());
    } catch (err) {
      toast({ title: "Không tải được dữ liệu", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Entities that carry a "Thứ tự" field (products) are listed in the same
  // order the site shows them, so ▲▼ matches what visitors see.
  const orderField = fields.some((f) => f.key === "sort_order");
  const ordered = useMemo(() => (orderField ? sortByCustomOrder(items) : items), [items, orderField]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((i) => `${i.title} ${i.slug} ${i.category || ""}`.toLowerCase().includes(q));
  }, [ordered, query]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const startNew = () => {
    setForm(orderField ? { ...defaults, sort_order: ordered.length + 1 } : { ...defaults });
    setEditing("new");
  };
  const startEdit = (item) => { setForm({ ...item }); setEditing(item.id); };
  const duplicate = (item) => {
    // eslint-disable-next-line no-unused-vars
    const { id, created_date, updated_date, created_by, ...rest } = item;
    setForm({ ...rest, title: `${item.title} (copy)`, slug: `${item.slug}-copy`, status: "draft" });
    setEditing("new");
  };

  const upload = async (key, file, { multiple = false, isPrivate = false } = {}) => {
    setUploading(key);
    try {
      if (isPrivate) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        set(key, file_uri);
      } else {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        setForm((f) => ({ ...f, [key]: multiple ? [...(f[key] || []), file_url] : file_url }));
      }
    } catch (err) {
      toast({ title: "Upload thất bại", description: err?.message || "Không upload được file.", variant: "destructive" });
    } finally {
      setUploading("");
    }
  };

  const validate = (data) => {
    const missing = fields.filter((f) => f.required && f.key !== "slug" && isEmptyValue(data[f.key]));
    if (missing.length) return `Thiếu: ${missing.map((f) => f.label).join(", ")}`;
    if (!data.slug) return "Không tạo được slug từ tiêu đề";
    const clash = items.find((i) => i.slug === data.slug && i.id !== editing);
    if (clash) return `Slug "${data.slug}" đã được dùng bởi "${clash.title}"`;
    return null;
  };

  const save = async (e) => {
    e.preventDefault();
    const data = { ...form, slug: form.slug?.trim() ? slugify(form.slug) : slugify(form.title) };
    // Pasted text can carry non-breaking spaces that stop paragraphs from wrapping.
    fields.forEach((f) => {
      if (f.type === "richtext" && typeof data[f.key] === "string") data[f.key] = data[f.key].replace(/&nbsp;|\u00a0/g, " ");
    });
    if (Array.isArray(data.faq)) data.faq = data.faq.filter((q) => q.question?.trim() && q.answer?.trim());
    const problem = validate(data);
    if (problem) {
      toast({ title: "Chưa lưu được", description: problem, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") await api.create(data);
      else await api.update(editing, data);
      toast({ title: "Đã lưu", description: data.title });
      setEditing(null);
      await load();
    } catch (err) {
      toast({ title: "Lưu thất bại", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Xoá "${item.title}"? Không thể hoàn tác.`)) return;
    try {
      await api.delete(item.id);
      toast({ title: "Đã xoá", description: item.title });
      await load();
    } catch (err) {
      toast({ title: "Xoá thất bại", description: err?.message, variant: "destructive" });
    }
  };

  // ---- Thao tác hàng loạt (chọn nhiều mục rồi đổi trạng thái hoặc xoá) ----
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((i) => i.id)));

  const bulkStatus = async (status) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      await api.updateMany({ id: ids }, { $set: { status } });
      toast({
        title: status === "published" ? "Đã công bố" : "Đã chuyển thành bản nháp",
        description: `${ids.length} mục.`,
      });
      await load();
    } catch (err) {
      toast({ title: "Cập nhật thất bại", description: err?.message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkRemove = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Xoá ${ids.length} mục đã chọn? Không thể hoàn tác.`)) return;
    setBulkBusy(true);
    try {
      await api.deleteMany({ id: ids });
      toast({ title: "Đã xoá", description: `${ids.length} mục.` });
      await load();
    } catch (err) {
      toast({ title: "Xoá thất bại", description: err?.message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const move = async (item, dir) => {
    const idx = ordered.findIndex((i) => i.id === item.id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    next[idx] = ordered[target];
    next[target] = item;
    try {
      // Renumber the whole list so the new order is explicit and keeps its place.
      await api.bulkUpdate(next.map((it, i) => ({ id: it.id, sort_order: i + 1 })));
      await load();
    } catch (err) {
      toast({ title: "Không đổi được thứ tự", description: err?.message, variant: "destructive" });
    }
  };

  // Kéo thả chỉ bật khi danh sách đang hiển thị đủ mọi mục theo đúng thứ tự
  // (khi đang tìm kiếm thì thứ tự trên màn hình không còn là thứ tự thật).
  const canDrag = orderField && !query.trim();

  const onDragEnd = async ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    const next = [...ordered];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setItems(next);
    try {
      // Renumber the whole list so the new order is explicit and keeps its place.
      await api.bulkUpdate(next.map((it, i) => ({ id: it.id, sort_order: i + 1 })));
    } catch (err) {
      toast({ title: "Không đổi được thứ tự", description: err?.message, variant: "destructive" });
    } finally {
      await load();
    }
  };

  const toggle = async (item, key) => {
    try {
      await api.update(item.id, { [key]: !item[key] });
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, [key]: !item[key] } : i)));
    } catch (err) {
      toast({ title: "Không cập nhật được", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowImport(true)} className="border border-border px-4 py-2.5 rounded font-semibold uppercase text-xs tracking-wide hover:border-primary hover:text-primary flex items-center gap-2">
            <FileUp className="w-4 h-4" /> Nhập hàng loạt
          </button>
          <button onClick={startNew} className="bg-primary text-primary-foreground px-5 py-2.5 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 flex items-center gap-2 glow-bronze">
            <Plus className="w-4 h-4" /> Thêm mới
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, slug hoặc danh mục…" className={`${inputCls} pl-9`} />
      </div>

      {bulk && selected.size > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 border border-primary/50 bg-primary/10 rounded px-4 py-3 mb-4">
          <p className="text-sm font-semibold">Đã chọn {selected.size} mục</p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => bulkStatus("published")}
              disabled={bulkBusy}
              className="border border-border px-3.5 py-2 rounded font-semibold uppercase text-xs tracking-wide hover:border-primary hover:text-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" /> Published
            </button>
            <button
              type="button"
              onClick={() => bulkStatus("draft")}
              disabled={bulkBusy}
              className="border border-border px-3.5 py-2 rounded font-semibold uppercase text-xs tracking-wide hover:border-primary hover:text-primary flex items-center gap-2 disabled:opacity-50"
            >
              <EyeOff className="w-4 h-4" /> Draft
            </button>
            <button
              type="button"
              onClick={bulkRemove}
              disabled={bulkBusy}
              className="border border-border px-3.5 py-2 rounded font-semibold uppercase text-xs tracking-wide text-red-400 hover:border-red-500 hover:text-red-400 flex items-center gap-2 disabled:opacity-50"
            >
              {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Xoá
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="px-2 text-xs text-muted-foreground hover:text-foreground">
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded p-12 text-center text-muted-foreground">
          {items.length === 0 ? 'Chưa có mục nào. Bấm "Thêm mới" hoặc "Nhập hàng loạt".' : "Không có kết quả phù hợp."}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="admin-row-list">
            {(drop) => (
              <div ref={drop.innerRef} {...drop.droppableProps} className="space-y-2">
                <div className="flex items-center gap-2">
                  {bulk && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Chọn tất cả mục trong danh sách"
                      className="w-4 h-4 accent-[hsl(var(--primary))]"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} mục{canDrag ? " · kéo thả hoặc dùng ▲▼ để sắp xếp" : orderField ? " · xoá ô tìm kiếm để kéo thả sắp xếp" : ""}
                  </p>
                </div>
                {filtered.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!canDrag}>
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`flex items-center gap-3 border rounded p-3 bg-card/40 ${snapshot.isDragging ? "border-primary ring-1 ring-primary/60 shadow-2xl" : "border-border"}`}
                      >
                        {canDrag && (
                          <span {...drag.dragHandleProps} title="Kéo để sắp xếp" className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary">
                            <GripVertical className="w-4 h-4" />
                          </span>
                        )}
                        {bulk && (
                          <input
                            type="checkbox"
                            checked={selected.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            aria-label={`Chọn ${item.title || "mục"}`}
                            className="w-4 h-4 flex-shrink-0 accent-[hsl(var(--primary))]"
                          />
                        )}
                        <div className="w-14 h-14 flex-shrink-0 overflow-hidden rounded bg-secondary">
                          {getThumb?.(item) && <Image src={getThumb(item)} alt={item.title} className="w-full h-full" fittingType="fill" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-semibold truncate">{item.title || "Chưa có tên"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            <span className={item.status === "draft" ? "text-yellow-500" : "text-green-500"}>
                              {item.status === "draft" ? "Bản nháp" : "Đang hiển thị"}
                            </span>
                            {getSubtitle ? ` · ${getSubtitle(item)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {orderField && (
                            <>
                              <button onClick={() => move(item, -1)} disabled={ordered[0]?.id === item.id} title="Đưa lên trước" className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-25"><ArrowUp className="w-4 h-4" /></button>
                              <button onClick={() => move(item, 1)} disabled={ordered[ordered.length - 1]?.id === item.id} title="Đưa xuống sau" className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-25"><ArrowDown className="w-4 h-4" /></button>
                            </>
                          )}
                          <button onClick={() => toggle(item, "featured")} title="Nổi bật trên trang chủ" className={`p-1.5 ${item.featured ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                            <Star className={`w-4 h-4 ${item.featured ? "fill-primary" : ""}`} />
                          </button>
                          <button onClick={() => duplicate(item)} title="Nhân bản" className="p-1.5 text-muted-foreground hover:text-primary"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => startEdit(item)} title="Sửa" className="p-1.5 text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => remove(item)} title="Xoá" className="p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {drop.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[94vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-2xl font-bold">{editing === "new" ? `Thêm ${title.toLowerCase()}` : `Sửa ${title.toLowerCase()}`}</h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key} className={f.half ? "col-span-2 sm:col-span-1" : "col-span-2"}>
                  <FieldInput field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} onUpload={upload} uploading={uploading} form={form} />
                </div>
              ))}
            </div>

            {/* Thanh lưu dính ở đáy khung: luôn thấy nút Lưu bên phải, không phải cuộn xuống cuối. */}
            <div className="sticky bottom-0 z-10 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 mt-6 px-5 sm:px-6 py-3 bg-card border-t border-border flex items-center justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="border border-border px-5 py-3 rounded font-semibold uppercase text-sm tracking-wide hover:border-primary">Huỷ</button>
              <button type="submit" disabled={saving || !!uploading} className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showImport && (
        <ImportModal
          entity={entity}
          fields={fields}
          defaults={defaults}
          existingSlugs={new Set(items.map((i) => i.slug))}
          example={importExample}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); load(); }}
        />
      )}
    </div>
  );
}

function FieldInput({ field: f, value, onChange, onUpload, uploading, form }) {
  const label = (
    <label className={labelCls}>
      {f.label}{f.required ? " *" : ""}
    </label>
  );
  const hint = f.hint ? <p className="text-xs text-muted-foreground mt-1">{f.hint}</p> : null;

  switch (f.type) {
    case "number":
      return (
        <div>
          {label}
          <input type="number" step="0.01" min="0" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} placeholder={f.placeholder} className={inputCls} />
          {hint}
        </div>
      );
    case "select":
      return (
        <div>
          {label}
          <select value={value ?? f.options[0]} onChange={(e) => onChange(e.target.value)} className={inputCls}>
            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {hint}
        </div>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm cursor-pointer pt-6">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
          {f.label}
        </label>
      );
    case "textarea":
      return (
        <div>
          {label}
          <textarea rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} className={inputCls} />
          {hint}
        </div>
      );
    case "richtext":
      return (
        <div>
          {label}
          <div className="admin-quill">
            <ReactQuill theme="snow" value={value || ""} onChange={onChange} modules={QUILL_MODULES} placeholder={f.placeholder} />
          </div>
          {hint}
        </div>
      );
    case "stringlist":
      return (
        <div>
          {label}
          <textarea
            rows={4}
            value={Array.isArray(value) ? value.join("\n") : ""}
            onChange={(e) => onChange(e.target.value.split("\n"))}
            onBlur={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
            placeholder={f.placeholder || "Mỗi dòng một mục"}
            className={inputCls}
          />
          {hint || <p className="text-xs text-muted-foreground mt-1">Mỗi dòng một mục.</p>}
        </div>
      );
    case "image":
      return (
        <div>
          {label}
          {value && (
            <div className="relative w-32 h-40 overflow-hidden rounded bg-secondary mb-2">
              <Image src={value} alt="" className="w-full h-full" fittingType="fill" />
              <button type="button" onClick={() => onChange("")} className="absolute top-1 right-1 bg-black/70 p-1 rounded text-white hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <label className="flex items-center gap-2 border border-dashed border-border rounded px-4 py-2.5 cursor-pointer hover:border-primary text-sm text-muted-foreground hover:text-primary">
            {uploading === f.key ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên…</> : <><Upload className="w-4 h-4" /> Tải ảnh lên</>}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(f.key, file); e.target.value = ""; }} />
          </label>
          <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="hoặc dán link ảnh" className={`${inputCls} mt-2`} />
          {hint}
        </div>
      );
    case "images": {
      const list = Array.isArray(value) ? value : [];
      return (
        <div>
          {label}
          {list.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {list.map((src, i) => (
                <div key={`${src}-${i}`} className="relative w-20 h-20 overflow-hidden rounded bg-secondary border border-border">
                  <Image src={src} alt="" className="w-full h-full" fittingType="fill" />
                  {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center uppercase text-primary">Ảnh chính</span>}
                  <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-black/70 p-0.5 rounded text-white hover:text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 border border-dashed border-border rounded px-4 py-2.5 cursor-pointer hover:border-primary text-sm text-muted-foreground hover:text-primary">
            {uploading === f.key ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên…</> : <><Upload className="w-4 h-4" /> Tải thêm ảnh</>}
            <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { for (const file of Array.from(e.target.files || [])) await onUpload(f.key, file, { multiple: true }); e.target.value = ""; }} />
          </label>
          <textarea
            rows={2}
            defaultValue=""
            placeholder="hoặc dán link ảnh (mỗi dòng một link) rồi bấm ra ngoài"
            onBlur={(e) => { const urls = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean); if (urls.length) onChange([...list, ...urls]); e.target.value = ""; }}
            className={`${inputCls} mt-2`}
          />
          {hint}
        </div>
      );
    }
    case "faqlist": {
      const list = Array.isArray(value) ? value : [];
      const setItem = (i, patch) => onChange(list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
      return (
        <div>
          {label}
          <div className="space-y-3">
            {list.map((it, i) => (
              <div key={i} className="border border-border rounded p-3 space-y-2 bg-secondary/30">
                <div className="flex gap-2">
                  <input type="text" value={it.question || ""} onChange={(e) => setItem(i, { question: e.target.value })} placeholder="Câu hỏi" className={inputCls} />
                  <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="px-2 text-muted-foreground hover:text-red-400" aria-label="Xoá câu hỏi"><X className="w-4 h-4" /></button>
                </div>
                <textarea rows={3} value={it.answer || ""} onChange={(e) => setItem(i, { answer: e.target.value })} placeholder="Câu trả lời" className={inputCls} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onChange([...list, { question: "", answer: "" }])} className="mt-2 text-sm text-primary hover:underline">+ Thêm câu hỏi</button>
          {hint}
        </div>
      );
    }
    case "ebookpicker":
      return (
        <div>
          {label}
          <EbookPicker value={value} onChange={onChange} selfId={form?.id} />
          {hint}
        </div>
      );
    case "publicfile":
      return (
        <div>
          {label}
          {value && (
            <div className="flex items-start gap-3 mb-2">
              <p className="text-xs text-green-500 break-all flex-1">Đã có file: {String(value).split("/").pop()}</p>
              <button type="button" onClick={() => onChange("")} title="Xoá file đã tải lên" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" /> Xoá file
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 border border-dashed border-border rounded px-4 py-2.5 cursor-pointer hover:border-primary text-sm text-muted-foreground hover:text-primary">
            {uploading === f.key ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên…</> : <><Upload className="w-4 h-4" /> {value ? "Thay file" : "Tải file lên (PDF/EPUB/ZIP)"}</>}
            <input type="file" accept=".pdf,.epub,.zip" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(f.key, file); e.target.value = ""; }} />
          </label>
          <input type="url" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="hoặc dán link tải công khai" className={`${inputCls} mt-2`} />
          {hint}
        </div>
      );
    case "privatefile":
      return (
        <div>
          {label}
          {value && (
            <div className="flex items-start gap-3 mb-2">
              <p className="text-xs text-green-500 flex items-center gap-1 break-all flex-1"><Lock className="w-3 h-3 flex-shrink-0" /> Đã có file riêng tư: {String(value).split("/").pop()}</p>
              <button type="button" onClick={() => onChange("")} title="Xoá file đã tải lên" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" /> Xoá file
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 border border-dashed border-border rounded px-4 py-2.5 cursor-pointer hover:border-primary text-sm text-muted-foreground hover:text-primary">
            {uploading === f.key ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên…</> : <><Upload className="w-4 h-4" /> {value ? "Thay file (PDF/EPUB)" : "Tải file ebook (PDF/EPUB)"}</>}
            <input type="file" accept=".pdf,.epub,.zip" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(f.key, file, { isPrivate: true }); e.target.value = ""; }} />
          </label>
          {hint}
        </div>
      );
    default:
      return (
        <div>
          {label}
          <input
            type={f.type === "url" ? "url" : "text"}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={f.key === "slug" && form.title ? slugify(form.title) : f.placeholder}
            className={inputCls}
          />
          {f.key === "slug" ? <p className="text-xs text-muted-foreground mt-1">Để trống để tự tạo từ tiêu đề. Đường dẫn: /…/{slugify(value || form.title) || "ten-san-pham"}</p> : hint}
        </div>
      );
  }
}

// ---------- Bulk import ----------

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

function normalizeRecord(raw, fields, defaults) {
  const out = { ...defaults };
  for (const f of fields) {
    let v = raw[f.key];
    if (v === undefined || v === "") continue;
    if (f.type === "number") v = Number(v);
    else if (f.type === "boolean") v = v === true || /^(true|1|yes|x)$/i.test(String(v));
    else if (f.type === "images" || f.type === "stringlist" || f.type === "ebookpicker") {
      v = Array.isArray(v) ? v : String(v).split(/\s*(?:\||\n)\s*/).filter(Boolean);
    } else if (f.type === "richtext" && typeof v === "string" && !/<[a-z][\s\S]*>/i.test(v)) {
      v = v.split(/\n{2,}/).map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`).join("");
    }
    out[f.key] = v;
  }
  out.slug = out.slug ? slugify(out.slug) : slugify(out.title);
  return out;
}

function ImportModal({ entity, fields, defaults, existingSlugs, example, onClose, onDone }) {
  const api = base44.entities[entity];
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const parse = () => {
    const src = text.trim();
    if (!src) return { records: [], errors: [] };
    let rawList;
    try {
      rawList = src.startsWith("[") || src.startsWith("{") ? JSON.parse(src) : parseCSV(src);
      if (!Array.isArray(rawList)) rawList = [rawList];
    } catch (err) {
      return { records: [], errors: [`Không đọc được dữ liệu: ${err.message}`] };
    }
    const errors = [];
    const seen = new Set(existingSlugs);
    const records = [];
    rawList.forEach((raw, idx) => {
      const rec = normalizeRecord(raw, fields, defaults);
      const missing = fields.filter((f) => f.required && f.key !== "slug" && isEmptyValue(rec[f.key]));
      if (missing.length) errors.push(`Dòng ${idx + 1} (${rec.title || "không tên"}): thiếu ${missing.map((f) => f.key).join(", ")}`);
      else if (seen.has(rec.slug)) errors.push(`Dòng ${idx + 1} (${rec.title}): slug "${rec.slug}" bị trùng`);
      else { seen.add(rec.slug); records.push(rec); }
    });
    return { records, errors };
  };

  const { records, errors } = parse();

  const onFile = async (file) => {
    if (file) setText(await file.text());
  };

  const run = async () => {
    setBusy(true);
    try {
      await api.bulkCreate(records);
      toast({ title: "Đã nhập xong", description: `${records.length} mục mới.` });
      onDone();
    } catch (err) {
      toast({ title: "Nhập thất bại", description: err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-2xl font-bold">Nhập hàng loạt</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Dán JSON (danh sách) hoặc CSV có dòng đầu là tên cột, hoặc chọn file. Nhiều ảnh trong một ô ngăn cách bằng dấu <code>|</code>. Slug để trống sẽ tự tạo. Trường bắt buộc (ví dụ ảnh bìa) phải có giá trị, ảnh dán dưới dạng link.
        </p>
        <p className="text-xs text-muted-foreground mb-3">Các cột: <span className="font-mono">{fields.map((f) => f.key).join(", ")}</span></p>
        <label className="inline-flex items-center gap-2 border border-dashed border-border rounded px-3 py-2 cursor-pointer hover:border-primary text-sm text-muted-foreground hover:text-primary mb-3">
          <FileUp className="w-4 h-4" /> Chọn file .json / .csv
          <input type="file" accept=".json,.csv,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {example && <button type="button" onClick={() => setText(example)} className="ml-3 text-xs text-primary hover:underline">Điền ví dụ</button>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder='[{"title": "…", "price": 24.99, …}]' className={`${inputCls} font-mono text-xs`} />

        {text.trim() && (
          <div className="mt-3 text-sm">
            <p className="text-green-500">{records.length} mục hợp lệ sẽ được tạo{records.some((r) => r.status === "draft") ? " (bản nháp sẽ chưa hiển thị trên web)" : ""}.</p>
            {errors.length > 0 && (
              <ul className="mt-2 text-red-400 text-xs space-y-1 max-h-32 overflow-y-auto">
                {errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={run} disabled={busy || records.length === 0} className="flex-1 bg-primary text-primary-foreground px-5 py-3 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Nhập {records.length || ""} mục
          </button>
          <button onClick={onClose} className="border border-border px-5 py-3 rounded font-semibold uppercase text-sm tracking-wide hover:border-primary">Đóng</button>
        </div>
      </div>
    </div>
  );
}