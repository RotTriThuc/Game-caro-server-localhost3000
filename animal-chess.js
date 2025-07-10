// File này sẽ được viết lại hoàn toàn để sửa lỗi logic game. 

class AnimalChess {
    constructor() {
        this.board = null;
        this.cells = [];
        this.pieces = [];
        this.selectedPiece = null;
        this.currentPlayer = 'blue';
        this.gameActive = true;
        this.statusElement = null;
        this.aiEnabled = false;
        this.ai = null;
        this.aiThinking = false;
        this.gameMode = 'local'; // 'local' hoặc 'ai'

        this.animalRanks = { 'E': 8, 'L': 7, 'T': 6, 'P': 5, 'D': 4, 'W': 3, 'C': 2, 'R': 1 };
        this.animalNames = { 'E': 'Voi', 'L': 'Sư tử', 'T': 'Cọp', 'P': 'Báo', 'D': 'Chó', 'W': 'Sói', 'C': 'Mèo', 'R': 'Chuột' };
        this.animalIcons = { 'E': '🐘', 'L': '🦁', 'T': '🐯', 'P': '🐆', 'D': '🐕', 'W': '🐺', 'C': '🐱', 'R': '🐭' };
    }

    init(containerId, gameMode = 'local', aiDifficulty = 'medium') {
        const container = document.getElementById(containerId);
        container.innerHTML = ''; // Xóa nội dung cũ

        this.gameMode = gameMode;
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'animal-chess-status';
        container.appendChild(this.statusElement);

        this.board = document.createElement('div');
        this.board.className = 'animal-chess-board';
        container.appendChild(this.board);

        this.createBoard();
        this.initializePieces();
        
        // Khởi tạo AI nếu chơi với máy
        if (gameMode === 'ai') {
            this.aiEnabled = true;
            this.ai = new AnimalChessAI(this, aiDifficulty);
        }
        
        this.updateStatus();

        const controls = document.createElement('div');
        controls.className = 'animal-chess-controls';
        controls.innerHTML = `
            <button class="animal-chess-button reset-button">Chơi lại</button>
            <button class="animal-chess-button rules-button">Luật chơi</button>
            <button class="animal-chess-button back-button">Quay lại</button>
        `;
        container.appendChild(controls);

        controls.querySelector('.reset-button').addEventListener('click', () => this.resetGame());
        controls.querySelector('.rules-button').addEventListener('click', () => this.showRules());
        controls.querySelector('.back-button').addEventListener('click', () => this.backToSelection());
    }

    createBoard() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 7; col++) {
                const cell = document.createElement('div');
                cell.className = 'animal-chess-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (this.isDen(row, col)) {
                    cell.classList.add('den');
                    cell.dataset.owner = (row === 0) ? 'blue' : 'red';
                    cell.id = (row === 0) ? 'blue-den' : 'red-den';
                }
                
                if (this.isWater(row, col)) cell.classList.add('water');
                
                if (this.isTrap(row, col)) {
                    cell.classList.add('trap');
                    const owner = (row < 3) ? 'blue' : 'red';
                    cell.dataset.owner = owner;
                    // Thêm ID cho từng bẫy để dễ nhận diện
                    const trapIndex = this.getTrapIndex(row, col, owner);
                    cell.id = `${owner}-trap-${trapIndex}`;
                }

                cell.addEventListener('click', () => this.handleCellClick(row, col));
                this.board.appendChild(cell);
                this.cells.push(cell);
            }
        }
    }

    initializePieces() {
        this.pieces.forEach(p => p.element.remove());
        this.pieces = [];
        const initialSetup = [
            // Blue
            { animal: 'L', row: 0, col: 0, player: 'blue' }, { animal: 'T', row: 0, col: 6, player: 'blue' },
            { animal: 'D', row: 1, col: 1, player: 'blue' }, { animal: 'C', row: 1, col: 5, player: 'blue' },
            { animal: 'R', row: 2, col: 0, player: 'blue' }, { animal: 'W', row: 2, col: 2, player: 'blue' },
            { animal: 'P', row: 2, col: 4, player: 'blue' }, { animal: 'E', row: 2, col: 6, player: 'blue' },
            // Red
            { animal: 'E', row: 6, col: 0, player: 'red' }, { animal: 'P', row: 6, col: 2, player: 'red' },
            { animal: 'W', row: 6, col: 4, player: 'red' }, { animal: 'R', row: 6, col: 6, player: 'red' },
            { animal: 'C', row: 7, col: 1, player: 'red' }, { animal: 'D', row: 7, col: 5, player: 'red' },
            { animal: 'T', row: 8, col: 0, player: 'red' }, { animal: 'L', row: 8, col: 6, player: 'red' },
        ];

        initialSetup.forEach(data => this.createPiece(data));
    }
    
    createPiece(data) {
        const piece = {
            ...data,
            rank: this.animalRanks[data.animal],
            originalRank: this.animalRanks[data.animal], // Lưu giữ bậc gốc
            element: document.createElement('div')
        };

        piece.element.className = `animal-chess-piece ${piece.player}`;
        piece.element.dataset.animal = piece.animal;
        piece.element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handlePieceClick(piece);
        });
        
        const power = this.animalRanks[data.animal];
        piece.element.innerHTML = `
            <div class="animal-icon">${this.animalIcons[piece.animal]}</div>
            <div class="piece-label">${this.animalNames[piece.animal]}</div>
            <div class="power-display" title="Bậc ${power}">${power}</div>
        `;

        this.pieces.push(piece);
        this.placePiece(piece, piece.row, piece.col);
    }
    
    placePiece(piece, row, col) {
        piece.row = row;
        piece.col = col;
        const cell = this.getCellAt(row, col);
        cell.appendChild(piece.element);
        
        // Kiểm tra xem quân cờ có đang ở trong bẫy của đối phương không
        this.checkAndUpdateTrapStatus(piece);
    }

    // Hàm mới để kiểm tra và cập nhật trạng thái bẫy
    checkAndUpdateTrapStatus(piece) {
        const cell = this.getCellAt(piece.row, piece.col);
        
        // Xóa class trapped nếu có
        piece.element.classList.remove('trapped');
        
        // Khôi phục bậc gốc
        piece.rank = piece.originalRank;
        
        // Nếu quân cờ đang ở trong bẫy của đối phương
        if (this.isTrap(piece.row, piece.col) && cell.dataset.owner !== piece.player) {
            // Đánh dấu quân cờ là đã bị bẫy
            piece.element.classList.add('trapped');
            // Đặt bậc về 0
            piece.rank = 0;
            
            // Cập nhật hiển thị bậc
            const powerDisplay = piece.element.querySelector('.power-display');
            if (powerDisplay) {
                powerDisplay.textContent = '0';
                powerDisplay.title = 'Bậc 0 (Đã bị bẫy)';
            }
        } else {
            // Cập nhật hiển thị bậc về bậc gốc
            const powerDisplay = piece.element.querySelector('.power-display');
            if (powerDisplay) {
                powerDisplay.textContent = piece.originalRank;
                powerDisplay.title = `Bậc ${piece.originalRank}`;
            }
        }
    }

    handlePieceClick(piece) {
        // Ngăn sự kiện click lan ra ô chứa nó
        // e.stopPropagation(); // Giữ lại stopPropagation nếu có event object, nhưng ở đây không có

        // Trường hợp 1: Click vào quân của mình để chọn hoặc bỏ chọn
        if (this.gameActive && piece.player === this.currentPlayer) {
            if (this.selectedPiece === piece) {
                this.clearSelection(); // Bỏ chọn nếu click lại quân đang chọn
            } else {
                this.clearSelection(); // Xóa lựa chọn cũ
                this.selectedPiece = piece;
                piece.element.classList.add('selected');
                this.highlightPossibleMoves(piece);
            }
            return;
        }

        // Trường hợp 2: Đã chọn 1 quân, và click vào quân của đối phương để tấn công
        if (this.gameActive && this.selectedPiece && piece.player !== this.currentPlayer) {
            // Gọi handleCellClick với tọa độ của quân cờ đối phương
            this.handleCellClick(piece.row, piece.col);
            return;
        }

        // Trường hợp khác: Click vào quân đối phương khi chưa chọn quân nào, v.v.
        this.clearSelection();
    }

    handleCellClick(row, col) {
        if (!this.gameActive || this.aiThinking) return;

        const move = this.getPossibleMoves(this.selectedPiece).find(m => m.row === row && m.col === col);

        if (move) {
            const targetPiece = this.getPieceAt(row, col);
            
            if (targetPiece) {
                this.capturePiece(targetPiece);
            }
            
            this.movePiece(this.selectedPiece, row, col);
            this.checkWinCondition(this.selectedPiece);

            if (this.gameActive) {
                this.switchPlayer();
                this.updateStatus();
                
                // Nếu đang chơi với AI và đến lượt AI
                if (this.aiEnabled && this.currentPlayer === 'red' && this.gameActive) {
                    this.makeAIMove();
                }
            }
            
            this.clearSelection();
        } else {
            this.clearSelection();
        }
    }
    
    movePiece(piece, row, col) {
        const fromCell = this.getCellAt(piece.row, piece.col);
        // Clean up child nodes before moving
        Array.from(fromCell.children).forEach(child => {
            if (child === piece.element) {
                // It seems not necessary to remove it, as appendChild will move it
            }
        });
        this.placePiece(piece, row, col);
    }
    
    capturePiece(piece) {
        piece.element.remove();
        this.pieces = this.pieces.filter(p => p !== piece);
    }
    
    highlightPossibleMoves(piece) {
        const moves = this.getPossibleMoves(piece);
        moves.forEach(move => {
            this.getCellAt(move.row, move.col).classList.add('possible-move');
        });
    }

    getPossibleMoves(piece) {
        const moves = [];
        const { row, col, animal } = piece;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        // Standard 1-square moves
        directions.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidMove(piece, newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        // Lion/Tiger jump over water
        if (animal === 'L' || animal === 'T') {
            directions.forEach(([dr, dc]) => {
                if (this.isWater(row + dr, col + dc)) {
                    let r = row + dr, c = col + dc;
                    while(this.isWater(r, c)) {
                        r += dr; c += dc;
                    }
                    if (this.isValidMove(piece, r, c)) {
                        moves.push({ row: r, col: c });
                    }
                }
            });
        }
        return moves;
    }

    isValidMove(piece, toRow, toCol) {
        if (toRow < 0 || toRow > 8 || toCol < 0 || toCol > 6) return false;

        const targetCell = this.getCellAt(toRow, toCol);
        if (this.isDen(toRow, toCol) && targetCell.dataset.owner === piece.player) return false;

        if (this.isWater(toRow, toCol) && piece.animal !== 'R') return false;

        const targetPiece = this.getPieceAt(toRow, toCol);
        if (targetPiece) {
            if (targetPiece.player === piece.player) return false;
            if (!this.canCapture(piece, targetPiece)) return false;
        }

        return true;
    }

    canCapture(attacker, defender) {
        // Nếu người phòng thủ đang ở trong bẫy, bất kỳ quân nào cũng có thể bắt
        const defenderCell = this.getCellAt(defender.row, defender.col);
        if (this.isTrap(defender.row, defender.col) && defenderCell.dataset.owner !== defender.player) {
            return true; // Defender is trapped, can be captured by anything
        }
        
        // Nếu người tấn công đang ở trong bẫy, không thể bắt quân nào
        const attackerCell = this.getCellAt(attacker.row, attacker.col);
        if (this.isTrap(attacker.row, attacker.col) && attackerCell.dataset.owner !== attacker.player) {
            return false; // Attacker is trapped, cannot capture
        }

        // Water rules
        const attackerInWater = this.isWater(attacker.row, attacker.col);
        const defenderInWater = this.isWater(defender.row, defender.col);
        if (attackerInWater && !defenderInWater) return false; // Rat in water cannot attack land piece
        if (!attackerInWater && defenderInWater) return false; // Land piece cannot attack Rat in water
        if (attackerInWater && defenderInWater) return true; // Rat vs Rat in water

        // Special case: Rat captures Elephant
        if (attacker.animal === 'R' && defender.animal === 'E') return true;

        // Special case: Elephant cannot capture Rat
        if (attacker.animal === 'E' && defender.animal === 'R') return false;

        // Standard rank comparison
        return attacker.rank >= defender.rank;
    }

    switchPlayer() {
        this.currentPlayer = (this.currentPlayer === 'blue') ? 'red' : 'blue';
    }

    updateStatus(customMessage = null) {
        if (customMessage) {
            this.statusElement.textContent = customMessage;
            return;
        }
        
        if (!this.gameActive) {
            return; // Giữ nguyên thông báo người thắng
        }
        
        const playerText = this.currentPlayer === 'blue' ? 'Xanh (Người chơi)' : 'Đỏ' + (this.aiEnabled ? ' (Máy)' : '');
        this.statusElement.textContent = `Lượt của: ${playerText}`;
    }

    clearSelection() {
        if (this.selectedPiece) {
            this.selectedPiece.element.classList.remove('selected');
        }
        this.selectedPiece = null;
        this.cells.forEach(cell => cell.classList.remove('possible-move'));
    }
    
    checkWinCondition(piece) {
        // Win by entering opponent's den
        const denOwner = piece.row === 0 ? 'blue' : 'red';
        if (this.isDen(piece.row, piece.col) && piece.player !== denOwner) {
            this.endGame(piece.player);
        }

        // Win by eliminating all opponent's pieces
        const opponent = piece.player === 'blue' ? 'red' : 'blue';
        const opponentPieces = this.pieces.filter(p => p.player === opponent);
        if (opponentPieces.length === 0) {
            this.endGame(piece.player);
        }
    }

    endGame(winner) {
        this.gameActive = false;
        this.statusElement.textContent = `Người chơi ${winner === 'blue' ? 'Xanh' : 'Đỏ'} thắng!`;
    }

    resetGame() {
        this.gameActive = true;
        this.currentPlayer = 'blue';
        this.clearSelection();
        this.initializePieces();
        this.updateStatus();
        
        // Nếu AI đi trước (hiếm khi xảy ra, nhưng để phòng trường hợp)
        if (this.aiEnabled && this.currentPlayer === 'red') {
            this.makeAIMove();
        }
    }
    
    // Helper functions
    isDen(row, col) { return (row === 0 || row === 8) && col === 3; }
    isTrap(row, col) {
        const traps = [[0, 2], [0, 4], [1, 3], [7, 3], [8, 2], [8, 4]];
        return traps.some(([r, c]) => r === row && c === col);
    }
    isWater(row, col) { return row >= 3 && row <= 5 && (col >= 1 && col <= 2 || col >= 4 && col <= 5); }
    getCellAt(row, col) { return this.cells[row * 7 + col]; }
    getPieceAt(row, col) { return this.pieces.find(p => p.row === row && p.col === col); }

    // Unused methods to be implemented or removed
    backToSelection() { console.log("Back to selection clicked"); window.showGameSelection(); }
    showRules() { alert("Luật chơi Cờ Thú:\\n- Các quân cờ di chuyển 1 ô theo chiều dọc hoặc ngang.\\n- Quân mạnh hơn có thể ăn quân yếu hơn.\\n- Bẫy: Quân cờ vào bẫy đối phương sẽ bị mất hết sức mạnh (rank 0).\\n- Sông: Chuột có thể bơi, các quân khác không thể. Sư tử và Cọp có thể nhảy qua sông.\\n- Thắng: Chiếm hang đối phương hoặc ăn hết quân đối phương."); }

    // Hàm hỗ trợ để xác định chỉ số của bẫy
    getTrapIndex(row, col, owner) {
        const blueTraps = [[0, 2], [0, 4], [1, 3]];
        const redTraps = [[7, 3], [8, 2], [8, 4]];
        
        const traps = (owner === 'blue') ? blueTraps : redTraps;
        for (let i = 0; i < traps.length; i++) {
            if (traps[i][0] === row && traps[i][1] === col) {
                return i + 1;
            }
        }
        return 0;
    }

    // Hàm mới để AI đưa ra nước đi
    makeAIMove() {
        if (!this.gameActive || !this.aiEnabled || this.currentPlayer !== 'red') return;
        
        this.aiThinking = true;
        this.updateStatus("AI đang suy nghĩ...");
        
        // Sử dụng setTimeout để tạo hiệu ứng "suy nghĩ"
        setTimeout(() => {
            if (this.ai) {
                this.ai.makeMove();
            }
            this.aiThinking = false;
            this.updateStatus();
        }, 500);
    }
} 