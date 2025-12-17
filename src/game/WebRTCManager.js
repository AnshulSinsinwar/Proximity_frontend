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
        this.peers = new Map(); // socketId -> { connection, stream, senders }
        this.localStream = null;
        this.onRemoteStream = null;
        this.onPeerDisconnected = null;
        this.socketManager = null;
        this.pendingCandidates = new Map();
        this.isNegotiating = new Map(); // Prevent negotiation collision
    }

    /**
     * Initialize with local stream and socket manager
     */
    init(localStream, socketManager) {
        this.localStream = localStream;
        this.socketManager = socketManager;

        if (socketManager && socketManager.socket) {
            // Remove existing listeners first
            socketManager.socket.off('receive-signal');
            socketManager.socket.off('close-peer');

            socketManager.socket.on('receive-signal', this.handleReceiveSignal.bind(this));
            socketManager.socket.on('close-peer', this.handleClosePeer.bind(this));
        }

        console.log('🎥 WebRTC Manager initialized');
    }

    /**
     * Create a peer connection and send offer (caller)
     */
    async createOffer(targetSocketId) {
        // Don't create if already exists and connected
        if (this.peers.has(targetSocketId)) {
            const peer = this.peers.get(targetSocketId);
            const state = peer.connection.connectionState;
            if (state === 'connected' || state === 'connecting') {
                return;
            }
            // Close broken connection
            this.closePeer(targetSocketId, false);
        }

        // Check if already negotiating
        if (this.isNegotiating.get(targetSocketId)) {
            console.log('⏳ Already negotiating with', targetSocketId);
            return;
        }
        this.isNegotiating.set(targetSocketId, true);

        console.log('📞 Creating offer for:', targetSocketId.substring(0, 8) + '...');

        const connection = this.createPeerConnection(targetSocketId);

        try {
            const offer = await connection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            // Check state before setting
            if (connection.signalingState !== 'stable') {
                console.log('⚠️ Connection not stable, skipping offer');
                this.isNegotiating.set(targetSocketId, false);
                return;
            }

            await connection.setLocalDescription(offer);

            this.sendSignal(targetSocketId, {
                type: 'offer',
                sdp: connection.localDescription
            });

        } catch (err) {
            console.error('Failed to create offer:', err);
        } finally {
            this.isNegotiating.set(targetSocketId, false);
        }
    }

    /**
     * Handle incoming signal (offer, answer, or ICE candidate)
     */
    async handleReceiveSignal(data) {
        const { fromUserId, signal } = data;

        let peer = this.peers.get(fromUserId);
        let connection = peer?.connection;

        try {
            if (signal.type === 'offer') {
                console.log('📨 Received offer from:', fromUserId.substring(0, 8) + '...');

                // If we already have a connection, handle collision
                if (connection) {
                    const isPolite = this.socketManager.socket?.id > fromUserId;

                    if (!isPolite && connection.signalingState !== 'stable') {
                        console.log('🔄 Ignoring offer - we are impolite and already negotiating');
                        return;
                    }

                    // Close existing and recreate
                    this.closePeer(fromUserId, false);
                }

                // Create new connection
                connection = this.createPeerConnection(fromUserId);

                await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));

                // Apply pending ICE candidates
                await this.applyPendingCandidates(fromUserId, connection);

                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);

                this.sendSignal(fromUserId, {
                    type: 'answer',
                    sdp: connection.localDescription
                });

            } else if (signal.type === 'answer') {
                console.log('📨 Received answer from:', fromUserId.substring(0, 8) + '...');

                if (!connection) {
                    console.warn('No connection for answer');
                    return;
                }

                // Only set if we're expecting an answer
                if (connection.signalingState === 'have-local-offer') {
                    await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    await this.applyPendingCandidates(fromUserId, connection);
                } else {
                    console.log('⚠️ Ignoring answer - wrong state:', connection.signalingState);
                }

            } else if (signal.candidate) {
                if (connection && connection.remoteDescription) {
                    await connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } else {
                    // Store for later
                    if (!this.pendingCandidates.has(fromUserId)) {
                        this.pendingCandidates.set(fromUserId, []);
                    }
                    this.pendingCandidates.get(fromUserId).push(signal.candidate);
                }
            }
        } catch (err) {
            console.error('Error handling signal:', err.message);
        }
    }

    /**
     * Apply pending ICE candidates
     */
    async applyPendingCandidates(peerId, connection) {
        const candidates = this.pendingCandidates.get(peerId) || [];
        for (const candidate of candidates) {
            try {
                await connection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) { }
        }
        this.pendingCandidates.delete(peerId);
    }

    /**
     * Create RTCPeerConnection with event handlers
     */
    createPeerConnection(targetSocketId) {
        const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        const senders = [];

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                const sender = connection.addTrack(track, this.localStream);
                senders.push(sender);
            });
        }

        // Handle ICE candidates
        connection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(targetSocketId, {
                    type: 'ice-candidate',
                    candidate: event.candidate.toJSON()
                });
            }
        };

        // Handle incoming stream
        connection.ontrack = (event) => {
            console.log('🎥 Remote stream received from:', targetSocketId.substring(0, 8) + '...');
            const remoteStream = event.streams[0];

            const peer = this.peers.get(targetSocketId);
            if (peer) {
                peer.stream = remoteStream;
            }

            if (this.onRemoteStream) {
                this.onRemoteStream(targetSocketId, remoteStream);
            }
        };

        // Handle connection state changes
        connection.onconnectionstatechange = () => {
            const state = connection.connectionState;
            console.log(`🔗 Connection (${targetSocketId.substring(0, 8)}...):`, state);

            if (state === 'connected') {
                console.log('✅ Peer connected:', targetSocketId.substring(0, 8) + '...');
            } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                this.closePeer(targetSocketId, false);
            }
        };

        // Store peer with senders for track replacement
        this.peers.set(targetSocketId, { connection, stream: null, senders });

        return connection;
    }

    /**
     * Replace video track (for screen sharing)
     */
    async replaceVideoTrack(newVideoTrack) {
        for (const [socketId, peer] of this.peers) {
            const videoSender = peer.senders.find(s => s.track?.kind === 'video');
            if (videoSender && newVideoTrack) {
                try {
                    await videoSender.replaceTrack(newVideoTrack);
                    console.log('🔄 Replaced video track for:', socketId.substring(0, 8) + '...');
                } catch (err) {
                    console.error('Failed to replace track:', err);
                }
            }
        }
    }

    /**
     * Update track enabled state (for mute/camera toggle)
     */
    updateTrackEnabled(kind, enabled) {
        if (this.localStream) {
            const tracks = kind === 'audio'
                ? this.localStream.getAudioTracks()
                : this.localStream.getVideoTracks();
            tracks.forEach(track => {
                track.enabled = enabled;
            });
        }
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
        this.closePeer(fromUserId, false);
    }

    /**
     * Close connection to a peer
     */
    closePeer(targetSocketId, notifyRemote = true) {
        const peer = this.peers.get(targetSocketId);
        if (peer) {
            try { peer.connection.close(); } catch (e) { }
            this.peers.delete(targetSocketId);
            this.pendingCandidates.delete(targetSocketId);
            this.isNegotiating.delete(targetSocketId);

            if (this.onPeerDisconnected) {
                this.onPeerDisconnected(targetSocketId);
            }

            if (notifyRemote && this.socketManager?.socket) {
                this.socketManager.socket.emit('close-peer', { targetSocketId });
            }

            console.log('🔴 Closed peer:', targetSocketId.substring(0, 8) + '...');
        }
    }

    closeAll() {
        this.peers.forEach((_, socketId) => this.closePeer(socketId, true));
    }

    getConnectedPeers() {
        return Array.from(this.peers.keys());
    }

    isConnected(socketId) {
        const peer = this.peers.get(socketId);
        return peer?.connection.connectionState === 'connected';
    }

    hasPeer(socketId) {
        return this.peers.has(socketId);
    }

    getRemoteStream(socketId) {
        return this.peers.get(socketId)?.stream || null;
    }

    destroy() {
        this.closeAll();
        if (this.socketManager?.socket) {
            this.socketManager.socket.off('receive-signal');
            this.socketManager.socket.off('close-peer');
        }
        this.localStream = null;
        this.socketManager = null;
    }
}

export default new WebRTCManager();
