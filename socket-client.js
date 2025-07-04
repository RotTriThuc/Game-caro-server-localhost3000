// Socket.IO client for Caro Game
class OnlineGame {
    constructor() {
        // Kết nối Socket.IO
        this.socket = io();
        
        // DOM elements
        this.playerNameInput = document.getElementById('player-name');
        this.loginBtn = document.getElementById('login-btn');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        this.roomIdInput = document.getElementById('room-id-input');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        this.copyRoomCodeBtn = document.getElementById('copy-room-code');
        this.roomCodeDisplay = document.getElementById('room-code');
        this.player1NameDisplay = document.getElementById('player1-name');
        this.player2NameDisplay = document.getElementById('player2-name');
        this.currentPlayerDisplay = document.getElementById('current-player');
        this.waitingMessage = document.getElementById('waiting-message');
        this.serverUrlDisplay = document.getElementById('server-url');
        this.lanIpDisplay = document.getElementById('lan-ip');
        this.onlinePlayersDisplay = document.getElementById('online-players');
        this.activeRoomsDisplay = document.getElementById('active-rooms');
        
        // Kiểm tra các phần tử DOM
        if (!this.lanIpDisplay) console.error('Không tìm thấy phần tử lan-ip');
        if (!this.onlinePlayersDisplay) console.error('Không tìm thấy phần tử online-players'); 
        if (!this.activeRoomsDisplay) console.error('Không tìm thấy phần tử active-rooms');
        this.roomListContainer = document.getElementById('room-list-container');
        this.refreshRoomsBtn = document.getElementById('refresh-rooms-btn');
        
        // Sections
        this.onlineLoginSection = document.getElementById('online-login');
        this.onlineLobbySection = document.getElementById('online-lobby');
        this.roomInfoSection = document.getElementById('room-info');
        
        // Game state
        this.currentUser = null;
        this.currentRoom = null;
        this.isPlayer1 = false;
        this.gameStarted = false;
        this.myTurn = false;
        this.availableRooms = [];
        
        // Bind event listeners
        this.bindEvents();
        this.setupSocketListeners();
        
        // Hiển thị thông tin server
        this.updateServerInfo();
    }
    
    // Cập nhật thông tin server
    updateServerInfo() {
        // Hiển thị URL server
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        const port = window.location.port;
        this.serverUrlDisplay.textContent = `${host}${port ? ':'+port : ''}`;
        
        // Cố gắng lấy địa chỉ IP LAN
        this.socket.on('lan_ip', (ip) => {
            console.log('Nhận IP LAN từ server:', ip);
            if (ip && ip !== 'Không tìm thấy') {
                this.lanIpDisplay.textContent = ip;
            } else {
                this.lanIpDisplay.textContent = 'Không có';
            }
        });
        
        // Yêu cầu lại thống kê server sau khi kết nối
        setTimeout(() => {
            console.log('Yêu cầu cập nhật thống kê server sau khi kết nối');
            this.socket.emit('request_stats');
        }, 1000);
        
        // Thực hiện thêm nhiều lần để đảm bảo nhận được dữ liệu
        setTimeout(() => {
            console.log('Yêu cầu cập nhật thống kê lần 2');
            this.socket.emit('request_stats');
        }, 2000);
    }
    
    // Thiết lập các sự kiện socket
    setupSocketListeners() {
        // Yêu cầu cập nhật thống kê ngay khi kết nối
        this.socket.on('connect', () => {
            console.log('Socket connected, ID:', this.socket.id);
            
            // Kiểm tra các phần tử DOM lần nữa
            console.log('DOM elements check:', {
                lanIp: !!this.lanIpDisplay,
                players: !!this.onlinePlayersDisplay,
                rooms: !!this.activeRoomsDisplay
            });
            
            // Yêu cầu cập nhật ngay lập tức
            this.socket.emit('request_stats');
            
            // Và sau một chút
            setTimeout(() => {
                console.log('Yêu cầu cập nhật sau khi kết nối');
                this.socket.emit('request_stats');
            }, 500);
        });
        
        // Đăng nhập thành công
        this.socket.on('login_success', (user) => {
            this.currentUser = user;
            this.showLobby();
            this.loginBtn.disabled = false;
            this.loginBtn.textContent = 'Xác nhận';
            
            // Tự động lấy danh sách phòng
            this.getRoomList();
            
            // Cập nhật thống kê
            this.socket.emit('request_stats');
        });
        
        // Nhận danh sách phòng
        this.socket.on('room_list', (rooms) => {
            this.availableRooms = rooms;
            this.updateRoomList();
        });
        
        // Cập nhật phòng (có phòng mới hoặc phòng bị xóa)
        this.socket.on('room_updated', () => {
            // Nếu đang ở lobby, cập nhật danh sách phòng
            if (this.onlineLobbySection.style.display === 'block') {
                this.getRoomList();
            }
        });
        
        // Tạo phòng thành công
        this.socket.on('room_created', (room) => {
            this.currentRoom = room.id;
            this.isPlayer1 = true;
            this.showRoomInfo(room);
        });
        
        // Tham gia phòng thành công
        this.socket.on('room_joined', (room) => {
            this.currentRoom = room.id;
            // Xác định vai trò (player1 hoặc player2)
            this.isPlayer1 = room.player1.id === this.socket.id;
            this.showRoomInfo(room);
            
            // Bắt đầu game
            if (room.player1 && room.player2) {
                this.startGame();
            }
        });
        
        // Cập nhật game
        this.socket.on('game_update', (gameState) => {
            this.updateGameState(gameState);
        });
        
        // Đặt lại game
        this.socket.on('game_reset', (gameState) => {
            this.resetGameState(gameState);
        });
        
        // Người chơi rời đi
        this.socket.on('player_left', ({ room }) => {
            if (room) {
                this.showRoomInfo(room);
                showNotification('Người chơi khác đã rời phòng');
            }
        });
        
        // Lỗi
        this.socket.on('error', ({ message }) => {
            showNotification(message, true);
        });
        
        // Cập nhật thông tin server
        this.socket.on('server_stats', ({ players, rooms }) => {
            console.log('Nhận thống kê server:', { players, rooms });
            this.onlinePlayersDisplay.textContent = players;
            this.activeRoomsDisplay.textContent = rooms;
        });
    }
    
    // Thiết lập các sự kiện giao diện
    bindEvents() {
        this.loginBtn.addEventListener('click', () => this.login());
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.copyRoomCodeBtn.addEventListener('click', () => this.copyRoomCode());
        
        // Thêm sự kiện làm mới danh sách phòng
        if (this.refreshRoomsBtn) {
            this.refreshRoomsBtn.addEventListener('click', () => this.getRoomList());
        }
    }
    
    // Đăng nhập
    login() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            showNotification('Vui lòng nhập tên của bạn', true);
            return;
        }
        
        // Hiển thị trạng thái đang tải
        this.loginBtn.disabled = true;
        this.loginBtn.textContent = 'Đang đăng nhập...';
        
        // Gửi yêu cầu đăng nhập
        this.socket.emit('login', playerName);
    }
    
    // Lấy danh sách phòng
    getRoomList() {
        if (!this.currentUser) return;
        
        // Hiển thị trạng thái đang tải
        if (this.refreshRoomsBtn) {
            this.refreshRoomsBtn.disabled = true;
            this.refreshRoomsBtn.textContent = 'Đang tải...';
        }
        
        // Gửi yêu cầu lấy danh sách phòng
        this.socket.emit('get_rooms');
        
        // Khôi phục nút sau 1 giây
        setTimeout(() => {
            if (this.refreshRoomsBtn) {
                this.refreshRoomsBtn.disabled = false;
                this.refreshRoomsBtn.textContent = 'Làm mới';
            }
        }, 1000);
    }
    
    // Cập nhật danh sách phòng
    updateRoomList() {
        if (!this.roomListContainer) return;
        
        // Xóa danh sách cũ
        this.roomListContainer.innerHTML = '';
        
        // Nếu không có phòng nào
        if (this.availableRooms.length === 0) {
            const noRoomMsg = document.createElement('div');
            noRoomMsg.className = 'no-room-message';
            noRoomMsg.textContent = 'Không có phòng nào đang chờ. Hãy tạo phòng mới!';
            this.roomListContainer.appendChild(noRoomMsg);
            return;
        }
        
        // Tạo danh sách phòng
        const roomList = document.createElement('div');
        roomList.className = 'room-list';
        
        this.availableRooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            
            const roomInfo = document.createElement('div');
            roomInfo.className = 'room-info';
            roomInfo.innerHTML = `
                <div class="room-id">Phòng: ${room.id}</div>
                <div class="room-host">Chủ phòng: ${room.player1Name}</div>
            `;
            
            const joinBtn = document.createElement('button');
            joinBtn.className = 'join-btn';
            joinBtn.textContent = 'Tham gia';
            joinBtn.addEventListener('click', () => {
                this.joinSpecificRoom(room.id);
            });
            
            roomItem.appendChild(roomInfo);
            roomItem.appendChild(joinBtn);
            roomList.appendChild(roomItem);
        });
        
        this.roomListContainer.appendChild(roomList);
    }
    
    // Tham gia vào phòng cụ thể từ danh sách
    joinSpecificRoom(roomId) {
        if (!roomId) return;
        
        this.socket.emit('join_room', roomId);
    }
    
    // Hiển thị lobby
    showLobby() {
        this.onlineLoginSection.style.display = 'none';
        this.onlineLobbySection.style.display = 'block';
        this.roomInfoSection.style.display = 'none';
        
        this.currentPlayerDisplay.textContent = this.currentUser.name;
    }
    
    // Hiển thị trang đăng nhập
    showLogin() {
        this.onlineLoginSection.style.display = 'block';
        this.onlineLobbySection.style.display = 'none';
        this.roomInfoSection.style.display = 'none';
    }
    
    // Tạo phòng mới
    createRoom() {
        this.socket.emit('create_room');
    }
    
    // Tham gia phòng
    joinRoom() {
        const roomId = this.roomIdInput.value.trim().toUpperCase();
        if (!roomId) {
            showNotification('Vui lòng nhập mã phòng', true);
            return;
        }
        
        this.socket.emit('join_room', roomId);
    }
    
    // Hiển thị thông tin phòng
    showRoomInfo(room) {
        this.onlineLoginSection.style.display = 'none';
        this.onlineLobbySection.style.display = 'none';
        this.roomInfoSection.style.display = 'block';
        
        this.roomCodeDisplay.textContent = room.id;
        this.player1NameDisplay.textContent = room.player1 ? room.player1.name : 'Đang chờ...';
        this.player2NameDisplay.textContent = room.player2 ? room.player2.name : 'Đang chờ...';
        
        // Hiển thị/ẩn thông báo chờ
        this.waitingMessage.style.display = room.player2 ? 'none' : 'block';
    }
    
    // Bắt đầu trò chơi
    startGame() {
        this.gameStarted = true;
        // Gọi hàm của script.js để khởi tạo game
        window.startOnlineGame(this.isPlayer1, this.currentRoom);
    }
    
    // Cập nhật trạng thái game
    updateGameState(gameState) {
        if (!this.gameStarted) return;
        
        // Xác định lượt đi
        const isMyTurn = (gameState.currentPlayer === 'X' && this.isPlayer1) ||
                         (gameState.currentPlayer === 'O' && !this.isPlayer1);
        
        this.myTurn = isMyTurn;
        
        // Cập nhật lượt trong script.js
        window.updateOnlineTurn(this.myTurn);
        
        // Cập nhật bàn cờ
        window.updateOnlineBoard(gameState.board, gameState.lastMove);
    }
    
    // Đặt lại trạng thái game
    resetGameState(gameState) {
        if (!this.gameStarted) return;
        
        // Xác định lượt đi
        const isMyTurn = (gameState.currentPlayer === 'X' && this.isPlayer1) ||
                         (gameState.currentPlayer === 'O' && !this.isPlayer1);
        
        this.myTurn = isMyTurn;
        
        // Cập nhật lượt trong script.js
        window.updateOnlineTurn(this.myTurn);
        
        // Cập nhật bàn cờ
        window.updateOnlineBoard(gameState.board, null);
    }
    
    // Thực hiện nước đi
    makeMove(row, col, value) {
        if (!this.currentRoom || !this.myTurn) return false;
        
        // Gửi yêu cầu đặt nước đi
        this.socket.emit('make_move', { row, col });
        
        return true;
    }
    
    // Đặt lại trò chơi
    resetGame() {
        if (!this.currentRoom) return;
        
        // Gửi yêu cầu đặt lại trò chơi
        this.socket.emit('reset_game');
    }
    
    // Rời phòng
    leaveRoom() {
        if (!this.currentRoom) return;
        
        // Gửi yêu cầu rời phòng
        this.socket.emit('leave_room');
        
        // Đặt lại trạng thái
        this.currentRoom = null;
        this.isPlayer1 = false;
        this.gameStarted = false;
        this.myTurn = false;
        
        // Quay lại lobby
        this.showLobby();
        
        // Cập nhật danh sách phòng
        this.getRoomList();
        
        // Thông báo cho script.js
        window.leaveOnlineGame();
    }
    
    // Sao chép mã phòng
    copyRoomCode() {
        if (!this.currentRoom) return;
        
        // Tạo phần tử input tạm thời
        const tempInput = document.createElement('input');
        tempInput.value = this.currentRoom;
        document.body.appendChild(tempInput);
        
        // Chọn và sao chép văn bản
        tempInput.select();
        document.execCommand('copy');
        
        // Xóa phần tử tạm thời
        document.body.removeChild(tempInput);
        
        // Hiển thị thông báo
        showNotification('Đã sao chép mã phòng vào clipboard');
    }
}

// Hàm hiển thị thông báo
function showNotification(message, isError = false) {
    // Xóa thông báo hiện tại
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Tạo thông báo mới
    const notification = document.createElement('div');
    notification.className = isError ? 'notification error' : 'notification';
    notification.textContent = message;
    
    // Thêm vào body
    document.body.appendChild(notification);
    
    // Hiển thị thông báo
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Ẩn thông báo sau 3 giây
    setTimeout(() => {
        notification.classList.remove('show');
        
        // Xóa khỏi DOM sau khi ẩn
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Khởi tạo game online khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    window.onlineGame = new OnlineGame();
}); 