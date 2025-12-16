import React, { useState, useEffect } from 'react';
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
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [showNewTask, setShowNewTask] = useState(false);

    // Fetch tasks on mount
    useEffect(() => {
        fetchTasks();
    }, [roomCode]);

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

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim()) return;
        try {
            const response = await createTask(roomCode, newTaskTitle.trim(), '', token);
            setTasks([...tasks, response.task]);
            setNewTaskTitle('');
            setShowNewTask(false);
        } catch (err) {
            console.error('Failed to create task:', err);
        }
    };

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

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.title}>📌 Kanban Board</h2>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>

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
                                            <div style={styles.taskActions}>
                                                {/* Move buttons */}
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

                                {/* Add task button (only in To Do column) */}
                                {column.key === 'todo' && (
                                    showNewTask ? (
                                        <div style={styles.newTaskForm}>
                                            <input
                                                type="text"
                                                value={newTaskTitle}
                                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                                placeholder="Task title..."
                                                style={styles.newTaskInput}
                                                autoFocus
                                                onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
                                            />
                                            <div style={styles.newTaskButtons}>
                                                <button onClick={handleCreateTask} style={styles.addBtn}>Add</button>
                                                <button onClick={() => setShowNewTask(false)} style={styles.cancelBtn}>Cancel</button>
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
    },
    container: {
        background: 'rgba(26, 26, 46, 0.95)',
        borderRadius: '16px',
        padding: '20px',
        width: '90%',
        maxWidth: '1100px',
        maxHeight: '80vh',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
    },
    title: {
        color: '#fff',
        margin: 0,
        fontSize: '1.3rem',
    },
    closeBtn: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        color: '#fff',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: '16px',
    },
    loading: {
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        padding: '40px',
    },
    board: {
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        flex: 1,
    },
    column: {
        flex: '1 0 180px',
        minWidth: '180px',
        maxWidth: '220px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
    },
    columnHeader: {
        color: '#fff',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        padding: '8px',
        borderBottom: '3px solid',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    taskCount: {
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '0.75rem',
    },
    taskList: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    taskCard: {
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '10px',
    },
    taskTitle: {
        color: '#fff',
        fontSize: '0.85rem',
        marginBottom: '8px',
        wordBreak: 'break-word',
    },
    taskActions: {
        display: 'flex',
        gap: '4px',
    },
    moveBtn: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
    },
    deleteBtn: {
        background: 'rgba(231, 76, 60, 0.3)',
        border: 'none',
        color: '#e74c3c',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        marginLeft: 'auto',
    },
    addTaskBtn: {
        background: 'rgba(74, 144, 217, 0.2)',
        border: '1px dashed rgba(74, 144, 217, 0.5)',
        color: '#4a90d9',
        padding: '10px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        marginTop: '8px',
    },
    newTaskForm: {
        marginTop: '8px',
    },
    newTaskInput: {
        width: '100%',
        padding: '8px',
        borderRadius: '6px',
        border: 'none',
        background: 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        fontSize: '0.85rem',
        boxSizing: 'border-box',
    },
    newTaskButtons: {
        display: 'flex',
        gap: '6px',
        marginTop: '6px',
    },
    addBtn: {
        flex: 1,
        padding: '6px',
        background: '#4a90d9',
        border: 'none',
        borderRadius: '4px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
    cancelBtn: {
        flex: 1,
        padding: '6px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        borderRadius: '4px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
};

export default KanbanOverlay;
