/**
 * FreeBox Web Interface
 * Utility functions
 */

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date to human-readable format
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted date
 */
export function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
}

/**
 * Format chat timestamp
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted time
 */
export function formatChatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Generate a random username
 * @returns {string} - Random username
 */
export function generateRandomUsername() {
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

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time
 */
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Get file extension (including the dot)
 * @param {string} filename - Filename
 * @returns {string} - File extension
 */
export function getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filename.substring(lastDotIndex);
}

/**
 * Format uptime in a human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} - Formatted uptime
 */
export function formatUptime(seconds) {
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