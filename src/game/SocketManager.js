import io from 'socket.io-client';

const URL = 'https://github.com/J-anubhav/Proximity_backend.git'; 
// Wait, user gave github URL as backend HOST? That's likely the repo. 
// They probably mean "hosted at... (deployment URL)" or they just gave the repo.
// I should assume localhost:??? or ask the user for the socket URL if the github link is just code.
// The prompted said: "Backend: Fully ready and hosted at: https://github.com/J-anubhav/Proximity_backend.git". 
// This is clearly a git repo. It is NOT a deployed URL. 
// I will assume localhost:5000 for now or similar, and add a comment.

class SocketManager {
    constructor() {
        this.socket = null;
    }

    connect() {
        this.socket = io('http://localhost:5000'); // Default to localhost

        this.socket.on('connect', () => {
            console.log('Connected to socket server:', this.socket.id);
        });
    }

    emitMove(x, y, anim) {
        if (!this.socket) return;
        this.socket.emit('playerMovement', { x, y, anim }); // Event name depends on backend
    }

    onNewPlayer(callback) {
        if (!this.socket) return;
        this.socket.on('newPlayer', callback);
    }

    onPlayerMoved(callback) {
        if (!this.socket) return;
        this.socket.on('playerMoved', callback);
    }
    
    onPlayerDisconnected(callback) {
        if (!this.socket) return;
        this.socket.on('playerDisconnected', callback);
    }
    
    onCurrentPlayers(callback) {
        if (!this.socket) return;
        this.socket.on('currentPlayers', callback); // Initial sync
    }
}

export default new SocketManager();
