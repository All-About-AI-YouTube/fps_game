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

// Store connected players
const players = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);
  
  // Handle player joining the game
  socket.on('playerJoin', (playerData) => {
    console.log('Player joined:', socket.id, playerData);
    
    // Store player data
    players[socket.id] = {
      id: socket.id,
      position: playerData.position,
      rotation: playerData.rotation,
      health: 100,
      team: Object.keys(players).length % 2 === 0 ? 'A' : 'B' // Alternate teams
    };
    
    // Send player their initial data
    socket.emit('playerInitialized', players[socket.id]);
    
    // Inform other players about the new player
    socket.broadcast.emit('playerJoined', players[socket.id]);
    
    // Send the new player data about all existing players
    socket.emit('currentPlayers', players);
  });
  
  // Handle player movement updates
  socket.on('playerMove', (moveData) => {
    if (players[socket.id]) {
      // Update player position and rotation
      players[socket.id].position = moveData.position;
      players[socket.id].rotation = moveData.rotation;
      
      // Broadcast to other players
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        position: moveData.position,
        rotation: moveData.rotation
      });
    }
  });
  
  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Remove player from our players object
    delete players[socket.id];
    
    // Inform other players about this player leaving
    io.emit('playerLeft', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});