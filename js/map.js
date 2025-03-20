import * as THREE from 'three';

// Map size constants
const MAP_SIZE = 50; // Half the size of the plane
const WALL_HEIGHT = 10;
const WALL_THICKNESS = 1;

// Create a texture loader for reuse
const textureLoader = new THREE.TextureLoader();

// Preload textures
const wall1Texture = textureLoader.load('/textures/wall1.jpeg');
const wall2Texture = textureLoader.load('/textures/wall2.jpeg');

// Configure texture settings
wall1Texture.wrapS = THREE.RepeatWrapping;
wall1Texture.wrapT = THREE.RepeatWrapping;
wall2Texture.wrapS = THREE.RepeatWrapping;
wall2Texture.wrapT = THREE.RepeatWrapping;

/**
 * Creates the entire map with boundaries and buildings
 */
export function createMap(scene) {
    // Array to store all collidable objects
    const objects = [];
    
    // Create the outer walls
    createMapBoundaries(scene, objects);
    
    // Create large central buildings with pathways
    createCentralStructures(scene, objects);
    
    return {
        mapSize: MAP_SIZE,
        objects
    };
}

/**
 * Creates a building with the given parameters and textures
 */
function createBuilding(scene, objects, width, height, depth, x, y, z, color = 0x999999, roughness = 0.7, useTexture = true) {
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    
    // Determine which texture to use based on a simple alternating pattern
    const texture = (x + z) % 20 === 0 ? wall1Texture : ((x * z) % 2 === 0 ? wall1Texture : wall2Texture);
    
    // Configure texture repeats based on building size
    if (useTexture) {
        // Set texture repeat based on building dimensions
        // Larger buildings need more texture repetition
        texture.repeat.set(
            Math.max(1, width / 5),
            Math.max(1, height / 5)
        );
    }
    
    // Create material with or without texture
    const buildingMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: roughness,
        map: useTexture ? texture : null,
        // Adjust color to be slightly lighter when using textures
        // This prevents the texture from being too dark
        color: useTexture ? new THREE.Color(color).multiplyScalar(1.2) : color
    });
    
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x, y + height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    
    // Cache the bounding box for collision performance
    building.geometry.computeBoundingBox();
    
    scene.add(building);
    objects.push(building);
    return building;
}

/**
 * Creates windows for a building
 */
function addWindows(scene, objects, building, rows, cols, size, depth) {
    const { x, y, z } = building.position;
    const { width, height, depth: buildingDepth } = building.geometry.parameters;
    
    // Window material with emissive properties
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x88CCFF,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x114477,
        emissiveIntensity: 0.2
    });
    
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
            // Mark windows as non-collidable
            windowMesh.userData.noCollision = true;
            scene.add(windowMesh);
            // We still add windows to objects array for rendering, but they won't be used for collision
            objects.push(windowMesh);
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
            // Mark windows as non-collidable
            windowMesh.userData.noCollision = true;
            scene.add(windowMesh);
            objects.push(windowMesh);
        }
    }
}

/**
 * Creates barrier objects for cover with texture
 */
function createBarrier(scene, objects, x, y, z, width, height, depth, color = 0x555555, rotation = 0) {
    const barrierGeometry = new THREE.BoxGeometry(width, height, depth);
    
    // Alternate between the two wall textures based on position
    const texture = (x * z) % 2 === 0 ? wall1Texture : wall2Texture;
    
    // Set texture repeat based on barrier dimensions
    texture.repeat.set(
        Math.max(1, Math.max(width, depth) / 3),
        Math.max(1, height / 2)
    );
    
    const barrierMaterial = new THREE.MeshStandardMaterial({ 
        color: color, 
        roughness: 0.8,
        map: texture
    });
    
    const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier.position.set(x, y + height / 2, z);
    barrier.rotation.y = rotation;
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    
    // Cache the bounding box for collision performance
    barrier.geometry.computeBoundingBox();
    
    scene.add(barrier);
    objects.push(barrier);
    return barrier;
}

/**
 * Creates the main central buildings and structures with strategic pathways
 */
function createCentralStructures(scene, objects) {
    // Building colors
    const colors = [
        0x777777, // Gray
        0x8B4513, // Brown
        0x505050, // Dark gray
        0xA5682A, // Light brown
        0x606060  // Medium gray
    ];
    
    // 1. Large central building complex (not a single massive cube, but an interesting shape)
    // Main part
    const mainBuilding = createBuilding(scene, objects, 20, 15, 16, 0, 0, 0, colors[0]);
    addWindows(scene, objects, mainBuilding, 4, 6, 1.5, 0.1);
    
    // Connected side wing 1
    const sideWing1 = createBuilding(scene, objects, 14, 12, 10, 15, 0, 8, colors[1]);
    addWindows(scene, objects, sideWing1, 3, 4, 1.2, 0.1);
    
    // Connected side wing 2
    const sideWing2 = createBuilding(scene, objects, 14, 10, 10, -15, 0, -8, colors[3]);
    addWindows(scene, objects, sideWing2, 3, 4, 1.2, 0.1);
    
    // Connecting corridor between main and sideWing1
    createBuilding(scene, objects, 10, 6, 6, 7, 0, 4, colors[2]);
    
    // Connecting corridor between main and sideWing2
    createBuilding(scene, objects, 10, 6, 6, -7, 0, -4, colors[4]);
    
    // 2. Two medium buildings creating a street canyon in between
    // North building
    const northBuilding = createBuilding(scene, objects, 15, 12, 15, 0, 0, -25, colors[2]);
    addWindows(scene, objects, northBuilding, 3, 5, 1.3, 0.1);
    
    // South building
    const southBuilding = createBuilding(scene, objects, 15, 12, 15, 0, 0, 25, colors[4]);
    addWindows(scene, objects, southBuilding, 3, 5, 1.3, 0.1);
    
    // 3. East and West buildings
    // East building
    const eastBuilding = createBuilding(scene, objects, 15, 10, 20, 25, 0, 0, colors[3]);
    addWindows(scene, objects, eastBuilding, 3, 4, 1.2, 0.1);
    
    // West building
    const westBuilding = createBuilding(scene, objects, 15, 10, 20, -25, 0, 0, colors[1]);
    addWindows(scene, objects, westBuilding, 3, 4, 1.2, 0.1);
    
    // 4. Add cover barriers strategically along the pathways
    // Central plaza barriers
    createBarrier(scene, objects, 5, 0, 15, 6, 1.5, 1, 0x333333);
    createBarrier(scene, objects, -5, 0, -15, 6, 1.5, 1, 0x333333);
    createBarrier(scene, objects, 12, 0, -12, 1, 1.5, 6, 0x333333, Math.PI / 4);
    createBarrier(scene, objects, -12, 0, 12, 1, 1.5, 6, 0x333333, Math.PI / 4);
    
    // North-south street barriers
    createBarrier(scene, objects, 3, 0, -15, 3, 2, 3, 0x555555);
    createBarrier(scene, objects, -3, 0, 15, 3, 2, 3, 0x555555);
    
    // East-west street barriers
    createBarrier(scene, objects, 15, 0, 3, 3, 2, 3, 0x555555);
    createBarrier(scene, objects, -15, 0, -3, 3, 2, 3, 0x555555);
    
    // Some obstacles in more open areas
    createBarrier(scene, objects, 35, 0, 20, 4, 3, 4, 0x666666);
    createBarrier(scene, objects, -35, 0, -20, 4, 3, 4, 0x666666);
    createBarrier(scene, objects, 35, 0, -20, 4, 3, 4, 0x666666);
    createBarrier(scene, objects, -35, 0, 20, 4, 3, 4, 0x666666);
    
    // 5. Spawn points - clear areas at the far ends of the map
    // Team A spawn - clear area around -45, 0, 0
    const teamASpawn = createBuilding(scene, objects, 8, 6, 8, -45, 0, 0, colors[1]);
    
    // Team B spawn - clear area around 45, 0, 0
    const teamBSpawn = createBuilding(scene, objects, 8, 6, 8, 45, 0, 0, colors[3]);
}

/**
 * Creates the outer walls that define the map boundaries with textures
 */
function createMapBoundaries(scene, objects) {
    // Configure texture for walls
    const boundaryTexture = wall2Texture.clone(); // Use a clone to have separate repeat settings
    boundaryTexture.wrapS = THREE.RepeatWrapping;
    boundaryTexture.wrapT = THREE.RepeatWrapping;
    
    // Set different repeat for each wall direction
    const horizontalWallRepeat = { x: 20, y: 1 };
    const verticalWallRepeat = { x: 1, y: 20 };
    
    // Wall material with texture
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xA08070, // Slightly lighter color to work with the texture
        roughness: 0.8,
        map: boundaryTexture
    });
    
    // North Wall
    const northWallGeometry = new THREE.BoxGeometry(2 * MAP_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    boundaryTexture.repeat.set(horizontalWallRepeat.x, horizontalWallRepeat.y);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial.clone());
    northWall.material.map = boundaryTexture.clone();
    northWall.material.map.repeat.set(horizontalWallRepeat.x, horizontalWallRepeat.y);
    northWall.position.set(0, WALL_HEIGHT / 2, -MAP_SIZE);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    scene.add(northWall);
    objects.push(northWall);
    
    // South Wall
    const southWall = new THREE.Mesh(northWallGeometry, wallMaterial.clone());
    southWall.material.map = boundaryTexture.clone();
    southWall.material.map.repeat.set(horizontalWallRepeat.x, horizontalWallRepeat.y);
    southWall.position.set(0, WALL_HEIGHT / 2, MAP_SIZE);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    scene.add(southWall);
    objects.push(southWall);
    
    // East Wall
    const eastWallGeometry = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, 2 * MAP_SIZE + WALL_THICKNESS * 2);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial.clone());
    eastWall.material.map = boundaryTexture.clone();
    eastWall.material.map.repeat.set(verticalWallRepeat.x, verticalWallRepeat.y);
    eastWall.position.set(MAP_SIZE, WALL_HEIGHT / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    scene.add(eastWall);
    objects.push(eastWall);
    
    // West Wall
    const westWall = new THREE.Mesh(eastWallGeometry, wallMaterial.clone());
    westWall.material.map = boundaryTexture.clone();
    westWall.material.map.repeat.set(verticalWallRepeat.x, verticalWallRepeat.y);
    westWall.position.set(-MAP_SIZE, WALL_HEIGHT / 2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    scene.add(westWall);
    objects.push(westWall);
}

/**
 * Creates different building materials for variety
 */
function createBuildingMaterials() {
    return [
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
}

// Second addWindows function removed to fix duplicate declaration

// createCrate function removed - not used in the current map implementation

/**
 * Creates barriers for additional cover
 * Note: This is the legacy version kept for reference but no longer used
 */
function createBarrierLegacy(scene, objects, x, y, z, width, height, depth, rotation = 0) {
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
    
    // Cache the bounding box for collision performance
    barrier.geometry.computeBoundingBox();
    
    scene.add(barrier);
    objects.push(barrier);
    return barrier;
}

/**
 * Creates all buildings for the map - SIMPLIFIED layout with fewer objects
 * Note: This function is kept for historical reference but is no longer used
 */
function createBuildings(scene, objects) {
    // Use our new createBuilding function with color parameters instead of material indices
    const materials = createBuildingMaterials();
    
    // Team A spawn area (one end of the map) - moved far away for player spawn space
    const teamASpawn = createBuilding(scene, objects, 12, 6, 12, -48, 0, 0, materials[2].color);
    
    // Team B spawn area (other end of the map)
    const teamBSpawn = createBuilding(scene, objects, 12, 6, 12, 48, 0, 0, materials[2].color);
    
    // Central main building - larger single structure
    const centralBuilding = createBuilding(scene, objects, 25, 12, 25, 0, 0, 0, materials[0].color);
    addWindows(scene, objects, centralBuilding, 3, 5, 1.5, 0.1);
    
    // Just two additional landmark buildings for orientation
    const buildingA = createBuilding(scene, objects, 18, 10, 18, -20, 0, 20, materials[1].color);
    addWindows(scene, objects, buildingA, 2, 3, 1.5, 0.1);
    
    const buildingB = createBuilding(scene, objects, 18, 10, 18, 20, 0, -20, materials[3].color);
    addWindows(scene, objects, buildingB, 2, 3, 1.5, 0.1);
}

/**
 * Creates cover objects like crates and barriers
 * Note: This function is kept for historical reference but is no longer used
 */
function createCoverObjects(scene, objects) {
    const materials = createBuildingMaterials();
    
    // Just one large central structure for cover
    const centerBlock = createBuilding(scene, objects, 8, 4, 8, 0, 0, 0, materials[3].color);
    
    // A few strategic large barriers far from spawn
    // Using our active barrier function with the proper parameters
    createBarrier(scene, objects, -30, 0, 15, 15, 3, 1, 0x555555, 0);
    createBarrier(scene, objects, 30, 0, -15, 15, 3, 1, 0x555555, 0);
    
    // Add space between spawn buildings and playing area
    createBarrier(scene, objects, -40, 0, 0, 15, 4, 1, 0x555555, Math.PI / 2);
    createBarrier(scene, objects, 40, 0, 0, 15, 4, 1, 0x555555, Math.PI / 2);
}