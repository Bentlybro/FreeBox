/**
 * FreeBox Web Interface
 * UI manager for handling general UI interactions
 */

import { scrollChatToBottom } from './chatManager.js';
import { loadStats } from './stats.js';
import * as socketManager from './socketManager.js';

// DOM elements
let fileDropArea;
let selectFileBtn;
let fileInput;
let statusText;

/**
 * Initialize UI manager
 * @param {Object} elements - DOM elements for UI
 */
export function init(elements) {
    // Store DOM elements
    fileDropArea = elements.fileDropArea;
    selectFileBtn = elements.selectFileBtn;
    fileInput = elements.fileInput;
    statusText = elements.statusText;
    
    // Setup event listeners
    setupEventListeners();
}

/**
 * Setup event listeners for general UI elements
 * @param {Object} handlers - Callback functions for various interactions
 */
export function setupEventListeners(handlers = {}) {
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
                    if (socketManager.isSocketConnected()) {
                        socketManager.requestStatsUpdate();
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
    
    // File drag and drop
    if (fileDropArea && handlers.handleFiles) {
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
            handlers.handleFiles(files);
        });
    }
    
    // File selection
    if (selectFileBtn && fileInput && handlers.handleFileSelect) {
        selectFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', handlers.handleFileSelect);
    }
}

/**
 * Check FreeBox status
 */
export function checkStatus() {
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

/**
 * Show error message
 * @param {string} message - Error message
 */
export function showErrorMessage(message) {
    alert(message);
} 