import * as THREE from 'three';
import { setupLobby } from './lobby.js';

/**
 * Setup the networking system for multiplayer functionality
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Camera} camera - The player's camera
 * @param {Object} healthSystem - Reference to the health system
 * @returns {Object} - The networking system functions
 */
export function setupNetworking(scene, camera, healthSystem) {
    console.log('Setting up networking system');
    
    // Connect to Socket.io server
    // During local development, you might use something like 'http://localhost:3000'
    // For production, use the deployed URL or just '' to connect to the same host
    const socket = io('');
    
    // Initialize the lobby/matchmaking system
    const lobby = setupLobby(socket);
    
    // Store references to other players in the game
    const remotePlayers = {};
    
    // Reference to the weapons system (will be set later)
    let weaponsSystem = null;
    
    // Game state
    let inGame = false;
    
    // Listen for own player initialization
    socket.on('playerInitialized', (playerData) => {
        console.log('Player initialized:', playerData);
        
        // Update UI with player team
        const playerTeamElement = document.getElementById('playerTeam');
        if (playerTeamElement) {
            playerTeamElement.textContent = playerData.team;
        }
        
        // Mark as in game
        inGame = true;
    });
    
    // Listen for new players joining
    socket.on('playerJoined', (playerData) => {
        console.log('New player joined:', playerData);
        createRemotePlayer(playerData);
        
        // Update player count in UI
        updatePlayerCountUI();
    });
    
    // Initialize all current players when joining
    socket.on('currentPlayers', (players) => {
        console.log('Current players:', players);
        
        // Create remote players for each existing player (except self)
        Object.values(players).forEach(player => {
            if (player.id !== socket.id) {
                createRemotePlayer(player);
            }
        });
        
        // Update player count in UI
        updatePlayerCountUI();
    });
    
    // Listen for player movements
    socket.on('playerMoved', (moveData) => {
        if (remotePlayers[moveData.id]) {
            const player = remotePlayers[moveData.id];
            
            // Update position (smoothly)
            const newPosition = new THREE.Vector3(
                moveData.position[0],
                moveData.position[1],
                moveData.position[2]
            );
            
            // For now, direct update - later we can add movement interpolation
            player.position.copy(newPosition);
            
            // Update rotation
            player.rotation.y = moveData.rotation;
        }
    });
    
    // Listen for arrow shots from other players
    socket.on('playerShoot', (arrowData) => {
        console.log('Remote player shot arrow:', arrowData);
        
        if (weaponsSystem) {
            // Create start position and direction vectors from the data
            const startPosition = new THREE.Vector3(
                arrowData.position[0],
                arrowData.position[1],
                arrowData.position[2]
            );
            
            const direction = new THREE.Vector3(
                arrowData.direction[0],
                arrowData.direction[1],
                arrowData.direction[2]
            );
            
            // Fire an arrow from the other player (marked as enemy, from network)
            weaponsSystem.fireArrow(startPosition, direction, true, true);
        }
    });
    
    // Listen for player disconnections
    socket.on('playerLeft', (playerId) => {
        console.log('Player left:', playerId);
        
        if (remotePlayers[playerId]) {
            // Remove the player's 3D object from the scene
            scene.remove(remotePlayers[playerId]);
            
            // Remove from our local tracking
            delete remotePlayers[playerId];
            
            // Update player count in UI
            updatePlayerCountUI();
        }
    });
    
    // Listen for game ended
    socket.on('gameEnded', (data) => {
        console.log('Game ended:', data);
        
        // Clear all remote players
        Object.keys(remotePlayers).forEach(playerId => {
            scene.remove(remotePlayers[playerId]);
            delete remotePlayers[playerId];
        });
        
        // Reset game state
        inGame = false;
    });
    
    // Listen for health updates from server
    socket.on('healthUpdate', (data) => {
        // If it's our health being updated
        if (data.id === socket.id && healthSystem) {
            healthSystem.setPlayerHealth(data.health);
        }
    });
    
    // Listen for player death
    socket.on('playerDeath', (data) => {
        console.log('Player death:', data);
        
        // If it's our death
        if (data.id === socket.id && healthSystem) {
            healthSystem.playerDeath();
        }
        
        // If it's another player's death
        if (remotePlayers[data.id]) {
            // You could add death animation or effects here
            // For now, just hide the player
            remotePlayers[data.id].visible = false;
        }
    });
    
    // Helper function to update the player count UI
    function updatePlayerCountUI() {
        const playerCountElement = document.getElementById('playerCount');
        if (playerCountElement) {
            playerCountElement.textContent = Object.keys(remotePlayers).length + 1; // +1 for self
        }
    }
    
    // Create a visual representation of another player
    function createRemotePlayer(playerData) {
        console.log('Creating remote player:', playerData);
        
        // Create a group to hold the player model
        const playerGroup = new THREE.Group();
        
        // Create a simple visual model for the player
        // Body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: playerData.team === 'A' ? 0x2288ff : 0xff4422 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        playerGroup.add(body);
        
        // Head (sphere)
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: playerData.team === 'A' ? 0x2288ff : 0xff4422
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.45;
        playerGroup.add(head);
        
        // Position the player
        playerGroup.position.set(
            playerData.position[0],
            playerData.position[1],
            playerData.position[2]
        );
        
        // Store the player's ID and team
        playerGroup.userData.id = playerData.id;
        playerGroup.userData.team = playerData.team;
        playerGroup.userData.health = playerData.health;
        
        // Add to scene and store reference
        scene.add(playerGroup);
        remotePlayers[playerData.id] = playerGroup;
        
        return playerGroup;
    }
    
    // Join the game - this will be called after matchmaking is complete
    function joinGame() {
        socket.emit('playerJoin', {
            position: [camera.position.x, camera.position.y, camera.position.z],
            rotation: camera.rotation.y
        });
    }
    
    // Listen for game start from matchmaking
    socket.on('gameStart', () => {
        // Join the game once we're matched and ready to start
        joinGame();
    });
    
    // Function to update server with player's position
    function updatePosition() {
        socket.emit('playerMove', {
            position: [camera.position.x, camera.position.y, camera.position.z],
            rotation: camera.rotation.y
        });
    }
    
    // Function to set the weapons system reference
    function setWeaponsSystem(weapons) {
        weaponsSystem = weapons;
    }
    
    // Function to emit a player hit to the server
    function emitPlayerHit(targetId, damage) {
        if (inGame) {
            socket.emit('playerHit', {
                targetId,
                damage
            });
        }
    }
    
    // Return the networking system API
    return {
        socket,
        remotePlayers,
        update: updatePosition,
        getPlayerId: () => socket.id,
        setWeaponsSystem,
        emitPlayerHit,
        isInGame: () => inGame,
        lobby
    };
}