# Ứng dụng Game Cờ Caro (Gomoku)

Game cờ caro với các tính năng:
- Chơi đối kháng tại chỗ (2 người chơi trên cùng thiết bị)
- Chơi với AI thông minh với nhiều cấp độ khó khác nhau
- Chơi trực tuyến với người chơi khác
- Chơi xếp hạng với bảng xếp hạng

## Cách sử dụng

### Phương án 1: Chạy trên trình duyệt web
1. Cài đặt Node.js từ [nodejs.org](https://nodejs.org/)
2. Chạy lệnh sau để khởi động server:
   ```
   npm install
   npm run server
   ```
3. Mở trình duyệt web và truy cập: http://localhost:3000

### Phương án 2: Chạy trên trình duyệt web
1. Cài đặt Node.js từ [nodejs.org](https://nodejs.org/)
2. chạy server.bat để khởi động server
3. Mở trình duyệt web và truy cập: http://localhost:3000
4. người chơi khác chơi online sẽ cần IP của bạn, trong server.bat đã hiển thị cách chơi online qua localhost
## Lưu ý về AI
- AI được tích hợp trong game với 4 mức độ khó khác nhau:
  - Dễ: AI di chuyển chủ yếu ngẫu nhiên với một ít chiến lược
  - Trung bình: AI có khả năng phát hiện và chặn các nước đi nguy hiểm
  - Khó: AI có chiến lược tấn công và phòng thủ khá tốt
  - Rất khó: AI cực kỳ thông minh với khả năng phát hiện mẫu hình phức tạp, phòng thủ chặt chẽ và tấn công đa dạng

## Lưu ý khi chơi trực tuyến
- Server phải được chạy để có thể chơi online
- Mỗi máy tính chỉ được đăng nhập 1 tài khoản tại một thời điểm

# Cờ Caro (Gomoku) Game

A simple implementation of the Cờ Caro (Gomoku) game using HTML, CSS, and JavaScript with both Firebase and Node.js/Socket.IO options for online multiplayer.

## How to Play

1. Open the `index.html` file in your web browser.
2. Choose your game mode:
   - **Chơi tại chỗ** (Local play): Play on the same device with another person
   - **Chơi với máy** (Play with AI): Play against the computer
   - **Chơi trực tuyến** (Online play): Play with other people over the internet
   - **Chơi xếp hạng** (Ranked play): Play ranked matches with ELO rating system

### Local/AI Mode
1. Select your board size (10x10, 15x15, or 20x20).
2. Choose whether to play against another human or against the AI.
3. If playing against the AI, select the difficulty level: Easy, Medium, or Hard.
4. Click "Bắt đầu" to start the game.
5. The game starts with player X's turn.
6. Click on any cell to place your mark (X or O).
7. The goal is to get 5 of your marks in a row (horizontally, vertically, or diagonally).
8. The game will highlight the winning line when someone wins.
9. Click the "Chơi lại" (Play Again) button to restart the game.

### Online Mode
1. Enter your player name and click "Xác nhận".
2. You can either:
   - Click "Tạo phòng mới" to create a new game room
   - Enter a room code and click "Vào phòng" to join an existing game
3. Share the room code with your friend so they can join your game.
4. When both players have joined, the game will start automatically.
5. Player 1 (who created the room) plays as X and goes first.
6. Player 2 (who joined the room) plays as O.
7. Wait for your turn, then click on any cell to place your mark.
8. Click "Chơi lại" to restart the game.
9. Click "Rời phòng" to leave the game.

### Ranked Mode
1. Enter a username and password then click "Đăng ký" to create a new account, or enter your existing credentials and click "Đăng nhập" to log in.
2. You can:
   - Click "Tìm trận đấu" to be matched with another player of similar skill level
   - Browse and join open game rooms
   - Create your own room for others to join
3. Each win, loss, or draw will affect your ELO rating.
4. You can check the leaderboard to see how you rank among other players.
5. Click "Đăng xuất" to log out of your account.

#### Account Security Features
- Each device can only be logged into one account at a time
- If you log in to your account on a new device, any existing sessions on other devices will be automatically logged out
- You must log out of your current account before registering or logging into a different account on the same device

## Features

- Three game modes: Local, AI, and Online multiplayer
- Ranked play with ELO rating system
- Adjustable board size (10x10, 15x15, 20x20) for local/AI games
- Three AI difficulty levels:
  - Easy: Makes random moves
  - Medium: Mix of strategic and random moves
  - Hard: Plays strategically, focusing on both attack and defense
- Online multiplayer with room creation and joining
- Real-time game updates using Firebase or Node.js/Socket.IO
- Responsive design for different screen sizes
- Win detection with highlighting
- Turn indicator
- Play again button

## Game Rules

- Players take turns placing their marks on the board.
- The first player to get 5 of their marks in a row (horizontally, vertically, or diagonally) wins.
- If the board is filled without a winner, the game ends in a draw.

## AI Strategy

The AI evaluates the board using the following approach:
- Analyzes potential moves for both offense (its own marks) and defense (blocking the player)
- Considers the number of consecutive marks and open ends
- Prioritizes winning moves and blocking critical player moves
- At harder difficulty levels, makes more strategic decisions

## Online Implementation

The online multiplayer functionality is implemented using Firebase:
- Anonymous authentication for player identification
- Realtime Database for game state synchronization
- Room-based matchmaking system
- Player presence detection
- Real-time game updates across devices

### Firebase Setup
To use the online mode, you need to:

1. Create a Firebase project:
   - Go to [firebase.google.com](https://firebase.google.com) and sign in with a Google account
   - Click "Get started" and then "Add project"
   - Enter a project name like "Caro Game Online" and follow the setup wizard

2. Enable Anonymous Authentication:
   - In your Firebase project console, go to "Authentication" in the left sidebar
   - Click on the "Sign-in method" tab
   - Find "Anonymous" in the list of providers and click on it
   - Toggle the "Enable" switch and click "Save"

3. Set up Realtime Database:
   - In your Firebase project console, go to "Realtime Database" in the left sidebar
   - Click "Create Database"
   - Choose your database location (pick the one closest to your users)
   - Start in "test mode" for development (you can adjust security rules later)

4. Get your Firebase configuration:
   - In your Firebase project console, click on the gear icon next to "Project Overview" in the left sidebar and select "Project settings"
   - Scroll down to the "Your apps" section
   - If you don't have a web app, click on the web icon (</>) to create one
   - Register your app with a nickname like "Caro Game"
   - Copy the Firebase configuration object (the `const firebaseConfig = {...}` part)

5. Update your configuration:
   - Open the `firebase-config.js` file in your code editor
   - Replace the existing `firebaseConfig` object with your own configuration

### Troubleshooting Online Mode

If you see the error "Không thể đăng nhập. Vui lòng thử lại sau." (Cannot login. Please try again later.), check:

1. **Firebase Configuration**: Make sure you've replaced the default Firebase configuration in `firebase-config.js` with your own.

2. **Anonymous Authentication**: Verify that Anonymous Authentication is enabled in your Firebase project.

3. **Internet Connection**: Ensure you have a stable internet connection.

4. **Browser Console**: Check the browser console (F12 or right-click > Inspect > Console) for more specific error messages.

5. **Firebase Quota**: If you're seeing quota errors, your Firebase project might have reached its free tier limits.

## Server-Based Multiplayer Implementation

As an alternative to Firebase, the game also supports a server-based multiplayer implementation using Node.js and Socket.IO:

### Server Setup
1. Make sure Node.js is installed on your computer
2. Run the setup.bat file to install dependencies, or manually run:
   ```
   npm install
   ```
3. Start the server:
   ```
   node server.js
   ```
4. Open http://localhost:3000 in your browser to play
5. For LAN play, other players on your network can connect to your IP address
   
### Features of Server-Based Multiplayer
- Traditional client-server architecture
- Socket.IO for real-time communication
- Persistent player accounts and rankings
- ELO rating system for competitive play
- Protected account security (one device, one account)
- Room-based matchmaking system
- Automatic matchmaking based on skill level

For more detailed server setup instructions, see the SERVER-SETUP.md file.
For troubleshooting help, see the TROUBLESHOOTING.md file.

Enjoy playing! 
