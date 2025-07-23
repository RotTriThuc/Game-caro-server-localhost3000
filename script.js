document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const board = document.getElementById('board');
    const boardContainer = document.getElementById('board-container');
    const boardWrapper = document.getElementById('board-wrapper');
    const status = document.getElementById('status');
    const resetBtn = document.getElementById('reset-btn');
    const backBtn = document.getElementById('back-btn');
    const boardSizeSelect = document.getElementById('board-size-select');
    const customBoardSizeContainer = document.getElementById('custom-board-size-container');
    const customSizeInput = document.getElementById('custom-size');
    const gameModeSelect = document.getElementById('game-mode-select');
    const aiDifficultySelect = document.getElementById('ai-difficulty-select');
    const aiDifficultyContainer = document.getElementById('ai-difficulty-container');
    const localGameBtn = document.getElementById('local-game-btn');
    const aiGameBtn = document.getElementById('ai-game-btn');
    const onlineGameBtn = document.getElementById('online-game-btn');
    const rankedGameBtn = document.getElementById('ranked-game-btn');
    const startLocalGameBtn = document.getElementById('start-local-game-btn');
    const rulesToggle = document.getElementById('rules-toggle');
    const rulesContent = document.getElementById('rules-content');
    const toggleIcon = document.querySelector('.toggle-icon');
    
    // Zoom controls
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomValue = document.getElementById('zoom-value');
    const resetPositionBtn = document.getElementById('reset-position');
    
    // Sections
    const gameTypeSelection = document.getElementById('game-type-selection');
    const gameSelectionSection = document.getElementById('game-selection');
    const localSettingsSection = document.getElementById('local-settings');
    const onlineSettingsSection = document.getElementById('online-settings');
    const rankedSettingsSection = document.getElementById('ranked-settings');
    const gameBoardContainer = document.getElementById('game-board-container');
    
    // Game state
    let size = parseInt(boardSizeSelect.value);
    let currentPlayer = 'X';
    let gameBoard = [];
    let gameActive = true;
    let isAIMode = false;
    let isOnlineMode = false;
    let aiDifficulty = 'medium';
    let isAIThinking = false;
    let canMakeMove = true;
    let lastMoveCell = null;
    let zoomLevel = 100; // Mức zoom mặc định là 100%
    
    // Variables for board dragging
    let isDragging = false;
    let wasDragging = false;
    let startX, startY;
    let scrollLeft, scrollTop;
    let translateX = 0;
    let translateY = 0;
    let moveDistance = 0; // Biến theo dõi khoảng cách di chuyển
    
    // Variables to store winning line info
    let winningDirection = -1;
    let winningPosition = [-1, -1];
    
    // Initialize game board array
    function initGameBoard() {
        gameBoard = [];
        for (let i = 0; i < size; i++) {
            gameBoard[i] = [];
            for (let j = 0; j < size; j++) {
                gameBoard[i][j] = '';
            }
        }
        console.log(`Đã khởi tạo mảng bàn cờ ${size}x${size}`);
    }
    
    // Create the game board
    function createBoard() {
        board.innerHTML = '';
        
        // Thêm class cho bàn cờ lớn trước khi thiết lập kích thước
        if (size > 30) {
            board.classList.add('large-board');
        } else {
            board.classList.remove('large-board');
        }
        
        // Cập nhật CSS grid dựa trên kích thước
        const cellSize = getCellSize();
        board.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
        board.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
        
        // Tạo các ô cho bàn cờ
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener('click', handleCellClick);
                
                // Thêm nội dung trống để đảm bảo ô có kích thước tối thiểu
                cell.innerHTML = '&nbsp;';
                cell.textContent = '';
                
                board.appendChild(cell);
            }
        }
        
        // Log để debug
        console.log(`Đã tạo bàn cờ ${size}x${size} với kích thước ô ${cellSize}px`);
    }
    
    // Toggle rules section
    function toggleRules() {
        rulesContent.classList.toggle('active');
        toggleIcon.classList.toggle('active');
    }
    
    // Lấy kích thước ô phù hợp dựa trên kích thước bàn cờ
    function getCellSize() {
        // Kích thước cơ bản cho các màn hình lớn
        let baseSize = 40;
        
        // Điều chỉnh kích thước dựa trên số ô
        if (size > 50) {
            baseSize = 12; // Tăng kích thước cho bàn cờ 70x70
        } else if (size > 30) {
            baseSize = 15;
        } else if (size > 20) {
            baseSize = 30;
        } else if (size > 15) {
            baseSize = 35;
        }
        
        // Điều chỉnh thêm cho màn hình nhỏ
        if (window.innerWidth <= 768) {
            baseSize = Math.min(baseSize, 20);
            if (window.innerWidth <= 480) {
                baseSize = Math.min(baseSize, 12);
            }
        }
        
        return baseSize;
    }
    
    // Handle cell click
    function handleCellClick(e) {
        // Nếu đã kéo thì không xử lý click
        if (isDragging || wasDragging) {
            wasDragging = false;
            return;
        }
        
        if (!gameActive || (isOnlineMode && !canMakeMove)) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        if (gameBoard[row][col] !== '') return;
        
        if (isOnlineMode) {
            let moveAccepted = false;
            
            // Kiểm tra xem đang ở chế độ xếp hạng hay thường
            if (window.rankedGame && window.rankedGame.currentMatch) {
                // Chế độ xếp hạng
                moveAccepted = window.rankedGame.makeMove(row, col);
                console.log('Chế độ xếp hạng, moveAccepted:', moveAccepted);
            } else if (window.onlineGame) {
                // Chế độ thường
                moveAccepted = window.onlineGame.makeMove(row, col, currentPlayer);
                console.log('Chế độ thường, moveAccepted:', moveAccepted);
            }
            
            if (!moveAccepted) return;
            
            // Cập nhật UI tạm thời
            e.target.textContent = currentPlayer;
            e.target.classList.add(currentPlayer.toLowerCase());
            
            // Tắt lượt đi
            canMakeMove = false;
            status.textContent = 'Đang chờ đối thủ...';
            
            console.log(`Đã gửi nước đi [${row}, ${col}] lên server`);
        } else {
            // Local game logic
            makeMove(row, col);
        }
    }
    
    // Place a mark at the specified position
    function placeMark(row, col) {
        if (gameBoard[row][col] !== '' || !gameActive) {
            return false;
        }
        
        // Clear previous last move highlight
        if (lastMoveCell) {
            lastMoveCell.classList.remove('last-move');
        }
        
        gameBoard[row][col] = currentPlayer;
        updateCell(row, col);
        
        // Highlight last move
        const cells = document.querySelectorAll('.cell');
        const index = row * size + col;
        cells[index].classList.add('last-move');
        lastMoveCell = cells[index];
        
        if (checkWin(row, col)) {
            status.textContent = `${currentPlayer} thắng!`;
            gameActive = false;
            highlightWinningCells();
            return true;
        }
        
        if (checkDraw()) {
            status.textContent = 'Hòa!';
            gameActive = false;
            return true;
        }
        
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        status.textContent = `Lượt của ${currentPlayer}`;
        return true;
    }
    
    // Update cell appearance
    function updateCell(row, col) {
        const cells = document.querySelectorAll('.cell');
        const index = row * size + col;
        cells[index].textContent = gameBoard[row][col];
        cells[index].classList.add(gameBoard[row][col].toLowerCase());
    }
    
    // Make AI move
    function makeAIMove() {
        isAIThinking = true;
        status.classList.add('thinking');
        
        // Sử dụng setTimeout để không chặn giao diện người dùng
        setTimeout(() => {
            let move;
            
            try {
                switch (aiDifficulty) {
                    case 'easy':
                        // Dễ: 80% ngẫu nhiên, 20% thông minh với độ sâu thấp
                        move = Math.random() < 0.8 ? makeRandomMove() : findBestMove(1);
                        break;
                    case 'medium':
                        // Trung bình: 40% ngẫu nhiên, 60% thông minh với độ sâu vừa phải
                        move = Math.random() < 0.4 ? makeRandomMove() : findBestMove(2);
                        break;
                    case 'hard':
                        // Khó: 10% ngẫu nhiên, 90% thông minh với độ sâu cao
                        move = Math.random() < 0.1 ? makeRandomMove() : findBestMove(3);
                        break;
                    case 'veryhard':
                        // Rất khó: 100% thông minh với chiến lược nâng cao và độ sâu tối đa
                        move = findBestMoveOptimized(4);
                        break;
                    default:
                        move = makeRandomMove();
                }
                
                if (move) {
                    placeMark(move.row, move.col);
                }
            } catch (error) {
                console.error("Lỗi khi AI tính toán nước đi:", error);
                // Fallback: Sử dụng thuật toán đơn giản hơn nếu có lỗi
                move = makeRandomMove();
                if (move) {
                    placeMark(move.row, move.col);
                }
            }
            
            isAIThinking = false;
            status.classList.remove('thinking');
        }, 100);  // Tăng thời gian delay một chút để tạo cảm giác AI đang suy nghĩ
    }
    
    // Make a random move
    function makeRandomMove() {
        const emptyCells = [];
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (gameBoard[i][j] === '') {
                    emptyCells.push({row: i, col: j});
                }
            }
        }
        
        if (emptyCells.length === 0) return null;
        
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    // Find the best move for AI
    function findBestMove(depth) {
        // Store scores for attack and defense
        const scores = {
            attack: Array(size).fill().map(() => Array(size).fill(0)),
            defense: Array(size).fill().map(() => Array(size).fill(0))
        };
        
        // Tạo danh sách các ô trống có khả năng cao
        const potentialMoves = [];
        
        // Chỉ xem xét các ô gần với các quân cờ đã có trên bàn
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (gameBoard[i][j] === '') {
                    if (hasNeighbor(i, j, 2)) {
                        potentialMoves.push({row: i, col: j});
                    }
                }
            }
        }
        
        // Nếu không có nước đi tiềm năng (bàn cờ trống hoặc rất ít quân), chọn vị trí trung tâm hoặc gần trung tâm
        if (potentialMoves.length === 0) {
            const centerRow = Math.floor(size / 2);
            const centerCol = Math.floor(size / 2);
            
            // Kiểm tra vị trí trung tâm
            if (gameBoard[centerRow][centerCol] === '') {
                return {row: centerRow, col: centerCol};
            }
            
            // Kiểm tra các vị trí xung quanh trung tâm
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const r = centerRow + i;
                    const c = centerCol + j;
                    if (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === '') {
                        return {row: r, col: c};
                    }
                }
            }
            
            // Nếu không tìm thấy, trả về một nước đi ngẫu nhiên
            return makeRandomMove();
        }
        
        // Đánh giá các nước đi tiềm năng
        for (const move of potentialMoves) {
            const i = move.row;
            const j = move.col;
            
            // Evaluate for attack (AI's move)
            gameBoard[i][j] = 'O';
            scores.attack[i][j] = evaluatePosition(i, j, 'O');
            
            // Evaluate for defense (blocking player's move)
            gameBoard[i][j] = 'X';
            scores.defense[i][j] = evaluatePosition(i, j, 'X');
            
            // Reset the cell
            gameBoard[i][j] = '';
        }
        
        // Find maximum scores
        let maxAttackScore = 0;
        let maxDefenseScore = 0;
        let bestMoves = {attack: [], defense: []};
        
        // Tìm điểm cao nhất cho tấn công và phòng thủ
        for (const move of potentialMoves) {
            const i = move.row;
            const j = move.col;
            
            // Attack moves
            if (scores.attack[i][j] > maxAttackScore) {
                maxAttackScore = scores.attack[i][j];
                bestMoves.attack = [{row: i, col: j}];
            } else if (scores.attack[i][j] === maxAttackScore) {
                bestMoves.attack.push({row: i, col: j});
            }
            
            // Defense moves
            if (scores.defense[i][j] > maxDefenseScore) {
                maxDefenseScore = scores.defense[i][j];
                bestMoves.defense = [{row: i, col: j}];
            } else if (scores.defense[i][j] === maxDefenseScore) {
                bestMoves.defense.push({row: i, col: j});
            }
        }
        
        // Decision making based on scores
        if (maxAttackScore >= 10000) {
            // Winning move, take it
            return bestMoves.attack[Math.floor(Math.random() * bestMoves.attack.length)];
        } else if (maxDefenseScore >= 10000) {
            // Blocking critical move
            return bestMoves.defense[Math.floor(Math.random() * bestMoves.defense.length)];
        } else if (maxAttackScore >= 1000 && maxAttackScore > maxDefenseScore) {
            // Có cơ hội tấn công tốt
            return bestMoves.attack[Math.floor(Math.random() * bestMoves.attack.length)];
        } else if (maxDefenseScore >= 1000) {
            // Cần phải phòng thủ
            return bestMoves.defense[Math.floor(Math.random() * bestMoves.defense.length)];
        } else if (maxAttackScore >= maxDefenseScore * 1.2) {
            // Prefer attack if it's significantly better than defense
            return bestMoves.attack[Math.floor(Math.random() * bestMoves.attack.length)];
        } else if (maxDefenseScore >= maxAttackScore * 1.2) {
            // Prefer defense if it's significantly better than attack
            return bestMoves.defense[Math.floor(Math.random() * bestMoves.defense.length)];
        } else {
            // Cân bằng giữa tấn công và phòng thủ
            const attackWeight = 0.6; // Ưu tiên tấn công hơn
            const combinedMoves = [];
            
            for (const move of potentialMoves) {
                const i = move.row;
                const j = move.col;
                const combinedScore = scores.attack[i][j] * attackWeight + scores.defense[i][j] * (1 - attackWeight);
                combinedMoves.push({row: i, col: j, score: combinedScore});
            }
            
            // Sắp xếp theo điểm giảm dần
            combinedMoves.sort((a, b) => b.score - a.score);
            
            // Chọn một trong 3 nước đi tốt nhất (thêm một chút ngẫu nhiên)
            const topMoves = combinedMoves.slice(0, Math.min(3, combinedMoves.length));
            return topMoves[Math.floor(Math.random() * topMoves.length)];
        }
    }
    
    // Kiểm tra xem một ô có lân cận với quân cờ nào không
    function hasNeighbor(row, col, radius) {
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                if (i === 0 && j === 0) continue;
                
                const r = row + i;
                const c = col + j;
                
                if (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] !== '') {
                    return true;
                }
            }
        }
        return false;
    }
    
    // Evaluate a position for a player
    function evaluatePosition(row, col, player) {
        const directions = [
            [0, 1],   // horizontal
            [1, 0],   // vertical
            [1, 1],   // diagonal top-left to bottom-right
            [1, -1]   // diagonal top-right to bottom-left
        ];
        
        const opponent = player === 'X' ? 'O' : 'X';
        let maxScore = 0;
        let totalScore = 0;
        
        // Thêm điểm cho vị trí trung tâm (ưu tiên đánh vào giữa bàn cờ)
        const centerBonus = 10;
        const centerRow = Math.floor(size / 2);
        const centerCol = Math.floor(size / 2);
        const distanceFromCenter = Math.sqrt(Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2));
        const normalizedDistance = distanceFromCenter / (Math.sqrt(2) * size / 2); // Chuẩn hóa về khoảng [0, 1]
        const positionScore = Math.round(centerBonus * (1 - normalizedDistance));
        
        totalScore += positionScore;
        
        for (const [dx, dy] of directions) {
            let score = 0;
            let openEnds = 0;
            let blockedEnds = 0;
            let count = 1; // count the current position
            let adjacentCount = 0; // đếm số quân liền kề
            
            // Check in both directions
            for (let k = -1; k <= 1; k += 2) { // k = -1 for negative direction, k = 1 for positive
                let r = row + k * dx;
                let c = col + k * dy;
                let streak = 0;
                let isAdjacent = true;
                
                // Count consecutive pieces
                while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
                    streak++;
                    if (isAdjacent) adjacentCount++;
                    isAdjacent = false;
                    r += k * dx;
                    c += k * dy;
                }
                
                // Check what's at the end
                if (r >= 0 && r < size && c >= 0 && c < size) {
                    if (gameBoard[r][c] === '') {
                        openEnds++;
                        
                        // Kiểm tra xa hơn một ô nữa để xác định mẫu hình
                        const r2 = r + k * dx;
                        const c2 = c + k * dy;
                        if (r2 >= 0 && r2 < size && c2 >= 0 && c2 < size && gameBoard[r2][c2] === player) {
                            // Phát hiện mẫu hình "X_X" - tăng điểm
                            score += 15;
                        }
                    } else if (gameBoard[r][c] === opponent) {
                        blockedEnds++;
                    }
                } else {
                    // Edge of board counts as blocked
                    blockedEnds++;
                }
                
                count += streak;
            }
            
            // Calculate score based on count, open ends, and blocked ends
            if (count >= 5) {
                // Luật "chặn 2 đầu": Nếu cả hai đầu bị chặn, không tính là thắng
                if (blockedEnds < 2) {
                    score = 100000; // Winning move - điểm rất cao
                } else {
                    score = 200; // Still valuable but not winning
                }
            } else if (count === 4) {
                if (blockedEnds === 0) {
                    score = 10000; // Open four - very strong
                } else if (blockedEnds === 1) {
                    score = 1000; // Half-blocked four - strong
                } else {
                    score = 100; // Blocked four - less valuable
                }
            } else if (count === 3) {
                if (blockedEnds === 0) {
                    score = 500; // Open three - strong
                } else if (blockedEnds === 1) {
                    score = 100; // Half-blocked three
                } else {
                    score = 50; // Blocked three - less valuable
                }
            } else if (count === 2) {
                if (blockedEnds === 0) {
                    score = 50; // Open two
                } else if (blockedEnds === 1) {
                    score = 25; // Half-blocked two
                } else {
                    score = 10; // Blocked two - minimal value
                }
            } else {
                score = openEnds > 0 ? 10 : 5; // Single piece
            }
            
            // Tăng điểm cho các quân liền kề
            score += adjacentCount * 5;
            
            // Tăng điểm cho các mẫu hình đặc biệt
            if (count === 3 && openEnds === 2) {
                score += 200; // Mẫu hình ba quân mở hai đầu rất mạnh
            }
            
            maxScore = Math.max(maxScore, score);
            totalScore += score;
        }
        
        // Kết hợp điểm cao nhất và tổng điểm
        return maxScore * 0.8 + totalScore * 0.2;
    }
    
    // Check for a win
    function checkWin(row, col) {
        const directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal top-left to bottom-right
            [1, -1]  // diagonal top-right to bottom-left
        ];
        
        const player = gameBoard[row][col];
        const opponent = player === 'X' ? 'O' : 'X';
        
        for (let i = 0; i < directions.length; i++) {
            const [dx, dy] = directions[i];
            let count = 1;
            let endPoints = [];
            
            // Check in positive direction
            let r = row + dx;
            let c = col + dy;
            while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
                count++;
                r += dx;
                c += dy;
            }
            
            // Kiểm tra điểm cuối thứ nhất
            if (r >= 0 && r < size && c >= 0 && c < size) {
                endPoints.push(gameBoard[r][c]); // Lưu giá trị ở điểm cuối (có thể là '', 'X', hoặc 'O')
            } else {
                endPoints.push('edge'); // Nếu ra ngoài biên, đánh dấu là 'edge'
            }
            
            // Check in negative direction
            r = row - dx;
            c = col - dy;
            while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
                count++;
                r -= dx;
                c -= dy;
            }
            
            // Kiểm tra điểm cuối thứ hai
            if (r >= 0 && r < size && c >= 0 && c < size) {
                endPoints.push(gameBoard[r][c]); // Lưu giá trị ở điểm cuối
            } else {
                endPoints.push('edge'); // Nếu ra ngoài biên, đánh dấu là 'edge'
            }
            
            if (count >= 5) {
                // Áp dụng luật "chặn 2 đầu"
                // Đếm số lượng đầu bị chặn bởi quân đối phương
                const blockedEnds = endPoints.filter(end => end === opponent).length;
                
                // Nếu cả hai đầu đều bị chặn, không tính là thắng
                if (blockedEnds >= 2) {  // FIXED: >= 2 means both ends are blocked, so continue checking
                    continue; // Tiếp tục kiểm tra hướng khác
                }
                
                // Store winning direction and position for highlighting
                winningDirection = i;
                winningPosition = [row, col];
                return true;
            }
        }
        
        return false;
    }
    
    // Highlight the winning cells
    function highlightWinningCells() {
        if (winningDirection === -1 || winningPosition[0] === -1) return;
        
        const [row, col] = winningPosition;
        const player = gameBoard[row][col];
        const directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal top-left to bottom-right
            [1, -1]  // diagonal top-right to bottom-left
        ];
        const [dx, dy] = directions[winningDirection];
        
        // Highlight cells in the winning line
        const winningCells = [];
        
        // Start position
        let r = row;
        let c = col;
        winningCells.push([r, c]);
        
        // Check in positive direction
        r = row + dx;
        c = col + dy;
        while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
            winningCells.push([r, c]);
            r += dx;
            c += dy;
        }
        
        // Check in negative direction
        r = row - dx;
        c = col - dy;
        while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
            winningCells.push([r, c]);
            r -= dx;
            c -= dy;
        }
        
        // Apply winning highlight style
        document.querySelectorAll('.cell').forEach(cell => {
            const cellRow = parseInt(cell.dataset.row);
            const cellCol = parseInt(cell.dataset.col);
            
            if (winningCells.some(([r, c]) => r === cellRow && c === cellCol)) {
                cell.style.backgroundColor = '#e6ffe6';
                cell.style.boxShadow = '0 0 5px rgba(0, 255, 0, 0.5)';
            }
        });
    }
    
    // Check for a draw
    function checkDraw() {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (gameBoard[i][j] === '') {
                    return false;
                }
            }
        }
        return true;
    }
    
    // Reset the game
    function resetGame() {
        currentPlayer = 'X';
        gameActive = true;
        winningDirection = -1;
        winningPosition = [-1, -1];
        status.textContent = `Lượt của ${currentPlayer}`;
        status.classList.remove('thinking');
        isAIThinking = false;
        canMakeMove = !isOnlineMode || (isOnlineMode && window.onlineGame.isPlayer1);
        
        // Clear last move highlight
        if (lastMoveCell) {
            lastMoveCell.classList.remove('last-move');
            lastMoveCell = null;
        }
        
        initGameBoard();
        
        document.querySelectorAll('.cell').forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('x', 'o');
            cell.style.backgroundColor = '';
            cell.style.boxShadow = '';
        });
        
        // Maintain zoom level
        updateZoom();
        
        // Reset board position
        resetBoardPosition();
        
        // If in online mode, reset the game in Firebase
        if (isOnlineMode) {
            window.onlineGame.resetGame();
        }
        // If in AI mode and AI goes first (O), make the first move
        else if (isAIMode && currentPlayer === 'O') {
            makeAIMove();
        }
    }
    
    // Handle board size change
    function handleBoardSizeChange() {
        // Hiển thị hoặc ẩn phần tùy chỉnh kích thước
        if (boardSizeSelect.value === 'custom') {
            customBoardSizeContainer.style.display = 'flex';
            size = parseInt(customSizeInput.value);
        } else {
            customBoardSizeContainer.style.display = 'none';
            size = parseInt(boardSizeSelect.value);
        }
        
        // Giới hạn kích thước trong khoảng hợp lệ
        size = Math.max(5, Math.min(30, size));
        
        initGameBoard();
        createBoard();
        resetGame();
    }
    
    // Xử lý thay đổi kích thước tùy chỉnh
    function handleCustomSizeChange() {
        let newSize = parseInt(customSizeInput.value);
        
        // Giới hạn kích thước trong khoảng hợp lệ
        newSize = Math.max(5, Math.min(30, newSize));
        customSizeInput.value = newSize;
        
        if (boardSizeSelect.value === 'custom') {
            size = newSize;
            initGameBoard();
            createBoard();
            resetGame();
        }
    }
    
    // Update board size based on window width
    function updateBoardSize() {
        const cellSize = getCellSize();
        board.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
        board.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
        
        // Cập nhật class cho bàn cờ lớn
        if (size > 30) {
            board.classList.add('large-board');
        } else {
            board.classList.remove('large-board');
        }
        
        // Log để debug
        console.log(`Đã cập nhật kích thước bàn cờ: ${size}x${size}, kích thước ô: ${cellSize}px`);
    }
    
    // Handle game mode change
    function handleGameModeChange() {
        isAIMode = gameModeSelect.value === 'ai';
        aiDifficultyContainer.style.display = isAIMode ? 'block' : 'none';
        resetGame();
    }
    
    // Handle AI difficulty change
    function handleAIDifficultyChange() {
        aiDifficulty = aiDifficultySelect.value;
        if (isAIMode && gameActive) {
            // If changing difficulty mid-game, allow AI to make a move if it's its turn
            if (currentPlayer === 'O') {
                makeAIMove();
            }
        }
    }
    
    // Show local game settings
    function showLocalSettings() {
        gameSelectionSection.style.display = 'none';
        localSettingsSection.style.display = 'block';
        rankedSettingsSection.style.display = 'none';
        gameBoardContainer.style.display = 'none';
    }
    
    // Show ranked game settings
    function showRankedSettings() {
        gameSelectionSection.style.display = 'none';
        localSettingsSection.style.display = 'none';
        rankedSettingsSection.style.display = 'block';
        gameBoardContainer.style.display = 'none';
        
        // Đảm bảo hiển thị đúng phần khi vào lại chế độ xếp hạng
        if (window.rankedGame) {
            // Nếu người dùng đã đăng nhập, hiển thị màn hình lobby
            if (window.rankedGame.currentUser) {
                window.rankedGame.showRankedLobby();
            } else {
                // Nếu chưa đăng nhập, hiển thị màn hình đăng nhập
                window.rankedGame.showRankedLogin();
            }
        }
    }
    
    // Show game selection
    function showGameSelection() {
        // Show game type selection instead of game mode selection
        gameTypeSelection.style.display = 'block';
        gameSelectionSection.style.display = 'none';
        localSettingsSection.style.display = 'none';
        rankedSettingsSection.style.display = 'none';
        gameBoardContainer.style.display = 'none';
        
        // Hide animal chess section if it exists
        const animalChessSelection = document.getElementById('animal-chess-selection');
        if (animalChessSelection) {
            animalChessSelection.style.display = 'none';
        }
        
        // Reset online game if needed
        if (isOnlineMode) {
            if (window.onlineGame && window.onlineGame.currentRoom) {
                window.onlineGame.leaveRoom();
            }
            isOnlineMode = false;
        }
        
        // Reset ranked game if needed
        if (window.rankedGame && window.rankedGame.currentMatch) {
            window.rankedGame.leaveMatch();
        }
    }
    
    // Start local game
    function startLocalGame() {
        gameSelectionSection.style.display = 'none';
        localSettingsSection.style.display = 'none';
        rankedSettingsSection.style.display = 'none';
        gameBoardContainer.style.display = 'block';
        
        isOnlineMode = false;
        canMakeMove = true;
        initGameBoard();
        createBoard();
        resetGame();
        updateBoardSize();
        
        // Initialize zoom
        if (localStorage.getItem('boardZoomLevel')) {
            zoomLevel = parseInt(localStorage.getItem('boardZoomLevel'));
            zoomSlider.value = zoomLevel;
            updateZoom();
        }
        
        // Reset board position
        resetBoardPosition();
        
        // Ensure dragging is initialized
        initBoardDragging();
    }
    
    // Online game functions for integration with online.js
    // Start an online game
    window.startOnlineGame = function(isPlayer1, roomType) {
        gameSelectionSection.style.display = 'none';
        localSettingsSection.style.display = 'none';
        
        // Hiển thị phần cài đặt phù hợp
        rankedSettingsSection.style.display = 'block';
        gameBoardContainer.style.display = 'block';
        
        isOnlineMode = true;
        
        // Kích thước bàn cờ phụ thuộc vào loại phòng
        size = 15; // Bàn cờ 15x15 cho chế độ xếp hạng
        
        // Player 1 (X) goes first
        canMakeMove = isPlayer1;
        
        initGameBoard();
        createBoard();
        resetGame();
        
        // Initialize zoom
        if (localStorage.getItem('boardZoomLevel')) {
            zoomLevel = parseInt(localStorage.getItem('boardZoomLevel'));
            zoomSlider.value = zoomLevel;
            updateZoom();
        }
        
        // Reset board position
        resetBoardPosition();
        
        // Ensure dragging is initialized
        initBoardDragging();
        
        // Log để debug
        console.log(`Bắt đầu game xếp hạng với kích thước ${size}x${size}, isPlayer1: ${isPlayer1}`);
    };
    
    // Update the online game turn
    window.updateOnlineTurn = function(isMyTurn) {
        canMakeMove = isMyTurn;
    };
    
    // Update the board based on the opponent's move
    window.updateOnlineBoard = function(newBoard, lastMove) {
        // Đảm bảo kích thước bàn cờ đúng
        if (newBoard.length !== size) {
            console.log(`Kích thước bàn cờ không khớp: ${newBoard.length} vs ${size}`);
            size = newBoard.length;
            initGameBoard();
            createBoard();
        }
        
        // Update the game board
        gameBoard = newBoard;
        
        // Update the UI
        document.querySelectorAll('.cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (gameBoard[row][col] !== '') {
                cell.textContent = gameBoard[row][col];
                cell.classList.add(gameBoard[row][col].toLowerCase());
            } else {
                cell.textContent = '';
                cell.classList.remove('x', 'o');
            }
        });
        
        // Clear previous last move highlight
        if (lastMoveCell) {
            lastMoveCell.classList.remove('last-move');
        }
        
        // Highlight last move
        if (lastMove) {
            const cells = document.querySelectorAll('.cell');
            const index = lastMove.row * size + lastMove.col;
            if (cells[index]) {
                cells[index].classList.add('last-move');
                lastMoveCell = cells[index];
                
                // Check for win or draw
                if (checkWin(lastMove.row, lastMove.col)) {
                    status.textContent = `${lastMove.value} thắng!`;
                    gameActive = false;
                    highlightWinningCells();
                } else if (checkDraw()) {
                    status.textContent = 'Hòa!';
                    gameActive = false;
                } else {
                    // Update current player
                    currentPlayer = lastMove.value === 'X' ? 'O' : 'X';
                    status.textContent = `Lượt của ${currentPlayer}`;
                }
            } else {
                console.error(`Không tìm thấy ô tại vị trí [${lastMove.row}, ${lastMove.col}]`);
            }
        }
        
        // Log để debug
        console.log(`Đã cập nhật bàn cờ từ server, kích thước: ${newBoard.length}x${newBoard.length}`);
    };
    
    // Handle leaving an online game
    window.leaveOnlineGame = function() {
        isOnlineMode = false;
        showGameSelection();
    };
    
    // Initialize event listeners
    function initEventListeners() {
        // Game mode selection
    localGameBtn.addEventListener('click', showLocalSettings);
    aiGameBtn.addEventListener('click', () => {
        showLocalSettings();
        gameModeSelect.value = 'ai';
        handleGameModeChange();
    });
        
        if (onlineGameBtn) {
            onlineGameBtn.addEventListener('click', () => {
                // Show online settings section if it exists
                if (typeof window.onlineGame !== 'undefined') {
                    gameSelectionSection.style.display = 'none';
                    
                    // Find and show the online settings section
                    const onlineLoginSection = document.getElementById('online-login');
                    if (onlineLoginSection) {
                        onlineLoginSection.style.display = 'block';
                    }
                    
                    // Initialize online game if not already initialized
                    if (!window.onlineGameInstance) {
                        window.onlineGameInstance = new window.onlineGame();
                    }
                } else {
                    showNotification('Chế độ trực tuyến đang được bảo trì. Vui lòng thử lại sau.', true);
                }
            });
        }
        
    rankedGameBtn.addEventListener('click', showRankedSettings);
        
        // Game settings
        boardSizeSelect.addEventListener('change', handleBoardSizeChange);
        customSizeInput.addEventListener('change', handleCustomSizeChange);
        gameModeSelect.addEventListener('change', handleGameModeChange);
        aiDifficultySelect.addEventListener('change', handleAIDifficultyChange);
    startLocalGameBtn.addEventListener('click', startLocalGame);
    
        // Game controls
        if (resetBtn) resetBtn.addEventListener('click', resetGame);
        if (backBtn) backBtn.addEventListener('click', showGameSelection);
        
        // Rules toggle
        if (rulesToggle) rulesToggle.addEventListener('click', toggleRules);
        
        // Zoom controls
        if (zoomSlider) zoomSlider.addEventListener('input', updateZoom);
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomOut());
        if (resetPositionBtn) resetPositionBtn.addEventListener('click', resetBoardPosition);
        
        console.log('Event listeners initialized');
    }
    
    // Call to initialize event listeners
    initEventListeners();

    // Make a move for local games
    function makeMove(row, col) {
        // Đặt quân cờ
        placeMark(row, col);
        
        // Nếu đang chơi với AI và game vẫn đang diễn ra
        if (isAIMode && gameActive && currentPlayer === 'O') {
            makeAIMove();
        }
    }

    // Xử lý thu gọn/mở rộng phần server info
    const serverInfo = document.querySelector('.server-info');
    const serverInfoToggle = document.getElementById('server-info-toggle');
    
    if (serverInfoToggle && serverInfo) {
        // Kiểm tra trạng thái từ localStorage
        const isCollapsed = localStorage.getItem('serverInfoCollapsed') === 'true';
        if (isCollapsed) {
            serverInfo.classList.add('collapsed');
            serverInfoToggle.textContent = '+';
        }
        
        serverInfoToggle.addEventListener('click', () => {
            serverInfo.classList.toggle('collapsed');
            const isNowCollapsed = serverInfo.classList.contains('collapsed');
            serverInfoToggle.textContent = isNowCollapsed ? '+' : '−';
            localStorage.setItem('serverInfoCollapsed', isNowCollapsed);
        });
    }
    
    // Xử lý chức năng phóng to/thu nhỏ bàn cờ
    function updateZoom() {
        board.style.transform = `scale(${zoomLevel / 100})`;
        zoomValue.textContent = `${zoomLevel}%`;
        zoomSlider.value = zoomLevel;
        
        // Lưu mức zoom vào localStorage để duy trì giữa các phiên
        localStorage.setItem('boardZoomLevel', zoomLevel);
    }
    
    // Hàm tăng mức zoom
    function zoomIn(amount = 5) {
        zoomLevel = Math.min(300, zoomLevel + amount);
        updateZoom();
    }
    
    // Hàm giảm mức zoom
    function zoomOut(amount = 5) {
        zoomLevel = Math.max(50, zoomLevel - amount);
        updateZoom();
    }
    
    // Khôi phục mức zoom từ localStorage nếu có
    if (localStorage.getItem('boardZoomLevel')) {
        zoomLevel = parseInt(localStorage.getItem('boardZoomLevel'));
        zoomSlider.value = zoomLevel;
        updateZoom();
    }
    
    // Thêm sự kiện cho các điều khiển zoom
    if (zoomSlider) {
        zoomSlider.addEventListener('input', () => {
            zoomLevel = parseInt(zoomSlider.value);
            updateZoom();
        });
    }
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            zoomIn(20);
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            zoomOut(20);
        });
    }
    
    // Thêm phím tắt bàn phím cho zoom
    document.addEventListener('keydown', (event) => {
        // Chỉ xử lý khi bàn cờ đang hiển thị
        if (gameBoardContainer.style.display !== 'none') {
            // Ctrl + "+" để phóng to
            if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
                event.preventDefault();
                zoomIn(20);
            }
            // Ctrl + "-" để thu nhỏ
            else if (event.ctrlKey && event.key === '-') {
                event.preventDefault();
                zoomOut(20);
            }
            // Ctrl + "0" để đặt lại về 100%
            else if (event.ctrlKey && event.key === '0') {
                event.preventDefault();
                zoomLevel = 100;
                updateZoom();
            }
            // Ctrl + "1" để đặt về 100%
            else if (event.ctrlKey && event.key === '1') {
                event.preventDefault();
                zoomLevel = 100;
                updateZoom();
            }
            // Ctrl + "2" để đặt về 200%
            else if (event.ctrlKey && event.key === '2') {
                event.preventDefault();
                zoomLevel = 200;
                updateZoom();
            }
            // Ctrl + "3" để đặt về 300%
            else if (event.ctrlKey && event.key === '3') {
                event.preventDefault();
                zoomLevel = 300;
                updateZoom();
            }
            // Phím R để đặt lại vị trí bàn cờ
            else if (event.key === 'r' || event.key === 'R') {
                event.preventDefault();
                resetBoardPosition();
            }
        }
    });
    
    // Thêm sự kiện cho nút đặt lại vị trí bàn cờ
    if (resetPositionBtn) {
        resetPositionBtn.addEventListener('click', resetBoardPosition);
    }
    
    // Thêm chức năng di chuyển bàn cờ bằng chuột
    function initBoardDragging() {
        if (!boardContainer || !boardWrapper) return;
        
        // Biến để theo dõi thời gian nhấn giữ
        let pressTimer;
        let pressedCell = null;
        let longPressThreshold = 300; // Thời gian giữ để kích hoạt kéo (ms)
        
        // Hàm kiểm tra xem có thể kéo từ phần tử này không
        function canDragFrom(target) {
            // Cho phép kéo từ bàn cờ hoặc các phần tử khác trong container
            return target === board || 
                   target === boardWrapper || 
                   target === boardContainer ||
                   (target.parentElement && 
                    (target.parentElement === board || 
                     target.parentElement === boardWrapper));
        }
        
        // Xử lý sự kiện khi nhấn chuột
        boardContainer.addEventListener('mousedown', (e) => {
            // Chỉ xử lý khi nhấn chuột trái
            if (e.button !== 0) return;
            
            // Nếu nhấn vào ô cờ, bắt đầu đếm thời gian
            if (e.target.classList.contains('cell')) {
                pressedCell = e.target;
                clearTimeout(pressTimer);
                pressTimer = setTimeout(() => {
                    // Sau khoảng thời gian, bắt đầu kéo
                    isDragging = true;
                    boardContainer.classList.add('grabbing');
                    startX = e.pageX - boardContainer.offsetLeft;
                    startY = e.pageY - boardContainer.offsetTop;
                    scrollLeft = boardContainer.scrollLeft;
                    scrollTop = boardContainer.scrollTop;
                    
                    // Lưu vị trí hiện tại của bàn cờ
                    const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
                    if (transform && transform !== 'none') {
                        const matrix = transform.match(/^matrix\((.+)\)$/);
                        if (matrix) {
                            const values = matrix[1].split(', ');
                            translateX = parseInt(values[4]) || 0;
                            translateY = parseInt(values[5]) || 0;
                        }
                    }
                }, longPressThreshold);
                return;
            }
            
            // Kiểm tra xem có thể kéo từ phần tử này không
            if (!canDragFrom(e.target)) return;
            
            isDragging = true;
            boardContainer.classList.add('grabbing');
            startX = e.pageX - boardContainer.offsetLeft;
            startY = e.pageY - boardContainer.offsetTop;
            scrollLeft = boardContainer.scrollLeft;
            scrollTop = boardContainer.scrollTop;
            
            // Lưu vị trí hiện tại của bàn cờ
            const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
            if (transform && transform !== 'none') {
                const matrix = transform.match(/^matrix\((.+)\)$/);
                if (matrix) {
                    const values = matrix[1].split(', ');
                    translateX = parseInt(values[4]) || 0;
                    translateY = parseInt(values[5]) || 0;
                }
            }
        });
        
        // Thêm sự kiện mousedown cho board để có thể kéo trực tiếp trên bàn cờ
        board.addEventListener('mousedown', (e) => {
            // Chỉ xử lý khi nhấn chuột trái
            if (e.button !== 0) return;
            
            // Nếu nhấn vào ô cờ, xử lý tương tự như trên boardContainer
            if (e.target.classList.contains('cell')) {
                pressedCell = e.target;
                clearTimeout(pressTimer);
                pressTimer = setTimeout(() => {
                    // Sau khoảng thời gian, bắt đầu kéo
                    isDragging = true;
                    boardContainer.classList.add('grabbing');
                    startX = e.pageX - boardContainer.offsetLeft;
                    startY = e.pageY - boardContainer.offsetTop;
                    scrollLeft = boardContainer.scrollLeft;
                    scrollTop = boardContainer.scrollTop;
                    
                    // Lưu vị trí hiện tại của bàn cờ
                    const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
                    if (transform && transform !== 'none') {
                        const matrix = transform.match(/^matrix\((.+)\)$/);
                        if (matrix) {
                            const values = matrix[1].split(', ');
                            translateX = parseInt(values[4]) || 0;
                            translateY = parseInt(values[5]) || 0;
                        }
                    }
                }, longPressThreshold);
                return;
            }
            
            // Kiểm tra xem có thể kéo từ phần tử này không
            if (!canDragFrom(e.target)) return;
            
            e.preventDefault(); // Ngăn chặn sự kiện mặc định
            e.stopPropagation(); // Ngăn chặn sự kiện lan truyền
            
            isDragging = true;
            boardContainer.classList.add('grabbing');
            startX = e.pageX - boardContainer.offsetLeft;
            startY = e.pageY - boardContainer.offsetTop;
            scrollLeft = boardContainer.scrollLeft;
            scrollTop = boardContainer.scrollTop;
            
            // Lưu vị trí hiện tại của bàn cờ
            const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
            if (transform && transform !== 'none') {
                const matrix = transform.match(/^matrix\((.+)\)$/);
                if (matrix) {
                    const values = matrix[1].split(', ');
                    translateX = parseInt(values[4]) || 0;
                    translateY = parseInt(values[5]) || 0;
                }
            }
        });
        
        // Xử lý sự kiện khi di chuyển chuột
        boardContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const x = e.pageX - boardContainer.offsetLeft;
            const y = e.pageY - boardContainer.offsetTop;
            const moveX = x - startX;
            const moveY = y - startY;
            
            // Tính toán khoảng cách di chuyển
            const distance = Math.sqrt(moveX * moveX + moveY * moveY);
            moveDistance = Math.max(moveDistance, distance);
            
            // Nếu di chuyển đủ xa, đánh dấu là đang kéo
            if (moveDistance > 5) {
                wasDragging = true;
                
                // Nếu đang giữ một ô cờ, thêm hiệu ứng phản hồi
                if (pressedCell) {
                    pressedCell.style.opacity = '0.7';
                }
            }
            
            // Cập nhật vị trí của bàn cờ
            boardWrapper.style.transform = `translate(${translateX + moveX}px, ${translateY + moveY}px)`;
        });
        
        // Xử lý sự kiện khi thả chuột
        document.addEventListener('mouseup', () => {
            // Hủy bỏ timer khi thả chuột
            clearTimeout(pressTimer);
            
            // Khôi phục hiệu ứng nếu có
            if (pressedCell) {
                pressedCell.style.opacity = '1';
                pressedCell = null;
            }
            
            if (!isDragging) return;
            
            isDragging = false;
            boardContainer.classList.remove('grabbing');
            
            // Lưu vị trí mới của bàn cờ
            const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
            if (transform && transform !== 'none') {
                const matrix = transform.match(/^matrix\((.+)\)$/);
                if (matrix) {
                    const values = matrix[1].split(', ');
                    translateX = parseInt(values[4]) || 0;
                    translateY = parseInt(values[5]) || 0;
                }
            }
            
            // Đặt lại biến theo dõi khoảng cách sau một khoảng thời gian ngắn
            setTimeout(() => {
                moveDistance = 0;
                wasDragging = false;
            }, 100);
        });
        
        // Xử lý sự kiện khi chuột rời khỏi container
        boardContainer.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                boardContainer.classList.remove('grabbing');
            }
        });
        
        // Ngăn chặn sự kiện click mặc định khi đang kéo
        boardContainer.addEventListener('click', (e) => {
            if (e.target === boardContainer || e.target === boardWrapper) {
                e.stopPropagation();
            }
        });
        
        // Thêm hỗ trợ cho thiết bị cảm ứng
        boardContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            
            // Nếu nhấn vào ô cờ, bắt đầu đếm thời gian
            if (e.target.classList.contains('cell')) {
                pressedCell = e.target;
                clearTimeout(pressTimer);
                pressTimer = setTimeout(() => {
                    // Sau khoảng thời gian, bắt đầu kéo
                    isDragging = true;
                    boardContainer.classList.add('grabbing');
                    startX = e.touches[0].pageX - boardContainer.offsetLeft;
                    startY = e.touches[0].pageY - boardContainer.offsetTop;
                    
                    // Lưu vị trí hiện tại của bàn cờ
                    const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
                    if (transform && transform !== 'none') {
                        const matrix = transform.match(/^matrix\((.+)\)$/);
                        if (matrix) {
                            const values = matrix[1].split(', ');
                            translateX = parseInt(values[4]) || 0;
                            translateY = parseInt(values[5]) || 0;
                        }
                    }
                }, longPressThreshold);
                return;
            }
            
            // Kiểm tra xem có thể kéo từ phần tử này không
            if (!canDragFrom(e.target)) return;
            
            isDragging = true;
            boardContainer.classList.add('grabbing');
            startX = e.touches[0].pageX - boardContainer.offsetLeft;
            startY = e.touches[0].pageY - boardContainer.offsetTop;
            
            // Lưu vị trí hiện tại của bàn cờ
            const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
            if (transform && transform !== 'none') {
                const matrix = transform.match(/^matrix\((.+)\)$/);
                if (matrix) {
                    const values = matrix[1].split(', ');
                    translateX = parseInt(values[4]) || 0;
                    translateY = parseInt(values[5]) || 0;
                }
            }
        });
        
        // Thêm sự kiện touchstart cho board
        board.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            
            // Nếu nhấn vào ô cờ, xử lý tương tự như trên boardContainer
            if (e.target.classList.contains('cell')) {
                pressedCell = e.target;
                clearTimeout(pressTimer);
                pressTimer = setTimeout(() => {
                    // Sau khoảng thời gian, bắt đầu kéo
                    isDragging = true;
                    boardContainer.classList.add('grabbing');
                    startX = e.touches[0].pageX - boardContainer.offsetLeft;
                    startY = e.touches[0].pageY - boardContainer.offsetTop;
                    
                    // Lưu vị trí hiện tại của bàn cờ
                    const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
                    if (transform && transform !== 'none') {
                        const matrix = transform.match(/^matrix\((.+)\)$/);
                        if (matrix) {
                            const values = matrix[1].split(', ');
                            translateX = parseInt(values[4]) || 0;
                            translateY = parseInt(values[5]) || 0;
                        }
                    }
                }, longPressThreshold);
                return;
            }
            
            // Kiểm tra xem có thể kéo từ phần tử này không
            if (!canDragFrom(e.target)) return;
            
            e.preventDefault(); // Ngăn chặn sự kiện mặc định
            
            isDragging = true;
            boardContainer.classList.add('grabbing');
            startX = e.touches[0].pageX - boardContainer.offsetLeft;
            startY = e.touches[0].pageY - boardContainer.offsetTop;
            
            // Lưu vị trí hiện tại của bàn cờ
            const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
            if (transform && transform !== 'none') {
                const matrix = transform.match(/^matrix\((.+)\)$/);
                if (matrix) {
                    const values = matrix[1].split(', ');
                    translateX = parseInt(values[4]) || 0;
                    translateY = parseInt(values[5]) || 0;
                }
            }
        });
        
        boardContainer.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length !== 1) return;
            e.preventDefault();
            
            const x = e.touches[0].pageX - boardContainer.offsetLeft;
            const y = e.touches[0].pageY - boardContainer.offsetTop;
            const moveX = x - startX;
            const moveY = y - startY;
            
            // Tính toán khoảng cách di chuyển
            const distance = Math.sqrt(moveX * moveX + moveY * moveY);
            moveDistance = Math.max(moveDistance, distance);
            
            // Nếu di chuyển đủ xa, đánh dấu là đang kéo
            if (moveDistance > 10) { // Ngưỡng cao hơn cho thiết bị cảm ứng
                wasDragging = true;
                
                // Nếu đang giữ một ô cờ, thêm hiệu ứng phản hồi
                if (pressedCell) {
                    pressedCell.style.opacity = '0.7';
                }
            }
            
            // Cập nhật vị trí của bàn cờ
            boardWrapper.style.transform = `translate(${translateX + moveX}px, ${translateY + moveY}px)`;
        }, { passive: false });
        
        boardContainer.addEventListener('touchend', () => {
            // Hủy bỏ timer khi thả
            clearTimeout(pressTimer);
            
            // Khôi phục hiệu ứng nếu có
            if (pressedCell) {
                pressedCell.style.opacity = '1';
                pressedCell = null;
            }
            
            if (!isDragging) return;
            
            isDragging = false;
            boardContainer.classList.remove('grabbing');
            
            // Lưu vị trí mới của bàn cờ
            const transform = window.getComputedStyle(boardWrapper).getPropertyValue('transform');
            if (transform && transform !== 'none') {
                const matrix = transform.match(/^matrix\((.+)\)$/);
                if (matrix) {
                    const values = matrix[1].split(', ');
                    translateX = parseInt(values[4]) || 0;
                    translateY = parseInt(values[5]) || 0;
                }
            }
            
            // Đặt lại biến theo dõi khoảng cách sau một khoảng thời gian ngắn
            setTimeout(() => {
                moveDistance = 0;
                wasDragging = false;
            }, 100);
        });
    }
    
    // Đặt lại vị trí bàn cờ về giữa
    function resetBoardPosition() {
        if (!boardWrapper) return;
        
        translateX = 0;
        translateY = 0;
        boardWrapper.style.transform = 'translate(0px, 0px)';
    }

    // Khởi tạo chức năng di chuyển bàn cờ
    initBoardDragging();

    // Hide game board and reset the game
    window.hideGameBoard = function() {
        // Ẩn bảng game
        gameBoardContainer.style.display = 'none';
        
        // Reset trạng thái game
        gameActive = false;
        currentPlayer = 'X';
        isOnlineMode = false;
        canMakeMove = true;
        
        // Xóa dữ liệu bàn cờ
        initGameBoard();
        
        // Xóa tất cả đánh dấu trên UI
        document.querySelectorAll('.cell').forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('x', 'o', 'last-move');
            cell.style.backgroundColor = '';
            cell.style.boxShadow = '';
        });
        
        // Đặt lại văn bản trạng thái
        status.textContent = 'Trò chơi đã kết thúc';
        status.classList.remove('thinking');
        
        console.log('Đã ẩn và reset bàn cờ');
    };

    // Very hard: Advanced optimized AI move finder with threat detection and pattern recognition
    function findBestMoveOptimized(depth) {
        // Start with a time limit for thinking
        const startTime = performance.now();
        const timeLimit = 500; // milliseconds, to prevent UI freezing
        
        // Define threat patterns (critical sequences to recognize)
        const threatPatterns = {
            winningFive: 100000,     // 5 in a row - win immediately
            openFour: 50000,         // Four in a row with both ends open - near guaranteed win (increased priority)
            halfOpenFour: 20000,      // Four in a row with one end open (increased priority)
            doubleThreat: 30000,      // Multiple threats in different directions (increased priority)
            openThree: 5000,          // Three in a row with both ends open (increased priority)
            halfOpenThree: 1000,      // Three in a row with one end open (increased priority)
            specialPattern: 2000      // Special patterns like knights move, split threes, etc. (increased priority)
        };
        
        // Cache for position evaluations to avoid recalculating
        const evaluationCache = new Map();
        
        // Potential moves with sophisticated filtering
        let potentialMoves = [];
        
        // Threat detection matrix - track most dangerous areas
        const threatMatrix = Array(size).fill().map(() => Array(size).fill(0));
        
        // First scan: Detect immediate threats
        let immediateWinFound = false;
        let blockingMoveNeeded = false;
        let opponentWinningPosition = null;
        
        // Check for immediate winning moves or blocking opponent's win (depth 1)
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (gameBoard[i][j] === '') {
                    if (hasNeighbor(i, j, 2)) {
                        // Check if this is a winning move for AI
                        gameBoard[i][j] = 'O';
                        const winningMove = checkWinWithoutChangingState(i, j, 'O');
                        gameBoard[i][j] = '';
                        
                        if (winningMove) {
                            // Immediate win found - return this move right away
                            return {row: i, col: j};
                        }
                        
                        // Check if opponent would win in the next move
                        gameBoard[i][j] = 'X';
                        const blockingMove = checkWinWithoutChangingState(i, j, 'X');
                        gameBoard[i][j] = '';
                        
                        if (blockingMove) {
                            blockingMoveNeeded = true;
                            opponentWinningPosition = {row: i, col: j};
                            // Don't return immediately - check for our winning move first
                        }
                        
                        // Add to potential moves with priority
                        const priority = blockingMove ? 10000 : 0;
                        potentialMoves.push({row: i, col: j, priority: priority});
                        
                        // Update threat matrix
                        threatMatrix[i][j] += priority;
                    }
                }
            }
        }
        
        // If opponent has a winning move, block it immediately
        if (blockingMoveNeeded && opponentWinningPosition) {
            return opponentWinningPosition;
        }
        
        // Second scan: Detect opponent's near-win threats (4 in a row with one side open)
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (gameBoard[i][j] === '') {
                    if (hasNeighbor(i, j, 3)) {  // Extended search radius
                        // Check for opponent's near-win threats
                        gameBoard[i][j] = 'X';
                        const nearWinThreat = checkNearWinThreat(i, j, 'X');
                        gameBoard[i][j] = '';
                        
                        if (nearWinThreat > 0) {
                            potentialMoves.push({row: i, col: j, priority: nearWinThreat});
                            threatMatrix[i][j] += nearWinThreat;
                        }
                    }
                }
            }
        }
        
        // Sort moves by initial priority (blocking moves first)
        potentialMoves.sort((a, b) => b.priority - a.priority);
        
        // If we have high priority blocking moves, focus on them
        if (potentialMoves.length > 0 && potentialMoves[0].priority > 5000) {
            potentialMoves = potentialMoves.slice(0, Math.min(8, potentialMoves.length));
        } else if (potentialMoves.length > 15) {
            // Limit the number of moves to evaluate for performance
            potentialMoves = potentialMoves.slice(0, 15);
        }
        
        // If no potential moves found yet, use the standard approach
        if (potentialMoves.length === 0) {
            return findStrategicOpening();
        }
        
        // Initialize score tracking
        let bestScore = -Infinity;
        let bestMoves = [];
        
        // Detailed evaluation of each potential move
        for (const move of potentialMoves) {
            const i = move.row;
            const j = move.col;
            
            // Skip if time limit exceeded
            if (performance.now() - startTime > timeLimit) {
                console.log("AI time limit reached");
                break;
            }
            
            // Simulate placing AI's mark
            gameBoard[i][j] = 'O';
            
            // Calculate complex score that includes:
            // 1. Primary attack potential
            // 2. Defensive value
            // 3. Positional advantages
            // 4. Threat creation
            // 5. Future potential (shallow lookahead)
            // 6. Threat neutralization
            const score = evaluateComplexPosition(i, j, 'O', depth, evaluationCache);
            
            // Reset the board
            gameBoard[i][j] = '';
            
            // Update best move list
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [{row: i, col: j, score: score}];
            } else if (score === bestScore) {
                bestMoves.push({row: i, col: j, score: score});
            }
        }
        
        // Select from the best moves, with slight preference for center if scores are close
        bestMoves.sort((a, b) => {
            // If scores are very close, prefer positions closer to center
            if (Math.abs(a.score - b.score) < 50) {
                const centerRow = Math.floor(size / 2);
                const centerCol = Math.floor(size / 2);
                
                const distA = Math.sqrt(Math.pow(a.row - centerRow, 2) + Math.pow(a.col - centerCol, 2));
                const distB = Math.sqrt(Math.pow(b.row - centerRow, 2) + Math.pow(b.col - centerCol, 2));
                
                return distA - distB;
            }
            return b.score - a.score;
        });
        
        // Return the best move or a random choice among equivalent best moves
        if (bestMoves.length > 0) {
            // Take the top move most of the time, but occasionally use 2nd or 3rd best for unpredictability
            const unpredictabilityFactor = Math.random();
            if (bestMoves.length > 2 && unpredictabilityFactor > 0.9) { // Reduced randomness for critical situations
                return bestMoves[1]; // 2nd best move
            } else if (bestMoves.length > 3 && unpredictabilityFactor > 0.97) {
                return bestMoves[2]; // 3rd best move
            } else {
                return bestMoves[0]; // best move
            }
        }
        
        // Fallback to strategic opening if evaluation failed
        return findStrategicOpening();
    }

    // Check for near-win threats (4 in a row with one side open, 3 in a row with both sides open)
    function checkNearWinThreat(row, col, player) {
        const directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal top-left to bottom-right
            [1, -1]  // diagonal top-right to bottom-left
        ];
        
        let maxThreat = 0;
        
        for (let i = 0; i < directions.length; i++) {
            const [dx, dy] = directions[i];
            let count = 1;
            let openEnds = 0;
            
            // Check in both directions
            for (let k = -1; k <= 1; k += 2) { // k = -1 for negative direction, k = 1 for positive
                let r = row + k * dx;
                let c = col + k * dy;
                let streak = 0;
                
                // Count consecutive pieces
                while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
                    streak++;
                    r += k * dx;
                    c += k * dy;
                }
                
                // Check if the end is open
                if (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === '') {
                    openEnds++;
                }
                
                count += streak;
            }
            
            // Calculate threat level
            let threatLevel = 0;
            
            if (count >= 4) {  // 4 in a row with one or more open ends
                if (openEnds >= 1) {
                    threatLevel = 9000;  // Critical threat
                }
            } else if (count === 3) {  // 3 in a row
                if (openEnds === 2) {
                    threatLevel = 8000;  // Very serious threat - both sides open
                } else if (openEnds === 1) {
                    threatLevel = 3000;  // Serious threat - one side open
                }
            } else if (count === 2) {  // 2 in a row
                if (openEnds === 2) {
                    threatLevel = 1000;  // Potential threat developing
                }
            }
            
            maxThreat = Math.max(maxThreat, threatLevel);
        }
        
        return maxThreat;
    }
    
    // Check for win without changing the winning state variables - fixed to properly handle blockage rule
    function checkWinWithoutChangingState(row, col, player) {
        const directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal top-left to bottom-right
            [1, -1]  // diagonal top-right to bottom-left
        ];
        
        for (let i = 0; i < directions.length; i++) {
            const [dx, dy] = directions[i];
            let count = 1;
            let endPoints = [];
            
            // Check in positive direction
            let r = row + dx;
            let c = col + dy;
            while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
                count++;
                r += dx;
                c += dy;
            }
            
            // Check end point type
            if (r >= 0 && r < size && c >= 0 && c < size) {
                endPoints.push(gameBoard[r][c]);
            } else {
                endPoints.push('edge');
            }
            
            // Check in negative direction
            r = row - dx;
            c = col - dy;
            while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
                count++;
                r -= dx;
                c -= dy;
            }
            
            // Check end point type
            if (r >= 0 && r < size && c >= 0 && c < size) {
                endPoints.push(gameBoard[r][c]);
            } else {
                endPoints.push('edge');
            }
            
            if (count >= 5) {
                // Apply rule: if both ends are blocked by opponent, not winning
                const opponent = player === 'X' ? 'O' : 'X';
                const blockedEnds = endPoints.filter(end => end === opponent).length;
                
                if (blockedEnds < 2) {  // FIXED: < 2 means it's winning unless BOTH ends are blocked
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Fix the original checkWin function to properly handle blockage rule
    function checkWin(row, col) {
        const directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal top-left to bottom-right
            [1, -1]  // diagonal top-right to bottom-left
        ];
        
        const player = gameBoard[row][col];
        const opponent = player === 'X' ? 'O' : 'X';
        
        for (let i = 0; i < directions.length; i++) {
            const [dx, dy] = directions[i];
            let count = 1;
            let endPoints = [];
            
            // Check in positive direction
            let r = row + dx;
            let c = col + dy;
            while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
                count++;
                r += dx;
                c += dy;
            }
            
            // Kiểm tra điểm cuối thứ nhất
            if (r >= 0 && r < size && c >= 0 && c < size) {
                endPoints.push(gameBoard[r][c]); // Lưu giá trị ở điểm cuối (có thể là '', 'X', hoặc 'O')
            } else {
                endPoints.push('edge'); // Nếu ra ngoài biên, đánh dấu là 'edge'
            }
            
            // Check in negative direction
            r = row - dx;
            c = col - dy;
            while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
                count++;
                r -= dx;
                c -= dy;
            }
            
            // Kiểm tra điểm cuối thứ hai
            if (r >= 0 && r < size && c >= 0 && c < size) {
                endPoints.push(gameBoard[r][c]); // Lưu giá trị ở điểm cuối
            } else {
                endPoints.push('edge'); // Nếu ra ngoài biên, đánh dấu là 'edge'
            }
            
            if (count >= 5) {
                // Áp dụng luật "chặn 2 đầu"
                // Đếm số lượng đầu bị chặn bởi quân đối phương
                const blockedEnds = endPoints.filter(end => end === opponent).length;
                
                // Nếu cả hai đầu đều bị chặn, không tính là thắng
                if (blockedEnds >= 2) {  // FIXED: >= 2 means both ends are blocked, so continue checking
                    continue; // Tiếp tục kiểm tra hướng khác
                }
                
                // Store winning direction and position for highlighting
                winningDirection = i;
                winningPosition = [row, col];
                return true;
            }
        }
        
        return false;
    }
    
    // Advanced threat evaluation - adjusted for better balance
    function evaluateThreats(row, col, player) {
        const opponent = player === 'X' ? 'O' : 'X';
        let score = 0;
        
        // Count different types of threats
        let openFours = 0;
        let halfOpenFours = 0;
        let openThrees = 0;
        let halfOpenThrees = 0;
        let openTwos = 0;
        let splitThrees = 0;
        
        // Place the piece temporarily
        gameBoard[row][col] = player;
        
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        for (const [dx, dy] of directions) {
            // Extract sequences in this direction
            const sequence = [];
            const openEnds = [];
            
            // Forward direction
            let consecutive = 0;
            for (let i = 1; i <= 5; i++) {
                const r = row + i * dx;
                const c = col + i * dy;
                
                if (r >= 0 && r < size && c >= 0 && c < size) {
                    if (gameBoard[r][c] === player) {
                        consecutive++;
                    } else if (gameBoard[r][c] === '') {
                        openEnds.push({open: true, distance: i});
                        break;
                    } else {
                        openEnds.push({open: false, distance: i});
                        break;
                    }
                } else {
                    openEnds.push({open: false, distance: i});
                    break;
                }
            }
            
            // Backward direction
            let backConsecutive = 0;
            for (let i = 1; i <= 5; i++) {
                const r = row - i * dx;
                const c = col - i * dy;
                
                if (r >= 0 && r < size && c >= 0 && c < size) {
                    if (gameBoard[r][c] === player) {
                        backConsecutive++;
                    } else if (gameBoard[r][c] === '') {
                        openEnds.push({open: true, distance: i});
                        break;
                    } else {
                        openEnds.push({open: false, distance: i});
                        break;
                    }
                } else {
                    openEnds.push({open: false, distance: i});
                    break;
                }
            }
            
            // Calculate total consecutive pieces including the current position
            const totalConsecutive = 1 + consecutive + backConsecutive;
            
            // Count truly open ends (empty cells)
            const totalOpenEnds = openEnds.filter(end => end.open).length;
            
            // Check for split patterns (gaps with pieces on both sides)
            let hasSplitPattern = false;
            if (totalConsecutive >= 2 && totalOpenEnds >= 1) {
                // Check for patterns with gaps (like O_O, O__O)
                const gapCheckRadius = 3;
                for (let dist = 1; dist <= gapCheckRadius; dist++) {
                    // Check for gap and then piece in positive direction
                    const r1 = row + (consecutive + 1) * dx;
                    const c1 = col + (consecutive + 1) * dy;
                    const r2 = row + (consecutive + 1 + dist) * dx;
                    const c2 = col + (consecutive + 1 + dist) * dy;
                    
                    if (isValidCell(r1, c1) && isValidCell(r2, c2) && 
                        gameBoard[r1][c1] === '' && gameBoard[r2][c2] === player) {
                        splitThrees++;
                        hasSplitPattern = true;
                    }
                    
                    // Check for gap and then piece in negative direction
                    const r3 = row - (backConsecutive + 1) * dx;
                    const c3 = col - (backConsecutive + 1) * dy;
                    const r4 = row - (backConsecutive + 1 + dist) * dx;
                    const c4 = col - (backConsecutive + 1 + dist) * dy;
                    
                    if (isValidCell(r3, c3) && isValidCell(r4, c4) && 
                        gameBoard[r3][c3] === '' && gameBoard[r4][c4] === player) {
                        splitThrees++;
                        hasSplitPattern = true;
                    }
                }
            }
            
            // Classify the threat type with improved detection
            if (totalConsecutive === 4) {
                if (totalOpenEnds === 2) {
                    openFours++;
                } else if (totalOpenEnds === 1) {
                    halfOpenFours++;
                }
            } else if (totalConsecutive === 3) {
                if (totalOpenEnds === 2) {
                    openThrees++;
                } else if (totalOpenEnds === 1) {
                    halfOpenThrees++;
                    if (hasSplitPattern) {
                        // Special case: Three with possible extension through a gap
                        openThrees++;
                    }
                }
            } else if (totalConsecutive === 2) {
                if (totalOpenEnds === 2) {
                    openTwos++;
                }
            }
        }
        
        // Score for multiple threats (especially critical: double open threes, open four + open three)
        if (openFours >= 1) {
            score += 5000;
        }
        
        if (halfOpenFours >= 2) {
            score += 4000;
        }
        
        if (openThrees >= 2) {
            score += 3500; // Double open three is very powerful
        }
        
        if (splitThrees >= 2) {
            score += 3000; // Multiple split threes can form strong threats
        }
        
        if (openFours >= 1 && openThrees >= 1) {
            score += 6000; // Extremely powerful combination
        }
        
        if (halfOpenFours >= 1 && openThrees >= 1) {
            score += 4500;
        }
        
        if (openThrees >= 1 && openTwos >= 2) {
            score += 2500; // Three with multiple twos can form multiple threats
        }
        
        if (halfOpenThrees >= 2) {
            score += 1500; // Multiple half-open threes can be threatening
        }
        
        // Individual threat scores
        score += openFours * 3000;
        score += halfOpenFours * 1500;
        score += openThrees * 1000;
        score += halfOpenThrees * 400;
        score += openTwos * 200;
        score += splitThrees * 800;
        
        // Remove the temporary piece
        gameBoard[row][col] = '';
        
        return score;
    }
    
    // Strategic opening moves for AI
    function findStrategicOpening() {
        const centerRow = Math.floor(size / 2);
        const centerCol = Math.floor(size / 2);
        
        // Improved opening strategy
        // 1. If this is the first move of the game, choose center or nearby
        let totalPieces = 0;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (gameBoard[i][j] !== '') {
                    totalPieces++;
                }
            }
        }
        
        // First move strategy - prefer center and surrounding area
        if (totalPieces === 0 || totalPieces === 1) {
            // Center is always best for first move
            if (gameBoard[centerRow][centerCol] === '') {
                return {row: centerRow, col: centerCol};
            }
            
            // If center is taken, use one of the 8 positions surrounding center
            // But slightly prefer diagonal positions
            const surroundingPositions = [
                {row: centerRow-1, col: centerCol-1, weight: 1.2}, // top-left (diagonal)
                {row: centerRow-1, col: centerCol, weight: 1.0},   // top
                {row: centerRow-1, col: centerCol+1, weight: 1.2}, // top-right (diagonal)
                {row: centerRow, col: centerCol-1, weight: 1.0},   // left
                {row: centerRow, col: centerCol+1, weight: 1.0},   // right
                {row: centerRow+1, col: centerCol-1, weight: 1.2}, // bottom-left (diagonal)
                {row: centerRow+1, col: centerCol, weight: 1.0},   // bottom
                {row: centerRow+1, col: centerCol+1, weight: 1.2}  // bottom-right (diagonal)
            ];
            
            // Filter valid positions
            const validPositions = surroundingPositions.filter(pos => 
                pos.row >= 0 && pos.row < size && 
                pos.col >= 0 && pos.col < size && 
                gameBoard[pos.row][pos.col] === ''
            );
            
            if (validPositions.length > 0) {
                // Select position with weighting
                const totalWeight = validPositions.reduce((sum, pos) => sum + pos.weight, 0);
                let randomWeight = Math.random() * totalWeight;
                
                for (const pos of validPositions) {
                    randomWeight -= pos.weight;
                    if (randomWeight <= 0) {
                        return {row: pos.row, col: pos.col};
                    }
                }
                
                return validPositions[0]; // Fallback
            }
        }
        
        // Advanced opening or mid-game strategy
        const potentialMoves = [];
        const moveScores = [];
        
        // Consider all empty cells
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (gameBoard[i][j] === '') {
                    if (hasNeighbor(i, j, 3)) { // Look wider for strategic positions
                        const distanceFromCenter = Math.sqrt(
                            Math.pow(i - centerRow, 2) + 
                            Math.pow(j - centerCol, 2)
                        );
                        
                        // Calculate strategic value based on multiple factors
                        let strategicValue = 1000 - distanceFromCenter * 50;
                        
                        // Check for special patterns
                        strategicValue += evaluateOpeningPattern(i, j);
                        
                        // NEW: Add value for positions that control more empty space
                        strategicValue += evaluateSpaceControl(i, j);
                        
                        // NEW: Consider opponent's pieces distribution
                        strategicValue += evaluateOpponentDistribution(i, j);
                        
                        potentialMoves.push({row: i, col: j});
                        moveScores.push(strategicValue);
                    }
                }
            }
        }
        
        // If no good move found, try to find any move close to existing pieces
        if (potentialMoves.length === 0) {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    if (gameBoard[i][j] === '') {
                        if (hasNeighbor(i, j, 5)) { // Extended radius for desperate situations
                            return {row: i, col: j};
                        }
                    }
                }
            }
            
            // Last resort: random move
            return makeRandomMove();
        }
        
        // Find best strategic opening move
        let maxScoreIndex = 0;
        for (let i = 1; i < moveScores.length; i++) {
            if (moveScores[i] > moveScores[maxScoreIndex]) {
                maxScoreIndex = i;
            }
        }
        
        return potentialMoves[maxScoreIndex];
    }
    
    // NEW: Evaluate space control - positions that control more empty space are valuable
    function evaluateSpaceControl(row, col) {
        let score = 0;
        let emptySpaces = 0;
        
        // Check in all 8 directions
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dx, dy] of directions) {
            for (let dist = 1; dist <= 4; dist++) {
                const r = row + dx * dist;
                const c = col + dy * dist;
                
                if (isValidCell(r, c)) {
                    if (gameBoard[r][c] === '') {
                        emptySpaces++;
                    } else {
                        break; // Stop counting in this direction once we hit a piece
                    }
                } else {
                    break; // Stop at board edge
                }
            }
        }
        
        // Higher score for positions controlling more empty spaces
        score = emptySpaces * 10;
        
        return score;
    }
    
    // NEW: Evaluate opponent distribution to counter their strategy
    function evaluateOpponentDistribution(row, col) {
        const opponent = 'X'; // Player is X
        let score = 0;
        
        // Count opponent pieces in different regions
        let opponentPiecesHorizontal = 0;
        let opponentPiecesVertical = 0;
        let opponentPiecesDiagonal1 = 0; // Top-left to bottom-right
        let opponentPiecesDiagonal2 = 0; // Top-right to bottom-left
        
        const searchRadius = 5;
        
        // Horizontal search
        for (let c = Math.max(0, col - searchRadius); c <= Math.min(size - 1, col + searchRadius); c++) {
            if (gameBoard[row][c] === opponent) {
                opponentPiecesHorizontal++;
            }
        }
        
        // Vertical search
        for (let r = Math.max(0, row - searchRadius); r <= Math.min(size - 1, row + searchRadius); r++) {
            if (gameBoard[r][col] === opponent) {
                opponentPiecesVertical++;
            }
        }
        
        // Diagonal 1 search (top-left to bottom-right)
        for (let i = -searchRadius; i <= searchRadius; i++) {
            const r = row + i;
            const c = col + i;
            if (isValidCell(r, c) && gameBoard[r][c] === opponent) {
                opponentPiecesDiagonal1++;
            }
        }
        
        // Diagonal 2 search (top-right to bottom-left)
        for (let i = -searchRadius; i <= searchRadius; i++) {
            const r = row + i;
            const c = col - i;
            if (isValidCell(r, c) && gameBoard[r][c] === opponent) {
                opponentPiecesDiagonal2++;
            }
        }
        
        // Prefer positions that block opponent's developing patterns
        const maxCount = Math.max(
            opponentPiecesHorizontal,
            opponentPiecesVertical, 
            opponentPiecesDiagonal1,
            opponentPiecesDiagonal2
        );
        
        // Higher score for blocking opponent's strongest line
        score = maxCount * 20;
        
        return score;
    }
    
    // Enhanced pattern evaluation for opening moves
    function evaluateOpeningPattern(row, col) {
        let score = 0;
        const player = 'O'; // AI is O
        const opponent = 'X'; // Player is X
        
        // Check for knight's move patterns (very powerful in Gomoku)
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        let ownKnightConnections = 0;
        for (const [dx, dy] of knightMoves) {
            const r = row + dx;
            const c = col + dy;
            if (isValidCell(r, c)) {
                if (gameBoard[r][c] === player) {
                    ownKnightConnections++;
                    score += 60; // Knight's formation is good
                }
            }
        }
        
        // Check for diagonal and straight line formations
        const directions = [
            [0, 1], [1, 0], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            let ownPieces = 0;
            let emptySpaces = 0;
            let opponentPieces = 0;
            let jumpConnections = 0;
            
            // Look 4 steps in each direction
            for (let step = -3; step <= 3; step++) {
                if (step === 0) continue; // Skip the current position
                
                const r = row + dx * step;
                const c = col + dy * step;
                
                if (isValidCell(r, c)) {
                    if (gameBoard[r][c] === player) {
                        ownPieces++;
                        
                        // Check for jump connections (like O_O)
                        if (step === 2 || step === -2) {
                            // Check if there's an empty space between
                            const middleR = row + dx * (step/2);
                            const middleC = col + dy * (step/2);
                            if (isValidCell(middleR, middleC) && gameBoard[middleR][middleC] === '') {
                                jumpConnections++;
                            }
                        }
                    } else if (gameBoard[r][c] === '') {
                        emptySpaces++;
                    } else {
                        opponentPieces++;
                    }
                }
            }
            
            // Evaluate the formation potential
            if (ownPieces > 0 && opponentPieces === 0) {
                // Potential to form a line with existing pieces
                score += ownPieces * 40;
                
                // Bonus for jump connections (like O_O)
                score += jumpConnections * 80;
                
                // Check for specific patterns like "O_O" (one piece, empty, one piece)
                gameBoard[row][col] = player; // Temporarily place a piece
                for (let dist = 1; dist <= 3; dist++) {
                    const r1 = row + dx * dist;
                    const c1 = col + dy * dist;
                    const r2 = row - dx * dist;
                    const c2 = col - dy * dist;
                    
                    // Check both directions
                    if (isValidCell(r1, c1) && isValidCell(r2, c2)) {
                        if (gameBoard[r1][c1] === player && gameBoard[r2][c2] === player) {
                            score += 180; // Strong line formation
                        }
                    }
                }
                gameBoard[row][col] = ''; // Reset
            }
        }
        
        // NEW: Check for defense against opponent's developing patterns
        gameBoard[row][col] = player; // Temporarily place our piece
        
        // Look for potential threats from opponent that would be neutralized
        let neutralizedThreats = 0;
        for (let i = Math.max(0, row - 3); i <= Math.min(size - 1, row + 3); i++) {
            for (let j = Math.max(0, col - 3); j <= Math.min(size - 1, col + 3); j++) {
                if (gameBoard[i][j] === '') {
                    gameBoard[i][j] = opponent;
                    const threatLevel = evaluatePosition(i, j, opponent);
                    gameBoard[i][j] = '';
                    
                    if (threatLevel > 500) {
                        neutralizedThreats++;
                    }
                }
            }
        }
        
        // Bonus for neutralizing potential opponent threats
        score += neutralizedThreats * 70;
        
        gameBoard[row][col] = ''; // Reset
        
        // NEW: Special bonus for creating multiple potential directions of attack
        const potentialDirections = directions.filter(([dx, dy]) => {
            // Count continuous empty spaces or own pieces in this direction
            let validDirection = false;
            for (let step = 1; step <= 4; step++) {
                const r = row + dx * step;
                const c = col + dy * step;
                if (isValidCell(r, c) && (gameBoard[r][c] === '' || gameBoard[r][c] === player)) {
                    validDirection = true;
                } else {
                    break;
                }
            }
            
            return validDirection;
        });
        
        // Bonus for having multiple open directions to develop
        score += potentialDirections.length * 40;
        
        return score;
    }
    
    // Check if cell coordinates are valid
    function isValidCell(row, col) {
        return row >= 0 && row < size && col >= 0 && col < size;
    }
    
    // Complex position evaluation with deeper analysis
    function evaluateComplexPosition(row, col, player, depth, cache) {
        // Generate a unique key for caching
        const cacheKey = `${row}-${col}-${player}-${depth}`;
        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }
        
        const opponent = player === 'X' ? 'O' : 'X';
        let totalScore = 0;
        
        // Basic position score using existing function
        const baseScore = evaluatePosition(row, col, player);
        totalScore += baseScore;
        
        // Spatial awareness: give bonus to moves that control strategic areas
        totalScore += evaluateSpatialControl(row, col, player);
        
        // Pattern recognition for advanced threats and defenses
        totalScore += evaluatePatterns(row, col, player);
        
        // Threat assessment: evaluate the creation of multiple threats
        totalScore += evaluateThreats(row, col, player);
        
        // Check for special winning or defensive patterns
        totalScore += evaluateSpecialPatterns(row, col, player);

        // NEW: Defensive positioning - analyze opponent's potential next moves
        totalScore += evaluateDefensivePositioning(row, col, player);
        
        // NEW: Analyze surrounding empty cells for future potential
        totalScore += evaluateEmptyCellsAround(row, col, player);
        
        // Look ahead to opponent's potential responses, but only if depth allows
        // and we're not at the end of thinking time
        if (depth > 1) {
            totalScore += evaluateOpponentResponses(row, col, player, depth - 1);
        }
        
        // Store result in cache
        cache.set(cacheKey, totalScore);
        return totalScore;
    }
    
    // NEW: Evaluate defensive positioning
    function evaluateDefensivePositioning(row, col, player) {
        const opponent = player === 'X' ? 'O' : 'X';
        let score = 0;
        
        // Temporarily place our piece
        gameBoard[row][col] = player;
        
        // Check all empty cells for opponent threats
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (gameBoard[i][j] === '' && hasNeighbor(i, j, 2)) {
                    // Simulate opponent move
                    gameBoard[i][j] = opponent;
                    
                    // Check if opponent creates win or strong threat
                    const createsWin = checkWinWithoutChangingState(i, j, opponent);
                    const threatScore = evaluatePosition(i, j, opponent);
                    
                    // If opponent can win, heavily penalize our current move
                    if (createsWin) {
                        score -= 50000;
                    }
                    // If opponent creates strong threat, penalize proportionally
                    else if (threatScore > 5000) {
                        score -= threatScore / 2;
                    }
                    // If opponent creates moderate threat, penalize less severely
                    else if (threatScore > 1000) {
                        score -= threatScore / 4;
                    }
                    
                    // Remove simulated opponent piece
                    gameBoard[i][j] = '';
                }
                
                // Limit calculation for performance
                if (score < -50000) break;
            }
            if (score < -50000) break;
        }
        
        // Remove our temporary piece
        gameBoard[row][col] = '';
        
        return score;
    }
    
    // NEW: Evaluate empty cells around for future potential
    function evaluateEmptyCellsAround(row, col, player) {
        let score = 0;
        const opponent = player === 'X' ? 'O' : 'X';
        
        // Temporarily place our piece
        gameBoard[row][col] = player;
        
        // Check all directions from our piece
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        // Count empty spaces in different directions
        let emptyLineSpaces = 0;
        
        for (const [dx, dy] of directions) {
            // Count consecutive empty spaces in this direction
            let r = row + dx;
            let c = col + dy;
            let consecutiveEmpty = 0;
            let metOpponent = false;
            
            // Check up to 4 cells in this direction
            for (let i = 1; i <= 4; i++) {
                if (r >= 0 && r < size && c >= 0 && c < size) {
                    if (gameBoard[r][c] === '') {
                        consecutiveEmpty++;
                    } else if (gameBoard[r][c] === player) {
                        // Found own piece - good for continuity
                        consecutiveEmpty += 0.5;
                    } else {
                        metOpponent = true;
                        break;
                    }
                } else {
                    // Out of board - not useful
                    break;
                }
                r += dx;
                c += dy;
            }
            
            // Only count directions that aren't blocked by opponent
            if (!metOpponent) {
                emptyLineSpaces += consecutiveEmpty;
            }
        }
        
        // Score based on available empty spaces (future potential)
        score += emptyLineSpaces * 15;
        
        // Remove our temporary piece
        gameBoard[row][col] = '';
        
        return score;
    }
    
    // Evaluate special winning patterns
    function evaluateSpecialPatterns(row, col, player) {
        let score = 0;
        const opponent = player === 'X' ? 'O' : 'X';
        
        // Check for "hook" patterns that can force a win
        const hookPatterns = checkHookPatterns(row, col, player);
        if (hookPatterns) {
            score += 1800;
        }
        
        // Check for forcing moves that create multiple threats
        const forcingMoves = checkForcingMoves(row, col, player);
        if (forcingMoves > 1) {
            score += forcingMoves * 800;
        }
        
        return score;
    }
    
    // Check for hook patterns (L-shaped or zigzag configurations that can lead to multiple threats)
    function checkHookPatterns(row, col, player) {
        // Place the piece temporarily
        gameBoard[row][col] = player;
        
        // Check in 8 directions around the piece
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        let hooks = 0;
        
        for (let i = 0; i < directions.length; i++) {
            for (let j = i + 1; j < directions.length; j++) {
                const [dx1, dy1] = directions[i];
                const [dx2, dy2] = directions[j];
                
                // Make sure directions aren't opposite
                if (dx1 === -dx2 && dy1 === -dy2) continue;
                
                // Count consecutive pieces in both directions
                let count1 = countConsecutive(row, col, dx1, dy1, player);
                let count2 = countConsecutive(row, col, dx2, dy2, player);
                
                // Check if this forms a hook pattern (both counts >= 2)
                if (count1 >= 2 && count2 >= 2) {
                    hooks++;
                }
            }
        }
        
        // Remove the temporary piece
        gameBoard[row][col] = '';
        
        return hooks;
    }
    
    // Count consecutive pieces in a direction
    function countConsecutive(row, col, dx, dy, player) {
        let count = 0;
        let r = row + dx;
        let c = col + dy;
        
        while (r >= 0 && r < size && c >= 0 && c < size && gameBoard[r][c] === player) {
            count++;
            r += dx;
            c += dy;
        }
        
        return count;
    }
    
    // Check if a move creates forcing moves (moves that opponent must respond to)
    function checkForcingMoves(row, col, player) {
        const opponent = player === 'X' ? 'O' : 'X';
        let forcingMoves = 0;
        
        // Place the piece temporarily
        gameBoard[row][col] = player;
        
        // Look for potential threats after this move
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (gameBoard[i][j] === '') {
                    // Try placing another piece and see if it creates a threat
                    gameBoard[i][j] = player;
                    
                    // If this creates a threat that would force opponent to respond
                    if (evaluatePosition(i, j, player) >= 1000) {
                        forcingMoves++;
                    }
                    
                    gameBoard[i][j] = '';
                    
                    // Limit checking to reasonable number for performance
                    if (forcingMoves >= 3) break;
                }
            }
            if (forcingMoves >= 3) break;
        }
        
        // Remove the temporary piece
        gameBoard[row][col] = '';
        
        return forcingMoves;
    }
    
    // Evaluate opponent's potential responses to a move
    function evaluateOpponentResponses(row, col, player, depth) {
        const opponent = player === 'X' ? 'O' : 'X';
        let score = 0;
        
        // Find opponent's best responses to this move
        let bestOpponentScore = -Infinity;
        
        // Only consider reasonable opponent responses near our move
        for (let i = Math.max(0, row - 3); i <= Math.min(size - 1, row + 3); i++) {
            for (let j = Math.max(0, col - 3); j <= Math.min(size - 1, col + 3); j++) {
                if (gameBoard[i][j] === '') {
                    // Simulate opponent's move
                    gameBoard[i][j] = opponent;
                    
                    // Evaluate this position from opponent's perspective
                    const responseScore = evaluatePosition(i, j, opponent);
                    
                    // Update best opponent response
                    if (responseScore > bestOpponentScore) {
                        bestOpponentScore = responseScore;
                    }
                    
                    // Undo move
                    gameBoard[i][j] = '';
                }
            }
        }
        
        // If opponent has a very strong response, our move is worse
        if (bestOpponentScore > 5000) {
            score -= bestOpponentScore / 2;
        }
        
        return score;
    }
    
    // Evaluate spatial control of the board
    function evaluateSpatialControl(row, col, player) {
        const centerRow = Math.floor(size / 2);
        const centerCol = Math.floor(size / 2);
        let score = 0;
        
        // Center control is valuable
        const distanceFromCenter = Math.sqrt(
            Math.pow(row - centerRow, 2) + 
            Math.pow(col - centerCol, 2)
        );
        
        // Normalize distance (1.0 at center, 0.0 at corners)
        const maxPossibleDistance = Math.sqrt(
            Math.pow(centerRow, 2) + 
            Math.pow(centerCol, 2)
        );
        const normalizedDistance = 1.0 - (distanceFromCenter / maxPossibleDistance);
        
        // Center control bonus
        score += normalizedDistance * 60;
        
        // Control of quadrants - check if this move helps control a quadrant
        const quadrants = [
            // top-left
            { minR: 0, maxR: centerRow - 1, minC: 0, maxC: centerCol - 1 },
            // top-right
            { minR: 0, maxR: centerRow - 1, minC: centerCol + 1, maxC: size - 1 },
            // bottom-left
            { minR: centerRow + 1, maxR: size - 1, minC: 0, maxC: centerCol - 1 },
            // bottom-right
            { minR: centerRow + 1, maxR: size - 1, minC: centerCol + 1, maxC: size - 1 }
        ];
        
        // Check presence in each quadrant
        for (const q of quadrants) {
            if (row >= q.minR && row <= q.maxR && col >= q.minC && col <= q.maxC) {
                // Count own pieces in this quadrant
                let ownPieces = 0;
                let opponentPieces = 0;
                
                for (let i = q.minR; i <= q.maxR; i++) {
                    for (let j = q.minC; j <= q.maxC; j++) {
                        if (gameBoard[i][j] === player) {
                            ownPieces++;
                        } else if (gameBoard[i][j] !== '') {
                            opponentPieces++;
                        }
                    }
                }
                
                // Bonus for establishing presence in a quadrant
                if (ownPieces > opponentPieces) {
                    score += 30;
                }
                
                // Bonus for first move in an empty quadrant
                if (ownPieces === 0 && opponentPieces === 0) {
                    score += 25;
                }
            }
        }
        
        return score;
    }
    
    // Advanced pattern recognition
    function evaluatePatterns(row, col, player) {
        const opponent = player === 'X' ? 'O' : 'X';
        let score = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        for (const [dx, dy] of directions) {
            // Extract line of 9 cells centered on our move
            const line = [];
            for (let i = -4; i <= 4; i++) {
                const r = row + i * dx;
                const c = col + i * dy;
                
                if (r >= 0 && r < size && c >= 0 && c < size) {
                    if (i === 0) {
                        line.push(player); // Our current move
                    } else {
                        line.push(gameBoard[r][c]);
                    }
                } else {
                    line.push('edge'); // Mark cells outside the board
                }
            }
            
            // Convert line to a string for pattern matching
            const lineStr = line.map(cell => {
                if (cell === player) return 'O';
                if (cell === opponent) return 'X';
                if (cell === '') return '_';
                return '#'; // edge
            }).join('');
            
            // Pattern detection
            // Double-three (two open threes) - very powerful
            if (lineStr.includes('_OOO_') || lineStr.includes('_O_OO_') || lineStr.includes('_OO_O_')) {
                score += 900;
            }
            
            // Four with one side open
            if (lineStr.includes('_OOOO') || lineStr.includes('OOOO_')) {
                score += 2500;
            }
            
            // Four with both sides open
            if (lineStr.includes('_OOOO_')) {
                score += 8000;
            }
            
            // Three with both sides open
            if (lineStr.includes('_OOO_')) {
                score += 800;
            }
            
            // Split four patterns (like _OO_O_ or _O_OO_)
            if (lineStr.includes('_OO_O_') || lineStr.includes('_O_OO_')) {
                score += 700;
            }
            
            // Knight's move pattern (can lead to multiple threats)
            // This is approximate as we need a 2D check for accurate knight moves
            if (lineStr.includes('_O_O_O_')) {
                score += 550;
            }
        }
        
        return score;
    }
    
    // Restore appropriate dragging capabilities
    function restoreBoardDraggability() {
        // Remove previous event listeners if they exist
        if (boardContainer) {
            boardContainer.removeEventListener('mousedown', handleMouseDown);
            boardContainer.removeEventListener('mousemove', handleMouseMove);
            boardContainer.removeEventListener('mouseup', handleMouseUp);
            boardContainer.removeEventListener('mouseleave', handleMouseUp);
            boardContainer.removeEventListener('wheel', handleWheel);
            
            // Add them back with the current context
            boardContainer.addEventListener('mousedown', handleMouseDown);
            boardContainer.addEventListener('mousemove', handleMouseMove);
            boardContainer.addEventListener('mouseup', handleMouseUp);
            boardContainer.addEventListener('mouseleave', handleMouseUp);
            boardContainer.addEventListener('wheel', handleWheel);
        }
    }
    
    // Additional initialization
    window.addEventListener('resize', updateBoardSize);
    
    // Initialize the game
    showGameSelection();
    
    // Log initialization complete
    console.log('Game initialized successfully');

    // Function to display notifications to users
    function showNotification(message, isError = false) {
        // Remove any existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = isError ? 'notification error' : 'notification';
        notification.textContent = message;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            
            // Remove from DOM after fade out
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Restore appropriate dragging capabilities
}); 