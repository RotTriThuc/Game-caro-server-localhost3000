// Your Firebase configuration
// Replace these values with your own Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAOPG1SUTcPiMZTWMhXWx-AJZFk1aJXOKI",
    authDomain: "caro-game-online-c40b1.firebaseapp.com",
    databaseURL: "https://caro-game-online-c40b1-default-rtdb.firebaseio.com",
    projectId: "caro-game-online-c40b1",
    storageBucket: "caro-game-online-c40b1.appspot.com",
    messagingSenderId: "334013342398",
    appId: "1:334013342398:web:5c3e5e3d8f2fb6c01b3bdf"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to Firebase services
const auth = firebase.auth();
const database = firebase.database();

// Ensure Anonymous Auth is enabled
auth.onAuthStateChanged(user => {
    if (!user) {
        // If not signed in, try anonymous auth
        auth.signInAnonymously().catch(error => {
            console.error("Anonymous auth error:", error);
            showNotification("Không thể kết nối đến Firebase. Vui lòng kiểm tra cấu hình.", true);
        });
    }
});

// Function to show notification
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

// Generate a random room ID
function generateRoomId() {
    // Generate a 6-character alphanumeric room ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
} 