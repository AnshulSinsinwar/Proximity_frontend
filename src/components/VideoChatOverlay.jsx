import React, { useEffect, useRef, useState } from 'react';

const VideoChatOverlay = () => {
    const localVideoRef = useRef(null);
    const screenVideoRef = useRef(null);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [stream, setStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [peers, setPeers] = useState([]);

    // Start/stop media based on room entry
    useEffect(() => {
        const startMedia = async () => {
            if (currentRoom && !stream) {
                try {
                    const mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
                    });
                    setStream(mediaStream);
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = mediaStream;
                    }
                    console.log('📹 Media started for room:', currentRoom);
                } catch (err) {
                    console.error("❌ Error accessing media devices:", err);
                }
            }
        };

        const stopMedia = () => {
            if (!currentRoom && stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = null;
                }
                // Also stop screen share
                if (screenStream) {
                    screenStream.getTracks().forEach(track => track.stop());
                    setScreenStream(null);
                    setIsScreenSharing(false);
                }
                console.log('📹 Media stopped - left room');
            }
        };

        startMedia();
        stopMedia();
    }, [currentRoom, stream, screenStream]);

    // Listen for room changes from Phaser
    useEffect(() => {
        const handleRoomChange = (event) => {
            const { room } = event.detail;
            console.log('🚪 Room changed to:', room);
            setCurrentRoom(room);
        };

        const handleProximity = (event) => {
            setPeers(event.detail);
        };

        window.addEventListener('room-change', handleRoomChange);
        window.addEventListener('proximity-update', handleProximity);

        return () => {
            window.removeEventListener('room-change', handleRoomChange);
            window.removeEventListener('proximity-update', handleProximity);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream, screenStream]);

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

    // Toggle screen share
    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop screen sharing
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
                setScreenStream(null);
            }
            setIsScreenSharing(false);
        } else {
            // Start screen sharing
            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });
                setScreenStream(displayStream);
                setIsScreenSharing(true);

                // Listen for when user stops sharing via browser UI
                displayStream.getVideoTracks()[0].onended = () => {
                    setScreenStream(null);
                    setIsScreenSharing(false);
                };
            } catch (err) {
                console.error("❌ Error sharing screen:", err);
            }
        }
    };

    // Don't render if not in a meeting room and no nearby peers
    if (!currentRoom && peers.length === 0) {
        return null;
    }

    return (
        <div style={styles.container}>
            {/* Room Banner */}
            {currentRoom && (
                <div style={styles.roomBanner}>
                    📍 {currentRoom.replace('_', ' ')}
                </div>
            )}

            {/* Video Grid */}
            <div style={styles.videoGrid}>
                {/* Screen Share Video */}
                {isScreenSharing && screenStream && (
                    <div style={styles.screenCard}>
                        <video
                            ref={screenVideoRef}
                            autoPlay
                            playsInline
                            style={styles.screenVideo}
                            ref={(el) => { if (el) el.srcObject = screenStream; }}
                        />
                        <div style={styles.videoLabel}>🖥️ Your Screen</div>
                    </div>
                )}

                {/* Local Video */}
                <div style={styles.videoCard}>
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
                    <div style={styles.videoLabel}>You</div>
                </div>

                {/* Peer Videos */}
                {peers.map(peerId => (
                    <div key={peerId} style={styles.videoCard}>
                        <div style={styles.peerPlaceholder}>
                            <span style={{ fontSize: '32px' }}>👤</span>
                        </div>
                        <div style={styles.videoLabel}>
                            {peerId.substring(0, 8)}...
                        </div>
                    </div>
                ))}
            </div>

            {/* Media Controls - Always visible when in room or with peers */}
            <div style={styles.controls}>
                {/* Mic Toggle */}
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

                {/* Camera Toggle */}
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

                {/* Screen Share Toggle */}
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

                {/* Full Screen (placeholder for now) */}
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
        zIndex: 1000,
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
        maxWidth: '600px',
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
        alignItems: 'center',
        justifyContent: 'center',
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
