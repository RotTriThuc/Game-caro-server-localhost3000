document.addEventListener('DOMContentLoaded', () => {
    // Game type selection elements
    const gameTypeSelection = document.getElementById('game-type-selection');
    const caroGameBtn = document.getElementById('caro-game-btn');
    const animalChessBtn = document.getElementById('animal-chess-btn');
    
    // Game mode selection elements (Caro)
    const caroGameSelection = document.getElementById('game-selection');
    const backToGameTypesBtn = document.getElementById('back-to-game-types-btn');
    
    // Animal Chess elements
    const animalChessSelection = document.getElementById('animal-chess-selection');
    const animalBackToGameTypesBtn = document.getElementById('animal-back-to-game-types-btn');
    const animalLocalGameBtn = document.getElementById('animal-local-game-btn');
    const animalAiGameBtn = document.getElementById('animal-ai-game-btn');
    const animalOnlineGameBtn = document.getElementById('animal-online-game-btn');
    const animalChessGameContainer = document.getElementById('animal-chess-game-container');
    
    // Animal Chess AI Settings
    let animalChessAiSettings = document.getElementById('animal-chess-ai-settings');
    if (!animalChessAiSettings) {
        animalChessAiSettings = document.createElement('div');
        animalChessAiSettings.id = 'animal-chess-ai-settings';
        animalChessAiSettings.className = 'settings';
        animalChessAiSettings.style.display = 'none';
        animalChessAiSettings.innerHTML = `
            <div class="ai-difficulty">
                <label for="animal-ai-difficulty-select">Độ khó:</label>
                <select id="animal-ai-difficulty-select">
                    <option value="easy">Dễ</option>
                    <option value="medium" selected>Trung bình</option>
                    <option value="hard">Khó</option>
                    <option value="veryhard">Rất khó</option>
                </select>
            </div>
            <button id="start-animal-ai-game-btn" class="start-btn">Bắt đầu</button>
            <div class="back-to-selection">
                <button id="animal-ai-back-btn" class="back-btn">Quay lại</button>
            </div>
        `;
        document.body.appendChild(animalChessAiSettings);
        
        // Thêm sự kiện cho nút quay lại và bắt đầu
        document.getElementById('animal-ai-back-btn').addEventListener('click', () => {
            animalChessAiSettings.style.display = 'none';
            animalChessSelection.style.display = 'block';
        });
        
        document.getElementById('start-animal-ai-game-btn').addEventListener('click', () => {
            const difficulty = document.getElementById('animal-ai-difficulty-select').value;
            startAnimalChessGame('ai', difficulty);
        });
    }
    
    // Animal Chess rules elements
    const animalRulesToggle = document.getElementById('animal-rules-toggle');
    const animalRulesContent = document.getElementById('animal-rules-content');
    
    // Other elements from original game
    const localSettingsSection = document.getElementById('local-settings');
    const onlineSettingsSection = document.getElementById('online-settings');
    const rankedSettingsSection = document.getElementById('ranked-settings');
    const gameBoardContainer = document.getElementById('game-board-container');
    
    // Animal Chess game instance
    let animalChessGame = null;
    
    // Make sure all screens are hidden except game type selection at start
    function initializeScreens() {
        // Show only game type selection at start
        gameTypeSelection.style.display = 'block';
        caroGameSelection.style.display = 'none';
        animalChessSelection.style.display = 'none';
        animalChessGameContainer.style.display = 'none';
        animalChessAiSettings.style.display = 'none';
        
        // Hide all other screens
        if (localSettingsSection) localSettingsSection.style.display = 'none';
        if (onlineSettingsSection) onlineSettingsSection.style.display = 'none';
        if (rankedSettingsSection) rankedSettingsSection.style.display = 'none';
        if (gameBoardContainer) gameBoardContainer.style.display = 'none';
    }
    
    // Initialize screens when page loads
    initializeScreens();
    
    // Event handlers for game type selection
    caroGameBtn.addEventListener('click', () => {
        gameTypeSelection.style.display = 'none';
        caroGameSelection.style.display = 'block';
        animalChessSelection.style.display = 'none';
    });
    
    animalChessBtn.addEventListener('click', () => {
        gameTypeSelection.style.display = 'none';
        caroGameSelection.style.display = 'none';
        animalChessSelection.style.display = 'block';
    });
    
    // Back buttons to return to game type selection
    backToGameTypesBtn.addEventListener('click', () => {
        caroGameSelection.style.display = 'none';
        animalChessSelection.style.display = 'none';
        gameTypeSelection.style.display = 'block';
        
        // Also hide any other screens that might be visible
        if (localSettingsSection) localSettingsSection.style.display = 'none';
        if (onlineSettingsSection) onlineSettingsSection.style.display = 'none';
        if (rankedSettingsSection) rankedSettingsSection.style.display = 'none';
        if (gameBoardContainer) gameBoardContainer.style.display = 'none';
    });
    
    animalBackToGameTypesBtn.addEventListener('click', () => {
        animalChessSelection.style.display = 'none';
        caroGameSelection.style.display = 'none';
        gameTypeSelection.style.display = 'block';
        
        // Also hide any other screens that might be visible
        if (localSettingsSection) localSettingsSection.style.display = 'none';
        if (onlineSettingsSection) onlineSettingsSection.style.display = 'none';
        if (rankedSettingsSection) rankedSettingsSection.style.display = 'none';
        if (gameBoardContainer) gameBoardContainer.style.display = 'none';
        animalChessGameContainer.style.display = 'none';
        animalChessAiSettings.style.display = 'none';
    });
    
    // Toggle Animal Chess rules
    animalRulesToggle.addEventListener('click', () => {
        animalRulesContent.classList.toggle('active');
        const toggleIcon = animalRulesToggle.querySelector('.toggle-icon');
        toggleIcon.classList.toggle('active');
    });
    
    // Handle Animal Chess mode selection
    animalLocalGameBtn.addEventListener('click', () => {
        console.log('Animal Chess: Local game selected');
        startAnimalChessGame('local');
    });
    
    animalAiGameBtn.addEventListener('click', () => {
        console.log('Animal Chess: AI game selected');
        animalChessSelection.style.display = 'none';
        animalChessAiSettings.style.display = 'block';
    });
    
    animalOnlineGameBtn.addEventListener('click', () => {
        console.log('Animal Chess: Online game selected');
        showNotification('Chế độ Online cho Cờ Thú sẽ được phát triển trong tương lai', true);
    });
    
    // Start Animal Chess game
    function startAnimalChessGame(mode, aiDifficulty = 'medium') {
        // Hide selection screens
        animalChessSelection.style.display = 'none';
        animalChessAiSettings.style.display = 'none';
        
        // Show game container
        animalChessGameContainer.style.display = 'block';
        animalChessGameContainer.innerHTML = ''; // Clear previous content
        
        // Initialize new game
        try {
            animalChessGame = new AnimalChess();
            animalChessGame.init('animal-chess-game-container', mode, aiDifficulty);
            console.log(`Animal Chess game initialized successfully in ${mode} mode`);
            
            if (mode === 'ai') {
                showNotification(`Bắt đầu chơi với AI (Độ khó: ${getAIDifficultyText(aiDifficulty)})`);
            }
        } catch (error) {
            console.error('Error initializing Animal Chess game:', error);
            showNotification('Lỗi khởi tạo game Cờ Thú: ' + error.message, true);
            animalChessSelection.style.display = 'block';
            animalChessGameContainer.style.display = 'none';
        }
    }
    
    // Helper function to get text description of AI difficulty
    function getAIDifficultyText(difficulty) {
        switch(difficulty) {
            case 'easy': return 'Dễ';
            case 'medium': return 'Trung bình';
            case 'hard': return 'Khó';
            case 'veryhard': return 'Rất khó';
            default: return 'Trung bình';
        }
    }
    
    // Make showGameSelection function available globally
    window.showGameSelection = function() {
        animalChessGameContainer.style.display = 'none';
        animalChessSelection.style.display = 'block';
    };
    
    // Notification function
    function showNotification(message, isError = false) {
        // Check if notification element exists
        let notification = document.querySelector('.notification');
        
        // Create notification element if it doesn't exist
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        // Set notification content and style
        notification.textContent = message;
        notification.className = 'notification';
        if (isError) {
            notification.classList.add('error');
        }
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}); 