import React, { useState } from 'react';
import { logout, abolishRoom } from '../services/api';

const LogoutButton = ({ token, isCreator, roomCode, username, onLogout }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showWorkTime, setShowWorkTime] = useState(false);
    const [workTimeData, setWorkTimeData] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            const response = await logout(token);
            setWorkTimeData(response);
            setShowWorkTime(true);
            setShowMenu(false);
        } catch (err) {
            console.error('Failed to logout:', err);
            onLogout(); // Still logout on error
        } finally {
            setLoading(false);
        }
    };

    const handleAbolish = async () => {
        if (!window.confirm('Are you sure you want to abolish this room? All users will be kicked.')) {
            return;
        }
        setLoading(true);
        try {
            await abolishRoom(token);
            onLogout();
        } catch (err) {
            console.error('Failed to abolish room:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleWorkTimeClose = () => {
        setShowWorkTime(false);
        onLogout();
    };

    return (
        <>
            {/* Logout Button */}
            <div style={styles.container}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    style={styles.logoutBtn}
                    disabled={loading}
                >
                    {loading ? '⏳' : '🚪'}
                </button>

                {/* Menu Popup */}
                {showMenu && (
                    <div style={styles.menu}>
                        <button onClick={handleLogout} style={styles.menuItem}>
                            🚶 Logout
                        </button>
                        {isCreator && (
                            <button onClick={handleAbolish} style={styles.menuItemDanger}>
                                💥 Abolish Room
                            </button>
                        )}
                        <button onClick={() => setShowMenu(false)} style={styles.menuItemCancel}>
                            ✕ Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Work Time Modal */}
            {showWorkTime && workTimeData && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>👋 Goodbye, {workTimeData.username}!</h2>
                        <div style={styles.workTimeCard}>
                            <div style={styles.workTimeLabel}>Work Time</div>
                            <div style={styles.workTimeValue}>
                                {workTimeData.workTime?.displayText || 'N/A'}
                            </div>
                            <div style={styles.workTimeDetails}>
                                Room: <strong>{workTimeData.roomCode}</strong>
                            </div>
                        </div>
                        <button onClick={handleWorkTimeClose} style={styles.okButton}>
                            OK
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

const styles = {
    container: {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 9999,
    },
    logoutBtn: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #3d3d5c 0%, #2a2a40 100%)',
        border: '2px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        fontSize: '24px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menu: {
        position: 'absolute',
        bottom: '70px',
        left: '0',
        background: 'rgba(30, 30, 50, 0.98)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '8px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: '170px',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    menuItem: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'left',
        transition: 'background 0.2s',
    },
    menuItemDanger: {
        background: 'rgba(231, 76, 60, 0.25)',
        border: 'none',
        color: '#ff6b6b',
        padding: '12px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'left',
    },
    menuItemCancel: {
        background: 'transparent',
        border: 'none',
        color: 'rgba(255, 255, 255, 0.5)',
        padding: '10px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        textAlign: 'center',
    },
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
    },
    modal: {
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px',
        padding: '35px',
        maxWidth: '380px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
        color: '#fff',
        margin: '0 0 20px 0',
        fontSize: '1.5rem',
    },
    workTimeCard: {
        background: 'rgba(74, 144, 217, 0.15)',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '25px',
        border: '1px solid rgba(74, 144, 217, 0.3)',
    },
    workTimeLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '0.85rem',
        marginBottom: '8px',
    },
    workTimeValue: {
        color: '#4a90d9',
        fontSize: '2rem',
        fontWeight: 'bold',
        marginBottom: '12px',
    },
    workTimeDetails: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.95rem',
    },
    okButton: {
        background: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
        border: 'none',
        color: '#fff',
        padding: '14px 50px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
        boxShadow: '0 4px 15px rgba(74, 144, 217, 0.4)',
    },
};

export default LogoutButton;
