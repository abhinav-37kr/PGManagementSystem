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
    
    // Setup payment modal
    setupPaymentModal();
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
            console.log('Submitting maintenance request:', { email: userEmail, name: userName, request: request });
            
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
                console.error('Maintenance insert error:', error);
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                
                // Check if it's an RLS policy issue
                if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('violates row-level security policy')) {
                    showMessage(maintenanceMessage, 'error', 'Access denied. Please run fix_maintenance_rls.sql in Supabase SQL Editor to fix RLS policies.');
                } else {
                    showMessage(maintenanceMessage, 'error', error.message || 'Failed to submit request');
                }
                return;
            }
            
            console.log('Maintenance request submitted successfully:', data);
            showMessage(maintenanceMessage, 'success', 'Maintenance request submitted successfully!');
            maintenanceForm.reset();
            await loadMyMaintenanceRequests(); // Refresh requests list
        } catch (err) {
            console.error('Submit maintenance exception:', err);
            showMessage(maintenanceMessage, 'error', 'An error occurred while submitting request');
        }
    });
}

/**
 * Load pending rents for current user (all pending months)
 */
export async function loadPendingRents() {
    const pendingRentsTableBody = document.getElementById('pendingRentsTableBody');
    if (!pendingRentsTableBody) return;
    
    const userEmail = localStorage.getItem('user_email');
    if (!userEmail) {
        pendingRentsTableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-red-500">User email not found. Please login again.</td></tr>';
        return;
    }
    
    console.log('Loading pending rents for email:', userEmail);
    
    try {
        // Try case-insensitive email matching first
        let { data, error } = await supabaseClient
            .from('rents')
            .select('*')
            .ilike('email', userEmail.trim())
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        // If ilike fails, try exact match
        if (error && (error.code === 'PGRST116' || error.message?.includes('permission'))) {
            console.warn('ilike() failed, trying exact match');
            const result = await supabaseClient
                .from('rents')
                .select('*')
                .eq('email', userEmail.trim())
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            
            data = result.data;
            error = result.error;
        }
        
        if (error) {
            console.error('Error loading pending rents:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error.details
            });
            
            if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
                pendingRentsTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Access denied. Please check RLS policies for rents table.</td></tr>';
            } else {
                pendingRentsTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Error loading pending rents: ${error.message || 'Unknown error'}</td></tr>`;
            }
            return;
        }
        
        console.log('Pending rents data:', data);
        console.log('Number of pending rents:', data?.length || 0);
        
        if (!data || data.length === 0) {
            pendingRentsTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No pending rents found</td></tr>';
            // Clear total amount display
            const totalAmountDiv = document.getElementById('totalPendingAmount');
            if (totalAmountDiv) {
                totalAmountDiv.textContent = '';
            }
            return;
        }
        
        // Calculate total pending amount
        const totalPending = data.reduce((sum, rent) => {
            return sum + (parseFloat(rent.amount) || 0);
        }, 0);
        
        // Display total pending amount
        const totalAmountDiv = document.getElementById('totalPendingAmount');
        if (totalAmountDiv) {
            totalAmountDiv.textContent = `Total Pending: ${formatCurrency(totalPending)}`;
        }
        
        // Display all pending rents (sorted by month for better readability)
        const sortedData = [...data].sort((a, b) => {
            // Sort by month (assuming format like "January 2025" or "2025-01")
            return (a.month || '').localeCompare(b.month || '');
        });
        
        pendingRentsTableBody.innerHTML = sortedData.map(rent => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${rent.month || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(rent.amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ${rent.status || 'pending'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                        onclick="openPaymentModal('${rent.id}', '${rent.month || 'N/A'}', ${rent.amount})"
                        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 text-sm font-medium"
                    >
                        Pay
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log('Successfully displayed', data.length, 'pending rent(s)');
        console.log('Total pending amount:', totalPending);
    } catch (err) {
        console.error('Load pending rents exception:', err);
        pendingRentsTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">An error occurred while loading pending rents</td></tr>';
    }
}

/**
 * Setup payment modal handlers
 */
function setupPaymentModal() {
    const paymentModal = document.getElementById('paymentModal');
    const closePaymentModal = document.getElementById('closePaymentModal');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    const paymentForm = document.getElementById('paymentForm');
    
    if (!paymentModal) return;
    
    // Close modal handlers
    const closeModal = () => {
        paymentModal.style.display = 'none';
        paymentForm.reset();
        const paymentMsg = document.getElementById('paymentMessage');
        if (paymentMsg) paymentMsg.textContent = '';
    };
    
    if (closePaymentModal) {
        closePaymentModal.addEventListener('click', closeModal);
    }
    
    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', closeModal);
    }
    
    // Close on outside click
    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            closeModal();
        }
    });
    
    // Handle form submission
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const upiId = document.getElementById('upiId').value.trim();
            const rentId = paymentForm.dataset.rentId;
            
            if (!upiId) {
                showMessage(document.getElementById('paymentMessage'), 'error', 'Please enter UPI ID');
                return;
            }
            
            // Validate UPI format (basic validation)
            const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
            if (!upiPattern.test(upiId)) {
                showMessage(document.getElementById('paymentMessage'), 'error', 'Please enter a valid UPI ID (e.g., yourname@paytm)');
                return;
            }
            
            await processPayment(rentId, upiId);
        });
    }
}

/**
 * Open payment modal
 */
window.openPaymentModal = function(rentId, month, amount) {
    const paymentModal = document.getElementById('paymentModal');
    const paymentMonth = document.getElementById('paymentMonth');
    const paymentAmount = document.getElementById('paymentAmount');
    const paymentForm = document.getElementById('paymentForm');
    const upiInput = document.getElementById('upiId');
    
    if (!paymentModal) return;
    
    // Set payment details
    if (paymentMonth) paymentMonth.textContent = month;
    if (paymentAmount) paymentAmount.textContent = formatCurrency(amount);
    if (paymentForm) paymentForm.dataset.rentId = rentId;
    
    // Show modal
    paymentModal.style.display = 'block';
    
    // Focus on UPI input
    if (upiInput) {
        setTimeout(() => upiInput.focus(), 100);
    }
};

/**
 * Process payment and update rent status
 */
async function processPayment(rentId, upiId) {
    const paymentMessage = document.getElementById('paymentMessage');
    
    try {
        console.log('Processing payment for rent ID:', rentId, 'UPI:', upiId);
        
        // Update rent status to paid
        const { data, error } = await supabaseClient
            .from('rents')
            .update({ 
                status: 'paid'
            })
            .eq('id', rentId)
            .select()
            .single();
        
        if (error) {
            console.error('Payment processing error:', error);
            showMessage(paymentMessage, 'error', error.message || 'Failed to process payment');
            return;
        }
        
        console.log('Payment processed successfully:', data);
        showMessage(paymentMessage, 'success', `Payment successful! Rent for ${data.month} marked as paid.`);
        
        // Close modal after 2 seconds
        setTimeout(async () => {
            const paymentModal = document.getElementById('paymentModal');
            if (paymentModal) {
                paymentModal.style.display = 'none';
            }
            
            // Refresh pending rents list
            await loadPendingRents();
        }, 2000);
        
    } catch (err) {
        console.error('Payment processing exception:', err);
        showMessage(paymentMessage, 'error', 'An error occurred while processing payment');
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

