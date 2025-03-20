import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as THREE from 'three';

/**
 * Initialize the player controls
 */
export function initControls(camera, domElement) {
    const controls = new PointerLockControls(camera, domElement);
    return controls;
}

/**
 * Setup all event listeners for player controls
 */
export function setupEventListeners(controls, instructionsElement, camera, renderer) {
    // Movement variables
    const moveSpeed = 0.2; // Base movement speed
    const sprintSpeed = 0.4; // Sprint movement speed
    const jumpForce = 0.5; // Initial jump velocity - doubled for higher jumps
    const gravity = 0.01; // Gravity force for jumping
    
    // Physics variables
    let isJumping = false;
    let jumpVelocity = 0;
    let playerHeight = 1.8; // Default player height (standard FPS height)
    
    // Object to track pressed keys
    const keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        shift: false,
        space: false
    };
    
    // Handle click to lock/unlock controls
    instructionsElement.addEventListener('click', () => {
        controls.lock();
    });
    
    // Show/hide instructions based on pointer lock
    controls.addEventListener('lock', () => {
        instructionsElement.style.display = 'none';
        console.log('Controls locked - player can now move');
    });
    
    controls.addEventListener('unlock', () => {
        instructionsElement.style.display = 'flex';
        console.log('Controls unlocked - player movement disabled');
    });
    
    // Handle keyboard input for movement
    document.addEventListener('keydown', (event) => {
        switch(event.key.toLowerCase()) {
            case 'w': keys.w = true; break;
            case 'a': keys.a = true; break;
            case 's': keys.s = true; break;
            case 'd': keys.d = true; break;
            case 'shift': keys.shift = true; break;
            case ' ': keys.space = true; break;
        }
    });
    
    document.addEventListener('keyup', (event) => {
        switch(event.key.toLowerCase()) {
            case 'w': keys.w = false; break;
            case 'a': keys.a = false; break;
            case 's': keys.s = false; break;
            case 'd': keys.d = false; break;
            case 'shift': keys.shift = false; break;
            case ' ': keys.space = false; break;
        }
    });
    
    return { keys, moveSpeed, sprintSpeed, jumpForce, gravity, isJumping, jumpVelocity, playerHeight };
}