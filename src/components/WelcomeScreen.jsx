import React, { useState } from 'react';

const AVATARS = [
    { id: 'Male 01-1', file: 'Male 01-1.png', label: 'Male 1' },
    { id: 'Male 02-3', file: 'Male 02-3.png', label: 'Male 2' },
    { id: 'Male 03-1', file: 'Male 03-1.png', label: 'Male 3' },
    { id: 'Male 04-4', file: 'Male 04-4.png', label: 'Male 4' },
    { id: 'Male 08-1', file: 'Male 08-1.png', label: 'Male 5' },
    { id: 'su1 Student male 06', file: 'su1 Student male 06.png', label: 'Student M' },
    { id: 'su2 Student fmale 10', file: 'su2 Student fmale 10.png', label: 'Student F' },
];

const WelcomeScreen = ({ onJoin }) => {
    const [name, setName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);

    const handleJoin = () => {
        if (name.trim().length === 0) {
            alert('Please enter your name!');
            return;
        }
        const avatar = AVATARS.find(a => a.id === selectedAvatar);
        onJoin({ name: name.trim(), avatarFile: avatar.file, avatarId: avatar.id });
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>🏢 Proximity</h1>
                <p style={styles.subtitle}>Virtual Office Space</p>

                {/* Name Input */}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Your Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name..."
                        style={styles.input}
                        maxLength={15}
                    />
                </div>

                {/* Avatar Selection */}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Choose Avatar</label>
                    <div style={styles.avatarGrid}>
                        {AVATARS.map((avatar) => (
                            <div
                                key={avatar.id}
                                onClick={() => setSelectedAvatar(avatar.id)}
                                style={{
                                    ...styles.avatarOption,
                                    border: selectedAvatar === avatar.id ? '3px solid #4a90d9' : '3px solid transparent',
                                    background: selectedAvatar === avatar.id ? 'rgba(74, 144, 217, 0.2)' : 'rgba(255,255,255,0.1)',
                                }}
                            >
                                <img
                                    src={`/assets/${avatar.file}`}
                                    alt={avatar.label}
                                    style={styles.avatarImage}
                                />
                                <span style={styles.avatarLabel}>{avatar.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Join Button */}
                <button onClick={handleJoin} style={styles.joinButton}>
                    Join Office 🚀
                </button>
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
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    title: {
        color: '#fff',
        fontSize: '2.5rem',
        margin: '0 0 5px 0',
        textAlign: 'center',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '1rem',
        margin: '0 0 30px 0',
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: '25px',
    },
    label: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '0.9rem',
        marginBottom: '8px',
        display: 'block',
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
    avatarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
    },
    avatarOption: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    avatarImage: {
        width: '48px',
        height: '64px',
        objectFit: 'cover',
        objectPosition: '0 0',
        imageRendering: 'pixelated',
    },
    avatarLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.7rem',
        marginTop: '5px',
        textAlign: 'center',
    },
    joinButton: {
        width: '100%',
        padding: '15px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
        color: '#fff',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 4px 15px rgba(74, 144, 217, 0.4)',
    },
};

export default WelcomeScreen;
