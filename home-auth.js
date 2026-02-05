// A&M Hair and Beauty - Main Website User Authentication (WITH COOKIE SUPPORT)
// home-auth.js

const GOOGLE_SHEETS_URL = 'https://api.sheetbest.com/sheets/86c37e65-36d8-45a0-8c09-4d7d9ffa072e';

let currentUser = null;

// ========================================
// COOKIE HELPERS
// ========================================

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
    }
    return null;
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; domain=.amhairandbeauty.com; SameSite=Lax`;
}

// ========================================
// DATA ACCESS (Cookie + localStorage)
// ========================================

function getUserData() {
    // Try localStorage first
    let userData = localStorage.getItem('amUserData');
    
    // If not in localStorage, check cookie
    if (!userData) {
        userData = getCookie('amUserData');
        if (userData) {
            // Sync to localStorage
            localStorage.setItem('amUserData', userData);
            console.log('📱 User data loaded from cookie');
        }
    }
    
    return userData ? JSON.parse(userData) : null;
}

function saveUserData(user) {
    localStorage.setItem('amUserData', JSON.stringify(user));
    setCookie('amUserData', JSON.stringify(user), 30);
}

// ========================================
// INITIALIZATION
// ========================================

console.log('🚀 home-auth.js loading...');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUserAuth);
} else {
    initializeUserAuth();
}

async function initializeUserAuth() {
    console.log('🚀 Initializing auth system...');
    
    try {
        const userData = getUserData();
        
        if (userData) {
            console.log('✅ User data found:', {
                email: userData.email,
                name: userData.name,
                darkMode: userData.darkMode
            });
            
            // IMMEDIATE: Apply theme and show name from cache
            if (userData.darkMode !== undefined) {
                const theme = userData.darkMode ? 'dark' : 'light';
                console.log('🎨 Applying cached theme:', theme);
                applyTheme(theme);
            }
            
            showLoggedInState(userData);
            currentUser = userData;
            
            // THEN: Verify with database in background
            console.log('🔄 Verifying with database...');
            await verifyUserSession(userData.email);
            
        } else {
            console.log('ℹ️ No user data found');
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
// API COMMUNICATION
// ========================================

async function verifyUserSession(email) {
    console.log('🔍 Verifying user with database...');
    
    try {
        const result = await makeGoogleSheetsRequest('GET_USER', { email: email });
        
        if (result.success && result.user) {
            console.log('✅ User verified from database:', result.user);
            
            currentUser = result.user;
            saveUserData(result.user);
            
            // Update theme if changed
            if (result.user.darkMode !== undefined) {
                const dbTheme = result.user.darkMode ? 'dark' : 'light';
                console.log('🎨 Theme from DB:', dbTheme);
                applyTheme(dbTheme);
            }
            
            showLoggedInState(result.user);
        } else {
            console.warn('⚠️ Verification failed, using cached data');
        }
    } catch (error) {
        console.error('❌ Verification error:', error);
        console.log('📱 Using cached data (offline mode)');
    }
}

async function makeGoogleSheetsRequest(action, data) {
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
        return JSON.parse(text);
        
    } catch (error) {
        console.error('❌ API request failed:', error);
        throw error;
    }
}

// ========================================
// UI UPDATES
// ========================================

function showLoggedInState(user) {
    console.log('👤 Showing logged-in state for:', user.name);
    
    const userDisplayName = document.getElementById('user-display-name');
    if (userDisplayName) {
        const firstName = user.name.split(' ')[0];
        userDisplayName.innerHTML = `<span class="user-name">${firstName}</span>`;
        console.log('✅ Header updated:', firstName);
    } else {
        console.error('❌ #user-display-name element not found!');
    }
    
    const nameInput = document.getElementById('name');
    if (nameInput && user.name) {
        nameInput.value = user.name;
    }
    
    currentUser = user;
}

function showLoggedOutState() {
    console.log('👋 Showing logged-out state');
    
    const userDisplayName = document.getElementById('user-display-name');
    if (userDisplayName) {
        userDisplayName.textContent = 'Log In';
    }
    
    currentUser = null;
}

function handleUserHeaderClick() {
    window.location.href = 'https://auth.amhairandbeauty.com';
}

// ========================================
// THEME FUNCTIONS
// ========================================

function applyTheme(theme) {
    const html = document.documentElement;
    
    console.log('🎨 Applying theme:', theme);
    
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('amTheme', 'dark');
        setCookie('amTheme', 'dark', 365);
    } else {
        html.removeAttribute('data-theme');
        localStorage.setItem('amTheme', 'light');
        setCookie('amTheme', 'light', 365);
    }
}

function loadDefaultTheme() {
    let savedTheme = localStorage.getItem('amTheme');
    
    if (!savedTheme) {
        savedTheme = getCookie('amTheme') || 'light';
    }
    
    console.log('🎨 Loading default theme:', savedTheme);
    applyTheme(savedTheme);
}

// ========================================
// IMPORTANT MESSAGE
// ========================================

function checkAndShowImportantMessage() {
    const user = getUserData();
    
    if (!user) return;
    
    try {
        const messageKey = `amImportantMessageSeen_${user.email}`;
        const hasSeenMessage = localStorage.getItem(messageKey);
        
        if (!hasSeenMessage) {
            const messageEl = document.getElementById('important-message');
            if (messageEl) {
                messageEl.classList.add('show');
            }
        }
    } catch (e) {
        console.error('❌ Error with message:', e);
    }
}

function dismissImportantMessage() {
    const user = getUserData();
    
    if (user) {
        const messageKey = `amImportantMessageSeen_${user.email}`;
        localStorage.setItem(messageKey, 'true');
    }
    
    const messageEl = document.getElementById('important-message');
    if (messageEl) {
        messageEl.classList.remove('show');
        messageEl.classList.add('hidden');
        setTimeout(() => messageEl.style.display = 'none', 300);
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
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
        await verifyUserSession(currentUser.email);
    }
}

function debugAuthState() {
    console.log('=== 🔍 AUTH DEBUG INFO ===');
    console.log('Current User:', currentUser);
    console.log('localStorage amUserData:', localStorage.getItem('amUserData'));
    console.log('Cookie amUserData:', getCookie('amUserData'));
    console.log('localStorage amTheme:', localStorage.getItem('amTheme'));
    console.log('Cookie amTheme:', getCookie('amTheme'));
    console.log('Is Logged In:', isUserLoggedIn());
    console.log('HTML theme:', document.documentElement.getAttribute('data-theme') || 'light');
    
    const user = getUserData();
    if (user) {
        console.log('User Data:');
        console.log('  Email:', user.email);
        console.log('  Name:', user.name);
        console.log('  darkMode:', user.darkMode);
    }
    
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
