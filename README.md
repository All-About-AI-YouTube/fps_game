# Multiplayer FPS Game

A 3D first-person shooter game with multiplayer functionality built using Three.js and Socket.io.

## Features

- 3D environment with buildings and obstacles
- First-person shooter mechanics
- Multiplayer with matchmaking
- Team-based gameplay
- Real-time player movement and shooting
- Health system with damage and death
- Arrow physics and hit detection

## Deployment Instructions

### Game Client (Vercel)

1. Deploy this repository to Vercel
2. Vercel will automatically build and deploy the static files

### WebSocket Server (Glitch)

For the multiplayer functionality to work, you need to set up the WebSocket server on Glitch:

1. Create a new Glitch project
2. Upload these files:
   - server-glitch.js (rename to server.js)
   - package-glitch.json (rename to package.json)
3. Note the URL of your Glitch project (e.g., https://your-project-name.glitch.me)
4. Update the WebSocket server URL in js/network.js with your Glitch project URL

## How to Play

1. Visit the deployed Vercel URL
2. Click to start the game
3. Press ESC to access the matchmaking menu
4. Click "Find Match" to be matched with another player
5. Once matched, the game will start automatically
6. Team A spawns on the west side, Team B on the east side

### Controls

- WASD: Move
- Mouse: Look around
- Left Click: Shoot
- Space: Jump
- Shift: Sprint
- ESC: Exit/Matchmaking menu
- P: Debug overlay

## Technologies Used

- Three.js for 3D rendering
- Socket.io for real-time communication
- Vercel for hosting the game client
- Glitch for hosting the WebSocket server

## Credits

Built with Three.js and Socket.io.