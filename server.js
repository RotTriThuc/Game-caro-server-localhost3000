const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

// Khởi tạo ứng dụng Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Cấu hình static files
app.use(express.static(path.join(__dirname, '/')));

// Trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route API để lấy địa chỉ IP LAN
app.get('/get-lan-ip', (req, res) => {
  res.send(getLANIP());
});

// Route API để lấy thống kê server
app.get('/get-server-stats', (req, res) => {
  const connectedSockets = io.sockets.sockets.size;
  
  // Lấy tất cả ID của socket đang kết nối
  const connectedSocketIds = Array.from(io.sockets.sockets.keys());
  
  // Đếm tất cả các người chơi đã đăng nhập
  const allLoggedInPlayerIds = [];
  
  // 1. Đếm người chơi thông thường đang online (có trong players và socket còn kết nối)
  const onlineRegularPlayers = Object.keys(players).filter(id => connectedSocketIds.includes(id));
  allLoggedInPlayerIds.push(...onlineRegularPlayers);
  const normalPlayerCount = onlineRegularPlayers.length;
  
  // 2. Đếm người chơi xếp hạng đã đăng nhập (đã đăng nhập tài khoản xếp hạng)
  const rankedLoggedInPlayers = [];
  // Kiểm tra device sessions để tìm tài khoản đã đăng nhập
  deviceSessions.forEach((session, deviceId) => {
    if (session.type === 'ranked' && connectedSocketIds.includes(session.socketId)) {
      rankedLoggedInPlayers.push(session.socketId);
      allLoggedInPlayerIds.push(session.socketId);
    }
  });
  
  // 3. Lấy danh sách người chơi từ các phòng thường và phòng xếp hạng (để log debug)
  const playerIdsFromNormalRooms = [];
  // Lấy cả player1 và player2 từ các phòng thường
  Object.values(rooms).forEach(room => {
    if (room.player1 && connectedSocketIds.includes(room.player1.id)) {
      playerIdsFromNormalRooms.push(room.player1.id);
      if (!allLoggedInPlayerIds.includes(room.player1.id)) {
        allLoggedInPlayerIds.push(room.player1.id);
      }
    }
    if (room.player2 && connectedSocketIds.includes(room.player2.id)) {
      playerIdsFromNormalRooms.push(room.player2.id);
      if (!allLoggedInPlayerIds.includes(room.player2.id)) {
        allLoggedInPlayerIds.push(room.player2.id);
      }
    }
  });
  
  // Lấy cả player1 và player2 từ các phòng xếp hạng
  const playerIdsFromRankedRooms = [];
  Object.values(rankedRooms).forEach(room => {
    if (room.player1 && connectedSocketIds.includes(room.player1.id)) {
      playerIdsFromRankedRooms.push(room.player1.id);
      if (!allLoggedInPlayerIds.includes(room.player1.id)) {
        allLoggedInPlayerIds.push(room.player1.id);
      }
    }
    if (room.player2 && connectedSocketIds.includes(room.player2.id)) {
      playerIdsFromRankedRooms.push(room.player2.id);
      if (!allLoggedInPlayerIds.includes(room.player2.id)) {
        allLoggedInPlayerIds.push(room.player2.id);
      }
    }
  });
  
  const rankedPlayerCount = rankedLoggedInPlayers.length;
  
  // Tổng số người chơi thực sự online (không trùng lặp)
  const uniquePlayerIds = [...new Set(allLoggedInPlayerIds)];
  const playerCount = uniquePlayerIds.length;
  
  // Đếm phòng
  const roomCount = Object.keys(rooms).length + Object.keys(rankedRooms).length;
  
  // Log chi tiết để debug
  console.log('Thống kê server chi tiết:', {
    connectedSockets,
    connectedSocketIds,
    onlineRegularPlayers,
    normalPlayerCount,
    rankedLoggedInPlayers,
    playerIdsFromNormalRooms,
    playerIdsFromRankedRooms,
    rankedPlayerCount,
    allLoggedInPlayerIds,
    uniquePlayerIds,
    uniquePlayerCount: playerCount,
    rooms: Object.keys(rooms).length,
    rankedRooms: Object.keys(rankedRooms).length,
    totalRooms: roomCount
  });
  
  res.json({
    players: playerCount,
    rooms: roomCount
  });
});

// Lưu trữ thông tin phòng và người chơi
const rooms = {};
const players = {};
const animalChessRooms = {}; // Thêm đối tượng lưu trữ phòng Cờ Thú

// Lưu trữ thông tin người chơi xếp hạng
const rankedPlayers = {};
const rankedMatches = {};
const matchmakingQueue = [];
const rankedRooms = {}; // Thêm đối tượng lưu trữ phòng xếp hạng

// Map để theo dõi IP và tài khoản đăng nhập
const deviceLogins = new Map(); // IP -> username

// Map để theo dõi tất cả các phiên đăng nhập trên toàn bộ hệ thống (bao gồm cả online.js và ranked-game.js)
const deviceSessions = new Map(); // deviceID -> {socketId, username, type (firebase/ranked)}

// Đường dẫn tới file dữ liệu
const RANKED_PLAYERS_FILE = path.join(__dirname, 'ranked_players.json');

// Hàm tạo device ID duy nhất từ thông tin client
function getDeviceId(socket) {
  // Lấy thông tin từ request headers
  const userAgent = socket.handshake.headers['user-agent'] || '';
  const language = socket.handshake.headers['accept-language'] || '';
  
  // Sử dụng thông tin độc lập với IP để xác định thiết bị
  // Chúng ta không dùng IP vì localhost (127.0.0.1) và địa chỉ IP thực sẽ khác nhau
  const deviceInfo = `${userAgent}_${language}`;
  
  // Hash thông tin thiết bị để tạo ID
  const deviceId = crypto.createHash('sha256').update(deviceInfo).digest('hex');
  
  return deviceId;
}

// Kiểm tra xem thiết bị này đã đăng nhập chưa
function isDeviceLoggedIn(socket) {
  const deviceId = getDeviceId(socket);
  return deviceSessions.has(deviceId);
}

// Ghi nhận phiên đăng nhập mới
function registerSession(socket, username, type) {
  const deviceId = getDeviceId(socket);
  
  // Kiểm tra nếu thiết bị này đã đăng nhập
  if (deviceSessions.has(deviceId)) {
    const currentSession = deviceSessions.get(deviceId);
    
    // Nếu là cùng một tài khoản, cập nhật socket ID
    if (currentSession.username === username && currentSession.type === type) {
      deviceSessions.set(deviceId, { socketId: socket.id, username, type });
      return { success: true, message: 'Phiên đăng nhập đã được cập nhật' };
    }
    
    // Nếu khác tài khoản hoặc loại đăng nhập, từ chối
    return { 
      success: false, 
      message: `Thiết bị này đã đăng nhập với tài khoản "${currentSession.username}". Một thiết bị chỉ được đăng nhập một tài khoản duy nhất, cho dù bạn sử dụng localhost hay địa chỉ IP. Vui lòng đăng xuất trước.` 
    };
  }
  
  // Thiết bị chưa đăng nhập, tạo phiên mới
  deviceSessions.set(deviceId, { socketId: socket.id, username, type });
  return { success: true, message: 'Đăng nhập thành công' };
}

// Đăng xuất phiên hiện tại
function logoutSession(socket) {
  const deviceId = getDeviceId(socket);
  const session = deviceSessions.get(deviceId);
  
  if (session) {
    // Xóa thiết bị khỏi danh sách đăng nhập
    deviceSessions.delete(deviceId);
    
    // Thông báo cho client rằng đã đăng xuất thành công
    return { success: true, username: session.username };
  }
  
  return { success: false };
}

// Tải dữ liệu người chơi xếp hạng từ file
function loadRankedPlayers() {
  try {
    if (fs.existsSync(RANKED_PLAYERS_FILE)) {
      const data = fs.readFileSync(RANKED_PLAYERS_FILE, 'utf8');
      const loadedPlayers = JSON.parse(data);
      
      // Cập nhật vào đối tượng rankedPlayers
      Object.assign(rankedPlayers, loadedPlayers);
      console.log(`Đã tải ${Object.keys(rankedPlayers).length} người chơi xếp hạng từ file`);
    } else {
      console.log('File dữ liệu người chơi xếp hạng không tồn tại, sẽ tạo mới khi có người đăng ký');
      // Tạo file trống để đảm bảo có thể ghi dữ liệu sau này
      fs.writeFileSync(RANKED_PLAYERS_FILE, JSON.stringify({}), 'utf8');
      console.log('Đã tạo file dữ liệu trống');
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu người chơi xếp hạng:', error);
    // Thử tạo lại file nếu có lỗi
    try {
      fs.writeFileSync(RANKED_PLAYERS_FILE, JSON.stringify({}), 'utf8');
      console.log('Đã tạo lại file dữ liệu do gặp lỗi');
    } catch (writeError) {
      console.error('Không thể tạo file dữ liệu:', writeError);
    }
  }
}

// Lưu dữ liệu người chơi xếp hạng vào file
function saveRankedPlayers() {
  try {
    // Đảm bảo thư mục tồn tại
    const dir = path.dirname(RANKED_PLAYERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(RANKED_PLAYERS_FILE, JSON.stringify(rankedPlayers, null, 2), 'utf8');
    console.log('Đã lưu dữ liệu người chơi xếp hạng');
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu người chơi xếp hạng:', error);
  }
}

// Tải dữ liệu người chơi khi khởi động server
loadRankedPlayers();

// Tạo mã băm mật khẩu
function hashPassword(password, salt) {
  try {
    const newSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, newSalt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt: newSalt };
  } catch (error) {
    console.error('Lỗi khi tạo mã băm mật khẩu:', error);
    throw new Error('Không thể mã hóa mật khẩu');
  }
}

// Xác thực mật khẩu
function verifyPassword(password, hash, salt) {
  try {
    const hashVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
  } catch (error) {
    console.error('Lỗi khi xác thực mật khẩu:', error);
    return false;
  }
}

// Tính toán điểm Elo mới
function calculateElo(playerElo, opponentElo, result) {
  const K = 32; // Hằng số K
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actualScore = result; // 1 cho thắng, 0.5 cho hòa, 0 cho thua
  
  return Math.round(playerElo + K * (actualScore - expectedScore));
}

// Lấy danh sách người chơi xếp hạng hàng đầu
function getTopRankedPlayers(limit = 100) {
  return Object.values(rankedPlayers)
    .map(player => ({
      username: player.username,
      elo: player.elo,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws
    }))
    .sort((a, b) => b.elo - a.elo)
    .slice(0, limit);
}

// Tìm đối thủ phù hợp
function findMatchOpponent(playerId) {
  const player = rankedPlayers[playerId];
  if (!player) return null;
  
  // Tìm người chơi có điểm Elo gần nhất
  let bestMatch = null;
  let smallestEloDiff = Infinity;
  
  for (const queuedPlayerId of matchmakingQueue) {
    if (queuedPlayerId === playerId) continue;
    
    const queuedPlayer = rankedPlayers[queuedPlayerId];
    const eloDiff = Math.abs(player.elo - queuedPlayer.elo);
    
    // Ưu tiên người chơi có điểm Elo gần nhất
    if (eloDiff < smallestEloDiff) {
      smallestEloDiff = eloDiff;
      bestMatch = queuedPlayerId;
    }
  }
  
  return bestMatch;
}

// Tạo trận đấu xếp hạng
function createRankedMatch(player1Id, player2Id) {
  const player1 = rankedPlayers[player1Id];
  const player2 = rankedPlayers[player2Id];
  
  if (!player1 || !player2) return null;
  
  // Tạo ID trận đấu ngẫu nhiên
  const matchId = generateRoomId();
  
  // Tạo trận đấu mới
  rankedMatches[matchId] = {
    id: matchId,
    player1: {
      id: player1Id,
      username: player1.username,
      elo: player1.elo
    },
    player2: {
      id: player2Id,
      username: player2.username,
      elo: player2.elo
    },
    gameState: {
      board: createEmptyBoard(15), // Bàn cờ 15x15 cho chế độ xếp hạng
      currentPlayer: 'X',
      gameActive: true,
      size: 15,
      lastMove: null
    },
    status: 'playing',
    createdAt: Date.now()
  };
  
  // Xóa người chơi khỏi hàng đợi
  const player1Index = matchmakingQueue.indexOf(player1Id);
  if (player1Index !== -1) {
    matchmakingQueue.splice(player1Index, 1);
  }
  
  const player2Index = matchmakingQueue.indexOf(player2Id);
  if (player2Index !== -1) {
    matchmakingQueue.splice(player2Index, 1);
  }
  
  return rankedMatches[matchId];
}

// Kết thúc trận đấu xếp hạng và tính điểm
function endRankedMatch(matchId, winnerId = null) {
  const match = rankedMatches[matchId];
  if (!match) return null;
  
  const player1 = rankedPlayers[match.player1.id];
  const player2 = rankedPlayers[match.player2.id];
  
  if (!player1 || !player2) return null;
  
  // Lưu điểm Elo cũ
  const oldElo1 = player1.elo;
  const oldElo2 = player2.elo;
  
  let result1, result2;
  
  if (winnerId === null) {
    // Hòa
    result1 = 0.5;
    result2 = 0.5;
    player1.draws++;
    player2.draws++;
  } else if (winnerId === match.player1.id) {
    // Người chơi 1 thắng
    result1 = 1;
    result2 = 0;
    player1.wins++;
    player2.losses++;
  } else {
    // Người chơi 2 thắng
    result1 = 0;
    result2 = 1;
    player1.losses++;
    player2.wins++;
  }
  
  // Tính điểm Elo mới
  player1.elo = calculateElo(oldElo1, oldElo2, result1);
  player2.elo = calculateElo(oldElo2, oldElo1, result2);
  
  // Lưu dữ liệu người chơi
  saveRankedPlayers();
  
  // Kết quả cho người chơi 1
  const result1Text = result1 === 1 ? 'Thắng!' : (result1 === 0.5 ? 'Hòa!' : 'Thua!');
  const result1Data = {
    result: result1Text,
    oldElo: oldElo1,
    newElo: player1.elo
  };
  
  // Kết quả cho người chơi 2
  const result2Text = result2 === 1 ? 'Thắng!' : (result2 === 0.5 ? 'Hòa!' : 'Thua!');
  const result2Data = {
    result: result2Text,
    oldElo: oldElo2,
    newElo: player2.elo
  };
  
  // Xóa phòng xếp hạng liên quan nếu còn tồn tại
  if (rankedRooms[matchId]) {
    delete rankedRooms[matchId];
    console.log(`Đã xóa phòng xếp hạng ${matchId} sau khi kết thúc trận đấu`);
  }
  
  // Xóa trận đấu
  delete rankedMatches[matchId];
  
  // Thông báo cập nhật danh sách phòng
  io.emit('ranked_room_updated');
  
  return {
    player1Result: result1Data,
    player2Result: result2Data
  };
}

// Lấy địa chỉ IP LAN
function getLANIP() {
  const interfaces = os.networkInterfaces();
  let lanIP = 'Không tìm thấy';
  
  try {
    // Ưu tiên các giao diện thông dụng trước
    const priorityInterfaces = ['Ethernet', 'eth0', 'Wi-Fi', 'wlan0', 'en0', 'WLAN'];
    
    // Kiểm tra các giao diện ưu tiên
    for (const priorityIface of priorityInterfaces) {
      if (interfaces[priorityIface]) {
        for (const iface of interfaces[priorityIface]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
    }
    
    // Nếu không tìm thấy giao diện ưu tiên, kiểm tra tất cả các giao diện khác
    for (const interfaceName in interfaces) {
      const ifaces = interfaces[interfaceName];
      for (const iface of ifaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (error) {
    console.error('Lỗi khi lấy địa chỉ IP LAN:', error);
  }
  
  return lanIP;
}

// Gửi thống kê server
function sendServerStats() {
  // Lấy tất cả ID của socket đang kết nối
  const connectedSocketIds = Array.from(io.sockets.sockets.keys());
  
  // Đếm tất cả các người chơi đã đăng nhập
  const allLoggedInPlayerIds = [];
  
  // 1. Đếm người chơi thông thường đang online (có trong players và socket còn kết nối)
  const onlineRegularPlayers = Object.keys(players).filter(id => connectedSocketIds.includes(id));
  allLoggedInPlayerIds.push(...onlineRegularPlayers);
  const normalPlayerCount = onlineRegularPlayers.length;
  
  // 2. Đếm người chơi xếp hạng đã đăng nhập (đã đăng nhập tài khoản xếp hạng)
  const rankedLoggedInPlayers = [];
  // Kiểm tra device sessions để tìm tài khoản đã đăng nhập
  deviceSessions.forEach((session, deviceId) => {
    if (session.type === 'ranked' && connectedSocketIds.includes(session.socketId)) {
      rankedLoggedInPlayers.push(session.socketId);
      allLoggedInPlayerIds.push(session.socketId);
    }
  });
  
  // 3. Lấy danh sách người chơi từ các phòng thường và phòng xếp hạng
  const playerIdsFromNormalRooms = [];
  // Lấy cả player1 và player2 từ các phòng thường
  Object.values(rooms).forEach(room => {
    if (room.player1 && connectedSocketIds.includes(room.player1.id)) {
      playerIdsFromNormalRooms.push(room.player1.id);
      if (!allLoggedInPlayerIds.includes(room.player1.id)) {
        allLoggedInPlayerIds.push(room.player1.id);
      }
    }
    if (room.player2 && connectedSocketIds.includes(room.player2.id)) {
      playerIdsFromNormalRooms.push(room.player2.id);
      if (!allLoggedInPlayerIds.includes(room.player2.id)) {
        allLoggedInPlayerIds.push(room.player2.id);
      }
    }
  });
  
  // Lấy cả player1 và player2 từ các phòng xếp hạng
  const playerIdsFromRankedRooms = [];
  Object.values(rankedRooms).forEach(room => {
    if (room.player1 && connectedSocketIds.includes(room.player1.id)) {
      playerIdsFromRankedRooms.push(room.player1.id);
      if (!allLoggedInPlayerIds.includes(room.player1.id)) {
        allLoggedInPlayerIds.push(room.player1.id);
      }
    }
    if (room.player2 && connectedSocketIds.includes(room.player2.id)) {
      playerIdsFromRankedRooms.push(room.player2.id);
      if (!allLoggedInPlayerIds.includes(room.player2.id)) {
        allLoggedInPlayerIds.push(room.player2.id);
      }
    }
  });
  
  const rankedPlayerCount = rankedLoggedInPlayers.length;
  
  // Tổng số người chơi thực sự online (không trùng lặp)
  const uniquePlayerIds = [...new Set(allLoggedInPlayerIds)];
  const playerCount = uniquePlayerIds.length;
  
  // Đếm phòng
  const roomCount = Object.keys(rooms).length + Object.keys(rankedRooms).length;
  
  // Log thông tin định kỳ
  console.log('Thống kê định kỳ:', {
    playerCount,
    roomCount,
    normalPlayerCount,
    rankedPlayerCount,
    uniquePlayerIds
  });
  
  io.emit('server_stats', {
    players: playerCount,
    rooms: roomCount
  });
}

  // Gửi thống kê server cho một client cụ thể
  function sendServerStatsToClient(socket) {
    // Đếm chính xác số người chơi và phòng theo thực tế
    const connectedSockets = io.sockets.sockets.size;
    
    // Lấy tất cả ID của socket đang kết nối
    const connectedSocketIds = Array.from(io.sockets.sockets.keys());
    
    // Đếm tất cả các người chơi đã đăng nhập
    const allLoggedInPlayerIds = [];
    
    // 1. Đếm người chơi thông thường đang online (có trong players và socket còn kết nối)
    const onlineRegularPlayers = Object.keys(players).filter(id => connectedSocketIds.includes(id));
    allLoggedInPlayerIds.push(...onlineRegularPlayers);
    const normalPlayerCount = onlineRegularPlayers.length;
    
    // 2. Đếm người chơi xếp hạng đã đăng nhập (đã đăng nhập tài khoản xếp hạng)
    const rankedLoggedInPlayers = [];
    // Kiểm tra device sessions để tìm tài khoản đã đăng nhập
    deviceSessions.forEach((session, deviceId) => {
      if (session.type === 'ranked' && connectedSocketIds.includes(session.socketId)) {
        rankedLoggedInPlayers.push(session.socketId);
        allLoggedInPlayerIds.push(session.socketId);
      }
    });
    
    // 3. Lấy danh sách người chơi từ các phòng thường và phòng xếp hạng (để log debug)
    const playerIdsFromNormalRooms = [];
    // Lấy cả player1 và player2 từ các phòng thường
    Object.values(rooms).forEach(room => {
      if (room.player1 && connectedSocketIds.includes(room.player1.id)) {
        playerIdsFromNormalRooms.push(room.player1.id);
        if (!allLoggedInPlayerIds.includes(room.player1.id)) {
          allLoggedInPlayerIds.push(room.player1.id);
        }
      }
      if (room.player2 && connectedSocketIds.includes(room.player2.id)) {
        playerIdsFromNormalRooms.push(room.player2.id);
        if (!allLoggedInPlayerIds.includes(room.player2.id)) {
          allLoggedInPlayerIds.push(room.player2.id);
        }
      }
    });
    
    // Lấy cả player1 và player2 từ các phòng xếp hạng
    const playerIdsFromRankedRooms = [];
    Object.values(rankedRooms).forEach(room => {
      if (room.player1 && connectedSocketIds.includes(room.player1.id)) {
        playerIdsFromRankedRooms.push(room.player1.id);
        if (!allLoggedInPlayerIds.includes(room.player1.id)) {
          allLoggedInPlayerIds.push(room.player1.id);
        }
      }
      if (room.player2 && connectedSocketIds.includes(room.player2.id)) {
        playerIdsFromRankedRooms.push(room.player2.id);
        if (!allLoggedInPlayerIds.includes(room.player2.id)) {
          allLoggedInPlayerIds.push(room.player2.id);
        }
      }
    });
    
    const rankedPlayerCount = rankedLoggedInPlayers.length;
    
    // Tổng số người chơi thực sự online (không trùng lặp)
    const uniquePlayerIds = [...new Set(allLoggedInPlayerIds)];
    const playerCount = uniquePlayerIds.length;
    
    // Đếm phòng
    const roomCount = Object.keys(rooms).length + Object.keys(rankedRooms).length;
    
    // Log thông tin chi tiết để debug
    console.log('Thống kê client chi tiết:', {
      connectedSockets,
      connectedSocketIds,
      onlineRegularPlayers,
      normalPlayerCount, 
      rankedLoggedInPlayers,
      playerIdsFromNormalRooms,
      playerIdsFromRankedRooms,
      rankedPlayerCount,
      allLoggedInPlayerIds,
      uniquePlayerIds,
      uniquePlayerCount: playerCount,
      rooms: Object.keys(rooms).length,
      rankedRooms: Object.keys(rankedRooms).length,
      totalRooms: roomCount
    });
  
  socket.emit('server_stats', {
    players: playerCount,
    rooms: roomCount
  });
  
  // Gửi địa chỉ IP LAN
  const ipLan = getLANIP();
  console.log('Gửi IP LAN:', ipLan);
  socket.emit('lan_ip', ipLan);
}

// Lấy danh sách phòng đang chờ
function getAvailableRooms() {
  const availableRooms = [];
  
  Object.values(rooms).forEach(room => {
    if (room.status === 'waiting' && room.player1 && !room.player2) {
      availableRooms.push({
        id: room.id,
        player1Name: room.player1.name,
        createdAt: room.createdAt || Date.now()
      });
    }
  });
  
  // Sắp xếp theo thời gian tạo, mới nhất lên đầu
  return availableRooms.sort((a, b) => b.createdAt - a.createdAt);
}

// Lấy danh sách phòng xếp hạng có sẵn
function getAvailableRankedRooms() {
  console.log(`[DEBUG] getAvailableRankedRooms - Tổng số phòng: ${Object.keys(rankedRooms).length}`);
  
  const availableRooms = [];
  
  for (const roomId in rankedRooms) {
    const room = rankedRooms[roomId];
    
    // Chỉ hiển thị phòng ở trạng thái 'waiting'
    if (room.status === 'waiting' && room.player1) {
      console.log(`[DEBUG] Phòng ${roomId} - Trạng thái: ${room.status}, Người chơi: ${room.player1.username}`);
      
      // Kiểm tra xem người chơi 1 còn kết nối không
      const player1Connected = room.player1 && io.sockets.sockets.has(room.player1.id);
      if (!player1Connected) {
        console.log(`[DEBUG] Phòng ${roomId} - Người chơi ${room.player1.username} đã ngắt kết nối, bỏ qua`);
        continue;
      }
      
      availableRooms.push({
      id: room.id,
      player1: {
        username: room.player1.username,
          elo: room.player1.elo,
          id: room.player1.id
        }
      });
    } else {
      console.log(`[DEBUG] Phòng ${roomId} - Trạng thái: ${room.status} - KHÔNG được thêm vào danh sách`);
    }
  }
  
  console.log(`[DEBUG] Số phòng khả dụng để hiển thị: ${availableRooms.length}`);
  
  // Log thông tin chi tiết về các phòng khả dụng
  if (availableRooms.length > 0) {
    availableRooms.forEach(room => {
      console.log(`[DEBUG] Sẽ hiển thị phòng: ${room.id}, người chơi: ${room.player1.username}`);
    });
  }
  
  return availableRooms;
}

// Xử lý kết nối socket
io.on('connection', (socket) => {
  console.log(`Người chơi mới kết nối: ${socket.id}`);
  
  // Ghi log để kiểm tra device ID
  const deviceId = getDeviceId(socket);
  console.log(`Device ID của kết nối ${socket.id} (IP: ${socket.handshake.address}): ${deviceId.substring(0, 8)}...`);
  
  // Gửi thông tin trực tiếp cho client này
  sendServerStatsToClient(socket);
  
  // Cập nhật thống kê cho tất cả client
  sendServerStats();
  
  // Gửi lại thông tin sau 1 giây để đảm bảo client đã sẵn sàng nhận
  setTimeout(() => {
    sendServerStatsToClient(socket);
  }, 1000);
  
  // Xử lý yêu cầu thống kê từ client
  socket.on('request_stats', () => {
    sendServerStatsToClient(socket);
  });

  // ==== ANIMAL CHESS ONLINE HANDLERS ====
  
  // Lấy danh sách phòng Cờ Thú
  socket.on('animalChess:getRooms', () => {
    const availableRooms = [];
    
    Object.entries(animalChessRooms).forEach(([roomId, room]) => {
      if (room.status === 'waiting' && !room.isPrivate) {
        availableRooms.push({
          roomId: roomId,
          players: room.players
        });
      }
    });
    
    socket.emit('animalChess:roomList', availableRooms);
    console.log(`Đã gửi danh sách ${availableRooms.length} phòng Cờ Thú cho người chơi ${socket.id}`);
  });

  // Tạo phòng Cờ Thú mới
  socket.on('animalChess:createRoom', (data) => {
    const { username } = data;
    if (!username) {
      socket.emit('animalChess:error', { message: 'Vui lòng đăng nhập trước khi tạo phòng' });
      return;
    }
    
    // Tạo ID phòng ngẫu nhiên
    const roomId = generateRoomId();
    
    // Xác định màu ngẫu nhiên cho người chơi đầu tiên
    const colors = ['blue', 'red'];
    const playerColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Tạo phòng mới
    animalChessRooms[roomId] = {
      roomId: roomId,
      players: {
        [socket.id]: {
          id: socket.id,
          username: username,
          color: playerColor,
          isReady: false
        }
      },
      status: 'waiting',
      currentTurn: 'blue', // Luôn bắt đầu với quân xanh
      gameState: null,
      isPrivate: false,
      createdAt: Date.now()
    };
    
    // Tham gia vào room socket
    socket.join(roomId);
    
    // Gửi thông tin phòng cho người tạo
    socket.emit('animalChess:roomJoined', {
      roomId: roomId,
      isHost: true,
      playerColor: playerColor,
      players: animalChessRooms[roomId].players
    });
    
    console.log(`Người chơi ${socket.id} (${username}) đã tạo phòng Cờ Thú ${roomId}`);
  });

  // Tham gia vào phòng Cờ Thú
  socket.on('animalChess:joinRoom', (data) => {
    const { roomId, username } = data;
    
    if (!username) {
      socket.emit('animalChess:error', { message: 'Vui lòng đăng nhập trước khi tham gia phòng' });
      return;
    }
    
    // Kiểm tra phòng tồn tại
    if (!animalChessRooms[roomId]) {
      socket.emit('animalChess:error', { message: 'Phòng không tồn tại hoặc đã đóng' });
      return;
    }
    
    const room = animalChessRooms[roomId];
    
    // Kiểm tra phòng đã đầy chưa
    if (Object.keys(room.players).length >= 2) {
      socket.emit('animalChess:error', { message: 'Phòng đã đầy' });
      return;
    }
    
    // Xác định màu cho người chơi mới (khác với màu của người chơi hiện tại)
    const existingPlayer = Object.values(room.players)[0];
    const playerColor = existingPlayer.color === 'blue' ? 'red' : 'blue';
    
    // Thêm người chơi vào phòng
    room.players[socket.id] = {
      id: socket.id,
      username: username,
      color: playerColor,
      isReady: false
    };
    
    // Tham gia vào room socket
    socket.join(roomId);
    
    // Gửi thông tin phòng cho người tham gia
    socket.emit('animalChess:roomJoined', {
      roomId: roomId,
      isHost: false,
      playerColor: playerColor,
      players: room.players
    });
    
    // Thông báo cho người chơi đã có trong phòng
    for (const playerId in room.players) {
      if (playerId !== socket.id) {
        io.to(playerId).emit('animalChess:playerJoined', {
          username: username,
          color: playerColor,
          id: socket.id
        });
      }
    }
    
    console.log(`Người chơi ${socket.id} (${username}) đã tham gia phòng Cờ Thú ${roomId}`);
  });

  // Lấy thông tin phòng
  socket.on('animalChess:getRoomInfo', (data) => {
    const { roomId } = data;
    
    if (animalChessRooms[roomId]) {
      socket.emit('animalChess:roomInfo', animalChessRooms[roomId]);
    } else {
      socket.emit('animalChess:error', { message: 'Phòng không tồn tại' });
    }
  });

  // Bắt đầu trò chơi
  socket.on('animalChess:startGame', (data) => {
    const { roomId } = data;
    
    if (!animalChessRooms[roomId]) {
      socket.emit('animalChess:error', { message: 'Phòng không tồn tại' });
      return;
    }
    
    const room = animalChessRooms[roomId];
    
    // Kiểm tra người gửi yêu cầu có phải là chủ phòng
    const isHost = Object.keys(room.players)[0] === socket.id;
    if (!isHost) {
      socket.emit('animalChess:error', { message: 'Chỉ chủ phòng mới có thể bắt đầu trò chơi' });
      return;
    }
    
    // Kiểm tra có đủ 2 người chơi không
    if (Object.keys(room.players).length < 2) {
      socket.emit('animalChess:error', { message: 'Cần 2 người chơi để bắt đầu trò chơi' });
      return;
    }
    
    // Cập nhật trạng thái phòng
    room.status = 'playing';
    
    // Tạo trạng thái ban đầu cho trò chơi
    room.gameState = {
      // Trạng thái ban đầu của trò chơi Cờ Thú
      pieces: [
        // Quân Xanh
        { animal: 'L', row: 0, col: 0, player: 'blue' }, { animal: 'T', row: 0, col: 6, player: 'blue' },
        { animal: 'D', row: 1, col: 1, player: 'blue' }, { animal: 'C', row: 1, col: 5, player: 'blue' },
        { animal: 'R', row: 2, col: 0, player: 'blue' }, { animal: 'W', row: 2, col: 2, player: 'blue' },
        { animal: 'P', row: 2, col: 4, player: 'blue' }, { animal: 'E', row: 2, col: 6, player: 'blue' },
        // Quân Đỏ
        { animal: 'E', row: 6, col: 0, player: 'red' }, { animal: 'P', row: 6, col: 2, player: 'red' },
        { animal: 'W', row: 6, col: 4, player: 'red' }, { animal: 'R', row: 6, col: 6, player: 'red' },
        { animal: 'C', row: 7, col: 1, player: 'red' }, { animal: 'D', row: 7, col: 5, player: 'red' },
        { animal: 'T', row: 8, col: 0, player: 'red' }, { animal: 'L', row: 8, col: 6, player: 'red' }
      ],
      currentPlayer: 'blue',
      gameActive: true
    };
    
    // Gửi thông báo bắt đầu trò chơi cho tất cả người chơi trong phòng
    io.to(roomId).emit('animalChess:gameStart', {
      gameState: room.gameState,
      currentTurn: room.currentTurn
    });
    
    console.log(`Trò chơi Cờ Thú đã bắt đầu trong phòng ${roomId}`);
  });

  // Xử lý nước đi
  socket.on('animalChess:makeMove', (data) => {
    const { roomId, move } = data;
    
    if (!animalChessRooms[roomId]) {
      socket.emit('animalChess:error', { message: 'Phòng không tồn tại' });
      return;
    }
    
    const room = animalChessRooms[roomId];
    
    // Kiểm tra trò chơi đã bắt đầu chưa
    if (room.status !== 'playing' || !room.gameState) {
      socket.emit('animalChess:error', { message: 'Trò chơi chưa bắt đầu' });
      return;
    }
    
    // Kiểm tra đến lượt người chơi này không
    const playerColor = room.players[socket.id].color;
    if (room.gameState.currentPlayer !== playerColor) {
      socket.emit('animalChess:error', { message: 'Chưa đến lượt của bạn' });
      return;
    }
    
    // Thực hiện nước đi
    const { fromRow, fromCol, toRow, toCol } = move;
    
    // Kiểm tra quân tại vị trí đích
    const capturedPieceIndex = room.gameState.pieces.findIndex(p => 
      p.row === toRow && p.col === toCol
    );
    
    // Nếu có quân bị bắt, xóa nó khỏi bàn cờ
    if (capturedPieceIndex !== -1) {
      room.gameState.pieces.splice(capturedPieceIndex, 1);
    }
    
    // Cập nhật vị trí quân cờ
    const movingPieceIndex = room.gameState.pieces.findIndex(p => 
      p.row === fromRow && p.col === fromCol
    );
    
    if (movingPieceIndex !== -1) {
      room.gameState.pieces[movingPieceIndex].row = toRow;
      room.gameState.pieces[movingPieceIndex].col = toCol;
    }
    
    // Kiểm tra thắng/thua
    const gameOver = checkAnimalChessWinCondition(room.gameState);
    
    if (gameOver) {
      room.gameState.gameActive = false;
      room.status = 'finished';
      
      // Gửi thông báo kết thúc trò chơi
      io.to(roomId).emit('animalChess:gameEnd', {
        winner: gameOver.winner,
        reason: gameOver.reason
      });
      
      console.log(`Trò chơi Cờ Thú kết thúc trong phòng ${roomId}. Người thắng: ${gameOver.winner}`);
    } else {
      // Chuyển lượt
      room.gameState.currentPlayer = room.gameState.currentPlayer === 'blue' ? 'red' : 'blue';
      
      // Gửi thông tin nước đi cho tất cả người chơi
      socket.to(roomId).emit('animalChess:moveMade', {
        fromRow: fromRow,
        fromCol: fromCol,
        toRow: toRow,
        toCol: toCol
      });
      
      // Gửi trạng thái trò chơi mới
      io.to(roomId).emit('animalChess:gameState', room.gameState);
      
      console.log(`Người chơi ${socket.id} đã di chuyển quân từ [${fromRow},${fromCol}] đến [${toRow},${toCol}] trong phòng Cờ Thú ${roomId}`);
    }
  });

  // Rời phòng Cờ Thú
  socket.on('animalChess:leaveRoom', (data) => {
    const { roomId } = data;
    
    if (!animalChessRooms[roomId]) {
      return;
    }
    
    const room = animalChessRooms[roomId];
    
    // Xóa người chơi khỏi phòng
    if (room.players[socket.id]) {
      const leavingPlayerName = room.players[socket.id].username;
      
      // Thông báo cho những người chơi khác
      socket.to(roomId).emit('animalChess:playerLeft', {
        username: leavingPlayerName
      });
      
      delete room.players[socket.id];
      
      // Nếu không còn ai trong phòng, xóa phòng
      if (Object.keys(room.players).length === 0) {
        delete animalChessRooms[roomId];
        console.log(`Đã xóa phòng Cờ Thú ${roomId} vì không còn người chơi`);
      } else {
        // Nếu phòng đang chơi, kết thúc trò chơi
        if (room.status === 'playing') {
          room.status = 'finished';
          room.gameState.gameActive = false;
          
          // Thông báo kết thúc trò chơi cho người còn lại
          io.to(roomId).emit('animalChess:gameEnd', {
            winner: room.players[Object.keys(room.players)[0]].color,
            reason: 'opponent_left'
          });
        }
      }
      
      // Rời khỏi room socket
      socket.leave(roomId);
      
      console.log(`Người chơi ${socket.id} (${leavingPlayerName}) đã rời phòng Cờ Thú ${roomId}`);
    }
  });

  // ==== END OF ANIMAL CHESS ONLINE HANDLERS ====

  // Người chơi đăng nhập
  socket.on('login', (playerName) => {
    console.log(`Người chơi ${socket.id} đăng nhập với tên: ${playerName}`);
    
    // Kiểm tra xem thiết bị này đã đăng nhập chưa
    if (isDeviceLoggedIn(socket)) {
      const deviceId = getDeviceId(socket);
      const session = deviceSessions.get(deviceId);
      
      // Nếu là cùng một người chơi, cho phép đăng nhập lại
      if (session.type === 'firebase' && session.username === playerName) {
        // Cập nhật socket ID
        session.socketId = socket.id;
        deviceSessions.set(deviceId, session);
      } else {
        // Nếu khác người chơi, từ chối đăng nhập
        socket.emit('error', { 
          message: `Thiết bị này đã đăng nhập với tài khoản "${session.username}". Một thiết bị chỉ được đăng nhập một tài khoản duy nhất, cho dù bạn sử dụng localhost hay địa chỉ IP. Vui lòng đăng xuất trước.` 
        });
        return;
      }
    } else {
      // Thiết bị chưa đăng nhập, đăng ký phiên mới
      const result = registerSession(socket, playerName, 'firebase');
      if (!result.success) {
        socket.emit('error', { message: result.message });
        return;
      }
    }
    
    // Tiếp tục xử lý đăng nhập
    players[socket.id] = {
      id: socket.id,
      name: playerName,
      room: null
    };
    
    // Thông báo đăng nhập thành công
    socket.emit('login_success', { id: socket.id, name: playerName });
    sendServerStats();
  });

  // Lấy danh sách phòng
  socket.on('get_rooms', () => {
    if (!players[socket.id]) return;
    
    const availableRooms = getAvailableRooms();
    socket.emit('room_list', availableRooms);
    console.log(`Gửi danh sách ${availableRooms.length} phòng cho người chơi ${socket.id}`);
  });

  // Tạo phòng mới
  socket.on('create_room', () => {
    if (!players[socket.id]) return;
    
    // Tạo ID phòng ngẫu nhiên
    const roomId = generateRoomId();
    
    // Tạo phòng mới
    rooms[roomId] = {
      id: roomId,
      player1: {
        id: socket.id,
        name: players[socket.id].name
      },
      player2: null,
      gameState: {
        board: createEmptyBoard(70),
        currentPlayer: 'X',
        gameActive: true,
        size: 70,
        lastMove: null
      },
      status: 'waiting',
      createdAt: Date.now()
    };
    
    // Cập nhật thông tin người chơi
    players[socket.id].room = roomId;
    
    // Tham gia vào room socket
    socket.join(roomId);
    
    // Gửi thông tin phòng cho người chơi
    socket.emit('room_created', rooms[roomId]);
    console.log(`Người chơi ${socket.id} đã tạo phòng ${roomId}`);
    
    // Thông báo cho tất cả người chơi về phòng mới
    io.emit('room_updated');
    sendServerStats();
  });

  // Tham gia vào phòng
  socket.on('join_room', (roomId) => {
    if (!players[socket.id] || !rooms[roomId]) {
      socket.emit('error', { message: 'Phòng không tồn tại' });
      return;
    }
    
    const room = rooms[roomId];
    
    if (room.status !== 'waiting' || room.player2) {
      socket.emit('error', { message: 'Phòng đã đầy hoặc trận đấu đã kết thúc' });
      return;
    }
    
    // Tham gia vào phòng
    room.player2 = {
      id: socket.id,
      name: players[socket.id].name
    };
    room.status = 'playing';
    
    // Cập nhật thông tin người chơi
    players[socket.id].room = roomId;
    
    // Tham gia vào room socket
    socket.join(roomId);
    
    // Gửi thông tin phòng cho tất cả người chơi trong phòng
    io.to(roomId).emit('room_joined', room);
    console.log(`Người chơi ${socket.id} đã tham gia phòng ${roomId}`);
    
    // Thông báo cho tất cả người chơi về cập nhật phòng
    io.emit('room_updated');
    sendServerStats();
  });

  // Đặt nước đi
  socket.on('make_move', ({ row, col }) => {
    if (!players[socket.id] || !players[socket.id].room) return;
    
    const roomId = players[socket.id].room;
    const room = rooms[roomId];
    
    if (!room || room.status !== 'playing') return;
    
    // Kiểm tra lượt chơi
    const isPlayer1 = socket.id === room.player1.id;
    const isPlayer2 = socket.id === room.player2.id;
    const isMyTurn = (room.gameState.currentPlayer === 'X' && isPlayer1) || 
                    (room.gameState.currentPlayer === 'O' && isPlayer2);
    
    if (!isMyTurn) return;
    
    // Kiểm tra vị trí đặt
    if (room.gameState.board[row][col] !== '' || !room.gameState.gameActive) return;
    
    // Đặt nước đi
    const value = isPlayer1 ? 'X' : 'O';
    room.gameState.board[row][col] = value;
    
    // Kiểm tra thắng
    const isWin = checkWin(room.gameState.board, row, col, value);
    if (isWin) {
      room.gameState.gameActive = false;
    }
    
    // Kiểm tra hòa
    const isDraw = !isWin && checkDraw(room.gameState.board);
    if (isDraw) {
      room.gameState.gameActive = false;
    }
    
    // Cập nhật lượt chơi
    if (room.gameState.gameActive) {
      room.gameState.currentPlayer = room.gameState.currentPlayer === 'X' ? 'O' : 'X';
    }
    
    // Cập nhật nước đi cuối cùng
    room.gameState.lastMove = { row, col, value };
    
    // Gửi cập nhật cho tất cả người chơi trong phòng
    io.to(roomId).emit('game_update', room.gameState);
    console.log(`Người chơi ${socket.id} đã đặt ${value} tại [${row},${col}] trong phòng ${roomId}`);
  });

  // Đặt lại trò chơi
  socket.on('reset_game', () => {
    if (!players[socket.id] || !players[socket.id].room) return;
    
    const roomId = players[socket.id].room;
    const room = rooms[roomId];
    
    if (!room) return;
    
    // Đặt lại trò chơi
    room.gameState = {
      board: createEmptyBoard(70),
      currentPlayer: 'X',
      gameActive: true,
      size: 70,
      lastMove: null
    };
    
    // Gửi cập nhật cho tất cả người chơi trong phòng
    io.to(roomId).emit('game_reset', room.gameState);
    console.log(`Trò chơi trong phòng ${roomId} đã được đặt lại`);
  });

  // Rời phòng
  socket.on('leave_room', () => {
    handlePlayerDisconnect(socket.id);
    
    // Thông báo cho tất cả người chơi về cập nhật phòng
    io.emit('room_updated');
    sendServerStats();
  });

  // Ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`Người chơi ${socket.id} đã ngắt kết nối`);
    handlePlayerDisconnect(socket.id);
    delete players[socket.id];
    
    // Thông báo cho tất cả người chơi về cập nhật phòng
    io.emit('room_updated');
    sendServerStats();
  });
  
  // ===== Chức năng xếp hạng =====
  
  // Đăng ký tài khoản xếp hạng
  socket.on('ranked_register', ({ username, password }) => {
    console.log(`Đang xử lý yêu cầu đăng ký cho username: ${username}`);
    
    // Kiểm tra xem thiết bị này đã đăng nhập chưa
    if (isDeviceLoggedIn(socket)) {
      const deviceId = getDeviceId(socket);
      const session = deviceSessions.get(deviceId);
      
      socket.emit('ranked_error', { 
        message: `Thiết bị này đã đăng nhập với tài khoản "${session.username}". Một thiết bị chỉ được đăng nhập một tài khoản duy nhất, cho dù bạn sử dụng localhost hay địa chỉ IP. Vui lòng đăng xuất trước khi đăng ký tài khoản mới.`
      });
      return;
    }
    
    // Kiểm tra username đã tồn tại chưa
    if (rankedPlayers[socket.id] || Object.values(rankedPlayers).some(p => p.username === username)) {
      console.log(`Đăng ký thất bại: Username ${username} đã tồn tại`);
      socket.emit('ranked_error', { message: 'Tên người chơi đã tồn tại' });
      return;
    }
    
    try {
      console.log(`Đang tạo mã băm mật khẩu cho username: ${username}`);
      // Mã hóa mật khẩu
      const { hash, salt } = hashPassword(password);
      console.log(`Đã tạo mã băm mật khẩu thành công cho username: ${username}`);
      
      // Tạo người chơi mới
      rankedPlayers[socket.id] = {
        id: socket.id,
        username,
        passwordHash: hash,
        passwordSalt: salt,
        elo: 1000, // Điểm Elo ban đầu
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: Date.now()
      };
      
      // Đăng ký phiên mới
      registerSession(socket, username, 'ranked');
      
      // Lưu thông tin người dùng vào file
      saveRankedPlayers();
      
      // Gửi thông tin người chơi về client
      socket.emit('ranked_register_success', {
        id: socket.id,
        username,
        elo: 1000
      });
      
      console.log(`Người chơi ${socket.id} đã đăng ký tài khoản xếp hạng: ${username} thành công`);
    } catch (error) {
      console.error(`Lỗi khi đăng ký tài khoản: ${error.message}`);
      socket.emit('ranked_error', { message: 'Đã xảy ra lỗi khi đăng ký tài khoản. Vui lòng thử lại.' });
    }
  });
  
  // Đăng nhập tài khoản xếp hạng
  socket.on('ranked_login', ({ username, password }) => {
    console.log(`Đang xử lý yêu cầu đăng nhập cho username: ${username}`);
    
    try {
      // Kiểm tra xem thiết bị này đã đăng nhập chưa
      if (isDeviceLoggedIn(socket)) {
        const deviceId = getDeviceId(socket);
        const session = deviceSessions.get(deviceId);
        
        // Nếu là cùng một tài khoản, cho phép đăng nhập lại
        if (session.type === 'ranked' && session.username === username) {
          // Tìm người chơi theo username
          const player = Object.values(rankedPlayers).find(p => p.username === username);
          
          if (!player) {
            socket.emit('ranked_error', { message: 'Tên người chơi không tồn tại' });
            return;
          }
          
          // Xác thực mật khẩu
          if (!verifyPassword(password, player.passwordHash, player.passwordSalt)) {
            socket.emit('ranked_error', { message: 'Mật khẩu không đúng' });
            return;
          }
          
          // Cập nhật ID socket mới
          const oldId = player.id;
          player.id = socket.id;
          
          // Cập nhật đối tượng rankedPlayers
          if (oldId !== socket.id) {
            rankedPlayers[socket.id] = player;
            delete rankedPlayers[oldId];
          }
          
          // Cập nhật session
          session.socketId = socket.id;
          deviceSessions.set(deviceId, session);
          
          // Lưu thông tin người dùng vào file
          saveRankedPlayers();
          
          // Gửi thông tin người chơi về client
          socket.emit('ranked_login_success', {
            id: socket.id,
            username: player.username,
            elo: player.elo
          });
          
          return;
        } else {
          // Nếu khác tài khoản, từ chối đăng nhập
          socket.emit('ranked_error', { 
            message: `Thiết bị này đã đăng nhập với tài khoản ${session.username}. Một thiết bị chỉ được đăng nhập một tài khoản duy nhất, cho dù bạn sử dụng localhost hay địa chỉ IP. Vui lòng đăng xuất trước.`
          });
          return;
        }
      }
      
      // Tìm người chơi theo username (không phụ thuộc vào socket.id)
      const player = Object.values(rankedPlayers).find(p => p.username === username);
      
      if (!player) {
        console.log(`Đăng nhập thất bại: Username ${username} không tồn tại`);
        socket.emit('ranked_error', { message: 'Tên người chơi không tồn tại' });
        return;
      }
      
      console.log(`Đang xác thực mật khẩu cho username: ${username}`);
      // Xác thực mật khẩu
      if (!verifyPassword(password, player.passwordHash, player.passwordSalt)) {
        console.log(`Đăng nhập thất bại: Mật khẩu không đúng cho username: ${username}`);
        socket.emit('ranked_error', { message: 'Mật khẩu không đúng' });
        return;
      }
      
      // Kiểm tra xem tài khoản này đã đăng nhập ở thiết bị khác chưa
      const loggedInDeviceId = Array.from(deviceSessions.entries())
        .find(([_, session]) => session.username === username && session.type === 'ranked')?.[0];
        
      if (loggedInDeviceId) {
        const existingSession = deviceSessions.get(loggedInDeviceId);
        
        // Đăng xuất phiên đăng nhập cũ
        if (io.sockets.sockets.has(existingSession.socketId)) {
          io.sockets.sockets.get(existingSession.socketId).emit('forced_logout', {
            message: 'Tài khoản của bạn đã đăng nhập ở thiết bị khác'
          });
        }
        
        // Cập nhật lại bản đồ đăng nhập thiết bị
        deviceSessions.delete(loggedInDeviceId);
      }
      
      // Cập nhật ID socket mới
      const oldId = player.id;
      player.id = socket.id;
      
      // Cập nhật đối tượng rankedPlayers
      if (oldId !== socket.id) {
        rankedPlayers[socket.id] = player;
        if (rankedPlayers[oldId]) {
        delete rankedPlayers[oldId];
        }
      }
      
      // Đăng ký phiên mới
      registerSession(socket, username, 'ranked');
      
      // Lưu thông tin người dùng vào file
      saveRankedPlayers();
      
      // Gửi thông tin người chơi về client
      socket.emit('ranked_login_success', {
        id: socket.id,
        username: player.username,
        elo: player.elo
      });
      
      console.log(`Người chơi ${socket.id} đã đăng nhập tài khoản xếp hạng: ${username} thành công`);
    } catch (error) {
      console.error(`Lỗi khi đăng nhập tài khoản: ${error.message}`);
      socket.emit('ranked_error', { message: 'Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.' });
    }
  });
  
  // Lấy bảng xếp hạng
  socket.on('get_leaderboard', () => {
    const topPlayers = getTopRankedPlayers();
    socket.emit('leaderboard', topPlayers);
    console.log(`Đã gửi bảng xếp hạng cho người chơi ${socket.id}`);
  });
  
  // Lấy danh sách phòng xếp hạng
  socket.on('get_ranked_rooms', () => {
    if (!rankedPlayers[socket.id]) {
      socket.emit('ranked_error', { message: 'Bạn cần đăng nhập để xem danh sách phòng' });
      return;
    }
    
    // Kiểm tra xem người chơi có phòng nào không
    let hasOwnRoom = false;
    let ownRoomId = null;
    
    for (const [roomId, room] of Object.entries(rankedRooms)) {
      if (room.player1 && room.player1.id === socket.id && room.status === 'waiting') {
        hasOwnRoom = true;
        ownRoomId = roomId;
        console.log(`[DEBUG] get_ranked_rooms - Người chơi ${socket.id} đang có phòng ${roomId}`);
        break;
      }
    }
    
    // Chỉ dọn dẹp nếu người chơi không có phòng hoặc không phải là người vừa tạo phòng
    if (!hasOwnRoom) {
      console.log(`[DEBUG] get_ranked_rooms - Người chơi ${socket.id} không có phòng, tiến hành dọn dẹp phòng cũ`);
    // Dọn dẹp các phòng cũ trước khi lấy danh sách
    cleanupStaleRankedRooms();
    } else {
      console.log(`[DEBUG] get_ranked_rooms - Bỏ qua dọn dẹp phòng vì người chơi ${socket.id} đang có phòng ${ownRoomId}`);
    }
    
    const availableRooms = getAvailableRankedRooms();
    socket.emit('ranked_room_list', availableRooms);
    console.log(`[DEBUG] get_ranked_rooms - Đã gửi danh sách ${availableRooms.length} phòng xếp hạng cho người chơi ${socket.id}`);
  });
  
  // Đăng xuất tài khoản xếp hạng
  socket.on('ranked_logout', () => {
    const rankedPlayer = rankedPlayers[socket.id];
    if (rankedPlayer) {
      console.log(`Người chơi ${socket.id} đang đăng xuất tài khoản: ${rankedPlayer.username}`);
      
      // Lưu thông tin người dùng trước khi đăng xuất
      const username = rankedPlayer.username;
      
      // Đăng xuất phiên
      const logoutResult = logoutSession(socket);
      
      if (logoutResult.success) {
        console.log(`Đã xóa phiên đăng nhập cho tài khoản ${logoutResult.username}`);
      }
      
      // Đảm bảo thông tin người chơi được lưu vào file
      saveRankedPlayers();
      
      // Gửi thông báo đăng xuất thành công
      socket.emit('ranked_logout_success');
      console.log(`Người chơi ${socket.id} đã đăng xuất thành công khỏi tài khoản: ${username}`);
    }
  });
  
  // Dọn dẹp các phòng xếp hạng cũ
  function cleanupStaleRankedRooms() {
    // Tìm và xóa các phòng không có người chơi hoặc phòng quá cũ (hơn 1 giờ)
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 giờ tính bằng mili giây
    let cleanedCount = 0;
    
    console.log(`[DEBUG] cleanupStaleRankedRooms - Bắt đầu kiểm tra ${Object.keys(rankedRooms).length} phòng`);
    
    // Theo dõi các phòng theo ID người chơi
    const playerRooms = {};
    
    // Phân loại phòng theo player ID
    Object.entries(rankedRooms).forEach(([roomId, room]) => {
      if (room.player1) {
        const playerId = room.player1.id;
        if (!playerRooms[playerId]) {
          playerRooms[playerId] = [];
        }
        playerRooms[playerId].push({roomId, room});
        console.log(`[DEBUG] cleanupStaleRankedRooms - Người chơi ${playerId} có phòng ${roomId}, trạng thái ${room.status}`);
      }
    });
    
    // Xóa phòng dư thừa (người chơi có nhiều hơn 1 phòng)
    Object.entries(playerRooms).forEach(([playerId, rooms]) => {
      if (rooms.length > 1) {
        // Giữ lại phòng mới nhất
        rooms.sort((a, b) => b.room.createdAt - a.room.createdAt);
        
        // Xóa các phòng cũ
        for (let i = 1; i < rooms.length; i++) {
          delete rankedRooms[rooms[i].roomId];
          cleanedCount++;
          console.log(`[DEBUG] cleanupStaleRankedRooms - Đã xóa phòng xếp hạng ${rooms[i].roomId} do người chơi ${playerId} có nhiều phòng`);
        }
      }
    });
    
    // Tiếp tục xử lý theo cách thông thường
    Object.entries(rankedRooms).forEach(([roomId, room]) => {
      // Kiểm tra xem người chơi 1 còn kết nối không
      const player1Connected = room.player1 && io.sockets.sockets.has(room.player1.id);
      
      // Kiểm tra thời gian tạo phòng
      const isOld = (now - room.createdAt) > oneHour;
      
      // Kiểm tra xem phòng đã "playing" nhưng không liên kết với trận đấu nào
      const isOrphanedPlayingRoom = room.status === 'playing' && 
                                    !Object.values(rankedMatches).some(match => match.id === roomId);
      
      console.log(`[DEBUG] cleanupStaleRankedRooms - Kiểm tra phòng ${roomId}: player1Connected=${player1Connected}, isOld=${isOld}, isOrphanedPlayingRoom=${isOrphanedPlayingRoom}`);
      
      // Nếu chủ phòng không còn kết nối hoặc phòng quá cũ hoặc là phòng "playing" bị bỏ rơi
      if (!player1Connected || isOld || isOrphanedPlayingRoom) {
        // Thông báo cho người chơi 2 nếu có và còn kết nối
        if (room.player2 && io.sockets.sockets.has(room.player2.id)) {
          io.to(room.player2.id).emit('opponent_left');
        }
        
        delete rankedRooms[roomId];
        cleanedCount++;
        console.log(`[DEBUG] cleanupStaleRankedRooms - Đã xóa phòng ${roomId} do ${!player1Connected ? 'chủ phòng không còn kết nối' : (isOld ? 'phòng quá cũ' : 'phòng playing bị bỏ rơi')}`);
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`[DEBUG] cleanupStaleRankedRooms - Đã dọn dẹp ${cleanedCount} phòng xếp hạng cũ hoặc trùng lặp`);
      
      // Thông báo cập nhật danh sách phòng nếu có phòng bị xóa
      io.emit('ranked_room_updated');
    }
    
    return cleanedCount;
  }

  // Tạo phòng xếp hạng
  socket.on('create_ranked_room', () => {
    console.log(`[DEBUG] Người chơi ${socket.id} đang yêu cầu tạo phòng xếp hạng`);
    
    if (!rankedPlayers[socket.id]) {
      socket.emit('ranked_error', { message: 'Bạn cần đăng nhập để tạo phòng' });
      console.log(`[DEBUG] Tạo phòng thất bại: Người chơi chưa đăng nhập`);
      return;
    }
    
    // KHÔNG dọn dẹp các phòng khi tạo phòng mới để tránh xóa phòng vừa tạo
    // cleanupStaleRankedRooms();
    
    // Kiểm tra trận đấu xếp hạng hiện tại
    const currentMatch = Object.values(rankedMatches).find(m => 
      (m.player1.id === socket.id || m.player2.id === socket.id) && m.gameState.gameActive
    );
    
    if (currentMatch) {
      socket.emit('ranked_error', { message: 'Bạn đang trong một trận đấu khác. Vui lòng kết thúc trận đấu hiện tại trước khi tạo phòng mới.' });
      console.log(`[DEBUG] Tạo phòng thất bại: Người chơi đang trong trận đấu ${currentMatch.id}`);
      return;
    }
    
    // Kiểm tra tất cả các phòng một cách kỹ lưỡng
    let existingRoom = null;
    
    for (const [roomId, room] of Object.entries(rankedRooms)) {
      // Nếu người chơi đã tạo phòng trước đó
      if (room.player1 && room.player1.id === socket.id) {
        existingRoom = room;
        console.log(`[DEBUG] Tìm thấy phòng hiện có của người chơi này: ${roomId}, trạng thái: ${room.status}`);
        break;  // Tìm thấy phòng, thoát vòng lặp
      }
      
      // Nếu người chơi đã tham gia phòng của người khác
      if (room.player2 && room.player2.id === socket.id) {
        // Xóa người chơi khỏi phòng đó
        room.player2 = null;
        room.status = 'waiting';
        
        // Thông báo cho chủ phòng
        if (io.sockets.sockets.has(room.player1.id)) {
          io.to(room.player1.id).emit('opponent_left');
        }
        
        // Thông báo cập nhật danh sách phòng
        io.emit('ranked_room_updated');
        console.log(`[DEBUG] Người chơi đã được xóa khỏi phòng ${roomId} trước khi tạo phòng mới`);
      }
    }
    
    if (existingRoom) {
      // Nếu phòng không còn ở trạng thái chờ, xóa phòng đó và tạo phòng mới
      if (existingRoom.status !== 'waiting') {
        delete rankedRooms[existingRoom.id];
        console.log(`[DEBUG] Đã xóa phòng cũ ${existingRoom.id} vì không ở trạng thái chờ`);
      } else {
        // Nếu phòng vẫn ở trạng thái chờ, gửi lại thông tin phòng cho người chơi
        socket.emit('ranked_room_created', existingRoom);
        socket.emit('ranked_error', { message: 'Bạn đã có phòng, không cần tạo phòng mới' });
        console.log(`[DEBUG] Gửi lại thông tin phòng hiện có ${existingRoom.id} cho người chơi`);
        return;
      }
    }
    
    // Tạo ID phòng ngẫu nhiên
    const roomId = generateRoomId();
    
    // Tạo phòng mới
    rankedRooms[roomId] = {
      id: roomId,
      player1: {
        id: socket.id,
        username: rankedPlayers[socket.id].username,
        elo: rankedPlayers[socket.id].elo
      },
      player2: null,
      gameState: {
        board: createEmptyBoard(15), // Bàn cờ 15x15 cho chế độ xếp hạng
        currentPlayer: 'X',
        gameActive: true,
        size: 15,
        lastMove: null
      },
      status: 'waiting',
      createdAt: Date.now()
    };
    
    // Tham gia vào room socket
    socket.join(roomId);
    
    // Gửi thông tin phòng cho người chơi
    socket.emit('ranked_room_created', rankedRooms[roomId]);
    console.log(`[DEBUG] Đã tạo phòng xếp hạng mới ${roomId} cho người chơi ${socket.id}, username=${rankedPlayers[socket.id].username}`);
    
    // Thông báo cho tất cả người chơi về phòng mới
    io.emit('ranked_room_updated');
    console.log(`[DEBUG] Đã emit ranked_room_updated để thông báo về phòng mới ${roomId}`);
    
    // Lập tức gửi danh sách phòng mới cho người tạo phòng
    const availableRooms = getAvailableRankedRooms();
    socket.emit('ranked_room_list', availableRooms);
    console.log(`[DEBUG] Đã gửi trực tiếp danh sách ${availableRooms.length} phòng xếp hạng cho người tạo phòng`);
  });
  
  // Tham gia vào phòng xếp hạng
  socket.on('join_ranked_room', (roomId) => {
    if (!rankedPlayers[socket.id]) {
      socket.emit('ranked_error', { message: 'Bạn cần đăng nhập để tham gia phòng' });
      return;
    }
    
    // Kiểm tra xem phòng có tồn tại không
    if (!rankedRooms[roomId]) {
      socket.emit('ranked_error', { message: 'Phòng không tồn tại' });
      return;
    }
    
    const room = rankedRooms[roomId];
    
    // Kiểm tra xem người chơi có phải là chủ phòng không
    if (room.player1.id === socket.id) {
      socket.emit('ranked_error', { message: 'Bạn không thể tham gia vào phòng của chính mình' });
      return;
    }
    
    // Kiểm tra trạng thái phòng
    if (room.status !== 'waiting' || room.player2) {
      socket.emit('ranked_error', { message: 'Phòng đã đầy hoặc trận đấu đã kết thúc' });
      return;
    }
    
    // Tham gia vào phòng
    room.player2 = {
      id: socket.id,
      username: rankedPlayers[socket.id].username,
      elo: rankedPlayers[socket.id].elo
    };
    room.status = 'playing';
    
    // Tham gia vào room socket
    socket.join(roomId);
    
    // Tạo trận đấu xếp hạng từ phòng
    const matchId = roomId;
    rankedMatches[matchId] = {
      id: matchId,
      player1: room.player1,
      player2: room.player2,
      gameState: room.gameState,
      status: room.status,
      createdAt: room.createdAt
    };
    
    // Gửi thông tin trận đấu cho cả hai người chơi
    io.to(roomId).emit('match_found', rankedMatches[matchId]);
    
    console.log(`Người chơi ${socket.id} đã tham gia phòng xếp hạng ${roomId}`);
    
    // Thông báo cho tất cả người chơi về cập nhật phòng
    io.emit('ranked_room_updated');
  });
  
  // Tìm trận đấu
  socket.on('find_match', () => {
    if (!rankedPlayers[socket.id]) {
      socket.emit('ranked_error', { message: 'Bạn cần đăng nhập để tìm trận đấu' });
      return;
    }
    
    // Kiểm tra xem người chơi đã ở trong hàng đợi chưa
    if (matchmakingQueue.includes(socket.id)) {
      socket.emit('ranked_error', { message: 'Bạn đang tìm trận đấu' });
      return;
    }
    
    // Thêm người chơi vào hàng đợi
    matchmakingQueue.push(socket.id);
    console.log(`Người chơi ${socket.id} đang tìm trận đấu xếp hạng`);
    
    // Tìm đối thủ phù hợp
    const opponentId = findMatchOpponent(socket.id);
    
    if (opponentId) {
      // Tạo trận đấu
      const match = createRankedMatch(socket.id, opponentId);
      
      if (match) {
        // Thông báo cho cả hai người chơi
        io.to(socket.id).emit('match_found', match);
        io.to(opponentId).emit('match_found', match);
        
        // Tham gia vào room socket
        socket.join(match.id);
        io.sockets.sockets.get(opponentId)?.join(match.id);
        
        console.log(`Đã tạo trận đấu xếp hạng ${match.id} giữa ${match.player1.username} và ${match.player2.username}`);
      }
    }
  });
  
  // Hủy tìm trận đấu
  socket.on('cancel_find_match', () => {
    // Xóa người chơi khỏi hàng đợi
    const index = matchmakingQueue.indexOf(socket.id);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
      console.log(`Người chơi ${socket.id} đã hủy tìm trận đấu xếp hạng`);
    }
  });
  
  // Đặt nước đi trong trận xếp hạng
  socket.on('ranked_move', ({ row, col }) => {
    // Tìm trận đấu của người chơi
    const match = Object.values(rankedMatches).find(m => 
      m.player1.id === socket.id || m.player2.id === socket.id
    );
    
    if (!match) return;
    
    // Kiểm tra lượt chơi
    const isPlayer1 = socket.id === match.player1.id;
    const isPlayer2 = socket.id === match.player2.id;
    const isMyTurn = (match.gameState.currentPlayer === 'X' && isPlayer1) || 
                    (match.gameState.currentPlayer === 'O' && isPlayer2);
    
    if (!isMyTurn) return;
    
    // Kiểm tra vị trí đặt
    if (match.gameState.board[row][col] !== '' || !match.gameState.gameActive) return;
    
    // Đặt nước đi
    const value = isPlayer1 ? 'X' : 'O';
    match.gameState.board[row][col] = value;
    
    // Kiểm tra thắng
    const isWin = checkWin(match.gameState.board, row, col, value);
    if (isWin) {
      match.gameState.gameActive = false;
      
      // Kết thúc trận đấu
      const results = endRankedMatch(match.id, socket.id);
      
      // Thông báo kết quả
      if (results) {
        io.to(match.player1.id).emit('match_end', results.player1Result);
        io.to(match.player2.id).emit('match_end', results.player2Result);
      }
    }
    
    // Kiểm tra hòa
    const isDraw = !isWin && checkDraw(match.gameState.board);
    if (isDraw) {
      match.gameState.gameActive = false;
      
      // Kết thúc trận đấu hòa
      const results = endRankedMatch(match.id, null);
      
      // Thông báo kết quả
      if (results) {
        io.to(match.player1.id).emit('match_end', results.player1Result);
        io.to(match.player2.id).emit('match_end', results.player2Result);
      }
    }
    
    // Cập nhật lượt chơi
    if (match.gameState.gameActive) {
      match.gameState.currentPlayer = match.gameState.currentPlayer === 'X' ? 'O' : 'X';
    }
    
    // Cập nhật nước đi cuối cùng
    match.gameState.lastMove = { row, col, value };
    
    // Gửi cập nhật cho cả hai người chơi
    io.to(match.id).emit('match_update', match.gameState);
    console.log(`Người chơi ${socket.id} đã đặt ${value} tại [${row},${col}] trong trận xếp hạng ${match.id}`);
  });
  
  // Rời trận đấu xếp hạng
  socket.on('leave_match', () => {
    console.log(`Người chơi ${socket.id} đang xử lý rời trận đấu xếp hạng`);
    
    // Tìm trận đấu của người chơi
    const match = Object.values(rankedMatches).find(m => 
      m.player1.id === socket.id || m.player2.id === socket.id
    );
    
    if (match) {
    // Xác định người chơi còn lại
    const opponentId = socket.id === match.player1.id ? match.player2.id : match.player1.id;
    
    // Thông báo cho đối thủ
      if (io.sockets.sockets.has(opponentId)) {
    io.to(opponentId).emit('opponent_left');
      }
    
    // Nếu trận đấu đã bắt đầu, kết thúc trận đấu với người rời đi thua
    if (match.gameState.gameActive) {
      const results = endRankedMatch(match.id, opponentId);
      
      // Thông báo kết quả cho đối thủ
        if (results && io.sockets.sockets.has(opponentId)) {
        io.to(opponentId).emit('match_end', socket.id === match.player1.id ? results.player2Result : results.player1Result);
      }
    } else {
      // Nếu trận đấu chưa bắt đầu, xóa trận đấu
      delete rankedMatches[match.id];
    }
    
    // Rời khỏi room socket
    socket.leave(match.id);
    console.log(`Người chơi ${socket.id} đã rời trận đấu xếp hạng ${match.id}`);
    }
    
    // Kiểm tra và xóa TẤT CẢ các phòng xếp hạng mà người chơi này có liên quan
    let isRoomDeleted = false;
    
    Object.keys(rankedRooms).forEach(roomId => {
      const room = rankedRooms[roomId];
      
      // Nếu người chơi là chủ phòng (player1), xóa phòng
      if (room.player1?.id === socket.id) {
        delete rankedRooms[roomId];
        isRoomDeleted = true;
        console.log(`Đã xóa phòng xếp hạng ${roomId} do chủ phòng rời đi`);
        
        // Thông báo cho người chơi 2 (nếu có)
        if (room.player2 && io.sockets.sockets.has(room.player2.id)) {
          io.to(room.player2.id).emit('opponent_left');
        }
      } 
      // Nếu người chơi là người tham gia (player2), cập nhật phòng
      else if (room.player2 && room.player2.id === socket.id) {
        room.player2 = null;
        room.status = 'waiting';
        isRoomDeleted = true;
        console.log(`Người chơi 2 đã rời phòng xếp hạng ${roomId}`);
        
        // Thông báo cho chủ phòng
        if (io.sockets.sockets.has(room.player1.id)) {
          io.to(room.player1.id).emit('opponent_left');
        }
      }
    });
    
    // Thông báo cập nhật danh sách phòng
    if (isRoomDeleted) {
      io.emit('ranked_room_updated');
    }
  });
  
  // Thắng do đối thủ bỏ cuộc
  socket.on('forfeit_win', () => {
    // Tìm trận đấu của người chơi
    const match = Object.values(rankedMatches).find(m => 
      m.player1.id === socket.id || m.player2.id === socket.id
    );
    
    if (!match) return;
    
    // Kết thúc trận đấu với người gửi yêu cầu thắng
    const results = endRankedMatch(match.id, socket.id);
    
    // Thông báo kết quả
    if (results) {
      io.to(socket.id).emit('match_end', socket.id === match.player1.id ? results.player1Result : results.player2Result);
    }
    
    // Xóa phòng xếp hạng nếu còn tồn tại (đảm bảo gấp đôi)
    if (rankedRooms[match.id]) {
      delete rankedRooms[match.id];
      console.log(`Đã xóa phòng xếp hạng ${match.id} sau khi xử lý thắng do đối thủ bỏ cuộc`);
      
      // Thông báo cập nhật danh sách phòng
      io.emit('ranked_room_updated');
    }
    
    console.log(`Người chơi ${socket.id} thắng do đối thủ bỏ cuộc trong trận đấu xếp hạng ${match.id}`);
  });
});

// Xử lý khi người chơi ngắt kết nối
function handlePlayerDisconnect(playerId) {
  const player = players[playerId];
  
  // Xử lý đăng xuất tài khoản xếp hạng
  const rankedPlayer = rankedPlayers[playerId];
  if (rankedPlayer) {
    // Tìm IP của người chơi để xóa khỏi deviceLogins
    const socket = io.sockets.sockets.get(playerId);
    if (socket) {
      // Đăng xuất phiên nếu đây là ngắt kết nối thực sự (không phải refresh trang)
      // Để xử lý refresh trang, chúng ta sẽ giữ phiên trong 60 giây
      setTimeout(() => {
        // Kiểm tra xem socket có kết nối lại không
        if (!io.sockets.sockets.has(playerId)) {
          // Nếu không kết nối lại, đăng xuất phiên
          if (socket) {
          logoutSession(socket);
          console.log(`Đã xóa phiên đăng nhập cho tài khoản ${rankedPlayer.username} sau 60 giây không kết nối lại`);
          }
          
          // IMPORTANT: Không xóa thông tin người chơi khỏi rankedPlayers
          // Chỉ đăng xuất phiên để người dùng có thể đăng nhập lại sau
          
          // Lưu dữ liệu người chơi
          saveRankedPlayers();
        }
      }, 60000); // 60 giây
    }
  }

  // Xử lý ngắt kết nối phòng Cờ Thú
  const animalChessRoom = Object.entries(animalChessRooms).find(([_, room]) => 
    room.players && room.players[playerId]
  );
  
  if (animalChessRoom) {
    const [roomId, room] = animalChessRoom;
    const playerUsername = room.players[playerId].username;
    const playerColor = room.players[playerId].color;
    
    // Thông báo cho người chơi khác
    for (const pid in room.players) {
      if (pid !== playerId && io.sockets.sockets.has(pid)) {
        io.to(pid).emit('animalChess:playerLeft', {
          username: playerUsername
        });
      }
    }
    
    // Xóa người chơi khỏi phòng
    delete room.players[playerId];
    
    // Nếu không còn ai trong phòng, xóa phòng
    if (Object.keys(room.players).length === 0) {
      delete animalChessRooms[roomId];
      console.log(`Đã xóa phòng Cờ Thú ${roomId} vì không còn người chơi`);
    } else {
      // Nếu phòng đang chơi, kết thúc trò chơi
      if (room.status === 'playing') {
        room.status = 'finished';
        room.gameState.gameActive = false;
        
        // Thông báo kết thúc trò chơi cho người còn lại
        io.to(roomId).emit('animalChess:gameEnd', {
          winner: room.players[Object.keys(room.players)[0]].color,
          reason: 'opponent_left'
        });
      }
    }
    
    console.log(`Người chơi ${playerId} (${playerUsername}) đã ngắt kết nối khỏi phòng Cờ Thú ${roomId}`);
  }

  if (player && player.room) {
    const roomId = player.room;
    const room = rooms[roomId];
    
    if (room) {
      // Kiểm tra người chơi là ai
      const isPlayer1 = playerId === room.player1?.id;
      const isPlayer2 = playerId === room.player2?.id;
      
      if (isPlayer1) {
        // Nếu người chơi 1 rời đi
        if (room.player2) {
          // Nếu có người chơi 2, thì người chơi 2 trở thành người chơi 1
          room.player1 = room.player2;
          room.player2 = null;
          room.status = 'waiting';
          room.gameState = {
            board: createEmptyBoard(70),
            currentPlayer: 'X',
            gameActive: true,
            size: 70,
            lastMove: null
          };
          
          // Thông báo cho người chơi còn lại
          io.to(room.player1.id).emit('player_left', { room });
        } else {
          // Nếu không có người chơi 2, xóa phòng
          delete rooms[roomId];
        }
      } else if (isPlayer2) {
        // Nếu người chơi 2 rời đi
        room.player2 = null;
        room.status = 'waiting';
        room.gameState = {
          board: createEmptyBoard(70),
          currentPlayer: 'X',
          gameActive: true,
          size: 70,
          lastMove: null
        };
        
        // Thông báo cho người chơi còn lại
        io.to(room.player1.id).emit('player_left', { room });
      }
      
      // Cập nhật thông tin người chơi
      players[playerId].room = null;
      
      // Rời khỏi room socket
      const socket = io.sockets.sockets.get(playerId);
      if (socket) {
        socket.leave(roomId);
      }
      
      console.log(`Người chơi ${playerId} đã rời phòng ${roomId}`);
    }
  }
  
  // Xử lý cho chế độ xếp hạng
  // Xóa khỏi hàng đợi tìm trận
  const matchmakingIndex = matchmakingQueue.indexOf(playerId);
  if (matchmakingIndex !== -1) {
    matchmakingQueue.splice(matchmakingIndex, 1);
  }
  
  // Xử lý phòng xếp hạng
  // Tìm phòng xếp hạng mà người chơi đang ở
  const rankedRoom = Object.entries(rankedRooms).find(([_, room]) => 
    room.player1?.id === playerId || (room.player2 && room.player2.id === playerId)
  );
  
  if (rankedRoom) {
    const [roomId, room] = rankedRoom;
    
    // Nếu người chơi là chủ phòng (player1), xóa phòng
    if (room.player1?.id === playerId) {
      delete rankedRooms[roomId];
      console.log(`Đã xóa phòng xếp hạng ${roomId} do chủ phòng rời đi`);
      
      // Thông báo cho người chơi 2 (nếu có)
      if (room.player2) {
        io.to(room.player2.id).emit('opponent_left');
      }
      
      // Thông báo cập nhật danh sách phòng
      io.emit('ranked_room_updated');
    } 
    // Nếu người chơi là người tham gia (player2), cập nhật phòng
    else if (room.player2 && room.player2.id === playerId) {
      room.player2 = null;
      room.status = 'waiting';
      
      // Thông báo cho chủ phòng
      if (io.sockets.sockets.has(room.player1.id)) {
      io.to(room.player1.id).emit('opponent_left');
      }
      
      // Thông báo cập nhật danh sách phòng
      io.emit('ranked_room_updated');
    }
  }
  
  // Tìm trận đấu xếp hạng của người chơi
  const rankedMatch = Object.values(rankedMatches).find(m => 
    m.player1.id === playerId || m.player2.id === playerId
  );
  
  if (rankedMatch) {
    // Xác định người chơi còn lại
    const opponentId = playerId === rankedMatch.player1.id ? rankedMatch.player2.id : rankedMatch.player1.id;
    
    // Thông báo cho đối thủ
    io.to(opponentId).emit('opponent_left');
    
    // Nếu trận đấu đã bắt đầu, kết thúc trận đấu với người ngắt kết nối thua
    if (rankedMatch.gameState.gameActive) {
      const results = endRankedMatch(rankedMatch.id, opponentId);
      
      // Thông báo kết quả cho đối thủ
      if (results) {
        io.to(opponentId).emit('match_end', playerId === rankedMatch.player1.id ? results.player2Result : results.player1Result);
      }
    } else {
      // Nếu trận đấu chưa bắt đầu, xóa trận đấu
      delete rankedMatches[rankedMatch.id];
    }
  }
}

// Tạo bàn cờ trống
function createEmptyBoard(size) {
  const board = [];
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      row.push('');
    }
    board.push(row);
  }
  return board;
}

// Kiểm tra thắng
function checkWin(board, row, col, player) {
  const directions = [
    [0, 1],  // ngang
    [1, 0],  // dọc
    [1, 1],  // chéo phải
    [1, -1]  // chéo trái
  ];
  
  const size = board.length;
  const opponent = player === 'X' ? 'O' : 'X';
  
  for (const [dx, dy] of directions) {
    let count = 1;
    let endPoints = [];
    
    // Kiểm tra theo hướng dương
    let r = row + dx;
    let c = col + dy;
    while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === player) {
      count++;
      r += dx;
      c += dy;
    }
    
    // Kiểm tra điểm cuối thứ nhất
    if (r >= 0 && r < size && c >= 0 && c < size) {
      endPoints.push(board[r][c]); // Lưu giá trị ở điểm cuối (có thể là '', 'X', hoặc 'O')
    } else {
      endPoints.push('edge'); // Nếu ra ngoài biên, đánh dấu là 'edge'
    }
    
    // Kiểm tra theo hướng âm
    r = row - dx;
    c = col - dy;
    while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === player) {
      count++;
      r -= dx;
      c -= dy;
    }
    
    // Kiểm tra điểm cuối thứ hai
    if (r >= 0 && r < size && c >= 0 && c < size) {
      endPoints.push(board[r][c]); // Lưu giá trị ở điểm cuối
    } else {
      endPoints.push('edge'); // Nếu ra ngoài biên, đánh dấu là 'edge'
    }
    
    // Kiểm tra nếu có đủ 5 quân liên tiếp
    if (count >= 5) {
      // Áp dụng luật "chặn 2 đầu"
      // Đếm số lượng đầu bị chặn bởi quân đối phương
      const blockedEnds = endPoints.filter(end => end === opponent).length;
      
      // Nếu cả hai đầu đều bị chặn, không tính là thắng
      if (blockedEnds === 2) {
        continue; // Tiếp tục kiểm tra hướng khác
      }
      
      // Nếu không bị chặn cả hai đầu, tính là thắng
      return true;
    }
  }
  
  return false;
}

// Kiểm tra hòa
function checkDraw(board) {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j] === '') {
        return false;
      }
    }
  }
  return true;
}

// Kiểm tra điều kiện thắng cho Cờ Thú
function checkAnimalChessWinCondition(gameState) {
  if (!gameState || !gameState.pieces) return null;
  
  const pieces = gameState.pieces;
  
  // Kiểm tra xem có quân nào vào hang đối phương không
  for (const piece of pieces) {
    // Hang xanh ở (0,3), hang đỏ ở (8,3)
    if ((piece.row === 0 && piece.col === 3 && piece.player === 'red') ||
        (piece.row === 8 && piece.col === 3 && piece.player === 'blue')) {
      return {
        winner: piece.player,
        reason: 'den_capture'
      };
    }
  }
  
  // Đếm số quân của mỗi bên
  const bluePieces = pieces.filter(p => p.player === 'blue').length;
  const redPieces = pieces.filter(p => p.player === 'red').length;
  
  if (bluePieces === 0) {
    return {
      winner: 'red',
      reason: 'all_pieces_captured'
    };
  }
  
  if (redPieces === 0) {
    return {
      winner: 'blue',
      reason: 'all_pieces_captured'
    };
  }
  
  return null; // Trò chơi vẫn tiếp tục
}

// Tạo ID phòng ngẫu nhiên
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Khởi động server
const PORT = process.env.PORT || 3000;

// Thiết lập dọn dẹp định kỳ các phòng xếp hạng cũ (mỗi 15 phút) sau khi server đã khởi động
setTimeout(() => {
  setInterval(() => {
    // Kiểm tra xem hàm có tồn tại không trước khi gọi
    if (typeof cleanupStaleRankedRooms === 'function') {
      cleanupStaleRankedRooms();
    } else {
      console.log('Cảnh báo: Hàm cleanupStaleRankedRooms không tồn tại');
    }
  }, 15 * 60 * 1000);
}, 5000);
server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  console.log(`Địa chỉ IP LAN của máy chủ: ${getLANIP()}`);
  console.log(`Người chơi khác có thể kết nối bằng cách truy cập: http://${getLANIP()}:${PORT}`);
  
  // Cập nhật thống kê server mỗi 5 giây để đảm bảo giao diện luôn cập nhật
  setInterval(sendServerStats, 5000);
}); 