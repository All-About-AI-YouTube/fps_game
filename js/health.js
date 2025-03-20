import * as THREE from 'three';

/**
 * Manages health and damage systems for players in multiplayer
 */
export function setupHealthSystem(scene, camera) {
    // Health configuration
    const MAX_HEALTH = 100;
    const ARROW_DAMAGE = 25; // Each arrow hit does 25 damage
    
    // Current health values
    let playerHealth = MAX_HEALTH;
    let opponentHealth = MAX_HEALTH;
    
    // Track if player is dead
    let playerDead = false;
    
    // Health bar configuration
    const healthBarWidth = 0.6; // Relative to screen width
    const healthBarHeight = 20; // Pixels
    
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
    
    // Opponent health bar (always visible in multiplayer)
    const opponentHealthBar = document.createElement('div');
    opponentHealthBar.style.position = 'absolute';
    opponentHealthBar.style.top = '20px';
    opponentHealthBar.style.left = `${(1 - healthBarWidth) / 2 * 100}%`;
    opponentHealthBar.style.width = `${healthBarWidth * 100}%`;
    opponentHealthBar.style.height = `${healthBarHeight}px`;
    opponentHealthBar.style.backgroundColor = '#333';
    opponentHealthBar.style.border = '3px solid #777'; // Thicker border
    opponentHealthBar.style.borderRadius = '5px';
    opponentHealthBar.style.overflow = 'hidden';
    opponentHealthBar.style.zIndex = '100';
    opponentHealthBar.style.boxShadow = '0 0 10px rgba(0,0,0,0.7)'; // Add shadow for better visibility
    
    // Create a label for opponent health
    const opponentHealthLabel = document.createElement('div');
    opponentHealthLabel.style.position = 'absolute';
    opponentHealthLabel.style.top = '50%';
    opponentHealthLabel.style.right = '10px'; // Right aligned
    opponentHealthLabel.style.transform = 'translateY(-50%)';
    opponentHealthLabel.style.color = 'white';
    opponentHealthLabel.style.fontFamily = 'Arial, sans-serif';
    opponentHealthLabel.style.fontSize = '14px';
    opponentHealthLabel.style.fontWeight = 'bold';
    opponentHealthLabel.style.textShadow = '1px 1px 2px black';
    opponentHealthLabel.style.zIndex = '101';
    opponentHealthLabel.textContent = 'ENEMY: 100';
    
    const opponentHealthFill = document.createElement('div');
    opponentHealthFill.style.width = '100%';
    opponentHealthFill.style.height = '100%';
    opponentHealthFill.style.backgroundColor = '#f00'; // Red
    opponentHealthFill.style.transition = 'width 0.2s ease-out'; // Faster transition
    
    opponentHealthBar.appendChild(opponentHealthFill);
    opponentHealthBar.appendChild(opponentHealthLabel);
    document.body.appendChild(opponentHealthBar);
    
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
        playerHealthFill.style.width = `${(playerHealth / MAX_HEALTH) * 100}%`;
        playerHealthLabel.textContent = `HEALTH: ${playerHealth}`;
        
        // Health color changes with amount (green -> yellow -> red)
        const playerHealthPercent = playerHealth / MAX_HEALTH;
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
        
        // Update opponent health bar
        opponentHealthFill.style.width = `${(opponentHealth / MAX_HEALTH) * 100}%`;
        opponentHealthLabel.textContent = `ENEMY: ${opponentHealth}`;
    }
    
    /**
     * Damage the player
     * @param {number} amount - The amount to subtract from health (or 0 for exact health set)
     * @param {number} exactHealth - Optional exact health value to set (from server)
     */
    function damagePlayer(amount, exactHealth = null) {
        if (playerDead) return;
        
        // If exactHealth is provided, set health to that value (from server sync)
        if (exactHealth !== null) {
            playerHealth = exactHealth;
        } else {
            // Otherwise subtract damage amount
            playerHealth -= amount;
            
            // Only apply damage effects when actually taking damage
            if (amount > 0) {
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
            }
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
     * Update opponent health
     */
    function updateOpponentHealth(health) {
        opponentHealth = health;
        
        // If opponent is dead, show win screen
        if (opponentHealth <= 0 && !playerDead) {
            opponentHealth = 0;
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
        updateOpponentHealth,
        isPlayerDead: () => playerDead,
        getPlayerHealth: () => playerHealth,
        getOpponentHealth: () => opponentHealth,
        update: updateHealthBars
    };
}