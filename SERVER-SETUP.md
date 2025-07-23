# Hướng dẫn thiết lập và chạy server Cờ Caro Online

Tài liệu này hướng dẫn cách thiết lập và chạy server trò chơi Cờ Caro trên máy tính của bạn để chơi online với người khác.

## Yêu cầu

- [Node.js](https://nodejs.org/) (phiên bản 14 trở lên)
- Trình duyệt web hiện đại (Chrome, Firefox, Edge, Safari)
- Kết nối mạng (để chơi với người khác qua mạng LAN hoặc Internet)

## Cài đặt

1. **Cài đặt Node.js**
   - Tải và cài đặt Node.js từ trang web chính thức: https://nodejs.org/
   - Sau khi cài đặt, kiểm tra phiên bản bằng lệnh sau trong terminal/command prompt:
   ```
   node -v
   npm -v
   ```

2. **Cài đặt các thư viện phụ thuộc**
   - Mở terminal/command prompt trong thư mục dự án (nơi có file `package.json`)
   - Chạy lệnh:
   ```
   npm install
   ```
   - Lệnh này sẽ cài đặt Express, Socket.IO và các thư viện cần thiết khác

## Chạy server

1. **Khởi động server**
   - Trong thư mục dự án, chạy lệnh:
   ```
   npm start
   ```
   - Hoặc để tự động khởi động lại server khi có thay đổi code:
   ```
   npm run dev
   ```

2. **Truy cập game**
   - Mở trình duyệt và truy cập: http://localhost:3000
   - Server sẽ hiển thị thông tin IP LAN của bạn để người khác trong cùng mạng có thể kết nối

## Chơi qua mạng LAN

1. **Người chủ game (host)**
   - Chạy server như hướng dẫn ở trên
   - Lấy địa chỉ IP LAN của bạn (hiển thị trên giao diện game)
   - Chia sẻ địa chỉ IP và cổng (mặc định là 3000) cho người chơi khác

2. **Người chơi khác**
   - Mở trình duyệt và truy cập theo định dạng: http://[IP-của-host]:3000
   - Ví dụ: http://192.168.1.5:3000

## Chơi qua Internet

Để chơi qua Internet, bạn cần thực hiện thêm các bước sau:

1. **Thiết lập chuyển tiếp cổng (port forwarding)**
   - Đăng nhập vào router của bạn
   - Thiết lập chuyển tiếp cổng 3000 đến IP LAN của máy tính chạy server
   - Hướng dẫn chi tiết tùy thuộc vào loại router, bạn có thể tìm kiếm "hướng dẫn port forwarding [tên router]"

2. **Sử dụng dịch vụ tunneling**
   - Thay vì port forwarding, bạn có thể sử dụng dịch vụ như ngrok, localtunnel hoặc Cloudflare Tunnel
   - Ví dụ với ngrok:
     - Cài đặt ngrok: `npm install -g ngrok`
     - Chạy lệnh: `ngrok http 3000`
     - Chia sẻ URL được cung cấp cho người chơi khác

## Xử lý sự cố

1. **Server không khởi động**
   - Kiểm tra Node.js đã được cài đặt đúng cách
   - Kiểm tra các thư viện đã được cài đặt: `npm install`
   - Kiểm tra cổng 3000 không bị sử dụng bởi ứng dụng khác

2. **Không thể kết nối từ máy khác**
   - Kiểm tra tường lửa trên máy chủ
   - Kiểm tra kết nối mạng
   - Xác nhận địa chỉ IP và cổng chính xác

3. **Độ trễ cao khi chơi**
   - Khoảng cách địa lý xa gây độ trễ cao
   - Kết nối Internet không ổn định
   - Thử sử dụng mạng LAN nếu có thể

## Tùy chỉnh

1. **Thay đổi cổng server**
   - Mở file `server.js`
   - Tìm dòng: `const PORT = process.env.PORT || 3000;`
   - Thay đổi số 3000 thành cổng mong muốn

2. **Tùy chỉnh kích thước bàn cờ mặc định**
   - Trong file `server.js`, tìm các hàm `createEmptyBoard(15)`
   - Thay đổi số 15 thành kích thước mong muốn

## Nâng cao

1. **Triển khai lên dịch vụ đám mây**
   - Bạn có thể triển khai server lên các dịch vụ như Heroku, Vercel, Glitch,...
   - Làm theo hướng dẫn triển khai Node.js của từng dịch vụ

2. **Thêm tính năng bảo mật**
   - Thêm xác thực người dùng
   - Thêm mã hóa cho giao tiếp socket

## Liên hệ hỗ trợ

Nếu bạn gặp khó khăn trong quá trình thiết lập, vui lòng tạo issue trên GitHub hoặc liên hệ qua email. 