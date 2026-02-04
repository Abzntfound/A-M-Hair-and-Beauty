// A&M Hair and Beauty - Main Website User Authentication
// home-auth.js - Place this in the same directory as index.html

// YOUR GOOGLE SHEETS WEB APP URL (Same as auth.js)
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbz-CIirIsDp6uvL3Z2FTzsVYc3pHDyJW5-Ln2XSOKA8eEkiwCzM60uc20R53rJN41tO/exec';

// Global user data
let currentUser = null;

// ========================================
// INITIALIZATION
// ========================================

// Initialize when DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUserAuth);
} else {
    initializeUserAuth();
}

// Main initialization function
async function initializeUserAuth() {
    try {
        console.log('🚀 A&M Home - Auth system loading...');
        
        // First, check localStorage
        const storedUserData = localStorage.getItem('amUserData');
        
        if (storedUserData) {
            try {
                const userData = JSON.parse(storedUserData);
                console.log('📦 Found stored user data:', userData.email);
                
                // Verify with database
                await verifyUserSession(userData.email);
            } catch (e) {
                console.error('❌ Error parsing stored user data:', e);
                localStorage.removeItem('amUserData');
                showLoggedOutState();
            }
        } else {
            console.log('ℹ️ No stored user data found');
            showLoggedOutState();
        }
        
        // Load theme
        loadUserTheme();
        
        // Check and show important message after a delay
        setTimeout(() => {
            checkAndShowImportantMessage();
        }, 800);
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showLoggedOutState();
    }
}

// ========================================
// GOOGLE SHEETS INTEGRATION
// ========================================

// Verify user session with database
async function verifyUserSession(email) {
    console.log('🔍 Verifying user session for:', email);
    
    try {
        const result = await makeGoogleSheetsRequest('GET_USER', { email: email });
        
        if (result.success && result.user) {
            console.log('✅ User verified:', result.user.name);
            currentUser = result.user;
            
            // Update localStorage with fresh data
            localStorage.setItem('amUserData', JSON.stringify(result.user));
            
            // Update UI
            showLoggedInState(result.user);
        } else {
            console.log('⚠️ User verification failed');
            localStorage.removeItem('amUserData');
            showLoggedOutState();
        }
    } catch (error) {
        console.error('❌ Error verifying user:', error);
        
        // Fall back to stored data if verification fails (network issue)
        const storedData = localStorage.getItem('amUserData');
        if (storedData) {
            const user = JSON.parse(storedData);
            console.log('📱 Using cached user data (offline mode)');
            currentUser = user;
            showLoggedInState(user);
        } else {
            showLoggedOutState();
        }
    }
}

// Make API call to Google Sheets
async function makeGoogleSheetsRequest(action, data) {
    console.log('📤 Making request:', action, data);
    
    try {
        const params = new URLSearchParams({
            action: action,
            data: JSON.stringify(data)
        });
        
        const url = `${GOOGLE_SHEETS_URL}?${params.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        const result = JSON.parse(text);
        
        console.log('✅ Response received:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Request failed:', error);
        throw error;
    }
}

// ========================================
// UI UPDATE FUNCTIONS
// ========================================

// Show logged-in state
function showLoggedInState(user) {
    console.log('👤 Showing logged-in state for:', user.name);
    
    // Update header
    const userDisplayName = document.getElementById('user-display-name');
    if (userDisplayName) {
        const firstName = user.name.split(' ')[0];
        userDisplayName.innerHTML = `<span class="user-name">${firstName}</span>`;
        console.log('✅ Header updated with name:', firstName);
    }
    
    // Pre-fill review form
    const nameInput = document.getElementById('name');
    if (nameInput && user.name) {
        nameInput.value = user.name;
        console.log('✅ Review form pre-filled');
    }
    
    // Store current user globally
    currentUser = user;
}

// Show logged-out state
function showLoggedOutState() {
    console.log('👋 Showing logged-out state');
    
    const userDisplayName = document.getElementById('user-display-name');
    if (userDisplayName) {
        userDisplayName.textContent = 'Log In';
    }
    
    currentUser = null;
}

// Handle user header click - FIXED VERSION
function handleUserHeaderClick() {
    console.log('🖱️ User header clicked');
    console.log('Current user state:', currentUser ? 'logged in' : 'logged out');
    
    // Always redirect to auth page
    window.location.href = 'https://auth.amhairandbeauty.com';
}

// ========================================
// IMPORTANT MESSAGE FUNCTIONS
// ========================================

// Check and show important message once for logged-in users
function checkAndShowImportantMessage() {
    const userData = localStorage.getItem('amUserData');
    
    if (!userData) {
        console.log('ℹ️ No user logged in - message hidden');
        return;
    }
    
    try {
        const user = JSON.parse(userData);
        const messageKey = `amImportantMessageSeen_${user.email}`;
        const hasSeenMessage = localStorage.getItem(messageKey);
        
        if (!hasSeenMessage) {
            // Show the message
            const messageEl = document.getElementById('important-message');
            if (messageEl) {
                messageEl.classList.add('show');
                console.log('📢 Showing important message for:', user.email);
            } else {
                console.warn('⚠️ Important message element not found');
            }
        } else {
            console.log('ℹ️ User has already seen the important message');
        }
    } catch (e) {
        console.error('❌ Error checking message status:', e);
    }
}

// Dismiss important message and remember it
function dismissImportantMessage() {
    const userData = localStorage.getItem('amUserData');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const messageKey = `amImportantMessageSeen_${user.email}`;
            
            // Mark as seen for this user
            localStorage.setItem(messageKey, 'true');
            console.log('✅ Important message dismissed for:', user.email);
        } catch (e) {
            console.error('❌ Error saving message status:', e);
        }
    }
    
    // Hide the message with animation
    const messageEl = document.getElementById('important-message');
    if (messageEl) {
        messageEl.classList.remove('show');
        messageEl.classList.add('hidden');
        
        // Remove from DOM after animation
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 300);
    }
}

// ========================================
// THEME FUNCTIONS
// ========================================

// Load user's theme preference
function loadUserTheme() {
    const userData = localStorage.getItem('amUserData');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            if (user.darkMode !== undefined) {
                applyTheme(user.darkMode ? 'dark' : 'light');
                console.log('🎨 Applied user theme:', user.darkMode ? 'dark' : 'light');
            }
        } catch (e) {
            console.error('❌ Error loading user theme:', e);
            // Fallback to stored theme
            const savedTheme = localStorage.getItem('amTheme') || 'light';
            applyTheme(savedTheme);
        }
    } else {
        // Load from localStorage if not logged in
        const savedTheme = localStorage.getItem('amTheme') || 'light';
        applyTheme(savedTheme);
        console.log('🎨 Applied saved theme:', savedTheme);
    }
}

// Apply theme to the page
function applyTheme(theme) {
    const html = document.documentElement;
    
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
    } else {
        html.removeAttribute('data-theme');
    }
}

// ========================================
// LOGOUT FUNCTION
// ========================================

// Logout user
function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('🚪 Logging out user...');
        
        // Clear user data
        localStorage.removeItem('amUserData');
        currentUser = null;
        
        // Update UI
        showLoggedOutState();
        
        // Optionally redirect to home or auth
        alert('✅ You have been logged out successfully.');
        
        // Reload page to reset state
        window.location.reload();
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is logged in
function isUserLoggedIn() {
    return currentUser !== null;
}

// Force refresh user data from database
async function refreshUserData() {
    if (currentUser && currentUser.email) {
        console.log('🔄 Refreshing user data...');
        await verifyUserSession(currentUser.email);
    }
}

// Debug function - print current state
function debugAuthState() {
    console.log('=== AUTH DEBUG INFO ===');
    console.log('Current User:', currentUser);
    console.log('LocalStorage amUserData:', localStorage.getItem('amUserData'));
    console.log('LocalStorage amTheme:', localStorage.getItem('amTheme'));
    console.log('Is Logged In:', isUserLoggedIn());
    console.log('======================');
}

// Make functions available globally
window.handleUserHeaderClick = handleUserHeaderClick;
window.dismissImportantMessage = dismissImportantMessage;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.isUserLoggedIn = isUserLoggedIn;
window.refreshUserData = refreshUserData;
window.debugAuthState = debugAuthState;

console.log('✅ home-auth.js loaded successfully!');
