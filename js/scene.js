import * as THREE from 'three';

/**
 * Creates and configures the scene with background and fog
 */
export function createScene() {
    const scene = new THREE.Scene();
    
    // Add fog to the scene for atmosphere
    scene.fog = new THREE.FogExp2(0x88CCEE, 0.008);
    scene.background = new THREE.Color(0x88CCEE); // Match fog color with sky
    
    return scene;
}

/**
 * Creates and configures all lighting for the scene
 */
export function createLighting(scene) {
    // Add ambient light for overall scene brightness
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light to create shadows
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
    
    // Add a hemisphere light to simulate sky and ground reflection
    const hemisphereLight = new THREE.HemisphereLight(0x88CCEE, 0x888888, 0.3);
    scene.add(hemisphereLight);
}

/**
 * Creates the ground plane 
 */
export function createGround(scene) {
    // Create a simple plane for the ground
    const groundSize = 100;
    
    // Create a simple plane geometry
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333, 
        side: THREE.DoubleSide,
        roughness: 0.8
    });
    
    // Create the ground mesh
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    
    // Rotate and position the plane to be horizontal
    ground.rotation.x = -Math.PI / 2; // Rotate to be flat
    ground.position.y = 0; // Position at y=0
    ground.receiveShadow = true;
    
    // Add the ground to the scene
    scene.add(ground);
    
    // Create a central plaza with different material
    const plazaSize = 30;
    const plazaGeometry = new THREE.PlaneGeometry(plazaSize, plazaSize);
    const plazaMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x777777, 
        side: THREE.DoubleSide,
        roughness: 0.5
    });
    
    const plaza = new THREE.Mesh(plazaGeometry, plazaMaterial);
    plaza.rotation.x = -Math.PI / 2; // Rotate to be flat
    plaza.position.y = 0.01; // Slightly above ground to prevent z-fighting
    plaza.receiveShadow = true;
    scene.add(plaza);
    
    // We're returning null here since we won't use the ground for collision
    return null;
}