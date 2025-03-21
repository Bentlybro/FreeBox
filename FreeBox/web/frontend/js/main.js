/**
 * FreeBox Web Interface
 * Main entry point for the application
 */

import { generateRandomUsername } from './utils.js';
import * as fileManager from './fileManager.js';
import * as chatManager from './chatManager.js';
import * as viewerManager from './viewerManager.js';
import * as socketManager from './socketManager.js';
import * as uiManager from './uiManager.js';
import * as stats from './stats.js';
import { DEFAULT_ROOM } from './config.js';

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

/**
 * Initialize the application
 */
function initApp() {
    // User information
    const username = localStorage.getItem('freebox_username') || generateRandomUsername();
    
    // Collect DOM elements for each module
    const elements = collectDomElements();
    
    // Initialize UI manager first
    uiManager.init({
        fileDropArea: elements.fileDropArea,
        selectFileBtn: elements.selectFileBtn,
        fileInput: elements.fileInput,
        statusText: elements.statusText
    });
    
    // Initialize WebSocket connection
    socketManager.setupSocket(username);
    
    // Initialize file manager
    fileManager.init({
        fileTableBody: elements.fileTableBody,
        noFilesMessage: elements.noFilesMessage,
        loadingFiles: elements.loadingFiles,
        fileInput: elements.fileInput,
        fileList: elements.fileList,
        fileDropArea: elements.fileDropArea,
        uploadBtn: elements.uploadBtn,
        globalFileDescription: elements.globalFileDescription,
        uploadProgressContainer: elements.uploadProgressContainer,
        uploadProgressBar: elements.uploadProgressBar,
        uploadProgressStatus: elements.uploadProgressStatus,
        uploadProgressFile: elements.uploadProgressFile,
        uploadProgressInfo: elements.uploadProgressInfo,
        selectFileBtn: elements.selectFileBtn
    });
    
    // Initialize chat manager
    chatManager.init({
        chatMessages: elements.chatMessages,
        chatUsersCount: elements.chatUsersCount,
        messageInput: elements.messageInput,
        usernameInput: elements.usernameInput
    }, username);
    
    // Initialize viewer manager
    viewerManager.init({
        fileViewerModal: elements.fileViewerModal,
        modalFileName: elements.modalFileName,
        modalFileDescription: elements.modalFileDescription,
        modalFileDetails: elements.modalFileDetails,
        modalDownloadBtn: elements.modalDownloadBtn,
        closeModal: elements.closeModal,
        imageViewer: elements.imageViewer,
        videoViewer: elements.videoViewer,
        textViewer: elements.textViewer,
        unsupportedViewer: elements.unsupportedViewer,
        viewerImage: elements.viewerImage,
        viewerVideo: elements.viewerVideo,
        viewerText: elements.viewerText,
        videoCurrentTime: elements.videoCurrentTime,
        videoDuration: elements.videoDuration,
        videoPlaybackSpeed: elements.videoPlaybackSpeed
    });
    
    // Initialize stats manager
    stats.init({
        uptimeValue: elements.uptimeValue,
        visitorsValue: elements.visitorsValue,
        filesValue: elements.filesValue,
        storageValue: elements.storageValue,
        messagesValue: elements.messagesValue,
        popularFileValue: elements.popularFileValue,
        refreshStatsBtn: elements.refreshStatsBtn
    });
    
    // Setup event handlers that cross between modules
    setupEventHandlers();
    
    // Initial data loading
    initialDataLoad();
    
    // Show Files section by default
    document.querySelectorAll('main > section:not(#status):not(#files-section)').forEach(section => {
        section.style.display = 'none';
    });
}

/**
 * Collect all DOM elements needed by various modules
 * @returns {Object} Object containing DOM elements
 */
function collectDomElements() {
    return {
        // File-related elements
        fileInput: document.getElementById('file-input'),
        selectFileBtn: document.getElementById('select-file-btn'),
        fileDropArea: document.querySelector('.file-drop-area'),
        fileList: document.getElementById('file-list'),
        uploadForm: document.getElementById('upload-form'),
        uploadBtn: document.getElementById('upload-btn'),
        fileTableBody: document.getElementById('file-table-body'),
        noFilesMessage: document.getElementById('no-files-message'),
        loadingFiles: document.getElementById('loading-files'),
        globalFileDescription: document.getElementById('global-file-description'),
        uploadProgressContainer: document.querySelector('.upload-progress-container'),
        uploadProgressBar: document.querySelector('.upload-progress-bar'),
        uploadProgressStatus: document.querySelector('.upload-progress-status'),
        uploadProgressFile: document.querySelector('.upload-progress-file'),
        uploadProgressInfo: document.querySelector('.upload-progress-info'),
        
        // Chat-related elements
        chatMessages: document.getElementById('chat-messages'),
        messageInput: document.getElementById('message-input'),
        sendMessageBtn: document.getElementById('send-message-btn'),
        usernameInput: document.getElementById('username-input'),
        chatUsersCount: document.getElementById('chat-users-count'),
        
        // Viewer-related elements
        fileViewerModal: document.getElementById('file-viewer-modal'),
        modalFileName: document.getElementById('modal-file-name'),
        modalFileDescription: document.getElementById('modal-file-description'),
        modalFileDetails: document.getElementById('modal-file-details'),
        modalDownloadBtn: document.getElementById('modal-download-btn'),
        closeModal: document.querySelector('.close-modal'),
        imageViewer: document.getElementById('image-viewer'),
        videoViewer: document.getElementById('video-viewer'),
        textViewer: document.getElementById('text-viewer'),
        unsupportedViewer: document.getElementById('unsupported-viewer'),
        viewerImage: document.getElementById('viewer-image'),
        viewerVideo: document.getElementById('viewer-video'),
        viewerText: document.getElementById('viewer-text'),
        videoCurrentTime: document.getElementById('video-current-time'),
        videoDuration: document.getElementById('video-duration'),
        videoPlaybackSpeed: document.getElementById('video-playback-speed'),
        
        // Stats-related elements
        uptimeValue: document.getElementById('uptime-value'),
        visitorsValue: document.getElementById('visitors-value'),
        filesValue: document.getElementById('files-value'),
        storageValue: document.getElementById('storage-value'),
        messagesValue: document.getElementById('messages-value'),
        popularFileValue: document.getElementById('popular-file-value'),
        refreshStatsBtn: document.getElementById('refresh-stats-btn'),
        
        // Status-related elements
        statusText: document.querySelector('.status-text')
    };
}

/**
 * Set up event handlers for user interactions
 */
function setupEventHandlers() {
    // UI Event handlers
    uiManager.setupEventListeners({
        handleFileSelect: fileManager.handleFileSelect,
        handleFiles: fileManager.handleFiles
    });
    
    // Chat event handlers
    const sendMessageBtn = document.getElementById('send-message-btn');
    const messageInput = document.getElementById('message-input');
    
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', chatManager.sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chatManager.sendMessage();
            }
        });
    }
    
    // File upload event handlers
    const uploadForm = document.getElementById('upload-form');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', e => {
            e.preventDefault();
            fileManager.uploadFiles();
        });
    }
}

/**
 * Load initial data
 */
function initialDataLoad() {
    // Check status
    uiManager.checkStatus();
    
    // Load files
    fileManager.loadFiles();
    
    // Load stats
    stats.loadStats();
    
    // Set up automatic stats refresh every 30 seconds
    setInterval(() => {
        if (socketManager.isSocketConnected()) {
            socketManager.requestStatsUpdate();
        } else {
            stats.loadStats();
        }
    }, 30000);
} 