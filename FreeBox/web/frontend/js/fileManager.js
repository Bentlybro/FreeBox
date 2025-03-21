/**
 * FreeBox Web Interface
 * File management functionality
 */

import { formatFileSize, formatDate } from './utils.js';
import { openFileViewer } from './viewerManager.js';
import * as socketManager from './socketManager.js';
import { addSystemMessage } from './chatManager.js';

// DOM elements
let fileTableBody;
let noFilesMessage;
let loadingFiles;
let fileInput;
let fileList;
let fileDropArea;
let uploadBtn;
let globalFileDescription;
let uploadProgressContainer;
let uploadProgressBar;
let uploadProgressStatus;
let uploadProgressFile;
let uploadProgressInfo;
let selectFileBtn;

// Track files to upload
let filesToUpload = [];

/**
 * Initialize file manager
 * @param {Object} elements - DOM elements for file management
 */
export function init(elements) {
    // Store DOM elements
    fileTableBody = elements.fileTableBody;
    noFilesMessage = elements.noFilesMessage;
    loadingFiles = elements.loadingFiles;
    fileInput = elements.fileInput;
    fileList = elements.fileList;
    fileDropArea = elements.fileDropArea;
    uploadBtn = elements.uploadBtn;
    globalFileDescription = elements.globalFileDescription;
    uploadProgressContainer = elements.uploadProgressContainer;
    uploadProgressBar = elements.uploadProgressBar;
    uploadProgressStatus = elements.uploadProgressStatus;
    uploadProgressFile = elements.uploadProgressFile;
    uploadProgressInfo = elements.uploadProgressInfo;
    selectFileBtn = elements.selectFileBtn;
    
    // Setup socket event listeners
    setupSocketListeners();
}

/**
 * Set up socket event listeners
 */
function setupSocketListeners() {
    socketManager.on('file_list_updated', () => {
        // Reload the file list
        loadFiles();
    });
    
    socketManager.on('file_downloaded', (data) => {
        // Update download count in the UI without reloading the entire file list
        updateFileDownloadCount(data.file);
    });
}

/**
 * Load available files from server
 */
export function loadFiles() {
    showLoading(true);
    
    fetch('/api/files')
        .then(response => response.json())
        .then(files => {
            displayFiles(files);
        })
        .catch(error => {
            console.error('Error loading files:', error);
            alert('Failed to load files. Please try again.');
        })
        .finally(() => {
            showLoading(false);
        });
}

/**
 * Display files in the table
 * @param {Array} files - Array of file objects
 */
export function displayFiles(files) {
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
        const fileExtension = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
        
        // Create file icon element
        const fileIcon = document.createElement('span');
        fileIcon.className = 'file-icon';
        
        // Determine icon based on file type
        if (fileExtension.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i)) {
            fileIcon.textContent = '🖼️ ';
            fileIcon.title = 'Image file';
        } else if (fileExtension.match(/\.(mp4|webm|ogg|mov|avi|wmv|mkv|flv|m4v|3gp)$/i)) {
            fileIcon.textContent = '🎬 ';
            fileIcon.title = 'Video file';
        } else if (fileExtension.match(/\.(txt|md|js|html|css|json|xml|csv|py|c|cpp|h|java|php|rb|pl|sh|log|ini|cfg|conf|yml|yaml|toml)$/i)) {
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

/**
 * Delete a file
 * @param {string} fileId - ID of the file to delete
 */
export function deleteFile(fileId) {
    fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadFiles();
        } else {
            alert(`Failed to delete file: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error deleting file:', error);
        alert('Failed to delete file. Please try again.');
    });
}

/**
 * Update the download count for a specific file in the UI
 * @param {Object} file - File object with updated download count
 */
export function updateFileDownloadCount(file) {
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

/**
 * Handle file selection from input
 * @param {Event} e - Input change event
 */
export function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

/**
 * Process selected files
 * @param {FileList} files - Selected files
 */
export function handleFiles(files) {
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

/**
 * Check if file already exists in the list
 * @param {string} filename - File name to check
 * @returns {boolean} - True if file exists
 */
function fileExists(filename) {
    return filesToUpload.some(file => file.name === filename);
}

/**
 * Add a file to the upload list
 * @param {File} file - File object
 */
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

/**
 * Remove file from the list
 * @param {string} filename - Name of file to remove
 */
export function removeFile(filename) {
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

/**
 * Upload files to the server
 */
export function uploadFiles() {
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
        alert(`Upload failed: ${errorMessage}`);
        
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
            socketManager.notifyFileUploaded();
            
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

/**
 * Show or hide loading indicator
 * @param {boolean} show - Whether to show the loading indicator
 */
export function showLoading(show) {
    if (show) {
        loadingFiles.classList.remove('hidden');
    } else {
        loadingFiles.classList.add('hidden');
    }
} 