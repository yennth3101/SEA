# Trợ lý Học tập Thông minh (SmartEdu Assistant)

Hệ thống hỗ trợ giảng viên tạo bài giảng và bài test tự động từ tài liệu bằng AI (Gemini), tích hợp chatbot và quản lý kết quả sinh viên.

## Tính năng chính
- **Giảng viên:**
  - Tải lên tài liệu (PDF, Word, Excel, Text, Hình ảnh).
  - Tự động sinh bài giảng chi tiết và bài test 15 câu trắc nghiệm.
  - Quản lý bảng điểm sinh viên.
  - Đồng bộ kết quả ra Google Sheets.
- **Sinh viên:**
  - Học bài giảng sinh động.
  - Chat với AI để giải đáp thắc mắc (chỉ trong phạm vi tài liệu).
  - Làm bài test trắc nghiệm và nhận kết quả ngay lập tức.

## Công nghệ sử dụng
- **Frontend:** React, Tailwind CSS, Lucide Icons, Motion.
- **Backend:** Node.js (Express), Multer (xử lý file).
- **AI:** Google Gemini API.
- **Database & Auth:** Firebase (Firestore, Auth).
- **Deployment:** Vercel.

## Hướng dẫn cài đặt Local

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Cấu hình biến môi trường (.env):**
   Tạo file `.env` dựa trên `.env.example`:
   - `GEMINI_API_KEY`: Lấy từ Google AI Studio.
   - `APP_URL`: URL của ứng dụng.

3. **Cấu hình Firebase:**
   - Đảm bảo file `firebase-applet-config.json` đã có thông tin từ Firebase Console.

4. **Chạy ứng dụng:**
   ```bash
   npm run dev
   ```

## Hướng dẫn Deploy Vercel

1. **Chuẩn bị:**
   - Đẩy code lên GitHub.
   - Kết nối dự án GitHub với Vercel.

2. **Cấu hình Environment Variables trên Vercel:**
   - Thêm `GEMINI_API_KEY`.
   - Thêm các biến Firebase nếu không dùng file config.

3. **Build Settings:**
   - Framework Preset: `Vite`.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.

## Phân quyền
- **Giảng viên (Lecturer):** Email `yennth.math@gmail.com` được mặc định là giảng viên. Các tài khoản khác sẽ là sinh viên trừ khi được giảng viên cấp quyền trong Firestore.
- **Sinh viên (Student):** Chỉ thấy nội dung học tập và làm bài test.

## Lưu ý bảo mật
- API Key Gemini được giữ an toàn ở phía Server.
- Quy tắc Firestore (firestore.rules) đảm bảo chỉ giảng viên mới có quyền thay đổi nội dung và xem bảng điểm toàn bộ.
