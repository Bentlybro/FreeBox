/**
 * FreeBox Web Interface
 * Main JavaScript file for handling the FreeBox user interface
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Files
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');
    const fileDropArea = document.querySelector('.file-drop-area');
    const fileList = document.getElementById('file-list');
    const uploadForm = document.getElementById('upload-form');
    const uploadBtn = document.getElementById('upload-btn');
    const fileTableBody = document.getElementById('file-table-body');
    const noFilesMessage = document.getElementById('no-files-message');
    const loadingFiles = document.getElementById('loading-files');
    const statusText = document.querySelector('.status-text');
    const fileDescription = document.getElementById('file-description');
    
    // DOM Elements - Chat
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');
    const usernameInput = document.getElementById('username-input');
    const chatUsersCount = document.getElementById('chat-users-count');
    
    // Track files to upload
    let filesToUpload = [];
    
    // WebSocket/Socket.IO
    let socket;
    let isConnected = false;
    
    // User information
    let username = localStorage.getItem('freebox_username') || generateRandomUsername();
    let currentRoom = 'main';
    
    // Track number of online users
    let onlineUsers = 1; // Start with 1 (yourself)
    
    // Initialize the page
    init();
    
    // Function to initialize the page
    function init() {
        // Set username from local storage if available
        if (username) {
            usernameInput.value = username;
        }
        
        // Check FreeBox status
        checkStatus();
        
        // Load files
        loadFiles();
        
        // Load stats
        loadStats();
        
        // Setup WebSockets
        setupWebSockets();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize user count display
        updateUserCount();
        
        // Ensure chat is scrolled to the bottom if it's visible
        if (document.getElementById('chat-section').style.display !== 'none') {
            setTimeout(scrollChatToBottom, 500); // Give time for chat history to load
        }
        
        // Set up automatic stats refresh every 30 seconds
        setInterval(() => {
            if (isConnected) {
                socket.emit('request_stats_update');
            } else {
                loadStats();
            }
        }, 30000);
    }
    
    // Update the user count display
    function updateUserCount() {
        chatUsersCount.textContent = `${onlineUsers} ${onlineUsers === 1 ? 'user' : 'users'} online`;
    }
    
    // Setup WebSockets
    function setupWebSockets() {
        try {
            // Connect to the WebSocket server (Socket.IO)
            socket = io();
            
            // Connection events
            socket.on('connect', () => {
                console.log('Connected to WebSocket server');
                isConnected = true;
                
                // Join the default room
                socket.emit('join', {
                    room: currentRoom,
                    username: username
                });
                
                // Request updated stats
                socket.emit('request_stats_update');
            });
            
            socket.on('disconnect', () => {
                console.log('Disconnected from WebSocket server');
                isConnected = false;
                
                // Add a system message
                addSystemMessage('Disconnected from the server. Trying to reconnect...');
            });
            
            // Chat events
            socket.on('chat_message', (message) => {
                // Add the message to the chat
                addChatMessage(message);
            });
            
            socket.on('chat_history', (messages) => {
                // Clear the chat
                chatMessages.innerHTML = '';
                
                // Add all messages
                messages.forEach(message => {
                    addChatMessage(message, false); // Don't auto-scroll for each message
                });
                
                // Scroll to the bottom after all messages are added
                scrollChatToBottom();
            });
            
            socket.on('user_joined', (data) => {
                addSystemMessage(`${data.username} has joined the chat.`);
                
                // Increment user count
                onlineUsers++;
                updateUserCount();
            });
            
            socket.on('user_left', (data) => {
                addSystemMessage(`${data.username} has left the chat.`);
                
                // Decrement user count
                onlineUsers = Math.max(1, onlineUsers - 1);
                updateUserCount();
            });
            
            // Request current user count
            socket.on('user_count', (data) => {
                onlineUsers = Math.max(1, data.count);
                updateUserCount();
            });
            
            // File events
            socket.on('file_list_updated', () => {
                // Reload the file list
                loadFiles();
            });
            
            // File download event
            socket.on('file_downloaded', (data) => {
                // Update download count in the UI without reloading the entire file list
                updateFileDownloadCount(data.file);
            });
            
            // Stats update event
            socket.on('stats_updated', (stats) => {
                // Update stats display
                updateStatsDisplay(stats);
            });
            
        } catch (error) {
            console.error('Error setting up WebSockets:', error);
        }
    }
    
    // Check FreeBox status
    function checkStatus() {
        fetch('/api/status')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'online') {
                    statusText.textContent = `FreeBox is online in ${data.mode} mode`;
                } else {
                    statusText.textContent = 'FreeBox is offline';
                    document.querySelector('.status-indicator').classList.remove('online');
                }
            })
            .catch(error => {
                console.error('Error checking status:', error);
                statusText.textContent = 'Failed to connect to FreeBox';
                document.querySelector('.status-indicator').classList.remove('online');
            });
    }
    
    // Load available files
    function loadFiles() {
        showLoading(true);
        
        fetch('/api/files')
            .then(response => response.json())
            .then(files => {
                displayFiles(files);
            })
            .catch(error => {
                console.error('Error loading files:', error);
                showErrorMessage('Failed to load files. Please try again.');
            })
            .finally(() => {
                showLoading(false);
            });
    }
    
    // Load and display stats
    function loadStats() {
        // Add the refreshing class to the refresh button
        const refreshBtn = document.getElementById('refresh-stats-btn');
        if (refreshBtn) {
            refreshBtn.classList.add('refreshing');
        }
        
        fetch('/api/stats')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load stats');
                }
                return response.json();
            })
            .then(stats => {
                updateStatsDisplay(stats);
                
                // Remove the refreshing class
                if (refreshBtn) {
                    refreshBtn.classList.remove('refreshing');
                }
            })
            .catch(error => {
                console.error('Error loading stats:', error);
                
                // Update error message
                document.querySelectorAll('.stat-value').forEach(el => {
                    if (el.textContent === 'Loading...') {
                        el.textContent = 'Error loading stats';
                    }
                });
                
                // Remove the refreshing class
                if (refreshBtn) {
                    refreshBtn.classList.remove('refreshing');
                }
            });
    }
    
    // Update the stats display with the provided data
    function updateStatsDisplay(stats) {
        // Update uptime
        const uptimeElement = document.getElementById('uptime-value');
        if (uptimeElement) {
            uptimeElement.textContent = formatUptime(stats.uptime_seconds);
        }
        
        // Update visitors
        const visitorsElement = document.getElementById('visitors-value');
        if (visitorsElement) {
            visitorsElement.textContent = `${stats.total_visits} (${stats.visitors_count} unique)`;
        }
        
        // Update files
        const filesElement = document.getElementById('files-value');
        if (filesElement) {
            filesElement.textContent = `${stats.files_count} (${stats.total_downloads} downloads)`;
        }
        
        // Update storage
        const storageElement = document.getElementById('storage-value');
        if (storageElement) {
            const storageSize = formatFileSize(stats.total_storage || 0);
            storageElement.textContent = storageSize;
        }
        
        // Update messages
        const messagesElement = document.getElementById('messages-value');
        if (messagesElement) {
            messagesElement.textContent = `${stats.messages_count}`;
        }
        
        // Update most downloaded file
        const popularFileElement = document.getElementById('popular-file-value');
        if (popularFileElement) {
            if (stats.most_downloaded) {
                popularFileElement.textContent = `${stats.most_downloaded.filename} (${stats.most_downloaded.download_count} downloads)`;
            } else {
                popularFileElement.textContent = 'No downloads yet';
            }
        }
        
        // Add a brief highlight effect to show the data was updated
        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.add('stat-updated');
            setTimeout(() => {
                card.classList.remove('stat-updated');
            }, 1000);
        });
    }
    
    // Format uptime in a human-readable format
    function formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        seconds %= 86400;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds %= 60;
        
        let result = '';
        if (days > 0) result += `${days}d `;
        if (hours > 0 || days > 0) result += `${hours}h `;
        if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
        result += `${seconds}s`;
        
        return result;
    }
    
    // Display files in the table
    function displayFiles(files) {
        fileTableBody.innerHTML = '';
        
        if (files.length === 0) {
            noFilesMessage.classList.remove('hidden');
            return;
        }
        
        noFilesMessage.classList.add('hidden');
        
        files.forEach(file => {
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('td');
            nameCell.textContent = file.filename;
            
            const sizeCell = document.createElement('td');
            sizeCell.textContent = formatFileSize(file.size);
            
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(file.created_at);
            
            const downloadsCell = document.createElement('td');
            downloadsCell.textContent = file.download_count;
            
            const actionsCell = document.createElement('td');
            
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download';
            downloadBtn.className = 'file-action-btn';
            downloadBtn.setAttribute('data-file-id', file.id);
            downloadBtn.addEventListener('click', () => {
                window.location.href = `/api/download/${file.id}`;
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'file-action-btn delete';
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete ${file.filename}?`)) {
                    deleteFile(file.id);
                }
            });
            
            actionsCell.appendChild(downloadBtn);
            actionsCell.appendChild(deleteBtn);
            
            row.appendChild(nameCell);
            row.appendChild(sizeCell);
            row.appendChild(dateCell);
            row.appendChild(downloadsCell);
            row.appendChild(actionsCell);
            
            fileTableBody.appendChild(row);
        });
    }
    
    // Delete a file
    function deleteFile(fileId) {
        fetch(`/api/files/${fileId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadFiles();
            } else {
                showErrorMessage(`Failed to delete file: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error deleting file:', error);
            showErrorMessage('Failed to delete file. Please try again.');
        });
    }
    
    // Add a chat message to the UI
    function addChatMessage(message, shouldScroll = true) {
        const isCurrentUser = message.username === username;
        
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
    
    // Add a system message
    function addSystemMessage(message, shouldScroll = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-system-message';
        messageDiv.textContent = message;
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to the bottom if requested
        if (shouldScroll) {
            scrollChatToBottom();
        }
    }
    
    // Scroll the chat to the bottom
    function scrollChatToBottom() {
        // Make sure the chat container exists
        if (chatMessages) {
            // Use requestAnimationFrame to ensure the scroll happens after layout and paint
            requestAnimationFrame(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            });
        }
    }
    
    // Send a chat message
    function sendChatMessage() {
        const message = messageInput.value.trim();
        
        if (!message) {
            return;
        }
        
        // Update username from input
        username = usernameInput.value.trim() || 'Anonymous';
        
        // Save username to local storage
        localStorage.setItem('freebox_username', username);
        
        // Send via WebSocket if connected
        if (isConnected) {
            socket.emit('chat_message', {
                username: username,
                message: message,
                room: currentRoom
            });
        } else {
            // Fallback to REST API
            fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
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
                showErrorMessage('Failed to send message. Please try again.');
            });
        }
        
        // Clear the input
        messageInput.value = '';
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // File-related event listeners
        
        // Open file dialog when select button is clicked
        selectFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Handle file selection
        fileInput.addEventListener('change', handleFileSelect);
        
        // Handle drag and drop
        fileDropArea.addEventListener('dragover', e => {
            e.preventDefault();
            fileDropArea.classList.add('highlight');
        });
        
        fileDropArea.addEventListener('dragleave', () => {
            fileDropArea.classList.remove('highlight');
        });
        
        fileDropArea.addEventListener('drop', e => {
            e.preventDefault();
            fileDropArea.classList.remove('highlight');
            
            const files = e.dataTransfer.files;
            handleFiles(files);
        });
        
        // Handle form submission
        uploadForm.addEventListener('submit', e => {
            e.preventDefault();
            uploadFiles();
        });
        
        // Chat-related event listeners
        
        // Send message on button click
        sendMessageBtn.addEventListener('click', () => {
            sendChatMessage();
        });
        
        // Send message on Enter key (but Shift+Enter for new line)
        messageInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        
        // Store username when it changes
        usernameInput.addEventListener('blur', () => {
            const newUsername = usernameInput.value.trim() || generateRandomUsername();
            
            // Only update if username changed
            if (newUsername !== username) {
                username = newUsername;
                localStorage.setItem('freebox_username', username);
            }
        });
        
        // Stats-related event listeners
        const refreshStatsBtn = document.getElementById('refresh-stats-btn');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', () => {
                refreshStatsBtn.classList.add('refreshing');
                
                // If connected via WebSocket, request updated stats
                if (isConnected) {
                    socket.emit('request_stats_update');
                    
                    // Remove the refreshing class after a short delay
                    setTimeout(() => {
                        refreshStatsBtn.classList.remove('refreshing');
                    }, 500);
                } else {
                    // Fallback to HTTP if not connected
                    loadStats();
                }
            });
        }
        
        // Navigation
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get the target section
                const targetId = this.getAttribute('href').substring(1);
                
                // Hide all sections
                document.querySelectorAll('main > section:not(#status)').forEach(section => {
                    section.style.display = 'none';
                });
                
                // Show the target section
                if (targetId) {
                    document.getElementById(targetId).style.display = 'block';
                    
                    // If navigating to chat section, scroll to bottom of messages
                    if (targetId === 'chat-section') {
                        setTimeout(scrollChatToBottom, 100); // Small delay to ensure the section is visible
                    }
                    
                    // If navigating to stats section, refresh stats
                    if (targetId === 'stats-section') {
                        if (isConnected) {
                            socket.emit('request_stats_update');
                        } else {
                            loadStats();
                        }
                    }
                }
                
                // Update active tab
                document.querySelectorAll('nav li').forEach(li => {
                    li.classList.remove('active');
                });
                this.parentElement.classList.add('active');
            });
        });
        
        // Show Files section by default
        document.querySelectorAll('main > section:not(#status):not(#files-section)').forEach(section => {
            section.style.display = 'none';
        });
    }
    
    // Handle file selection from input
    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }
    
    // Process selected files
    function handleFiles(files) {
        if (files.length === 0) return;
        
        // Add files to the list
        for (const file of files) {
            if (!fileExists(file.name)) {
                filesToUpload.push(file);
                addFileToList(file);
            }
        }
        
        // Enable upload button if there are files to upload
        uploadBtn.disabled = filesToUpload.length === 0;
    }
    
    // Check if file already exists in the list
    function fileExists(filename) {
        return filesToUpload.some(file => file.name === filename);
    }
    
    // Add file to the UI list
    function addFileToList(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('span');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => {
            removeFile(file.name);
        });
        
        fileItem.appendChild(fileName);
        fileItem.appendChild(fileSize);
        fileItem.appendChild(removeBtn);
        
        fileList.appendChild(fileItem);
    }
    
    // Remove file from the list
    function removeFile(filename) {
        filesToUpload = filesToUpload.filter(file => file.name !== filename);
        
        // Update UI
        const fileItems = fileList.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            if (item.querySelector('.file-name').textContent === filename) {
                item.remove();
            }
        });
        
        // Disable upload button if no files
        uploadBtn.disabled = filesToUpload.length === 0;
    }
    
    // Upload files to the server
    function uploadFiles() {
        if (filesToUpload.length === 0) return;
        
        // Disable upload button
        uploadBtn.disabled = true;
        
        // Upload each file
        const uploadPromises = filesToUpload.map(file => {
            const formData = new FormData();
            formData.append('file', file);
            
            // Add description if provided
            if (fileDescription.value) {
                formData.append('description', fileDescription.value);
            }
            
            return fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Upload failed');
                }
                return data;
            });
        });
        
        // Process all uploads
        Promise.all(uploadPromises)
            .then(() => {
                // Clear the file list
                fileList.innerHTML = '';
                filesToUpload = [];
                
                // Clear the description
                fileDescription.value = '';
                
                // Notify all clients via WebSocket
                if (isConnected) {
                    socket.emit('file_uploaded', {});
                }
                
                // Reload the file list
                loadFiles();
            })
            .catch(error => {
                console.error('Error uploading files:', error);
                showErrorMessage('Failed to upload one or more files. Please try again.');
            })
            .finally(() => {
                uploadBtn.disabled = false;
            });
    }
    
    // Helper Functions
    
    // Format file size to human-readable format
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Format date to human-readable format
    function formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    }
    
    // Format chat timestamp
    function formatChatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Show/hide loading indicator
    function showLoading(show) {
        if (show) {
            loadingFiles.classList.remove('hidden');
        } else {
            loadingFiles.classList.add('hidden');
        }
    }
    
    // Show error message
    function showErrorMessage(message) {
        alert(message);
    }
    
    // Update the download count for a specific file in the UI
    function updateFileDownloadCount(file) {
        const rows = fileTableBody.querySelectorAll('tr');
        
        for (const row of rows) {
            // Each row stores the file ID in a data attribute when created
            const downloadBtn = row.querySelector('.file-action-btn');
            if (downloadBtn) {
                const fileId = downloadBtn.getAttribute('data-file-id');
                if (fileId && fileId === file.id.toString()) {
                    // Update the download count cell
                    const downloadCell = row.querySelector('td:nth-child(4)');
                    if (downloadCell) {
                        // Update the count
                        downloadCell.textContent = file.download_count;
                        
                        // Highlight the cell with animation
                        downloadCell.classList.add('download-count-highlight');
                        
                        // Remove the class after animation completes
                        setTimeout(() => {
                            downloadCell.classList.remove('download-count-highlight');
                        }, 1500);
                        
                        // Add system message in chat if chat is visible
                        if (document.getElementById('chat-section').style.display !== 'none') {
                            addSystemMessage(`File "${file.filename}" was downloaded. Downloads: ${file.download_count}`, true);
                        }
                    }
                    break;
                }
            }
        }
    }
    
    // Generate a random username
    function generateRandomUsername() {
        const adjectives = [
            "Happy", "Clever", "Brave", "Bright", "Kind", "Swift", "Noble", "Calm", "Witty", "Bold",
            "Cool", "Wise", "Sharp", "Keen", "Quick", "Great", "Free", "Smart", "Lucky", "Wild",
            "Proud", "Fancy", "Agile", "Eager", "Silly", "Cozy", "Shiny", "Vivid", "Merry", "Funky"
        ];
        
        const nouns = [
            "Fox", "Wolf", "Bear", "Lion", "Tiger", "Eagle", "Hawk", "Dolphin", "Whale", "Shark",
            "Panda", "Koala", "Dragon", "Phoenix", "Unicorn", "Wizard", "Knight", "Pirate", "Ninja", "Robot",
            "Rocket", "Star", "Moon", "Planet", "Galaxy", "Diamond", "Crystal", "Flame", "Shadow", "Thunder"
        ];
        
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNumber = Math.floor(Math.random() * 100);
        
        return `${randomAdjective}${randomNoun}${randomNumber}`;
    }
}); 