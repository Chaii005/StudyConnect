# STUDYCONECT — PROMPT CHUẨN v13.0
# Xóa phần nhóm không dùng, điền task vào cuối rồi gửi cho Antigravity
# ================================================================


## SKILL / REPO ÁP DỤNG
# (Giữ nhóm nào cần, xóa nhóm không dùng)

### Nhóm 1: AI Agent & Workflow
Repos: get-shit-done, gsd-core, OmniRoute
Hướng dẫn: Sử dụng GSD workflow (gsd plan / gsd execute / gsd verify) để quản lý task. Dùng OmniRoute nếu task liên quan tích hợp AI model.

### Nhóm 2: UI Design & Frontend Skills
Repos: taste-skill, stitch-skills, ponytail
Hướng dẫn: Áp dụng taste-skill để tránh UI generic. Dùng stitch-skills để tạo DESIGN.md chuẩn trước khi code component. Tham khảo ponytail cho CSS utility patterns.

### Nhóm 3: Tính năng mới cho StudyConnect
Repos: next-ai-draw-io, public-apis, awesome-selfhosted-Chinese
Hướng dẫn: Tham khảo next-ai-draw-io nếu task liên quan whiteboard/mindmap. Tra public-apis/README.md nếu cần tích hợp API bên ngoài (Education, Language, Science...). Tra cứu awesome-selfhosted-Chinese để tìm kiếm và tham khảo các giải pháp self-hosted, thư viện, dịch vụ nguồn mở hữu ích.

### Nhóm 4: Phân tích & Tài liệu kỹ thuật
Repos: codegraph, spec-kit, prompt-master
Hướng dẫn: Chạy codegraph để visualize dependency trước khi refactor lớn. Dùng spec-kit/templates/ để viết spec tính năng mới. Lưu prompt hay vào prompt-master.

### Nhóm 5: Tiện ích & Bảo mật
Repos: bleachbit, heretic, strix, Mudlet
Hướng dẫn: Tham khảo kiến trúc Python cross-platform của bleachbit. Tham khảo heretic cho kỹ thuật chống browser tracking nếu task liên quan bảo mật client-side. Tham khảo strix nếu task liên quan đến bảo mật, kiểm thử xâm nhập (pentesting) hoặc quét lỗ hổng ứng dụng tự động. Tham khảo Mudlet để nghiên cứu về kiến trúc ứng dụng client-side hiệu năng cao, lập trình network/sockets và tích hợp kịch bản Lua.


## STACK & PRODUCTION
React + Supabase + React Router v6 + Vite + Capacitor Android (Live Update từ URL Vercel).
Production: studyconect.vercel.app | Supabase Free Tier (5GB egress/tháng).


## QUY TẮC BẢO TOÀN (KHÔNG ĐỔI)
- Tên route, component, props, hooks, file cấu hình.
- Tên bảng/cột Supabase, kiểu dữ liệu.
- Logic Auth, Chat, Call, Realtime, Notification.
- AppLayoutRoute.jsx, vercel.json, storageCleanup.js.
- Cấu hình server.url trong capacitor.config.json (luôn trỏ tới URL Vercel khi deploy production).
- Session keys: sc_session, sc_admin_session.
- Realtime channel TĨNH (không dùng Date.now()).
- console.log mới → bọc trong: if (import.meta.env.DEV) { ... }
- Không thêm package mới chưa có trong package.json.


## NGUYÊN TẮC PHÂN TÁCH GIAO DIỆN WEB & APP (ANDROID NATIVE)
1. **Kiểm tra môi trường:** Luôn sử dụng `Capacitor.isNativePlatform()` hoặc `window.Capacitor` để phát hiện nếu ứng dụng đang chạy bên trong App APK Android.
2. **CSS Overrides:** Sử dụng class `.is-native-app` trên thẻ root (html/body) để ẩn/hiển thị hoặc tùy biến kích thước các thành phần UI dành riêng cho màn hình điện thoại (ví dụ: ẩn thanh header ngang của Web, chừa khoảng trống cho StatusBar/Notch).
3. **Tính năng Native:** Chỉ gọi các API native (Camera, Định vị, Push Notification) khi ứng dụng chạy trong môi trường App Native để tránh gây crash lỗi trên trình duyệt Web.


════════════════════════════════════════════════
TASK CỤ THỂ
════════════════════════════════════════════════

[ĐIỀN TASK VÀO ĐÂY]


## QUY TRÌNH
1. Sửa đúng phạm vi task, không refactor xung quanh.
2. Kiểm tra build: cd frontend && npm run build
3. Deploy:
   git add .
   git commit -m "type: mô tả ngắn"
   git push origin main
   npx vercel --prod --yes (để cập nhật live trực tiếp lên bản Web & bản App Android)

## BÁO CÁO CUỐI
### Phần A (bắt buộc):
- Dán nguyên văn output grep/log xác nhận thay đổi thật (không tóm tắt bằng lời).
- Kết quả test thực tế: PASS/FAIL từng mục.
✅ Đã sửa: [mô tả]
📁 File ảnh hưởng: [danh sách file]
🔗 Commit: [hash]
🚀 Deploy: https://studyconect.vercel.app
sync andr
