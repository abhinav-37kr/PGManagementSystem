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
        
        // Clear previous error messages
        if (errorMessage) {
            errorMessage.classList.add('hidden');
            errorMessage.textContent = '';
        }
        
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
                // First, try with case-insensitive email matching
                let data = null;
                let error = null;
                
                // Try .ilike() first
                let result = await supabaseClient
                    .from('users')
                    .select('*')
                    .ilike('email', email.trim())
                    .single();
                
                data = result.data;
                error = result.error;
                
                // If .ilike() fails with RLS error, try .eq() as fallback
                if (error && (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('row-level security'))) {
                    console.warn('ilike() failed, trying eq() as fallback');
                    result = await supabaseClient
                        .from('users')
                        .select('*')
                        .eq('email', email.trim())
                        .single();
                    
                    data = result.data;
                    error = result.error;
                }
                
                // Log error for debugging
                if (error) {
                    console.error('User login error:', error);
                    console.error('Error details:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint
                    });
                    
                    // Check if it's an RLS policy issue
                    if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('row-level security') || error.message?.includes('new row violates row-level security')) {
                        showMessage(errorMessage, 'error', `RLS Policy Error: ${error.message || 'Access denied'}. Please run fix_rls_policies.sql in Supabase SQL Editor.`);
                    } else if (error.code === 'PGRST301' || error.message?.includes('No rows')) {
                        // No rows returned
                        showMessage(errorMessage, 'error', 'Invalid email or password');
                    } else {
                        showMessage(errorMessage, 'error', `Login error: ${error.message || 'Invalid email or password'}`);
                    }
                    return;
                }
                
                if (!data) {
                    console.error('No user data returned');
                    showMessage(errorMessage, 'error', 'Invalid email or password');
                    return;
                }
                
                console.log('User found:', { email: data.email, name: data.name });
                
                // Compare password (plain text comparison for demo)
                // Trim both passwords to handle whitespace issues
                const storedPassword = (data.password || '').toString().trim();
                const enteredPassword = password.trim();
                
                console.log('Password check:', {
                    storedLength: storedPassword.length,
                    enteredLength: enteredPassword.length,
                    match: storedPassword === enteredPassword
                });
                
                if (storedPassword !== enteredPassword) {
                    showMessage(errorMessage, 'error', 'Invalid email or password');
                    return;
                }
                
                // Store user data in localStorage
                localStorage.setItem('user_email', data.email);
                localStorage.setItem('user_name', data.name);
                localStorage.setItem('user_id', data.id);
                localStorage.setItem('user_room', data.room || '');
                
                console.log('Login successful, redirecting...');
                
                // Redirect to user dashboard
                window.location.href = 'user.html';
            }
        } catch (err) {
            console.error('Login error:', err);
            showMessage(errorMessage, 'error', 'An error occurred during login. Please try again.');
        }
    });
});

