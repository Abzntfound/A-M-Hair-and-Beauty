// A&M Hair and Beauty - Main Website User Authentication (DEBUG VERSION)
// home-auth.js

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx527wq0vGwyr2mQ7mGy7LGGny7IamcZB6EOzA2aLeXG_3LW2vBoBXIF3fWX6x-z0QOTA/exec';

let currentUser = null;

// ========================================
// INITIALIZATION
// ========================================

console.log('🔵 home-auth.js: Script loading...');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUserAuth);
} else {
    initializeUserAuth();
}

async function initializeUserAuth() {
    console.log('🔵 home-auth.js: DOM loaded, initializing...');
    
    try {
        const storedUserData = localStorage.getItem('amUserData');
        console.log('🔵 localStorage check:', storedUserData ? 'Found user data' : 'No user data');
        
        if (storedUserData) {
            const userData = JSON.parse(storedUserData);
            console.log('🔵 Parsed user data:', {
                email: userData.email,
                name: userData.name,
                darkMode: userData.darkMode
            });
            
            // IMMEDIATE: Apply cached theme while we verify
            if (userData.darkMode !== undefined) {
                const cachedTheme = userData.darkMode ? 'dark' : 'light';
                console.log('🔵 Applying CACHED theme immediately:', cachedTheme);
                applyTheme(cachedTheme);
            }
            
            // IMMEDIATE: Show user name from cache
            showLoggedInState(userData);
            
            // THEN: Verify and update from database
            console.log('🔵 Now verifying with database...');
            await verifyUserSession(userData.email);
        } else {
            console.log('🔵 No stored user data - showing logged out state');
            showLoggedOutState();
            loadDefaultTheme();
        }
        
        setTimeout(() => {
            checkAndShowImportantMessage();
        }, 800);
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showLoggedOutState();
        loadDefaultTheme();
    }
}

// ========================================
// GOOGLE SHEETS INTEGRATION
// ========================================

async function verifyUserSession(email) {
    console.log('🔵 Verifying user session for:', email);
    
    try {
        const result = await makeGoogleSheetsRequest('GET_USER', { email: email });
        
        console.log('🔵 Database response:', result);
        
        if (result.success && result.user) {
            console.log('✅ User verified from DB:', {
                name: result.user.name,
                email: result.user.email,
                darkMode: result.user.darkMode
            });
            
            currentUser = result.user;
            
            // Update localStorage with fresh data
            localStorage.setItem('amUserData', JSON.stringify(result.user));
            console.log('✅ localStorage updated with fresh data');
            
            // Apply theme from database
            if (result.user.darkMode !== undefined) {
                const dbTheme = result.user.darkMode ? 'dark' : 'light';
                console.log('🎨 Applying theme from DB:', dbTheme);
                applyTheme(dbTheme);
            }
            
            // Update UI with verified data
            showLoggedInState(result.user);
            
        } else {
            console.warn('⚠️ User verification failed:', result.message);
            // Keep cached data if verification fails
            console.log('📱 Keeping cached data since DB verification failed');
        }
    } catch (error) {
        console.error('❌ Error verifying user:', error);
        console.log('📱 Network error - using cached data');
    }
}

async function makeGoogleSheetsRequest(action, data) {
    console.log('📤 API Request:', action, data);
    
    try {
        const params = new URLSearchParams({
            action: action,
            data: JSON.stringify(data)
        });
        
        const url = `${GOOGLE_SHEETS_URL}?${params.toString()}`;
        console.log('🔵 Request URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });
        
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('📄 Raw response:', text.substring(0, 200));
        
        const result = JSON.parse(text);
        console.log('✅ Parsed result:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ API Request failed:', error);
        throw error;
    }
}

// ========================================
// UI UPDATE FUNCTIONS
// ========================================

function showLoggedInState(user) {
    console.log('🔵 Updating UI with user:', user.name);
    
    const userDisplayName = document.getElementById('user-display-name');
    console.log('🔵 user-display-name element:', userDisplayName);
    
    if (userDisplayName) {
        const firstName = user.name.split(' ')[0];
        userDisplayName.innerHTML = `<span class="user-name">${firstName}</span>`;
        console.log('✅ Header updated to show:', firstName);
    } else {
        console.error('❌ Could not find #user-display-name element!');
    }
    
    const nameInput = document.getElementById('name');
    if (nameInput && user.name) {
        nameInput.value = user.name;
        console.log('✅ Review form pre-filled');
    }
    
    currentUser = user;
    console.log('✅ UI update complete');
}

function showLoggedOutState() {
    console.log('🔵 Showing logged-out state');
    
    const userDisplayName = document.getElementById('user-display-name');
    if (userDisplayName) {
        userDisplayName.textContent = 'Log In';
        console.log('✅ Header set to "Log In"');
    }
    
    currentUser = null;
}

function handleUserHeaderClick() {
    console.log('🔵 User header clicked');
    window.location.href = 'https://auth.amhairandbeauty.com';
}

// ========================================
// IMPORTANT MESSAGE FUNCTIONS
// ========================================

function checkAndShowImportantMessage() {
    const userData = localStorage.getItem('amUserData');
    
    if (!userData) {
        console.log('🔵 No user - message hidden');
        return;
    }
    
    try {
        const user = JSON.parse(userData);
        const messageKey = `amImportantMessageSeen_${user.email}`;
        const hasSeenMessage = localStorage.getItem(messageKey);
        
        if (!hasSeenMessage) {
            const messageEl = document.getElementById('important-message');
            if (messageEl) {
                messageEl.classList.add('show');
                console.log('✅ Important message shown');
            }
        } else {
            console.log('🔵 User has seen message before');
        }
    } catch (e) {
        console.error('❌ Error with message:', e);
    }
}

function dismissImportantMessage() {
    const userData = localStorage.getItem('amUserData');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const messageKey = `amImportantMessageSeen_${user.email}`;
            localStorage.setItem(messageKey, 'true');
            console.log('✅ Message dismissed');
        } catch (e) {
            console.error('❌ Error dismissing:', e);
        }
    }
    
    const messageEl = document.getElementById('important-message');
    if (messageEl) {
        messageEl.classList.remove('show');
        messageEl.classList.add('hidden');
        setTimeout(() => messageEl.style.display = 'none', 300);
    }
}

// ========================================
// THEME FUNCTIONS
// ========================================

function applyTheme(theme) {
    const html = document.documentElement;
    
    console.log('🎨 Applying theme:', theme);
    console.log('🎨 Current data-theme:', html.getAttribute('data-theme'));
    
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('amTheme', 'dark');
        console.log('✅ Dark theme applied');
    } else {
        html.removeAttribute('data-theme');
        localStorage.setItem('amTheme', 'light');
        console.log('✅ Light theme applied');
    }
    
    console.log('🎨 New data-theme:', html.getAttribute('data-theme') || 'none (light)');
}

function loadDefaultTheme() {
    const savedTheme = localStorage.getItem('amTheme') || 'light';
    console.log('🎨 Loading default theme:', savedTheme);
    applyTheme(savedTheme);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('🔵 Logging out...');
        localStorage.removeItem('amUserData');
        currentUser = null;
        showLoggedOutState();
        loadDefaultTheme();
        alert('✅ Logged out successfully');
        window.location.reload();
    }
}

function getCurrentUser() {
    return currentUser;
}

function isUserLoggedIn() {
    return currentUser !== null;
}

async function refreshUserData() {
    if (currentUser && currentUser.email) {
        console.log('🔄 Refreshing user data...');
        await verifyUserSession(currentUser.email);
    }
}

function debugAuthState() {
    console.log('=== 🔍 AUTH DEBUG INFO ===');
    console.log('Current User Object:', currentUser);
    console.log('LocalStorage amUserData:', localStorage.getItem('amUserData'));
    console.log('LocalStorage amTheme:', localStorage.getItem('amTheme'));
    console.log('Is Logged In:', isUserLoggedIn());
    console.log('HTML data-theme:', document.documentElement.getAttribute('data-theme') || 'none');
    
    const userData = localStorage.getItem('amUserData');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log('Parsed User Data:');
            console.log('  - Email:', user.email);
            console.log('  - Name:', user.name);
            console.log('  - darkMode:', user.darkMode);
            console.log('  - createdAt:', user.createdAt);
            console.log('  - lastLogin:', user.lastLogin);
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    const userDisplayName = document.getElementById('user-display-name');
    console.log('user-display-name element:', userDisplayName);
    console.log('user-display-name content:', userDisplayName ? userDisplayName.innerHTML : 'NOT FOUND');
    
    console.log('========================');
}

// Make functions globally available
window.handleUserHeaderClick = handleUserHeaderClick;
window.dismissImportantMessage = dismissImportantMessage;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.isUserLoggedIn = isUserLoggedIn;
window.refreshUserData = refreshUserData;
window.debugAuthState = debugAuthState;

console.log('✅ home-auth.js loaded successfully!');
