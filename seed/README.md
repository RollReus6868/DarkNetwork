# Dữ liệu mẫu

Các file này chỉ là **mẫu** để bạn thử tính năng "Nhập hàng loạt" trong trang Admin. Toàn bộ đều ở trạng thái `draft`
(chưa hiện trên web), ảnh là ảnh giữ chỗ và link Spring / Lemon Squeezy là giá trị giả cần thay bằng link thật.

Cách dùng: đăng nhập tài khoản admin → `/admin` → tab **Sản phẩm** hoặc **Ebook** → **Nhập hàng loạt** →
chọn file `products.sample.json` / `ebooks.sample.json` → **Nhập**.

Quy ước khi tự soạn file (JSON hoặc CSV):

- Nhiều ảnh trong CSV ngăn cách bằng dấu `|`.
- `slug` để trống sẽ tự tạo từ `title`.
- `category` của sản phẩm phải là một trong: Apparel, Wall Art, Mugs, Gifts, Books.
- Đổi `status` thành `published` khi đã sẵn sàng bán.
