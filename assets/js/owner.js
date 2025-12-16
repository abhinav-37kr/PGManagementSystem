// Owner Dashboard functionality

import { supabaseClient } from './supabaseClient.js';
import { showMessage, formatCurrency, formatDate } from './utils.js';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Verify owner session
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session || error) {
        window.location.href = 'index.html';
        return;
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }
    
    // Load initial data
    await loadUsers();
    await loadRents();
    await loadMaintenance();
    await populateRoomDropdown(); // Populate room dropdown with available rooms
    
    // Setup form handlers
    setupAddUserForm();
    setupRentGeneration();
});

/**
 * Setup add user form handler
 */
function setupAddUserForm() {
    const addUserForm = document.getElementById('addUserForm');
    const addUserMessage = document.getElementById('addUserMessage');
    
    if (!addUserForm) return;
    
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('userName').value.trim(),
            room: document.getElementById('userRoom').value.trim(),
            contact_no: document.getElementById('userContact').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            password: document.getElementById('userPassword').value,
            deposit: parseFloat(document.getElementById('userDeposit').value)
        };
        
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .insert([formData])
                .select()
                .single();
            
            if (error) {
                showMessage(addUserMessage, 'error', error.message || 'Failed to add user');
                return;
            }
            
            showMessage(addUserMessage, 'success', 'User added successfully!');
            addUserForm.reset();
            await loadUsers(); // Refresh users list
            await populateRoomDropdown(); // Refresh room dropdown to exclude newly assigned room
        } catch (err) {
            console.error('Add user error:', err);
            showMessage(addUserMessage, 'error', 'An error occurred while adding user');
        }
    });
}

/**
 * Setup rent generation handler
 */
function setupRentGeneration() {
    const generateRentBtn = document.getElementById('generateRentBtn');
    const rentMessage = document.getElementById('rentMessage');
    
    if (!generateRentBtn) return;
    
    generateRentBtn.addEventListener('click', async () => {
        const month = document.getElementById('rentMonth').value.trim();
        const amount = parseFloat(document.getElementById('rentAmount').value);
        
        if (!month || !amount || amount <= 0) {
            showMessage(rentMessage, 'error', 'Please enter valid month and amount');
            return;
        }
        
        await generateRentForAllUsers(month, amount);
    });
}

/**
 * Populate room dropdown with available rooms (1-15, excluding occupied ones)
 */
export async function populateRoomDropdown() {
    const roomSelect = document.getElementById('userRoom');
    if (!roomSelect) return;
    
    try {
        // Fetch all occupied rooms
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('room');
        
        if (error) {
            console.error('Error fetching rooms:', error);
            return;
        }
        
        // Get list of occupied rooms
        const occupiedRooms = new Set();
        if (users) {
            users.forEach(user => {
                if (user.room) {
                    occupiedRooms.add(user.room.toString().trim());
                }
            });
        }
        
        // Clear existing options (except the first "Select a room" option)
        const firstOption = roomSelect.querySelector('option[value=""]');
        roomSelect.innerHTML = '';
        if (firstOption) {
            roomSelect.appendChild(firstOption);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a room';
            roomSelect.appendChild(defaultOption);
        }
        
        // Add available rooms (1-15)
        for (let i = 1; i <= 15; i++) {
            const roomNumber = i.toString();
            if (!occupiedRooms.has(roomNumber)) {
                const option = document.createElement('option');
                option.value = roomNumber;
                option.textContent = `Room ${roomNumber}`;
                roomSelect.appendChild(option);
            }
        }
        
        // Show message if all rooms are occupied
        if (occupiedRooms.size === 15) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No rooms available';
            option.disabled = true;
            roomSelect.appendChild(option);
        }
    } catch (err) {
        console.error('Populate room dropdown error:', err);
    }
}

/**
 * Load all users from database
 */
export async function loadUsers() {
    const usersTableBody = document.getElementById('usersTableBody');
    if (!usersTableBody) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            usersTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error loading users</td></tr>';
            return;
        }
        
        if (!data || data.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No users found</td></tr>';
            return;
        }
        
        usersTableBody.innerHTML = data.map(user => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.room || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.contact_no || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(user.deposit)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Load users error:', err);
        usersTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error loading users</td></tr>';
    }
}

/**
 * Generate rent for all current users (excluding those who already have rent for the month)
 */
export async function generateRentForAllUsers(month, amount) {
    const rentMessage = document.getElementById('rentMessage');
    
    try {
        // Fetch all users
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('name, email');
        
        if (usersError || !users || users.length === 0) {
            showMessage(rentMessage, 'error', 'No users found to generate rent for');
            return;
        }
        
        // Fetch existing rents for the given month
        const { data: existingRents, error: rentsError } = await supabaseClient
            .from('rents')
            .select('email')
            .eq('month', month);
        
        if (rentsError) {
            showMessage(rentMessage, 'error', 'Error checking existing rents: ' + rentsError.message);
            return;
        }
        
        // Create a set of emails that already have rent for this month
        const existingEmails = new Set();
        if (existingRents) {
            existingRents.forEach(rent => {
                if (rent.email) {
                    existingEmails.add(rent.email.toLowerCase());
                }
            });
        }
        
        // Filter users to only include those who don't have rent for this month
        const usersWithoutRent = users.filter(user => {
            if (!user.email) return false;
            return !existingEmails.has(user.email.toLowerCase());
        });
        
        if (usersWithoutRent.length === 0) {
            showMessage(rentMessage, 'error', `All users already have rent generated for ${month}`);
            return;
        }
        
        // Create rent entries only for users without existing rent
        const rentEntries = usersWithoutRent.map(user => ({
            name: user.name,
            email: user.email,
            month: month,
            amount: amount,
            status: 'pending'
        }));
        
        const { data, error } = await supabaseClient
            .from('rents')
            .insert(rentEntries)
            .select();
        
        if (error) {
            showMessage(rentMessage, 'error', error.message || 'Failed to generate rents');
            return;
        }
        
        // Show success message with details
        const skippedCount = users.length - usersWithoutRent.length;
        let message = `Rent generated successfully for ${data.length} user(s)!`;
        if (skippedCount > 0) {
            message += ` (${skippedCount} user(s) already have rent for ${month})`;
        }
        
        showMessage(rentMessage, 'success', message);
        document.getElementById('rentMonth').value = '';
        document.getElementById('rentAmount').value = '';
        await loadRents(); // Refresh rents list
    } catch (err) {
        console.error('Generate rent error:', err);
        showMessage(rentMessage, 'error', 'An error occurred while generating rents');
    }
}

/**
 * Load all rents from database
 */
export async function loadRents() {
    const rentsTableBody = document.getElementById('rentsTableBody');
    if (!rentsTableBody) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('rents')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            rentsTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Error loading rents</td></tr>';
            return;
        }
        
        if (!data || data.length === 0) {
            rentsTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No rent records found</td></tr>';
            return;
        }
        
        rentsTableBody.innerHTML = data.map(rent => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rent.name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rent.email || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rent.month || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(rent.amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        rent.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                    }">
                        ${rent.status || 'pending'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    ${rent.status === 'pending' ? `
                        <button 
                            onclick="markRentAsPaid('${rent.id}')"
                            class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition duration-200 text-xs"
                        >
                            Mark as Paid
                        </button>
                    ` : '<span class="text-gray-400 text-xs">Paid</span>'}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Load rents error:', err);
        rentsTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Error loading rents</td></tr>';
    }
}

/**
 * Mark rent as paid (called from inline onclick)
 */
window.markRentAsPaid = async function(rentId) {
    try {
        const { error } = await supabaseClient
            .from('rents')
            .update({ status: 'paid' })
            .eq('id', rentId);
        
        if (error) {
            alert('Failed to update rent status: ' + error.message);
            return;
        }
        
        await loadRents(); // Refresh rents list
    } catch (err) {
        console.error('Mark rent as paid error:', err);
        alert('An error occurred while updating rent status');
    }
};

/**
 * Load all maintenance requests from database
 */
export async function loadMaintenance() {
    const maintenanceTableBody = document.getElementById('maintenanceTableBody');
    if (!maintenanceTableBody) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('maintenance')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            maintenanceTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error loading maintenance requests</td></tr>';
            return;
        }
        
        if (!data || data.length === 0) {
            maintenanceTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No maintenance requests found</td></tr>';
            return;
        }
        
        maintenanceTableBody.innerHTML = data.map(maintenance => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${maintenance.name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${maintenance.email || 'N/A'}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${maintenance.request || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        maintenance.status === 'closed' 
                            ? 'bg-gray-100 text-gray-800' 
                            : maintenance.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }">
                        ${maintenance.status || 'open'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <select 
                        onchange="updateMaintenanceStatus('${maintenance.id}', this.value)"
                        class="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                        <option value="open" ${maintenance.status === 'open' ? 'selected' : ''}>Open</option>
                        <option value="in-progress" ${maintenance.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="closed" ${maintenance.status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Load maintenance error:', err);
        maintenanceTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error loading maintenance requests</td></tr>';
    }
}

/**
 * Update maintenance request status (called from inline onchange)
 */
window.updateMaintenanceStatus = async function(maintenanceId, newStatus) {
    try {
        const { error } = await supabaseClient
            .from('maintenance')
            .update({ status: newStatus })
            .eq('id', maintenanceId);
        
        if (error) {
            alert('Failed to update maintenance status: ' + error.message);
            return;
        }
        
        await loadMaintenance(); // Refresh maintenance list
    } catch (err) {
        console.error('Update maintenance status error:', err);
        alert('An error occurred while updating maintenance status');
    }
};

