// User Dashboard functionality

import { supabaseClient } from './supabaseClient.js';
import { showMessage, formatCurrency, formatDate } from './utils.js';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in (stored in localStorage)
    const userEmail = localStorage.getItem('user_email');
    const userName = localStorage.getItem('user_name');
    
    if (!userEmail || !userName) {
        window.location.href = 'index.html';
        return;
    }
    
    // Display user name
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = userName;
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_room');
            window.location.href = 'index.html';
        });
    }
    
    // Load user data
    await loadPendingRents();
    await loadMyMaintenanceRequests();
    
    // Setup maintenance form
    setupMaintenanceForm();
});

/**
 * Setup maintenance request form handler
 */
function setupMaintenanceForm() {
    const maintenanceForm = document.getElementById('maintenanceForm');
    const maintenanceMessage = document.getElementById('maintenanceMessage');
    
    if (!maintenanceForm) return;
    
    maintenanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userEmail = localStorage.getItem('user_email');
        const userName = localStorage.getItem('user_name');
        const request = document.getElementById('maintenanceRequest').value.trim();
        
        if (!request) {
            showMessage(maintenanceMessage, 'error', 'Please enter a request description');
            return;
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('maintenance')
                .insert([{
                    name: userName,
                    email: userEmail,
                    request: request,
                    status: 'open'
                }])
                .select()
                .single();
            
            if (error) {
                showMessage(maintenanceMessage, 'error', error.message || 'Failed to submit request');
                return;
            }
            
            showMessage(maintenanceMessage, 'success', 'Maintenance request submitted successfully!');
            maintenanceForm.reset();
            await loadMyMaintenanceRequests(); // Refresh requests list
        } catch (err) {
            console.error('Submit maintenance error:', err);
            showMessage(maintenanceMessage, 'error', 'An error occurred while submitting request');
        }
    });
}

/**
 * Load pending rents for current user
 */
export async function loadPendingRents() {
    const pendingRentsTableBody = document.getElementById('pendingRentsTableBody');
    if (!pendingRentsTableBody) return;
    
    const userEmail = localStorage.getItem('user_email');
    if (!userEmail) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('rents')
            .select('*')
            .eq('email', userEmail)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) {
            pendingRentsTableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-red-500">Error loading pending rents</td></tr>';
            return;
        }
        
        if (!data || data.length === 0) {
            pendingRentsTableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No pending rents</td></tr>';
            return;
        }
        
        pendingRentsTableBody.innerHTML = data.map(rent => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rent.month || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(rent.amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ${rent.status || 'pending'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Load pending rents error:', err);
        pendingRentsTableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-red-500">Error loading pending rents</td></tr>';
    }
}

/**
 * Load maintenance requests for current user
 */
export async function loadMyMaintenanceRequests() {
    const myRequestsTableBody = document.getElementById('myRequestsTableBody');
    if (!myRequestsTableBody) return;
    
    const userEmail = localStorage.getItem('user_email');
    if (!userEmail) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('maintenance')
            .select('*')
            .eq('email', userEmail)
            .order('created_at', { ascending: false });
        
        if (error) {
            myRequestsTableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-red-500">Error loading requests</td></tr>';
            return;
        }
        
        if (!data || data.length === 0) {
            myRequestsTableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No maintenance requests submitted</td></tr>';
            return;
        }
        
        myRequestsTableBody.innerHTML = data.map(request => `
            <tr>
                <td class="px-6 py-4 text-sm text-gray-900">${request.request || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'closed' 
                            ? 'bg-gray-100 text-gray-800' 
                            : request.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }">
                        ${request.status || 'open'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(request.created_at)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Load maintenance requests error:', err);
        myRequestsTableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-red-500">Error loading requests</td></tr>';
    }
}

