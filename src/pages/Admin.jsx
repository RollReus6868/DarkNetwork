import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import Seo from "@/components/site/Seo";
import HeroSlidesManager from "@/components/admin/HeroSlidesManager";
import ChatInbox from "@/components/admin/ChatInbox";
import EntityManager from "@/components/admin/EntityManager";
import {
  PRODUCT_FIELDS, PRODUCT_DEFAULTS, PRODUCT_IMPORT_EXAMPLE,
  EBOOK_FIELDS, EBOOK_DEFAULTS, EBOOK_IMPORT_EXAMPLE,
  RESOURCE_FIELDS, RESOURCE_DEFAULTS, RESOURCE_IMPORT_EXAMPLE,
} from "@/components/admin/adminConfig";

const TABS = [
  { id: "products", label: "Sản phẩm (Shop)" },
  { id: "ebooks", label: "Ebook" },
  { id: "resources", label: "Tài liệu miễn phí" },
  { id: "hero", label: "Hero Slides" },
  { id: "messages", label: "Tin nhắn" },
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem("admin_tab") || "products"; } catch { return "products"; }
  });

  const pick = (id) => {
    setTab(id);
    try { sessionStorage.setItem("admin_tab", id); } catch { /* ignore */ }
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
      <Seo title="Admin — Dark Network" />
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary mb-2">Quản lý nội dung</p>
      <h1 className="font-heading text-4xl font-bold mb-6">Admin</h1>

      <div className="flex gap-2 mb-8 border-b border-border overflow-x-auto scrollbar-hide" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => pick(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold uppercase tracking-wide whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <EntityManager
          key="products"
          entity="Product"
          title="Sản phẩm"
          description="Hàng in theo yêu cầu (áo, tranh, cốc, quà tặng) bán qua Spring. Sản phẩm ở trạng thái 'draft' sẽ chưa hiện trên web."
          fields={PRODUCT_FIELDS}
          defaults={PRODUCT_DEFAULTS}
          getThumb={(p) => p.images?.[0]}
          getSubtitle={(p) => `${p.category} · $${Number(p.price || 0).toFixed(2)}`}
          importExample={PRODUCT_IMPORT_EXAMPLE}
        />
      )}
      {tab === "ebooks" && (
        <EntityManager
          key="ebooks"
          entity="Ebook"
          title="Ebook"
          description="Sách điện tử thanh toán qua Lemon Squeezy. Cần Variant ID và file ebook để khách mua và tải được."
          fields={EBOOK_FIELDS}
          defaults={EBOOK_DEFAULTS}
          getThumb={(e) => e.cover_image}
          getSubtitle={(e) => `$${Number(e.price || 0).toFixed(2)}${e.lemon_squeezy_variant_id ? "" : " · thiếu Variant ID"}`}
          importExample={EBOOK_IMPORT_EXAMPLE}
        />
      )}
      {tab === "resources" && (
        <EntityManager
          key="resources"
          entity="FreeResource"
          title="Tài liệu miễn phí"
          description="Study guide, kế hoạch đọc, tài liệu in… khách tải miễn phí ở trang Free Resources."
          fields={RESOURCE_FIELDS}
          defaults={RESOURCE_DEFAULTS}
          getThumb={(r) => r.cover_image}
          getSubtitle={(r) => `${r.resource_type}${r.download_url ? "" : " · thiếu file tải"}`}
          importExample={RESOURCE_IMPORT_EXAMPLE}
        />
      )}
      {tab === "hero" && <HeroSlidesManager />}
      {tab === "messages" && <ChatInbox />}
    </div>
  );
}