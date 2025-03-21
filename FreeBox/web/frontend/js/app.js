/**
 * DEPRECATED: This file has been split into multiple modular files.
 * Please see the following files for the current implementation:
 * - main.js - Main entry point
 * - fileManager.js - File handling
 * - chatManager.js - Chat functionality
 * - viewerManager.js - File viewer
 * - socketManager.js - Socket.IO connections
 * - uiManager.js - UI interactions
 * - stats.js - Statistics
 * - utils.js - Utility functions
 * - config.js - Configuration
 */

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
    const globalFileDescription = document.getElementById('global-file-description');
    
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
    
    // File Viewer Modal Functionality
    const fileViewerModal = document.getElementById('file-viewer-modal');
    const modalFileName = document.getElementById('modal-file-name');
    const modalFileDescription = document.getElementById('modal-file-description');
    const modalFileDetails = document.getElementById('modal-file-details');
    const modalDownloadBtn = document.getElementById('modal-download-btn');
    const closeModal = document.querySelector('.close-modal');
    const imageViewer = document.getElementById('image-viewer');
    const videoViewer = document.getElementById('video-viewer');
    const textViewer = document.getElementById('text-viewer');
    const unsupportedViewer = document.getElementById('unsupported-viewer');
    const viewerImage = document.getElementById('viewer-image');
    const viewerVideo = document.getElementById('viewer-video');
    const viewerText = document.getElementById('viewer-text');
    
    // DOM elements for video player
    const videoCurrentTime = document.getElementById('video-current-time');
    const videoDuration = document.getElementById('video-duration');
    const videoPlaybackSpeed = document.getElementById('video-playback-speed');
    
    // Array of text file extensions
    const textFileExtensions = [
        '.txt', '.md', '.js', '.html', '.css', '.json', '.xml', '.csv', 
        '.py', '.c', '.cpp', '.h', '.java', '.php', '.rb', '.pl', '.sh',
        '.log', '.ini', '.cfg', '.conf', '.yml', '.yaml', '.toml', '.jsx',
        '.ts', '.tsx', '.vue', '.sql', '.gitignore', '.env', '.bat'
    ];
    
    // Array of image file extensions
    const imageFileExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'
    ];
    
    // Array of video file extensions
    const videoFileExtensions = [
        '.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.mkv', '.flv', '.m4v', '.3gp'
    ];
    
    // Progress bar elements
    const uploadProgressContainer = document.querySelector('.upload-progress-container');
    const uploadProgressBar = document.querySelector('.upload-progress-bar');
    const uploadProgressStatus = document.querySelector('.upload-progress-status');
    const uploadProgressFile = document.querySelector('.upload-progress-file');
    const uploadProgressInfo = document.querySelector('.upload-progress-info');
    
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
            
            // Name cell with description as tooltip
            const nameCell = document.createElement('td');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = file.filename;
            
            // Add file type icon based on extension
            const fileExtension = getFileExtension(file.filename).toLowerCase();
            
            // Create file icon element
            const fileIcon = document.createElement('span');
            fileIcon.className = 'file-icon';
            
            // Determine icon based on file type
            if (imageFileExtensions.includes(fileExtension)) {
                fileIcon.textContent = '🖼️ ';
                fileIcon.title = 'Image file';
            } else if (videoFileExtensions.includes(fileExtension)) {
                fileIcon.textContent = '🎬 ';
                fileIcon.title = 'Video file';
            } else if (textFileExtensions.includes(fileExtension)) {
                fileIcon.textContent = '📄 ';
                fileIcon.title = 'Text file';
            } else {
                fileIcon.textContent = '📁 ';
                fileIcon.title = 'File';
            }
            
            // Add description as tooltip if available
            if (file.description) {
                nameSpan.title = file.description;
                nameSpan.className = 'file-with-description';
            }
            
            // Add icon before filename
            nameCell.appendChild(fileIcon);
            nameCell.appendChild(nameSpan);
            
            // Add description as a small text if available
            if (file.description) {
                const descriptionDiv = document.createElement('div');
                descriptionDiv.className = 'file-description';
                descriptionDiv.textContent = file.description;
                nameCell.appendChild(descriptionDiv);
            }
            
            const sizeCell = document.createElement('td');
            sizeCell.textContent = formatFileSize(file.size);
            
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(file.created_at);
            
            const downloadsCell = document.createElement('td');
            downloadsCell.textContent = file.download_count;
            
            const actionsCell = document.createElement('td');
            
            // View button for previewing
            const viewBtn = document.createElement('button');
            viewBtn.textContent = 'View';
            viewBtn.className = 'file-action-btn view';
            viewBtn.setAttribute('data-file-id', file.id);
            viewBtn.addEventListener('click', () => {
                openFileViewer(file);
            });
            
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
            
            actionsCell.appendChild(viewBtn);
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
    
    // Add a file to the upload list
    function addFileToList(file) {
        // Create a file item element
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        // Create file item header
        const fileItemHeader = document.createElement('div');
        fileItemHeader.className = 'file-item-header';
        
        // Create file info elements
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove file';
        removeBtn.addEventListener('click', () => removeFile(file.name));
        
        // Add header elements
        fileItemHeader.appendChild(fileName);
        fileItemHeader.appendChild(fileSize);
        fileItemHeader.appendChild(removeBtn);
        
        // Create file item content
        const fileItemContent = document.createElement('div');
        fileItemContent.className = 'file-item-content';
        
        // Create rename container
        const renameContainer = document.createElement('div');
        renameContainer.className = 'file-rename-container';
        
        // Create rename input
        const renameInput = document.createElement('input');
        renameInput.type = 'text';
        renameInput.className = 'file-rename-input';
        renameInput.placeholder = 'Rename file (optional)';
        
        // Set initial value to filename without extension
        const nameParts = file.name.split('.');
        const extension = nameParts.pop();
        const baseName = nameParts.join('.');
        renameInput.value = baseName;
        renameInput.dataset.extension = `.${extension}`;
        renameInput.dataset.originalName = file.name;
        
        // Add rename input to container
        renameContainer.appendChild(renameInput);
        
        // Create description container
        const descriptionContainer = document.createElement('div');
        descriptionContainer.className = 'file-description-container';
        
        // Create description label
        const descriptionLabel = document.createElement('label');
        descriptionLabel.textContent = 'Description (optional):';
        
        // Create description textarea
        const descriptionTextarea = document.createElement('textarea');
        descriptionTextarea.className = 'file-description-input';
        descriptionTextarea.placeholder = 'Add a description for this file...';
        
        // Add description elements to container
        descriptionContainer.appendChild(descriptionLabel);
        descriptionContainer.appendChild(descriptionTextarea);
        
        // Add content elements
        fileItemContent.appendChild(renameContainer);
        fileItemContent.appendChild(descriptionContainer);
        
        // Add all elements to the file item
        fileItem.appendChild(fileItemHeader);
        fileItem.appendChild(fileItemContent);
        
        // Set data attribute to identify file
        fileItem.dataset.filename = file.name;
        
        // Add the file item to the list
        fileList.appendChild(fileItem);
        
        // Enable the upload button
        uploadBtn.disabled = false;
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
        
        // Disable upload button and form inputs
        uploadBtn.disabled = true;
        selectFileBtn.disabled = true;
        
        // Show progress container
        uploadProgressContainer.classList.remove('hidden');
        uploadProgressBar.style.width = '0%';
        uploadProgressStatus.textContent = '0%';
        uploadProgressInfo.textContent = `0 of ${filesToUpload.length} files`;
        
        // Variables to track upload progress
        let filesUploaded = 0;
        let totalProgress = 0;
        
        // Process files one by one for better progress tracking
        uploadNextFile(0);
        
        function uploadNextFile(index) {
            if (index >= filesToUpload.length) {
                // All files uploaded
                finishUpload();
                return;
            }
            
            const file = filesToUpload[index];
            const formData = new FormData();
            
            // Find the file item in the DOM
            const fileItem = fileList.querySelector(`[data-filename="${file.name}"]`);
            let customName = null;
            let fileDescription = '';
            
            if (fileItem) {
                // Get custom filename if provided
                const renameInput = fileItem.querySelector('.file-rename-input');
                if (renameInput && renameInput.value.trim() !== '') {
                    const newBaseName = renameInput.value.trim();
                    const extension = renameInput.dataset.extension;
                    customName = newBaseName + extension;
                }
                
                // Get individual description if provided
                const descriptionInput = fileItem.querySelector('.file-description-input');
                if (descriptionInput && descriptionInput.value.trim() !== '') {
                    fileDescription = descriptionInput.value.trim();
                } else if (globalFileDescription.value.trim() !== '') {
                    // Use global description as fallback
                    fileDescription = globalFileDescription.value.trim();
                }
            }
            
            // Update progress display
            uploadProgressFile.textContent = customName || file.name;
            uploadProgressInfo.textContent = `${index + 1} of ${filesToUpload.length} files`;
            
            // Append file to formData
            formData.append('file', file);
            
            // Add custom filename if provided
            if (customName) {
                formData.append('custom_filename', customName);
            }
            
            // Add description if provided
            if (fileDescription) {
                formData.append('description', fileDescription);
            }
            
            // Use XMLHttpRequest for progress monitoring
            const xhr = new XMLHttpRequest();
            
            // Track upload progress for this file
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    // Calculate progress for this file
                    const fileProgress = (e.loaded / e.total) * 100;
                    
                    // Calculate total progress across all files
                    // Each file contributes its proportion to the total
                    const fileContribution = fileProgress / filesToUpload.length;
                    
                    // Add completed files contribution
                    const completedContribution = (filesUploaded / filesToUpload.length) * 100;
                    
                    // Update progress bar
                    const totalPercentage = completedContribution + fileContribution;
                    updateProgress(totalPercentage);
                }
            });
            
            // Handle successful upload
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            // Increment counter and continue with next file
                            filesUploaded++;
                            
                            // Continue with next file
                            uploadNextFile(index + 1);
                        } else {
                            handleUploadError(`Failed to upload ${file.name}: ${response.error || 'Unknown error'}`);
                        }
                    } catch (error) {
                        handleUploadError(`Failed to parse response for ${file.name}`);
                    }
                } else {
                    handleUploadError(`Server returned status ${xhr.status} for ${file.name}`);
                }
            };
            
            // Handle upload error
            xhr.onerror = function() {
                handleUploadError(`Network error while uploading ${file.name}`);
            };
            
            // Set up request and send
            xhr.open('POST', '/api/upload', true);
            xhr.send(formData);
        }
        
        function updateProgress(percentage) {
            const roundedPercentage = Math.min(100, Math.round(percentage));
            uploadProgressBar.style.width = `${roundedPercentage}%`;
            uploadProgressStatus.textContent = `${roundedPercentage}%`;
        }
        
        function handleUploadError(errorMessage) {
            console.error('Upload error:', errorMessage);
            showErrorMessage(`Upload failed: ${errorMessage}`);
            
            // Reset UI
            resetUploadUI();
        }
        
        function finishUpload() {
            // Update progress to 100%
            updateProgress(100);
            uploadProgressFile.textContent = 'Upload complete!';
            
            // Wait a moment to show the completed progress before resetting
            setTimeout(() => {
                // Reset UI
                resetUploadUI();
                
                // Clear the file list
                fileList.innerHTML = '';
                filesToUpload = [];
                
                // Clear the description
                globalFileDescription.value = '';
                
                // Notify all clients via WebSocket
                if (isConnected) {
                    socket.emit('file_uploaded', {});
                }
                
                // Reload the file list
                loadFiles();
            }, 1000);
        }
        
        function resetUploadUI() {
            // Hide progress
            uploadProgressContainer.classList.add('hidden');
            
            // Enable buttons
            uploadBtn.disabled = filesToUpload.length === 0;
            selectFileBtn.disabled = false;
        }
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
    
    // Function to format time in MM:SS format
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    // Add video player event listeners
    if (viewerVideo) {
        // Update video time display
        viewerVideo.addEventListener('timeupdate', () => {
            videoCurrentTime.textContent = formatTime(viewerVideo.currentTime);
        });
        
        // Set video duration when metadata is loaded
        viewerVideo.addEventListener('loadedmetadata', () => {
            videoDuration.textContent = formatTime(viewerVideo.duration);
        });
        
        // Handle playback speed changes
        videoPlaybackSpeed.addEventListener('change', () => {
            viewerVideo.playbackRate = parseFloat(videoPlaybackSpeed.value);
        });
    }
    
    // Function to open the file viewer modal
    function openFileViewer(file) {
        // Set the file name, description and details
        modalFileName.textContent = file.filename;
        
        // Set description or default message
        if (file.description) {
            modalFileDescription.textContent = file.description;
        } else {
            modalFileDescription.textContent = 'No description available';
        }
        
        // Set file details
        modalFileDetails.textContent = `Size: ${formatFileSize(file.size)} | Type: ${file.mime_type || 'Unknown'} | Downloads: ${file.download_count}`;
        
        // Set download link
        modalDownloadBtn.href = `/api/download/${file.id}`;
        
        // Hide all viewer containers first
        imageViewer.style.display = 'none';
        videoViewer.style.display = 'none';
        textViewer.style.display = 'none';
        unsupportedViewer.style.display = 'none';
        
        // Reset video player
        if (viewerVideo) {
            viewerVideo.pause();
            viewerVideo.currentTime = 0;
            viewerVideo.playbackRate = 1.0;
            videoPlaybackSpeed.value = "1";
            videoCurrentTime.textContent = "0:00";
            videoDuration.textContent = "0:00";
        }
        
        // Clear previous content
        viewerImage.src = '';
        viewerVideo.src = '';
        viewerText.textContent = '';
        
        // Determine file type and show appropriate viewer
        const fileExtension = getFileExtension(file.filename).toLowerCase();
        
        if (imageFileExtensions.includes(fileExtension)) {
            // Show image viewer
            imageViewer.style.display = 'flex';
            
            // Set image source
            viewerImage.src = `/api/download/${file.id}?preview=true`;
            viewerImage.alt = file.filename;
        }
        else if (videoFileExtensions.includes(fileExtension)) {
            // Show video viewer
            videoViewer.style.display = 'flex';
            
            // Set video source
            viewerVideo.src = `/api/download/${file.id}?preview=true`;
            
            // Set poster image if available (thumbnail)
            viewerVideo.poster = '/img/video-poster.png';
            
            // Add metadata
            viewerVideo.title = file.filename;
            
            // Load the video
            viewerVideo.load();
        }
        else if (textFileExtensions.includes(fileExtension)) {
            // Show text viewer
            textViewer.style.display = 'flex';
            
            // Load the text content
            fetch(`/api/download/${file.id}?preview=true`)
                .then(response => response.text())
                .then(text => {
                    viewerText.textContent = text;
                    
                    // Apply syntax highlighting if available
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(viewerText);
                    }
                })
                .catch(error => {
                    viewerText.textContent = `Error loading file: ${error.message}`;
                });
        }
        else {
            // Show unsupported file type message
            unsupportedViewer.style.display = 'flex';
        }
        
        // Show the modal
        fileViewerModal.style.display = 'block';
    }
    
    // Get file extension (including the dot)
    function getFileExtension(filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex === -1) return '';
        return filename.substring(lastDotIndex);
    }
    
    // Close the modal when clicking the close button
    closeModal.addEventListener('click', () => {
        // Pause video if playing
        if (viewerVideo) {
            viewerVideo.pause();
        }
        
        fileViewerModal.style.display = 'none';
        
        // Clear content when closed
        viewerImage.src = '';
        viewerVideo.src = '';
        viewerText.textContent = '';
    });
    
    // Close the modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === fileViewerModal) {
            // Pause video if playing
            if (viewerVideo) {
                viewerVideo.pause();
            }
            
            fileViewerModal.style.display = 'none';
            
            // Clear content when closed
            viewerImage.src = '';
            viewerVideo.src = '';
            viewerText.textContent = '';
        }
    });
}); 