const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// Theo dõi cửa sổ chính
let mainWindow = null;
let isFullscreen = false;

// Tạo một server nhúng cho chế độ offline
const startOfflineServer = () => {
  try {
    // Nhúng express server cho desktop mode offline
    const express = require('express');
    const http = require('http');
    const serverApp = express();
    const server = http.createServer(serverApp);
    const { Server } = require('socket.io');
    const io = new Server(server);

    // Phục vụ các file tĩnh trong thư mục hiện tại
    serverApp.use(express.static(__dirname));

    // Cấu hình Socket.IO events cho mode offline
    io.on('connection', socket => {
      console.log('socket connected:', socket.id);
      // Các xử lý socket sẽ được nạp từ server.js
    });

    // Chạy server nhúng trên port ngẫu nhiên (tránh xung đột)
    const port = 0; // 0 = chọn port tự động
    server.listen(port, () => {
      const actualPort = server.address().port;
      console.log(`Embedded server running on port ${actualPort}`);
    });
  } catch (err) {
    console.error('Failed to start embedded server:', err);
  }
};

function createWindow() {
  // Tạo cửa sổ trình duyệt
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.ico')
  });

  // Tải trang index.html của ứng dụng
  mainWindow.loadFile('index.html');
  
  // Thiết lập menu
  setupMenu();
  
  // Xử lý đóng cửa sổ
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Mở DevTools trong môi trường phát triển (chú thích dòng dưới để tắt)
  // mainWindow.webContents.openDevTools();
}

// Thiết lập menu cho ứng dụng
function setupMenu() {
  const template = [
    {
      label: 'Game',
      submenu: [
        {
          label: 'New Game',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // Gửi thông điệp đến renderer process để reset trò chơi
            if (mainWindow) mainWindow.webContents.send('game-new');
          }
        },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => {
            toggleFullscreen();
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('zoom-in');
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('zoom-out');
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('zoom-reset');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Caro Game',
              message: 'Caro Game (Gomoku)',
              detail: 'Version 1.0.0\nA simple but intelligent Gomoku game with AI and online play.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Chuyển đổi chế độ toàn màn hình
function toggleFullscreen() {
  if (mainWindow) {
    isFullscreen = !isFullscreen;
    mainWindow.setFullScreen(isFullscreen);
  }
}

// Xử lý các thông điệp từ renderer process
ipcMain.on('toggle-fullscreen', () => {
  toggleFullscreen();
});

ipcMain.on('exit-fullscreen', () => {
  if (mainWindow && isFullscreen) {
    isFullscreen = false;
    mainWindow.setFullScreen(false);
  }
});

// Phương thức này sẽ được gọi khi Electron hoàn tất
// khởi tạo và sẵn sàng tạo cửa sổ trình duyệt.
app.whenReady().then(() => {
  // Khởi động server nhúng cho chế độ offline
  startOfflineServer();
  
  // Tạo cửa sổ chính
  createWindow();

  app.on('activate', function () {
    // Trên macOS, thông thường sẽ tạo lại cửa sổ trong ứng dụng khi
    // biểu tượng dock được nhấp vào và không có cửa sổ nào đang mở.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Thoát khi tất cả cửa sổ đóng, trừ trên macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 