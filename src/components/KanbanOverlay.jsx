import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../services/api';

const COLUMNS = [
    { key: 'todo', label: '📋 To Do', color: '#6c5ce7' },
    { key: 'inprogress', label: '🔄 In Progress', color: '#fdcb6e' },
    { key: 'alpha', label: '🧪 Alpha', color: '#00cec9' },
    { key: 'beta', label: '🔬 Beta', color: '#e17055' },
    { key: 'prod', label: '✅ Done', color: '#00b894' },
];

const KanbanOverlay = ({ roomCode, token, onClose }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewTask, setShowNewTask] = useState(false);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Use refs instead of state for input values (more reliable with Phaser)
    const titleInputRef = useRef(null);
    const descInputRef = useRef(null);

    // Disable Phaser keyboard when overlay is open
    useEffect(() => {
        const disablePhaser = () => {
            // Method 1: Via global game instance
            if (window.PHASER_GAME) {
                window.PHASER_GAME.input.keyboard.enabled = false;
                window.PHASER_GAME.input.keyboard.stopListeners();
            }
            // Method 2: Via scene manager
            if (window.PHASER_GAME?.scene?.scenes) {
                window.PHASER_GAME.scene.scenes.forEach(scene => {
                    if (scene.input?.keyboard) {
                        scene.input.keyboard.enabled = false;
                    }
                });
            }
        };

        const enablePhaser = () => {
            if (window.PHASER_GAME) {
                window.PHASER_GAME.input.keyboard.enabled = true;
                window.PHASER_GAME.input.keyboard.startListeners();
            }
            if (window.PHASER_GAME?.scene?.scenes) {
                window.PHASER_GAME.scene.scenes.forEach(scene => {
                    if (scene.input?.keyboard) {
                        scene.input.keyboard.enabled = true;
                    }
                });
            }
        };

        disablePhaser();
        console.log('⌨️ Phaser keyboard disabled for Kanban');

        return () => {
            enablePhaser();
            console.log('⌨️ Phaser keyboard re-enabled');
        };
    }, []);

    // Fetch tasks on mount
    useEffect(() => {
        fetchTasks();
    }, [roomCode]);

    // Focus title input when showing form
    useEffect(() => {
        if (showNewTask && titleInputRef.current) {
            setTimeout(() => titleInputRef.current?.focus(), 100);
        }
    }, [showNewTask]);

    const fetchTasks = async () => {
        try {
            const response = await getTasks(roomCode);
            setTasks(response.tasks || []);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = useCallback(async () => {
        // Get values directly from DOM (more reliable than React state with Phaser)
        const title = titleInputRef.current?.value?.trim() || '';
        const description = descInputRef.current?.value?.trim() || '';

        console.log('📝 Creating task:', { title, description });

        if (!title) {
            setError('Please enter a task title');
            titleInputRef.current?.focus();
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const response = await createTask(roomCode, title, description, token);
            setTasks(prev => [...prev, response.task]);
            // Clear inputs
            if (titleInputRef.current) titleInputRef.current.value = '';
            if (descInputRef.current) descInputRef.current.value = '';
            setShowNewTask(false);
        } catch (err) {
            console.error('Failed to create task:', err);
            setError(err.error || 'Failed to create task');
        } finally {
            setIsSubmitting(false);
        }
    }, [roomCode, token]);

    const handleMoveTask = async (taskId, newStatus) => {
        try {
            await updateTask(taskId, { status: newStatus }, token);
            setTasks(tasks.map(t =>
                t._id === taskId ? { ...t, status: newStatus } : t
            ));
        } catch (err) {
            console.error('Failed to update task:', err);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await deleteTask(taskId, token);
            setTasks(tasks.filter(t => t._id !== taskId));
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
    };

    const getTasksByColumn = (columnKey) => {
        return tasks.filter(t => t.status === columnKey);
    };

    const handleCancelNewTask = () => {
        setShowNewTask(false);
        setError(null);
        if (titleInputRef.current) titleInputRef.current.value = '';
        if (descInputRef.current) descInputRef.current.value = '';
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.title}>📌 Kanban Board</h2>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={styles.errorMsg}>{error}</div>
                )}

                {/* Kanban Columns */}
                {loading ? (
                    <div style={styles.loading}>Loading tasks...</div>
                ) : (
                    <div style={styles.board}>
                        {COLUMNS.map(column => (
                            <div key={column.key} style={styles.column}>
                                <div style={{ ...styles.columnHeader, borderColor: column.color }}>
                                    {column.label}
                                    <span style={styles.taskCount}>
                                        {getTasksByColumn(column.key).length}
                                    </span>
                                </div>
                                <div style={styles.taskList}>
                                    {getTasksByColumn(column.key).map(task => (
                                        <div key={task._id} style={styles.taskCard}>
                                            <div style={styles.taskTitle}>{task.title}</div>
                                            {task.description && (
                                                <div style={styles.taskDesc}>{task.description}</div>
                                            )}
                                            <div style={styles.taskActions}>
                                                {column.key !== 'todo' && (
                                                    <button
                                                        onClick={() => handleMoveTask(task._id, COLUMNS[COLUMNS.findIndex(c => c.key === column.key) - 1].key)}
                                                        style={styles.moveBtn}
                                                        title="Move left"
                                                    >←</button>
                                                )}
                                                {column.key !== 'prod' && (
                                                    <button
                                                        onClick={() => handleMoveTask(task._id, COLUMNS[COLUMNS.findIndex(c => c.key === column.key) + 1].key)}
                                                        style={styles.moveBtn}
                                                        title="Move right"
                                                    >→</button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteTask(task._id)}
                                                    style={styles.deleteBtn}
                                                    title="Delete"
                                                >🗑</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Add task form (only in To Do column) */}
                                {column.key === 'todo' && (
                                    showNewTask ? (
                                        <div style={styles.newTaskForm}>
                                            <label style={styles.inputLabel}>Title *</label>
                                            <input
                                                ref={titleInputRef}
                                                type="text"
                                                placeholder="Enter task title..."
                                                style={styles.newTaskInput}
                                                autoComplete="off"
                                                autoFocus
                                            />
                                            <label style={styles.inputLabel}>Description</label>
                                            <textarea
                                                ref={descInputRef}
                                                placeholder="Optional description..."
                                                style={styles.newTaskTextarea}
                                                rows={2}
                                            />
                                            <div style={styles.newTaskButtons}>
                                                <button
                                                    onClick={handleCreateTask}
                                                    style={styles.addBtn}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? '⏳ Adding...' : '✓ Add Task'}
                                                </button>
                                                <button
                                                    onClick={handleCancelNewTask}
                                                    style={styles.cancelBtn}
                                                    disabled={isSubmitting}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowNewTask(true)}
                                            style={styles.addTaskBtn}
                                        >
                                            + Add Task
                                        </button>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
    },
    container: {
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px',
        padding: '28px',
        width: '95%',
        maxWidth: '1200px',
        maxHeight: '85vh',
        boxShadow: '0 15px 50px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    title: {
        color: '#fff',
        margin: 0,
        fontSize: '1.5rem',
    },
    closeBtn: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        color: '#fff',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: '20px',
        transition: 'background 0.2s',
    },
    errorMsg: {
        background: 'rgba(231, 76, 60, 0.2)',
        color: '#ff6b6b',
        padding: '14px',
        borderRadius: '10px',
        marginBottom: '15px',
        fontSize: '14px',
        border: '1px solid rgba(231, 76, 60, 0.3)',
    },
    loading: {
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        padding: '50px',
        fontSize: '16px',
    },
    board: {
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        flex: 1,
        paddingBottom: '10px',
    },
    column: {
        flex: '1 0 210px',
        minWidth: '210px',
        maxWidth: '260px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '14px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
    },
    columnHeader: {
        color: '#fff',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        padding: '12px',
        borderBottom: '3px solid',
        marginBottom: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    taskCount: {
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '4px 12px',
        borderRadius: '15px',
        fontSize: '0.85rem',
    },
    taskList: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    taskCard: {
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        padding: '14px',
    },
    taskTitle: {
        color: '#fff',
        fontSize: '0.95rem',
        fontWeight: '500',
        marginBottom: '6px',
        wordBreak: 'break-word',
    },
    taskDesc: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '0.8rem',
        marginBottom: '10px',
        wordBreak: 'break-word',
    },
    taskActions: {
        display: 'flex',
        gap: '8px',
    },
    moveBtn: {
        background: 'rgba(255, 255, 255, 0.15)',
        border: 'none',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background 0.2s',
    },
    deleteBtn: {
        background: 'rgba(231, 76, 60, 0.3)',
        border: 'none',
        color: '#ff6b6b',
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        marginLeft: 'auto',
    },
    addTaskBtn: {
        background: 'rgba(74, 144, 217, 0.2)',
        border: '2px dashed rgba(74, 144, 217, 0.5)',
        color: '#4a90d9',
        padding: '14px',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        marginTop: '12px',
        transition: 'all 0.2s',
    },
    newTaskForm: {
        marginTop: '12px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '10px',
        padding: '14px',
    },
    inputLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.8rem',
        marginBottom: '6px',
        display: 'block',
    },
    newTaskInput: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '2px solid rgba(74, 144, 217, 0.5)',
        background: 'rgba(0, 0, 0, 0.3)',
        color: '#fff',
        fontSize: '1rem',
        boxSizing: 'border-box',
        outline: 'none',
        marginBottom: '12px',
    },
    newTaskTextarea: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(0, 0, 0, 0.2)',
        color: '#fff',
        fontSize: '0.9rem',
        boxSizing: 'border-box',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
        marginBottom: '12px',
    },
    newTaskButtons: {
        display: 'flex',
        gap: '10px',
    },
    addBtn: {
        flex: 1,
        padding: '12px',
        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: 'bold',
    },
    cancelBtn: {
        flex: 1,
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.95rem',
    },
};

export default KanbanOverlay;
