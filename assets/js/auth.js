// Authentication logic for login page

import { supabaseClient } from './supabaseClient.js';
import { showMessage } from './utils.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        
        // Validate inputs
        if (!email || !password || !role) {
            showMessage(errorMessage, 'error', 'Please fill in all fields');
            return;
        }
        
        try {
            if (role === 'owner') {
                // Owner login using Supabase Auth
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) {
                    showMessage(errorMessage, 'error', error.message || 'Invalid owner credentials');
                    return;
                }
                
                if (data.user) {
                    // Successfully logged in as owner
                    window.location.href = 'owner.html';
                }
            } else if (role === 'user') {
                // User login - check against users table
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .single();
                
                if (error || !data) {
                    showMessage(errorMessage, 'error', 'Invalid email or password');
                    return;
                }
                
                // Compare password (plain text comparison for demo)
                if (data.password !== password) {
                    showMessage(errorMessage, 'error', 'Invalid email or password');
                    return;
                }
                
                // Store user data in localStorage
                localStorage.setItem('user_email', data.email);
                localStorage.setItem('user_name', data.name);
                localStorage.setItem('user_id', data.id);
                localStorage.setItem('user_room', data.room);
                
                // Redirect to user dashboard
                window.location.href = 'user.html';
            }
        } catch (err) {
            console.error('Login error:', err);
            showMessage(errorMessage, 'error', 'An error occurred during login. Please try again.');
        }
    });
});

