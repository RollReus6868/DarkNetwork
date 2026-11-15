// Field definitions for the admin content managers.
// Keys match the entity schemas in /base44/entities.

const status = { key: "status", label: "Trạng thái", type: "select", options: ["published", "draft"], half: true };

export const PRODUCT_FIELDS = [
  { key: "title", label: "Tên sản phẩm", type: "text", required: true },
  { key: "slug", label: "Đường dẫn (slug)", type: "text", half: true },
  { key: "category", label: "Danh mục", type: "select", options: ["Apparel", "Wall Art", "Mugs", "Gifts", "Books"], half: true },
  { key: "price", label: "Giá (USD)", type: "number", required: true, half: true, hint: "Sản phẩm Printify: giá của size rẻ nhất; size lớn tự cộng thêm phần chênh lệch giá gốc." },
  { key: "original_price", label: "Giá gốc (USD)", type: "number", half: true, hint: "Chỉ điền khi đang giảm giá — web sẽ tự hiện nhãn SALE." },
  { key: "default_color", label: "Màu hiển thị mặc định", type: "podcolor", hint: "Màu áo khách thấy đầu tiên ở trang chủ, trang Shop và khi mở sản phẩm. Để “Tự động” thì dùng màu Đen (nếu sản phẩm có màu đen)." },
  { key: "variant_images", label: "Ảnh theo màu áo", type: "podimages", hint: "Bấm một màu để sửa ảnh của màu đó: “Đặt ảnh chính”, xoá (×) hoặc thêm ảnh. Ảnh chính của màu hiển thị mặc định là ảnh trên thẻ sản phẩm ở trang chủ và trang Shop. Ảnh Printify đã xoá không quay lại khi đồng bộ; bấm “Khôi phục” nếu cần." },
  { key: "images", label: "Ảnh sản phẩm", type: "images", required: true, hint: "Ảnh đầu tiên là ảnh chính; bấm “Ảnh chính” trên ảnh khác để đổi. Áo Printify nhiều màu: web dùng “Ảnh theo màu áo” ở trên. Ảnh bạn tự tải lên ở đây sẽ thay ảnh màu trên thẻ sản phẩm, trừ khi bạn chọn “Màu hiển thị mặc định”." },
  { key: "description", label: "Mô tả", type: "richtext", required: true },
  { key: "spring_url", label: "Link mua trên Spring (cũ)", type: "url", hint: "Chỉ cho sản phẩm bán qua Spring. Sản phẩm Printify để trống: khách chọn size/màu và thanh toán ngay trên web." },
  { key: "bible_inspiration", label: "Cảm hứng từ Kinh Thánh", type: "richtext" },
  { key: "story_behind_design", label: "Câu chuyện thiết kế", type: "richtext" },
  { key: "product_info", label: "Thông tin sản phẩm", type: "richtext" },
  { key: "size_info", label: "Thông tin kích cỡ", type: "richtext" },
  { key: "shipping_info", label: "Thông tin vận chuyển", type: "richtext" },
  { key: "seo_title", label: "Tiêu đề SEO", type: "text" },
  { key: "meta_description", label: "Mô tả SEO (≤160 ký tự)", type: "textarea" },
  { key: "sort_order", label: "Thứ tự hiển thị", type: "number", half: true, hint: "Số nhỏ hiển thị trước, áp dụng cho cả trang chủ và trang Shop. Kéo thả hoặc bấm ▲▼ trong danh sách để sắp xếp nhanh. Để trống hoặc 0: hiện đầu tiên (mục mới thêm tự lên đầu), mới nhất trước, rồi mới tới các mục đã đánh số." },
  status,
  { key: "featured", label: "Hiển thị nổi bật ở trang chủ", type: "boolean", half: true },
];

export const PRODUCT_DEFAULTS = { category: "Apparel", price: 0, images: [], status: "draft", featured: false, sort_order: 0 };

export const EBOOK_FIELDS = [
  { key: "title", label: "Tên ebook", type: "text", required: true },
  { key: "slug", label: "Đường dẫn (slug)", type: "text", half: true },
  { key: "subtitle", label: "Phụ đề", type: "text", half: true },
  { key: "price", label: "Giá (USD)", type: "number", required: true, half: true },
  { key: "original_price", label: "Giá gốc (USD)", type: "number", half: true, hint: "Chỉ điền khi đang giảm giá." },
  { key: "cover_image", label: "Ảnh bìa", type: "image", required: true },
  { key: "description", label: "Mô tả", type: "richtext", required: true },
  { key: "what_you_learn", label: "Bạn sẽ học được gì", type: "stringlist" },
  { key: "who_for", label: "Sách dành cho ai", type: "richtext" },
  { key: "preview_images", label: "Ảnh xem thử các trang", type: "images" },
  { key: "faq", label: "Câu hỏi thường gặp (FAQ)", type: "faqlist" },
  { key: "secure_file_uri", label: "File ebook (riêng tư)", type: "privatefile", hint: "Chỉ người đã mua mới tải được, qua link tạm thời." },
  { key: "bonus_title", label: "Tên quà tặng kèm", type: "text", half: true, hint: "Ebook mini tặng kèm khi mua. Để trống nếu không có quà." },
  { key: "bonus_cover_image", label: "Ảnh bìa quà tặng kèm", type: "image", half: true },
  { key: "bonus_description", label: "Mô tả quà tặng kèm", type: "textarea" },
  { key: "bonus_secure_file_uri", label: "File ebook tặng kèm (riêng tư)", type: "privatefile", hint: "Chỉ người đã mua mới tải được. Hiện cùng nút tải trong mục My Account." },
  { key: "lemon_squeezy_variant_id", label: "Lemon Squeezy Variant ID (cũ)", type: "text", hint: "Chỉ dùng cho Lemon Squeezy cũ (đóng từ 28/11/2026). Thanh toán PayPal không cần trường này: tên và giá lấy theo ebook." },
  { key: "related_ebook_ids", label: "Sách liên quan", type: "ebookpicker", hint: "Gợi ý ở cuối trang ebook này. Thứ tự chọn là thứ tự ưu tiên. Để trống thì hệ thống tự gợi ý các quyển cùng bộ (cùng tên, khác Part)." },
  { key: "edition_type", label: "Loại sách", type: "select", options: ["auto", "full", "topic", "part"], labels: { auto: "Tự động (theo tên sách)", full: "Bản đầy đủ (Full Versions)", topic: "Theo chủ đề (In-Depth Topics)", part: "Sách ngắn theo part (Part Series)" }, half: true, hint: "Xếp sách vào nhóm nào ở trang chủ và trang Books. Tự động: tên có \"Part N\" là sách part; tên có \"Full Version\" (hoặc trùng tên một bộ part) là bản đầy đủ; còn lại là sách theo chủ đề." },
  { key: "seo_title", label: "Tiêu đề SEO", type: "text" },
  { key: "meta_description", label: "Mô tả SEO (≤160 ký tự)", type: "textarea" },
  { key: "sort_order", label: "Thứ tự hiển thị", type: "number", half: true, hint: "Số nhỏ hiển thị trước, áp dụng cho trang Books và mục Ebook ở trang chủ. Kéo thả hoặc bấm ▲▼ trong danh sách để sắp xếp nhanh. Để trống hoặc 0: hiện đầu tiên (mục mới thêm tự lên đầu), mới nhất trước, rồi mới tới các mục đã đánh số." },
  status,
  { key: "featured", label: "Hiển thị nổi bật ở trang chủ", type: "boolean", half: true },
];

export const EBOOK_DEFAULTS = { price: 0, status: "draft", featured: false, sort_order: 0, edition_type: "auto", what_you_learn: [], preview_images: [], faq: [], related_ebook_ids: [] };

export const PRODUCT_IMPORT_EXAMPLE = JSON.stringify([
  {
    title: "Ví dụ: Armor of God Hoodie",
    category: "Apparel",
    price: 49.99,
    original_price: 59.99,
    images: ["https://example.com/anh-1.jpg", "https://example.com/anh-2.jpg"],
    description: "Mô tả sản phẩm.",
    spring_url: "https://your-store.creator-spring.com/listing/ten-san-pham",
    status: "draft",
  },
], null, 2);

export const EBOOK_IMPORT_EXAMPLE = JSON.stringify([
  {
    title: "Ví dụ: Walking with the Prophets",
    subtitle: "A 30-day journey",
    price: 12.99,
    cover_image: "https://example.com/bia.jpg",
    description: "Mô tả ebook.",
    what_you_learn: ["Ý 1", "Ý 2", "Ý 3"],
    lemon_squeezy_variant_id: "123456",
    edition_type: "auto",
    status: "draft",
  },
], null, 2);

export const RESOURCE_FIELDS = [
  { key: "title", label: "Tên tài liệu", type: "text", required: true },
  { key: "slug", label: "Đường dẫn (slug)", type: "text", half: true },
  { key: "resource_type", label: "Loại", type: "select", options: ["Study Guide", "Bible Study PDF", "Reading Plan", "Bible Timeline", "Character Guide", "Printable"], half: true },
  { key: "description", label: "Mô tả ngắn", type: "textarea", required: true },
  { key: "cover_image", label: "Ảnh bìa", type: "image", required: true },
  { key: "download_url", label: "File tải về (công khai)", type: "publicfile", hint: "Ai cũng tải được nếu biết link. Chỉ dùng cho tài liệu miễn phí." },
  { key: "requires_email", label: "Yêu cầu nhập email trước khi tải", type: "boolean", half: true },
  { key: "seo_title", label: "Tiêu đề SEO", type: "text" },
  { key: "meta_description", label: "Mô tả SEO (≤160 ký tự)", type: "textarea" },
  { key: "sort_order", label: "Thứ tự hiển thị", type: "number", half: true, hint: "Số nhỏ hiển thị trước ở trang Tài liệu miễn phí. Kéo thả hoặc bấm ▲▼ trong danh sách để sắp xếp nhanh. Để trống hoặc 0: hiện đầu tiên (mục mới thêm tự lên đầu), mới nhất trước, rồi mới tới các mục đã đánh số." },
  status,
];

export const RESOURCE_DEFAULTS = { resource_type: "Study Guide", requires_email: false, status: "draft", sort_order: 0 };

export const RESOURCE_IMPORT_EXAMPLE = JSON.stringify([
  {
    title: "Ví dụ: 30-Day Psalms Reading Plan",
    resource_type: "Reading Plan",
    description: "Mô tả tài liệu.",
    download_url: "https://example.com/file.pdf",
    requires_email: false,
    status: "draft",
  },
], null, 2);