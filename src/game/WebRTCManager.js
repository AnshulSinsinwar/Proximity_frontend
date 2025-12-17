/**
 * WebRTC Manager for Proximity
 * Handles peer-to-peer video connections using WebRTC
 */

// Free STUN servers for NAT traversal
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
];

class WebRTCManager {
    constructor() {
        this.peers = new Map(); // socketId -> { connection, stream }
        this.localStream = null;
        this.onRemoteStream = null; // Callback when remote stream received
        this.onPeerDisconnected = null; // Callback when peer disconnects
        this.socketManager = null;
    }

    /**
     * Initialize with local stream and socket manager
     */
    init(localStream, socketManager) {
        this.localStream = localStream;
        this.socketManager = socketManager;

        // Listen for incoming signals
        if (socketManager && socketManager.socket) {
            socketManager.socket.on('receive-signal', this.handleReceiveSignal.bind(this));
            socketManager.socket.on('close-peer', this.handleClosePeer.bind(this));
        }

        console.log('🎥 WebRTC Manager initialized');
    }

    /**
     * Create a peer connection and send offer (caller)
     */
    async createOffer(targetSocketId) {
        if (this.peers.has(targetSocketId)) {
            console.log('Already connected to', targetSocketId);
            return;
        }

        console.log('📞 Creating offer for:', targetSocketId);

        const connection = this.createPeerConnection(targetSocketId);

        try {
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);

            // Send offer via signaling server
            this.sendSignal(targetSocketId, {
                type: 'offer',
                sdp: connection.localDescription
            });
        } catch (err) {
            console.error('Failed to create offer:', err);
        }
    }

    /**
     * Handle incoming signal (offer, answer, or ICE candidate)
     */
    async handleReceiveSignal(data) {
        const { fromUserId, signal } = data;
        console.log('📨 Received signal from:', fromUserId, signal.type || 'ice-candidate');

        let connection = this.peers.get(fromUserId)?.connection;

        // If we don't have a connection yet, create one (we're the callee)
        if (!connection && signal.type === 'offer') {
            connection = this.createPeerConnection(fromUserId);
        }

        if (!connection) {
            console.warn('No connection for signal from', fromUserId);
            return;
        }

        try {
            if (signal.type === 'offer') {
                await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);

                this.sendSignal(fromUserId, {
                    type: 'answer',
                    sdp: connection.localDescription
                });
            } else if (signal.type === 'answer') {
                await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            } else if (signal.candidate) {
                await connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
        } catch (err) {
            console.error('Error handling signal:', err);
        }
    }

    /**
     * Create RTCPeerConnection with event handlers
     */
    createPeerConnection(targetSocketId) {
        const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                connection.addTrack(track, this.localStream);
            });
        }

        // Handle ICE candidates
        connection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(targetSocketId, {
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };

        // Handle incoming stream
        connection.ontrack = (event) => {
            console.log('🎥 Remote stream received from:', targetSocketId);
            const remoteStream = event.streams[0];

            // Update peer data
            const peer = this.peers.get(targetSocketId);
            if (peer) {
                peer.stream = remoteStream;
            }

            // Notify callback
            if (this.onRemoteStream) {
                this.onRemoteStream(targetSocketId, remoteStream);
            }
        };

        // Handle connection state changes
        connection.onconnectionstatechange = () => {
            console.log(`Connection state (${targetSocketId}):`, connection.connectionState);
            if (connection.connectionState === 'disconnected' ||
                connection.connectionState === 'failed' ||
                connection.connectionState === 'closed') {
                this.closePeer(targetSocketId, false);
            }
        };

        // Store peer
        this.peers.set(targetSocketId, { connection, stream: null });

        return connection;
    }

    /**
     * Send signal to peer via socket
     */
    sendSignal(targetSocketId, signal) {
        if (this.socketManager && this.socketManager.socket) {
            this.socketManager.socket.emit('send-signal', {
                targetSocketId,
                signal
            });
        }
    }

    /**
     * Handle close-peer event from server
     */
    handleClosePeer(data) {
        const { fromUserId } = data;
        console.log('📴 Peer close signal from:', fromUserId);
        this.closePeer(fromUserId, false);
    }

    /**
     * Close connection to a peer
     */
    closePeer(targetSocketId, notifyRemote = true) {
        const peer = this.peers.get(targetSocketId);
        if (peer) {
            peer.connection.close();
            this.peers.delete(targetSocketId);

            if (this.onPeerDisconnected) {
                this.onPeerDisconnected(targetSocketId);
            }

            // Notify remote peer
            if (notifyRemote && this.socketManager && this.socketManager.socket) {
                this.socketManager.socket.emit('close-peer', { targetSocketId });
            }

            console.log('🔴 Closed peer connection:', targetSocketId);
        }
    }

    /**
     * Close all peer connections
     */
    closeAll() {
        this.peers.forEach((peer, socketId) => {
            this.closePeer(socketId, true);
        });
    }

    /**
     * Get all connected peer socket IDs
     */
    getConnectedPeers() {
        return Array.from(this.peers.keys());
    }

    /**
     * Check if connected to a specific peer
     */
    isConnected(socketId) {
        return this.peers.has(socketId);
    }

    /**
     * Get remote stream for a peer
     */
    getRemoteStream(socketId) {
        return this.peers.get(socketId)?.stream || null;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.closeAll();
        this.localStream = null;
        this.socketManager = null;
        console.log('🎥 WebRTC Manager destroyed');
    }
}

// Export singleton instance
export default new WebRTCManager();
