import io from 'socket.io-client';

class SocketManager {
    constructor() {
        this.socket = null;
    }

    connect() {
        // Connect to backend on port 3000
        this.socket = io('http://localhost:3000');

        this.socket.on('connect', () => {
            console.log('Connected to socket server:', this.socket.id);
        });
    }

    // Send player info when joining (matches backend 'join-room' event)
    emitJoin(playerName, avatarFile) {
        if (!this.socket) return;
        this.socket.emit('join-room', { 
            username: playerName, 
            avatar: avatarFile
        });
    }

    // Send movement (matches backend 'player-move' event)
    emitMove(x, y, direction, name) {
        if (!this.socket) return;
        this.socket.emit('player-move', { x, y, direction, name });
    }

    // Listen for new player joining (backend sends 'new-user-joined')
    onNewPlayer(callback) {
        if (!this.socket) return;
        this.socket.on('new-user-joined', callback);
    }

    // Listen for player movement (backend sends 'player-moved')
    onPlayerMoved(callback) {
        if (!this.socket) return;
        this.socket.on('player-moved', callback);
    }
    
    // Listen for player disconnect (backend sends 'user-left')
    onPlayerDisconnected(callback) {
        if (!this.socket) return;
        this.socket.on('user-left', callback);
    }
    
    // Listen for current players list (backend sends 'current-users')
    onCurrentPlayers(callback) {
        if (!this.socket) return;
        this.socket.on('current-users', callback);
    }
}

export default new SocketManager();
