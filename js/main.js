import * as THREE from 'three';
import { createScene, createLighting, createGround } from './scene.js';
import { createMap } from './map.js';
import { initControls, setupEventListeners } from './controls.js';
import { setupCollision } from './physics.js';
import { createUI } from './ui.js';
import { setupWeapons } from './weapons.js';
import { setupBot } from './bot.js';
import { setupHealthSystem } from './health.js';
import { setupNetworking } from './network.js';

// Initialize the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Create scene, lighting, and ground
const scene = createScene();
createLighting(scene);
createGround(scene); // We don't need to keep the ground reference

// Build the map (buildings, obstacles)
const { mapSize, objects } = createMap(scene);

// Setup player controls and camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = initControls(camera, document.body);

// Initialize the user interface
const instructionsElement = createUI();
document.body.appendChild(instructionsElement);

// Setup event listeners for keyboard, mouse, window resize
const { 
    keys, 
    moveSpeed, 
    sprintSpeed, 
    jumpForce, 
    gravity, 
    isJumping, 
    jumpVelocity, 
    playerHeight 
} = setupEventListeners(controls, instructionsElement, camera, renderer);

// Initialize player height-related variables
const defaultPlayerY = playerHeight / 2;

// Update camera starting position to Team A spawn
// Team A spawn building is at (-45, 0, 0) so position the player a bit in front of it
camera.position.set(-40, playerHeight / 2, 0);

// Setup collision detection system
const collisionSystem = setupCollision();
collisionSystem.initCollision(objects);

// Setup health system
const healthSystem = setupHealthSystem(scene, camera);

// Setup weapons system
const weaponSystem = setupWeapons(scene, camera, collisionSystem);
weaponSystem.initObjectBoundingBoxes(objects);

// Setup networking system
const networkSystem = setupNetworking(scene, camera, healthSystem);

// Set up multiplayer mode (bot is only used if not enough players)
let useBot = true; // Will be set to false when another player joins

// Create the bot but don't activate it initially in multiplayer
const botSystem = setupBot(scene, objects, camera, collisionSystem, weaponSystem, healthSystem);

// Connect systems together
weaponSystem.setHealthSystem(healthSystem);
weaponSystem.setBotReference(botSystem);
weaponSystem.setNetworkSystem(networkSystem);
networkSystem.setWeaponsSystem(weaponSystem);

// Setup player info UI
const playerCountElement = document.getElementById('playerCount');
const playerTeamElement = document.getElementById('playerTeam');

// Update player info when players join/leave
networkSystem.socket.on('playerInitialized', (playerData) => {
    playerTeamElement.textContent = playerData.team;
});

networkSystem.socket.on('currentPlayers', (players) => {
    const playerCount = Object.keys(players).length;
    playerCountElement.textContent = playerCount;
    
    // Disable bot if we have at least 2 players
    useBot = playerCount < 2;
});

// Verify the starting position is valid and not inside any objects
(function verifyStartPosition() {
    const position = camera.position.clone();
    const collisionResult = collisionSystem.checkCollision(position, objects, playerHeight);
    
    if (collisionResult.collision) {
        console.error("ERROR: Starting position is inside an object! Adjusting position...");
        // Try several positions until we find a safe one
        const testPositions = [
            new THREE.Vector3(-40, playerHeight / 2, 0),
            new THREE.Vector3(-39, playerHeight / 2, 0),
            new THREE.Vector3(-40, playerHeight / 2, 5),
            new THREE.Vector3(-40, playerHeight / 2, -5),
            new THREE.Vector3(-38, playerHeight / 2, 0)
        ];
        
        for (const testPos of testPositions) {
            if (!collisionSystem.checkCollision(testPos, objects, playerHeight).collision) {
                camera.position.copy(testPos);
                console.log(`Found safe position at: ${testPos.x}, ${testPos.y}, ${testPos.z}`);
                return;
            }
        }
        
        // If all test positions failed, use our improved function to find a safe position
        const safePosition = collisionSystem.findSafePosition(camera.position, 15, playerHeight);
        if (safePosition) {
            camera.position.copy(safePosition);
            console.log(`Found safe position using grid search: ${safePosition.x}, ${safePosition.y}, ${safePosition.z}`);
        } else {
            // Last resort, move far away from everything
            camera.position.set(-37, playerHeight / 2, 10);
            console.warn("All position finding methods failed, moved to fallback position");
        }
    } else {
        console.log("Starting position clear of objects");
    }
})();

// Create a debug overlay
const debugOverlay = document.createElement('div');
debugOverlay.style.position = 'absolute';
debugOverlay.style.top = '10px';
debugOverlay.style.left = '10px';
debugOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
debugOverlay.style.color = '#fff';
debugOverlay.style.padding = '10px';
debugOverlay.style.fontFamily = 'monospace';
debugOverlay.style.fontSize = '12px';
debugOverlay.style.zIndex = '100';
debugOverlay.style.display = 'none';
document.body.appendChild(debugOverlay);

// Debug mode flag - press 'P' to toggle debug info
let debugMode = false;
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'p') {
        debugMode = !debugMode;
        debugOverlay.style.display = debugMode ? 'block' : 'none';
        console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
});

// Variables for player physics
let velocity = new THREE.Vector3();
let finalVelocity = new THREE.Vector3();
let verticalVelocity = 0;
let isOnGround = true;

// Game state variables
const gameStartTime = Date.now(); // Track when game started

// Update debug info
function updateDebugInfo() {
    if (debugMode) {
        const position = controls.getObject().position;
        debugOverlay.innerHTML = `
            <div>Position: x=${position.x.toFixed(2)}, y=${position.y.toFixed(2)}, z=${position.z.toFixed(2)}</div>
            <div>Velocity: x=${velocity.x.toFixed(2)}, z=${velocity.z.toFixed(2)}, y=${verticalVelocity.toFixed(2)}</div>
            <div>Final Velocity: x=${finalVelocity.x.toFixed(2)}, z=${finalVelocity.z.toFixed(2)}</div>
            <div>On Ground: ${isOnGround}</div>
            <div>Keys: w=${keys.w}, a=${keys.a}, s=${keys.s}, d=${keys.d}, space=${keys.space}</div>
            <div>Player Height: ${playerHeight}</div>
            <div>Active Arrows: ${weaponSystem.getArrowCount()}</div>
            <div>Player Health: ${healthSystem.getPlayerHealth()}</div>
            <div>Bot Health: ${healthSystem.getBotHealth()}</div>
            <div>Bot State: ${botSystem.getCurrentState ? botSystem.getCurrentState() : 'N/A'}</div>
        `;
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Only process game logic if controls are locked
    if (controls.isLocked) {
        const delta = 1.0; // Fixed time step
        const position = controls.getObject().position;
        
        // Simplified ground and gravity logic
        const groundLevel = playerHeight / 2;
        
        // Apply gravity if in the air
        if (!isOnGround) {
            verticalVelocity -= gravity * delta;
            position.y += verticalVelocity;
            
            // Check if we've landed
            if (position.y <= groundLevel) {
                position.y = groundLevel;
                verticalVelocity = 0;
                isOnGround = true;
            }
        } else {
            // We're on the ground
            verticalVelocity = 0;
            position.y = groundLevel;
            
            // Handle jumping with space key
            if (keys.space) {
                verticalVelocity = jumpForce;
                isOnGround = false;
            }
        }
        
        // Calculate movement direction based on keys
        const currentSpeed = keys.shift ? sprintSpeed : moveSpeed;
        velocity.x = 0;
        velocity.z = 0;
        
        if (keys.w) velocity.z = -currentSpeed;
        if (keys.s) velocity.z = currentSpeed;
        if (keys.a) velocity.x = -currentSpeed;
        if (keys.d) velocity.x = currentSpeed;
        
        // Normalize diagonal movement
        if (velocity.x !== 0 && velocity.z !== 0) {
            velocity.x *= 0.7071; // 1/sqrt(2)
            velocity.z *= 0.7071; // 1/sqrt(2)
        }
        
        // Create a movement vector from velocity
        const moveVector = new THREE.Vector3(velocity.x, 0, velocity.z);
        const moveDistance = moveVector.length();
        
        // If we're trying to move
        if (moveDistance > 0) {
            // Normalize the movement vector
            const moveDirection = moveVector.clone().normalize();
            
            // Use raycasting to predict collisions before they happen
            const collision = collisionSystem.predictCollision(
                position, 
                moveDirection, 
                moveDistance + 0.1, // Check a little further than we're moving
                playerHeight
            );
            
            if (collision.collision) {
                // We're going to hit something - move only up to the safe distance
                if (collision.safeDistance > 0) {
                    // Move the player to the safe position
                    // Calculate how much to move in each axis
                    const safeMove = moveDirection.clone().multiplyScalar(collision.safeDistance);
                    
                    // Apply movement (if any) in each axis
                    if (safeMove.x !== 0) {
                        controls.moveRight(safeMove.x);
                    }
                    if (safeMove.z !== 0) {
                        controls.moveForward(-safeMove.z);
                    }
                }
                // Otherwise we're already too close, don't move
            } else {
                // No collision, apply the full movement
                if (velocity.x !== 0) {
                    controls.moveRight(velocity.x);
                }
                if (velocity.z !== 0) {
                    controls.moveForward(-velocity.z);
                }
            }
        }
        
        // Safety check - if player somehow got inside an object, get them out
        if (collisionSystem.isInsideObject(position, playerHeight)) {
            console.log("Player detected inside object, attempting to fix");
            
            // Try to find a safe position nearby
            const safePosition = collisionSystem.findSafePosition(position, 10, playerHeight);
            if (safePosition) {
                console.log("Found safe position, teleporting player");
                position.copy(safePosition);
            } else {
                console.warn("No safe position found, teleporting to spawn");
                position.set(-40, playerHeight / 2, 0);
            }
        }
        
        // Keep player within map boundaries - ONLY the outer edges of the map
        const boundaryPadding = 1;
        
        // Check for boundary collisions and adjust position ONLY for the map edges
        // These are the absolute limits of the map
        if (position.x < -mapSize + boundaryPadding) {
            position.x = -mapSize + boundaryPadding;
        } else if (position.x > mapSize - boundaryPadding) {
            position.x = mapSize - boundaryPadding;
        }
        
        if (position.z < -mapSize + boundaryPadding) {
            position.z = -mapSize + boundaryPadding;
        } else if (position.z > mapSize - boundaryPadding) {
            position.z = mapSize - boundaryPadding;
        }
        
        // Update arrows
        weaponSystem.updateArrows(objects);
        
        // Update the network system
        networkSystem.update();
        
        // Update AI bot only if not enough players and player is alive
        if (useBot && !healthSystem.isPlayerDead()) {
            botSystem.update();
        }
        
        // Update health system
        healthSystem.update();
        
        // Update debug information
        updateDebugInfo();
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate();