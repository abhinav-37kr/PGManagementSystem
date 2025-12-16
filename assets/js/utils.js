// Utility functions for the PG Management System

/**
 * Display a message to the user
 * @param {HTMLElement} containerElement - The container element to show the message in
 * @param {string} type - Message type: "success" or "error"
 * @param {string} text - Message text to display
 */
export function showMessage(containerElement, type, text) {
    if (!containerElement) return;
    
    containerElement.className = `mt-4 p-4 rounded-lg ${
        type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
    }`;
    containerElement.textContent = text;
    containerElement.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        containerElement.classList.add('hidden');
        containerElement.textContent = '';
    }, 5000);
}

/**
 * Format date to readable string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${parseFloat(amount).toFixed(2)}`;
}

