/**
 * Manages the matchmaking lobby UI and flow
 */
export function setupLobby(socket) {
    // Create lobby UI elements
    const lobbyElement = document.createElement('div');
    lobbyElement.className = 'lobby';
    lobbyElement.innerHTML = `
        <div class="lobby-content">
            <h1>FPS Game Matchmaking</h1>
            <div class="lobby-status">
                <p>Find an opponent to play against!</p>
                <div id="statusMessage">Ready to join matchmaking.</div>
            </div>
            <div class="lobby-actions">
                <button id="findMatchBtn" class="lobby-btn">Find Match</button>
                <button id="cancelMatchBtn" class="lobby-btn" style="display: none;">Cancel</button>
            </div>
            <div id="matchCountdown" class="match-countdown" style="display: none;">
                <h2>Match Found!</h2>
                <p>Game starting in <span id="countdownTimer">5</span> seconds...</p>
                <div class="player-info">
                    <div class="team team-a">Team A</div>
                    <div class="team team-b">Team B</div>
                </div>
            </div>
        </div>
    `;

    // Add styles for the lobby
    const style = document.createElement('style');
    style.textContent = `
        .lobby {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: Arial, sans-serif;
        }
        .lobby-content {
            background-color: rgba(51, 51, 51, 0.8);
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        .lobby-status {
            margin: 20px 0;
            font-size: 18px;
        }
        .lobby-actions {
            margin: 30px 0;
        }
        .lobby-btn {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            margin: 0 10px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .lobby-btn:hover {
            background-color: #45a049;
        }
        #cancelMatchBtn {
            background-color: #f44336;
        }
        #cancelMatchBtn:hover {
            background-color: #d32f2f;
        }
        .match-countdown {
            margin-top: 20px;
        }
        #countdownTimer {
            font-size: 24px;
            font-weight: bold;
        }
        .player-info {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
        }
        .team {
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
        }
        .team-a {
            background-color: #2196F3;
        }
        .team-b {
            background-color: #FF5722;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(lobbyElement);

    // Get UI elements
    const findMatchBtn = document.getElementById('findMatchBtn');
    const cancelMatchBtn = document.getElementById('cancelMatchBtn');
    const statusMessage = document.getElementById('statusMessage');
    const matchCountdown = document.getElementById('matchCountdown');
    const countdownTimer = document.getElementById('countdownTimer');

    // Handle find match button
    findMatchBtn.addEventListener('click', () => {
        socket.emit('joinMatchmaking');
        statusMessage.textContent = 'Searching for opponent...';
        findMatchBtn.style.display = 'none';
        cancelMatchBtn.style.display = 'inline-block';
    });

    // Handle cancel match button
    cancelMatchBtn.addEventListener('click', () => {
        socket.emit('cancelMatchmaking');
        statusMessage.textContent = 'Matchmaking canceled.';
        findMatchBtn.style.display = 'inline-block';
        cancelMatchBtn.style.display = 'none';
    });

    // Listen for matchmaking status updates
    socket.on('matchmakingStatus', (data) => {
        statusMessage.textContent = `Position in queue: ${data.position} - Players waiting: ${data.playersWaiting}`;
    });

    // Listen for match found
    socket.on('gameMatched', (data) => {
        statusMessage.textContent = 'Match found!';
        findMatchBtn.style.display = 'none';
        cancelMatchBtn.style.display = 'none';
        matchCountdown.style.display = 'block';
        
        // Start countdown
        let seconds = data.countdown;
        countdownTimer.textContent = seconds;
        
        const countdownInterval = setInterval(() => {
            seconds--;
            countdownTimer.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    });

    // Listen for game start
    socket.on('gameStart', () => {
        // Hide the lobby
        lobbyElement.style.display = 'none';
        
        // Initialize game with current player position
        socket.emit('playerJoin', {
            position: [0, 0, 0], // Will be overridden by the game
            rotation: 0
        });
    });

    // Listen for game ended
    socket.on('gameEnded', (data) => {
        // Show lobby again
        lobbyElement.style.display = 'flex';
        matchCountdown.style.display = 'none';
        findMatchBtn.style.display = 'inline-block';
        
        if (data.reason === 'opponent_left') {
            statusMessage.textContent = 'Your opponent left the game. You win!';
        } else {
            statusMessage.textContent = 'Game ended. Ready for a new match?';
        }
    });

    return {
        show: () => {
            lobbyElement.style.display = 'flex';
        },
        hide: () => {
            lobbyElement.style.display = 'none';
        }
    };
}