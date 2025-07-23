/**
 * Lớp xử lý chức năng chơi trực tuyến cho Cờ Thú Việt Nam
 * Tách biệt hoàn toàn với chế độ chơi trực tuyến của Cờ Caro
 */
class AnimalChessOnline {
    constructor() {
        // Lưu trữ thông tin phòng và người chơi
        this.socket = null;
        this.roomId = null;
        this.username = null;
        this.isHost = false;
        this.playerColor = null;
        this.opponentUsername = null;
        this.gameStarted = false;
        this.game = null;
        
        // DOM elements
        this.container = document.getElementById('animal-chess-game-container');
        this.animalChessSelection = document.getElementById('animal-chess-selection');
        
        // Khởi tạo Socket.IO nếu chưa có
        this.initSocket();
    }
    
    // Khởi tạo kết nối socket
    initSocket() {
        if (!this.socket) {
            // Kiểm tra xem đã có socket từ socket-client.js chưa
            if (window.socket) {
                this.socket = window.socket;
                console.log('Sử dụng kết nối socket hiện có');
            } else {
                // Tạo kết nối socket mới
                this.socket = io();
                window.socket = this.socket;
                console.log('Tạo kết nối socket mới');
            }
            
            // Thiết lập các sự kiện socket
            this.setupSocketListeners();
        }
    }
    
    // Thiết lập lắng nghe các sự kiện socket
    setupSocketListeners() {
        // Sử dụng namespace 'animalChess:' để tránh xung đột với các sự kiện của Cờ Caro
        this.socket.on('animalChess:roomJoined', (data) => {
            console.log('Đã vào phòng Cờ Thú:', data);
            this.roomId = data.roomId;
            this.isHost = data.isHost;
            this.playerColor = data.playerColor;
            this.showAnimalChessRoomInfo(data);
        });
        
        this.socket.on('animalChess:playerJoined', (data) => {
            console.log('Người chơi mới tham gia phòng Cờ Thú:', data);
            this.opponentUsername = data.username;
            this.updateAnimalChessRoomInfo();
        });
        
        this.socket.on('animalChess:gameStart', (data) => {
            console.log('Trò chơi Cờ Thú bắt đầu:', data);
            this.gameStarted = true;
            this.startAnimalChessGame(data);
        });
        
        this.socket.on('animalChess:gameState', (gameState) => {
            console.log('Nhận trạng thái trò chơi Cờ Thú:', gameState);
            this.updateAnimalChessGameState(gameState);
        });
        
        this.socket.on('animalChess:moveMade', (moveData) => {
            console.log('Đối thủ đã di chuyển quân Cờ Thú:', moveData);
            this.handleOpponentMove(moveData);
        });
        
        this.socket.on('animalChess:gameEnd', (result) => {
            console.log('Trò chơi Cờ Thú kết thúc:', result);
            this.handleGameEnd(result);
        });
        
        this.socket.on('animalChess:playerLeft', (data) => {
            console.log('Người chơi rời phòng Cờ Thú:', data);
            this.handlePlayerLeft(data);
        });
        
        this.socket.on('animalChess:error', (error) => {
            console.error('Lỗi Cờ Thú:', error);
            showNotification(error.message, true);
        });
        
        // Thêm sự kiện nhận danh sách phòng
        this.socket.on('animalChess:roomList', (rooms) => {
            console.log('Nhận danh sách phòng Cờ Thú:', rooms);
            this.updateRoomList(rooms);
        });
        
        // Thêm sự kiện nhận thông tin phòng
        this.socket.on('animalChess:roomInfo', (roomInfo) => {
            console.log('Nhận thông tin phòng Cờ Thú:', roomInfo);
            this.showAnimalChessRoomInfo(roomInfo);
        });
    }
    
    // Hiển thị giao diện chơi online Cờ Thú
    showAnimalChessOnline() {
        // Xóa nội dung container hiện tại
        this.container.innerHTML = '';
        this.container.style.display = 'block';
        this.animalChessSelection.style.display = 'none';
        
        // Tạo giao diện đăng nhập/tạo phòng
        const onlineUI = document.createElement('div');
        onlineUI.className = 'animal-chess-online-ui';
        onlineUI.innerHTML = `
            <div class="animal-chess-online-header">
                <h2>Cờ Thú Trực Tuyến</h2>
                <div class="login-section">
                    <input type="text" id="animal-chess-username" placeholder="Nhập tên người chơi" maxlength="15">
                    <button id="animal-chess-login-btn" class="animal-chess-button">Đăng nhập</button>
                </div>
            </div>
            <div class="animal-chess-online-content" style="display: none;">
                <div class="animal-chess-lobby">
                    <div class="animal-chess-room-options">
                        <button id="animal-chess-create-room-btn" class="animal-chess-button">Tạo phòng mới</button>
                        <div class="or-divider">hoặc</div>
                        <div class="animal-chess-join-room">
                            <input type="text" id="animal-chess-room-id" placeholder="Nhập mã phòng">
                            <button id="animal-chess-join-room-btn" class="animal-chess-button">Vào phòng</button>
                        </div>
                    </div>
                    <div class="animal-chess-room-list-section">
                        <div class="animal-chess-room-list-header">
                            <h3>Danh sách phòng có sẵn</h3>
                            <button id="animal-chess-refresh-rooms-btn" class="animal-chess-button">Làm mới</button>
                        </div>
                        <div class="animal-chess-room-list-container">
                            <div class="animal-chess-loading-rooms">Đang tải danh sách phòng...</div>
                            <div class="animal-chess-no-rooms-message" style="display: none;">Không có phòng nào. Hãy tạo phòng mới!</div>
                            <div class="animal-chess-room-list"></div>
                        </div>
                    </div>
                </div>
                <div class="animal-chess-room-info" style="display: none;">
                    <h3>Thông tin phòng</h3>
                    <div class="animal-chess-room-details">
                        <p>Mã phòng: <span class="animal-chess-room-id-display"></span> <button id="animal-chess-copy-code-btn" class="animal-chess-button">Sao chép</button></p>
                        <div class="animal-chess-players-status">
                            <div class="animal-chess-player-status">
                                <span class="animal-chess-player-label">Quân Xanh: </span>
                                <span class="animal-chess-blue-player">Đang chờ...</span>
                            </div>
                            <div class="animal-chess-player-status">
                                <span class="animal-chess-player-label">Quân Đỏ: </span>
                                <span class="animal-chess-red-player">Đang chờ...</span>
                            </div>
                        </div>
                        <div class="animal-chess-room-controls">
                            <button id="animal-chess-start-game-btn" class="animal-chess-button" disabled>Bắt đầu trò chơi</button>
                            <button id="animal-chess-leave-room-btn" class="animal-chess-button">Rời phòng</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="animal-chess-back">
                <button id="animal-chess-back-btn" class="animal-chess-button back-button">Quay lại</button>
            </div>
        `;
        
        this.container.appendChild(onlineUI);
        
        // Gắn các sự kiện
        this.bindEvents();
        
        // Kiểm tra xem đã đăng nhập chưa
        if (localStorage.getItem('animalChessUsername')) {
            document.getElementById('animal-chess-username').value = localStorage.getItem('animalChessUsername');
        }
    }
    
    // Gắn các sự kiện cho các nút
    bindEvents() {
        document.getElementById('animal-chess-login-btn').addEventListener('click', () => this.login());
        document.getElementById('animal-chess-create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('animal-chess-join-room-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('animal-chess-refresh-rooms-btn').addEventListener('click', () => this.getRoomList());
        document.getElementById('animal-chess-copy-code-btn').addEventListener('click', () => this.copyRoomCode());
        document.getElementById('animal-chess-start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('animal-chess-leave-room-btn').addEventListener('click', () => this.leaveRoom());
        document.getElementById('animal-chess-back-btn').addEventListener('click', () => this.backToSelection());
        
        // Gắn sự kiện nhấn Enter cho các input
        document.getElementById('animal-chess-username').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.login();
        });
        
        document.getElementById('animal-chess-room-id').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
    }
    
    // Đăng nhập
    login() {
        const usernameInput = document.getElementById('animal-chess-username');
        const username = usernameInput.value.trim();
        
        if (!username) {
            showNotification('Vui lòng nhập tên người chơi', true);
            return;
        }
        
        // Lưu username vào localStorage
        localStorage.setItem('animalChessUsername', username);
        this.username = username;
        
        // Hiển thị giao diện lobby
        this.showLobby();
        
        // Lấy danh sách phòng
        this.getRoomList();
    }
    
    // Hiển thị lobby
    showLobby() {
        document.querySelector('.login-section').style.display = 'none';
        document.querySelector('.animal-chess-online-content').style.display = 'block';
        document.querySelector('.animal-chess-lobby').style.display = 'block';
        document.querySelector('.animal-chess-room-info').style.display = 'none';
    }
    
    // Hiển thị đăng nhập
    showLogin() {
        document.querySelector('.login-section').style.display = 'block';
        document.querySelector('.animal-chess-online-content').style.display = 'none';
    }
    
    // Tạo phòng mới
    createRoom() {
        if (!this.username) {
            showNotification('Vui lòng đăng nhập trước', true);
            return;
        }
        
        this.socket.emit('animalChess:createRoom', {
            username: this.username
        });
    }
    
    // Tham gia phòng
    joinRoom() {
        if (!this.username) {
            showNotification('Vui lòng đăng nhập trước', true);
            return;
        }
        
        const roomIdInput = document.getElementById('animal-chess-room-id');
        const roomId = roomIdInput.value.trim();
        
        if (!roomId) {
            showNotification('Vui lòng nhập mã phòng', true);
            return;
        }
        
        this.socket.emit('animalChess:joinRoom', {
            roomId: roomId,
            username: this.username
        });
    }
    
    // Tham gia phòng từ danh sách
    joinSpecificRoom(roomId) {
        if (!this.username) {
            showNotification('Vui lòng đăng nhập trước', true);
            return;
        }
        
        this.socket.emit('animalChess:joinRoom', {
            roomId: roomId,
            username: this.username
        });
    }
    
    // Lấy danh sách phòng
    getRoomList() {
        this.socket.emit('animalChess:getRooms');
        
        const roomListContainer = document.querySelector('.animal-chess-room-list-container');
        const loadingRooms = roomListContainer.querySelector('.animal-chess-loading-rooms');
        const noRoomsMessage = roomListContainer.querySelector('.animal-chess-no-rooms-message');
        const roomList = roomListContainer.querySelector('.animal-chess-room-list');
        
        loadingRooms.style.display = 'block';
        noRoomsMessage.style.display = 'none';
        roomList.style.display = 'none';
        roomList.innerHTML = '';
    }
    
    // Cập nhật danh sách phòng
    updateRoomList(rooms) {
        const roomListContainer = document.querySelector('.animal-chess-room-list-container');
        const loadingRooms = roomListContainer.querySelector('.animal-chess-loading-rooms');
        const noRoomsMessage = roomListContainer.querySelector('.animal-chess-no-rooms-message');
        const roomList = roomListContainer.querySelector('.animal-chess-room-list');
        
        loadingRooms.style.display = 'none';
        
        if (!rooms || rooms.length === 0) {
            noRoomsMessage.style.display = 'block';
            roomList.style.display = 'none';
            return;
        }
        
        noRoomsMessage.style.display = 'none';
        roomList.style.display = 'block';
        roomList.innerHTML = '';
        
        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'animal-chess-room-item';
            
            const playerCount = room.players ? Object.keys(room.players).length : 0;
            const isFull = playerCount >= 2;
            
            roomItem.innerHTML = `
                <div class="animal-chess-room-info">
                    <div class="animal-chess-room-id">Phòng #${room.roomId}</div>
                    <div class="animal-chess-room-player">${playerCount}/2 người chơi</div>
                </div>
                <button class="animal-chess-join-room-btn" data-room-id="${room.roomId}" ${isFull ? 'disabled' : ''}>
                    ${isFull ? 'Đầy' : 'Tham gia'}
                </button>
            `;
            
            roomList.appendChild(roomItem);
            
            // Gắn sự kiện cho nút tham gia
            if (!isFull) {
                roomItem.querySelector('.animal-chess-join-room-btn').addEventListener('click', () => {
                    this.joinSpecificRoom(room.roomId);
                });
            }
        });
    }
    
    // Hiển thị thông tin phòng
    showAnimalChessRoomInfo(data) {
        document.querySelector('.animal-chess-lobby').style.display = 'none';
        document.querySelector('.animal-chess-room-info').style.display = 'block';
        
        const roomIdDisplay = document.querySelector('.animal-chess-room-id-display');
        const bluePlayer = document.querySelector('.animal-chess-blue-player');
        const redPlayer = document.querySelector('.animal-chess-red-player');
        const startGameBtn = document.getElementById('animal-chess-start-game-btn');
        
        roomIdDisplay.textContent = this.roomId;
        
        // Hiển thị thông tin người chơi
        if (data.players) {
            Object.keys(data.players).forEach(playerId => {
                const player = data.players[playerId];
                if (player.color === 'blue') {
                    bluePlayer.textContent = player.username;
                    if (player.username === this.username) {
                        this.playerColor = 'blue';
                    } else {
                        this.opponentUsername = player.username;
                    }
                } else if (player.color === 'red') {
                    redPlayer.textContent = player.username;
                    if (player.username === this.username) {
                        this.playerColor = 'red';
                    } else {
                        this.opponentUsername = player.username;
                    }
                }
            });
        }
        
        // Cho phép host bắt đầu trò chơi khi có đủ người chơi
        if (this.isHost) {
            startGameBtn.disabled = Object.keys(data.players || {}).length < 2;
        } else {
            startGameBtn.disabled = true;
        }
    }
    
    // Cập nhật thông tin phòng
    updateAnimalChessRoomInfo() {
        const bluePlayer = document.querySelector('.animal-chess-blue-player');
        const redPlayer = document.querySelector('.animal-chess-red-player');
        const startGameBtn = document.getElementById('animal-chess-start-game-btn');
        
        // Gửi yêu cầu lấy thông tin phòng hiện tại
        this.socket.emit('animalChess:getRoomInfo', { roomId: this.roomId });
        
        // Cho phép host bắt đầu trò chơi khi có đủ người chơi
        if (this.isHost) {
            if (this.opponentUsername) {
                startGameBtn.disabled = false;
                showNotification(`${this.opponentUsername} đã tham gia phòng`);
            } else {
                startGameBtn.disabled = true;
            }
        }
    }
    
    // Bắt đầu trò chơi
    startGame() {
        if (!this.isHost) {
            showNotification('Chỉ chủ phòng mới có thể bắt đầu trò chơi', true);
            return;
        }
        
        this.socket.emit('animalChess:startGame', { roomId: this.roomId });
    }
    
    // Khởi tạo trò chơi Cờ Thú
    startAnimalChessGame(data) {
        // Xóa giao diện phòng
        this.container.innerHTML = '';
        
        // Hiển thị thông tin trận đấu
        const matchInfo = document.createElement('div');
        matchInfo.className = 'animal-chess-match-info';
        matchInfo.innerHTML = `
            <div class="animal-chess-players">
                <div class="animal-chess-player ${this.playerColor === 'blue' ? 'animal-chess-current-player' : ''}">
                    <span class="animal-chess-blue-label">Quân Xanh:</span> 
                    <span class="animal-chess-blue-name">${this.playerColor === 'blue' ? this.username : this.opponentUsername}</span>
                    ${this.playerColor === 'blue' ? ' (Bạn)' : ''}
                </div>
                <div class="animal-chess-player ${this.playerColor === 'red' ? 'animal-chess-current-player' : ''}">
                    <span class="animal-chess-red-label">Quân Đỏ:</span> 
                    <span class="animal-chess-red-name">${this.playerColor === 'red' ? this.username : this.opponentUsername}</span>
                    ${this.playerColor === 'red' ? ' (Bạn)' : ''}
                </div>
            </div>
            <div class="animal-chess-room-code">Mã phòng: ${this.roomId}</div>
        `;
        this.container.appendChild(matchInfo);
        
        // Khởi tạo trò chơi
        this.game = new AnimalChess();
        this.game.init('animal-chess-game-container', 'online');
        
        // Ghi đè hàm handlePieceClick và handleCellClick để xử lý di chuyển quân trực tuyến
        const originalHandlePieceClick = this.game.handlePieceClick;
        this.game.handlePieceClick = (piece) => {
            // Chỉ cho phép di chuyển quân của mình trong lượt của mình
            if (this.game.currentPlayer === this.playerColor && piece.player === this.playerColor) {
                originalHandlePieceClick.call(this.game, piece);
            } else if (this.game.currentPlayer !== this.playerColor) {
                showNotification('Chưa đến lượt của bạn', true);
            }
        };
        
        const originalHandleCellClick = this.game.handleCellClick;
        this.game.handleCellClick = (row, col) => {
            // Chỉ cho phép di chuyển quân trong lượt của mình
            if (this.game.currentPlayer === this.playerColor) {
                if (this.game.selectedPiece) {
                    const piece = this.game.selectedPiece;
                    const move = this.game.getPossibleMoves(piece).find(m => m.row === row && m.col === col);
                    
                    if (move) {
                        // Gửi thông tin di chuyển lên server
                        this.sendMove(piece, row, col);
                    }
                }
                originalHandleCellClick.call(this.game, row, col);
            } else {
                showNotification('Chưa đến lượt của bạn', true);
            }
        };
        
        // Thêm nút thoát trận đấu
        const controls = document.createElement('div');
        controls.className = 'animal-chess-match-controls';
        controls.innerHTML = `
            <button id="animal-chess-leave-match-btn" class="animal-chess-button back-button">Thoát trận đấu</button>
        `;
        this.container.appendChild(controls);
        
        document.getElementById('animal-chess-leave-match-btn').addEventListener('click', () => this.leaveRoom());
        
        // Cập nhật trạng thái trò chơi
        this.game.currentPlayer = data.currentTurn || 'blue';
        this.game.updateStatus();
    }
    
    // Gửi thông tin di chuyển quân lên server
    sendMove(piece, toRow, toCol) {
        this.socket.emit('animalChess:makeMove', {
            roomId: this.roomId,
            move: {
                fromRow: piece.row,
                fromCol: piece.col,
                toRow: toRow,
                toCol: toCol,
                animal: piece.animal,
                player: piece.player
            }
        });
    }
    
    // Xử lý nước đi của đối thủ
    handleOpponentMove(moveData) {
        // Lấy quân cờ ở vị trí xuất phát
        const piece = this.game.getPieceAt(moveData.fromRow, moveData.fromCol);
        
        if (!piece) {
            console.error('Không tìm thấy quân cờ tại vị trí:', moveData.fromRow, moveData.fromCol);
            return;
        }
        
        // Kiểm tra quân tại vị trí đích
        const targetPiece = this.game.getPieceAt(moveData.toRow, moveData.toCol);
        if (targetPiece) {
            this.game.capturePiece(targetPiece);
        }
        
        // Di chuyển quân cờ
        this.game.movePiece(piece, moveData.toRow, moveData.toCol);
        
        // Kiểm tra điều kiện thắng
        this.game.checkWinCondition(piece);
        
        // Chuyển lượt nếu trò chơi vẫn đang diễn ra
        if (this.game.gameActive) {
            this.game.switchPlayer();
            this.game.updateStatus();
        }
    }
    
    // Cập nhật trạng thái trò chơi từ server
    updateAnimalChessGameState(gameState) {
        if (!this.game) return;
        
        // Cập nhật thông tin người chơi hiện tại
        this.game.currentPlayer = gameState.currentPlayer;
        
        // Cập nhật trạng thái trò chơi
        this.game.gameActive = gameState.gameActive;
        
        // Cập nhật danh sách quân cờ
        this.game.pieces.forEach(p => p.element.remove());
        this.game.pieces = [];
        
        gameState.pieces.forEach(pieceData => {
            this.game.createPiece(pieceData);
        });
        
        // Cập nhật hiển thị
        this.game.updateStatus();
    }
    
    // Xử lý kết thúc trò chơi
    handleGameEnd(result) {
        if (!this.game) return;
        
        // Cập nhật trạng thái trò chơi
        this.game.gameActive = false;
        
        // Hiển thị thông báo kết quả
        let message = '';
        if (result.winner === this.playerColor) {
            message = 'Bạn đã thắng!';
        } else if (result.winner === 'draw') {
            message = 'Trò chơi hòa!';
        } else {
            message = 'Bạn đã thua!';
        }
        
        // Hiển thị thông báo
        showNotification(message);
        
        // Cập nhật trạng thái
        this.game.updateStatus(message);
        
        // Hiển thị hộp thoại kết quả
        this.showGameResult(result);
    }
    
    // Hiển thị kết quả trò chơi
    showGameResult(result) {
        // Tạo hộp thoại kết quả
        const resultModal = document.createElement('div');
        resultModal.className = 'animal-chess-result-modal';
        resultModal.innerHTML = `
            <div class="animal-chess-result-content">
                <h3>Kết quả trận đấu</h3>
                <div class="animal-chess-result-message">
                    ${result.winner === this.playerColor ? 
                        '<div class="animal-chess-win">Bạn đã thắng!</div>' : 
                        result.winner === 'draw' ? 
                            '<div class="animal-chess-draw">Trận đấu hòa!</div>' : 
                            '<div class="animal-chess-lose">Bạn đã thua!</div>'
                    }
                </div>
                <div class="animal-chess-result-details">
                    <div class="animal-chess-player-result">
                        <span class="animal-chess-player-name">${this.username}</span>
                        <span class="animal-chess-player-color">(${this.playerColor === 'blue' ? 'Xanh' : 'Đỏ'})</span>
                    </div>
                    <div class="animal-chess-player-result">
                        <span class="animal-chess-player-name">${this.opponentUsername}</span>
                        <span class="animal-chess-player-color">(${this.playerColor === 'blue' ? 'Đỏ' : 'Xanh'})</span>
                    </div>
                </div>
                <div class="animal-chess-result-actions">
                    <button id="animal-chess-play-again-btn" class="animal-chess-button">Chơi lại</button>
                    <button id="animal-chess-back-to-lobby-btn" class="animal-chess-button">Trở về sảnh</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(resultModal);
        
        // Gắn sự kiện cho các nút
        document.getElementById('animal-chess-play-again-btn').addEventListener('click', () => {
            // Yêu cầu chơi lại
            this.socket.emit('animalChess:playAgain', { roomId: this.roomId });
            resultModal.remove();
        });
        
        document.getElementById('animal-chess-back-to-lobby-btn').addEventListener('click', () => {
            this.leaveRoom();
            resultModal.remove();
        });
    }
    
    // Xử lý khi người chơi rời phòng
    handlePlayerLeft(data) {
        if (!this.gameStarted) {
            // Nếu trò chơi chưa bắt đầu, cập nhật thông tin phòng
            this.updateAnimalChessRoomInfo();
            showNotification(`${data.username} đã rời phòng`);
        } else {
            // Nếu trò chơi đã bắt đầu, hiển thị thông báo và kết thúc trò chơi
            showNotification(`${data.username} đã thoát khỏi trận đấu. Bạn thắng!`);
            
            // Cập nhật trạng thái trò chơi
            if (this.game) {
                this.game.gameActive = false;
                this.game.updateStatus(`${data.username} đã thoát. Bạn thắng!`);
                
                // Hiển thị kết quả
                this.handleGameEnd({ winner: this.playerColor });
            }
        }
    }
    
    // Rời phòng
    leaveRoom() {
        if (this.roomId) {
            this.socket.emit('animalChess:leaveRoom', {
                roomId: this.roomId
            });
            
            this.roomId = null;
            this.isHost = false;
            this.playerColor = null;
            this.opponentUsername = null;
            this.gameStarted = false;
            
            // Xóa trò chơi
            if (this.game) {
                this.game = null;
            }
            
            // Quay lại màn hình lobby
            this.showAnimalChessOnline();
            this.showLobby();
        } else {
            this.backToSelection();
        }
    }
    
    // Sao chép mã phòng
    copyRoomCode() {
        const roomIdDisplay = document.querySelector('.animal-chess-room-id-display');
        const roomId = roomIdDisplay.textContent;
        
        if (roomId) {
            navigator.clipboard.writeText(roomId)
                .then(() => {
                    showNotification('Đã sao chép mã phòng vào clipboard');
                })
                .catch(err => {
                    console.error('Không thể sao chép:', err);
                    showNotification('Không thể sao chép mã phòng', true);
                });
        }
    }
    
    // Quay lại màn hình chọn chế độ chơi
    backToSelection() {
        if (this.roomId) {
            this.leaveRoom();
        }
        
        this.container.style.display = 'none';
        this.animalChessSelection.style.display = 'block';
    }
}

// Hàm hiển thị thông báo
function showNotification(message, isError = false) {
    // Kiểm tra nếu đã có hàm showNotification toàn cục
    if (window.showNotification) {
        window.showNotification(message, isError);
        return;
    }
    
    // Tạo thông báo mới
    const notification = document.createElement('div');
    notification.className = 'notification';
    if (isError) {
        notification.classList.add('error');
    }
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Hiển thị thông báo
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Ẩn thông báo sau 3 giây
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Khởi tạo chế độ chơi trực tuyến khi được yêu cầu
window.startAnimalChessOnline = function() {
    const animalChessOnline = new AnimalChessOnline();
    animalChessOnline.showAnimalChessOnline();
    return animalChessOnline;
}; 