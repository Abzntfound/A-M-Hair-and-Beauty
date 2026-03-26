// A&M Hair and Beauty - Main Website User Authentication
// home-auth.js — fully synced with auth.amhairandbeauty.com

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzyQsEQCkZ_UaRF9g_h_w3UHVAM4h8V7mEBy3euBlvOZvvAf2KtB9iF4j_GH8LXy1Iw5A/exec';

let currentUser = null;

// ── Cookie helpers ────────────────────────────────────────

function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length));
    }
    return null;
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; domain=.amhairandbeauty.com; SameSite=Lax`;
}

// ── Data access ───────────────────────────────────────────

function getUserData() {
    // Check all three storages — same as auth.js
    let userData = localStorage.getItem('amUserData');
    if (!userData) {
        userData = getCookie('amUserData');
        if (userData) localStorage.setItem('amUserData', userData);
    }
    if (!userData) {
        userData = sessionStorage.getItem('amUserData');
    }
    return userData ? JSON.parse(userData) : null;
}

function saveUserData(user) {
    const json = JSON.stringify(user);
    localStorage.setItem('amUserData', json);
    setCookie('amUserData', json, 30);
    sessionStorage.setItem('amUserData', json);
}

// ── Init ──────────────────────────────────────────────────

console.log('home-auth.js loading...');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUserAuth);
} else {
    initializeUserAuth();
}

async function initializeUserAuth() {
    try {
        const userData = getUserData();

        if (userData) {
            if (userData.darkMode !== undefined) {
                applyTheme(userData.darkMode ? 'dark' : 'light');
            }
            showLoggedInState(userData);
            currentUser = userData;

            // Verify in background without logging out on failure
            verifyUserSession(userData.email).catch(() => {
                console.log('Background verify failed, keeping cached data');
            });
        } else {
            showLoggedOutState();
            loadDefaultTheme();
        }

        setTimeout(checkAndShowImportantMessage, 800);

    } catch (error) {
        console.error('Initialization error:', error);
        showLoggedOutState();
        loadDefaultTheme();
    }
}

// ── API ───────────────────────────────────────────────────

async function verifyUserSession(email) {
    try {
        const result = await makeGoogleSheetsRequest('GET_USER', { email });
        if (result.success && result.user) {
            currentUser = result.user;
            saveUserData(result.user);
            if (result.user.darkMode !== undefined) applyTheme(result.user.darkMode ? 'dark' : 'light');
            showLoggedInState(result.user);
        }
    } catch (error) {
        console.log('Session verify error (non-fatal):', error);
    }
}

async function makeGoogleSheetsRequest(action, data) {
    const params = new URLSearchParams({ action, data: JSON.stringify(data) });
    const response = await fetch(`${GOOGLE_SHEETS_URL}?${params}`, { method: 'GET', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return JSON.parse(await response.text());
}

// ── UI ────────────────────────────────────────────────────

function showLoggedInState(user) {
    const userDisplayName = document.getElementById('user-display-name');
    if (userDisplayName) {
        userDisplayName.innerHTML = `<span class="user-name">${user.name.split(' ')[0]}</span>`;
    }

    const nameInput = document.getElementById('name');
    if (nameInput && user.name) nameInput.value = user.name;

    currentUser = user;
}

function showLoggedOutState() {
    const userDisplayName = document.getElementById('user-display-name');
    if (userDisplayName) userDisplayName.textContent = 'Sign In';
    currentUser = null;
}

// FIXED: clicking the header always goes to auth page
// No more accidental sign outs
function handleUserHeaderClick() {
    window.location.href = 'https://auth.amhairandbeauty.com';
}

// ── Theme ─────────────────────────────────────────────────

function applyTheme(theme) {
    const html = document.documentElement;
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
    const theme = localStorage.getItem('amTheme') || getCookie('amTheme') || 'light';
    applyTheme(theme);
}

// ── Important message ─────────────────────────────────────

function checkAndShowImportantMessage() {
    const user = getUserData();
    if (!user) return;
    const messageEl = document.getElementById('important-message');
    if (messageEl && !localStorage.getItem(`amImportantMessageSeen_${user.email}`)) {
        messageEl.classList.add('show');
    }
}

function dismissImportantMessage() {
    const user = getUserData();
    if (user) localStorage.setItem(`amImportantMessageSeen_${user.email}`, 'true');
    const messageEl = document.getElementById('important-message');
    if (messageEl) {
        messageEl.classList.remove('show');
        setTimeout(() => messageEl.style.display = 'none', 300);
    }
}

// ── Utility ───────────────────────────────────────────────

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('amUserData');
        sessionStorage.removeItem('amUserData');
        document.cookie = 'amUserData=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.amhairandbeauty.com;';
        currentUser = null;
        showLoggedOutState();
        loadDefaultTheme();
        window.location.reload();
    }
}

function getCurrentUser() { return currentUser; }
function isUserLoggedIn() { return currentUser !== null; }
async function refreshUserData() {
    if (currentUser?.email) await verifyUserSession(currentUser.email);
}

// Make globally available
window.handleUserHeaderClick = handleUserHeaderClick;
window.dismissImportantMessage = dismissImportantMessage;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.isUserLoggedIn = isUserLoggedIn;
window.refreshUserData = refreshUserData;

console.log('home-auth.js loaded!');
