// Tất cả các modules Node.js mà bạn muốn sử dụng trong trình duyệt
// phải được require ở đây
window.addEventListener('DOMContentLoaded', () => {
  // Kết nối giữa Electron và nội dung web
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

// Cho phép các tính năng Node.js trong trang web khi cần thiết
window.ipcRenderer = require('electron').ipcRenderer;
window.isElectron = true;

// Tạo biến global để xác định rằng đang chạy trong môi trường Electron
window.addEventListener('load', () => {
  window.runningInElectron = true;
}); 