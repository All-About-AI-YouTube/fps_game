import * as THREE from 'three';

/**
 * Setup collision detection for player movement and projectiles
 */
export function setupCollision() {
    // Cached bounding boxes for performance optimization
    const objectBoxes = new Map();
    
    // Initialize raycaster for precise collision detection
    const raycaster = new THREE.Raycaster();
    
    // Define player collision parameters
    const PLAYER_WIDTH = 0.4;  // Player width for collision detection
    const PLAYER_DEPTH = 0.4;  // Player depth for collision detection
    const COLLISION_MARGIN = 0.05; // Small margin to prevent getting stuck
    
    /**
     * Update the cached bounding box for an object
     */
    function updateObjectBox(object) {
        if (object.isMesh && !object.userData.noCollision) {
            // Ensure geometry has computed bounding box
            if (!object.geometry.boundingBox) {
                object.geometry.computeBoundingBox();
            }
            
            // Create bounding box in world space
            const box = new THREE.Box3().setFromObject(object);
            objectBoxes.set(object.id, {
                object: object,
                box: box
            });
        }
    }
    
    /**
     * Initialize collision system - pre-compute all object bounding boxes
     */
    function initCollision(objects) {
        // Clear any existing cached boxes
        objectBoxes.clear();
        
        // Precompute all static object bounding boxes
        for (const object of objects) {
            updateObjectBox(object);
        }
        
        console.log(`Collision system initialized with ${objectBoxes.size} collidable objects`);
    }
    
    /**
     * Check if a position collides with any objects in the scene using bounding boxes
     * Returns detailed collision information
     */
    function checkCollision(position, objects, playerHeight = 1.8) {
        // Create a bounding box for the player at the test position
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            position,
            new THREE.Vector3(PLAYER_WIDTH, playerHeight, PLAYER_DEPTH)
        );
        
        // Check for collisions with each cached object box
        for (const [id, data] of objectBoxes.entries()) {
            if (playerBox.intersectsBox(data.box)) {
                return {
                    collision: true,
                    object: data.object,
                    box: data.box
                };
            }
        }
        
        return { collision: false };
    }
    
    /**
     * Predict collision using raycasting - detects collisions before they happen
     * @param {THREE.Vector3} position - Current position
     * @param {THREE.Vector3} direction - Movement direction (normalized)
     * @param {Number} distance - How far to check
     * @returns {Object} Collision information
     */
    function predictCollision(position, direction, distance, playerHeight = 1.8) {
        // We need to cast rays from multiple points around the player to prevent
        // slipping through cracks or corners
        
        // Offsets for multiple rays (check at player's center, and at corners)
        const offsets = [
            new THREE.Vector3(0, 0, 0), // Center
            new THREE.Vector3(PLAYER_WIDTH/2, 0, 0), // Right
            new THREE.Vector3(-PLAYER_WIDTH/2, 0, 0), // Left
            new THREE.Vector3(0, 0, PLAYER_DEPTH/2), // Front
            new THREE.Vector3(0, 0, -PLAYER_DEPTH/2), // Back
            new THREE.Vector3(PLAYER_WIDTH/2, 0, PLAYER_DEPTH/2), // Front-Right
            new THREE.Vector3(-PLAYER_WIDTH/2, 0, PLAYER_DEPTH/2), // Front-Left
            new THREE.Vector3(PLAYER_WIDTH/2, 0, -PLAYER_DEPTH/2), // Back-Right
            new THREE.Vector3(-PLAYER_WIDTH/2, 0, -PLAYER_DEPTH/2), // Back-Left
        ];
        
        // Get collidable objects only
        const collidableObjects = [];
        for (const [id, data] of objectBoxes.entries()) {
            if (!data.object.userData.noCollision) {
                collidableObjects.push(data.object);
            }
        }
        
        // Check each ray offset for collision
        let closestHit = null;
        let closestDistance = Infinity;
        
        for (const offset of offsets) {
            // Starting position with offset from center
            const rayOrigin = new THREE.Vector3().copy(position).add(offset);
            
            // Setup the raycaster
            raycaster.set(rayOrigin, direction);
            raycaster.far = distance;
            
            // Check for intersections
            const intersects = raycaster.intersectObjects(collidableObjects, false);
            
            if (intersects.length > 0) {
                // Check if this is the closest hit so far
                if (intersects[0].distance < closestDistance) {
                    closestHit = intersects[0];
                    closestDistance = intersects[0].distance;
                }
            }
        }
        
        if (closestHit) {
            // Calculate safe position (slightly before the collision point)
            const safeDistance = Math.max(0, closestDistance - COLLISION_MARGIN);
            const safePosition = new THREE.Vector3()
                .copy(position)
                .add(direction.clone().multiplyScalar(safeDistance));
                
            return {
                collision: true,
                distance: closestDistance,
                safeDistance: safeDistance,
                point: closestHit.point,
                object: closestHit.object,
                normal: closestHit.face ? closestHit.face.normal : null,
                safePosition: safePosition
            };
        }
        
        return { collision: false };
    }
    
    /**
     * Check for collision between a moving object (like an arrow) and scene objects
     * Uses raycasting for more precise detection of fast-moving objects
     */
    function checkRayCollision(startPosition, endPosition, objects, radius = 0.1) {
        // Direction vector from start to end
        const direction = new THREE.Vector3().subVectors(endPosition, startPosition).normalize();
        
        // Distance to check
        const distance = startPosition.distanceTo(endPosition);
        
        // Setup the raycaster
        raycaster.set(startPosition, direction);
        raycaster.far = distance;
        
        // Get collidable objects only
        const collidableObjects = [];
        for (const [id, data] of objectBoxes.entries()) {
            if (!data.object.userData.noCollision) {
                collidableObjects.push(data.object);
            }
        }
        
        // Check for intersections
        const intersects = raycaster.intersectObjects(collidableObjects, false);
        
        if (intersects.length > 0) {
            // Return the first intersection point and the object hit
            return {
                hit: true,
                point: intersects[0].point,
                object: intersects[0].object,
                distance: intersects[0].distance
            };
        }
        
        return { hit: false };
    }
    
    /**
     * Check if player is inside an object (for safety checks)
     * @param {THREE.Vector3} position - Player position to check
     * @param {Number} playerHeight - Height of player
     * @returns {Boolean} True if inside an object
     */
    function isInsideObject(position, playerHeight = 1.8) {
        // Create slightly smaller bounding box to check for complete containment
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            position,
            new THREE.Vector3(PLAYER_WIDTH * 0.9, playerHeight * 0.9, PLAYER_DEPTH * 0.9)
        );
        
        // Check for containment in each object
        for (const [id, data] of objectBoxes.entries()) {
            // If player box intersects with an object box, player might be inside
            if (playerBox.intersectsBox(data.box)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Find a safe position if player is stuck inside an object
     * @param {THREE.Vector3} position - Current player position
     * @param {Number} searchRadius - How far to search for a safe position
     * @returns {THREE.Vector3|null} Safe position or null if none found
     */
    function findSafePosition(position, searchRadius = 10, playerHeight = 1.8) {
        // Test positions in a grid pattern around the current position
        const step = 1; // Step size for grid search
        const positions = [];
        
        // Create test positions in a grid
        for (let x = -searchRadius; x <= searchRadius; x += step) {
            for (let z = -searchRadius; z <= searchRadius; z += step) {
                // Skip positions too far from the center (make it circular)
                if (Math.sqrt(x*x + z*z) > searchRadius) continue;
                
                // Create test position
                const testPos = new THREE.Vector3(
                    position.x + x,
                    playerHeight / 2, // Always on ground
                    position.z + z
                );
                
                // Add to list of positions, sorted by distance from original position
                positions.push({
                    position: testPos,
                    distance: testPos.distanceTo(position)
                });
            }
        }
        
        // Sort positions by distance (closest first)
        positions.sort((a, b) => a.distance - b.distance);
        
        // Test each position
        for (const pos of positions) {
            if (!isInsideObject(pos.position, playerHeight)) {
                return pos.position;
            }
        }
        
        // No safe position found
        return null;
    }
    
    /**
     * Check if the player is on the ground
     * Simplified approach: just check the y position
     */
    function checkGround(position, objects, playerHeight = 1.8) {
        // Simple ground check: just check if y is close to ground level
        const groundLevel = playerHeight / 2;
        const groundThreshold = 0.1; // Tolerance for detecting ground
        
        if (position.y <= groundLevel + groundThreshold) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get all cached object boxes for debugging or other uses
     */
    function getObjectBoxes() {
        return objectBoxes;
    }
    
    // Return the collision functions
    return {
        initCollision,
        checkCollision,
        predictCollision,
        checkRayCollision,
        checkGround,
        getObjectBoxes,
        isInsideObject,
        findSafePosition
    };
}