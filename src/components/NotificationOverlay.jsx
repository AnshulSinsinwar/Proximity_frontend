import React, { useState, useEffect, useCallback } from 'react';
import SocketManager from '../game/SocketManager';

/**
 * Toast Notification Overlay
 * Shows notifications for user join/leave events
 */
const NotificationOverlay = () => {
    const [notifications, setNotifications] = useState([]);

    // Add notification
    const addNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    }, []);

    // Listen for socket events
    useEffect(() => {
        if (!SocketManager.socket) return;

        // User joined
        const handleUserJoined = (data) => {
            const name = data.username || data.name || 'Someone';
            addNotification(`👋 ${name} joined the room`, 'join');
        };

        // User left
        const handleUserLeft = (data) => {
            const name = typeof data === 'object' ? (data.username || 'Someone') : 'Someone';
            const workTime = typeof data === 'object' ? data.workTime : null;
            const msg = workTime
                ? `👋 ${name} left (${workTime})`
                : `👋 ${name} left the room`;
            addNotification(msg, 'leave');
        };

        SocketManager.socket.on('new-user-joined', handleUserJoined);
        SocketManager.socket.on('user-left', handleUserLeft);

        return () => {
            SocketManager.socket.off('new-user-joined', handleUserJoined);
            SocketManager.socket.off('user-left', handleUserLeft);
        };
    }, [addNotification]);

    if (notifications.length === 0) return null;

    return (
        <div style={styles.container}>
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    style={{
                        ...styles.toast,
                        ...(notification.type === 'join' ? styles.joinToast : styles.leaveToast)
                    }}
                >
                    {notification.message}
                </div>
            ))}
        </div>
    );
};

const styles = {
    container: {
        position: 'absolute',
        top: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9998,
        pointerEvents: 'none',
    },
    toast: {
        padding: '12px 24px',
        borderRadius: '25px',
        fontSize: '14px',
        fontFamily: "'Segoe UI', sans-serif",
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        animation: 'slideIn 0.3s ease-out',
        whiteSpace: 'nowrap',
    },
    joinToast: {
        background: 'rgba(39, 174, 96, 0.9)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.2)',
    },
    leaveToast: {
        background: 'rgba(231, 76, 60, 0.9)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.2)',
    },
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(styleSheet);

export default NotificationOverlay;
