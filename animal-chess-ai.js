/**
 * AI cho game Cờ Thú
 * Sử dụng thuật toán Minimax kết hợp với Alpha-Beta Pruning
 */
class AnimalChessAI {
    constructor(game, difficulty = 'medium') {
        this.game = game;
        this.player = 'red'; // AI luôn là người chơi màu đỏ
        this.difficulty = difficulty;
        
        // Độ sâu tìm kiếm dựa trên độ khó
        this.depthMap = {
            'easy': 1,
            'medium': 2,
            'hard': 3,
            'veryhard': 4
        };
    }
    
    // Hàm chính để AI đưa ra nước đi
    makeMove() {
        const depth = this.depthMap[this.difficulty] || 2;
        const bestMove = this.findBestMove(depth);
        
        if (bestMove) {
            const { piece, toRow, toCol } = bestMove;
            
            // Thực hiện nước đi
            const targetPiece = this.game.getPieceAt(toRow, toCol);
            if (targetPiece) {
                this.game.capturePiece(targetPiece);
            }
            
            this.game.movePiece(piece, toRow, toCol);
            this.game.checkWinCondition(piece);
            
            if (this.game.gameActive) {
                this.game.switchPlayer();
                this.game.updateStatus();
            }
        }
        
        return bestMove;
    }
    
    // Tìm nước đi tốt nhất sử dụng thuật toán minimax với alpha-beta pruning
    findBestMove(depth) {
        let bestValue = -Infinity;
        let bestMove = null;
        
        // Lấy tất cả các nước đi hợp lệ cho AI
        const possibleMoves = this.getAllPossibleMoves(this.player);
        
        // Đánh giá từng nước đi
        for (const move of possibleMoves) {
            // Lưu trạng thái hiện tại
            const { piece, toRow, toCol } = move;
            const fromRow = piece.row;
            const fromCol = piece.col;
            const capturedPiece = this.game.getPieceAt(toRow, toCol);
            
            // Thử nước đi
            if (capturedPiece) {
                // Lưu lại vị trí của quân bị bắt để khôi phục sau
                const capturedRow = capturedPiece.row;
                const capturedCol = capturedPiece.col;
                
                // Tạm thời xóa quân bị bắt khỏi bàn cờ
                this.game.pieces = this.game.pieces.filter(p => p !== capturedPiece);
            }
            
            // Di chuyển quân cờ (chỉ cập nhật dữ liệu, không cập nhật giao diện)
            piece.row = toRow;
            piece.col = toCol;
            
            // Đánh giá nước đi bằng minimax
            const moveValue = this.minimax(depth - 1, false, -Infinity, Infinity);
            
            // Khôi phục trạng thái
            piece.row = fromRow;
            piece.col = fromCol;
            
            if (capturedPiece) {
                // Đưa quân bị bắt trở lại bàn cờ
                this.game.pieces.push(capturedPiece);
            }
            
            // Cập nhật nước đi tốt nhất
            if (moveValue > bestValue) {
                bestValue = moveValue;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    // Thuật toán minimax với alpha-beta pruning
    minimax(depth, isMaximizing, alpha, beta) {
        // Điều kiện dừng
        if (depth === 0) {
            return this.evaluateBoard();
        }
        
        // Kiểm tra điều kiện thắng/thua
        const gameState = this.checkGameState();
        if (gameState !== 'ongoing') {
            return gameState === 'red_win' ? 1000 : -1000;
        }
        
        const currentPlayer = isMaximizing ? this.player : (this.player === 'red' ? 'blue' : 'red');
        const possibleMoves = this.getAllPossibleMoves(currentPlayer);
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            
            for (const move of possibleMoves) {
                // Lưu trạng thái hiện tại
                const { piece, toRow, toCol } = move;
                const fromRow = piece.row;
                const fromCol = piece.col;
                const capturedPiece = this.game.getPieceAt(toRow, toCol);
                
                // Thử nước đi
                if (capturedPiece) {
                    this.game.pieces = this.game.pieces.filter(p => p !== capturedPiece);
                }
                
                piece.row = toRow;
                piece.col = toCol;
                
                // Gọi đệ quy minimax
                const evalValue = this.minimax(depth - 1, false, alpha, beta);
                
                // Khôi phục trạng thái
                piece.row = fromRow;
                piece.col = fromCol;
                
                if (capturedPiece) {
                    this.game.pieces.push(capturedPiece);
                }
                
                maxEval = Math.max(maxEval, evalValue);
                alpha = Math.max(alpha, evalValue);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            
            return maxEval;
        } else {
            let minEval = Infinity;
            
            for (const move of possibleMoves) {
                // Lưu trạng thái hiện tại
                const { piece, toRow, toCol } = move;
                const fromRow = piece.row;
                const fromCol = piece.col;
                const capturedPiece = this.game.getPieceAt(toRow, toCol);
                
                // Thử nước đi
                if (capturedPiece) {
                    this.game.pieces = this.game.pieces.filter(p => p !== capturedPiece);
                }
                
                piece.row = toRow;
                piece.col = toCol;
                
                // Gọi đệ quy minimax
                const evalValue = this.minimax(depth - 1, true, alpha, beta);
                
                // Khôi phục trạng thái
                piece.row = fromRow;
                piece.col = fromCol;
                
                if (capturedPiece) {
                    this.game.pieces.push(capturedPiece);
                }
                
                minEval = Math.min(minEval, evalValue);
                beta = Math.min(beta, evalValue);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            
            return minEval;
        }
    }
    
    // Lấy tất cả các nước đi hợp lệ cho một người chơi
    getAllPossibleMoves(player) {
        const moves = [];
        const pieces = this.game.pieces.filter(p => p.player === player);
        
        for (const piece of pieces) {
            const possibleMoves = this.game.getPossibleMoves(piece);
            
            for (const move of possibleMoves) {
                moves.push({
                    piece: piece,
                    toRow: move.row,
                    toCol: move.col
                });
            }
        }
        
        return moves;
    }
    
    // Đánh giá trạng thái bàn cờ
    evaluateBoard() {
        let score = 0;
        
        // Đánh giá dựa trên số lượng và giá trị quân cờ
        for (const piece of this.game.pieces) {
            // Giá trị quân cờ dựa trên bậc
            let pieceValue = piece.rank * 10;
            
            // Thêm giá trị cho vị trí
            pieceValue += this.evaluatePosition(piece);
            
            // Cộng điểm cho AI (red), trừ điểm cho người chơi (blue)
            score += piece.player === this.player ? pieceValue : -pieceValue;
        }
        
        return score;
    }
    
    // Đánh giá vị trí của quân cờ
    evaluatePosition(piece) {
        let positionValue = 0;
        
        // Ưu tiên tiến gần hang đối phương
        if (piece.player === 'red') {
            // Khoảng cách đến hang xanh (0,3)
            const distanceToDen = Math.abs(piece.row - 0) + Math.abs(piece.col - 3);
            positionValue += (9 - distanceToDen) * 2;
        } else {
            // Khoảng cách đến hang đỏ (8,3)
            const distanceToDen = Math.abs(piece.row - 8) + Math.abs(piece.col - 3);
            positionValue += (9 - distanceToDen) * 2;
        }
        
        // Tránh bẫy của đối phương
        const cell = this.game.getCellAt(piece.row, piece.col);
        if (this.game.isTrap(piece.row, piece.col) && cell.dataset.owner !== piece.player) {
            positionValue -= 30;
        }
        
        // Ưu tiên bảo vệ hang của mình
        if (piece.player === 'red') {
            // Khoảng cách đến hang đỏ (8,3)
            const distanceToOwnDen = Math.abs(piece.row - 8) + Math.abs(piece.col - 3);
            if (distanceToOwnDen <= 2) {
                positionValue += 5;
            }
        } else {
            // Khoảng cách đến hang xanh (0,3)
            const distanceToOwnDen = Math.abs(piece.row - 0) + Math.abs(piece.col - 3);
            if (distanceToOwnDen <= 2) {
                positionValue += 5;
            }
        }
        
        return positionValue;
    }
    
    // Kiểm tra trạng thái game
    checkGameState() {
        // Kiểm tra xem có quân nào đã vào hang đối phương chưa
        for (const piece of this.game.pieces) {
            if (this.game.isDen(piece.row, piece.col)) {
                const denOwner = piece.row === 0 ? 'blue' : 'red';
                if (piece.player !== denOwner) {
                    return piece.player === 'red' ? 'red_win' : 'blue_win';
                }
            }
        }
        
        // Đếm số quân của mỗi bên
        const redPieces = this.game.pieces.filter(p => p.player === 'red').length;
        const bluePieces = this.game.pieces.filter(p => p.player === 'blue').length;
        
        if (redPieces === 0) return 'blue_win';
        if (bluePieces === 0) return 'red_win';
        
        return 'ongoing';
    }
} 