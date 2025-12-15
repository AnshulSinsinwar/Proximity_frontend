import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

// Will import Scene dynamically to avoid SSR issues if we were using it, 
// but here it keeps things cleaner.
import MainScene from '../game/scenes/MainScene';
import VideoChatOverlay from './VideoChatOverlay';

const GameMap = ({ playerName, avatarFile, avatarId }) => {
    const gameContainerRef = useRef(null);
    const gameRef = useRef(null);

    useEffect(() => {
        if (gameRef.current) return;

        // Store player data globally for Phaser to access
        window.PLAYER_DATA = {
            name: playerName,
            avatarFile: avatarFile,
            avatarId: avatarId
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
                    debug: false // Set to true to see collision boxes
                }
            },
            scene: [MainScene],
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };

        gameRef.current = new Phaser.Game(config);

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
            delete window.PLAYER_DATA;
        };
    }, [playerName, avatarFile, avatarId]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={gameContainerRef} style={{ width: '100%', height: '100%' }} />
            <VideoChatOverlay />
        </div>
    );
};

export default GameMap;
