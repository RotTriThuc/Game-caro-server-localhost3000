class AnimalChess {
    constructor() {
        // Các phần tử DOM
        this.board = null;
        this.cells = [];
        this.pieces = [];
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.currentPlayer = 'red'; // 'red' hoặc 'blue'
        this.gameActive = true;
        this.statusElement = null;
        this.isBoardFlipped = false;
        
        // Đường dẫn đến hình ảnh
        this.imagePath = './images/animal-chess/';
        
        // Tên các con thú
        this.animalNames = {
            'E': 'Voi',    // Elephant
            'L': 'Sư tử',  // Lion
            'T': 'Cọp',    // Tiger
            'P': 'Báo',    // Panther
            'D': 'Chó',    // Dog
            'W': 'Sói',    // Wolf
            'C': 'Mèo',    // Cat
            'R': 'Chuột'   // Rat
        };
        
        // Biểu tượng con thú
        this.animalIcons = {
            'E': '🐘',  // Voi
            'L': '🦁',  // Sư tử
            'T': '🐯',  // Cọp
            'P': '🐆',  // Báo
            'D': '🐕',  // Chó
            'W': '🐺',  // Sói
            'C': '🐱',  // Mèo
            'R': '🐭'   // Chuột
        };
        
        // Thứ bậc sức mạnh (cao -> thấp)
        this.animalRanks = {
            'E': 7,
            'L': 6,
            'T': 5,
            'P': 4,
            'D': 3,
            'W': 2,
            'C': 1,
            'R': 0
        };
    }
    
    // Khởi tạo bàn cờ
    initBoard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Tạo status hiển thị lượt chơi
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'animal-chess-status';
        this.statusElement.textContent = 'Lượt của Đỏ';
        container.appendChild(this.statusElement);
        
        // Tạo bàn cờ
        this.board = document.createElement('div');
        this.board.className = 'animal-chess-board';
        container.appendChild(this.board);
        
        // Tạo các ô cờ 7x9
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 7; col++) {
                const cell = document.createElement('div');
                cell.className = 'animal-chess-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Xác định loại ô đặc biệt
                if (this.isDen(row, col)) {
                    cell.classList.add('den');
                    
                    const denLabel = document.createElement('div');
                    denLabel.className = 'den-label';
                    denLabel.textContent = row === 0 ? 'Hang Xanh' : 'Hang Đỏ';
                    cell.appendChild(denLabel);
                } else if (this.isWater(row, col)) {
                    cell.classList.add('water');
                } else if (this.isTrap(row, col)) {
                    cell.classList.add('trap');
                    cell.dataset.owner = this.getTrapOwner(row, col);
                }
                
                cell.addEventListener('click', (e) => this.handleCellClick(e));
                this.board.appendChild(cell);
                this.cells.push(cell);
            }
        }
        
        // Tạo các nút điều khiển
        const controls = document.createElement('div');
        controls.className = 'animal-chess-controls';
        
        const resetButton = document.createElement('button');
        resetButton.className = 'animal-chess-button reset-button';
        resetButton.textContent = 'Chơi lại';
        resetButton.addEventListener('click', () => this.resetGame());
        controls.appendChild(resetButton);
        
        const flipButton = document.createElement('button');
        flipButton.className = 'animal-chess-button flip-button';
        flipButton.textContent = 'Lật bàn cờ';
        flipButton.addEventListener('click', () => this.flipBoard());
        controls.appendChild(flipButton);
        
        const backButton = document.createElement('button');
        backButton.className = 'animal-chess-button back-button';
        backButton.textContent = 'Quay lại';
        backButton.addEventListener('click', () => this.backToSelection());
        controls.appendChild(backButton);
        
        container.appendChild(controls);
        
        // Khởi tạo bàn cờ
        this.initializePieces();
    }
    
    // Khởi tạo quân cờ
    initializePieces() {
        // Xóa quân cờ cũ nếu có
        this.pieces = [];
        
        // Khởi tạo vị trí ban đầu của quân cờ
        const initialSetup = [
            // Quân xanh (player 2)
            { animal: 'L', row: 0, col: 0, player: 'blue', power: 7 }, // Sư tử
            { animal: 'T', row: 0, col: 6, player: 'blue', power: 6 }, // Cọp
            { animal: 'D', row: 1, col: 1, player: 'blue', power: 4 }, // Chó
            { animal: 'C', row: 1, col: 5, player: 'blue', power: 2 }, // Mèo
            { animal: 'R', row: 2, col: 0, player: 'blue', power: 1 }, // Chuột - bắt được Voi
            { animal: 'W', row: 2, col: 2, player: 'blue', power: 3 }, // Sói
            { animal: 'P', row: 2, col: 4, player: 'blue', power: 5 }, // Báo
            { animal: 'E', row: 2, col: 6, player: 'blue', power: 8 }, // Voi - mạnh nhất
            
            // Quân đỏ (player 1)
            { animal: 'E', row: 6, col: 0, player: 'red', power: 8 }, // Voi - mạnh nhất
            { animal: 'P', row: 6, col: 2, player: 'red', power: 5 }, // Báo
            { animal: 'W', row: 6, col: 4, player: 'red', power: 3 }, // Sói
            { animal: 'R', row: 6, col: 6, player: 'red', power: 1 }, // Chuột - bắt được Voi
            { animal: 'C', row: 7, col: 1, player: 'red', power: 2 }, // Mèo
            { animal: 'D', row: 7, col: 5, player: 'red', power: 4 }, // Chó
            { animal: 'T', row: 8, col: 0, player: 'red', power: 6 }, // Cọp
            { animal: 'L', row: 8, col: 6, player: 'red', power: 7 }  // Sư tử
        ];
        
        // Tạo các quân cờ trên bàn cờ
        for (const pieceData of initialSetup) {
            const piece = document.createElement('div');
            piece.className = `animal-chess-piece ${pieceData.player}`;
            piece.dataset.animal = pieceData.animal;
            piece.dataset.player = pieceData.player;
            piece.dataset.row = pieceData.row;
            piece.dataset.col = pieceData.col;
            
            // Thêm biểu tượng con thú
            const animalIcon = document.createElement('div');
            animalIcon.className = 'animal-icon';
            animalIcon.textContent = this.animalIcons[pieceData.animal];
            animalIcon.title = `${pieceData.player === 'red' ? 'Đỏ' : 'Xanh'} - ${this.animalNames[pieceData.animal]}`;
            piece.appendChild(animalIcon);
            
            // Thêm ký hiệu động vật (để dễ phân biệt)
            const animalText = document.createElement('div');
            animalText.className = 'animal-text';
            animalText.textContent = pieceData.animal;
            piece.appendChild(animalText);
            
            // Thêm nhãn tên thú
            const label = document.createElement('div');
            label.className = 'piece-label';
            label.textContent = this.animalNames[pieceData.animal];
            piece.appendChild(label);
            
            piece.addEventListener('click', (e) => this.handlePieceClick(e));
            
            // Đặt quân cờ lên bàn
            this.placePiece(piece, pieceData.row, pieceData.col);
            
            this.pieces.push(piece);
        }
        
        // Cập nhật hiển thị
        this.updateStatus();
    }
    
    // Kiểm tra xem ô có phải là hang hay không
    isDen(row, col) {
        return (row === 0 && col === 3) || (row === 8 && col === 3);
    }
    
    // Kiểm tra xem ô có phải là bẫy hay không
    isTrap(row, col) {
        const traps = [
            {row: 0, col: 2}, {row: 0, col: 4}, {row: 1, col: 3},
            {row: 8, col: 2}, {row: 8, col: 4}, {row: 7, col: 3}
        ];
        
        return traps.some(trap => trap.row === row && trap.col === col);
    }
    
    // Lấy chủ sở hữu của bẫy
    getTrapOwner(row, col) {
        if (!this.isTrap(row, col)) return null;
        return row < 3 ? 'blue' : 'red';
    }
    
    // Kiểm tra xem ô có phải là nước hay không
    isWater(row, col) {
        return (row >= 3 && row <= 5) && (
            col === 1 || col === 2 || col === 4 || col === 5
        );
    }
    
    // Xử lý khi click vào ô cờ
    handleCellClick(e) {
        if (!this.gameActive) return;
        
        const cell = e.currentTarget;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Nếu đã chọn quân cờ và đây là nước đi hợp lệ
        if (this.selectedPiece && this.isValidMove(row, col)) {
            this.movePiece(this.selectedPiece, row, col);
            this.clearSelection();
            this.switchPlayer();
            this.updateStatus();
            return;
        }
        
        // Nếu không thì xóa lựa chọn
        this.clearSelection();
    }
    
    // Xử lý khi click vào quân cờ
    handlePieceClick(e) {
        if (!this.gameActive) return;
        e.stopPropagation();
        
        const piece = e.currentTarget;
        const player = piece.dataset.player;
        
        // Chỉ cho phép người chơi hiện tại di chuyển quân cờ của họ
        if (player !== this.currentPlayer) {
            this.clearSelection();
            return;
        }
        
        // Nếu quân cờ đã được chọn, bỏ chọn nó
        if (this.selectedPiece === piece) {
            this.clearSelection();
            return;
        }
        
        // Chọn quân cờ mới
        this.clearSelection();
        this.selectedPiece = piece;
        piece.classList.add('selected');
        
        // Hiển thị các nước đi có thể
        this.highlightPossibleMoves(piece);
    }
    
    // Di chuyển quân cờ
    movePiece(piece, toRow, toCol) {
        const fromRow = parseInt(piece.dataset.row);
        const fromCol = parseInt(piece.dataset.col);
        
        // Kiểm tra xem có quân cờ đối phương ở ô đích không
        const capturedPiece = this.getPieceAt(toRow, toCol);
        if (capturedPiece) {
            // Bắt quân cờ đối phương
            this.capturePiece(capturedPiece);
        }
        
        // Di chuyển quân cờ
        this.placePiece(piece, toRow, toCol);
        
        // Kiểm tra thắng/thua
        this.checkWinCondition();
    }
    
    // Đặt quân cờ lên bàn cờ
    placePiece(piece, row, col) {
        const cell = this.getCellAt(row, col);
        if (!cell) return;
        
        // Cập nhật dataset và vị trí
        piece.dataset.row = row;
        piece.dataset.col = col;
        
        // Đặt quân cờ vào ô mới
        cell.appendChild(piece);
    }
    
    // Bắt quân cờ
    capturePiece(piece) {
        // Xóa khỏi bàn cờ và mảng quân cờ
        piece.remove();
        this.pieces = this.pieces.filter(p => p !== piece);
    }
    
    // Lấy ô tại vị trí
    getCellAt(row, col) {
        return this.cells.find(cell => 
            parseInt(cell.dataset.row) === row && 
            parseInt(cell.dataset.col) === col
        );
    }
    
    // Lấy quân cờ tại vị trí
    getPieceAt(row, col) {
        return this.pieces.find(piece => 
            parseInt(piece.dataset.row) === row && 
            parseInt(piece.dataset.col) === col
        );
    }
    
    // Kiểm tra xem nước đi có hợp lệ không
    isValidMove(toRow, toCol) {
        if (!this.selectedPiece) return false;
        
        const fromRow = parseInt(this.selectedPiece.dataset.row);
        const fromCol = parseInt(this.selectedPiece.dataset.col);
        const animal = this.selectedPiece.dataset.animal;
        const player = this.selectedPiece.dataset.player;
        
        // Kiểm tra xem đích đến có quân cờ cùng màu không
        const targetPiece = this.getPieceAt(toRow, toCol);
        if (targetPiece && targetPiece.dataset.player === player) {
            return false;
        }
        
        // Kiểm tra xem có phải là hang của mình không
        if (this.isDen(toRow, toCol)) {
            if ((player === 'red' && toRow === 8) || (player === 'blue' && toRow === 0)) {
                return false;  // Không thể vào hang của mình
            }
        }
        
        // Kiểm tra hướng di chuyển và số ô di chuyển
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        // Chỉ có thể di chuyển theo chiều ngang hoặc dọc, không đi chéo
        if (rowDiff > 0 && colDiff > 0) return false;
        
        // Chỉ có thể di chuyển 1 ô mỗi lần (trừ khi là Sư tử/Cọp nhảy qua sông)
        if (rowDiff > 1 || colDiff > 1) {
            // Trường hợp đặc biệt: Sư tử và Cọp có thể nhảy qua sông
            if ((animal === 'L' || animal === 'T') && this.isJumpingOverWater(fromRow, fromCol, toRow, toCol)) {
                return true;
            }
            return false;
        }
        
        // Chuột có thể đi vào nước, các con khác không thể
        if (this.isWater(toRow, toCol) && animal !== 'R') {
            return false;
        }
        
        // Kiểm tra bắt quân
        if (targetPiece) {
            const targetAnimal = targetPiece.dataset.animal;
            const targetPlayer = targetPiece.dataset.player;
            
            // Không thể bắt quân cùng màu
            if (targetPlayer === player) return false;
            
            // Kiểm tra thứ bậc
            if (this.canCapture(animal, targetAnimal, fromRow, fromCol)) {
                return true;
            }
            
            return false;
        }
        
        // Các trường hợp di chuyển thông thường
        return true;
    }
    
    // Kiểm tra xem con này có thể bắt con kia không
    canCapture(attackerAnimal, defenderAnimal, attackerRow, attackerCol) {
        // Trường hợp đặc biệt: Chuột có thể bắt Voi
        if (attackerAnimal === 'R' && defenderAnimal === 'E') {
            return true;
        }
        
        // Trường hợp đặc biệt: Voi không thể bắt Chuột
        if (attackerAnimal === 'E' && defenderAnimal === 'R') {
            return false;
        }
        
        // Kiểm tra xem người tấn công có nằm trong bẫy không
        const attackerCell = this.getCellAt(attackerRow, attackerCol);
        if (attackerCell && attackerCell.classList.contains('trap')) {
            const trapOwner = attackerCell.dataset.owner;
            if (trapOwner !== this.currentPlayer) {
                // Quân trong bẫy của đối phương không thể bắt quân
                return false;
            }
        }
        
        // Kiểm tra thứ bậc thông thường
        return this.animalRanks[attackerAnimal] >= this.animalRanks[defenderAnimal];
    }
    
    // Kiểm tra xem Sư tử hoặc Cọp có thể nhảy qua sông không
    isJumpingOverWater(fromRow, fromCol, toRow, toCol) {
        // Chỉ áp dụng cho Sư tử và Cọp
        const piece = this.selectedPiece;
        if (!piece || (piece.dataset.animal !== 'L' && piece.dataset.animal !== 'T')) {
            return false;
        }
        
        // Chỉ có thể nhảy theo chiều dọc hoặc ngang
        if (fromRow !== toRow && fromCol !== toCol) {
            return false;
        }
        
        // Xác định hướng nhảy
        let dr = 0, dc = 0;
        if (fromRow < toRow) dr = 1;
        else if (fromRow > toRow) dr = -1;
        else if (fromCol < toCol) dc = 1;
        else if (fromCol > toCol) dc = -1;
        
        // Kiểm tra xem có nhảy qua nước không
        let row = fromRow + dr;
        let col = fromCol + dc;
        let waterCount = 0;
        let pieceInWater = false;
        
        while (row !== toRow || col !== toCol) {
            // Nếu là nước, tăng số ô nước đi qua
            if (this.isWater(row, col)) {
                waterCount++;
                // Kiểm tra xem có quân cờ nào trong nước không
                const pieceInWaterCell = this.getPieceAt(row, col);
                if (pieceInWaterCell) {
                    pieceInWater = true;
                    break;
                }
            } else {
                // Nếu gặp đất liền ở giữa, không thể nhảy qua
                if (waterCount > 0) {
                    return false;
                }
            }
            
            row += dr;
            col += dc;
        }
        
        // Nếu có quân cờ nào trong nước, không thể nhảy qua
        if (pieceInWater) return false;
        
        // Nếu có nhảy qua ít nhất một ô nước và đích đến không phải là nước
        return waterCount > 0 && !this.isWater(toRow, toCol);
    }
    
    // Đánh dấu các nước đi có thể
    highlightPossibleMoves(piece) {
        if (!piece) return;
        
        const row = parseInt(piece.dataset.row);
        const col = parseInt(piece.dataset.col);
        const animal = piece.dataset.animal;
        
        // Xóa đánh dấu cũ
        this.clearHighlights();
        
        // Mảng hướng di chuyển: lên, phải, xuống, trái
        const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
        
        // Kiểm tra các ô liền kề
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            // Kiểm tra ô có nằm trong bàn cờ không
            if (newRow >= 0 && newRow < 9 && newCol >= 0 && newCol < 7) {
                if (this.isValidMove(newRow, newCol)) {
                    const cell = this.getCellAt(newRow, newCol);
                    cell.classList.add('possible-move');
                    this.possibleMoves.push(cell);
                }
            }
        }
        
        // Trường hợp đặc biệt cho Sư tử và Cọp (nhảy qua sông)
        if (animal === 'L' || animal === 'T') {
            // Kiểm tra các hướng xa hơn cho Sư tử và Cọp
            for (const [dr, dc] of directions) {
                // Tìm ô sau khi nhảy qua sông
                let newRow = row;
                let newCol = col;
                let waterCount = 0;
                let validJump = true;
                
                // Di chuyển theo hướng cho đến khi gặp đất liền hoặc ra khỏi bàn cờ
                while (validJump) {
                    newRow += dr;
                    newCol += dc;
                    
                    // Kiểm tra ô có nằm trong bàn cờ không
                    if (newRow < 0 || newRow >= 9 || newCol < 0 || newCol >= 7) {
                        validJump = false;
                        break;
                    }
                    
                    // Nếu là nước, tiếp tục di chuyển
                    if (this.isWater(newRow, newCol)) {
                        // Kiểm tra xem có quân cờ nào trong nước không
                        const pieceInWater = this.getPieceAt(newRow, newCol);
                        if (pieceInWater) {
                            validJump = false;
                            break;
                        }
                        waterCount++;
                        continue;
                    }
                    
                    // Đã đến đất liền
                    if (waterCount > 0) {
                        // Kiểm tra nước đi hợp lệ
                        if (this.isValidMove(newRow, newCol)) {
                            const cell = this.getCellAt(newRow, newCol);
                            cell.classList.add('possible-move');
                            this.possibleMoves.push(cell);
                        }
                    }
                    
                    break;
                }
            }
        }
    }
    
    // Xóa đánh dấu các nước đi có thể
    clearHighlights() {
        for (const cell of this.possibleMoves) {
            cell.classList.remove('possible-move');
        }
        this.possibleMoves = [];
    }
    
    // Xóa lựa chọn quân cờ
    clearSelection() {
        if (this.selectedPiece) {
            this.selectedPiece.classList.remove('selected');
            this.selectedPiece = null;
        }
        this.clearHighlights();
    }
    
    // Đổi lượt người chơi
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
    }
    
    // Cập nhật trạng thái hiển thị
    updateStatus() {
        if (!this.statusElement) return;
        
        if (!this.gameActive) {
            const winner = this.currentPlayer === 'red' ? 'Xanh' : 'Đỏ';
            this.statusElement.textContent = `${winner} thắng!`;
            return;
        }
        
        const currentPlayerText = this.currentPlayer === 'red' ? 'Đỏ' : 'Xanh';
        this.statusElement.textContent = `Lượt của ${currentPlayerText}`;
    }
    
    // Kiểm tra điều kiện thắng
    checkWinCondition() {
        // Kiểm tra hang bị chiếm
        const blueDen = this.cells.find(cell => parseInt(cell.dataset.row) === 0 && parseInt(cell.dataset.col) === 3);
        const redDen = this.cells.find(cell => parseInt(cell.dataset.row) === 8 && parseInt(cell.dataset.col) === 3);
        
        const blueDenPiece = blueDen.querySelector('.animal-chess-piece');
        const redDenPiece = redDen.querySelector('.animal-chess-piece');
        
        // Nếu có quân đỏ trong hang xanh
        if (blueDenPiece && blueDenPiece.dataset.player === 'red') {
            this.endGame('red');
            return true;
        }
        
        // Nếu có quân xanh trong hang đỏ
        if (redDenPiece && redDenPiece.dataset.player === 'blue') {
            this.endGame('blue');
            return true;
        }
        
        // Kiểm tra nếu một người chơi không còn quân cờ
        const redPieces = this.pieces.filter(piece => piece.dataset.player === 'red');
        const bluePieces = this.pieces.filter(piece => piece.dataset.player === 'blue');
        
        if (redPieces.length === 0) {
            this.endGame('blue');
            return true;
        }
        
        if (bluePieces.length === 0) {
            this.endGame('red');
            return true;
        }
        
        return false;
    }
    
    // Kết thúc trò chơi
    endGame(winner) {
        this.gameActive = false;
        this.currentPlayer = winner;
        this.updateStatus();
    }
    
    // Khởi tạo lại trò chơi
    resetGame() {
        // Xóa tất cả quân cờ khỏi bàn cờ
        for (const piece of this.pieces) {
            if (piece.parentElement) {
                piece.parentElement.removeChild(piece);
            }
        }
        
        // Khởi tạo lại trạng thái
        this.pieces = [];
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.currentPlayer = 'red';
        this.gameActive = true;
        
        // Khởi tạo lại quân cờ
        this.initializePieces();
    }
    
    // Lật bàn cờ
    flipBoard() {
        this.isBoardFlipped = !this.isBoardFlipped;
        this.board.classList.toggle('flipped', this.isBoardFlipped);
        
        // Lật tất cả các ô và quân cờ
        for (const cell of this.cells) {
            cell.classList.toggle('flipped', this.isBoardFlipped);
        }
        
        for (const piece of this.pieces) {
            piece.classList.toggle('flipped', this.isBoardFlipped);
        }
    }
    
    // Quay lại màn hình chọn game
    backToSelection() {
        // Ẩn bàn cờ
        const gameContainer = document.getElementById('animal-chess-game-container');
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }
        
        // Hiển thị màn hình chọn game
        const gameTypeSelection = document.getElementById('game-type-selection');
        if (gameTypeSelection) {
            gameTypeSelection.style.display = 'block';
        }
    }
}

// Tạo đối tượng trò chơi khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo game logic
    window.animalChess = new AnimalChess();
    
    // Các nút chọn chế độ chơi cờ thú
    const localGameBtn = document.getElementById('animal-local-game-btn');
    const aiGameBtn = document.getElementById('animal-ai-game-btn');
    const onlineGameBtn = document.getElementById('animal-online-game-btn');
    const backToGameTypesBtn = document.getElementById('animal-back-to-game-types-btn');
    const animalRulesToggle = document.getElementById('animal-rules-toggle');
    
    // Khởi tạo các sự kiện
    if (localGameBtn) {
        localGameBtn.addEventListener('click', () => {
            // Hiển thị container game cờ thú
            const animalChessSelection = document.getElementById('animal-chess-selection');
            const gameContainer = document.getElementById('animal-chess-game-container');
            
            if (animalChessSelection) animalChessSelection.style.display = 'none';
            if (gameContainer) {
                gameContainer.style.display = 'block';
                // Khởi tạo bàn cờ nếu chưa có
                if (!window.animalChess.board) {
                    window.animalChess.initBoard('animal-chess-game-container');
                }
            }
        });
    }
    
    if (aiGameBtn) {
        aiGameBtn.addEventListener('click', () => {
            // Hiển thị thông báo tính năng đang phát triển
            showNotification('Chế độ chơi với máy đang được phát triển', true);
        });
    }
    
    if (onlineGameBtn) {
        onlineGameBtn.addEventListener('click', () => {
            // Hiển thị thông báo tính năng đang phát triển
            showNotification('Chế độ chơi trực tuyến đang được phát triển', true);
        });
    }
    
    // Hàm hiển thị thông báo
    function showNotification(message, isError = false) {
        let notification = document.querySelector('.notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = 'notification';
        if (isError) {
            notification.classList.add('error');
        }
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}); 