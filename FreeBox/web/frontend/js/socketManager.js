/**
 * FreeBox Web Interface
 * Socket.IO connection manager
 */

import { DEFAULT_ROOM } from './config.js';

// Callbacks for different event types
const eventCallbacks = {
    connect: [],
    disconnect: [],
    chat_message: [],
    chat_history: [],
    user_joined: [],
    user_left: [],
    user_count: [],
    file_list_updated: [],
    file_downloaded: [],
    stats_updated: []
};

// Socket.IO instance
let socket;
let isConnected = false;

/**
 * Setup WebSocket connection
 * @param {string} username - User's username
 * @returns {boolean} - Connection status
 */
export function setupSocket(username) {
    try {
        // Connect to the WebSocket server (Socket.IO)
        socket = io();
        
        // Connection events
        socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            isConnected = true;
            
            // Join the default room
            socket.emit('join', {
                room: DEFAULT_ROOM,
                username: username
            });
            
            // Request updated stats
            socket.emit('request_stats_update');
            
            // Call all connect callbacks
            triggerCallbacks('connect');
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            isConnected = false;
            
            // Call all disconnect callbacks
            triggerCallbacks('disconnect');
        });
        
        // Chat events
        socket.on('chat_message', (message) => {
            triggerCallbacks('chat_message', message);
        });
        
        socket.on('chat_history', (messages) => {
            triggerCallbacks('chat_history', messages);
        });
        
        socket.on('user_joined', (data) => {
            triggerCallbacks('user_joined', data);
        });
        
        socket.on('user_left', (data) => {
            triggerCallbacks('user_left', data);
        });
        
        // Request current user count
        socket.on('user_count', (data) => {
            triggerCallbacks('user_count', data);
        });
        
        // File events
        socket.on('file_list_updated', () => {
            triggerCallbacks('file_list_updated');
        });
        
        // File download event
        socket.on('file_downloaded', (data) => {
            triggerCallbacks('file_downloaded', data);
        });
        
        // Stats update event
        socket.on('stats_updated', (stats) => {
            triggerCallbacks('stats_updated', stats);
        });
        
        return true;
    } catch (error) {
        console.error('Error setting up WebSockets:', error);
        return false;
    }
}

/**
 * Send a chat message through the socket
 * @param {string} username - User's username
 * @param {string} message - Message content
 * @param {string} room - Chat room
 */
export function sendChatMessage(username, message, room = DEFAULT_ROOM) {
    if (isConnected) {
        socket.emit('chat_message', {
            username: username,
            message: message,
            room: room
        });
    }
}

/**
 * Join a chat room
 * @param {string} username - User's username
 * @param {string} room - Room to join
 */
export function joinRoom(username, room = DEFAULT_ROOM) {
    if (isConnected) {
        socket.emit('join', {
            room: room,
            username: username
        });
    }
}

/**
 * Notify server of file upload
 */
export function notifyFileUploaded() {
    if (isConnected) {
        socket.emit('file_uploaded', {});
    }
}

/**
 * Request updated stats
 */
export function requestStatsUpdate() {
    if (isConnected) {
        socket.emit('request_stats_update');
        return true;
    }
    return false;
}

/**
 * Check if socket is connected
 * @returns {boolean} - Connection status
 */
export function isSocketConnected() {
    return isConnected;
}

/**
 * Register a callback for a specific event
 * @param {string} event - Event name
 * @param {function} callback - Callback function
 */
export function on(event, callback) {
    if (eventCallbacks[event]) {
        eventCallbacks[event].push(callback);
    }
}

/**
 * Trigger all callbacks for an event
 * @param {string} event - Event name
 * @param {*} data - Event data
 */
function triggerCallbacks(event, data) {
    if (eventCallbacks[event]) {
        eventCallbacks[event].forEach(callback => callback(data));
    }
} 