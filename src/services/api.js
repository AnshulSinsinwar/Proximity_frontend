// API Service for Proximity Backend
const BASE_URL = 'http://localhost:3000/api/v1';

// Helper for API calls
async function apiCall(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json().catch(() => response.text());
    
    if (!response.ok) {
        throw { status: response.status, error: data.error || data };
    }
    return data;
}

// Add auth header helper
function withAuth(token) {
    return { headers: { Authorization: `Bearer ${token}` } };
}

// ============ ROOM MANAGEMENT ============

// Create a new room (one room per user)
export async function createRoom(username, avatar, roomName) {
    return apiCall('/rooms/create', {
        method: 'POST',
        body: JSON.stringify({ username, avatar, roomName }),
    });
}

// Join existing room by code
export async function joinRoom(username, avatar, roomCode) {
    return apiCall('/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ username, avatar, roomCode }),
    });
}

// Get room details by room code
export async function getRoomDetails(roomCode) {
    return apiCall(`/rooms/${roomCode}`);
}

// Rejoin room with token
export async function rejoinRoom(token) {
    return apiCall('/rooms/rejoin', {
        method: 'POST',
        ...withAuth(token),
    });
}

// Abolish room (creator only)
export async function abolishRoom(token) {
    return apiCall('/rooms/abolish', {
        method: 'POST',
        ...withAuth(token),
    });
}

// ============ LOGOUT ============

// Logout with work time response
export async function logout(token) {
    return apiCall('/logout', {
        method: 'POST',
        ...withAuth(token),
    });
}

// ============ KANBAN TASKS ============

// Get all tasks for a room
export async function getTasks(roomCode) {
    return apiCall(`/rooms/${roomCode}/tasks`);
}

// Create a new task
export async function createTask(roomCode, title, description, token) {
    return apiCall(`/rooms/${roomCode}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title, description }),
        ...withAuth(token),
    });
}

// Update task (move status, edit title/description)
export async function updateTask(taskId, updates, token) {
    return apiCall(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        ...withAuth(token),
    });
}

// Delete task
export async function deleteTask(taskId, token) {
    return apiCall(`/tasks/${taskId}`, {
        method: 'DELETE',
        ...withAuth(token),
    });
}

// ============ HEALTH CHECK ============

export async function healthCheck() {
    return apiCall('/health');
}

export default {
    createRoom,
    joinRoom,
    getRoomDetails,
    rejoinRoom,
    abolishRoom,
    logout,
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    healthCheck,
};
