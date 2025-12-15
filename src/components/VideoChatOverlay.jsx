import React, { useEffect, useRef, useState } from 'react';

const VideoChatOverlay = () => {
    // This will handle the WebRTC video feeds
    const localVideoRef = useRef(null);
    const [peers, setPeers] = useState([]); // List of connected peers

    useEffect(() => {
        let stream = null;

        const startVideo = () => {
            if (peers.length > 0 && !stream) {
                navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    .then(s => {
                        stream = s;
                        if (localVideoRef.current) {
                            localVideoRef.current.srcObject = stream;
                        }
                    })
                    .catch(err => console.error("Error accessing media devices:", err));
            } else if (peers.length === 0 && stream) {
                // Stop video if no peers
                stream.getTracks().forEach(track => track.stop());
                stream = null;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = null;
                }
            }
        };

        startVideo();

        // Listen for proximity
        const handleProximity = (event) => {
            const nearbyIds = event.detail;
            setPeers(nearbyIds);
        };

        window.addEventListener('proximity-update', handleProximity);

        return () => {
            window.removeEventListener('proximity-update', handleProximity);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [peers.length]); // Re-run when peer count changes

    // Don't render anything if no peers nearby
    if (peers.length === 0) {
        return null;
    }

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'row',
            gap: '10px',
            alignItems: 'flex-end',
            pointerEvents: 'none'
        }}>
            <div style={{ pointerEvents: 'auto', background: '#000', padding: '5px', borderRadius: '8px', width: '200px' }}>
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', borderRadius: '4px' }} />
                <div style={{ color: 'white', fontSize: '12px', textAlign: 'center' }}>You</div>
            </div>

            {/* Render peers here */}
            {peers.map(peerId => (
                <div key={peerId} style={{ pointerEvents: 'auto', background: '#222', padding: '5px', borderRadius: '8px', width: '200px' }}>
                    <div style={{ width: '100%', height: '150px', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                        <span style={{ color: 'white', fontSize: '24px' }}>📷</span>
                    </div>
                    <div style={{ color: 'white', fontSize: '12px', textAlign: 'center', marginTop: '5px' }}>Connected: {peerId}</div>
                </div>
            ))}
        </div>
    );
};

export default VideoChatOverlay;
