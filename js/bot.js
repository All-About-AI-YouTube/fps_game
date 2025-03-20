import * as THREE from 'three';

/**
 * AI Bot for Team B
 * Aggressively hunts down the player while taking cover
 */
export function setupBot(scene, objects, playerCamera, collisionSystem, weaponSystem, healthSystem = null) {
    // Bot properties
    const botHeight = 1.8;
    const botSpeed = 0.12; // Increased speed for more aggression
    const botTurnSpeed = 0.05; // Faster turning
    const shootCooldown = 1500; // ms between shots (increased fire rate)
    const detectionRange = 40; // Increased detection range for better awareness
    const minShootDistance = 4; // Closer minimum shooting distance
    const maxShootDistance = 30; // Greater maximum shooting distance
    
    // Cover-taking properties
    const coverSearchRadius = 15; // How far to look for cover
    const coverSampleCount = 10; // How many potential cover positions to evaluate
    const takeCoverHealthThreshold = 40; // Take cover when health below this
    const coverEvaluationTime = 3000; // How often to reevaluate cover (ms)
    let lastCoverEvaluationTime = 0;
    let currentCoverPosition = null;
    let strafingDirection = Math.random() > 0.5 ? 1 : -1; // Random initial direction
    let strafingTimer = 0;
    const strafingDuration = 1500; // ms to strafe in one direction
    
    // Create a more human-like bot with combined shapes
    const botGroup = new THREE.Group();
    
    // Body (torso) - slightly tapered cylinder for a more realistic look
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2244AA,  // Dark blue for enemy uniform
        roughness: 0.7,
        metalness: 0.2
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.4; // Position the body above legs
    botGroup.add(bodyMesh);
    
    // Head - sphere
    const headGeometry = new THREE.SphereGeometry(0.25, 12, 12);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xE0C080,  // Skin tone
        roughness: 0.5 
    });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.y = 1.0; // Position the head on top of the body
    botGroup.add(headMesh);
    
    // Arms - two cylinders at the sides
    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2244AA,  // Same as body
        roughness: 0.7 
    });
    
    // Left arm
    const leftArmMesh = new THREE.Mesh(armGeometry, armMaterial);
    leftArmMesh.position.set(-0.4, 0.4, 0);
    leftArmMesh.rotation.z = Math.PI / 6; // Slightly angled outward
    botGroup.add(leftArmMesh);
    
    // Right arm
    const rightArmMesh = new THREE.Mesh(armGeometry, armMaterial);
    rightArmMesh.position.set(0.4, 0.4, 0);
    rightArmMesh.rotation.z = -Math.PI / 6; // Slightly angled outward
    botGroup.add(rightArmMesh);
    
    // Legs - two cylinders at the bottom
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,  // Dark color for pants
        roughness: 0.9 
    });
    
    // Left leg
    const leftLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    leftLegMesh.position.set(-0.2, -0.45, 0);
    botGroup.add(leftLegMesh);
    
    // Right leg
    const rightLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    rightLegMesh.position.set(0.2, -0.45, 0);
    botGroup.add(rightLegMesh);
    
    // Visor/face to indicate where the bot is looking
    const visorGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.05);
    const visorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF0000,
        emissive: 0xFF0000,
        emissiveIntensity: 0.5
    });
    const visorMesh = new THREE.Mesh(visorGeometry, visorMaterial);
    visorMesh.position.set(0, 1.0, 0.2); // Position it on the face
    botGroup.add(visorMesh);
    
    // Add a "bow" or weapon in the hands
    const bowGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
    const bowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.8 
    });
    const bowMesh = new THREE.Mesh(bowGeometry, bowMaterial);
    bowMesh.rotation.x = Math.PI / 2; // Make it horizontal
    bowMesh.position.set(0, 0.4, 0.4); // Position it in front
    botGroup.add(bowMesh);
    
    // Create a reference point for determining the bot's direction
    const directionReference = new THREE.Object3D();
    directionReference.position.set(0, 0, -1);
    botGroup.add(directionReference);
    
    // Position the bot at Team B spawn
    botGroup.position.set(40, botHeight / 2, 0);
    
    // Add the bot to the scene
    scene.add(botGroup);
    
    // Bot state
    let lastShootTime = 0;
    let targetWaypoint = null;
    let currentState = 'hunting'; // More aggressive default: hunting, shooting, taking_cover, flanking
    let lastStateChangeTime = Date.now();
    let playerLastSeenPosition = new THREE.Vector3();
    let timePlayerLastSeen = 0;
    
    // Predefined waypoints for patrolling (simple path around the map)
    const waypoints = [
        new THREE.Vector3(40, botHeight / 2, 0),    // Team B spawn
        new THREE.Vector3(25, botHeight / 2, 15),   // Northeast
        new THREE.Vector3(0, botHeight / 2, 25),    // North
        new THREE.Vector3(-25, botHeight / 2, 15),  // Northwest
        new THREE.Vector3(-40, botHeight / 2, 0),   // Team A spawn (player area)
        new THREE.Vector3(-25, botHeight / 2, -15), // Southwest
        new THREE.Vector3(0, botHeight / 2, -25),   // South
        new THREE.Vector3(25, botHeight / 2, -15)   // Southeast
    ];
    
    // Pick closest waypoint to start
    let currentWaypointIndex = findClosestWaypointIndex(botGroup.position);
    targetWaypoint = waypoints[currentWaypointIndex];
    
    /**
     * Find the index of the closest waypoint to a position
     */
    function findClosestWaypointIndex(position) {
        let closestIndex = 0;
        let closestDistance = Infinity;
        
        for (let i = 0; i < waypoints.length; i++) {
            const distance = position.distanceTo(waypoints[i]);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }
        
        return closestIndex;
    }
    
    /**
     * Check if the bot can see the player with raycasting
     */
    function canSeePlayer(botPosition, playerPosition) {
        // Direction to player
        const direction = new THREE.Vector3().subVectors(playerPosition, botPosition).normalize();
        
        // Distance to player
        const distance = botPosition.distanceTo(playerPosition);
        
        // Check if player is within detection range
        if (distance > detectionRange) {
            return false;
        }
        
        // Check if there are obstacles between bot and player using raycasting
        const result = collisionSystem.checkRayCollision(
            botPosition,
            playerPosition,
            objects
        );
        
        // If there's a hit and it's closer than the player, the bot can't see the player
        if (result.hit && result.distance < distance) {
            return false;
        }
        
        // Update last seen position and time
        playerLastSeenPosition.copy(playerPosition);
        timePlayerLastSeen = Date.now();
        
        return true;
    }
    
    /**
     * Make the bot shoot an arrow at the player
     */
    function shootAtPlayer(botPosition, playerPosition) {
        // Check if cooldown has passed
        const now = Date.now();
        if (now - lastShootTime < shootCooldown) {
            return;
        }
        
        // Direction to player
        const direction = new THREE.Vector3().subVectors(playerPosition, botPosition).normalize();
        
        // Add a bit of inaccuracy based on distance
        const distance = botPosition.distanceTo(playerPosition);
        const maxInaccuracy = Math.min(0.1, distance * 0.005); // More inaccuracy at longer distances
        
        // Apply random offset to direction
        direction.x += (Math.random() - 0.5) * maxInaccuracy;
        direction.y += (Math.random() - 0.5) * maxInaccuracy;
        direction.z += (Math.random() - 0.5) * maxInaccuracy;
        direction.normalize();
        
        // Create a starting position from the bow position (front of the bot)
        // Find the bow's position in world space
        const bowPosition = new THREE.Vector3(0, 0.4, 0.6); // Slightly ahead of where the bow is
        bowPosition.applyQuaternion(botGroup.quaternion); // Apply bot's rotation
        bowPosition.add(botPosition); // Add bot's position
        
        // Shoot the arrow from the bow
        weaponSystem.fireArrow(bowPosition, direction, true); // true indicates it's an enemy arrow
        
        // Simple animation effect - temporarily move the bow back a bit
        const bow = botGroup.children.find(child => 
            child.geometry && child.geometry.type === 'CylinderGeometry' && 
            child.geometry.parameters.radiusTop === 0.03);
            
        if (bow) {
            // Store original position
            const originalZ = bow.position.z;
            
            // Pull back
            bow.position.z -= 0.1;
            
            // Return to original position after a short delay
            setTimeout(() => {
                bow.position.z = originalZ;
            }, 100);
        }
        
        // Update last shoot time
        lastShootTime = now;
    }
    
    /**
     * Update bot's rotation to face a target
     */
    function updateRotation(targetPosition) {
        // Calculate desired angle to face target
        const dx = targetPosition.x - botGroup.position.x;
        const dz = targetPosition.z - botGroup.position.z;
        const desiredAngle = Math.atan2(dx, dz);
        
        // Get current angle
        const currentAngle = botGroup.rotation.y;
        
        // Calculate the shortest angle between current and desired
        let angleDiff = desiredAngle - currentAngle;
        
        // Normalize the angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Turn towards the desired angle with limited turn speed
        if (Math.abs(angleDiff) > botTurnSpeed) {
            botGroup.rotation.y += Math.sign(angleDiff) * botTurnSpeed;
        } else {
            botGroup.rotation.y = desiredAngle;
        }
    }
    
    /**
     * Move the bot towards the target position
     */
    function moveTowards(targetPosition, speedMultiplier = 1) {
        // Direction to target
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, botGroup.position)
            .normalize();
        
        // Calculate next position
        const nextPosition = botGroup.position.clone()
            .add(direction.multiplyScalar(botSpeed * speedMultiplier));
        
        // Check for collisions before moving
        const collisionResult = collisionSystem.checkCollision(
            nextPosition,
            objects,
            botHeight
        );
        
        if (!collisionResult.collision) {
            // No collision, update position
            botGroup.position.copy(nextPosition);
            return true; // Moved successfully
        }
        
        // If there's a collision, try to find a way around
        // Try moving only in X direction
        const nextPositionX = botGroup.position.clone();
        nextPositionX.x += direction.x * botSpeed * speedMultiplier;
        
        const collisionResultX = collisionSystem.checkCollision(
            nextPositionX,
            objects,
            botHeight
        );
        
        if (!collisionResultX.collision) {
            botGroup.position.copy(nextPositionX);
            return true; // Moved successfully
        }
        
        // Try moving only in Z direction
        const nextPositionZ = botGroup.position.clone();
        nextPositionZ.z += direction.z * botSpeed * speedMultiplier;
        
        const collisionResultZ = collisionSystem.checkCollision(
            nextPositionZ,
            objects,
            botHeight
        );
        
        if (!collisionResultZ.collision) {
            botGroup.position.copy(nextPositionZ);
            return true; // Moved successfully
        }
        
        // Try diagonal movements
        const diagDirections = [
            new THREE.Vector3(direction.z, 0, -direction.x).normalize(), // Perpendicular right
            new THREE.Vector3(-direction.z, 0, direction.x).normalize(), // Perpendicular left
            new THREE.Vector3(direction.x + direction.z, 0, direction.z - direction.x).normalize(), // Diagonal right
            new THREE.Vector3(direction.x - direction.z, 0, direction.z + direction.x).normalize()  // Diagonal left
        ];
        
        for (const diagDir of diagDirections) {
            const diagPosition = botGroup.position.clone().add(
                diagDir.multiplyScalar(botSpeed * speedMultiplier)
            );
            
            const diagCollision = collisionSystem.checkCollision(
                diagPosition,
                objects,
                botHeight
            );
            
            if (!diagCollision.collision) {
                botGroup.position.copy(diagPosition);
                return true; // Moved successfully
            }
        }
        
        return false; // Could not move
    }
    
    /**
     * Make the bot strafe sideways while keeping focus on the target
     * @returns {boolean} - True if the bot moved, false otherwise
     */
    function strafeAround(targetPosition) {
        // Get the direction to the target
        const dirToTarget = new THREE.Vector3()
            .subVectors(targetPosition, botGroup.position)
            .normalize();
        
        // Calculate perpendicular vector for strafing (cross product with up vector)
        const strafeDir = new THREE.Vector3(
            dirToTarget.z * strafingDirection,
            0,
            -dirToTarget.x * strafingDirection
        ).normalize();
        
        // Calculate next position
        const nextPosition = botGroup.position.clone()
            .add(strafeDir.multiplyScalar(botSpeed * 0.8)); // Strafe a bit slower
        
        // Check for collisions before moving
        const collisionResult = collisionSystem.checkCollision(
            nextPosition,
            objects,
            botHeight
        );
        
        if (!collisionResult.collision) {
            // No collision, update position
            botGroup.position.copy(nextPosition);
            return true; // Moved successfully
        } else {
            // Hit something while strafing, change direction
            strafingDirection *= -1;
            strafingTimer = 0;
            return false; // Did not move
        }
    }
    
    /**
     * Find a good cover position near the bot
     */
    function findCoverPosition(fromPosition, targetPosition) {
        const coverPositions = [];
        const dirToTarget = new THREE.Vector3().subVectors(targetPosition, fromPosition).normalize();
        
        // Get all objects that could provide cover
        const potentialCoverObjects = [];
        for (const obj of objects) {
            if (obj.isMesh && !obj.userData.noCollision && obj !== botMesh) {
                potentialCoverObjects.push(obj);
            }
        }
        
        if (potentialCoverObjects.length === 0) {
            return null;
        }
        
        // Sort objects by distance
        potentialCoverObjects.sort((a, b) => {
            const distA = a.position.distanceTo(fromPosition);
            const distB = b.position.distanceTo(fromPosition);
            return distA - distB;
        });
        
        // Consider only the closest N objects for performance
        const closestObjects = potentialCoverObjects.slice(0, 10);
        
        // For each object, try to find positions that would provide cover
        for (const obj of closestObjects) {
            // Get the object's bounding box
            if (!obj.geometry.boundingBox) {
                obj.geometry.computeBoundingBox();
            }
            
            const box = new THREE.Box3().setFromObject(obj);
            
            // Get the side of the object that faces away from the target
            const objCenter = new THREE.Vector3();
            box.getCenter(objCenter);
            
            // Vector from target to object
            const coverDirection = new THREE.Vector3().subVectors(objCenter, targetPosition).normalize();
            
            // Extend a bit beyond the object to find a position behind it
            const coverDist = box.max.distanceTo(box.min) * 0.6; // Distance based on object size
            const baseCoverPos = new THREE.Vector3().copy(objCenter).add(
                coverDirection.multiplyScalar(coverDist)
            );
            
            // Try a few positions around this point
            for (let i = 0; i < 5; i++) {
                // Add some randomness to the position
                const coverPos = new THREE.Vector3().copy(baseCoverPos);
                coverPos.x += (Math.random() - 0.5) * 2;
                coverPos.z += (Math.random() - 0.5) * 2;
                coverPos.y = botHeight / 2; // Keep at correct height
                
                // Check if this position is valid (no collision)
                const collisionCheck = collisionSystem.checkCollision(
                    coverPos,
                    objects,
                    botHeight
                );
                
                // Check if the position provides cover from the target (raycast to target)
                const coverCheck = collisionSystem.checkRayCollision(
                    coverPos,
                    targetPosition,
                    objects
                );
                
                // Good cover position if: no collision at position, but ray to target is blocked
                if (!collisionCheck.collision && coverCheck.hit) {
                    // Evaluate how good this cover position is
                    const distToTarget = coverPos.distanceTo(targetPosition);
                    const distFromCurrent = coverPos.distanceTo(fromPosition);
                    
                    // Score this position (prefer closer to current position but far from target)
                    const score = distToTarget - distFromCurrent * 0.5;
                    
                    coverPositions.push({
                        position: coverPos,
                        score: score
                    });
                }
            }
        }
        
        // Sort cover positions by score (higher is better)
        coverPositions.sort((a, b) => b.score - a.score);
        
        // Return the best cover position if any found
        if (coverPositions.length > 0) {
            return coverPositions[0].position;
        }
        
        return null;
    }
    
    /**
     * Find a flanking position to approach the player from a different angle
     */
    function findFlankingPosition(playerPosition) {
        // Calculate a position to the side of the player
        const playerForward = new THREE.Vector3();
        playerCamera.getWorldDirection(playerForward);
        
        // Get perpendicular directions (left and right of player)
        const flankLeft = new THREE.Vector3(-playerForward.z, 0, playerForward.x).normalize();
        const flankRight = new THREE.Vector3(playerForward.z, 0, -playerForward.x).normalize();
        
        // Choose the flanking direction that's closer to the bot
        const botToPlayer = new THREE.Vector3().subVectors(playerPosition, botGroup.position);
        const leftDot = flankLeft.dot(botToPlayer);
        const rightDot = flankRight.dot(botToPlayer);
        
        const flankDir = leftDot > rightDot ? flankRight : flankLeft;
        
        // Create a position 10-15 units to the side and a bit behind the player
        const flankDist = 10 + Math.random() * 5;
        const flankPosition = new THREE.Vector3()
            .copy(playerPosition)
            .add(flankDir.multiplyScalar(flankDist))
            .add(playerForward.multiplyScalar(-5 - Math.random() * 3)); // Slightly behind
        
        // Make sure the position is valid (no collision)
        const collisionCheck = collisionSystem.checkCollision(
            flankPosition,
            objects,
            botHeight
        );
        
        if (!collisionCheck.collision) {
            return flankPosition;
        }
        
        // If the flanking position isn't valid, try to find a nearby valid position
        const testPositions = [];
        for (let i = 0; i < 10; i++) {
            const testPos = new THREE.Vector3()
                .copy(flankPosition)
                .add(new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    0,
                    (Math.random() - 0.5) * 10
                ));
            
            testPos.y = botHeight / 2;
            
            const testCollision = collisionSystem.checkCollision(
                testPos,
                objects,
                botHeight
            );
            
            if (!testCollision.collision) {
                testPositions.push({
                    position: testPos,
                    distance: testPos.distanceTo(flankPosition) // Prefer positions close to original flank
                });
            }
        }
        
        // Sort by distance to original flanking position
        testPositions.sort((a, b) => a.distance - b.distance);
        
        // Return the closest valid position if any found
        if (testPositions.length > 0) {
            return testPositions[0].position;
        }
        
        // If all else fails, return a position at a random waypoint
        return waypoints[Math.floor(Math.random() * waypoints.length)];
    }
    
    /**
     * Check if bot is close to the target position
     */
    function isNearPosition(position, threshold = 1.0) {
        return botGroup.position.distanceTo(position) < threshold;
    }
    
    // Animation variables
    let walkCycle = 0;
    const walkSpeed = 0.03;
    
    /**
     * Animate the bot to make it look more alive
     */
    function animateBot(isMoving) {
        // Find the legs
        const leftLeg = botGroup.children.find(child => 
            child.geometry && child.geometry.type === 'CylinderGeometry' && 
            child.position.x < 0 && child.position.y < 0);
            
        const rightLeg = botGroup.children.find(child => 
            child.geometry && child.geometry.type === 'CylinderGeometry' && 
            child.position.x > 0 && child.position.y < 0);
        
        // If moving, animate legs in a walking cycle
        if (isMoving && leftLeg && rightLeg) {
            walkCycle += walkSpeed;
            
            // Simple pendulum motion for the legs
            leftLeg.rotation.x = Math.sin(walkCycle) * 0.3;
            rightLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.3;
        } else if (leftLeg && rightLeg) {
            // Reset legs to standing position when not moving
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
        }
        
        // Subtle body bob
        const body = botGroup.children.find(child => 
            child.geometry && child.geometry.type === 'CylinderGeometry' && 
            child.position.y > 0 && child.position.y < 0.5);
            
        if (body && isMoving) {
            body.position.y = 0.4 + Math.abs(Math.sin(walkCycle * 2)) * 0.05;
        } else if (body) {
            body.position.y = 0.4;
        }
    }
    
    /**
     * Update the bot's state machine and behavior
     */
    function updateBot() {
        // Skip update if bot is dead
        if (healthSystem && healthSystem.isBotDead()) {
            botGroup.visible = false;
            return;
        }
        
        // Track if bot is moving this frame
        let isMoving = false;
        
        // Get player's position
        const playerPosition = playerCamera.position.clone();
        
        // Check if player is dead
        const playerDead = healthSystem && healthSystem.isPlayerDead();
        if (playerDead) {
            // Just patrol if player is dead
            currentState = 'patrolling';
        } else {
            // Check if bot can see player
            const canSee = canSeePlayer(botGroup.position, playerPosition);
            const botHealth = healthSystem ? healthSystem.getBotHealth() : 100;
            
            // Update state based on visibility and health
            if (canSee) {
                const distanceToPlayer = botGroup.position.distanceTo(playerPosition);
                const now = Date.now();
                
                // Take cover if health is low
                if (botHealth < takeCoverHealthThreshold && currentState !== 'taking_cover') {
                    currentState = 'taking_cover';
                    lastStateChangeTime = now;
                    
                    // Find a cover position
                    currentCoverPosition = findCoverPosition(botGroup.position, playerPosition);
                    if (!currentCoverPosition) {
                        // If no cover found, try to flank
                        currentState = 'flanking';
                        currentCoverPosition = findFlankingPosition(playerPosition);
                    }
                } 
                // Optimal shooting distance
                else if (distanceToPlayer < maxShootDistance && distanceToPlayer > minShootDistance) {
                    // Randomly decide to flank instead of shoot (more aggressive)
                    if (currentState !== 'shooting' && currentState !== 'flanking' && Math.random() < 0.1) {
                        currentState = 'flanking';
                        lastStateChangeTime = now;
                        currentCoverPosition = findFlankingPosition(playerPosition);
                    } else {
                        currentState = 'shooting';
                    }
                } 
                // Too far, need to get closer
                else if (distanceToPlayer >= maxShootDistance) {
                    currentState = 'hunting';
                } 
                // Too close, need to back up or strafe
                else {
                    if (currentState !== 'backing_up') {
                        currentState = 'backing_up';
                        // Randomly change strafe direction
                        if (Math.random() < 0.5) {
                            strafingDirection *= -1;
                        }
                    }
                }
            } else {
                // Can't see player, but was seen recently
                const now = Date.now();
                const timeSinceLastSeen = now - timePlayerLastSeen;
                
                // If saw player recently, go to last seen position
                if (timeSinceLastSeen < 5000) {
                    currentState = 'investigating';
                } else {
                    // If haven't seen player in a while, patrol or flank
                    if (currentState !== 'patrolling' && currentState !== 'flanking') {
                        if (Math.random() < 0.7) { // 70% chance to try flanking
                            currentState = 'flanking';
                            lastStateChangeTime = now;
                            currentCoverPosition = findFlankingPosition(playerLastSeenPosition);
                        } else {
                            currentState = 'patrolling';
                            // Pick a new random waypoint
                            currentWaypointIndex = Math.floor(Math.random() * waypoints.length);
                            targetWaypoint = waypoints[currentWaypointIndex];
                        }
                    }
                }
            }
        }
        
        // Handle different states
        const now = Date.now();
        switch (currentState) {
            case 'patrolling':
                // Update rotation to face waypoint
                updateRotation(targetWaypoint);
                
                // Move towards the waypoint
                isMoving = moveTowards(targetWaypoint, 0.8); // Slower patrol speed
                
                // Check if we've reached the waypoint
                if (isNearPosition(targetWaypoint)) {
                    // Move to next waypoint
                    currentWaypointIndex = (currentWaypointIndex + 1) % waypoints.length;
                    targetWaypoint = waypoints[currentWaypointIndex];
                }
                break;
                
            case 'hunting':
                // Update rotation to face player
                updateRotation(playerPosition);
                
                // Move towards player at full speed
                isMoving = moveTowards(playerPosition, 1.5); // More aggressive hunting
                break;
                
            case 'investigating':
                // Move to last seen position of player
                updateRotation(playerLastSeenPosition);
                isMoving = moveTowards(playerLastSeenPosition, 1.2);
                
                // If we've reached the last seen position, go back to patrolling
                if (isNearPosition(playerLastSeenPosition, 2.0)) {
                    currentState = 'patrolling';
                }
                break;
                
            case 'shooting':
                // Face player
                updateRotation(playerPosition);
                
                // Update strafing timer
                strafingTimer += 16; // Approximate ms per frame
                if (strafingTimer > strafingDuration) {
                    strafingTimer = 0;
                    strafingDirection *= -1; // Change direction
                }
                
                // Strafe sideways while shooting
                isMoving = strafeAround(playerPosition);
                
                // Shoot at player
                shootAtPlayer(botGroup.position, playerPosition);
                break;
                
            case 'taking_cover':
                // If we have a cover position, move towards it
                if (currentCoverPosition) {
                    updateRotation(currentCoverPosition);
                    
                    // Move towards cover
                    isMoving = moveTowards(currentCoverPosition, 1.5);
                    
                    // If we've reached cover or spent too long trying, reevaluate
                    if (isMoving || now - lastStateChangeTime > 5000) {
                        // After reaching cover, occasionally peek out to shoot
                        const botHealth = healthSystem ? healthSystem.getBotHealth() : 100;
                        
                        // If health recovered enough, stop taking cover
                        if (botHealth > takeCoverHealthThreshold + 20) {
                            currentState = 'flanking';
                            lastStateChangeTime = now;
                            currentCoverPosition = findFlankingPosition(playerPosition);
                        } else {
                            // Peek out and shoot
                            updateRotation(playerPosition);
                            shootAtPlayer(botGroup.position, playerPosition);
                        }
                    }
                } else {
                    // If no cover position, try to find one
                    currentCoverPosition = findCoverPosition(botGroup.position, playerPosition);
                    
                    // If still no cover, switch to flanking
                    if (!currentCoverPosition) {
                        currentState = 'flanking';
                        lastStateChangeTime = now;
                        currentCoverPosition = findFlankingPosition(playerPosition);
                    }
                }
                break;
                
            case 'flanking':
                // If we have a flanking position, move towards it
                if (currentCoverPosition) {
                    // Face the direction we're moving
                    updateRotation(currentCoverPosition);
                    
                    // Move towards flanking position quickly
                    isMoving = moveTowards(currentCoverPosition, 1.4);
                    
                    // If we've reached the flank or spent too long trying
                    if (!isMoving || now - lastStateChangeTime > 7000) {
                        // After flanking, hunt the player
                        currentState = 'hunting';
                    }
                } else {
                    // If no flanking position, find one
                    currentCoverPosition = findFlankingPosition(playerPosition);
                    
                    // If still no flanking position, fall back to hunting
                    if (!currentCoverPosition) {
                        currentState = 'hunting';
                    }
                }
                break;
                
            case 'backing_up':
                // Face player while backing up
                updateRotation(playerPosition);
                
                // Calculate backing direction (away from player)
                const awayDir = new THREE.Vector3().subVectors(
                    botGroup.position,
                    playerPosition
                ).normalize();
                
                // Also strafe sideways to make a harder target
                const strafeDir = new THREE.Vector3(
                    awayDir.z * strafingDirection,
                    0,
                    -awayDir.x * strafingDirection
                ).normalize();
                
                // Combine backing and strafing
                const combinedDir = new THREE.Vector3()
                    .addVectors(
                        awayDir.multiplyScalar(0.7),
                        strafeDir.multiplyScalar(0.3)
                    ).normalize();
                
                // Calculate next position
                const backupPosition = botGroup.position.clone().add(
                    combinedDir.multiplyScalar(botSpeed)
                );
                
                // Check for collisions
                const collisionResult = collisionSystem.checkCollision(
                    backupPosition,
                    objects,
                    botHeight
                );
                
                if (!collisionResult.collision) {
                    botGroup.position.copy(backupPosition);
                    isMoving = true;
                    
                    // Shoot while backing up
                    shootAtPlayer(botGroup.position, playerPosition);
                    
                    // Check if we're at a good distance
                    const distanceToPlayer = botGroup.position.distanceTo(playerPosition);
                    if (distanceToPlayer > minShootDistance + 3) {
                        currentState = 'shooting';
                    }
                } else {
                    // If we hit a wall while backing up, switch to flanking
                    currentState = 'flanking';
                    lastStateChangeTime = now;
                    currentCoverPosition = findFlankingPosition(playerPosition);
                }
                break;
        }
        
        // Animate the bot based on its movement state
        animateBot(isMoving);
        
        // Keep the bot at the correct height
        botGroup.position.y = botHeight / 2;
        
        // Keep the bot within map boundaries
        const mapSize = 49; // Slightly smaller than actual map to avoid edge collisions
        const boundaryPadding = 1;
        
        if (botGroup.position.x < -mapSize + boundaryPadding) {
            botGroup.position.x = -mapSize + boundaryPadding;
        } else if (botGroup.position.x > mapSize - boundaryPadding) {
            botGroup.position.x = mapSize - boundaryPadding;
        }
        
        if (botGroup.position.z < -mapSize + boundaryPadding) {
            botGroup.position.z = -mapSize + boundaryPadding;
        } else if (botGroup.position.z > mapSize - boundaryPadding) {
            botGroup.position.z = mapSize - boundaryPadding;
        }
    }
    
    // Return the bot system with any needed public methods
    return {
        update: updateBot,
        getPosition: () => botGroup.position.clone(),
        getMesh: () => botGroup,
        getGroup: () => botGroup,
        getCurrentState: () => currentState
    };
}