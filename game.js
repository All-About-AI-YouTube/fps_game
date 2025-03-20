import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Scene, camera, and renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Add fog to the scene for atmosphere
scene.fog = new THREE.FogExp2(0x88CCEE, 0.008);
scene.background = new THREE.Color(0x88CCEE); // Match fog color with sky

// Setup lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(30, 50, 30);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 150;
directionalLight.shadow.camera.left = -75;
directionalLight.shadow.camera.right = 75;
directionalLight.shadow.camera.top = 75;
directionalLight.shadow.camera.bottom = -75;
scene.add(directionalLight);

// Create the ground plane (asphalt)
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x333333, 
    side: THREE.DoubleSide,
    roughness: 0.8
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = Math.PI / 2;
plane.receiveShadow = true;
scene.add(plane);

// Create map boundaries - North, South, East, West walls
const wallHeight = 10;
const wallThickness = 1;
const mapSize = 50; // Half the size of the plane

// Wall material
const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513, 
    roughness: 0.7
});

// North Wall
const northWallGeometry = new THREE.BoxGeometry(2 * mapSize, wallHeight, wallThickness);
const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
northWall.position.set(0, wallHeight / 2, -mapSize);
northWall.castShadow = true;
northWall.receiveShadow = true;
scene.add(northWall);

// South Wall
const southWall = northWall.clone();
southWall.position.z = mapSize;
scene.add(southWall);

// East Wall
const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, 2 * mapSize + wallThickness * 2);
const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
eastWall.position.set(mapSize, wallHeight / 2, 0);
eastWall.castShadow = true;
eastWall.receiveShadow = true;
scene.add(eastWall);

// West Wall
const westWall = eastWall.clone();
westWall.position.x = -mapSize;
scene.add(westWall);

// Texture loader for building materials
const textureLoader = new THREE.TextureLoader();

// Create different building materials
const buildingMaterials = [
    new THREE.MeshStandardMaterial({ 
        color: 0x999999, 
        roughness: 0.7 
    }),
    new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, 
        roughness: 0.8 
    }),
    new THREE.MeshStandardMaterial({ 
        color: 0x555555, 
        roughness: 0.6
    }),
    new THREE.MeshStandardMaterial({ 
        color: 0xA5682A, 
        roughness: 0.7
    })
];

// Create window material
const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x88CCFF,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0x114477,
    emissiveIntensity: 0.2
});

// Create a central plaza
const plazaGeometry = new THREE.PlaneGeometry(30, 30);
const plazaMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x777777, 
    side: THREE.DoubleSide,
    roughness: 0.5
});
const plaza = new THREE.Mesh(plazaGeometry, plazaMaterial);
plaza.rotation.x = Math.PI / 2;
plaza.position.y = 0.01; // slightly above ground to prevent z-fighting
plaza.receiveShadow = true;
scene.add(plaza);

// Create buildings with CS-like layout

// Function to create a basic building
function createBuilding(width, height, depth, x, y, z, materialIndex = 0) {
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const building = new THREE.Mesh(buildingGeometry, buildingMaterials[materialIndex % buildingMaterials.length]);
    building.position.set(x, y + height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    return building;
}

// Function to create windows for a building
function addWindows(building, rows, cols, size, depth) {
    const { x, y, z } = building.position;
    const { width, height, depth: buildingDepth } = building.geometry.parameters;
    
    // Add windows to the building
    const windowSize = size;
    const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, depth);
    
    // Calculate spacings for window layout
    const spacingX = width / (cols + 1);
    const spacingY = height / (rows + 1);
    const startX = x - width / 2 + spacingX;
    const startY = y - height / 2 + spacingY;
    
    // Create windows for front facade
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            windowMesh.position.set(
                startX + col * spacingX,
                startY + row * spacingY,
                z + buildingDepth / 2 + depth / 2
            );
            windowMesh.castShadow = true;
            scene.add(windowMesh);
        }
    }
    
    // Create windows for back facade
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            windowMesh.position.set(
                startX + col * spacingX,
                startY + row * spacingY,
                z - buildingDepth / 2 - depth / 2
            );
            windowMesh.castShadow = true;
            scene.add(windowMesh);
        }
    }
}

// Team A spawn area (one side of the map)
const teamASpawn = createBuilding(15, 5, 15, -35, 0, -35, 2);

// Team B spawn area (other side of the map)
const teamBSpawn = createBuilding(15, 5, 15, 35, 0, 35, 2);

// Add a "Bombsite A" building
const bombsiteA = createBuilding(20, 8, 20, -25, 0, 25, 0);
addWindows(bombsiteA, 2, 4, 1.5, 0.1);

// Add a "Bombsite B" building
const bombsiteB = createBuilding(20, 8, 20, 25, 0, -25, 1);
addWindows(bombsiteB, 2, 4, 1.5, 0.1);

// Add central building with multiple entrances (like "mid" in CS maps)
const midBuilding = createBuilding(15, 12, 15, 0, 0, 0, 3);
addWindows(midBuilding, 3, 3, 1.5, 0.1);

// Create a connector building between mid and bombsite A
const connectorA = createBuilding(5, 6, 25, -10, 0, 12.5, 1);

// Create a connector building between mid and bombsite B
const connectorB = createBuilding(5, 6, 25, 10, 0, -12.5, 1);

// Add some cover boxes for tactical gameplay (crates, barrels)
function createCrate(x, y, z, size = 2) {
    const crateGeometry = new THREE.BoxGeometry(size, size, size);
    const crateMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, 
        roughness: 0.9 
    });
    const crate = new THREE.Mesh(crateGeometry, crateMaterial);
    crate.position.set(x, y + size / 2, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
    return crate;
}

// Add strategic cover around the map
// Near bombsite A
createCrate(-30, 0, 15, 2);
createCrate(-20, 0, 15, 2);
createCrate(-25, 0, 10, 3);

// Near bombsite B
createCrate(30, 0, -15, 2);
createCrate(20, 0, -15, 2);
createCrate(25, 0, -10, 3);

// Central area cover
createCrate(-5, 0, -5, 1.5);
createCrate(5, 0, 5, 1.5);
createCrate(0, 0, -10, 2);
createCrate(0, 0, 10, 2);

// Create some stacked crates for vertical gameplay
const stackBase = createCrate(15, 0, 0, 3);
createCrate(15, 3, 0, 2);

const stackBase2 = createCrate(-15, 0, 0, 3);
createCrate(-15, 3, 0, 2);

// Add barriers for additional cover
function createBarrier(x, y, z, width, height, depth, rotation = 0) {
    const barrierGeometry = new THREE.BoxGeometry(width, height, depth);
    const barrierMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555, 
        roughness: 0.8 
    });
    const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier.position.set(x, y + height / 2, z);
    barrier.rotation.y = rotation;
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    scene.add(barrier);
    return barrier;
}

// Add some strategic barriers
createBarrier(-10, 0, -20, 8, 1.5, 0.5, Math.PI / 4);
createBarrier(10, 0, 20, 8, 1.5, 0.5, Math.PI / 4);
createBarrier(0, 0, -15, 6, 1.5, 0.5, 0);
createBarrier(0, 0, 15, 6, 1.5, 0.5, 0);

// Setup controls
const controls = new PointerLockControls(camera, document.body);

// Set initial position to Team A spawn area
camera.position.set(-35, 2, -35);

// Debug overlay for displaying game state
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

// Track game state
const gameState = {
    isDebugMode: false,
    isMovementEnabled: true,
    playerPosition: new THREE.Vector3(-35, 2, -35),
    playerVelocity: new THREE.Vector3(0, 0, 0),
    collisions: 0,
    frameRate: 0,
    lastFrameTime: 0
};

// Toggle debug mode with a key press
document.addEventListener('keydown', (event) => {
    if (event.key === '`' || event.key === '~') { // Backtick key
        gameState.isDebugMode = !gameState.isDebugMode;
        debugOverlay.style.display = gameState.isDebugMode ? 'block' : 'none';
        console.log(`Debug mode: ${gameState.isDebugMode ? 'ON' : 'OFF'}`);
    }
});

// Function to update debug overlay
function updateDebugInfo() {
    if (gameState.isDebugMode) {
        const pos = controls.getObject().position;
        const vel = velocity || new THREE.Vector3();
        
        debugOverlay.innerHTML = `
            <div>FPS: ${gameState.frameRate.toFixed(1)}</div>
            <div>Position: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, z=${pos.z.toFixed(2)}</div>
            <div>Velocity: x=${vel.x.toFixed(4)}, z=${vel.z.toFixed(4)}</div>
            <div>Controls Locked: ${controls.isLocked}</div>
            <div>Collisions: ${gameState.collisions}</div>
            <div>Movement Enabled: ${gameState.isMovementEnabled}</div>
            <div>Collidable Objects: ${collidableObjects.length}</div>
        `;
    }
}

// Create a simple UI for game instructions
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.width = '100%';
instructionsElement.style.height = '100%';
instructionsElement.style.top = '0';
instructionsElement.style.left = '0';
instructionsElement.style.display = 'flex';
instructionsElement.style.flexDirection = 'column';
instructionsElement.style.justifyContent = 'center';
instructionsElement.style.alignItems = 'center';
instructionsElement.style.color = '#ffffff';
instructionsElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
instructionsElement.style.zIndex = '10';
instructionsElement.style.cursor = 'pointer';
instructionsElement.innerHTML = `
    <h1 style="font-family: Arial, sans-serif;">FPS Map Demo</h1>
    <p style="font-family: Arial, sans-serif;">Click to play</p>
    <p style="font-family: Arial, sans-serif;">Move: WASD</p>
    <p style="font-family: Arial, sans-serif;">Look: Mouse</p>
    <p style="font-family: Arial, sans-serif;">Sprint: Shift</p>
    <p style="font-family: Arial, sans-serif;">Debug: ~ (Tilde key)</p>
    <p style="font-family: Arial, sans-serif;">Exit: ESC</p>
`;
document.body.appendChild(instructionsElement);

// Handle click to lock/unlock controls
instructionsElement.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    instructionsElement.style.display = 'none';
    gameState.isMovementEnabled = true;
});

controls.addEventListener('unlock', () => {
    instructionsElement.style.display = 'flex';
    gameState.isMovementEnabled = false;
});

// Movement variables
const moveSpeed = 0.15;
const sprintSpeed = 0.3;
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false
};

// Handle key events for movement
document.addEventListener('keydown', (event) => {
    switch(event.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
        case 'shift': keys.shift = true; break;
    }
});

document.addEventListener('keyup', (event) => {
    switch(event.key.toLowerCase()) {
        case 'w': keys.w = false; break;
        case 'a': keys.a = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
        case 'shift': keys.shift = false; break;
    }
});

// Cache for object bounding boxes
const objectBoundingBoxes = new Map();

// Function to update or get an object's bounding box
function getObjectBoundingBox(object) {
    if (!objectBoundingBoxes.has(object.id)) {
        const box = new THREE.Box3().setFromObject(object);
        objectBoundingBoxes.set(object.id, box);
        return box;
    }
    return objectBoundingBoxes.get(object.id);
}

// Improved collision detection with buildings and objects
function checkCollision(position, objects) {
    // Player bounding box dimensions - smaller for easier navigation
    const playerWidth = 0.6;  // Reduced from 1.0
    const playerHeight = 1.8; // Slightly reduced from 2.0
    const playerDepth = 0.6;  // Reduced from 1.0
    
    // Create a bounding box for the player at the test position
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        position,
        new THREE.Vector3(playerWidth, playerHeight, playerDepth)
    );
    
    // Check for collisions with each object
    for (const object of objects) {
        // Use cached bounding box for better performance
        const objectBox = getObjectBoundingBox(object);
        
        // Check for intersection
        if (playerBox.intersectsBox(objectBox)) {
            return true;
        }
    }
    
    return false;
}

// Handle window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
});

// Separate objects into collidable and non-collidable lists
const collidableObjects = [];

// Add all buildings, barriers, and crates to collidable objects list
scene.children.forEach(object => {
    // Only include mesh objects that are not the ground plane or walls
    if (object.isMesh && 
        object !== plane && 
        object !== plaza &&
        !object.userData.noCollision) {
        collidableObjects.push(object);
    }
});

console.log(`Identified ${collidableObjects.length} collidable objects`);

// Create velocity vector for smoother movement
const velocity = new THREE.Vector3();
const friction = 0.92; // Higher = less friction
const acceleration = 0.01; // Lower = more gradual acceleration

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);
    
    // Calculate FPS for debugging
    if (gameState.isDebugMode) {
        if (gameState.lastFrameTime > 0) {
            const delta = time - gameState.lastFrameTime;
            gameState.frameRate = 1000 / delta;
        }
        gameState.lastFrameTime = time;
    }
    
    // Only process movement when controls are locked
    if (controls.isLocked && gameState.isMovementEnabled) {
        // Apply acceleration based on key presses
        const speed = keys.shift ? sprintSpeed : moveSpeed;
        
        // Get current position before movement
        const position = controls.getObject().position;
        const previousPosition = position.clone();
        
        // Movement flags - default to allowing movement in all directions
        let canMoveForward = true;
        let canMoveBackward = true;
        let canMoveLeft = true;
        let canMoveRight = true;
        
        // Potential next positions for collision checking
        const forwardPos = previousPosition.clone();
        forwardPos.z -= speed * 1.5; // Looking ahead a bit more than movement distance
        
        const backwardPos = previousPosition.clone();
        backwardPos.z += speed * 1.5;
        
        const leftPos = previousPosition.clone();
        leftPos.x -= speed * 1.5;
        
        const rightPos = previousPosition.clone();
        rightPos.x += speed * 1.5;
        
        // Check for collisions in each direction
        canMoveForward = !checkCollision(forwardPos, collidableObjects);
        canMoveBackward = !checkCollision(backwardPos, collidableObjects);
        canMoveLeft = !checkCollision(leftPos, collidableObjects);
        canMoveRight = !checkCollision(rightPos, collidableObjects);
        
        // Track collisions for debugging
        if (!canMoveForward || !canMoveBackward || !canMoveLeft || !canMoveRight) {
            gameState.collisions++;
        }
        
        // Apply movement with collision detection
        if (keys.w && canMoveForward) controls.moveForward(speed);
        if (keys.s && canMoveBackward) controls.moveForward(-speed);
        if (keys.a && canMoveLeft) controls.moveRight(-speed);
        if (keys.d && canMoveRight) controls.moveRight(speed);
        
        // After movement, keep player within map boundaries
        const boundaryPadding = 1;
        
        // Keep player within boundary limits
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
        
        // Update game state tracking
        gameState.playerPosition.copy(position);
    }
    
    // Update debug overlay
    updateDebugInfo();
    
    // Render the scene
    renderer.render(scene, camera);
}

animate();