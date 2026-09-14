import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";
import { Plus, Pencil, Trash2, X, Loader2, Upload, ChevronUp, ChevronDown, Save } from "lucide-react";
import Seo from "@/components/site/Seo";

const EMPTY = {
  image: "", eyebrow: "", title: "", description: "",
  cta1_label: "", cta1_url: "", cta2_label: "", cta2_url: "",
  sort_order: 0, status: "published",
};

export default function Admin() {
  const { user } = useAuth();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.HeroSlide.list("sort_order", 50);
      setSlides(all);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startNew = () => { setForm({ ...EMPTY, sort_order: slides.length }); setEditing("new"); };
  const startEdit = (slide) => { setForm({ ...slide }); setEditing(slide.id); };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setForm((f) => ({ ...f, image: file_url }));
    } catch {} finally { setUploading(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === "new") {
        await base44.entities.HeroSlide.create(form);
      } else {
        await base44.entities.HeroSlide.update(editing, form);
      }
      setEditing(null);
      await load();
    } catch {} finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this hero slide?")) return;
    try { await base44.entities.HeroSlide.delete(id); await load(); } catch {}
  };

  const move = async (slide, dir) => {
    const idx = slides.findIndex((s) => s.id === slide.id);
    const swap = slides[idx + dir];
    if (!swap) return;
    try {
      await base44.entities.HeroSlide.bulkUpdate([
        { id: slide.id, sort_order: swap.sort_order },
        { id: swap.id, sort_order: slide.sort_order },
      ]);
      await load();
    } catch {}
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="pt-32 max-w-md mx-auto text-center px-4">
        <Seo title="Admin — Dark Network" />
        <h1 className="font-heading text-3xl font-bold mb-4">Admin Access Required</h1>
        <p className="text-muted-foreground">You need an admin account to access this page.</p>
      </div>
    );
  }

  return (
    <div className="pt-24 lg:pt-28 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <Seo title="Admin — Hero Slides — Dark Network" />
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary mb-2">Content Management</p>
          <h1 className="font-heading text-4xl font-bold">Hero Slides</h1>
        </div>
        <button onClick={startNew} className="bg-primary text-primary-foreground px-5 py-2.5 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 flex items-center gap-2 glow-bronze">
          <Plus className="w-4 h-4" /> New Slide
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : slides.length === 0 ? (
        <div className="border border-dashed border-border rounded p-12 text-center text-muted-foreground">
          No hero slides yet. Click "New Slide" to create your first one.
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, i) => (
            <div key={slide.id} className="flex items-center gap-4 border border-border rounded p-3 bg-card/40">
              <div className="w-20 h-12 flex-shrink-0 overflow-hidden rounded bg-secondary">
                {slide.image && <Image src={slide.image} alt={slide.title} className="w-full h-full" fittingType="fill" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold truncate">{slide.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground">
                  {slide.status === "draft" ? "Draft" : "Published"} · Order {slide.sort_order}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(slide, -1)} disabled={i === 0} className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => move(slide, 1)} disabled={i === slides.length - 1} className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                <button onClick={() => startEdit(slide)} className="p-1.5 text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(slide.id)} className="p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold">{editing === "new" ? "New Hero Slide" : "Edit Hero Slide"}</h2>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">Background Image</label>
                {form.image ? (
                  <div className="relative w-full h-40 overflow-hidden rounded bg-secondary mb-2">
                    <Image src={form.image} alt="Preview" className="w-full h-full" fittingType="fill" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, image: "" }))} className="absolute top-2 right-2 bg-black/70 p-1.5 rounded text-white hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : null}
                <label className="flex items-center gap-2 border border-dashed border-border rounded px-4 py-3 cursor-pointer hover:border-primary text-sm text-muted-foreground hover:text-primary">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload Image</>}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                </label>
                <input type="text" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="or paste image URL" className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm mt-2" />
              </div>

              <Field label="Eyebrow" value={form.eyebrow} onChange={(v) => setForm((f) => ({ ...f, eyebrow: v }))} placeholder="Cinematic Bible Discovery" />
              <Field label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Discover the Bible Like Never Before" required />
              <Field label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Explore powerful biblical stories…" textarea />

              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary Button Label" value={form.cta1_label} onChange={(v) => setForm((f) => ({ ...f, cta1_label: v }))} placeholder="Explore Bible Studies" />
                <Field label="Primary Button URL" value={form.cta1_url} onChange={(v) => setForm((f) => ({ ...f, cta1_url: v }))} placeholder="/bible-studies" />
                <Field label="Secondary Button Label" value={form.cta2_label} onChange={(v) => setForm((f) => ({ ...f, cta2_label: v }))} placeholder="Shop Books" />
                <Field label="Secondary Button URL" value={form.cta2_url} onChange={(v) => setForm((f) => ({ ...f, cta2_url: v }))} placeholder="/books" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={saving || uploading} className="flex-1 bg-primary text-primary-foreground px-5 py-3 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : "Save Slide"}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="border border-border px-5 py-3 rounded font-semibold uppercase text-sm tracking-wide hover:border-primary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea, required }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">{label}{required ? " *" : ""}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
      )}
    </div>
  );
}