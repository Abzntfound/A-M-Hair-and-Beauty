/* ===========================================================
   A&M Hair & Beauty — nav.js (FOLDER-SAFE VERSION, SUPABASE-AWARE)
   ============================================================ */

const BASE = "https://amhairandbeauty.com";

// auth.js stores the logged-in user under the "am_user" key
// (see saveLocalUser() in auth.js). Declared up here, before
// loadTheme() runs below, since loadTheme() -> getUserData()
// needs this immediately at script load time.
const USER_CACHE_KEY = 'am_user';

// ============================================================
// COOKIE HELPERS
// ============================================================
function getCookie(name) {
    const eq = name + '=';
    for (let c of document.cookie.split(';')) {
        c = c.trim();
        if (c.indexOf(eq) === 0) return decodeURIComponent(c.substring(eq.length));
    }
    return null;
}

// ============================================================
// THEME
// ============================================================
function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
}

function loadTheme() {
    let theme = null;
    const u = getUserData();

    if (u) {
        const dark = u.darkMode ?? u.profile?.darkMode;
        if (dark !== undefined) theme = dark ? 'dark' : 'light';
    }

    if (!theme) theme = localStorage.getItem('amTheme') || getCookie('amTheme') || 'light';
    applyTheme(theme);
}
loadTheme();

// ============================================================
// AUTH / USER DATA
// ============================================================

function getUserData() {
    const raw = localStorage.getItem(USER_CACHE_KEY) || getCookie(USER_CACHE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function setUserData(user) {
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_CACHE_KEY);
}

function displayNameFor(user) {
    if (!user) return 'Sign In';
    const name = user.profile?.name;
    return name ? name.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'Account');
}

// Ask Supabase directly who's actually logged in right now, rather
// than trusting whatever's cached in localStorage (which goes stale
// the moment someone logs out in another tab, or a session expires).
async function fetchLiveUser() {
    const client = window.supabaseClient;
    if (!client) {
        console.warn('nav.js: window.supabaseClient not found — is auth.js loaded on this page?');
        return getUserData(); // fall back to cache rather than wiping the nav
    }

    try {
        const { data, error } = await client.auth.getUser();

        if (error || !data?.user) {
            setUserData(null);
            return null;
        }

        const { data: profile } = await client
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        const user = { ...data.user, profile: profile || null };
        setUserData(user);
        return user;
    } catch (err) {
        console.warn('nav.js: failed to fetch live user, using cached value', err);
        return getUserData();
    }
}

// ============================================================
// HEADER
// ============================================================
function renderHeader(activePage) {
    // Render immediately with whatever's cached so the header
    // paints instantly with no flash/jump...
    renderHeaderWith(activePage, getUserData());

    // ...then quietly verify against Supabase and patch the
    // display if the real session disagrees with the cache.
    fetchLiveUser().then(liveUser => {
        updateUserDisplay(liveUser);
    });
}

function renderHeaderWith(activePage, user) {
    const cartCount = getCartCount();
    const displayName = displayNameFor(user);

    const currentPath = window.location.pathname.replace(/\/$/, "");

    const navLinks = (AM_NAV || []).map(l => {
        const linkPath = new URL(l.href, BASE).pathname.replace(/\/$/, "");

        const isActive = activePage
            ? activePage === l.label
            : currentPath === linkPath;

        return `
            <a href="${l.href}" class="${isActive ? "active" : ""}">
                ${l.label}
            </a>
        `;
    }).join('');

    const html = `
    <header class="site-header" id="site-header">
      <a href="/" class="logo">
        <img src="/A&M.png" alt="A&M" onerror="this.style.display='none'">
        <span>A&amp;M Hair &amp; Beauty</span>
      </a>

      <nav>${navLinks}</nav>

      <div class="header-right">
        <a href="/cart/" class="cart-icon-btn" title="Cart">
          🛒
          <span class="cart-count" id="header-cart-count">${cartCount || ''}</span>
        </a>

        <a href="${AM_CONFIG.authUrl}" class="user-link" id="user-link">
          👤 <span id="user-display-name">${displayName}</span>
        </a>

        <button class="mobile-menu-btn" id="mobile-menu-btn">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>

    <div class="mobile-overlay" id="mobile-overlay"></div>
    <div class="mobile-menu" id="mobile-menu">
      <nav>
        ${navLinks}
        <a href="/cart/">Cart (${cartCount})</a>
        <a href="${AM_CONFIG.authUrl}" id="mobile-user-link">${displayName}</a>
      </nav>
    </div>`;

    const placeholder = document.getElementById('header-placeholder');
    if (placeholder) placeholder.outerHTML = html;
    else document.body.insertAdjacentHTML('afterbegin', html);

    initHeader();
}

// Patches just the user-facing bits of the already-rendered header,
// instead of re-rendering the whole thing (avoids losing scroll
// state / re-triggering animations / flashing the nav).
function updateUserDisplay(user) {
    const displayName = displayNameFor(user);

    const nameEl = document.getElementById('user-display-name');
    if (nameEl) nameEl.textContent = displayName;

    const mobileLink = document.getElementById('mobile-user-link');
    if (mobileLink) mobileLink.textContent = displayName;
}

// ============================================================
// HEADER INIT
// ============================================================
function initHeader() {
    const header = document.getElementById('site-header');
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');

    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 80);
    }, { passive: true });

    menuBtn?.addEventListener('click', () => {
        menu.classList.toggle('open');
        overlay.classList.toggle('open');
    });

    overlay?.addEventListener('click', () => {
        menu.classList.remove('open');
        overlay.classList.remove('open');
    });

    document.querySelectorAll('.mobile-menu nav a').forEach(a =>
        a.addEventListener('click', () => {
            menu.classList.remove('open');
            overlay.classList.remove('open');
        })
    );
}

// ============================================================
// FOOTER
// ============================================================
function renderFooter() {
    const f = AM_FOOTER;

    const cols = (f.columns || []).map(col => `
        <div class="footer-col">
          <h4>${col.heading}</h4>
          ${col.links.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
        </div>
    `).join('');

    const html = `
    <footer class="footer">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="logo">
            <img src="/A&M.png" alt="A&M" onerror="this.style.display='none'">
            <span>A&amp;M Hair &amp; Beauty</span>
          </a>
          <p>${f.tagline}</p>
        </div>
        ${cols}
      </div>

      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} A&amp;M Hair &amp; Beauty</span>
        <span>Made with ❤️</span>
      </div>
    </footer>`;

    const placeholder = document.getElementById('footer-placeholder');
    if (placeholder) placeholder.outerHTML = html;
    else document.body.insertAdjacentHTML('beforeend', html);
}

// ============================================================
// SCROLL REVEAL
// ============================================================
function initScrollReveal() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) e.target.classList.add('revealed');
        });
    }, { threshold: 0.12 });

    document.querySelectorAll(
        '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scale-in'
    ).forEach(el => observer.observe(el));
}

// ============================================================
// CART
// ============================================================
function getCartCount() {
    try {
        const items = JSON.parse(localStorage.getItem('amCart') || '[]');
        return items.reduce((s, i) => s + (i.qty || 1), 0);
    } catch {
        return 0;
    }
}

function updateCartBadge() {
    const el = document.getElementById('header-cart-count');
    if (!el) return;
    const c = getCartCount();
    el.textContent = c || '';
    if (c) {
        el.classList.add('bump');
        setTimeout(() => el.classList.remove('bump'), 300);
    }
}

// ============================================================
// EXPORT
// ============================================================
window.AM = {
    renderHeader,
    renderFooter,
    initScrollReveal,
    getCartCount,
    updateCartBadge,
    getUserData,
    fetchLiveUser,
    getCookie,
    applyTheme,
};

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
});

console.log("✅ nav.js loaded (Supabase-aware)");
