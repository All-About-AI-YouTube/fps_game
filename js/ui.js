/**
 * Creates UI elements for the game
 */
export function createUI() {
    // Create the instructions overlay
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
        <p style="font-family: Arial, sans-serif;">Jump: Space</p>
        <p style="font-family: Arial, sans-serif;">Sprint: Shift</p>
        <p style="font-family: Arial, sans-serif;">Shoot: Left Click</p>
        <p style="font-family: Arial, sans-serif;">Debug: P</p>
        <p style="font-family: Arial, sans-serif;">Exit: ESC</p>
    `;
    
    // Create a simple crosshair
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.width = '15px';
    crosshair.style.height = '15px';
    crosshair.style.opacity = '0.7';
    crosshair.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 15 15">
            <circle cx="7.5" cy="7.5" r="1.5" fill="white" />
            <line x1="7.5" y1="0" x2="7.5" y2="5" stroke="white" stroke-width="1" />
            <line x1="7.5" y1="10" x2="7.5" y2="15" stroke="white" stroke-width="1" />
            <line x1="0" y1="7.5" x2="5" y2="7.5" stroke="white" stroke-width="1" />
            <line x1="10" y1="7.5" x2="15" y2="7.5" stroke="white" stroke-width="1" />
        </svg>
    `;
    document.body.appendChild(crosshair);
    
    return instructionsElement;
}