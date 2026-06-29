# STUDYCONECT — PROMPT CHUẨN v12.0

## 1. THÔNG TIN CÔNG NGHỆ (STACK & PRODUCTION)
- **Frontend Stack:** React + Supabase (JS Client v2) + React Router v6 + Vite.
- **Mobile Stack:** Capacitor (Android / iOS) - Thư mục build di động: `frontend/android/`.
- **Production URL:** [studyconect.vercel.app](https://studyconect.vercel.app)
- **Giới hạn Tài nguyên:** 
  - Tài khoản Supabase Free Tier (Giới hạn Egress 5GB/tháng).
  - Tối ưu truy vấn, không tạo request thừa.
  - Phải dọn dẹp các sub/channel Realtime khi component unmount.

---

## 2. QUY TẮC BẢO TOÀN (KHÔNG ĐỔI)
Tuyệt đối giữ nguyên các phần sau trừ khi có yêu cầu thay đổi rõ ràng từ task:
- **Tên cấu trúc:** Tên route, component, props, hooks, và các file cấu hình.
- **Database:** Tên bảng (tables), tên cột (columns) và kiểu dữ liệu trên Supabase.
- **Logic lõi:** Cơ chế Authentication (Auth), Chat system, Cuộc gọi/Phòng học (Meetroom/PrivateCall), Realtime Sync, và hệ thống Thông báo (Notification).
- **File hệ thống:** `AppLayoutRoute.jsx`, `vercel.json`, `capacitor.config.json`, `storageCleanup.js`, `utils/imageCompress.js`.
- **Session Keys:** `sc_session` (cho sinh viên) và `sc_admin_session` (cho admin).

---

## 3. QUY TẮC TỐI ƯU HÓA & TRÁNH LÃNG PHÍ EGRESS (CRITICAL)
- **Tên Realtime Channel TĨNH:** Sử dụng tên channel cố định dạng chuỗi tĩnh (ví dụ: `layout-unread-${userId}`), tuyệt đối **KHÔNG** dùng `Date.now()` hoặc chuỗi sinh ngẫu nhiên để tránh rò rỉ kết nối/egress.
- **Interval Polling:** Sử dụng fallback polling với chu kỳ dài (ví dụ: 30 phút hoặc 1800000ms) khi tab đang hoạt động (`document.visibilityState === 'visible'`). Không giảm thời gian polling xuống nếu không cần thiết.
- **Console Log:** Bọc mọi hàm log kiểm thử mới trong điều kiện kiểm tra môi trường:
  ```javascript
  if (import.meta.env.DEV) {
    console.log('Thông tin debug...', data);
  }
  ```
- **Dependencies:** Không cài thêm thư viện (npm packages) mới trừ khi nó đã được khai báo sẵn trong `package.json`.

---

## 4. QUY TRÌNH PHÁT TRIỂN & KIỂM THỬ (LOCAL & BUILD)
1. **Sửa đúng phạm vi:** Chỉ sửa những phần code được yêu cầu trong task, không refactor lan man sang các phần không liên quan.
2. **Kiểm tra biên dịch:** Trước khi commit, bắt buộc chạy kiểm thử build cục bộ trong thư mục `frontend` để phát hiện sớm các lỗi cú pháp hoặc cảnh báo lint:
   ```bash
   cd frontend
   npm run build
   ```

---

## 5. QUY TRÌNH DEPLOY & ĐỒNG BỘ (DEPLOY & SYNC)
Sau khi build thành công không lỗi, thực hiện đẩy code lên để triển khai tự động lên Vercel:
1. **Git Commit & Push:**
   ```bash
   git add <đường-dẫn-file-sửa-đổi>
   git commit -m "<type>: <mô tả ngắn gọn về thay đổi>"
   git push origin main
   ```
2. **Xác nhận Deploy:** Đảm bảo hệ thống Vercel tự động build thành công từ commit mới.
3. **Đóng gói mã nguồn:** Chạy script PowerShell `export_code.ps1` ở thư mục gốc của dự án để tự động gộp và đồng bộ hóa toàn bộ mã nguồn frontend/backend mới vào `frontend.txt` và `backend.txt`.

---

## 6. ĐỊNH DẠNG BÁO CÁO KẾT THÚC (FINAL REPORT)
Báo cáo sau khi hoàn thành task phải ngắn gọn, trung thực và gồm đầy đủ 2 phần chính:

### PHẦN A — Xác minh nhiệm vụ (Đặc thù theo Task):
- Kết quả chạy kiểm thử cụ thể (giao diện, màu sắc, chức năng sau sửa đổi).
- So sánh dữ liệu trước và sau (dán nguyên văn output của lệnh `grep` hoặc log kiểm tra thực tế nếu cần thiết).
- Xác nhận các khu vực lân cận không bị ảnh hưởng.

### PHẦN B — Format tổng hợp chuẩn:
✅ **Đã sửa:** [Mô tả chi tiết việc đã làm]  
📁 **File ảnh hưởng:** [Danh sách file đã chỉnh sửa]  
🔗 **Commit Hash:** [Mã hash của commit vừa push]  
🚀 **Link Production:** [URL Deploy thật của web hoặc Vercel link]  
📄 **File gộp:** Đã chạy `export_code.ps1` cập nhật thành công `frontend.txt`/`backend.txt`.
