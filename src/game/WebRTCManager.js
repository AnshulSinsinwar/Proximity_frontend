/**
 * WebRTC Manager for Proximity
 * Handles peer-to-peer video connections using WebRTC
 */

// Free STUN servers for NAT traversal (multiple for reliability)
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
];

// Retry settings
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

class WebRTCManager {
    constructor() {
        this.peers = new Map(); // socketId -> { connection, stream, retries }
        this.localStream = null;
        this.onRemoteStream = null; // Callback when remote stream received
        this.onPeerDisconnected = null; // Callback when peer disconnects
        this.onConnectionStateChange = null; // Callback for connection state
        this.socketManager = null;
        this.pendingCandidates = new Map(); // Store ICE candidates before connection is ready
    }

    /**
     * Initialize with local stream and socket manager
     */
    init(localStream, socketManager) {
        this.localStream = localStream;
        this.socketManager = socketManager;

        // Listen for incoming signals
        if (socketManager && socketManager.socket) {
            // Remove existing listeners first to prevent duplicates
            socketManager.socket.off('receive-signal');
            socketManager.socket.off('close-peer');
            
            socketManager.socket.on('receive-signal', this.handleReceiveSignal.bind(this));
            socketManager.socket.on('close-peer', this.handleClosePeer.bind(this));
        }

        console.log('🎥 WebRTC Manager initialized with', this.localStream?.getTracks().length, 'tracks');
    }

    /**
     * Create a peer connection and send offer (caller)
     */
    async createOffer(targetSocketId, retryCount = 0) {
        if (this.peers.has(targetSocketId)) {
            const peer = this.peers.get(targetSocketId);
            if (peer.connection.connectionState === 'connected') {
                console.log('Already connected to', targetSocketId);
                return;
            }
            // Close failed connection before retry
            this.closePeer(targetSocketId, false);
        }

        console.log('📞 Creating offer for:', targetSocketId, retryCount > 0 ? `(retry ${retryCount})` : '');

        const connection = this.createPeerConnection(targetSocketId);
        
        try {
            const offer = await connection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await connection.setLocalDescription(offer);

            // Wait for ICE gathering to complete or timeout
            await this.waitForIceGathering(connection, 3000);

            // Send offer via signaling server
            this.sendSignal(targetSocketId, {
                type: 'offer',
                sdp: connection.localDescription
            });

            // Store retry count
            const peer = this.peers.get(targetSocketId);
            if (peer) peer.retries = retryCount;

        } catch (err) {
            console.error('Failed to create offer:', err);
            
            // Retry on failure
            if (retryCount < MAX_RETRIES) {
                setTimeout(() => {
                    this.createOffer(targetSocketId, retryCount + 1);
                }, RETRY_DELAY);
            }
        }
    }

    /**
     * Wait for ICE gathering to complete
     */
    waitForIceGathering(connection, timeout = 3000) {
        return new Promise((resolve) => {
            if (connection.iceGatheringState === 'complete') {
                resolve();
                return;
            }

            const timer = setTimeout(() => {
                resolve(); // Proceed anyway after timeout
            }, timeout);

            connection.onicegatheringstatechange = () => {
                if (connection.iceGatheringState === 'complete') {
                    clearTimeout(timer);
                    resolve();
                }
            };
        });
    }

    /**
     * Handle incoming signal (offer, answer, or ICE candidate)
     */
    async handleReceiveSignal(data) {
        const { fromUserId, signal } = data;
        console.log('📨 Received signal from:', fromUserId, signal.type || 'ice-candidate');

        let peer = this.peers.get(fromUserId);
        let connection = peer?.connection;

        // If we don't have a connection yet, create one (we're the callee)
        if (!connection && signal.type === 'offer') {
            connection = this.createPeerConnection(fromUserId);
        }

        if (!connection) {
            // Store ICE candidate for later
            if (signal.type === 'ice-candidate' && signal.candidate) {
                if (!this.pendingCandidates.has(fromUserId)) {
                    this.pendingCandidates.set(fromUserId, []);
                }
                this.pendingCandidates.get(fromUserId).push(signal.candidate);
            }
            return;
        }

        try {
            if (signal.type === 'offer') {
                await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                
                // Apply pending ICE candidates
                await this.applyPendingCandidates(fromUserId, connection);
                
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);

                // Wait for ICE gathering
                await this.waitForIceGathering(connection, 3000);

                this.sendSignal(fromUserId, {
                    type: 'answer',
                    sdp: connection.localDescription
                });

            } else if (signal.type === 'answer') {
                if (connection.signalingState === 'have-local-offer') {
                    await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    // Apply pending ICE candidates
                    await this.applyPendingCandidates(fromUserId, connection);
                }

            } else if (signal.candidate) {
                if (connection.remoteDescription) {
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
            console.error('Error handling signal:', err);
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
            } catch (e) {
                console.warn('Failed to add pending ICE candidate:', e);
            }
        }
        this.pendingCandidates.delete(peerId);
    }

    /**
     * Create RTCPeerConnection with event handlers
     */
    createPeerConnection(targetSocketId) {
        const connection = new RTCPeerConnection({ 
            iceServers: ICE_SERVERS,
            iceCandidatePoolSize: 10
        });

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                connection.addTrack(track, this.localStream);
            });
        }

        // Handle ICE candidates - send as they're gathered
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
            const state = connection.connectionState;
            console.log(`🔗 Connection state (${targetSocketId.substring(0,8)}...):`, state);
            
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(targetSocketId, state);
            }

            if (state === 'failed') {
                // Retry connection
                const peer = this.peers.get(targetSocketId);
                const retries = peer?.retries || 0;
                if (retries < MAX_RETRIES) {
                    console.log('🔄 Retrying connection...');
                    this.closePeer(targetSocketId, false);
                    setTimeout(() => {
                        this.createOffer(targetSocketId, retries + 1);
                    }, RETRY_DELAY);
                }
            } else if (state === 'disconnected' || state === 'closed') {
                this.closePeer(targetSocketId, false);
            }
        };

        // Handle ICE connection state
        connection.oniceconnectionstatechange = () => {
            console.log(`🧊 ICE state (${targetSocketId.substring(0,8)}...):`, connection.iceConnectionState);
        };

        // Store peer
        this.peers.set(targetSocketId, { connection, stream: null, retries: 0 });

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
            try {
                peer.connection.close();
            } catch (e) {}
            this.peers.delete(targetSocketId);
            this.pendingCandidates.delete(targetSocketId);
            
            if (this.onPeerDisconnected) {
                this.onPeerDisconnected(targetSocketId);
            }

            // Notify remote peer
            if (notifyRemote && this.socketManager && this.socketManager.socket) {
                this.socketManager.socket.emit('close-peer', { targetSocketId });
            }

            console.log('🔴 Closed peer connection:', targetSocketId.substring(0,8) + '...');
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
        const peer = this.peers.get(socketId);
        return peer && peer.connection.connectionState === 'connected';
    }

    /**
     * Check if a peer connection exists (even if not fully connected)
     */
    hasPeer(socketId) {
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
        if (this.socketManager && this.socketManager.socket) {
            this.socketManager.socket.off('receive-signal');
            this.socketManager.socket.off('close-peer');
        }
        this.localStream = null;
        this.socketManager = null;
        console.log('🎥 WebRTC Manager destroyed');
    }
}

// Export singleton instance
export default new WebRTCManager();
