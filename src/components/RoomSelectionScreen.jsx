import React, { useState } from 'react';
import { createRoom, joinRoom } from '../services/api';

const RoomSelectionScreen = ({ playerData, onRoomJoined }) => {
    const [mode, setMode] = useState(null); // 'create' or 'join'
    const [roomName, setRoomName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateRoom = async () => {
        if (!roomName.trim()) {
            setError('Please enter a room name');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const response = await createRoom(
                playerData.name,
                playerData.avatarFile,
                roomName.trim()
            );
            onRoomJoined({
                token: response.token,
                userId: response.userId,
                roomCode: response.roomCode,
                roomName: response.roomName,
                isCreator: true,
                spawn: response.spawn,
            });
        } catch (err) {
            setError(err.error || 'Failed to create room');
            if (err.existingRoomCode) {
                setError(`You already have an active room: ${err.existingRoomCode}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!roomCode.trim()) {
            setError('Please enter a room code');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const response = await joinRoom(
                playerData.name,
                playerData.avatarFile,
                roomCode.trim().toUpperCase()
            );
            onRoomJoined({
                token: response.token,
                userId: response.userId,
                roomCode: response.roomCode,
                roomName: response.roomName,
                isCreator: false,
                spawn: response.spawn,
            });
        } catch (err) {
            setError(err.error || 'Room not found or expired');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setMode(null);
        setError('');
        setRoomName('');
        setRoomCode('');
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>🏢 Proximity</h1>
                <p style={styles.subtitle}>Welcome, {playerData.name}!</p>

                {error && (
                    <div style={styles.errorBox}>
                        ⚠️ {error}
                    </div>
                )}

                {!mode ? (
                    // Mode Selection
                    <div style={styles.buttonGroup}>
                        <button
                            onClick={() => setMode('create')}
                            style={styles.primaryButton}
                        >
                            🚀 Create Room
                        </button>
                        <button
                            onClick={() => setMode('join')}
                            style={styles.secondaryButton}
                        >
                            🔗 Join Room
                        </button>
                    </div>
                ) : mode === 'create' ? (
                    // Create Room Form
                    <div style={styles.form}>
                        <label style={styles.label}>Room Name</label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="My Awesome Office..."
                            style={styles.input}
                            maxLength={30}
                            disabled={loading}
                        />
                        <button
                            onClick={handleCreateRoom}
                            style={styles.primaryButton}
                            disabled={loading}
                        >
                            {loading ? '⏳ Creating...' : '✨ Create & Enter'}
                        </button>
                        <button
                            onClick={handleBack}
                            style={styles.backButton}
                            disabled={loading}
                        >
                            ← Back
                        </button>
                    </div>
                ) : (
                    // Join Room Form
                    <div style={styles.form}>
                        <label style={styles.label}>Room Code</label>
                        <input
                            type="text"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            placeholder="ABC123"
                            style={styles.input}
                            maxLength={6}
                            disabled={loading}
                        />
                        <button
                            onClick={handleJoinRoom}
                            style={styles.primaryButton}
                            disabled={loading}
                        >
                            {loading ? '⏳ Joining...' : '🚪 Join Room'}
                        </button>
                        <button
                            onClick={handleBack}
                            style={styles.backButton}
                            disabled={loading}
                        >
                            ← Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    card: {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '420px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    title: {
        color: '#fff',
        fontSize: '2.2rem',
        margin: '0 0 5px 0',
        textAlign: 'center',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '1rem',
        margin: '0 0 25px 0',
        textAlign: 'center',
    },
    buttonGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    primaryButton: {
        width: '100%',
        padding: '14px',
        fontSize: '1rem',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
        color: '#fff',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 4px 15px rgba(74, 144, 217, 0.4)',
    },
    secondaryButton: {
        width: '100%',
        padding: '14px',
        fontSize: '1rem',
        fontWeight: 'bold',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '10px',
        background: 'transparent',
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    backButton: {
        width: '100%',
        padding: '12px',
        fontSize: '0.9rem',
        border: 'none',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'rgba(255, 255, 255, 0.7)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    label: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '0.9rem',
    },
    input: {
        width: '100%',
        padding: '12px 15px',
        fontSize: '1rem',
        border: 'none',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        outline: 'none',
        boxSizing: 'border-box',
    },
    errorBox: {
        background: 'rgba(231, 76, 60, 0.2)',
        border: '1px solid rgba(231, 76, 60, 0.5)',
        borderRadius: '10px',
        padding: '12px',
        marginBottom: '15px',
        color: '#e74c3c',
        fontSize: '0.9rem',
        textAlign: 'center',
    },
};

export default RoomSelectionScreen;
