// Định danh phiên trình duyệt cho khách chưa đăng nhập — chỉ là chuỗi ngẫu nhiên,
// không chứa thông tin cá nhân.
const STORAGE_KEY = "dn_chat_guest_key";

export function getChatGuestKey() {
  try {
    let key = localStorage.getItem(STORAGE_KEY);
    if (!key) {
      const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${Math.random().toString(36).slice(2)}`;
      key = random.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
      localStorage.setItem(STORAGE_KEY, key);
    }
    return key;
  } catch {
    return "guest-session-fallback";
  }
}