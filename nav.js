/* ============================================================
   A&M Hair & Beauty — nav.js
   Renders shared header & footer, handles scroll/mobile/auth.
   ============================================================ */

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
    const rawUser = localStorage.getItem('amUserData') || getCookie('amUserData');
    if (rawUser) {
        try {
            const u = JSON.parse(rawUser);
            if (u.darkMode !== undefined) theme = u.darkMode ? 'dark' : 'light';
        } catch (e) {}
    }
    if (!theme) theme = localStorage.getItem('amTheme') || getCookie('amTheme') || 'light';
    applyTheme(theme);
}
loadTheme();

// ============================================================
// RENDER HEADER
// ============================================================
function renderHeader(activePage) {
    const cartCount = getCartCount();
    const user = getUserData();
    const displayName = user ? (user.name ? user.name.split(' ')[0] : user.email.split('@')[0]) : 'Sign In';

    const navLinks = (AM_NAV || []).map(l =>
        `<a href="${l.href}"${activePage === l.label ? ' class="active"' : ''}>${l.label}</a>`
    ).join('');

    const html = `
    <header class="site-header" id="site-header">
      <a href="index.html" class="logo">
        <img src="A&M.png" alt="A&M" onerror="this.style.display='none'">
        <span>A&amp;M Hair &amp; Beauty</span>
      </a>

      <nav>${navLinks}</nav>

      <div class="header-right">
        <a href="cart.html" class="cart-icon-btn" title="Cart">
          🛒
          <span class="cart-count" id="header-cart-count">${cartCount || ''}</span>
        </a>
        <a href="${AM_CONFIG.authUrl}" class="user-link">
          👤 <span id="user-display-name">${displayName}</span>
        </a>
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>

    <div class="mobile-overlay" id="mobile-overlay"></div>
    <div class="mobile-menu" id="mobile-menu">
      <nav>
        ${navLinks}
        <a href="https://amhairandbeauty.com/cart/">Cart (${cartCount})</a>
        <a href="${AM_CONFIG.authUrl}">${displayName}</a>
      </nav>
    </div>`;

    const placeholder = document.getElementById('header-placeholder');
    if (placeholder) placeholder.outerHTML = html;
    else document.body.insertAdjacentHTML('afterbegin', html);

    initHeader();
}

function initHeader() {
    const header = document.getElementById('site-header');
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');

    // Scroll effect
    function onScroll() {
        if (window.scrollY > 80) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile menu
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            menu.classList.toggle('open');
            overlay.classList.toggle('open');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            menu.classList.remove('open');
            overlay.classList.remove('open');
        });
    }
    document.querySelectorAll('.mobile-menu nav a').forEach(a =>
        a.addEventListener('click', () => {
            menu.classList.remove('open');
            overlay.classList.remove('open');
        })
    );
}

// ============================================================
// RENDER FOOTER
// ============================================================
function renderFooter() {
    const f = AM_FOOTER;
    const cols = (f.columns || []).map(col => `
        <div class="footer-col">
          <h4>${col.heading}</h4>
          ${col.links.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
        </div>`).join('');

    const html = `
    <footer class="footer">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="https://amhairandbeauty.com/" class="logo" style="color:white">
            <img src="A&M.png" alt="A&M" onerror="this.style.display='none'" style="filter:brightness(0) invert(1)">
            <span>A&amp;M Hair &amp; Beauty</span>
          </a>
          <p>${f.tagline}</p>
        </div>
        ${cols}
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} <span>A&amp;M Hair &amp; Beauty</span>. All rights reserved.</span>
        <span>Made with ❤️ for beautiful hair</span>
      </div>
    </footer>`;

    const placeholder = document.getElementById('footer-placeholder');
    if (placeholder) placeholder.outerHTML = html;
    else document.body.insertAdjacentHTML('beforeend', html);
}

// ============================================================
// AUTH
// ============================================================
function getUserData() {
    const raw = localStorage.getItem('amUserData') || getCookie('amUserData');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}

// ============================================================
// SCROLL REVEAL
// ============================================================
function initScrollReveal() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); });
    }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });

    document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scale-in')
        .forEach(el => observer.observe(el));
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, icon = '✓', duration = 3000) {
    let toast = document.getElementById('am-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'am-toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="toast-icon">${icon}</span> ${message}`;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
}

// ============================================================
// CART COUNT
// ============================================================
function getCartCount() {
    try {
        const items = JSON.parse(localStorage.getItem('amCart') || '[]');
        return items.reduce((s, i) => s + (i.qty || 1), 0);
    } catch (e) { return 0; }
}

function updateCartBadge() {
    const el = document.getElementById('header-cart-count');
    if (!el) return;
    const c = getCartCount();
    el.textContent = c || '';
    if (c) { el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 300); }
}

// ============================================================
// INIT ON LOAD
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    // Header/footer are rendered by each page, not here,
    // so sub-page scripts call renderHeader/renderFooter themselves.
});

window.AM = {
    renderHeader,
    renderFooter,
    initScrollReveal,
    showToast,
    getCartCount,
    updateCartBadge,
    getUserData,
    getCookie,
    applyTheme,
};

console.log('✅ nav.js loaded');
