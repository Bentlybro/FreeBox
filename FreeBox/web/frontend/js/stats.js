/**
 * FreeBox Web Interface
 * Statistics manager
 */

import { formatUptime, formatFileSize } from './utils.js';
import * as socketManager from './socketManager.js';

// DOM elements
let uptimeValue;
let visitorsValue;
let filesValue;
let storageValue;
let messagesValue;
let popularFileValue;
let refreshStatsBtn;

/**
 * Initialize stats manager
 * @param {Object} elements - DOM elements for stats
 */
export function init(elements) {
    // Store DOM elements
    uptimeValue = elements.uptimeValue;
    visitorsValue = elements.visitorsValue;
    filesValue = elements.filesValue;
    storageValue = elements.storageValue;
    messagesValue = elements.messagesValue;
    popularFileValue = elements.popularFileValue;
    refreshStatsBtn = elements.refreshStatsBtn;
    
    // Setup socket event listeners
    setupSocketListeners();
    
    // Setup event listeners
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', refreshStats);
    }
}

/**
 * Set up socket event listeners
 */
function setupSocketListeners() {
    socketManager.on('stats_updated', (stats) => {
        updateStatsDisplay(stats);
    });
}

/**
 * Load and display stats from server
 */
export function loadStats() {
    // Add the refreshing class to the refresh button
    if (refreshStatsBtn) {
        refreshStatsBtn.classList.add('refreshing');
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
            if (refreshStatsBtn) {
                refreshStatsBtn.classList.remove('refreshing');
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
            if (refreshStatsBtn) {
                refreshStatsBtn.classList.remove('refreshing');
            }
        });
}

/**
 * Refresh stats
 */
export function refreshStats() {
    if (refreshStatsBtn) {
        refreshStatsBtn.classList.add('refreshing');
    }
    
    // If connected via WebSocket, request updated stats
    if (socketManager.requestStatsUpdate()) {
        // Remove the refreshing class after a short delay
        setTimeout(() => {
            if (refreshStatsBtn) {
                refreshStatsBtn.classList.remove('refreshing');
            }
        }, 500);
    } else {
        // Fallback to HTTP if not connected
        loadStats();
    }
}

/**
 * Update the stats display with the provided data
 * @param {Object} stats - Stats data object
 */
export function updateStatsDisplay(stats) {
    // Update uptime
    if (uptimeValue) {
        uptimeValue.textContent = formatUptime(stats.uptime_seconds);
    }
    
    // Update visitors
    if (visitorsValue) {
        visitorsValue.textContent = `${stats.total_visits} (${stats.visitors_count} unique)`;
    }
    
    // Update files
    if (filesValue) {
        filesValue.textContent = `${stats.files_count} (${stats.total_downloads} downloads)`;
    }
    
    // Update storage
    if (storageValue) {
        const storageSize = formatFileSize(stats.total_storage || 0);
        storageValue.textContent = storageSize;
    }
    
    // Update messages
    if (messagesValue) {
        messagesValue.textContent = `${stats.messages_count}`;
    }
    
    // Update most downloaded file
    if (popularFileValue) {
        if (stats.most_downloaded) {
            popularFileValue.textContent = `${stats.most_downloaded.filename} (${stats.most_downloaded.download_count} downloads)`;
        } else {
            popularFileValue.textContent = 'No downloads yet';
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