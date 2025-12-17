import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import MainScene from '../game/scenes/MainScene';
import VideoChatOverlay from './VideoChatOverlay';
import KanbanOverlay from './KanbanOverlay';
import LogoutButton from './LogoutButton';
import NotificationOverlay from './NotificationOverlay';

const GameMap = ({
    playerName,
    avatarFile,
    avatarId,
    roomCode,
    roomName,
    token,
    isCreator,
    spawn,
    onLogout
}) => {
    const gameContainerRef = useRef(null);
    const gameRef = useRef(null);
    const [showKanban, setShowKanban] = useState(false);

    useEffect(() => {
        if (gameRef.current) return;

        // Store all game data globally for Phaser to access
        window.PLAYER_DATA = {
            name: playerName,
            avatarFile: avatarFile,
            avatarId: avatarId
        };

        window.ROOM_DATA = {
            roomCode: roomCode,
            roomName: roomName,
            token: token,
            isCreator: isCreator,
            spawn: spawn
        };

        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: gameContainerRef.current,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: [MainScene],
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };

        gameRef.current = new Phaser.Game(config);
        
        // Expose game globally so overlays can disable keyboard input
        window.PHASER_GAME = gameRef.current;

        // Listen for kanban zone events from Phaser
        const handleKanbanZone = (event) => {
            setShowKanban(event.detail.inZone);
        };
        window.addEventListener('kanban-zone-change', handleKanbanZone);

        return () => {
            window.removeEventListener('kanban-zone-change', handleKanbanZone);
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
            delete window.PLAYER_DATA;
            delete window.ROOM_DATA;
            delete window.PHASER_GAME;
        };
    }, [playerName, avatarFile, avatarId, roomCode, roomName, token, isCreator, spawn]);

    return (
        <div style={styles.container}>
            {/* Game Canvas - lower z-index */}
            <div ref={gameContainerRef} style={styles.gameCanvas} />

            {/* Room Info Banner */}
            <div style={styles.roomBanner}>
                🏠 {roomName || 'Room'} • Code: <strong>{roomCode || 'N/A'}</strong>
            </div>

            {/* Notification Overlay - for join/leave toasts */}
            <NotificationOverlay />

            {/* Kanban Toggle Button - Top Right */}
            <button
                onClick={() => setShowKanban(!showKanban)}
                style={{
                    ...styles.kanbanBtn,
                    background: showKanban ? '#27ae60' : 'rgba(74, 144, 217, 0.9)'
                }}
                title="Open Kanban Board"
            >
                📋
            </button>

            {/* Video Chat Overlay */}
            <VideoChatOverlay />

            {/* Kanban Board Overlay */}
            {showKanban && (
                <KanbanOverlay
                    roomCode={roomCode}
                    token={token}
                    onClose={() => setShowKanban(false)}
                />
            )}

            {/* Logout Button */}
            <LogoutButton
                token={token}
                isCreator={isCreator}
                roomCode={roomCode}
                username={playerName}
                onLogout={onLogout}
            />
        </div>
    );
};

const styles = {
    container: {
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    gameCanvas: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
    },
    roomBanner: {
        position: 'absolute',
        top: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '25px',
        fontSize: '14px',
        fontFamily: "'Segoe UI', sans-serif",
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: 9999,
        border: '1px solid rgba(255,255,255,0.15)',
    },
    kanbanBtn: {
        position: 'absolute',
        top: '15px',
        right: '20px',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        fontSize: '22px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s, background 0.2s',
    },
};

export default GameMap;
