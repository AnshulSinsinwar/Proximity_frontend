import React, { useEffect, useRef, useState, useCallback } from 'react';
import SocketManager from '../game/SocketManager';
import WebRTCManager from '../game/WebRTCManager';

const VideoChatOverlay = () => {
    const localVideoRef = useRef(null);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [stream, setStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [nearbyPeers, setNearbyPeers] = useState([]); // socketIds of nearby players
    const [remoteStreams, setRemoteStreams] = useState(new Map()); // socketId -> stream
    const [cameraError, setCameraError] = useState(null);
    const remoteVideoRefs = useRef(new Map()); // socketId -> video element

    // Check if we should have media active (in room OR near peers)
    const shouldHaveMedia = currentRoom || nearbyPeers.length > 0;

    // Initialize WebRTC when stream is ready
    useEffect(() => {
        if (stream && SocketManager.socket) {
            WebRTCManager.init(stream, SocketManager);

            // Handle incoming remote streams
            WebRTCManager.onRemoteStream = (socketId, remoteStream) => {
                console.log('🎥 Got remote stream from:', socketId);
                setRemoteStreams(prev => new Map(prev).set(socketId, remoteStream));
            };

            // Handle peer disconnection
            WebRTCManager.onPeerDisconnected = (socketId) => {
                console.log('🔴 Peer disconnected:', socketId);
                setRemoteStreams(prev => {
                    const next = new Map(prev);
                    next.delete(socketId);
                    return next;
                });
            };
        }

        return () => {
            WebRTCManager.destroy();
        };
    }, [stream]);

    // Connect to nearby peers
    useEffect(() => {
        if (!stream || nearbyPeers.length === 0) return;

        // Create connections to new peers
        nearbyPeers.forEach(peer => {
            const socketId = peer.socketId || peer;
            if (!WebRTCManager.isConnected(socketId) && socketId !== SocketManager.socket?.id) {
                // Only initiator (lower ID) creates offer to prevent both sides creating offers
                if (SocketManager.socket?.id < socketId) {
                    console.log('📞 Initiating call to:', socketId);
                    WebRTCManager.createOffer(socketId);
                }
            }
        });

        // Close connections to peers no longer nearby
        const nearbyIds = nearbyPeers.map(p => p.socketId || p);
        WebRTCManager.getConnectedPeers().forEach(connectedId => {
            if (!nearbyIds.includes(connectedId)) {
                WebRTCManager.closePeer(connectedId);
            }
        });
    }, [nearbyPeers, stream]);

    // Attach remote streams to video elements
    useEffect(() => {
        remoteStreams.forEach((remoteStream, socketId) => {
            const videoEl = remoteVideoRefs.current.get(socketId);
            if (videoEl && videoEl.srcObject !== remoteStream) {
                videoEl.srcObject = remoteStream;
                videoEl.play().catch(e => console.log('Remote video play error:', e));
            }
        });
    }, [remoteStreams]);

    // Start/stop media based on room OR peer proximity
    useEffect(() => {
        const startMedia = async () => {
            if (shouldHaveMedia && !stream) {
                try {
                    console.log('📹 Requesting camera/mic access...');
                    const mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
                    });
                    setStream(mediaStream);
                    setCameraError(null);
                    console.log('✅ Camera/mic started');
                } catch (err) {
                    console.error("❌ Error accessing media devices:", err);
                    setCameraError(err.name === 'NotAllowedError'
                        ? 'Camera blocked. Click 🔒 in address bar.'
                        : err.name === 'NotFoundError'
                            ? 'No camera found'
                            : 'Camera error');
                }
            }
        };

        const stopMedia = () => {
            if (!shouldHaveMedia && stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
                WebRTCManager.closeAll();
                setRemoteStreams(new Map());
                if (screenStream) {
                    screenStream.getTracks().forEach(track => track.stop());
                    setScreenStream(null);
                    setIsScreenSharing(false);
                }
            }
        };

        startMedia();
        stopMedia();
    }, [shouldHaveMedia, stream, screenStream]);

    // Attach local video stream when available
    useEffect(() => {
        if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(e => console.log('Local video play blocked:', e));
        }
    }, [stream]);

    // Listen for room changes and proximity updates
    useEffect(() => {
        const handleRoomChange = (event) => {
            const { room } = event.detail;
            console.log('🚪 Room changed to:', room);
            setCurrentRoom(room);
        };

        const handleProximity = (event) => {
            const peers = event.detail || [];
            console.log('👥 Nearby peers:', peers.length);
            setNearbyPeers(peers);
        };

        // Listen for user-joined to get socket IDs
        const handleUserJoined = (data) => {
            console.log('👤 User joined:', data);
        };

        window.addEventListener('room-change', handleRoomChange);
        window.addEventListener('proximity-update', handleProximity);

        if (SocketManager.socket) {
            SocketManager.socket.on('new-user-joined', handleUserJoined);
        }

        return () => {
            window.removeEventListener('room-change', handleRoomChange);
            window.removeEventListener('proximity-update', handleProximity);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Toggle microphone
    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    };

    // Toggle camera
    const toggleCamera = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOn(videoTrack.enabled);
            }
        }
    };

    // Request camera access
    const retryCamera = async () => {
        setCameraError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setStream(mediaStream);
        } catch (err) {
            setCameraError('Camera access denied');
        }
    };

    // Toggle screen share
    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
                setScreenStream(null);
            }
            setIsScreenSharing(false);
        } else {
            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false
                });
                setScreenStream(displayStream);
                setIsScreenSharing(true);

                displayStream.getVideoTracks()[0].onended = () => {
                    setScreenStream(null);
                    setIsScreenSharing(false);
                };
            } catch (err) {
                console.error("❌ Error sharing screen:", err);
            }
        }
    };

    // Don't render if not in a meeting room AND no nearby peers
    if (!shouldHaveMedia) {
        return null;
    }

    return (
        <div style={styles.container}>
            {/* Status Banner */}
            <div style={styles.roomBanner}>
                {currentRoom
                    ? `📍 ${currentRoom.replace('_', ' ')}`
                    : `👥 ${nearbyPeers.length} nearby`}
                {remoteStreams.size > 0 && ` • 🎥 ${remoteStreams.size} connected`}
            </div>

            {/* Video Grid */}
            <div style={styles.videoGrid}>
                {/* Screen Share (if sharing) */}
                {isScreenSharing && screenStream && (
                    <div style={styles.screenCard}>
                        <video
                            autoPlay
                            playsInline
                            muted
                            style={styles.screenVideo}
                            ref={(el) => { if (el) el.srcObject = screenStream; }}
                        />
                        <div style={styles.videoLabel}>🖥️ Your Screen</div>
                    </div>
                )}

                {/* Local Video */}
                <div style={styles.videoCard}>
                    {cameraError ? (
                        <div style={styles.errorBox} onClick={retryCamera}>
                            <span style={{ fontSize: '24px' }}>📷</span>
                            <div style={{ fontSize: '10px', marginTop: '5px' }}>{cameraError}</div>
                            <div style={{ fontSize: '9px', color: '#4a90d9' }}>Tap to retry</div>
                        </div>
                    ) : (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{
                                ...styles.video,
                                opacity: isCameraOn ? 1 : 0.3
                            }}
                        />
                    )}
                    <div style={styles.videoLabel}>You</div>
                </div>

                {/* Remote Videos */}
                {Array.from(remoteStreams.entries()).map(([socketId, remoteStream]) => (
                    <div key={socketId} style={styles.videoCard}>
                        <video
                            ref={el => {
                                if (el) {
                                    remoteVideoRefs.current.set(socketId, el);
                                    if (el.srcObject !== remoteStream) {
                                        el.srcObject = remoteStream;
                                        el.play().catch(e => console.log('Play error:', e));
                                    }
                                }
                            }}
                            autoPlay
                            playsInline
                            style={styles.video}
                        />
                        <div style={styles.videoLabel}>
                            {socketId.substring(0, 8)}...
                        </div>
                    </div>
                ))}

                {/* Placeholder for peers without streams yet */}
                {nearbyPeers
                    .filter(peer => {
                        const id = peer.socketId || peer;
                        return id !== SocketManager.socket?.id && !remoteStreams.has(id);
                    })
                    .map(peer => {
                        const id = peer.socketId || peer;
                        return (
                            <div key={id} style={styles.videoCard}>
                                <div style={styles.peerPlaceholder}>
                                    <span style={{ fontSize: '20px' }}>⏳</span>
                                    <div style={{ fontSize: '10px', marginTop: '5px' }}>Connecting...</div>
                                </div>
                                <div style={styles.videoLabel}>
                                    {typeof id === 'string' ? id.substring(0, 8) + '...' : 'Peer'}
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Media Controls */}
            <div style={styles.controls}>
                <button
                    onClick={toggleMic}
                    style={{
                        ...styles.controlBtn,
                        backgroundColor: isMicOn ? '#4a4a4a' : '#e74c3c'
                    }}
                    title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
                >
                    {isMicOn ? '🎤' : '🔇'}
                </button>

                <button
                    onClick={toggleCamera}
                    style={{
                        ...styles.controlBtn,
                        backgroundColor: isCameraOn ? '#4a4a4a' : '#e74c3c'
                    }}
                    title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                    {isCameraOn ? '📹' : '📷'}
                </button>

                <button
                    onClick={toggleScreenShare}
                    style={{
                        ...styles.controlBtn,
                        backgroundColor: isScreenSharing ? '#27ae60' : '#4a4a4a'
                    }}
                    title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                >
                    🖥️
                </button>

                <button
                    onClick={() => {
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                        } else {
                            document.documentElement.requestFullscreen();
                        }
                    }}
                    style={styles.controlBtn}
                    title="Toggle Fullscreen"
                >
                    ⛶
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
        zIndex: 9999,
    },
    roomBanner: {
        background: 'rgba(74, 144, 217, 0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    },
    videoGrid: {
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        maxWidth: '700px',
    },
    videoCard: {
        background: '#1a1a2e',
        padding: '8px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        width: '160px',
    },
    screenCard: {
        background: '#1a1a2e',
        padding: '8px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        width: '280px',
    },
    video: {
        width: '100%',
        height: '100px',
        objectFit: 'cover',
        borderRadius: '8px',
        background: '#000',
    },
    screenVideo: {
        width: '100%',
        height: '160px',
        objectFit: 'contain',
        borderRadius: '8px',
        background: '#000',
    },
    peerPlaceholder: {
        width: '100%',
        height: '100px',
        background: '#2d2d44',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.6)',
    },
    errorBox: {
        width: '100%',
        height: '100px',
        background: 'rgba(231, 76, 60, 0.2)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e74c3c',
        cursor: 'pointer',
        textAlign: 'center',
        padding: '5px',
    },
    videoLabel: {
        color: 'white',
        fontSize: '11px',
        textAlign: 'center',
        marginTop: '6px',
        fontWeight: '500',
    },
    controls: {
        display: 'flex',
        gap: '8px',
        padding: '10px 14px',
        background: 'rgba(60, 60, 80, 0.95)',
        borderRadius: '30px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
    },
    controlBtn: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        color: 'white',
    },
};

export default VideoChatOverlay;
