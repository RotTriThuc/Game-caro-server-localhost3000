// Online game functionality
class OnlineGame {
    constructor() {
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
        this.lastMoveRef = null;
        
        // Bind event listeners
        this.bindEvents();
    }
    
    // Set up event listeners
    bindEvents() {
        this.loginBtn.addEventListener('click', () => this.login());
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.copyRoomCodeBtn.addEventListener('click', () => this.copyRoomCode());
        
        // Listen for auth state changes
        auth.onAuthStateChanged(user => {
            if (user) {
                this.currentUser = user;
                this.showLobby();
            } else {
                this.currentUser = null;
                this.showLogin();
            }
        });
    }
    
    // Anonymous login with the provided display name
    login() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            showNotification('Vui lòng nhập tên của bạn', true);
            return;
        }
        
        // Show loading state
        this.loginBtn.disabled = true;
        this.loginBtn.textContent = 'Đang đăng nhập...';
        
        // Try to use current anonymous user if already authenticated
        if (auth.currentUser) {
            auth.currentUser.updateProfile({
                displayName: playerName
            })
            .then(() => {
                this.currentUser = auth.currentUser;
                this.showLobby();
                this.loginBtn.disabled = false;
                this.loginBtn.textContent = 'Xác nhận';
            })
            .catch(error => {
                console.error('Error updating profile:', error);
                showNotification('Không thể cập nhật tên người dùng. Vui lòng thử lại sau.', true);
                this.loginBtn.disabled = false;
                this.loginBtn.textContent = 'Xác nhận';
            });
            return;
        }
        
        // Sign in anonymously if not already signed in
        auth.signInAnonymously()
            .then(result => {
                // Update the user's profile with the display name
                return result.user.updateProfile({
                    displayName: playerName
                });
            })
            .then(() => {
                this.currentUser = auth.currentUser;
                this.showLobby();
                this.loginBtn.disabled = false;
                this.loginBtn.textContent = 'Xác nhận';
            })
            .catch(error => {
                console.error('Error signing in:', error);
                
                // Handle specific error codes
                let errorMessage = 'Không thể đăng nhập. Vui lòng thử lại sau.';
                
                if (error.code === 'auth/operation-not-allowed') {
                    errorMessage = 'Đăng nhập ẩn danh chưa được bật trong dự án Firebase.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.';
                } else if (error.code === 'auth/device-already-logged-in') {
                    // This is a custom error we're checking for from our server
                    errorMessage = error.message || 'Thiết bị này đã đăng nhập với một tài khoản khác. Vui lòng đăng xuất trước.';
                }
                
                showNotification(errorMessage, true);
                this.loginBtn.disabled = false;
                this.loginBtn.textContent = 'Xác nhận';
            });
    }
    
    // Show the lobby screen
    showLobby() {
        this.onlineLoginSection.style.display = 'none';
        this.onlineLobbySection.style.display = 'block';
        this.roomInfoSection.style.display = 'none';
        
        this.currentPlayerDisplay.textContent = this.currentUser.displayName;
    }
    
    // Show the login screen
    showLogin() {
        this.onlineLoginSection.style.display = 'block';
        this.onlineLobbySection.style.display = 'none';
        this.roomInfoSection.style.display = 'none';
    }
    
    // Create a new game room
    createRoom() {
        const roomId = generateRoomId();
        const roomRef = database.ref(`rooms/${roomId}`);
        
        // Set up the room with initial data
        roomRef.set({
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            player1: {
                id: this.currentUser.uid,
                name: this.currentUser.displayName
            },
            player2: null,
            gameState: {
                board: [],
                currentPlayer: 'X',
                gameActive: true,
                size: 15,
                lastMove: null
            },
            status: 'waiting' // waiting, playing, finished
        })
        .then(() => {
            this.currentRoom = roomId;
            this.isPlayer1 = true;
            this.myTurn = true; // Player 1 (X) goes first
            this.joinRoomListeners(roomId);
            this.showRoomInfo(roomId);
        })
        .catch(error => {
            console.error('Error creating room:', error);
            showNotification('Không thể tạo phòng. Vui lòng thử lại sau.', true);
        });
    }
    
    // Join an existing room
    joinRoom() {
        const roomId = this.roomIdInput.value.trim();
        if (!roomId) {
            showNotification('Vui lòng nhập mã phòng', true);
            return;
        }
        
        const roomRef = database.ref(`rooms/${roomId}`);
        
        roomRef.once('value')
            .then(snapshot => {
                const roomData = snapshot.val();
                if (!roomData) {
                    showNotification('Phòng không tồn tại', true);
                    return;
                }
                
                if (roomData.status !== 'waiting') {
                    showNotification('Phòng đã đầy hoặc trận đấu đã kết thúc', true);
                    return;
                }
                
                if (roomData.player2) {
                    showNotification('Phòng đã đầy', true);
                    return;
                }
                
                // Join as player 2
                return roomRef.child('player2').set({
                    id: this.currentUser.uid,
                    name: this.currentUser.displayName
                })
                .then(() => {
                    return roomRef.child('status').set('playing');
                })
                .then(() => {
                    this.currentRoom = roomId;
                    this.isPlayer1 = false;
                    this.myTurn = false; // Player 2 (O) goes second
                    this.joinRoomListeners(roomId);
                    this.showRoomInfo(roomId);
                });
            })
            .catch(error => {
                console.error('Error joining room:', error);
                showNotification('Không thể tham gia phòng. Vui lòng thử lại sau.', true);
            });
    }
    
    // Show room information
    showRoomInfo(roomId) {
        this.onlineLoginSection.style.display = 'none';
        this.onlineLobbySection.style.display = 'none';
        this.roomInfoSection.style.display = 'block';
        
        this.roomCodeDisplay.textContent = roomId;
    }
    
    // Set up listeners for the room
    joinRoomListeners(roomId) {
        const roomRef = database.ref(`rooms/${roomId}`);
        
        // Listen for player changes
        roomRef.child('player1').on('value', snapshot => {
            const player1 = snapshot.val();
            if (player1) {
                this.player1NameDisplay.textContent = player1.name;
            } else {
                this.player1NameDisplay.textContent = 'Đang chờ...';
            }
        });
        
        roomRef.child('player2').on('value', snapshot => {
            const player2 = snapshot.val();
            if (player2) {
                this.player2NameDisplay.textContent = player2.name;
                this.waitingMessage.style.display = 'none';
                // If both players are present, start the game
                this.startGame();
            } else {
                this.player2NameDisplay.textContent = 'Đang chờ...';
                this.waitingMessage.style.display = 'block';
            }
        });
        
        // Listen for game state changes
        roomRef.child('gameState').on('value', snapshot => {
            const gameState = snapshot.val();
            if (gameState) {
                this.updateGameState(gameState);
            }
        });
        
        // Set up presence to handle disconnects
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', snapshot => {
            if (snapshot.val() === true) {
                // We're connected (or reconnected)
                // Set up presence
                const presenceRef = roomRef.child(this.isPlayer1 ? 'player1/online' : 'player2/online');
                
                // When this client disconnects, remove the 'online' status
                presenceRef.onDisconnect().set(false);
                
                // Set the client as online
                presenceRef.set(true);
            }
        });
    }
    
    // Start the game
    startGame() {
        this.gameStarted = true;
        // Tell the main game to start an online game
        window.startOnlineGame(this.isPlayer1, this.currentRoom);
    }
    
    // Update the game state based on server data
    updateGameState(gameState) {
        if (!this.gameStarted) return;
        
        // Update whose turn it is
        const isMyTurn = (gameState.currentPlayer === 'X' && this.isPlayer1) ||
                          (gameState.currentPlayer === 'O' && !this.isPlayer1);
        
        if (isMyTurn !== this.myTurn) {
            this.myTurn = isMyTurn;
            // Tell the main game whose turn it is
            window.updateOnlineTurn(this.myTurn);
        }
        
        // Update the board based on the last move
        if (gameState.lastMove && 
            (!this.lastMoveRef || 
             gameState.lastMove.row !== this.lastMoveRef.row || 
             gameState.lastMove.col !== this.lastMoveRef.col)) {
            
            this.lastMoveRef = gameState.lastMove;
            // Tell the main game to update the board
            window.updateOnlineBoard(gameState.board, gameState.lastMove);
        }
    }
    
    // Make a move in the online game
    makeMove(row, col, value) {
        if (!this.currentRoom || !this.myTurn) return false;
        
        const roomRef = database.ref(`rooms/${this.currentRoom}`);
        
        // Update the game state in Firebase
        roomRef.child('gameState').transaction(gameState => {
            if (!gameState) return null;
            
            // Make sure it's a valid move
            if (gameState.board[row] && gameState.board[row][col] === '') {
                // Update the board
                gameState.board[row][col] = value;
                // Switch players
                gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
                // Record the last move
                gameState.lastMove = { row, col, value };
            }
            
            return gameState;
        })
        .then(result => {
            if (!result.committed) {
                console.error('Failed to commit move');
                showNotification('Không thể thực hiện nước đi', true);
            }
        })
        .catch(error => {
            console.error('Error making move:', error);
            showNotification('Lỗi khi thực hiện nước đi', true);
        });
        
        return true;
    }
    
    // Initialize the board in Firebase
    initializeBoard(size) {
        if (!this.currentRoom) return;
        
        const roomRef = database.ref(`rooms/${this.currentRoom}`);
        
        // Create an empty board of the given size
        const board = [];
        for (let i = 0; i < size; i++) {
            const row = [];
            for (let j = 0; j < size; j++) {
                row.push('');
            }
            board.push(row);
        }
        
        // Update the game state in Firebase
        roomRef.child('gameState').update({
            board,
            size,
            currentPlayer: 'X',
            gameActive: true,
            lastMove: null
        });
    }
    
    // Reset the game
    resetGame() {
        if (!this.currentRoom) return;
        
        const roomRef = database.ref(`rooms/${this.currentRoom}`);
        
        // Update the game state in Firebase
        roomRef.child('gameState').once('value')
            .then(snapshot => {
                const gameState = snapshot.val();
                if (!gameState) return;
                
                const size = gameState.size;
                
                // Create an empty board
                const board = [];
                for (let i = 0; i < size; i++) {
                    const row = [];
                    for (let j = 0; j < size; j++) {
                        row.push('');
                    }
                    board.push(row);
                }
                
                // Reset the game state
                return roomRef.child('gameState').update({
                    board,
                    currentPlayer: 'X',
                    gameActive: true,
                    lastMove: null
                });
            })
            .catch(error => {
                console.error('Error resetting game:', error);
                showNotification('Không thể thiết lập lại trò chơi', true);
            });
    }
    
    // Leave the current room
    leaveRoom() {
        if (!this.currentRoom) return;
        
        const roomRef = database.ref(`rooms/${this.currentRoom}`);
        
        // Remove the player from the room
        if (this.isPlayer1) {
            roomRef.child('player1').remove();
        } else {
            roomRef.child('player2').remove();
        }
        
        // If the room is now empty, remove it
        roomRef.once('value')
            .then(snapshot => {
                const roomData = snapshot.val();
                if (!roomData || (!roomData.player1 && !roomData.player2)) {
                    roomRef.remove();
                }
            });
        
        // Clean up listeners
        roomRef.off();
        
        // Reset state
        this.currentRoom = null;
        this.isPlayer1 = false;
        this.gameStarted = false;
        this.myTurn = false;
        this.lastMoveRef = null;
        
        // Back to lobby
        this.showLobby();
        
        // Tell the main game we've left
        window.leaveOnlineGame();
    }
    
    // Copy the room code to clipboard
    copyRoomCode() {
        if (!this.currentRoom) return;
        
        // Create a temporary input element
        const tempInput = document.createElement('input');
        tempInput.value = this.currentRoom;
        document.body.appendChild(tempInput);
        
        // Select and copy the text
        tempInput.select();
        document.execCommand('copy');
        
        // Remove the temporary element
        document.body.removeChild(tempInput);
        
        // Show notification
        showNotification('Đã sao chép mã phòng vào clipboard');
    }
}

// Initialize the online game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.onlineGame = new OnlineGame();
}); 