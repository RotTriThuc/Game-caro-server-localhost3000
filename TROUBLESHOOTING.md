# Hướng dẫn khắc phục lỗi "localhost:3000 không hoạt động"

Nếu bạn gặp vấn đề khi truy cập `localhost:3000` hoặc server không khởi động được, hãy làm theo các bước sau để khắc phục:

## 1. Cài đặt Node.js

Vấn đề phổ biến nhất là **Node.js chưa được cài đặt** trên máy tính của bạn.

### Cài đặt Node.js trên Windows:

1. Truy cập trang web chính thức của Node.js: https://nodejs.org/
2. Tải phiên bản LTS (Long Term Support) - đây là phiên bản ổn định nhất
3. Chạy tệp cài đặt `.msi` đã tải về
4. Làm theo hướng dẫn cài đặt, đảm bảo tùy chọn "Add to PATH" được chọn
5. Khởi động lại máy tính sau khi cài đặt hoàn tất

### Kiểm tra cài đặt:
Sau khi cài đặt, mở Command Prompt hoặc PowerShell và chạy:
```
node -v
npm -v
```

Nếu cài đặt thành công, bạn sẽ thấy phiên bản của Node.js và npm được hiển thị.

## 2. Cài đặt các gói phụ thuộc

Sau khi cài đặt Node.js, bạn cần cài đặt các gói phụ thuộc cho dự án:

1. Mở Command Prompt hoặc PowerShell
2. Di chuyển đến thư mục dự án (sử dụng lệnh `cd đường_dẫn_đến_thư_mục_dự_án`)
   ```
   cd "C:\Users\Admin\Desktop\code game"
   ```
3. Cài đặt các gói phụ thuộc:
   ```
   npm install
   ```

## 3. Khởi động server

Sau khi cài đặt Node.js và các gói phụ thuộc, bạn có thể khởi động server:

1. Trong thư mục dự án, chạy:
   ```
   node server.js
   ```
2. Nếu không có lỗi, bạn sẽ thấy thông báo "Server đang chạy tại http://localhost:3000"

## 4. Khắc phục các vấn đề phổ biến

### Cổng 3000 đã được sử dụng
Nếu bạn thấy lỗi như "EADDRINUSE" hoặc "Port 3000 is already in use", có nghĩa là cổng 3000 đã được sử dụng bởi một ứng dụng khác.

Giải pháp:
1. Tìm và đóng ứng dụng đang sử dụng cổng 3000, hoặc
2. Thay đổi cổng trong file `server.js`:
   - Mở file `server.js`
   - Tìm dòng `const PORT = process.env.PORT || 3000;`
   - Thay đổi `3000` thành một số khác (ví dụ: `8080`)
   - Lưu file và khởi động lại server

### Lỗi "Cannot find module..."
Nếu bạn thấy lỗi này, có nghĩa là một module Node.js chưa được cài đặt.

Giải pháp:
1. Chạy lại lệnh cài đặt các gói phụ thuộc:
   ```
   npm install
   ```
2. Nếu vẫn gặp lỗi, hãy cài đặt riêng module đó:
   ```
   npm install tên_module
   ```

### Lỗi EACCES (quyền truy cập)
Nếu bạn gặp lỗi về quyền truy cập, hãy thử chạy Command Prompt hoặc PowerShell với quyền quản trị viên.

## 5. Truy cập game

Sau khi server đã khởi động thành công:

1. Mở trình duyệt web (Chrome, Firefox, Edge,...)
2. Truy cập địa chỉ: http://localhost:3000
3. Nếu bạn đã thay đổi cổng, hãy sử dụng cổng mới (ví dụ: http://localhost:8080)

## 6. Kiểm tra tường lửa

Nếu bạn không thể truy cập từ máy khác trong mạng LAN:

1. Kiểm tra xem tường lửa Windows có đang chặn Node.js không
2. Thêm ngoại lệ cho Node.js trong tường lửa:
   - Mở Windows Defender Firewall
   - Chọn "Cho phép một ứng dụng hoặc tính năng thông qua Windows Defender Firewall"
   - Tìm và cho phép Node.js, hoặc thêm một quy tắc mới cho cổng 3000

## 7. Cài đặt nhanh với một lệnh

Nếu bạn muốn cài đặt tất cả trong một bước, hãy tạo một file `setup.bat` trong thư mục dự án với nội dung sau:

```batch
@echo off
echo Cài đặt và khởi động server Cờ Caro...
echo.
echo Đang cài đặt các gói phụ thuộc...
call npm install
if %errorlevel% neq 0 (
    echo Lỗi khi cài đặt các gói phụ thuộc.
    echo Vui lòng cài đặt Node.js từ https://nodejs.org/ và thử lại.
    pause
    exit /b
)
echo.
echo Khởi động server...
node server.js
```

Sau đó, bạn chỉ cần chạy file `setup.bat` này để cài đặt và khởi động server.

## Liên hệ hỗ trợ

Nếu bạn vẫn gặp vấn đề sau khi thử các giải pháp trên, vui lòng cung cấp thông tin chi tiết về lỗi để được hỗ trợ thêm. 