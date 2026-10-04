import { editionTypeOf, parseTitle } from "@/lib/ebookSeries";

// Nhãn đỏ chữ trắng trên ảnh bìa, ghi đúng số part của quyển sách thuộc bộ.
// Sách bản đầy đủ (hoặc không có số part) không hiển thị nhãn.
export default function EbookPartBadge({ ebook, className = "" }) {
  if (editionTypeOf(ebook) !== "part") return null;
  const part = parseTitle(ebook?.title).part;
  if (part === null) return null;

  return (
    <span
      className={`bg-[#e02424] text-white text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-sm shadow-md ${className}`}
    >
      Part {part}
    </span>
  );
}