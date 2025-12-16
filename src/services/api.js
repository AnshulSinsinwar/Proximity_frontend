// API Service for Proximity Backend
// Default: deployed backend. Override with VITE_API_URL env variable
const BASE_URL = import.meta.env.VITE_API_URL || 'https://proximity-backend-phjg.onrender.com/api/v1';

console.log('🌐 API Base URL:', BASE_URL);

// Helper for API calls with detailed logging
async function apiCall(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    console.log('📡 API Request:', options.method || 'GET', url);

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(url, config);

        // Try to parse JSON, fallback to text
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        console.log('📡 API Response:', response.status, data);

        if (!response.ok) {
            const error = {
                status: response.status,
                error: typeof data === 'object' ? (data.error || data.message || JSON.stringify(data)) : data
            };
            console.error('❌ API Error:', error);
            throw error;
        }

        return data;
    } catch (err) {
        // Network errors (no response from server)
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            console.error('🔴 Network Error: Cannot reach server at', url);
            throw { status: 0, error: 'Cannot connect to server. Is the backend running?' };
        }
        // Re-throw API errors
        throw err;
    }
}

// Add auth header helper
function withAuth(token) {
    return { headers: { Authorization: `Bearer ${token}` } };
}

// ============ ROOM MANAGEMENT ============

// Create a new room (one room per user)
export async function createRoom(username, avatar, roomName) {
    console.log('🏠 Creating room:', { username, avatar, roomName });
    return apiCall('/rooms/create', {
        method: 'POST',
        body: JSON.stringify({ username, avatar, roomName }),
    });
}

// Join existing room by code
export async function joinRoom(username, avatar, roomCode) {
    console.log('🚪 Joining room:', { username, avatar, roomCode });
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
