/**
 * FreeBox Web Interface
 * File viewer manager
 */

import { formatFileSize, formatTime, getFileExtension } from './utils.js';
import { textFileExtensions, imageFileExtensions, videoFileExtensions } from './config.js';

// DOM elements
let fileViewerModal;
let modalFileName;
let modalFileDescription;
let modalFileDetails; 
let modalDownloadBtn;
let closeModalBtn;
let imageViewer;
let videoViewer;
let textViewer;
let unsupportedViewer;
let viewerImage;
let viewerVideo;
let viewerText;

// Video player elements
let videoCurrentTime;
let videoDuration;
let videoPlaybackSpeed;

/**
 * Initialize the file viewer
 * @param {Object} elements - DOM elements for the viewer
 */
export function init(elements) {
    // Store DOM elements
    fileViewerModal = elements.fileViewerModal;
    modalFileName = elements.modalFileName;
    modalFileDescription = elements.modalFileDescription;
    modalFileDetails = elements.modalFileDetails;
    modalDownloadBtn = elements.modalDownloadBtn;
    closeModalBtn = elements.closeModal;
    imageViewer = elements.imageViewer;
    videoViewer = elements.videoViewer;
    textViewer = elements.textViewer;
    unsupportedViewer = elements.unsupportedViewer;
    viewerImage = elements.viewerImage;
    viewerVideo = elements.viewerVideo;
    viewerText = elements.viewerText;
    videoCurrentTime = elements.videoCurrentTime;
    videoDuration = elements.videoDuration;
    videoPlaybackSpeed = elements.videoPlaybackSpeed;
    
    setupEventListeners();
}

/**
 * Setup event listeners for the file viewer
 */
function setupEventListeners() {
    // Close the modal when clicking the close button
    closeModalBtn.addEventListener('click', closeViewer);
    
    // Close the modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === fileViewerModal) {
            closeViewer();
        }
    });
    
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
}

/**
 * Close the file viewer
 */
function closeViewer() {
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

/**
 * Open the file viewer modal
 * @param {Object} file - File object to view
 */
export function openFileViewer(file) {
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