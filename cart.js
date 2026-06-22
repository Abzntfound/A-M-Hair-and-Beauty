/* ============================================================
   A&M Hair & Beauty — cart.js (FIXED + PROMO + CLEAN)
   ============================================================ */

/* =========================
   CONFIG
========================= */

function getConfig() {
    return window.AM_CONFIG || { currencySymbol: "£" };
}

/* =========================
   USER
========================= */

function getUserId() {
    try {
        // auth.js stores the logged-in user under "am_user" (see
        // saveLocalUser() in auth.js) — "amUserData" was never written
        // to by anything, so this always returned null before.
        const raw = localStorage.getItem('am_user');
        if (!raw) return null;

        const user = JSON.parse(raw);
        // user_carts.user_id is a uuid column matching auth.users.id.
        // Previously this checked user?.email first, which is a string
        // like "name@example.com" — not a valid uuid — causing Supabase
        // to reject the query with a 400.
        return user?.id || null;
    } catch {
        return null;
    }
}

/* =========================
   CART STORAGE
========================= */

function safeParse(json, fallback) {
    try { return JSON.parse(json); }
    catch { return fallback; }
}

function getCart() {
    const cart = safeParse(localStorage.getItem('amCart'), []);
    return Array.isArray(cart) ? cart : [];
}

/* =========================
   SUPABASE
========================= */

function getSupabase() {
    return window.supabaseClient || null;
}

/* =========================
   PROMO SYSTEM
========================= */

const PROMO_CODES = [
    { code: "IBMCHURCH", type: "free_shipping", value: true }
];

// AFTER
let activePromo = null;

function loadPromo() {
    activePromo = null; // always starts empty — resets on every page load/refresh
}

function savePromo() {
    // no persistence — intentionally in-memory only
}
function applyPromo(code) {
    const promo = PROMO_CODES.find(
        p => p.code.toUpperCase() === (code || "").toUpperCase()
    );

    activePromo = promo || null;
    savePromo();
    renderCartPage();
}

/* =========================
   SAVE CART
========================= */

function saveCart(items) {
    localStorage.setItem('amCart', JSON.stringify(items));

    window.dispatchEvent(new CustomEvent('amCartUpdated'));
    window.AM?.updateCartBadge?.();

    if (getSupabase()) {
        saveCartToServer(items);
        saveAbandonedCart(items);
    }
}

async function saveCartToServer(cart) {
    const supabase = getSupabase();
    const userId = getUserId();
    if (!supabase || !userId) return;

    const { error } = await supabase.from('user_carts').upsert({
        user_id: userId,
        cart,
        updated_at: new Date().toISOString()
    });

    if (error) console.error('saveCartToServer error:', error);
}

/* =========================
   CART ACTIONS
========================= */

function addToCart(productId, qty = 1) {
    qty = Math.max(1, Number(qty) || 1);

    const product = (window.AM_PRODUCTS || []).find(p => p.id === productId);
    if (!product) return false;

    const cart = getCart();
    const existing = cart.find(i => i.id === productId);

    if (existing) existing.qty += qty;
    else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            image: product.image,
            qty
        });
    }

    saveCart(cart);
    return true;
}

function removeFromCart(id) {
    saveCart(getCart().filter(i => i.id !== id));
}

function updateQty(id, qty) {
    qty = Number(qty);
    const cart = getCart();
    const item = cart.find(i => i.id === id);

    if (!item) return;

    if (qty < 1) return removeFromCart(id);

    item.qty = qty;
    saveCart(cart);
}

function clearCart() {
    saveCart([]);
}

/* =========================
   TOTALS
========================= */

function getCartTotal() {
    return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

function getShipping() {
    if (activePromo?.type === "free_shipping") return 0;
    return getCartTotal() >= 30 ? 0 : 3.99;
}

function getOrderTotal() {
    return getCartTotal() + getShipping();
}

/* =========================
   RENDER CART PAGE
========================= */

function renderCartPage() {
    const container = document.getElementById('cart-content');
    if (!container) return;

    const cart = getCart();
    const config = getConfig();

    if (!cart.length) {
        container.innerHTML = `
        <div class="empty-cart">
            <div class="icon">🛍️</div>
            <h3>Your cart is empty</h3>
            <p>Add items to continue</p>
            <a href="/products/" class="btn btn-primary" style="margin-top:1rem;">Shop Now</a>
        </div>`;
        return;
    }

    const subtotal = getCartTotal();
    const shipping = getShipping();
    const total = getOrderTotal();
    const promoMsg = activePromo?.type === "free_shipping"
        ? `<div style="color:#16a34a;font-size:0.85rem;margin-top:0.5rem;">✓ Free shipping applied (${activePromo.code})</div>`
        : '';

    container.innerHTML = `
    <div class="cart-layout">

        <div class="cart-items-section">
            <h2>Your Cart</h2>

            ${cart.map(item => `
                <div class="cart-item">

                    <img
                        class="cart-item-img"
                        src="${item.image}"
                        alt="${item.name}"
                        onerror="this.src='/assets/placeholder.webp'"
                    />

                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${config.currencySymbol}${(item.price * item.qty).toFixed(2)}</div>
                    </div>

                    <div class="qty-control">
                        <button class="qty-btn" data-id="${item.id}" data-action="dec">−</button>
                        <span class="qty-num">${item.qty}</span>
                        <button class="qty-btn" data-id="${item.id}" data-action="inc">+</button>
                    </div>

                    <button class="cart-item-remove" data-id="${item.id}" data-action="remove" title="Remove item">✕</button>

                </div>
            `).join('')}

        </div>

        <div class="cart-summary">

            <h3>Order Summary</h3>

            <div class="summary-row">
                <span>Subtotal</span>
                <span>${config.currencySymbol}${subtotal.toFixed(2)}</span>
            </div>

            <div class="summary-row">
                <span>Shipping</span>
                <span>${shipping === 0 ? "FREE" : config.currencySymbol + shipping.toFixed(2)}</span>
            </div>

            <div class="summary-row total">
                <span>Total</span>
                <span>${config.currencySymbol}${total.toFixed(2)}</span>
            </div>

            <div class="promo">
                <input id="promo-input" placeholder="Promo code" />
                <button id="apply-promo">Apply</button>
            </div>
            ${promoMsg}

            <button class="btn btn-primary checkout-btn" style="width:100%;margin-top:1.2rem;" onclick="proceedToCheckout()">
                Checkout
            </button>

            <p class="checkout-note">
                Secure payment via Stripe.<br>
                <a href="/policies/">Terms &amp; refund policy</a>
            </p>

        </div>

    </div>`;

    /* ---- EVENTS ---- */

    container.querySelector('#apply-promo').onclick = () => {
        const val = document.getElementById('promo-input').value;
        applyPromo(val);
    };

    container.querySelectorAll('[data-action="inc"]').forEach(b =>
        b.onclick = () => {
            const item = getCart().find(i => i.id === b.dataset.id);
            if (item) { updateQty(b.dataset.id, item.qty + 1); renderCartPage(); }
        }
    );

    container.querySelectorAll('[data-action="dec"]').forEach(b =>
        b.onclick = () => {
            const item = getCart().find(i => i.id === b.dataset.id);
            if (item) { updateQty(b.dataset.id, item.qty - 1); renderCartPage(); }
        }
    );

    container.querySelectorAll('[data-action="remove"]').forEach(b =>
        b.onclick = () => {
            removeFromCart(b.dataset.id);
            renderCartPage();
        }
    );
}

/* =========================
   CHECKOUT
========================= */

async function proceedToCheckout() {
    const cart = getCart();
    if (!cart.length) return;

    const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, promo: activePromo })
    });

    const data = await res.json();

    if (!res.ok) {
        alert("Checkout failed");
        return;
    }

    window.location.href = data.url;
}

/* =========================
   ABANDONED CART
========================= */

async function saveAbandonedCart(cart) {
    const supabase = getSupabase();
    const userId = getUserId();
    if (!supabase || !userId) return;

    const { error } = await supabase.from('abandoned_carts').upsert({
        user_id: userId,
        cart,
        updated_at: new Date().toISOString()
    });

    if (error) console.error('saveAbandonedCart error:', error);
}

/* =========================
   INIT
========================= */

(async function init() {
    localStorage.removeItem("amPromo"); // clean up legacy storage key
    loadPromo();
    // ... rest of init unchanged

    if (getSupabase()) {
        const userId = getUserId();
        if (!userId) return;

        try {
            // .maybeSingle() instead of .single(): a brand-new user (or
            // anyone who's never had a cart saved to the server) will
            // legitimately have ZERO rows in user_carts, which is not
            // an error. .single() treats "0 rows" the same as "more
            // than 1 row" — it throws either way, which is why this
            // was failing with "Cannot coerce the result to a single
            // JSON object" (a 406) for first-time/new carts.
            // .maybeSingle() returns { data: null } for zero rows and
            // only sets `error` for genuine failures.
            const { data, error } = await getSupabase()
                .from('user_carts')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.warn('Could not load saved cart from server:', error.message);
            } else if (data?.cart) {
                localStorage.setItem('amCart', JSON.stringify(data.cart));
                window.dispatchEvent(new CustomEvent('amCartUpdated'));
            }
        } catch (err) {
            console.warn('Could not load saved cart from server:', err);
        }
    }
})();

/* =========================
   EXPORTS
========================= */

window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.clearCart = clearCart;
window.getCart = getCart;
window.renderCartPage = renderCartPage;
window.proceedToCheckout = proceedToCheckout;
window.applyPromo = applyPromo;

console.log("cart.js FIXED + PROMO READY");
