import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import MainScene from '../game/scenes/MainScene';
import VideoChatOverlay from './VideoChatOverlay';
import KanbanOverlay from './KanbanOverlay';
import LogoutButton from './LogoutButton';

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
        };
    }, [playerName, avatarFile, avatarId, roomCode, roomName, token, isCreator, spawn]);

    return (
        <div style={styles.container}>
            {/* Game Canvas - lower z-index */}
            <div ref={gameContainerRef} style={styles.gameCanvas} />

            {/* UI Overlays Layer - higher z-index */}

            {/* Room Info Banner */}
            <div style={styles.roomBanner}>
                🏠 {roomName || 'Room'} • Code: <strong>{roomCode || 'N/A'}</strong>
            </div>

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
    }
};

export default GameMap;
