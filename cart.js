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
   PROMO SYSTEM (FIXED)
========================= */

const PROMO_CODES = [
    { code: "IBMCHURCH", type: "free_shipping", value: true }
];

let activePromo = null;

/* Load saved promo */
function loadPromo() {
    try {
        activePromo = JSON.parse(localStorage.getItem("amPromo")) || null;
    } catch {
        activePromo = null;
    }
}

/* Save promo */
function savePromo() {
    localStorage.setItem("amPromo", JSON.stringify(activePromo));
}

/* Apply promo */
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
            <h3>Your cart is empty</h3>
            <p>Add items to continue</p>
        </div>`;
        return;
    }

    const subtotal = getCartTotal();
    const shipping = getShipping();
    const total = getOrderTotal();

    container.innerHTML = `
    <div class="cart-layout">

        <div class="items">

            ${cart.map(item => `
                <div class="cart-item">

                    <img src="${item.image}" />

                    <div class="item-info">
                        <div class="name">${item.name}</div>
                        <div class="price">${config.currencySymbol}${(item.price * item.qty).toFixed(2)}</div>
                    </div>

                    <div class="qty-controls">
                        <button class="dec" data-id="${item.id}">-</button>
                        <span>${item.qty}</span>
                        <button class="inc" data-id="${item.id}">+</button>
                    </div>

                    <button class="remove" data-id="${item.id}">Remove</button>

                </div>
            `).join('')}

        </div>

        <div class="summary">

            <h3>Checkout</h3>

            <div class="line">
                <span>Subtotal</span>
                <span>${config.currencySymbol}${subtotal.toFixed(2)}</span>
            </div>

            <div class="line">
                <span>Shipping</span>
                <span>${shipping === 0 ? "FREE" : config.currencySymbol + shipping.toFixed(2)}</span>
            </div>

            <div class="line total">
                <span>Total</span>
                <span>${config.currencySymbol}${total.toFixed(2)}</span>
            </div>

            <div class="promo">
                <input id="promo-input" placeholder="Promo code">
                <button id="apply-promo">Apply</button>
            </div>

            <button class="checkout-btn" onclick="proceedToCheckout()">
                Checkout
            </button>

        </div>

    </div>`;

    /* EVENTS */
    container.querySelector('#apply-promo').onclick = () => {
        const val = document.getElementById('promo-input').value;
        applyPromo(val);
    };

    container.querySelectorAll('.inc').forEach(b =>
        b.onclick = () => {
            const id = b.dataset.id;
            const item = getCart().find(i => i.id === id);
            updateQty(id, item.qty + 1);
            renderCartPage();
        }
    );

    container.querySelectorAll('.dec').forEach(b =>
        b.onclick = () => {
            const id = b.dataset.id;
            const item = getCart().find(i => i.id === id);
            updateQty(id, item.qty - 1);
            renderCartPage();
        }
    );

    container.querySelectorAll('.remove').forEach(b =>
        b.onclick = () => {
            removeFromCart(b.dataset.id);
            renderCartPage();
        }
    );
}

/* =========================
   CHECKOUT (IMPORTANT FIX)
========================= */

async function proceedToCheckout() {
    const cart = getCart();
    if (!cart.length) return;

    const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cart,
            promo: activePromo
        })
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
    loadPromo();

    if (getSupabase()) {
        const userId = getUserId();
        if (!userId) return;

        try {
            const { data, error } = await getSupabase()
                .from('user_carts')
                .select('*')
                .eq('user_id', userId)
                .single();

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
