import io from 'socket.io-client';

// Socket server URL - default: deployed backend. Override with VITE_SOCKET_URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://proximity-backend-phjg.onrender.com';

console.log('🔌 Socket URL:', SOCKET_URL);

class SocketManager {
    constructor() {
        this.socket = null;
        this.roomCode = null;
        this.token = null;
    }

    connect() {
        // Connect to backend
        this.socket = io(SOCKET_URL);

        this.socket.on('connect', () => {
            console.log('✅ Connected to socket server:', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from socket server');
        });

        this.socket.on('error', (error) => {
            console.error('🔴 Socket error:', error);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Store credentials for reconnection
    setCredentials(token, roomCode) {
        this.token = token;
        this.roomCode = roomCode;
    }

    // Join room with token (for authenticated users)
    emitJoinWithToken(token) {
        if (!this.socket) return;
        this.socket.emit('join-room', { token });
    }

    // Join room with credentials (for new joins)
    emitJoinWithRoomCode(username, avatar, roomCode) {
        if (!this.socket) return;
        this.socket.emit('join-room', { username, avatar, roomCode });
    }

    // Original join method (backwards compat, creates room)
    emitJoin(playerName, avatarFile) {
        if (!this.socket) return;
        this.socket.emit('join-room', {
            username: playerName,
            avatar: avatarFile
        });
    }

    // Send movement
    emitMove(x, y, direction, name) {
        if (!this.socket) return;
        this.socket.emit('player-move', { x, y, direction, name });
    }

    // Quit room
    emitQuitRoom() {
        if (!this.socket) return;
        this.socket.emit('quit-room');
    }

    // ============ PLAYER EVENTS ============

    onCurrentPlayers(callback) {
        if (!this.socket) return;
        this.socket.on('current-users', callback);
    }

    onNewPlayer(callback) {
        if (!this.socket) return;
        this.socket.on('new-user-joined', callback);
    }

    onPlayerMoved(callback) {
        if (!this.socket) return;
        this.socket.on('player-moved', callback);
    }

    onPlayerDisconnected(callback) {
        if (!this.socket) return;
        this.socket.on('user-left', callback);
    }

    // ============ ROOM EVENTS ============

    onRoomChanged(callback) {
        if (!this.socket) return;
        this.socket.on('room-changed', callback);
    }

    onRoomAbolished(callback) {
        if (!this.socket) return;
        this.socket.on('room-abolished', callback);
    }

    // ============ TASK EVENTS ============

    emitTaskCreate(roomCode, title, description) {
        if (!this.socket) return;
        this.socket.emit('task-create', { roomCode, title, description });
    }

    onTaskCreated(callback) {
        if (!this.socket) return;
        this.socket.on('task-created', callback);
    }

    onTaskUpdated(callback) {
        if (!this.socket) return;
        this.socket.on('task-updated', callback);
    }

    onTaskDeleted(callback) {
        if (!this.socket) return;
        this.socket.on('task-deleted', callback);
    }

    // ============ CLEANUP ============

    removeAllListeners() {
        if (!this.socket) return;
        this.socket.removeAllListeners();
    }
}

export default new SocketManager();
