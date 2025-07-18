class RankedGame {
    constructor() {
        // Kết nối Socket.IO
        this.socket = io();
        
        // DOM elements
        this.rankedPlayerNameInput = document.getElementById('ranked-player-name');
        this.rankedPlayerPasswordInput = document.getElementById('ranked-player-password');
        this.rankedLoginBtn = document.getElementById('ranked-login-btn');
        this.rankedRegisterBtn = document.getElementById('ranked-register-btn');
        this.rankedBackBtn = document.getElementById('ranked-back-btn');
        this.findMatchBtn = document.getElementById('find-match-btn');
        this.cancelMatchBtn = document.getElementById('cancel-match-btn');
        this.leaveRankedMatchBtn = document.getElementById('leave-ranked-match-btn');
        this.closeResultBtn = document.getElementById('close-result-btn');
        this.refreshLeaderboardBtn = document.getElementById('refresh-leaderboard-btn');
        this.rankedInfoBtn = document.getElementById('ranked-info-btn');
        this.rankedRoomsBtn = document.getElementById('ranked-rooms-btn');
        this.rankedBackToMenuBtn = document.getElementById('ranked-back-to-menu-btn');
        
        // Thêm các phần tử DOM cho danh sách phòng
        this.rankedRoomListContainer = document.getElementById('ranked-room-list-container');
        this.refreshRankedRoomsBtn = document.getElementById('refresh-ranked-rooms-btn');
        this.createRankedRoomBtn = document.getElementById('create-ranked-room-btn');
        this.rankedRoomIdInput = document.getElementById('ranked-room-id-input');
        this.joinRankedRoomBtn = document.getElementById('join-ranked-room-btn');
        
        // Display elements
        this.rankedCurrentPlayerDisplay = document.getElementById('ranked-current-player');
        this.playerRankDisplay = document.getElementById('player-rank');
        this.playerEloDisplay = document.getElementById('player-elo');
        this.rankBadge = document.getElementById('rank-badge');
        this.leaderboardContainer = document.getElementById('leaderboard-container');
        this.findingMatchSection = document.getElementById('finding-match');
        this.rankedPlayer1NameDisplay = document.getElementById('ranked-player1-name');
        this.rankedPlayer2NameDisplay = document.getElementById('ranked-player2-name');
        this.rankedPlayer1EloDisplay = document.getElementById('ranked-player1-elo');
        this.rankedPlayer2EloDisplay = document.getElementById('ranked-player2-elo');
        
        // Match result elements
        this.matchResultSection = document.getElementById('match-result');
        this.resultStatusDisplay = document.getElementById('result-status');
        this.oldEloDisplay = document.getElementById('old-elo');
        this.newEloDisplay = document.getElementById('new-elo');
        this.eloDiffDisplay = document.getElementById('elo-diff');
        
        // Sections
        this.rankedLoginSection = document.getElementById('ranked-login');
        this.rankedLobbySection = document.getElementById('ranked-lobby');
        this.rankedMatchInfoSection = document.getElementById('ranked-match-info');
        this.rankedRoomSection = document.getElementById('ranked-room-section');
        
        // Game state
        this.currentUser = null;
        this.currentMatch = null;
        this.isPlayer1 = false;
        this.matchStarted = false;
        this.myTurn = false;
        this.isSearchingMatch = false;
        
        // Kiểm tra kết nối ban đầu
        if (!this.socket.connected) {
            showNotification('Đang kết nối đến máy chủ...', false);
        }
        
        // Bind event listeners
        this.bindEvents();
        this.setupSocketListeners();
    }
    
    // Thiết lập các sự kiện socket
    setupSocketListeners() {
        // Sự kiện kết nối
        this.socket.on('connect', () => {
            console.log('Đã kết nối đến máy chủ');
            showNotification('Đã kết nối đến máy chủ', false);
        });
        
        // Đăng nhập thành công
        this.socket.on('ranked_login_success', (user) => {
            this.currentUser = user;
            this.showRankedLobby();
            this.updatePlayerInfo(user);
            this.rankedLoginBtn.disabled = false;
            this.rankedLoginBtn.textContent = 'Đăng nhập';
            
            // Tự động lấy bảng xếp hạng
            this.getLeaderboard();
        });
        
        // Đăng ký thành công
        this.socket.on('ranked_register_success', (user) => {
            this.currentUser = user;
            this.showRankedLobby();
            this.updatePlayerInfo(user);
            this.rankedRegisterBtn.disabled = false;
            this.rankedRegisterBtn.textContent = 'Đăng ký';
            
            // Tự động lấy bảng xếp hạng
            this.getLeaderboard();
        });
        
        // Xử lý khi bị đăng xuất cưỡng chế
        this.socket.on('forced_logout', ({ message }) => {
            // Nếu đang trong trận đấu hoặc phòng, rời đi
            if (this.currentMatch) {
                this.leaveMatch();
            }

            // Đặt lại trạng thái người dùng
            this.currentUser = null;
            this.currentMatch = null;
            this.isPlayer1 = false;
            this.matchStarted = false;
            this.myTurn = false;
            this.isSearchingMatch = false;
            
            // Hiển thị thông báo
            showNotification(message, true);
            
            // Chuyển về màn hình đăng nhập
            this.showRankedLogin();
        });
        
        // Đăng xuất thành công
        this.socket.on('ranked_logout_success', () => {
            // Hiển thị thông báo
            showNotification('Đăng xuất thành công', false);
            
            // Đã xử lý trong hàm logout, nhưng đảm bảo đặt lại trạng thái để chắc chắn
            this.currentUser = null;
        });
        
        // Nhận bảng xếp hạng
        this.socket.on('leaderboard', (leaderboard) => {
            this.updateLeaderboard(leaderboard);
        });
        
        // Nhận danh sách phòng xếp hạng
        this.socket.on('ranked_room_list', (rooms) => {
            console.log(`[DEBUG] Nhận sự kiện ranked_room_list với ${rooms.length} phòng`);
            
            // Kiểm tra xem có phòng nào của người dùng hiện tại không
            const userRooms = rooms.filter(r => r.player1.id === this.socket.id);
            if (userRooms.length > 0) {
                console.log(`[DEBUG] Tìm thấy ${userRooms.length} phòng của người dùng hiện tại:`, 
                    userRooms.map(r => ({id: r.id, player: r.player1.username})));
            } else {
                console.log(`[DEBUG] Không tìm thấy phòng nào của người dùng hiện tại`);
                
                // Kiểm tra nếu người dùng đang có phòng nhưng không có trong danh sách
                if (this.currentMatch && this.isPlayer1) {
                    console.log(`[DEBUG] Người dùng đang có phòng ${this.currentMatch.id} nhưng không có trong danh sách`);
                    
                    // Thêm phòng hiện tại vào danh sách
                    rooms.push({
                        id: this.currentMatch.id,
                        player1: {
                            id: this.socket.id,
                            username: this.currentUser.username,
                            elo: this.currentUser.elo
                        }
                    });
                    
                    console.log(`[DEBUG] Đã thêm phòng hiện tại ${this.currentMatch.id} vào danh sách`);
                }
            }
            
            // In ra danh sách tất cả các phòng nhận được
            if (rooms.length > 0) {
                console.log(`[DEBUG] Các phòng nhận được:`, rooms.map(r => ({id: r.id, player: r.player1.username})));
            }
            
            this.updateRankedRoomList(rooms);
        });
        
        // Tạo phòng xếp hạng thành công
        this.socket.on('ranked_room_created', (room) => {
            console.log('[DEBUG] Nhận sự kiện ranked_room_created:', room);
            showNotification('Đã tạo phòng thành công', false);
            
            // Khôi phục trạng thái nút
            if (this.createRankedRoomBtn) {
                this.createRankedRoomBtn.disabled = false;
                this.createRankedRoomBtn.textContent = 'Tạo phòng mới';
            }
            
            // Hiển thị thông tin phòng
            this.showRankedRoomInfo(room);
            
            // Làm mới danh sách phòng sau một khoảng thời gian ngắn
            setTimeout(() => {
                console.log('[DEBUG] Làm mới danh sách phòng sau khi tạo phòng');
                this.socket.emit('get_ranked_rooms');
            }, 500);
        });
        
        // Cập nhật danh sách phòng
        this.socket.on('ranked_room_updated', () => {
            console.log('[DEBUG] Nhận sự kiện ranked_room_updated');
            // Nếu đang ở màn hình danh sách phòng, làm mới danh sách
            if (this.rankedRoomSection && this.rankedRoomSection.style.display !== 'none') {
                console.log('[DEBUG] Đang ở màn hình danh sách phòng, làm mới danh sách');
                this.getRankedRooms();
            } else {
                console.log('[DEBUG] Không ở màn hình danh sách phòng, bỏ qua làm mới');
            }
        });
        
        // Tìm trận đấu thành công
        this.socket.on('match_found', (match) => {
            console.log('Nhận sự kiện match_found:', match);
            this.currentMatch = match;
            this.isPlayer1 = match.player1.id === this.socket.id;
            this.isSearchingMatch = false;
            
            // Xóa timeout nếu đang tham gia phòng
            if (this.joinRoomTimeout) {
                clearTimeout(this.joinRoomTimeout);
                this.joinRoomTimeout = null;
                
                // Khôi phục trạng thái nút
                if (this.joinRankedRoomBtn) {
                    this.joinRankedRoomBtn.disabled = false;
                    this.joinRankedRoomBtn.textContent = 'Vào phòng';
                }
            }
            
            // Hiển thị thông tin trận đấu
            this.showMatchInfo(match);
            
            // Bắt đầu trận đấu
            this.startMatch();
        });
        
        // Cập nhật trận đấu
        this.socket.on('match_update', (matchState) => {
            this.updateMatchState(matchState);
        });
        
        // Kết thúc trận đấu
        this.socket.on('match_end', (result) => {
            this.showMatchResult(result);
        });
        
        // Đối thủ rời trận
        this.socket.on('opponent_left', () => {
            showNotification('Đối thủ đã rời trận đấu', false);
            
            // Đặt lại trạng thái
            this.currentMatch = null;
            
            // Nếu trận đấu đã bắt đầu, xử lý như thắng do đối thủ bỏ cuộc
            if (this.matchStarted) {
                this.socket.emit('forfeit_win');
                this.matchStarted = false;
            } else {
                // Nếu trận đấu chưa bắt đầu, quay lại màn hình tìm trận
                this.isPlayer1 = false;
                this.myTurn = false;
                
                // Ẩn bàn cờ
                if (typeof window.hideGameBoard === 'function') {
                    window.hideGameBoard();
                }
                
                this.showRankedLobby();
                
                // Cập nhật danh sách phòng sau khi đối thủ rời đi
                setTimeout(() => this.getRankedRooms(), 500);
            }
        });
        
        // Lỗi
        this.socket.on('ranked_error', ({ message }) => {
            showNotification(message, true);
            
            // Khôi phục trạng thái nút
            this.rankedLoginBtn.disabled = false;
            this.rankedLoginBtn.textContent = 'Đăng nhập';
            this.rankedRegisterBtn.disabled = false;
            this.rankedRegisterBtn.textContent = 'Đăng ký';
            this.findMatchBtn.disabled = false;
            this.findMatchBtn.textContent = 'Tìm trận đấu';
            
            // Khôi phục trạng thái nút phòng
            if (this.createRankedRoomBtn) {
                this.createRankedRoomBtn.disabled = false;
            }
            if (this.joinRankedRoomBtn) {
                this.joinRankedRoomBtn.disabled = false;
            }
        });
        
        // Thêm xử lý lỗi kết nối và timeout
        this.socket.on('connect_error', () => {
            showNotification('Lỗi kết nối đến máy chủ', true);
            this.resetButtonStates();
        });
        
        this.socket.on('connect_timeout', () => {
            showNotification('Kết nối đến máy chủ bị timeout', true);
            this.resetButtonStates();
        });
        
        this.socket.on('error', (error) => {
            showNotification('Đã xảy ra lỗi: ' + error.message, true);
            this.resetButtonStates();
        });
    }
    
    // Khôi phục trạng thái các nút
    resetButtonStates() {
        this.rankedLoginBtn.disabled = false;
        this.rankedLoginBtn.textContent = 'Đăng nhập';
        this.rankedRegisterBtn.disabled = false;
        this.rankedRegisterBtn.textContent = 'Đăng ký';
        this.findMatchBtn.disabled = false;
        this.findMatchBtn.textContent = 'Tìm trận đấu';
        
        // Khôi phục trạng thái nút phòng
        if (this.createRankedRoomBtn) {
            this.createRankedRoomBtn.disabled = false;
        }
        if (this.joinRankedRoomBtn) {
            this.joinRankedRoomBtn.disabled = false;
        }
    }
    
    // Thiết lập các sự kiện giao diện
    bindEvents() {
        // Đăng nhập
        this.rankedLoginBtn.addEventListener('click', () => this.login());
        // Đăng ký
        this.rankedRegisterBtn.addEventListener('click', () => this.register());
        // Quay lại màn hình chọn chế độ chơi
        this.rankedBackBtn.addEventListener('click', () => this.backToGameSelection());
        
        // Nút quay lại từ lobby về menu chính
        if (this.rankedBackToMenuBtn) {
            this.rankedBackToMenuBtn.addEventListener('click', () => this.backToGameSelection());
        }
        
        // Nút hiển thị thông tin hạng
        if (this.rankedInfoBtn) {
            this.rankedInfoBtn.addEventListener('click', () => this.showRankInfo());
        }
        
        // Tìm trận đấu
        this.findMatchBtn.addEventListener('click', () => this.findMatch());
        // Hủy tìm trận
        this.cancelMatchBtn.addEventListener('click', () => this.cancelFindMatch());
        // Rời trận đấu
        this.leaveRankedMatchBtn.addEventListener('click', () => this.leaveMatch());
        // Đóng kết quả trận đấu
        this.closeResultBtn.addEventListener('click', () => this.closeMatchResult());
        // Làm mới bảng xếp hạng
        this.refreshLeaderboardBtn.addEventListener('click', () => this.getLeaderboard());
        
        // Thêm sự kiện cho nút đăng xuất
        if (document.getElementById('ranked-logout-btn')) {
            document.getElementById('ranked-logout-btn').addEventListener('click', () => this.logout());
        }
        
        // Thêm sự kiện cho nút đăng xuất trong màn hình phòng
        if (document.getElementById('ranked-logout-btn-room')) {
            document.getElementById('ranked-logout-btn-room').addEventListener('click', () => this.logout());
        }
        
        // Thêm sự kiện cho phần phòng xếp hạng
        if (this.refreshRankedRoomsBtn) {
            this.refreshRankedRoomsBtn.addEventListener('click', () => this.getRankedRooms());
        }
        
        if (this.createRankedRoomBtn) {
            this.createRankedRoomBtn.addEventListener('click', () => this.createRankedRoom());
        }
        
        if (this.joinRankedRoomBtn) {
            this.joinRankedRoomBtn.addEventListener('click', () => {
                const roomId = this.rankedRoomIdInput.value.trim();
                if (roomId) {
                    this.joinRankedRoom(roomId);
                } else {
                    showNotification('Vui lòng nhập mã phòng', true);
                }
            });
        }
        
        // Nút quay lại từ màn hình danh sách phòng
        const backToLobbyBtn = document.getElementById('back-to-ranked-lobby-btn');
        if (backToLobbyBtn) {
            backToLobbyBtn.addEventListener('click', () => this.showRankedLobby());
        }
        
        // Nút vào danh sách phòng
        if (this.rankedRoomsBtn) {
            this.rankedRoomsBtn.addEventListener('click', () => this.showRankedRoomList());
        }
    }
    
    // Đăng nhập
    login() {
        const playerName = this.rankedPlayerNameInput.value.trim();
        const password = this.rankedPlayerPasswordInput.value.trim();
        
        if (!playerName || !password) {
            showNotification('Vui lòng nhập tên và mật khẩu', true);
            return;
        }
        
        // Kiểm tra kết nối socket
        if (!this.socket.connected) {
            showNotification('Không thể kết nối đến máy chủ. Vui lòng làm mới trang và thử lại.', true);
            return;
        }
        
        // Hiển thị trạng thái đang tải
        this.rankedLoginBtn.disabled = true;
        this.rankedLoginBtn.textContent = 'Đang đăng nhập...';
        
        // Gửi yêu cầu đăng nhập
        this.socket.emit('ranked_login', { username: playerName, password });
        
        // Thiết lập timeout để tránh treo giao diện
        setTimeout(() => {
            if (this.rankedLoginBtn.textContent === 'Đang đăng nhập...') {
                this.rankedLoginBtn.disabled = false;
                this.rankedLoginBtn.textContent = 'Đăng nhập';
                showNotification('Đăng nhập quá thời gian, vui lòng thử lại', true);
            }
        }, 10000); // Timeout sau 10 giây
    }
    
    // Đăng ký
    register() {
        const playerName = this.rankedPlayerNameInput.value.trim();
        const password = this.rankedPlayerPasswordInput.value.trim();
        
        if (!playerName || !password) {
            showNotification('Vui lòng nhập tên và mật khẩu', true);
            return;
        }
        
        if (password.length < 6) {
            showNotification('Mật khẩu phải có ít nhất 6 ký tự', true);
            return;
        }
        
        // Kiểm tra kết nối socket
        if (!this.socket.connected) {
            showNotification('Không thể kết nối đến máy chủ. Vui lòng làm mới trang và thử lại.', true);
            return;
        }
        
        // Hiển thị trạng thái đang tải
        this.rankedRegisterBtn.disabled = true;
        this.rankedRegisterBtn.textContent = 'Đang đăng ký...';
        
        // Gửi yêu cầu đăng ký
        this.socket.emit('ranked_register', { username: playerName, password });
        
        // Thiết lập timeout để tránh treo giao diện
        setTimeout(() => {
            if (this.rankedRegisterBtn.textContent === 'Đang đăng ký...') {
                this.rankedRegisterBtn.disabled = false;
                this.rankedRegisterBtn.textContent = 'Đăng ký';
                showNotification('Đăng ký quá thời gian, vui lòng thử lại', true);
            }
        }, 10000); // Timeout sau 10 giây
    }
    
    // Cập nhật thông tin người chơi
    updatePlayerInfo(user) {
        this.rankedCurrentPlayerDisplay.textContent = user.username;
        this.playerEloDisplay.textContent = user.elo;
        
        // Xác định hạng dựa trên điểm Elo
        const rank = this.getRankFromElo(user.elo);
        this.playerRankDisplay.textContent = rank.name;
        
        // Xóa tất cả các class rank cũ
        this.rankBadge.classList.remove('rank-bronze', 'rank-silver', 'rank-gold', 'rank-platinum', 'rank-diamond', 'rank-master');
        
        // Thêm class rank mới
        this.rankBadge.classList.add(rank.class);
    }
    
    // Lấy hạng từ điểm Elo
    getRankFromElo(elo) {
        if (elo < 800) {
            return { name: 'Đồng', class: 'rank-bronze' };
        } else if (elo < 1200) {
            return { name: 'Bạc', class: 'rank-silver' };
        } else if (elo < 1600) {
            return { name: 'Vàng', class: 'rank-gold' };
        } else if (elo < 2000) {
            return { name: 'Bạch Kim', class: 'rank-platinum' };
        } else if (elo < 2400) {
            return { name: 'Kim Cương', class: 'rank-diamond' };
        } else {
            return { name: 'Cao Thủ', class: 'rank-master' };
        }
    }
    
    // Lấy bảng xếp hạng
    getLeaderboard() {
        if (!this.currentUser) return;
        
        // Hiển thị trạng thái đang tải
        if (this.refreshLeaderboardBtn) {
            this.refreshLeaderboardBtn.disabled = true;
            this.refreshLeaderboardBtn.textContent = 'Đang tải...';
        }
        
        this.leaderboardContainer.innerHTML = '<div class="loading-leaderboard">Đang tải bảng xếp hạng...</div>';
        
        // Gửi yêu cầu lấy bảng xếp hạng
        this.socket.emit('get_leaderboard');
        
        // Khôi phục nút sau 1 giây
        setTimeout(() => {
            if (this.refreshLeaderboardBtn) {
                this.refreshLeaderboardBtn.disabled = false;
                this.refreshLeaderboardBtn.textContent = 'Làm mới';
            }
        }, 1000);
    }
    
    // Lấy danh sách phòng xếp hạng
    getRankedRooms() {
        if (!this.currentUser) return;
        
        // Hiển thị trạng thái đang tải trực tiếp
        if (this.rankedRoomListContainer) {
            this.rankedRoomListContainer.innerHTML = '<div class="loading-rooms">Đang tải danh sách phòng...</div>';
        }

        // Tạm thời tắt nút làm mới
        if (this.refreshRankedRoomsBtn) {
            this.refreshRankedRoomsBtn.disabled = true;
            this.refreshRankedRoomsBtn.textContent = 'Đang tải...';
        }
        
        // Gửi yêu cầu lấy danh sách phòng
        this.socket.emit('get_ranked_rooms', { forceUpdate: true });
        console.log('[DEBUG] getRankedRooms - Đã gửi yêu cầu lấy danh sách phòng với forceUpdate=true');
        
        // Khôi phục nút sau 1 giây
        setTimeout(() => {
            if (this.refreshRankedRoomsBtn) {
                this.refreshRankedRoomsBtn.disabled = false;
                this.refreshRankedRoomsBtn.textContent = 'Làm mới';
            }
        }, 1000);
    }
    
    // Cập nhật danh sách phòng xếp hạng
    updateRankedRoomList(rooms) {
        console.log('[DEBUG] updateRankedRoomList được gọi với số phòng:', rooms.length);
        
        if (!this.rankedRoomListContainer) {
            console.log('[DEBUG] Không có container danh sách phòng, bỏ qua cập nhật');
            return;
        }
        
        // Xóa nội dung cũ
        this.rankedRoomListContainer.innerHTML = '';
        
        // Force kiểm tra sự tồn tại của phòng hiện tại
        if (this.currentMatch && this.isPlayer1) {
            // Kiểm tra xem currentMatch có trong danh sách không
            const currentMatchExists = rooms.some(room => room.id === this.currentMatch.id);
            
            if (!currentMatchExists) {
                console.log('[DEBUG] Phòng hiện tại không có trong danh sách, thử thêm vào');
                
                // Kiểm tra xem tất cả các phòng có phòng nào được tạo bởi người chơi hiện tại không
                const userHasRoom = rooms.some(room => room.player1.id === this.socket.id);
                
                if (!userHasRoom) {
                    console.log('[DEBUG] Thêm phòng hiện tại vào danh sách phòng');
                    
                    // Nếu phòng hiện tại không có trong danh sách, thêm nó vào
                    rooms.push({
                        id: this.currentMatch.id,
                        player1: {
                            id: this.socket.id,
                            username: this.currentUser.username,
                            elo: this.currentUser.elo
                        }
                    });
                }
            }
        }
        
        // Nếu không có phòng nào
        if (rooms.length === 0) {
            console.log('[DEBUG] Không có phòng nào để hiển thị');
            const noRoomsMsg = document.createElement('div');
            noRoomsMsg.className = 'no-rooms-message';
            noRoomsMsg.textContent = 'Không có phòng nào đang mở.';
            this.rankedRoomListContainer.appendChild(noRoomsMsg);
            return;
        }
        
        // Tạo danh sách phòng
        const roomList = document.createElement('ul');
        roomList.className = 'room-list';
        
        rooms.forEach(room => {
            console.log('[DEBUG] Xử lý phòng để hiển thị:', room.id, 'của người chơi:', room.player1.username);
            
            const roomItem = document.createElement('li');
            roomItem.className = 'room-item';
            
            // Lấy hạng của người tạo phòng
            const rank = this.getRankFromElo(room.player1.elo);
            
            // Kiểm tra xem đây có phải là phòng của người chơi hiện tại không
            const isOwnRoom = this.currentMatch && this.isPlayer1 && this.currentMatch.id === room.id;
            const isCurrentUser = room.player1.id === this.socket.id;
            
            console.log('[DEBUG] Phòng', room.id, 'isOwnRoom:', isOwnRoom, 'isCurrentUser:', isCurrentUser);
            console.log('[DEBUG] currentMatch:', this.currentMatch?.id, 'isPlayer1:', this.isPlayer1);
            
            roomItem.innerHTML = `
                <div class="room-info">
                    <div class="room-id">${room.id}</div>
                    <div class="room-player">
                        <span>${room.player1.username}</span>
                        <span class="player-elo">(${room.player1.elo})</span>
                        <span class="rank-badge ${rank.class}" style="font-size: 10px; padding: 2px 5px;">${rank.name}</span>
                        ${isCurrentUser ? '<span class="own-room-label">(Phòng của bạn)</span>' : ''}
                    </div>
                </div>
                ${isCurrentUser ? `<button class="view-room-btn" data-room-id="${room.id}">Vào phòng</button>` : `<button class="join-room-btn" data-room-id="${room.id}">Tham gia</button>`}
            `;
            
            roomList.appendChild(roomItem);
        });
        
        this.rankedRoomListContainer.appendChild(roomList);
        console.log('[DEBUG] Đã render', rooms.length, 'phòng vào danh sách');
        
        // Thêm sự kiện cho nút tham gia
        const joinButtons = this.rankedRoomListContainer.querySelectorAll('.join-room-btn');
        joinButtons.forEach(button => {
            button.addEventListener('click', () => {
                const roomId = button.getAttribute('data-room-id');
                this.joinRankedRoom(roomId);
            });
        });
        
        // Thêm sự kiện cho nút vào phòng của chính người dùng
        const viewButtons = this.rankedRoomListContainer.querySelectorAll('.view-room-btn');
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const roomId = button.getAttribute('data-room-id');
                console.log('[DEBUG] Người chơi đang vào phòng của chính mình:', roomId);
                
                // Tìm thông tin phòng
                for (const room of rooms) {
                    if (room.id === roomId) {
                        this.showRankedRoomInfo(room);
                        break;
                    }
                }
            });
        });
    }
    
    // Tạo phòng xếp hạng
    createRankedRoom() {
        if (!this.currentUser) return;
        
        // Đảm bảo không còn tham chiếu đến phòng hoặc trận đấu nào
        this.currentMatch = null;
        this.isPlayer1 = false;
        this.matchStarted = false;
        this.myTurn = false;
        
        // Hiển thị trạng thái đang tải
        if (this.createRankedRoomBtn) {
            this.createRankedRoomBtn.disabled = true;
            this.createRankedRoomBtn.textContent = 'Đang tạo phòng...';
        }
        
        // Gửi yêu cầu tạo phòng ngay lập tức
            this.socket.emit('create_ranked_room');
        console.log('[DEBUG] Đã gửi yêu cầu tạo phòng mới');
            
            // Thiết lập timeout để tránh treo giao diện
            setTimeout(() => {
                if (this.createRankedRoomBtn && this.createRankedRoomBtn.textContent === 'Đang tạo phòng...') {
                    this.createRankedRoomBtn.disabled = false;
                    this.createRankedRoomBtn.textContent = 'Tạo phòng mới';
                    showNotification('Tạo phòng quá thời gian, vui lòng thử lại', true);
                }
            }, 5000);
    }
    
    // Tham gia phòng xếp hạng
    joinRankedRoom(roomId) {
        if (!this.currentUser) return;
        
        // Kiểm tra xem người chơi có đang cố tham gia vào phòng của chính họ hay không
        if (this.currentMatch && this.isPlayer1 && this.currentMatch.id === roomId) {
            showNotification('Bạn không thể tham gia vào phòng của chính mình', true);
            return;
        }
        
        // Hiển thị trạng thái đang tải
        if (this.joinRankedRoomBtn) {
            this.joinRankedRoomBtn.disabled = true;
            this.joinRankedRoomBtn.textContent = 'Đang tham gia...';
        }
        
        // Gửi yêu cầu tham gia phòng
        this.socket.emit('join_ranked_room', roomId);
        
        // Thiết lập timeout để tránh treo giao diện
        this.joinRoomTimeout = setTimeout(() => {
            if (this.joinRankedRoomBtn && this.joinRankedRoomBtn.textContent === 'Đang tham gia...') {
                this.joinRankedRoomBtn.disabled = false;
                this.joinRankedRoomBtn.textContent = 'Vào phòng';
                showNotification('Tham gia phòng quá thời gian, vui lòng thử lại', true);
            }
        }, 5000);
    }
    
    // Hiển thị thông tin phòng xếp hạng
    showRankedRoomInfo(room) {
        console.log('[DEBUG] showRankedRoomInfo được gọi với:', room);
        // Chuyển sang màn hình thông tin trận đấu
        this.currentMatch = room;
        this.isPlayer1 = true; // Người tạo phòng luôn là người chơi 1
        this.showMatchInfo(room);
    }
    
    // Hiển thị màn hình danh sách phòng xếp hạng
    showRankedRoomList() {
        if (!this.rankedRoomSection) return;
        
        this.rankedLoginSection.style.display = 'none';
        this.rankedLobbySection.style.display = 'none';
        this.rankedMatchInfoSection.style.display = 'none';
        this.rankedRoomSection.style.display = 'block';
        this.matchResultSection.style.display = 'none';
        
        // Ẩn bàn cờ và reset game
        if (typeof window.hideGameBoard === 'function') {
            window.hideGameBoard();
        }
        
        // Hủy interval refresh danh sách phòng nếu có
        if (this._roomListRefreshInterval) {
            clearInterval(this._roomListRefreshInterval);
            this._roomListRefreshInterval = null;
        }
        
        // Đồng bộ thông tin người chơi
        const currentPlayerRoom = document.getElementById('ranked-current-player-room');
        const playerRankRoom = document.getElementById('player-rank-room');
        const playerEloRoom = document.getElementById('player-elo-room');
        const rankBadgeRoom = document.getElementById('rank-badge-room');
        
        if (currentPlayerRoom && this.currentUser) {
            currentPlayerRoom.textContent = this.currentUser.username;
        }
        
        if (playerEloRoom && this.currentUser) {
            playerEloRoom.textContent = this.currentUser.elo;
        }
        
        if (playerRankRoom && rankBadgeRoom && this.currentUser) {
            const rank = this.getRankFromElo(this.currentUser.elo);
            playerRankRoom.textContent = rank.name;
            
            // Xóa tất cả các class rank cũ
            rankBadgeRoom.classList.remove('rank-bronze', 'rank-silver', 'rank-gold', 'rank-platinum', 'rank-diamond', 'rank-master');
            
            // Thêm class rank mới
            rankBadgeRoom.classList.add(rank.class);
        }
        
        // Lấy danh sách phòng và hiển thị trạng thái đang tải
        if (this.rankedRoomListContainer) {
            this.rankedRoomListContainer.innerHTML = '<div class="loading-rooms">Đang tải danh sách phòng...</div>';
        }
        
        // Gửi yêu cầu lấy danh sách phòng
        this.socket.emit('get_ranked_rooms', { forceUpdate: true });
        console.log('[DEBUG] showRankedRoomList - Đã yêu cầu danh sách phòng mới nhất');
        
        // Thiết lập auto refresh mỗi 5 giây
        if (this._roomListRefreshInterval) {
            clearInterval(this._roomListRefreshInterval);
        }
        
        this._roomListRefreshInterval = setInterval(() => {
            if (this.rankedRoomSection && this.rankedRoomSection.style.display !== 'none') {
                console.log('[DEBUG] Auto-refresh danh sách phòng');
                this.socket.emit('get_ranked_rooms', { forceUpdate: true });
            } else {
                // Nếu không còn ở màn hình danh sách phòng nữa, hủy interval
                clearInterval(this._roomListRefreshInterval);
                this._roomListRefreshInterval = null;
            }
        }, 5000);
    }
    
    // Cập nhật bảng xếp hạng
    updateLeaderboard(leaderboard) {
        if (!this.leaderboardContainer) return;
        
        // Xóa nội dung cũ
        this.leaderboardContainer.innerHTML = '';
        
        // Nếu không có người chơi nào
        if (leaderboard.length === 0) {
            const noPlayersMsg = document.createElement('div');
            noPlayersMsg.className = 'loading-leaderboard';
            noPlayersMsg.textContent = 'Chưa có người chơi nào trong bảng xếp hạng.';
            this.leaderboardContainer.appendChild(noPlayersMsg);
            return;
        }
        
        // Tạo bảng xếp hạng
        const table = document.createElement('table');
        table.className = 'leaderboard-table';
        
        // Tạo header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th class="rank-cell">Hạng</th>
            <th class="name-cell">Tên</th>
            <th class="elo-cell">Elo</th>
        `;
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Tạo body
        const tbody = document.createElement('tbody');
        
        leaderboard.forEach((player, index) => {
            const row = document.createElement('tr');
            const rank = this.getRankFromElo(player.elo);
            
            // Highlight hàng của người chơi hiện tại
            if (this.currentUser && player.username === this.currentUser.username) {
                row.classList.add('current-player-row');
            }
            
            row.innerHTML = `
                <td class="rank-cell">${index + 1}</td>
                <td class="name-cell">
                    ${player.username}
                    <span class="rank-badge ${rank.class}" style="font-size: 10px; padding: 2px 5px;">${rank.name}</span>
                </td>
                <td class="elo-cell">${player.elo}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        this.leaderboardContainer.appendChild(table);
    }
    
    // Tìm trận đấu
    findMatch() {
        if (!this.currentUser) return;
        
        // Hiển thị trạng thái đang tìm trận
        this.findMatchBtn.disabled = true;
        this.findMatchBtn.style.display = 'none';
        this.findingMatchSection.style.display = 'flex';
        this.isSearchingMatch = true;
        
        // Gửi yêu cầu tìm trận
        this.socket.emit('find_match');
    }
    
    // Hủy tìm trận đấu
    cancelFindMatch() {
        if (!this.isSearchingMatch) return;
        
        // Gửi yêu cầu hủy tìm trận
        this.socket.emit('cancel_find_match');
        
        // Khôi phục giao diện
        this.findMatchBtn.disabled = false;
        this.findMatchBtn.style.display = 'block';
        this.findingMatchSection.style.display = 'none';
        this.isSearchingMatch = false;
    }
    
    // Hiển thị thông tin trận đấu
    showMatchInfo(match) {
        // Cập nhật thông tin người chơi
        this.rankedPlayer1NameDisplay.textContent = match.player1.username;
        this.rankedPlayer2NameDisplay.textContent = match.player2.username;
        this.rankedPlayer1EloDisplay.textContent = `(${match.player1.elo})`;
        this.rankedPlayer2EloDisplay.textContent = `(${match.player2.elo})`;
        
        // Hiển thị màn hình thông tin trận đấu
        this.rankedLoginSection.style.display = 'none';
        this.rankedLobbySection.style.display = 'none';
        this.rankedMatchInfoSection.style.display = 'block';
        
        // Đảm bảo kết quả trận đấu không hiển thị
        this.matchResultSection.style.display = 'none';
    }
    
    // Bắt đầu trận đấu
    startMatch() {
        this.matchStarted = true;
        this.myTurn = this.isPlayer1; // Người chơi 1 (X) đi trước
        
        console.log('Bắt đầu trận đấu xếp hạng, isPlayer1:', this.isPlayer1);
        
        // Đảm bảo các phần khác được ẩn đi
        if (this.rankedRoomSection) {
            this.rankedRoomSection.style.display = 'none';
        }
        
        // Bắt đầu game trên giao diện
        window.startOnlineGame(this.isPlayer1, 'ranked');
        
        // Cập nhật bàn cờ nếu có dữ liệu
        if (this.currentMatch && this.currentMatch.gameState) {
            console.log('Cập nhật bàn cờ từ dữ liệu trận đấu:', this.currentMatch.gameState);
            window.updateOnlineBoard(this.currentMatch.gameState.board, this.currentMatch.gameState.lastMove);
        }
        
        // Cập nhật trạng thái lượt đi
        console.log('Cập nhật lượt đi, myTurn:', this.myTurn);
        window.updateOnlineTurn(this.myTurn);
    }
    
    // Cập nhật trạng thái trận đấu
    updateMatchState(matchState) {
        // Cập nhật bàn cờ
        window.updateOnlineBoard(matchState.board, matchState.lastMove);
        
        // Cập nhật lượt đi
        const isMyTurn = (matchState.currentPlayer === 'X' && this.isPlayer1) || 
                         (matchState.currentPlayer === 'O' && !this.isPlayer1);
        window.updateOnlineTurn(isMyTurn);
        this.myTurn = isMyTurn;
    }
    
    // Hiển thị kết quả trận đấu
    showMatchResult(result) {
        const roomId = this.currentMatch?.id;
        
        // Cập nhật nội dung kết quả
        this.resultStatusDisplay.textContent = result.result;
        this.resultStatusDisplay.className = 'result-status';
        
        // Thêm class dựa vào kết quả
        if (result.result === 'Thắng!') {
            this.resultStatusDisplay.classList.add('win');
        } else if (result.result === 'Thua!') {
            this.resultStatusDisplay.classList.add('lose');
        } else {
            this.resultStatusDisplay.classList.add('draw');
        }
        
        // Cập nhật thay đổi Elo
        this.oldEloDisplay.textContent = result.oldElo;
        this.newEloDisplay.textContent = result.newElo;
        
        const eloDiff = result.newElo - result.oldElo;
        if (eloDiff > 0) {
            this.eloDiffDisplay.textContent = `(+${eloDiff})`;
            this.eloDiffDisplay.classList.add('positive');
            this.eloDiffDisplay.classList.remove('negative');
        } else {
            this.eloDiffDisplay.textContent = `(${eloDiff})`;
            this.eloDiffDisplay.classList.add('negative');
            this.eloDiffDisplay.classList.remove('positive');
        }
        
        // Hiển thị kết quả
        this.matchResultSection.style.display = 'block';
        
        // Cập nhật thông tin người chơi
        if (this.currentUser) {
            this.currentUser.elo = result.newElo;
            this.updatePlayerInfo(this.currentUser);
        }
        
        // Xóa tham chiếu đến phòng và trận đấu
        this.currentMatch = null;
        this.isPlayer1 = false;
        this.matchStarted = false;
        this.myTurn = false;
    }
    
    // Đóng kết quả trận đấu
    closeMatchResult() {
        // Nếu có một trận đấu đang diễn ra, hãy đảm bảo rời khỏi nó
        if (this.currentMatch) {
            // Gửi yêu cầu rời trận nếu chưa rời
            this.socket.emit('leave_match');
        }
        
        if (this.matchResultSection) {
        this.matchResultSection.style.display = 'none';
        }
        
        // Đặt lại trạng thái
        this.currentMatch = null;
        this.isPlayer1 = false;
        this.matchStarted = false;
        this.myTurn = false;
        
        // Ẩn bàn cờ
        if (typeof window.hideGameBoard === 'function') {
            window.hideGameBoard();
        }
        
        // Quay lại màn hình lobby
        this.showRankedLobby();
        
        // Cập nhật danh sách phòng sau 500ms để đảm bảo server đã xử lý xong
        setTimeout(() => this.getRankedRooms(), 500);
    }
    
    // Rời trận đấu
    leaveMatch() {
        if (this.currentMatch) {
        // Gửi yêu cầu rời trận
        this.socket.emit('leave_match');
        
        // Đặt lại trạng thái
        this.currentMatch = null;
        this.isPlayer1 = false;
        this.matchStarted = false;
        this.myTurn = false;
            
            // Ẩn bàn cờ
            if (typeof window.hideGameBoard === 'function') {
                window.hideGameBoard();
            }
        }
        
        // Quay lại màn hình lobby
        this.showRankedLobby();
    }
    
    // Thực hiện nước đi
    makeMove(row, col) {
        if (!this.currentMatch || !this.myTurn) {
            console.log('Không thể đánh cờ:', !this.currentMatch ? 'Không có trận đấu' : 'Không phải lượt của bạn');
            return false;
        }
        
        console.log(`Đang gửi nước đi [${row}, ${col}] lên server`);
        
        // Gửi nước đi lên server
        this.socket.emit('ranked_move', { row, col });
        
        // Tạm thời tắt lượt đi
        this.myTurn = false;
        window.updateOnlineTurn(false);
        
        return true;
    }
    
    // Hiển thị màn hình đăng nhập xếp hạng
    showRankedLogin() {
        // Hiển thị phần đăng nhập
        this.rankedLoginSection.style.display = 'block';
        
        // Ẩn các phần khác
        this.rankedLobbySection.style.display = 'none';
        this.rankedRoomSection.style.display = 'none';
        this.rankedMatchInfoSection.style.display = 'none';
        this.matchResultSection.style.display = 'none';
        this.findingMatchSection.style.display = 'none';
        
        // Xóa thông tin đăng nhập cũ
        if (this.rankedPlayerNameInput) this.rankedPlayerNameInput.value = '';
        if (this.rankedPlayerPasswordInput) this.rankedPlayerPasswordInput.value = '';

        // Bỏ vô hiệu hóa các nút nếu có
        if (this.rankedLoginBtn) {
            this.rankedLoginBtn.disabled = false;
            this.rankedLoginBtn.textContent = 'Đăng nhập';
        }
        
        if (this.rankedRegisterBtn) {
            this.rankedRegisterBtn.disabled = false;
            this.rankedRegisterBtn.textContent = 'Đăng ký';
        }
    }
    
    // Hiển thị màn hình lobby
    showRankedLobby() {
        this.rankedLoginSection.style.display = 'none';
        this.rankedLobbySection.style.display = 'block';
        this.rankedMatchInfoSection.style.display = 'none';
        this.rankedRoomSection.style.display = 'none';
        this.matchResultSection.style.display = 'none';
        
        // Khôi phục nút tìm trận
        this.findMatchBtn.disabled = false;
        this.findMatchBtn.style.display = 'block';
        this.findingMatchSection.style.display = 'none';
        this.isSearchingMatch = false;
        
        // Ẩn bàn cờ và reset game
        if (typeof window.hideGameBoard === 'function') {
            window.hideGameBoard();
        }
        
        // Hủy interval refresh danh sách phòng nếu có
        if (this._roomListRefreshInterval) {
            clearInterval(this._roomListRefreshInterval);
            this._roomListRefreshInterval = null;
        }
        
        // Tự động cập nhật danh sách phòng
        setTimeout(() => {
            this.socket.emit('get_ranked_rooms');
        }, 300);
    }
    
    // Hiển thị thông tin về các hạng
    showRankInfo() {
        // Tạo phần tử chứa bảng thông tin hạng
        const rankInfoModal = document.createElement('div');
        rankInfoModal.className = 'modal';
        rankInfoModal.id = 'rank-info-modal';
        rankInfoModal.style.position = 'fixed';
        rankInfoModal.style.zIndex = '1000';
        rankInfoModal.style.left = '0';
        rankInfoModal.style.top = '0';
        rankInfoModal.style.width = '100%';
        rankInfoModal.style.height = '100%';
        rankInfoModal.style.backgroundColor = 'rgba(0,0,0,0.7)';
        rankInfoModal.style.display = 'flex';
        rankInfoModal.style.justifyContent = 'center';
        rankInfoModal.style.alignItems = 'center';
        
        // Tạo nội dung modal
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = '#1e1e1e';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.maxWidth = '500px';
        modalContent.style.width = '80%';
        modalContent.style.color = 'white';
        modalContent.style.position = 'relative';
        
        // Tạo nút đóng
        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        closeButton.style.position = 'absolute';
        closeButton.style.right = '10px';
        closeButton.style.top = '10px';
        closeButton.style.backgroundColor = '#c00';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '50%';
        closeButton.style.width = '30px';
        closeButton.style.height = '30px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(rankInfoModal);
        });
        
        // Tiêu đề
        const title = document.createElement('h2');
        title.textContent = 'Thông tin hạng';
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        
        // Tạo bảng thông tin hạng
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';
        
        // Tạo header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const headers = ['Hạng', 'Điểm Elo', 'Điểm cần thêm'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.padding = '8px';
            th.style.borderBottom = '2px solid #444';
            th.style.textAlign = 'left';
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Tạo body
        const tbody = document.createElement('tbody');
        
        // Danh sách hạng và điểm Elo cần thiết
        const ranks = [
            { name: 'Đồng', minElo: 0, maxElo: 799, class: 'rank-bronze' },
            { name: 'Bạc', minElo: 800, maxElo: 1199, class: 'rank-silver' },
            { name: 'Vàng', minElo: 1200, maxElo: 1599, class: 'rank-gold' },
            { name: 'Bạch Kim', minElo: 1600, maxElo: 1999, class: 'rank-platinum' },
            { name: 'Kim Cương', minElo: 2000, maxElo: 2399, class: 'rank-diamond' },
            { name: 'Cao Thủ', minElo: 2400, maxElo: 9999, class: 'rank-master' }
        ];
        
        // Lấy hạng hiện tại của người chơi
        let currentElo = 0;
        let currentRank = null;
        
        if (this.currentUser) {
            currentElo = this.currentUser.elo;
            for (let i = 0; i < ranks.length; i++) {
                if (currentElo >= ranks[i].minElo && currentElo <= ranks[i].maxElo) {
                    currentRank = ranks[i];
                    break;
                }
            }
        }
        
        // Thêm dòng cho mỗi hạng
        ranks.forEach(rank => {
            const row = document.createElement('tr');
            
            // Nếu là hạng hiện tại của người chơi, đánh dấu
            if (currentRank && rank.name === currentRank.name) {
                row.style.backgroundColor = '#333';
            }
            
            // Cột tên hạng
            const rankCell = document.createElement('td');
            rankCell.style.padding = '8px';
            rankCell.style.borderBottom = '1px solid #444';
            
            const rankBadge = document.createElement('span');
            rankBadge.className = `rank-badge ${rank.class}`;
            rankBadge.textContent = rank.name;
            rankBadge.style.padding = '3px 6px';
            rankBadge.style.borderRadius = '3px';
            rankBadge.style.marginRight = '5px';
            
            rankCell.appendChild(rankBadge);
            row.appendChild(rankCell);
            
            // Cột khoảng điểm Elo
            const eloCell = document.createElement('td');
            eloCell.textContent = rank.maxElo === 9999 ? `${rank.minElo}+` : `${rank.minElo} - ${rank.maxElo}`;
            eloCell.style.padding = '8px';
            eloCell.style.borderBottom = '1px solid #444';
            row.appendChild(eloCell);
            
            // Cột điểm cần thêm để lên hạng tiếp theo
            const nextRankElo = document.createElement('td');
            
            if (currentRank && rank.name === currentRank.name && rank.name !== 'Cao Thủ') {
                // Tìm hạng tiếp theo
                const nextRank = ranks[ranks.indexOf(rank) + 1];
                const pointsNeeded = nextRank.minElo - currentElo;
                nextRankElo.textContent = `${pointsNeeded} điểm để lên ${nextRank.name}`;
                nextRankElo.style.color = '#4CAF50'; // Màu xanh lá
            } else if (currentRank && rank.name === currentRank.name && rank.name === 'Cao Thủ') {
                nextRankElo.textContent = 'Đã đạt hạng cao nhất';
                nextRankElo.style.color = '#FFD700'; // Màu vàng
            } else {
                nextRankElo.textContent = '-';
            }
            
            nextRankElo.style.padding = '8px';
            nextRankElo.style.borderBottom = '1px solid #444';
            row.appendChild(nextRankElo);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        
        // Thông tin bổ sung
        const info = document.createElement('div');
        info.innerHTML = `
            <p style="margin-bottom: 10px;">Thắng trận: +15~25 điểm Elo</p>
            <p style="margin-bottom: 10px;">Thua trận: -15~25 điểm Elo</p>
            <p>Chênh lệch Elo càng lớn giữa 2 người chơi, điểm thưởng/phạt càng ít khi thắng người yếu hơn hoặc thua người mạnh hơn.</p>
        `;
        
        // Thêm các phần tử vào modal
        modalContent.appendChild(closeButton);
        modalContent.appendChild(title);
        modalContent.appendChild(table);
        modalContent.appendChild(info);
        rankInfoModal.appendChild(modalContent);
        
        // Thêm modal vào body
        document.body.appendChild(rankInfoModal);
        
        // Đóng modal khi click bên ngoài
        rankInfoModal.addEventListener('click', (event) => {
            if (event.target === rankInfoModal) {
                document.body.removeChild(rankInfoModal);
            }
        });
    }
    
    // Đăng xuất
    logout() {
        // Hủy interval refresh danh sách phòng nếu có
        if (this._roomListRefreshInterval) {
            clearInterval(this._roomListRefreshInterval);
            this._roomListRefreshInterval = null;
        }
        
        // Gửi yêu cầu đăng xuất
        this.socket.emit('ranked_logout');
        
        // Đặt lại trạng thái
        this.currentUser = null;
        this.currentMatch = null;
        this.isPlayer1 = false;
        this.matchStarted = false;
        this.myTurn = false;
        this.isSearchingMatch = false;
        
        // Xóa thông tin người chơi trên giao diện (để tránh hiển thị thông tin cũ)
        if (this.rankedCurrentPlayerDisplay) this.rankedCurrentPlayerDisplay.textContent = '';
        if (this.playerEloDisplay) this.playerEloDisplay.textContent = '';
        if (this.playerRankDisplay) this.playerRankDisplay.textContent = '';
        
        // Xóa thông tin phòng và bảng xếp hạng
        if (this.rankedRoomListContainer) this.rankedRoomListContainer.innerHTML = '';
        if (this.leaderboardContainer) this.leaderboardContainer.innerHTML = '';
        
        // Đặt lại hiển thị của tất cả các phần
        this.rankedLoginSection.style.display = 'block';
        this.rankedLobbySection.style.display = 'none';
        this.rankedMatchInfoSection.style.display = 'none';
        this.rankedRoomSection.style.display = 'none';
        this.matchResultSection.style.display = 'none';
        this.findingMatchSection.style.display = 'none';
        
        // Quay lại màn hình đăng nhập
        this.showRankedLogin();
    }

    // Quay lại màn hình chọn chế độ chơi
    backToGameSelection() {
        // Đặt lại trạng thái hiển thị của tất cả các phần trong ranked settings
        this.rankedLoginSection.style.display = 'block';
        this.rankedLobbySection.style.display = 'none';
        this.rankedMatchInfoSection.style.display = 'none';
        this.rankedRoomSection.style.display = 'none';
        this.matchResultSection.style.display = 'none';
        this.findingMatchSection.style.display = 'none';
        
        // Ẩn màn hình settings của game xếp hạng
        document.getElementById('ranked-settings').style.display = 'none';
        
        // Hiện màn hình chọn loại game thay vì chọn chế độ chơi
        document.getElementById('game-type-selection').style.display = 'block';
        document.getElementById('game-selection').style.display = 'none';
        
        // Ẩn màn hình chọn chế độ cờ thú nếu có
        const animalChessSelection = document.getElementById('animal-chess-selection');
        if (animalChessSelection) {
            animalChessSelection.style.display = 'none';
        }
        
        // Đặt lại giá trị các ô nhập liệu
        if (this.rankedPlayerNameInput) this.rankedPlayerNameInput.value = '';
        if (this.rankedPlayerPasswordInput) this.rankedPlayerPasswordInput.value = '';
    }
}

// Khởi tạo khi trang đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    window.rankedGame = new RankedGame();
}); 