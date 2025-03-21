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
    
    // Add these variables at the top with your other DOM elements
    const multiActionBar = document.getElementById('multi-action-bar');
    const selectedFilesCount = document.getElementById('selected-files-count');
    const multiDownloadBtn = document.getElementById('multi-download-btn');
    const multiDeleteBtn = document.getElementById('multi-delete-btn');
    const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
    const filesToDeleteList = document.getElementById('files-to-delete-list');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Add a global variable to track selected files
    let selectedFiles = [];
    
    // Add this to your global variables
    const toastContainer = document.getElementById('toast-container');
    
    // Initialize the page
    init();
    
    // Function to initialize the page
    function init() {
        // Set username from local storage if available
        if (username) {
            usernameInput.value = username;
        }
        
        // Set visitor cookie if not already set
        setVisitorCookie();
        
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
            // Connect to the WebSocket server (Socket.IO) with explicit transport options
            socket = io({
                transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000
            });
            
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
                
                // Add a system message
                addSystemMessage('Connected to the server. Chat is ready.');
            });
            
            socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                isConnected = false;
                addSystemMessage('Connection error: ' + error.message);
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
        const statusIndicator = document.querySelector('.status-indicator');
        
        // Set a timeout to handle when the server doesn't respond
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out')), 3000);
        });
        
        // Try to fetch status with a timeout
        Promise.race([
            fetch('/api/status', {
                credentials: 'include' // Include cookies in the request
            }),
            timeoutPromise
        ])
            .then(response => {
                if (!response.ok) {
                    throw new Error('Server returned an error');
                }
                return response.json();
            })
            .then(data => {
                statusText.textContent = `FreeBox is online in ${data.mode} mode`;
                statusIndicator.classList.add('online');
                statusIndicator.classList.remove('offline');
                
                // Store latest server timestamp for status checking
                localStorage.setItem('freebox_last_timestamp', data.timestamp);
                
                // Schedule the next status check
                setTimeout(checkStatus, 5000);
            })
            .catch(error => {
                console.error('Error checking status:', error);
                statusText.textContent = 'FreeBox is offline';
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
                
                // Retry connection after a delay
                setTimeout(checkStatus, 10000);
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
        
        fetch('/api/stats', {
            credentials: 'include' // Include cookies in the request
        })
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
            
            // Main value shows used storage with more clarity
            storageElement.textContent = storageSize;
            
            // Add storage detail as a separate element
            let detailElement = storageElement.nextElementSibling;
            if (!detailElement || !detailElement.classList.contains('stat-detail')) {
                detailElement = document.createElement('div');
                detailElement.className = 'stat-detail';
                storageElement.parentNode.insertBefore(detailElement, storageElement.nextSibling);
            }
            
            // Check if we have valid system data for disk space
            if (stats.system && stats.system.disk_total) {
                const totalSize = formatFileSize(stats.system.disk_total);
                const freeSize = formatFileSize(stats.system.disk_free || 0);
                detailElement.textContent = `${freeSize} free / ${totalSize} total`;
            } else {
                detailElement.textContent = 'No storage information available';
            }
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
        
        // Add system resources info (CPU and RAM)
        const cpuElement = document.getElementById('cpu-usage-value');
        if (cpuElement && stats.system) {
            // Add CPU usage value
            cpuElement.textContent = `${stats.system.cpu_percent.toFixed(1)}%`;
            
            // Update CPU detail
            let cpuDetailElement = cpuElement.nextElementSibling;
            if (cpuDetailElement && cpuDetailElement.classList.contains('stat-detail')) {
                cpuDetailElement.textContent = 'System processor usage';
            }
            
            // Find progress container (should already exist from HTML)
            const progressContainer = cpuDetailElement.nextElementSibling;
            if (progressContainer && progressContainer.classList.contains('progress-container')) {
                // Update progress bar
                const progressBar = progressContainer.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${stats.system.cpu_percent}%`;
                    
                    // Change color based on usage
                    if (stats.system.cpu_percent > 80) {
                        progressBar.className = 'progress-bar high';
                    } else if (stats.system.cpu_percent > 50) {
                        progressBar.className = 'progress-bar medium';
                    } else {
                        progressBar.className = 'progress-bar low';
                    }
                }
            }
        }
        
        // CPU temperature
        const cpuTempElement = document.getElementById('cpu-temp-value');
        if (cpuTempElement && stats.system && stats.system.cpu_temperature !== null) {
            // Format temperature in Celsius
            const temperature = stats.system.cpu_temperature;
            cpuTempElement.textContent = `${temperature.toFixed(1)}°C`;
            
            // Find progress container
            const progressContainer = cpuTempElement.nextElementSibling.nextElementSibling;
            if (progressContainer && progressContainer.classList.contains('progress-container')) {
                // Update progress bar - use percentage based on a typical temperature range (20-90°C)
                const tempPercent = Math.min(100, Math.max(0, ((temperature - 20) / 70) * 100));
                const progressBar = progressContainer.querySelector('.progress-bar');
                
                if (progressBar) {
                    progressBar.style.width = `${tempPercent}%`;
                    
                    // Change color based on temperature
                    if (temperature > 75) {
                        progressBar.className = 'progress-bar high';
                    } else if (temperature > 60) {
                        progressBar.className = 'progress-bar medium';
                    } else {
                        progressBar.className = 'progress-bar low';
                    }
                }
            }
        } else if (cpuTempElement) {
            // Handle case where temperature data is not available
            cpuTempElement.textContent = 'N/A';
            const detailElement = cpuTempElement.nextElementSibling;
            if (detailElement && detailElement.classList.contains('stat-detail')) {
                detailElement.textContent = 'Temperature data not available';
            }
        }
        
        // RAM usage
        const ramElement = document.getElementById('ram-usage-value');
        if (ramElement && stats.system) {
            // Add RAM usage value
            ramElement.textContent = `${stats.system.memory_percent.toFixed(1)}%`;
            
            // Update RAM detail
            let ramDetailElement = ramElement.nextElementSibling;
            if (ramDetailElement && ramDetailElement.classList.contains('stat-detail')) {
                ramDetailElement.textContent = `${formatFileSize(stats.system.memory_used)} / ${formatFileSize(stats.system.memory_total)}`;
            }
            
            // Find progress container (should already exist from HTML)
            const progressContainer = ramDetailElement.nextElementSibling;
            if (progressContainer && progressContainer.classList.contains('progress-container')) {
                // Update progress bar
                const progressBar = progressContainer.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${stats.system.memory_percent}%`;
                    
                    // Change color based on usage
                    if (stats.system.memory_percent > 80) {
                        progressBar.className = 'progress-bar high';
                    } else if (stats.system.memory_percent > 50) {
                        progressBar.className = 'progress-bar medium';
                    } else {
                        progressBar.className = 'progress-bar low';
                    }
                }
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
        
        // Add a checkbox column to the table header
        const headerRow = document.querySelector('#file-table thead tr');
        if (!headerRow.querySelector('.select-column')) {
            const selectHeader = document.createElement('th');
            selectHeader.className = 'select-column';
            selectHeader.style.width = '40px';
            
            // Add "Select All" checkbox
            const selectAllCheckbox = document.createElement('input');
            selectAllCheckbox.type = 'checkbox';
            selectAllCheckbox.className = 'file-select-checkbox select-all';
            selectAllCheckbox.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.file-select-checkbox:not(.select-all)');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                    handleCheckboxChange(checkbox);
                });
            });
            
            selectHeader.appendChild(selectAllCheckbox);
            headerRow.insertBefore(selectHeader, headerRow.firstChild);
        }
        
        files.forEach(file => {
            const row = document.createElement('tr');
            row.dataset.fileId = file.id;
            
            // Add checkbox cell
            const checkboxCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'file-select-checkbox';
            checkbox.dataset.fileId = file.id;
            checkbox.dataset.fileName = file.filename;
            checkbox.addEventListener('change', function() {
                handleCheckboxChange(this);
            });
            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);
            
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
                showDeleteConfirmation([file]);
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
    
    // Handle checkbox change
    function handleCheckboxChange(checkbox) {
        const fileId = checkbox.dataset.fileId;
        const fileName = checkbox.dataset.fileName;
        
        if (checkbox.checked) {
            // Add to selected files if not already there
            if (!selectedFiles.some(f => f.id === fileId)) {
                selectedFiles.push({
                    id: fileId,
                    filename: fileName
                });
            }
        } else {
            // Remove from selected files
            selectedFiles = selectedFiles.filter(f => f.id !== fileId);
            
            // Uncheck "select all" if any individual checkbox is unchecked
            const selectAllCheckbox = document.querySelector('.file-select-checkbox.select-all');
            if (selectAllCheckbox && selectAllCheckbox.checked) {
                selectAllCheckbox.checked = false;
            }
        }
        
        // Update UI
        updateMultiActionBar();
    }
    
    // Update multi-action bar visibility and count
    function updateMultiActionBar() {
        if (selectedFiles.length > 0) {
            multiActionBar.classList.add('visible');
            selectedFilesCount.textContent = selectedFiles.length;
        } else {
            multiActionBar.classList.remove('visible');
        }
    }
    
    // Show delete confirmation modal
    function showDeleteConfirmation(files) {
        // Clear previous list
        filesToDeleteList.innerHTML = '';
        
        // Add files to the list
        files.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file.filename;
            filesToDeleteList.appendChild(li);
        });
        
        // Store files to delete in a data attribute
        confirmDeleteBtn.dataset.filesToDelete = JSON.stringify(files);
        
        // Show the modal
        deleteConfirmationModal.style.display = 'block';
    }
    
    // Function to show a toast notification
    function showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Add icon based on type
        let iconClass = 'info-circle';
        if (type === 'success') iconClass = 'check-circle';
        if (type === 'error') iconClass = 'exclamation-circle';
        
        // Create toast content
        toast.innerHTML = `
            <span class="toast-icon"><i class="fas fa-${iconClass}"></i></span>
            <span class="toast-message">${message}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Set up close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'toast-out 0.3s ease forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toast.remove();
            }
        }, 5000);
    }
    
    // Now modify the deleteMultipleFiles function to use toast instead of alert
    function deleteMultipleFiles(files) {
        // Create a counter for tracking progress
        let deletedCount = 0;
        let errorCount = 0;
        
        // Process each file
        const deletePromises = files.map(file => {
            return fetch(`/api/files/${file.id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    deletedCount++;
                } else {
                    errorCount++;
                    console.error(`Failed to delete ${file.filename}: ${data.error}`);
                }
            })
            .catch(error => {
                errorCount++;
                console.error(`Error deleting ${file.filename}:`, error);
            });
        });
        
        // Wait for all deletions to complete
        Promise.all(deletePromises)
            .then(() => {
                // Show result message as toast instead of alert
                if (errorCount === 0) {
                    showToast(`Successfully deleted ${deletedCount} file(s).`, 'success');
                } else {
                    showToast(`Deleted ${deletedCount} file(s). Failed to delete ${errorCount} file(s).`, 'error');
                }
                
                // Reload files and reset selection
                loadFiles();
                selectedFiles = [];
                updateMultiActionBar();
            });
    }
    
    // Download multiple files
    function downloadMultipleFiles(files) {
        // For small numbers of files, we can open them in new tabs
        if (files.length <= 5) {
            files.forEach(file => {
                window.open(`/api/download/${file.id}`, '_blank');
            });
        } else {
            // For larger numbers, we should ideally create a zip file on the server
            // But for now, we'll just inform the user
            alert(`Downloading ${files.length} files. Check your browser's download manager.`);
            
            // Stagger the downloads slightly to avoid overwhelming the browser
            files.forEach((file, index) => {
                setTimeout(() => {
                    window.open(`/api/download/${file.id}`, '_blank');
                }, index * 300);
            });
        }
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
        
        // Multi-action buttons
        multiDownloadBtn.addEventListener('click', () => {
            downloadMultipleFiles(selectedFiles);
        });
        
        multiDeleteBtn.addEventListener('click', () => {
            showDeleteConfirmation(selectedFiles);
        });
        
        // Confirmation modal buttons
        cancelDeleteBtn.addEventListener('click', () => {
            deleteConfirmationModal.style.display = 'none';
        });
        
        confirmDeleteBtn.addEventListener('click', () => {
            const filesToDelete = JSON.parse(confirmDeleteBtn.dataset.filesToDelete);
            deleteMultipleFiles(filesToDelete);
            deleteConfirmationModal.style.display = 'none';
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === deleteConfirmationModal) {
                deleteConfirmationModal.style.display = 'none';
            }
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
        uploadProgressInfo.textContent = `Preparing to upload ${filesToUpload.length} files...`;
        
        // Variables to track upload progress
        let filesUploaded = 0;
        let filesInProgress = 0;
        let maxConcurrentUploads = 3; // Default value, will be updated based on server status
        const fileProgress = {}; // Track progress for each file by index
        
        // Initialize progress for each file
        filesToUpload.forEach((_, index) => {
            fileProgress[index] = 0;
        });
        
        // First, fetch server status to get optimal concurrent uploads setting
        fetch('/api/server-status')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update max concurrent uploads based on server recommendation
                    maxConcurrentUploads = data.recommended_concurrent_uploads || maxConcurrentUploads;
                    console.log(`Server recommends ${maxConcurrentUploads} concurrent uploads`);
                }
            })
            .catch(error => {
                console.warn('Could not fetch server status, using default concurrency:', error);
            })
            .finally(() => {
                // Start uploading files regardless of whether the status fetch succeeded
                uploadProgressInfo.textContent = `Starting uploads (${maxConcurrentUploads} at a time)...`;
                
                // Start initial batch of uploads
                startUploads(0);
            });
        
        // Function to start multiple uploads up to the concurrent limit
        function startUploads(startIndex) {
            // Start as many uploads as allowed by the concurrent limit
            for (let i = startIndex; i < filesToUpload.length && filesInProgress < maxConcurrentUploads; i++) {
                if (fileProgress[i] === 0) { // Only start uploads that haven't been started
                    uploadFile(i);
                    filesInProgress++;
                }
            }
        }
        
        // Function to upload a single file
        function uploadFile(index) {
            const file = filesToUpload[index];
            const formData = new FormData();
            
            // Find the file item in the DOM
            const fileItem = fileList.querySelector(`[data-filename="${file.name}"]`);
            let customName = null;
            let fileDescription = '';
            
            if (fileItem) {
                // Add "uploading" visual indicator to this file item
                fileItem.classList.add('uploading');
                
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
            
            // Update files in progress display
            uploadProgressInfo.textContent = `${filesUploaded} completed, ${filesInProgress} in progress (of ${filesToUpload.length})`;
            
            // Display the current file name
            const displayName = customName || file.name;
            uploadProgressFile.textContent = `Now uploading: ${displayName}`;
            
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
                    // Calculate progress percentage for this file (0-100)
                    const thisFileProgress = (e.loaded / e.total) * 100;
                    fileProgress[index] = thisFileProgress;
                    
                    // Calculate total progress across all files
                    updateTotalProgress();
                    
                    // Update individual file item progress if available
                    if (fileItem) {
                        updateFileItemProgress(fileItem, thisFileProgress);
                    }
                }
            });
            
            // Handle successful upload
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            console.log(`Uploaded file: ${file.name}`);
                            // Mark this file as complete (100%)
                            fileProgress[index] = 100;
                            filesUploaded++;
                            filesInProgress--;
                            
                            // Remove uploading indicator and add completed indicator
                            if (fileItem) {
                                fileItem.classList.remove('uploading');
                                fileItem.classList.add('upload-complete');
                            }
                            
                            // Update overall progress
                            updateTotalProgress();
                            
                            // Update status info
                            uploadProgressInfo.textContent = `${filesUploaded} completed, ${filesInProgress} in progress (of ${filesToUpload.length})`;
                            
                            // If all files are uploaded, finish up
                            if (filesUploaded === filesToUpload.length) {
                                finishUpload();
                            } else {
                                // Otherwise, start a new upload if there are files waiting
                                startUploads(index + 1);
                            }
                        } else {
                            handleUploadError(`Failed to upload ${file.name}: ${response.error || 'Unknown error'}`);
                            
                            // Start the next file
                            filesInProgress--;
                            startUploads(index + 1);
                        }
                    } catch (error) {
                        handleUploadError(`Failed to parse response for ${file.name}`);
                        
                        // Start the next file
                        filesInProgress--;
                        startUploads(index + 1);
                    }
                } else {
                    handleUploadError(`Server returned status ${xhr.status} for ${file.name}`);
                    
                    // Start the next file
                    filesInProgress--;
                    startUploads(index + 1);
                }
            };
            
            // Handle upload error
            xhr.onerror = function() {
                handleUploadError(`Network error while uploading ${file.name}`);
                
                // Remove the file from progress tracking
                filesInProgress--;
                
                // Try to start next file
                startUploads(index + 1);
            };
            
            // Set up request and send
            xhr.open('POST', '/api/upload', true);
            xhr.send(formData);
        }
        
        // Update visual progress indicator for a file item
        function updateFileItemProgress(fileItem, progress) {
            // Add progress indicator if it doesn't exist
            let progressBar = fileItem.querySelector('.file-item-progress');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'file-item-progress-container';
                
                const bar = document.createElement('div');
                bar.className = 'file-item-progress';
                progressBar.appendChild(bar);
                
                // Insert after the header
                const header = fileItem.querySelector('.file-item-header');
                header.parentNode.insertBefore(progressBar, header.nextSibling);
            }
            
            // Update the progress bar
            const barElement = progressBar.querySelector('.file-item-progress');
            barElement.style.width = `${progress}%`;
        }
        
        // Calculate and update the total progress
        function updateTotalProgress() {
            // Calculate average progress across all files
            let totalProgress = 0;
            
            // Sum up progress of all files
            Object.values(fileProgress).forEach(progress => {
                totalProgress += progress;
            });
            
            // Calculate average (divide by total number of files)
            const overallProgress = totalProgress / filesToUpload.length;
            
            // Update overall progress bar
            updateProgress(overallProgress);
        }
        
        function updateProgress(percentage) {
            const roundedPercentage = Math.min(100, Math.round(percentage));
            uploadProgressBar.style.width = `${roundedPercentage}%`;
            uploadProgressStatus.textContent = `${roundedPercentage}%`;
        }
        
        function handleUploadError(errorMessage) {
            console.error('Upload error:', errorMessage);
            showErrorMessage(`Upload failed: ${errorMessage}`);
            
            // Note: We don't reset the UI here because we want to continue
            // with other uploads if possible. Only show the error.
        }
        
        function finishUpload() {
            // Update progress to 100%
            updateProgress(100);
            uploadProgressFile.textContent = 'Upload complete!';
            uploadProgressInfo.textContent = `All ${filesToUpload.length} files uploaded successfully!`;
            
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
    
    // Set a visitor cookie to track unique visitors
    function setVisitorCookie() {
        // Check if visitor cookie exists
        if (!getCookie('freebox_visitor')) {
            // Generate a unique visitor ID
            const visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Set cookie with a 24-hour expiration
            const expiryDate = new Date();
            expiryDate.setTime(expiryDate.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
            
            // Set the cookie
            document.cookie = `freebox_visitor=${visitorId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
            
            // Notify the server about a new visitor (only if this is a new visitor)
            fetch('/api/visitor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Include cookies in the request
                body: JSON.stringify({ visitorId: visitorId })
            }).catch(error => {
                console.error('Error registering visitor:', error);
            });
        }
    }
    
    // Helper function to get a cookie value by name
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }
}); 