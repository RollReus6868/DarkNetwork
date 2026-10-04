// embla chỉ lặp mượt khi có đủ slide lấp đầy khung nhìn: hàng có ít mục sẽ khựng
// và dừng lại ở mục cuối. Nhân bản danh sách cho tới khi đủ số slide tối thiểu.
export function loopSlides(items, min = 12) {
  const list = (items || []).filter(Boolean);
  if (list.length === 0) return [];
  const copies = Math.max(1, Math.ceil(min / list.length));
  const out = [];
  for (let c = 0; c < copies; c += 1) {
    list.forEach((item, i) => out.push({ item, key: `${c}-${i}` }));
  }
  return out;
}