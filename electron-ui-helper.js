// File này chứa các hàm trợ giúp cho phiên bản Electron desktop app

// Kiểm tra xem hiện tại có đang chạy trong môi trường Electron hay không
function isElectronApp() {
  return window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
}

// Điều chỉnh giao diện cho phiên bản desktop
function setupElectronUI() {
  if (!isElectronApp()) return;

  // Thêm class electron-app vào body để có thể styling riêng cho phiên bản desktop
  document.body.classList.add('electron-app');

  // Thêm tiêu đề cho phiên bản desktop nếu cần
  const titleElement = document.createElement('div');
  titleElement.id = 'desktop-app-title';
  titleElement.classList.add('desktop-title');
  titleElement.style.display = 'none'; // Mặc định ẩn, có thể hiển thị trong CSS nếu cần
  titleElement.innerText = 'Caro Game - Desktop Version';
  document.body.prepend(titleElement);

  console.log('Đã thiết lập giao diện cho phiên bản Electron');
}

// Thiết lập các handlers cho các chức năng đặc biệt của desktop app
function setupElectronHandlers() {
  if (!isElectronApp()) return;

  // Thêm listener cho các phím tắt đặc biệt của desktop app
  document.addEventListener('keydown', function(event) {
    // Phím F11 để chuyển đổi chế độ toàn màn hình
    if (event.key === 'F11') {
      if (window.ipcRenderer) {
        window.ipcRenderer.send('toggle-fullscreen');
      }
    }
    
    // Phím Esc để thoát chế độ toàn màn hình
    if (event.key === 'Escape') {
      if (window.ipcRenderer) {
        window.ipcRenderer.send('exit-fullscreen');
      }
    }
  });

  console.log('Đã thiết lập handlers cho phiên bản Electron');
}

// Khởi tạo khi trang được tải
window.addEventListener('DOMContentLoaded', function() {
  if (isElectronApp()) {
    setupElectronUI();
    setupElectronHandlers();
    console.log('Ứng dụng đang chạy trong môi trường Electron');
  } else {
    console.log('Ứng dụng đang chạy trong môi trường web browser');
  }
}); 