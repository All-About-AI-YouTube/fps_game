const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Create Express app
const app = express();
const server = http.createServer(app);

// Set up Socket.io with CORS enabled
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, './')));

// Matchmaking queues and game state
const waitingPlayers = []; // Players waiting to be matched
const activeGames = {}; // Active game sessions

// Function to create a unique game ID
function generateGameId() {
  return Math.random().toString(36).substring(2, 9);
}

// Match two players together
function matchPlayers() {
  if (waitingPlayers.length >= 2) {
    const player1 = waitingPlayers.shift();
    const player2 = waitingPlayers.shift();
    
    const gameId = generateGameId();
    
    // Create a new game
    activeGames[gameId] = {
      id: gameId,
      players: [player1, player2],
      state: 'starting'
    };
    
    // Add players to a Socket.io room for this game
    player1.join(gameId);
    player2.join(gameId);
    
    // Notify players they've been matched
    io.to(gameId).emit('gameMatched', {
      gameId,
      countdown: 5,
      players: [
        { id: player1.id, team: 'A' },
        { id: player2.id, team: 'B' }
      ]
    });
    
    console.log(`Matched players ${player1.id} and ${player2.id} in game ${gameId}`);
    
    // Start the game after countdown
    setTimeout(() => {
      if (activeGames[gameId]) {
        activeGames[gameId].state = 'active';
        io.to(gameId).emit('gameStart');
        console.log(`Game ${gameId} started`);
      }
    }, 5000);
    
    return true;
  }
  return false;
}

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);
  
  // Handle player joining matchmaking queue
  socket.on('joinMatchmaking', () => {
    console.log(`Player ${socket.id} joined matchmaking`);
    
    // Store player data and add to waiting queue
    socket.data.team = waitingPlayers.length % 2 === 0 ? 'A' : 'B';
    waitingPlayers.push(socket);
    
    // Send current queue status
    socket.emit('matchmakingStatus', {
      position: waitingPlayers.indexOf(socket) + 1,
      playersWaiting: waitingPlayers.length
    });
    
    // Try to match players
    matchPlayers();
  });
  
  // Handle cancellation of matchmaking
  socket.on('cancelMatchmaking', () => {
    const index = waitingPlayers.indexOf(socket);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
      console.log(`Player ${socket.id} left matchmaking queue`);
    }
  });
  
  // Handle player joining the game after matchmaking
  socket.on('playerJoin', (playerData) => {
    console.log('Player joined with data:', socket.id, playerData);
    
    // Find which game the player is in
    let gameId = null;
    for (const id in activeGames) {
      if (activeGames[id].players.includes(socket)) {
        gameId = id;
        break;
      }
    }
    
    if (!gameId) {
      console.log(`Player ${socket.id} not in any active game`);
      return;
    }
    
    // Store player data for this game
    socket.data.position = playerData.position;
    socket.data.rotation = playerData.rotation;
    socket.data.health = 100;
    
    // Send player their initial data
    socket.emit('playerInitialized', {
      id: socket.id,
      position: playerData.position,
      rotation: playerData.rotation,
      health: 100,
      team: socket.data.team
    });
    
    // Send this player data about all other players in the same game
    const playersData = {};
    for (const playerId of io.sockets.adapter.rooms.get(gameId)) {
      if (playerId !== socket.id) {
        const playerSocket = io.sockets.sockets.get(playerId);
        if (playerSocket && playerSocket.data.position) {
          playersData[playerId] = {
            id: playerId,
            position: playerSocket.data.position,
            rotation: playerSocket.data.rotation,
            health: playerSocket.data.health,
            team: playerSocket.data.team
          };
        }
      }
    }
    socket.emit('currentPlayers', playersData);
    
    // Inform other players about the new player
    socket.to(gameId).emit('playerJoined', {
      id: socket.id,
      position: playerData.position,
      rotation: playerData.rotation,
      health: 100,
      team: socket.data.team
    });
  });
  
  // Handle player movement updates
  socket.on('playerMove', (moveData) => {
    // Update player position and rotation
    if (socket.data) {
      socket.data.position = moveData.position;
      socket.data.rotation = moveData.rotation;
      
      // Find which game the player is in
      for (const gameId in activeGames) {
        if (activeGames[gameId].players.includes(socket)) {
          // Broadcast to other players in the same game
          socket.to(gameId).emit('playerMoved', {
            id: socket.id,
            position: moveData.position,
            rotation: moveData.rotation
          });
          break;
        }
      }
    }
  });
  
  // Handle player shooting
  socket.on('playerShoot', (arrowData) => {
    // Find which game the player is in
    for (const gameId in activeGames) {
      if (activeGames[gameId].players.includes(socket)) {
        // Broadcast to other players in the same game
        socket.to(gameId).emit('playerShoot', {
          id: socket.id,
          position: arrowData.position,
          direction: arrowData.direction,
          velocity: arrowData.velocity
        });
        break;
      }
    }
  });
  
  // Handle player hit/damage
  socket.on('playerHit', (hitData) => {
    const targetId = hitData.targetId;
    const damage = hitData.damage;
    
    // Get the target socket
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket && targetSocket.data) {
      // Reduce health
      targetSocket.data.health -= damage;
      if (targetSocket.data.health < 0) targetSocket.data.health = 0;
      
      // Find which game the player is in
      for (const gameId in activeGames) {
        if (activeGames[gameId].players.includes(socket)) {
          // Broadcast health update to all players in the game
          io.to(gameId).emit('healthUpdate', {
            id: targetId,
            health: targetSocket.data.health
          });
          
          // Check for death
          if (targetSocket.data.health <= 0) {
            io.to(gameId).emit('playerDeath', {
              id: targetId,
              killerId: socket.id
            });
          }
          
          break;
        }
      }
    }
  });
  
  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Remove from waiting queue if present
    const queueIndex = waitingPlayers.indexOf(socket);
    if (queueIndex !== -1) {
      waitingPlayers.splice(queueIndex, 1);
      console.log(`Removed ${socket.id} from matchmaking queue`);
    }
    
    // Clean up any games the player was in
    for (const gameId in activeGames) {
      const game = activeGames[gameId];
      const playerIndex = game.players.indexOf(socket);
      
      if (playerIndex !== -1) {
        // Notify other players in this game
        socket.to(gameId).emit('playerLeft', socket.id);
        
        // Remove this player from the game
        game.players.splice(playerIndex, 1);
        
        // If no players left, remove the game
        if (game.players.length === 0) {
          delete activeGames[gameId];
          console.log(`Game ${gameId} ended - no players left`);
        }
        // If only one player left, end the game
        else if (game.players.length === 1) {
          io.to(gameId).emit('gameEnded', {
            reason: 'opponent_left',
            winnerId: game.players[0].id
          });
          console.log(`Game ${gameId} ended - opponent left`);
        }
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});