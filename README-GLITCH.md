# FPS Game WebSocket Server

This is the WebSocket server for the multiplayer FPS game. It handles:

- Matchmaking between players
- Game state synchronization
- Player movement updates
- Shooting and hit detection
- Health management

## Setup Instructions for Glitch

1. Create a new Glitch project
2. Upload these files:
   - server-glitch.js (rename to server.js)
   - package-glitch.json (rename to package.json)
3. The server will automatically start

## Connecting from the game client

The game client should connect to this WebSocket server using:

```javascript
const socket = io('https://your-glitch-project-name.glitch.me');
```

Make sure to update the URL in your game's network.js file with the actual Glitch project URL.