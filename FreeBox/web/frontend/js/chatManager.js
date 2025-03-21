/**
 * FreeBox Web Interface
 * Chat functionality manager
 */

import { formatChatTime } from './utils.js';
import * as socketManager from './socketManager.js';
import { DEFAULT_ROOM } from './config.js';

// Chat state
let currentUsername = '';
let currentRoom = DEFAULT_ROOM;
let onlineUsers = 1; // Start with 1 (yourself)

// DOM elements
let chatMessages;
let chatUsersCount;
let messageInput;
let usernameInput;

/**
 * Initialize chat manager
 * @param {Object} elements - DOM elements for chat
 * @param {string} username - Initial username
 */
export function init(elements, username) {
    // Store DOM elements
    chatMessages = elements.chatMessages;
    chatUsersCount = elements.chatUsersCount;
    messageInput = elements.messageInput;
    usernameInput = elements.usernameInput;
    
    // Set initial values
    currentUsername = username;
    
    // Update UI
    usernameInput.value = currentUsername;
    
    // Set up socket event listeners
    setupSocketListeners();
    
    // Initialize user count display
    updateUserCount();
}

/**
 * Set up socket event listeners
 */
function setupSocketListeners() {
    socketManager.on('connect', () => {
        addSystemMessage('Connected to the server.');
    });
    
    socketManager.on('disconnect', () => {
        addSystemMessage('Disconnected from the server. Trying to reconnect...');
    });
    
    socketManager.on('chat_message', (message) => {
        addChatMessage(message);
    });
    
    socketManager.on('chat_history', (messages) => {
        // Clear the chat
        chatMessages.innerHTML = '';
        
        // Add all messages
        messages.forEach(message => {
            addChatMessage(message, false); // Don't auto-scroll for each message
        });
        
        // Scroll to the bottom after all messages are added
        scrollChatToBottom();
    });
    
    socketManager.on('user_joined', (data) => {
        addSystemMessage(`${data.username} has joined the chat.`);
        
        // Increment user count
        onlineUsers++;
        updateUserCount();
    });
    
    socketManager.on('user_left', (data) => {
        addSystemMessage(`${data.username} has left the chat.`);
        
        // Decrement user count
        onlineUsers = Math.max(1, onlineUsers - 1);
        updateUserCount();
    });
    
    socketManager.on('user_count', (data) => {
        onlineUsers = Math.max(1, data.count);
        updateUserCount();
    });
}

/**
 * Add a chat message to the UI
 * @param {Object} message - Message object
 * @param {boolean} shouldScroll - Whether to scroll to bottom
 */
export function addChatMessage(message, shouldScroll = true) {
    const isCurrentUser = message.username === currentUsername;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isCurrentUser ? 'outgoing' : 'incoming'}`;
    
    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = message.username;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message.message;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formatChatTime(message.timestamp);
    
    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to the bottom if requested
    if (shouldScroll) {
        scrollChatToBottom();
    }
}

/**
 * Add a system message
 * @param {string} message - Message content
 * @param {boolean} shouldScroll - Whether to scroll to bottom
 */
export function addSystemMessage(message, shouldScroll = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-system-message';
    messageDiv.textContent = message;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to the bottom if requested
    if (shouldScroll) {
        scrollChatToBottom();
    }
}

/**
 * Send a chat message
 */
export function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // Update username from input
    updateUsername(usernameInput.value.trim() || 'Anonymous');
    
    // Send via WebSocket if connected
    if (socketManager.isSocketConnected()) {
        socketManager.sendChatMessage(currentUsername, message, currentRoom);
    } else {
        // Fallback to REST API
        fetch('/api/chat/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUsername,
                message: message,
                room: currentRoom
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addChatMessage(data.message);
            }
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        });
    }
    
    // Clear the input
    messageInput.value = '';
}

/**
 * Update the username
 * @param {string} newUsername - New username
 */
export function updateUsername(newUsername) {
    // Only update if username changed
    if (newUsername !== currentUsername) {
        currentUsername = newUsername;
        localStorage.setItem('freebox_username', currentUsername);
    }
}

/**
 * Update the user count display
 */
function updateUserCount() {
    if (chatUsersCount) {
        chatUsersCount.textContent = `${onlineUsers} ${onlineUsers === 1 ? 'user' : 'users'} online`;
    }
}

/**
 * Scroll the chat to the bottom
 */
export function scrollChatToBottom() {
    // Make sure the chat container exists
    if (chatMessages) {
        // Use requestAnimationFrame to ensure the scroll happens after layout and paint
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }
} 