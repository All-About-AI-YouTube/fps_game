import * as THREE from 'three';

/**
 * Manages health and damage systems for player and bots
 */
export function setupHealthSystem(scene, camera) {
    // Health configuration
    const MAX_PLAYER_HEALTH = 100;
    const MAX_BOT_HEALTH = 100;
    const ARROW_DAMAGE = 25; // Each arrow hit does 25 damage
    
    // Current health values
    let playerHealth = MAX_PLAYER_HEALTH;
    let botHealth = MAX_BOT_HEALTH;
    
    // Track if player or bot is dead
    let playerDead = false;
    let botDead = false;
    
    // Health bar configuration
    const healthBarWidth = 0.6; // Relative to screen width
    const healthBarHeight = 20; // Pixels
    const botHealthDisplayTime = 3000; // How long to show bot health after hit (ms)
    let lastBotHitTime = 0;
    
    // Create DOM elements for health bars
    const playerHealthBar = document.createElement('div');
    playerHealthBar.style.position = 'absolute';
    playerHealthBar.style.bottom = '20px';
    playerHealthBar.style.left = `${(1 - healthBarWidth) / 2 * 100}%`;
    playerHealthBar.style.width = `${healthBarWidth * 100}%`;
    playerHealthBar.style.height = `${healthBarHeight}px`;
    playerHealthBar.style.backgroundColor = '#333';
    playerHealthBar.style.border = '3px solid #777'; // Thicker border
    playerHealthBar.style.borderRadius = '5px';
    playerHealthBar.style.overflow = 'hidden';
    playerHealthBar.style.zIndex = '100';
    playerHealthBar.style.boxShadow = '0 0 10px rgba(0,0,0,0.7)'; // Add shadow for better visibility
    
    // Create a label for player health
    const playerHealthLabel = document.createElement('div');
    playerHealthLabel.style.position = 'absolute';
    playerHealthLabel.style.top = '50%';
    playerHealthLabel.style.left = '10px';
    playerHealthLabel.style.transform = 'translateY(-50%)';
    playerHealthLabel.style.color = 'white';
    playerHealthLabel.style.fontFamily = 'Arial, sans-serif';
    playerHealthLabel.style.fontSize = '14px';
    playerHealthLabel.style.fontWeight = 'bold';
    playerHealthLabel.style.textShadow = '1px 1px 2px black';
    playerHealthLabel.style.zIndex = '101';
    playerHealthLabel.textContent = 'HEALTH: 100';
    
    const playerHealthFill = document.createElement('div');
    playerHealthFill.style.width = '100%';
    playerHealthFill.style.height = '100%';
    playerHealthFill.style.backgroundColor = '#0f0'; // Green
    playerHealthFill.style.transition = 'width 0.2s ease-out'; // Faster transition
    
    playerHealthBar.appendChild(playerHealthFill);
    playerHealthBar.appendChild(playerHealthLabel);
    document.body.appendChild(playerHealthBar);
    
    // Bot health bar (always visible but shows health amount only when bot is hit)
    const botHealthBar = document.createElement('div');
    botHealthBar.style.position = 'absolute';
    botHealthBar.style.top = '20px';
    botHealthBar.style.left = `${(1 - healthBarWidth) / 2 * 100}%`;
    botHealthBar.style.width = `${healthBarWidth * 100}%`;
    botHealthBar.style.height = `${healthBarHeight}px`;
    botHealthBar.style.backgroundColor = '#333';
    botHealthBar.style.border = '3px solid #777'; // Thicker border
    botHealthBar.style.borderRadius = '5px';
    botHealthBar.style.overflow = 'hidden';
    botHealthBar.style.zIndex = '100';
    botHealthBar.style.boxShadow = '0 0 10px rgba(0,0,0,0.7)'; // Add shadow for better visibility
    
    // Create a label for bot health
    const botHealthLabel = document.createElement('div');
    botHealthLabel.style.position = 'absolute';
    botHealthLabel.style.top = '50%';
    botHealthLabel.style.right = '10px'; // Right aligned
    botHealthLabel.style.transform = 'translateY(-50%)';
    botHealthLabel.style.color = 'white';
    botHealthLabel.style.fontFamily = 'Arial, sans-serif';
    botHealthLabel.style.fontSize = '14px';
    botHealthLabel.style.fontWeight = 'bold';
    botHealthLabel.style.textShadow = '1px 1px 2px black';
    botHealthLabel.style.zIndex = '101';
    botHealthLabel.style.opacity = '0'; // Start hidden
    botHealthLabel.style.transition = 'opacity 0.5s ease-out';
    botHealthLabel.textContent = 'ENEMY: 100';
    
    const botHealthFill = document.createElement('div');
    botHealthFill.style.width = '100%';
    botHealthFill.style.height = '100%';
    botHealthFill.style.backgroundColor = '#f00'; // Red
    botHealthFill.style.transition = 'width 0.2s ease-out'; // Faster transition
    
    botHealthBar.appendChild(botHealthFill);
    botHealthBar.appendChild(botHealthLabel);
    document.body.appendChild(botHealthBar);
    
    // Add a game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.style.position = 'absolute';
    gameOverScreen.style.top = '0';
    gameOverScreen.style.left = '0';
    gameOverScreen.style.width = '100%';
    gameOverScreen.style.height = '100%';
    gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameOverScreen.style.color = 'white';
    gameOverScreen.style.display = 'flex';
    gameOverScreen.style.flexDirection = 'column';
    gameOverScreen.style.justifyContent = 'center';
    gameOverScreen.style.alignItems = 'center';
    gameOverScreen.style.fontSize = '3rem';
    gameOverScreen.style.fontFamily = 'Arial, sans-serif';
    gameOverScreen.style.zIndex = '200';
    gameOverScreen.style.display = 'none';
    
    const gameOverText = document.createElement('h1');
    gameOverText.id = 'gameOverText';
    gameOverText.textContent = '';
    gameOverScreen.appendChild(gameOverText);
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Restart Game';
    restartButton.style.padding = '15px 30px';
    restartButton.style.fontSize = '1.5rem';
    restartButton.style.marginTop = '30px';
    restartButton.style.backgroundColor = '#4CAF50';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    restartButton.addEventListener('click', restartGame);
    gameOverScreen.appendChild(restartButton);
    
    document.body.appendChild(gameOverScreen);
    
    /**
     * Update the health bar visuals
     */
    function updateHealthBars() {
        // Update player health bar
        playerHealthFill.style.width = `${(playerHealth / MAX_PLAYER_HEALTH) * 100}%`;
        playerHealthLabel.textContent = `HEALTH: ${playerHealth}`;
        
        // Health color changes with amount (green -> yellow -> red)
        const playerHealthPercent = playerHealth / MAX_PLAYER_HEALTH;
        if (playerHealthPercent > 0.6) {
            playerHealthFill.style.backgroundColor = '#0f0'; // Green
        } else if (playerHealthPercent > 0.3) {
            playerHealthFill.style.backgroundColor = '#ff0'; // Yellow
            // Add pulsing effect when health is getting low
            playerHealthFill.style.animation = 'none';
        } else {
            playerHealthFill.style.backgroundColor = '#f00'; // Red
            // Add urgent pulsing effect when health is critical
            playerHealthFill.style.animation = 'pulse 1s infinite';
        }
        
        // Update bot health bar
        botHealthFill.style.width = `${(botHealth / MAX_BOT_HEALTH) * 100}%`;
        botHealthLabel.textContent = `ENEMY: ${botHealth}`;
        
        // Show bot health bar and label if hit recently
        const now = Date.now();
        if (now - lastBotHitTime < botHealthDisplayTime) {
            botHealthBar.style.opacity = '1';
            botHealthLabel.style.opacity = '1';
        } else {
            // Keep the bar visible but make label transparent when not recently hit
            botHealthBar.style.opacity = '0.7';
            botHealthLabel.style.opacity = '0';
        }
    }
    
    /**
     * Damage the player
     */
    function damagePlayer(amount) {
        if (playerDead) return;
        
        playerHealth -= amount;
        
        // Apply screen damage effect
        applyDamageEffect();
        
        // Play damage sound
        try {
            const damageSound = new Audio('/sounds/arrow.mp3'); // Use arrow sound as damage sound
            damageSound.volume = 0.3;
            damageSound.play();
        } catch (error) {
            console.warn('Damage sound not available', error);
        }
        
        // Check for death
        if (playerHealth <= 0) {
            playerHealth = 0;
            playerDead = true;
            gameOver(false); // Player lost
        }
        
        updateHealthBars();
    }
    
    /**
     * Damage the bot
     */
    function damageBot(amount, botObject) {
        if (botDead) return;
        
        botHealth -= amount;
        lastBotHitTime = Date.now();
        
        // Play hit marker sound
        try {
            const hitSound = new Audio('/sounds/arrow.mp3'); // Use arrow sound as hit sound
            hitSound.volume = 0.3;
            hitSound.play();
        } catch (error) {
            console.warn('Hit sound not available', error);
        }
        
        // Check for bot death
        if (botHealth <= 0) {
            botHealth = 0;
            botDead = true;
            
            // Hide bot object if provided
            if (botObject) {
                botObject.visible = false;
            }
            
            gameOver(true); // Player won
        }
        
        updateHealthBars();
    }
    
    // Add pulse animation style for health bars
    const pulseStyle = document.createElement('style');
    pulseStyle.textContent = `
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(pulseStyle);
    
    /**
     * Apply a screen damage effect when player is hit
     */
    function applyDamageEffect() {
        // Create a red flash effect
        const flashOverlay = document.createElement('div');
        flashOverlay.style.position = 'absolute';
        flashOverlay.style.top = '0';
        flashOverlay.style.left = '0';
        flashOverlay.style.width = '100%';
        flashOverlay.style.height = '100%';
        flashOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'; // More intense red
        flashOverlay.style.pointerEvents = 'none';
        flashOverlay.style.zIndex = '100';
        flashOverlay.style.opacity = '1';
        flashOverlay.style.transition = 'opacity 0.5s ease-out';
        
        // Add a blood spatter effect to the edges of the screen
        const bloodPattern = document.createElement('div');
        bloodPattern.style.position = 'absolute';
        bloodPattern.style.top = '0';
        bloodPattern.style.left = '0';
        bloodPattern.style.width = '100%';
        bloodPattern.style.height = '100%';
        bloodPattern.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0.5)';
        bloodPattern.style.pointerEvents = 'none';
        bloodPattern.style.zIndex = '99';
        bloodPattern.style.opacity = '1';
        bloodPattern.style.transition = 'opacity 1.2s ease-out';
        
        document.body.appendChild(flashOverlay);
        document.body.appendChild(bloodPattern);
        
        // Shake the screen slightly
        const camera = document.querySelector('canvas'); // Get the canvas
        if (camera) {
            camera.style.transition = 'transform 0.1s';
            camera.style.transform = 'translateX(10px)';
            
            setTimeout(() => {
                camera.style.transform = 'translateX(-8px)';
                setTimeout(() => {
                    camera.style.transform = 'translateX(5px)';
                    setTimeout(() => {
                        camera.style.transform = 'translateX(0)';
                    }, 50);
                }, 50);
            }, 50);
        }
        
        // Fade out and remove the flash effect
        setTimeout(() => {
            flashOverlay.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(flashOverlay);
            }, 500);
        }, 100);
        
        // Fade out and remove the blood pattern effect more slowly
        setTimeout(() => {
            bloodPattern.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(bloodPattern);
            }, 1200);
        }, 400);
    }
    
    /**
     * Game over handler
     */
    function gameOver(playerWon) {
        const gameOverText = document.getElementById('gameOverText');
        if (playerWon) {
            gameOverText.textContent = 'You Win!';
            gameOverText.style.color = '#4CAF50'; // Green
        } else {
            gameOverText.textContent = 'Game Over';
            gameOverText.style.color = '#f44336'; // Red
        }
        
        gameOverScreen.style.display = 'flex';
    }
    
    /**
     * Restart the game
     */
    function restartGame() {
        // Reset health values
        playerHealth = MAX_PLAYER_HEALTH;
        botHealth = MAX_BOT_HEALTH;
        playerDead = false;
        botDead = false;
        
        // Hide game over screen
        gameOverScreen.style.display = 'none';
        
        // Reload the page to restart
        window.location.reload();
    }
    
    // Update health bars initially
    updateHealthBars();
    
    return {
        damagePlayer,
        damageBot,
        isPlayerDead: () => playerDead,
        isBotDead: () => botDead,
        getPlayerHealth: () => playerHealth,
        getBotHealth: () => botHealth,
        update: updateHealthBars
    };
}