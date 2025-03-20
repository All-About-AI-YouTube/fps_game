import * as THREE from 'three';

/**
 * Manages weapons, projectiles, and shooting mechanics
 */
export function setupWeapons(scene, camera, collisionSystem) {
    // Arrow properties
    const arrowSpeed = 3.0; // Even faster since we're using straight-line movement
    const arrowSize = 0.1;
    const arrowLength = 0.5;
    
    // Array to store active arrows
    const arrows = [];
    
    // Initialize raycaster for precise collision detection
    const raycaster = new THREE.Raycaster();
    
    // Cache for object bounding boxes to improve performance
    const objectBoxesCache = new Map();
    
    // Create arrow model (simple cylinder with cone tip)
    function createArrow(isEnemy = false) {
        // Arrow shaft (cylinder)
        const shaftGeometry = new THREE.CylinderGeometry(arrowSize * 0.3, arrowSize * 0.3, arrowLength, 8);
        const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown wood color
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        
        // Arrow head (cone)
        const headGeometry = new THREE.ConeGeometry(arrowSize, arrowLength * 0.3, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x7A7A7A }); // Grey metal color
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = arrowLength / 2 + arrowLength * 0.15;
        
        // Arrow fletching (small flat boxes)
        const fletchingGeometry = new THREE.BoxGeometry(arrowSize * 1.2, arrowLength * 0.2, arrowSize * 0.1);
        // Different fletching color for enemy arrows
        const fletchingColor = isEnemy ? 0x0000FF : 0xFF0000; // Blue for enemy, Red for player
        const fletchingMaterial = new THREE.MeshStandardMaterial({ color: fletchingColor });
        
        const fletching1 = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
        fletching1.position.y = -arrowLength / 2 + arrowLength * 0.15;
        
        const fletching2 = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
        fletching2.position.y = -arrowLength / 2 + arrowLength * 0.15;
        fletching2.rotation.y = Math.PI / 2;
        
        // Group all parts together
        const arrowGroup = new THREE.Group();
        arrowGroup.add(shaft);
        arrowGroup.add(head);
        arrowGroup.add(fletching1);
        arrowGroup.add(fletching2);
        
        // Rotate to point forward (since cylinders are vertical by default)
        arrowGroup.rotation.x = Math.PI / 2;
        
        // Create a bounding box for the arrow (for debugging)
        arrowGroup.userData.boundingBox = new THREE.Box3();
        
        // Flag to indicate if it's an enemy arrow
        arrowGroup.userData.isEnemy = isEnemy;
        
        return arrowGroup;
    }
    
    // Function to fire an arrow
    function fireArrow(customStartPosition = null, customDirection = null, isEnemy = false) {
        // Create arrow and add to scene
        const arrow = createArrow(isEnemy);
        scene.add(arrow);
        
        let startPosition, arrowDirection;
        
        if (customStartPosition && customDirection) {
            // Use custom position and direction (for enemy)
            startPosition = customStartPosition.clone();
            arrowDirection = customDirection.clone().normalize();
        } else {
            // Use player camera (default)
            arrowDirection = new THREE.Vector3();
            camera.getWorldDirection(arrowDirection);
            
            // Start position: slightly in front of camera
            startPosition = new THREE.Vector3();
            startPosition.copy(camera.position);
            startPosition.add(arrowDirection.multiplyScalar(0.8)); // Moved further forward to avoid camera intersections
            startPosition.y -= 0.2; // Slightly below eye level
        }
        
        arrow.position.copy(startPosition);
        
        // Set arrow direction
        arrow.lookAt(
            startPosition.x + arrowDirection.x,
            startPosition.y + arrowDirection.y,
            startPosition.z + arrowDirection.z
        );
        
        // Play arrow sound if available
        try {
            const arrowSound = new Audio('/sounds/arrow.mp3');
            arrowSound.volume = 0.5;
            arrowSound.play();
        } catch (error) {
            console.warn('Arrow sound not available', error);
        }
        
        // Store arrow info for updating
        arrows.push({
            mesh: arrow,
            velocity: arrowDirection.normalize().multiplyScalar(arrowSpeed),
            active: true,
            createdAt: Date.now(),
            lastPosition: startPosition.clone(), // Store the last position for ray casting
            isEnemy: isEnemy
        });
    }
    
    // Mouse event listener for shooting
    let canShoot = true;
    const shootCooldown = 500; // Cooldown in milliseconds
    
    function setupShootingControls() {
        // Track when we can shoot next
        let nextShootTime = 0;
        
        // Left mouse click to shoot
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left mouse button
                const now = Date.now();
                if (now >= nextShootTime) {
                    fireArrow();
                    nextShootTime = now + shootCooldown;
                }
            }
        });
    }
    
    // Initialize bounding boxes for objects - called once on setup
    function initObjectBoundingBoxes(objects) {
        objectBoxesCache.clear();
        
        for (const object of objects) {
            if (object.isMesh && !object.userData.noCollision) {
                // Pre-compute the bounding box
                if (!object.geometry.boundingBox) {
                    object.geometry.computeBoundingBox();
                }
                objectBoxesCache.set(object.id, object);
            }
        }
        
        console.log(`Initialized ${objectBoxesCache.size} object bounding boxes for arrow collisions`);
    }
    
    // References to other systems
    let healthSystem = null;
    let botReference = null;
    
    /**
     * Set the health system for damage calculation
     */
    function setHealthSystem(health) {
        healthSystem = health;
    }
    
    /**
     * Set the bot reference for detecting hits
     */
    function setBotReference(bot) {
        botReference = bot;
    }
    
    // Check collision using the improved physics system's raycaster for precise detection
    function checkArrowCollision(arrow, objects) {
        const arrowDirection = arrow.velocity.clone().normalize();
        const arrowPosition = arrow.mesh.position.clone();
        const lastPosition = arrow.lastPosition;
        
        // Special check for player hit by enemy arrow
        if (arrow.isEnemy && healthSystem) {
            // Get player camera position
            const playerPosition = camera.position.clone();
            
            // Create a much larger bounding box for the player (significantly increased for easier hit detection)
            const playerBox = new THREE.Box3().setFromCenterAndSize(
                playerPosition,
                new THREE.Vector3(1.5, 2.5, 1.5) // Much larger hit box to make hits easier
            );
            
            // Check if current arrow position is inside player box
            if (playerBox.containsPoint(arrowPosition)) {
                // Player hit by enemy arrow!
                healthSystem.damagePlayer(25);
                
                // Remove the arrow
                scene.remove(arrow.mesh);
                arrow.active = false;
                
                console.log("Player hit by enemy arrow!");
                return true;
            }
            
            // Add a simple distance-based check as well (easier to hit)
            const distanceToPlayer = arrowPosition.distanceTo(playerPosition);
            if (distanceToPlayer < 1.5) { // Simple proximity check (very forgiving)
                // Player hit by enemy arrow with proximity check!
                healthSystem.damagePlayer(25);
                
                // Remove the arrow
                scene.remove(arrow.mesh);
                arrow.active = false;
                
                console.log("Player hit by enemy arrow with proximity check!");
                return true;
            }
            
            // Also check if the arrow traveled through the player between frames
            // by casting a ray from the last position to the current position
            const rayDirection = new THREE.Vector3().subVectors(arrowPosition, lastPosition).normalize();
            const rayDistance = lastPosition.distanceTo(arrowPosition);
            
            // Check if arrow passes close to player with the proximity function
            if (checkArrowProximity(lastPosition, arrowPosition, playerPosition, 2.0)) {
                // Player hit by enemy arrow with proximity path check!
                healthSystem.damagePlayer(25);
                
                // Remove the arrow
                scene.remove(arrow.mesh);
                arrow.active = false;
                
                console.log("Player hit by enemy arrow with proximity path check!");
                return true;
            }
            
            // If the arrow moved significantly, check for ray intersection
            if (rayDistance > 0.1) {
                raycaster.set(lastPosition, rayDirection);
                raycaster.far = rayDistance;
                
                // Create a much larger temporary box for the player
                const playerSize = new THREE.Vector3(1.5, 2.5, 1.5); // Match the size from above
                const tempPlayerBox = new THREE.Box3().setFromCenterAndSize(playerPosition, playerSize);
                
                // Check if the ray intersects with the player box
                // We'll use a simplified approach by checking the six faces of the box
                const boxMin = tempPlayerBox.min;
                const boxMax = tempPlayerBox.max;
                
                // Construct simple planes for each face of the box
                const faces = [
                    // Front face (normal: -Z)
                    { point: new THREE.Vector3(boxMin.x, boxMin.y, boxMin.z), normal: new THREE.Vector3(0, 0, -1) },
                    // Back face (normal: +Z)
                    { point: new THREE.Vector3(boxMin.x, boxMin.y, boxMax.z), normal: new THREE.Vector3(0, 0, 1) },
                    // Left face (normal: -X)
                    { point: new THREE.Vector3(boxMin.x, boxMin.y, boxMin.z), normal: new THREE.Vector3(-1, 0, 0) },
                    // Right face (normal: +X)
                    { point: new THREE.Vector3(boxMax.x, boxMin.y, boxMin.z), normal: new THREE.Vector3(1, 0, 0) },
                    // Bottom face (normal: -Y)
                    { point: new THREE.Vector3(boxMin.x, boxMin.y, boxMin.z), normal: new THREE.Vector3(0, -1, 0) },
                    // Top face (normal: +Y)
                    { point: new THREE.Vector3(boxMin.x, boxMax.y, boxMin.z), normal: new THREE.Vector3(0, 1, 0) }
                ];
                
                // Check each face for intersection
                for (const face of faces) {
                    // Create a plane from point and normal
                    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(face.normal, face.point);
                    
                    // Check if ray intersects plane
                    const ray = new THREE.Ray(lastPosition, rayDirection);
                    const intersectPoint = new THREE.Vector3();
                    const hasIntersect = ray.intersectPlane(plane, intersectPoint);
                    
                    if (hasIntersect && lastPosition.distanceTo(intersectPoint) <= rayDistance) {
                        // Check if intersection point is within the face bounds
                        if (
                            intersectPoint.x >= boxMin.x && intersectPoint.x <= boxMax.x &&
                            intersectPoint.y >= boxMin.y && intersectPoint.y <= boxMax.y &&
                            intersectPoint.z >= boxMin.z && intersectPoint.z <= boxMax.z
                        ) {
                            // Player hit by enemy arrow!
                            healthSystem.damagePlayer(25);
                            
                            // Remove the arrow
                            scene.remove(arrow.mesh);
                            arrow.active = false;
                            
                            console.log("Player hit by enemy arrow through raycast!");
                            return true;
                        }
                    }
                }
            }
        }
        
        // Special check for bot hit by player arrow
        if (!arrow.isEnemy && botReference && healthSystem) {
            const botGroup = botReference.getGroup();
            
            // Skip if bot is not visible (already dead)
            if (!botGroup.visible) {
                return false;
            }
            
            // Get bot position
            const botPosition = botGroup.position.clone();
            
            // Create a much larger bounding box for the bot
            const botBox = new THREE.Box3().setFromCenterAndSize(
                botPosition,
                new THREE.Vector3(2.0, 3.0, 2.0) // Even larger hit box for the bot to make hits easier
            );
            
            // Check if arrow is inside bot box
            if (botBox.containsPoint(arrowPosition)) {
                // Bot hit by player arrow!
                healthSystem.damageBot(25, botGroup);
                
                // Remove the arrow
                scene.remove(arrow.mesh);
                arrow.active = false;
                
                console.log("Bot hit by player arrow!");
                return true;
            }
            
            // Add a simple distance-based check as well (easier to hit)
            const distanceToBot = arrowPosition.distanceTo(botPosition);
            if (distanceToBot < 2.0) { // Simple proximity check (very forgiving)
                // Bot hit by player arrow with proximity check!
                healthSystem.damageBot(25, botGroup);
                
                // Remove the arrow
                scene.remove(arrow.mesh);
                arrow.active = false;
                
                console.log("Bot hit by player arrow with proximity check!");
                return true;
            }
            
            // Also check if the arrow traveled through the bot between frames
            // using the same ray-casting technique as with the player
            const rayDirection = new THREE.Vector3().subVectors(arrowPosition, lastPosition).normalize();
            const rayDistance = lastPosition.distanceTo(arrowPosition);
            
            // Check if arrow passes close to bot with the proximity function
            if (checkArrowProximity(lastPosition, arrowPosition, botPosition, 2.5)) {
                // Bot hit by player arrow with proximity path check!
                healthSystem.damageBot(25, botGroup);
                
                // Remove the arrow
                scene.remove(arrow.mesh);
                arrow.active = false;
                
                console.log("Bot hit by player arrow with proximity path check!");
                return true;
            }
            
            // If the arrow moved significantly, check for ray intersection
            if (rayDistance > 0.1) {
                raycaster.set(lastPosition, rayDirection);
                raycaster.far = rayDistance;
                
                // Create a much larger temporary box for the bot
                const botSize = new THREE.Vector3(2.0, 3.0, 2.0); // Match the size from above
                const tempBotBox = new THREE.Box3().setFromCenterAndSize(botPosition, botSize);
                
                // Check if the ray intersects with the bot box
                const boxMin = tempBotBox.min;
                const boxMax = tempBotBox.max;
                
                // Construct simple planes for each face of the box
                const faces = [
                    // Front face (normal: -Z)
                    { point: new THREE.Vector3(boxMin.x, boxMin.y, boxMin.z), normal: new THREE.Vector3(0, 0, -1) },
                    // Back face (normal: +Z)
                    { point: new THREE.Vector3(boxMin.x, boxMin.y, boxMax.z), normal: new THREE.Vector3(0, 0, 1) },
                    // Left face (normal: -X)
                    { point: new THREE.Vector3(boxMin.x, boxMin.y, boxMin.z), normal: new THREE.Vector3(-1, 0, 0) },
                    // Right face (normal: +X)
                    { point: new THREE.Vector3(boxMax.x, boxMin.y, boxMin.z), normal: new THREE.Vector3(1, 0, 0) },
                    // Bottom face (normal: -Y)
                    { point: new THREE.Vector3(boxMin.x, boxMin.y, boxMin.z), normal: new THREE.Vector3(0, -1, 0) },
                    // Top face (normal: +Y)
                    { point: new THREE.Vector3(boxMin.x, boxMax.y, boxMin.z), normal: new THREE.Vector3(0, 1, 0) }
                ];
                
                // Check each face for intersection
                for (const face of faces) {
                    // Create a plane from point and normal
                    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(face.normal, face.point);
                    
                    // Check if ray intersects plane
                    const ray = new THREE.Ray(lastPosition, rayDirection);
                    const intersectPoint = new THREE.Vector3();
                    const hasIntersect = ray.intersectPlane(plane, intersectPoint);
                    
                    if (hasIntersect && lastPosition.distanceTo(intersectPoint) <= rayDistance) {
                        // Check if intersection point is within the face bounds
                        if (
                            intersectPoint.x >= boxMin.x && intersectPoint.x <= boxMax.x &&
                            intersectPoint.y >= boxMin.y && intersectPoint.y <= boxMax.y &&
                            intersectPoint.z >= boxMin.z && intersectPoint.z <= boxMax.z
                        ) {
                            // Bot hit by player arrow!
                            healthSystem.damageBot(25, botGroup);
                            
                            // Remove the arrow
                            scene.remove(arrow.mesh);
                            arrow.active = false;
                            
                            console.log("Bot hit by player arrow through raycast!");
                            return true;
                        }
                    }
                }
            }
        }
        
        // Regular object collision check
        const collision = collisionSystem.checkRayCollision(
            lastPosition,
            arrowPosition,
            objects,
            arrowSize * 0.3 // Radius approximating the arrow shaft
        );
        
        if (collision.hit) {
            // We hit something!
            const hitPoint = collision.point;
            
            // Move arrow to hit position, slightly backed off along ray to avoid intersections
            const backoffDistance = 0.05;
            const rayDirection = new THREE.Vector3().subVectors(arrowPosition, lastPosition).normalize();
            const adjustedHitPoint = hitPoint.clone().sub(
                rayDirection.multiplyScalar(backoffDistance)
            );
            
            // Update arrow position to the hit point
            arrow.mesh.position.copy(adjustedHitPoint);
            
            // Orient arrow to match impact direction
            arrow.mesh.lookAt(
                adjustedHitPoint.x + arrowDirection.x,
                adjustedHitPoint.y + arrowDirection.y,
                adjustedHitPoint.z + arrowDirection.z
            );
            
            return true; // Collision detected
        }
        
        return false; // No collision
    }
    
    // Update arrow positions and check for collisions using straight-line movement
    function updateArrows(objects) {
        const now = Date.now();
        
        // Initialize object bounding boxes if not already done
        if (objectBoxesCache.size === 0) {
            initObjectBoundingBoxes(objects);
        }
        
        // Maximum arrow lifetime in milliseconds (15 seconds)
        const maxArrowLifetime = 15000;
        
        // Update each arrow
        for (let i = arrows.length - 1; i >= 0; i--) {
            const arrow = arrows[i];
            
            // Remove old arrows
            if (now - arrow.createdAt > maxArrowLifetime) {
                scene.remove(arrow.mesh);
                arrows.splice(i, 1);
                continue;
            }
            
            // Only update active arrows
            if (arrow.active) {
                // Store the previous position for raycasting
                arrow.lastPosition = arrow.mesh.position.clone();
                
                // Calculate next position - straight line, no gravity
                const nextPosition = arrow.mesh.position.clone().add(arrow.velocity);
                
                // Check for collisions with objects using raycaster
                if (checkArrowCollision(arrow, objects)) {
                    // Arrow hit something, stop it
                    arrow.active = false;
                } else {
                    // Move the arrow in a straight line
                    arrow.mesh.position.copy(nextPosition);
                    
                    // Arrow always points in direction of travel
                    const arrowDir = arrow.velocity.clone().normalize();
                    arrow.mesh.lookAt(
                        arrow.mesh.position.x + arrowDir.x,
                        arrow.mesh.position.y + arrowDir.y,
                        arrow.mesh.position.z + arrowDir.z
                    );
                    
                    // Check if arrow has gone beyond map bounds
                    const mapSize = 50; // Should match MAP_SIZE in map.js
                    const pos = arrow.mesh.position;
                    if (Math.abs(pos.x) > mapSize || Math.abs(pos.z) > mapSize) {
                        // Remove arrows that go out of bounds
                        arrow.active = false;
                        console.log("Arrow went out of bounds");
                    }
                }
            }
        }
        
        // Return the count of active arrows for debugging
        return arrows.length;
    }
    
    /**
     * Check if an arrow passes close to a point along its path
     * Much more forgiving than precise collision detection
     */
    function checkArrowProximity(lastPos, currentPos, targetPos, proximityThreshold) {
        // Vector from last to current position
        const arrowVector = new THREE.Vector3().subVectors(currentPos, lastPos);
        const arrowLength = arrowVector.length();
        
        // Vector from last position to target
        const toTarget = new THREE.Vector3().subVectors(targetPos, lastPos);
        
        // Project target vector onto arrow vector to find closest point
        const projectionLength = toTarget.dot(arrowVector.clone().normalize());
        
        // Closest point is only valid if it's between lastPos and currentPos
        if (projectionLength >= 0 && projectionLength <= arrowLength) {
            // Calculate the closest point on the arrow's path
            const closestPoint = lastPos.clone().add(
                arrowVector.clone().normalize().multiplyScalar(projectionLength)
            );
            
            // Calculate distance from this point to the target
            const distance = closestPoint.distanceTo(targetPos);
            
            // Return true if closer than threshold
            return distance < proximityThreshold;
        }
        
        return false;
    }
    
    // Initialize the shooting controls
    setupShootingControls();
    
    return {
        updateArrows,
        getArrowCount: () => arrows.length,
        initObjectBoundingBoxes,
        fireArrow,
        setHealthSystem,
        setBotReference
    };
}