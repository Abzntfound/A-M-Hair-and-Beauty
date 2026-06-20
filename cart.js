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
        const raw = localStorage.getItem('am_user');
        if (!raw) return null;

        const user = JSON.parse(raw);
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
        <div id="empty-cart">
            <h3>Your cart is empty</h3>
            <p>Add items to continue</p>
        </div>`;
        return;
    }

    const subtotal = getCartTotal();
    const shipping = getShipping();
    const total = getOrderTotal();

    container.innerHTML = `
    <div id="cart-layout">

        <div id="cart-items">

            ${cart.map(item => `
                <div id="cart-item-${item.id}">

                    <img src="${item.image}" />

                    <div id="item-info-${item.id}">
                        <div>${item.name}</div>
                        <div>${config.currencySymbol}${(item.price * item.qty).toFixed(2)}</div>
                    </div>

                    <div id="qty-controls-${item.id}">
                        <button data-id="${item.id}" data-action="dec">-</button>
                        <span>${item.qty}</span>
                        <button data-id="${item.id}" data-action="inc">+</button>
                    </div>

                    <button data-id="${item.id}" data-action="remove">Remove</button>

                </div>
            `).join('')}

        </div>

        <div id="cart-summary">

            <h3>Checkout</h3>

            <div id="line-subtotal">
                <span>Subtotal</span>
                <span>${config.currencySymbol}${subtotal.toFixed(2)}</span>
            </div>

            <div id="line-shipping">
                <span>Shipping</span>
                <span>${shipping === 0 ? "FREE" : config.currencySymbol + shipping.toFixed(2)}</span>
            </div>

            <div id="line-total">
                <span>Total</span>
                <span>${config.currencySymbol}${total.toFixed(2)}</span>
            </div>

            <div id="promo-section">
                <input id="promo-input" placeholder="Promo code">
                <button id="apply-promo">Apply</button>
            </div>

            <button id="checkout-btn" onclick="proceedToCheckout()">
                Checkout
            </button>

        </div>

    </div>`;

    /* EVENTS */
    container.querySelector('#apply-promo').onclick = () => {
        const val = document.getElementById('promo-input').value;
        applyPromo(val);
    };

    container.querySelectorAll('[data-action="inc"]').forEach(b =>
        b.onclick = () => {
            const id = b.dataset.id;
            const item = getCart().find(i => i.id === id);
            updateQty(id, item.qty + 1);
            renderCartPage();
        }
    );

    container.querySelectorAll('[data-action="dec"]').forEach(b =>
        b.onclick = () => {
            const id = b.dataset.id;
            const item = getCart().find(i => i.id === id);
            updateQty(id, item.qty - 1);
            renderCartPage();
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
