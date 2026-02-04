// A&M Hair and Beauty - Authentication System
// auth.js

// YOUR GOOGLE SHEETS WEB APP URL (Replace this after deploying Google Apps Script)
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx43Uj7kYHmmQzNwj_j7tbMnrp9Gd9yDVXD91A3IdSp-3pHsTqhJBtW7PnIaEB616PKaw/exec';

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    loadTheme();
});

// Check login status from localStorage
function checkLoginStatus() {
    const userData = localStorage.getItem('amUserData');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            showUserProfile(user);
        } catch (e) {
            console.error('Error parsing user data:', e);
            localStorage.removeItem('amUserData');
        }
    }
}

// Switch to signup form
function switchToSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'flex';
    document.getElementById('auth-title').textContent = 'Create Account';
    document.getElementById('auth-subtitle').textContent = 'Join the A&M family today!';
    hideMessage();
}

// Switch to login form
function switchToLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('auth-title').textContent = 'Welcome Back!';
    document.getElementById('auth-subtitle').textContent = 'Sign in to continue shopping';
    hideMessage();
}

// Show message
function showMessage(text, type) {
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = text;
    messageEl.className = type;
    messageEl.style.display = 'block';
}

// Hide message
function hideMessage() {
    const messageEl = document.getElementById('auth-message');
    messageEl.style.display = 'none';
}

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Disable button and show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Signing in...';
    
    try {
        const response = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'LOGIN',
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Login successful! Redirecting...', 'success');
            
            // Save user data to localStorage
            localStorage.setItem('amUserData', JSON.stringify(data.user));
            
            // Wait a moment then show profile
            setTimeout(() => {
                showUserProfile(data.user);
            }, 1000);
        } else {
            showMessage(data.message || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Signup form handler
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    
    // Validate password match
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }
    
    // Validate password length
    if (password.length < 8) {
        showMessage('Password must be at least 8 characters long.', 'error');
        return;
    }
    
    // Disable button and show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Creating account...';
    
    try {
        const response = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'SIGNUP',
                name: name,
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Account created successfully! You can now sign in.', 'success');
            
            // Clear form
            e.target.reset();
            
            // Switch to login after 2 seconds
            setTimeout(() => {
                switchToLogin();
            }, 2000);
        } else {
            showMessage(data.message || 'Signup failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Show user profile
function showUserProfile(user) {
    // Hide auth container
    document.getElementById('auth-container').style.display = 'none';
    
    // Show profile
    document.getElementById('user-profile').style.display = 'block';
    
    // Populate user data
    document.getElementById('user-name-display').textContent = user.name;
    document.getElementById('user-email-display').textContent = user.email;
    
    // Format dates
    const createdDate = new Date(user.createdAt);
    const lastLoginDate = new Date(user.lastLogin);
    
    document.getElementById('user-created-display').textContent = createdDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    document.getElementById('user-login-display').textContent = lastLoginDate.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Load user theme preference
    if (user.darkMode !== undefined) {
        setTheme(user.darkMode ? 'dark' : 'light');
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('amUserData');
        
        // Hide profile
        document.getElementById('user-profile').style.display = 'none';
        document.getElementById('settings-panel').style.display = 'none';
        
        // Show auth container
        document.getElementById('auth-container').style.display = 'flex';
        
        // Reset forms
        document.getElementById('login-form').reset();
        document.getElementById('signup-form').reset();
        switchToLogin();
        
        showMessage('You have been logged out successfully.', 'info');
    }
}

// Toggle settings panel
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

// Set theme
function setTheme(theme) {
    const html = document.documentElement;
    
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('amTheme', 'dark');
    } else {
        html.removeAttribute('data-theme');
        localStorage.setItem('amTheme', 'light');
    }
    
    // Update active button
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Load theme from localStorage
function loadTheme() {
    const savedTheme = localStorage.getItem('amTheme') || 'light';
    setTheme(savedTheme);
}

// Save settings
async function saveSettings() {
    const userData = localStorage.getItem('amUserData');
    
    if (!userData) {
        showMessage('You must be logged in to save settings.', 'error');
        return;
    }
    
    try {
        const user = JSON.parse(userData);
        const theme = localStorage.getItem('amTheme');
        const darkMode = theme === 'dark';
        
        const response = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'UPDATE_SETTINGS',
                email: user.email,
                darkMode: darkMode
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local storage
            user.darkMode = darkMode;
            localStorage.setItem('amUserData', JSON.stringify(user));
            
            alert('Settings saved successfully! ✅');
        } else {
            alert('Failed to save settings. Please try again.');
        }
    } catch (error) {
        console.error('Save settings error:', error);
        alert('Network error. Please check your connection.');
    }
}
