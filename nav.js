/* ===========================================================
   A&M Hair & Beauty — nav.js (SELF-CONTAINED, SUPABASE-AWARE)
   ============================================================ */

const BASE = "https://amhairandbeauty.com";

// auth.js (when present) stores the logged-in user under the
// "am_user" key (see saveLocalUser() in auth.js).
const USER_CACHE_KEY = 'am_user';

// ============================================================
// SUPABASE CLIENT (SELF-CONTAINED)
// ============================================================
// nav.js used to assume auth.js had already run somewhere on the
// page and created window.supabaseClient. That's not true on every
// page (e.g. pages in folders that don't include auth.js), so
// nav.js now creates its own client if one doesn't already exist.
// If auth.js DOES run later and creates its own client, that's
// fine too — Supabase clients are stateless config wrappers, not
// singletons, so having two is harmless as long as both point at
// the same project (which they do here).

const SUPABASE_URL = "https://bipejrjipvoqvkwuzftz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcGVqcmppcHZvcXZrd3V6ZnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzYzMjMsImV4cCI6MjA5NzIxMjMyM30.Z8V7chc-UOK2UU5dxBydgLbT0u1DUv2_DGtisLmZWq4";

// Lazily loads the Supabase JS SDK from CDN if it isn't already on
// the page, then creates window.supabaseClient if it doesn't exist.
// Returns a promise that resolves once window.supabaseClient is ready.
function ensureSupabaseClient() {
    if (window.supabaseClient) {
        return Promise.resolve(window.supabaseClient);
    }

    // The SDK itself might already be loaded (e.g. by auth.js's own
    // <script> tag) even if the *client* hasn't been created yet.
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return Promise.resolve(window.supabaseClient);
    }

    // Neither the SDK nor the client exist yet — load the SDK from
    // CDN, then create the client once it's available.
    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(
            'script[data-am-supabase-sdk]'
        );

        const onReady = () => {
            try {
                window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                resolve(window.supabaseClient);
            } catch (err) {
                reject(err);
            }
        };

        if (existingScript) {
            // Another call to ensureSupabaseClient() already kicked
            // off the load; just wait for it.
            existingScript.addEventListener('load', onReady, { once: true });
            existingScript.addEventListener('error', reject, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        script.setAttribute('data-am-supabase-sdk', 'true');
        script.addEventListener('load', onReady, { once: true });
        script.addEventListener('error', () => {
            console.error('nav.js: failed to load Supabase SDK from CDN');
            reject(new Error('Supabase SDK failed to load'));
        }, { once: true });
        document.head.appendChild(script);
    });
}

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
    console.log('nav.js DEBUG: fetchLiveUser() called');
    let client;
    try {
        client = await ensureSupabaseClient();
        console.log('nav.js DEBUG: got client ->', client);
    } catch (err) {
        console.warn('nav.js: could not get a Supabase client, using cached value', err);
        return getUserData();
    }

    try {
        // A freshly-created client needs a moment to read its session
        // back out of localStorage before it knows who's logged in.
        // Calling getUser() immediately after createClient() can throw
        // AuthSessionMissingError even when a valid session DOES exist
        // in storage, because initialization hasn't finished yet.
        // getSession() is what actually waits on/returns that
        // initialization, so we call it first to let the client catch
        // up before asking getUser() to validate against the server.
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        console.log('nav.js DEBUG: getSession() ->', sessionData, sessionError);

        if (!sessionData?.session) {
            // Genuinely no session in storage at all — safe to clear.
            setUserData(null);
            return null;
        }

        const { data, error } = await client.auth.getUser();

        if (error) {
            // Log instead of silently wiping the cache — a transient
            // network/auth error here used to delete am_user and flip
            // the nav to "Sign In" even though the user was actually
            // still logged in.
            console.warn('nav.js: auth.getUser() returned an error, keeping cached user', error);
            return getUserData();
        }

        if (!data?.user) {
            // This IS a real "no session" result (not an error), so
            // it's safe to clear the cache here.
            setUserData(null);
            return null;
        }

        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.warn('nav.js DEBUG: profile fetch failed ->', profileError);
        }

        const user = { ...data.user, profile: profile || null };
        console.log('nav.js DEBUG: resolved user ->', user);
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
    console.log('nav.js DEBUG: renderHeader() called with', activePage);
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
    ensureSupabaseClient,
};

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
});

console.log("✅ nav.js loaded (self-contained Supabase)");
