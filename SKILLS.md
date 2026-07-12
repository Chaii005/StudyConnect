# DANH SÁCH NHÓM SKILLS STUDYCONECT (v15.3)

Dưới đây là danh sách phân nhóm toàn bộ các công cụ, repo và kỹ năng (skills) đang được tích hợp trong dự án StudyConnect, được tối ưu hóa thành **5 nhóm chính**:

---

## 📂 PHÂN NHÓM CHÍNH (5 NHÓM)

### 1. Nhóm 1: Workflow & AI
*Nhóm tập trung vào quy trình làm việc tự động hóa, điều phối task và tích hợp các tác vụ AI.*
- **get-shit-done**: Hệ thống quản lý phase công việc tự động.
- **gsd-core**: Lõi xử lý chính cho workflow GSD.
- **OmniRoute**: Module định tuyến thông minh.

### 2. Nhóm 2: UI/UX & Premium Motion
*Nhóm chịu trách nhiệm thiết kế giao diện cao cấp, hiệu ứng mượt mà và các thư viện component.*
- **taste-skill / design-taste-frontend**: Skill áp dụng quy chuẩn thiết kế premium chống slop.
- **stitch-skills / stitch-design-taste**: Hệ thống quy chuẩn thiết kế cho Google Stitch.
- **ponytail**: Thư viện/phương pháp hỗ trợ tạo kiểu và tùy biến giao diện.
- **lenis**: Thư viện smooth scroll (cuộn mượt) cho ứng dụng web.
- **react-bits**: Các component động, hoạt ảnh cao cấp được dựng sẵn cho React.
- **miro-fish**: Hoạt ảnh tương tác động cao cấp.

### 3. Nhóm 3: Tính năng mới & Marketing
*Nhóm chuyên phát triển các tính năng mở rộng bên thứ ba, tích hợp API công cộng và thúc đẩy tiếp thị/tăng trưởng.*
- **next-ai-draw-io**: Tính năng vẽ biểu đồ thông minh tích hợp AI.
- **public-apis**: Kho lưu trữ và kết nối các nguồn dữ liệu mở.
- **awesome-selfhosted-Chinese**: Các giải pháp tự lưu trữ ứng dụng tối ưu.
- **marketing-skills**: Bộ kỹ năng tối ưu chuyển đổi và tăng trưởng (CRO, A/B Testing, Analytics, SEO Audit, Ads, Social,...).

### 4. Nhóm 4: Refactor, Tài liệu & Dev-skills
*Nhóm tối ưu cấu trúc mã nguồn, dọn dẹp nợ kỹ thuật, viết tài liệu kỹ thuật và hỗ trợ lập trình viên.*
- **codegraph**: Bản đồ trực quan hóa liên kết mã nguồn.
- **spec-kit**: Bộ tạo đặc tả kỹ thuật và tài liệu thiết kế.
- **prompt-master**: Công cụ quản lý và tối ưu hóa hệ thống prompt.
- **dev-skills**: Công cụ hỗ trợ review code, viết test (TDD), và quản lý git hook.

### 5. Nhóm 5: Bảo mật & Hiệu năng
*Nhóm bảo vệ hệ thống khỏi các lỗ hổng bảo mật và tối ưu hóa tốc độ tải.*
- **bleachbit**: Dọn dẹp tệp tin rác và tối ưu bộ nhớ.
- **heretic**: Phân tích và ngăn chặn các cuộc tấn công bảo mật.
- **strix**: Bộ công cụ kiểm thử lỗ hổng bảo mật.
- **Mudlet**: Quản lý và xử lý kết nối, tối ưu hiệu năng nền.

---

## 🔒 NGUYÊN TẮC BẢO VỆ CỐT LÕI
1. **Không tự ý thay đổi cấu trúc nền**: `vite.config.js`, `capacitor.config.json`, `package.json`, `.env`, Routing (`App.jsx`), thư mục `supabase`, và các tài nguyên Android/iOS gốc nếu không được yêu cầu trực tiếp.
2. **Đảm bảo tính Responsive**: Mọi thay đổi UI phải chạy tốt trên cả màn hình desktop rộng và ứng dụng WebView màn hình điện thoại của Capacitor.
3. **Giữ nguyên luồng Auth & Security**: Tuyệt đối không vô hiệu hóa kiểm tra session, quyền admin/user hay gỡ bỏ các lớp mã hóa mật khẩu đang hoạt động.
