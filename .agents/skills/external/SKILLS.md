# HƯỚNG DẪN SỬ DỤNG CÁC NHÓM SKILL TRONG STUDYCONNECT

Tài liệu này hướng dẫn chi tiết cách sử dụng và kích hoạt các nhóm skill (từ Nhóm 1 đến Nhóm 6) trong quá trình phát triển dự án **StudyConnect** để mang lại hiệu quả cao nhất.

---

## 1. Luồng sử dụng tổng quan
Khi bạn chuẩn bị giao việc cho Antigravity (AI), hãy làm theo 2 bước:
1. **Giữ lại nhóm skill cần thiết** trong phần khai báo đầu của prompt chuẩn (xóa các nhóm không dùng đến để tiết kiệm dung lượng/context).
2. **Kêu gọi trực tiếp tên skill** hoặc nhóm skill trong phần `TASK CỤ THỂ` để AI biết cần áp dụng bộ quy chuẩn nào.

---

## 2. Hướng dẫn chi tiết cách xài từng nhóm

### 🛠️ Nhóm 1: Workflow & AI (`get-shit-done`, `gsd-core`, `OmniRoute`)
*   **Dùng khi nào:** Khi bạn cần triển khai một tính năng lớn, phức tạp hoặc cần chạy quy trình code tự động, chia nhỏ kế hoạch thành các giai đoạn (phases) rõ ràng.
*   **Cách xài:** Viết vào task: *"Sử dụng quy trình get-shit-done để lên kế hoạch và thực hiện tính năng X"*. AI sẽ tự động phân tách task, chạy các bước phân tích, thực thi và kiểm thử độc lập.

### 🎨 Nhóm 2: UI/UX Premium (`taste-skill`, `stitch-skills`, `ponytail`)
*   **Dùng khi nào:** Khi cần thiết kế giao diện mới hoặc cải tạo (redesign) lại trang web để giao diện trông chuyên nghiệp, có chiều sâu, tránh sinh ra code CSS tạm bợ hoặc giao diện "generic AI".
*   **Cách xài:** Viết vào task: *"Thiết kế lại trang X bằng taste-skill và stitch-skills"*. AI sẽ áp dụng các bộ biến màu (color tokens) chuẩn, căn lề bento, thêm micro-animation và tạo file `DESIGN.md` để quản lý.

### 🌐 Nhóm 3: Tính năng mới & API (`next-ai-draw-io`, `public-apis`, `awesome-selfhosted-Chinese`)
*   **Dùng khi nào:** Khi dự án cần tích hợp bảng vẽ (whiteboard), gọi các API công cộng từ bên ngoài hoặc sử dụng các thư viện self-hosted sẵn có.
*   **Cách xài:** Viết vào task: *"Dùng public-apis kết hợp API thời tiết vào module X"* hoặc *"Tích hợp whiteboard vẽ sơ đồ bằng next-ai-draw-io"*.

### 📊 Nhóm 4: Refactor & Tài liệu (`codegraph`, `spec-kit`, `prompt-master`)
*   **Dùng khi nào:** Khi mã nguồn trở nên quá rối, cần vẽ sơ đồ kiến trúc lớp/dependency để hình dung hệ thống, viết tài liệu đặc tả (SPEC) trước khi code hoặc lưu trữ các prompt hay dùng.
*   **Cách xài:** Viết vào task: *"Sử dụng codegraph để visualize luồng hoạt động của Auth"* hoặc *"Dùng spec-kit để viết tài liệu đặc tả trước khi bắt đầu"*

### 🔒 Nhóm 5: Bảo mật & Hiệu năng (`bleachbit`, `heretic`, `strix`, `Mudlet`)
*   **Dùng khi nào:** Khi cần quét lỗi bảo mật (security audit), tối ưu hóa đường truyền mạng/socket, loại bỏ các đoạn code theo dõi (tracking) ẩn hoặc tối ưu hiệu năng bộ nhớ.
*   **Cách xài:** Viết vào task: *"Dùng strix quét lỗ hổng bảo mật cho trang Đăng ký"* hoặc *"Sử dụng Mudlet để tối ưu hóa kết nối websocket realtime"*.

### ✨ Nhóm 6: Premium UI & Skills mở rộng (`lenis`, `react-bits`, `miro-fish`, `dev-skills`, `marketing-skills`)
*   **Dùng khi nào:** Nhóm các thư viện đã được tải trực tiếp về thư mục `.agents/skills/external/` của dự án để tạo hiệu ứng chuyển động và cấu trúc nâng cao.
    *   **lenis:** Tích hợp cuộn mượt cho toàn trang.
    *   **react-bits:** Lấy các component hoạt ảnh đẹp mắt (như text chạy, nền sao bay, nút lấp lánh).
    *   **marketing-skills:** Tối ưu hóa SEO, cấu trúc Schema, hoặc thiết kế luồng A/B Testing để kéo người dùng.
*   **Cách xài:** Viết vào task: *"Tích hợp thư viện lenis vào trang chủ để tạo hiệu ứng cuộn mượt"* hoặc *"Dùng component từ thư mục react-bits để làm hiệu ứng loading sáng tạo"*.
