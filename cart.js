/* ============================================================
   A&M Hair & Beauty — cart.js (FULL FIXED VERSION)
   Persistent cart + Supabase sync + Orders + Recovery
   ============================================================ */

// ============================================================
// CONFIG
// ============================================================

function getConfig() {
    return window.AM_CONFIG || { currencySymbol: "£" };
}

// ============================================================
// USER
// ============================================================

function getUserId() {
    try {
        const raw = localStorage.getItem('amUserData');
        if (!raw) return null;

        const user = JSON.parse(raw);
        return user?.email || user?.id || null;
    } catch {
        return null;
    }
}

// ============================================================
// SAFE STORAGE
// ============================================================

function safeParse(json, fallback) {
    try { return JSON.parse(json); }
    catch { return fallback; }
}

// ============================================================
// CART CORE
// ============================================================

function getCart() {
    const cart = safeParse(localStorage.getItem('amCart'), []);
    return Array.isArray(cart) ? cart : [];
}

// ============================================================
// SUPABASE HELPERS
// ============================================================

function getSupabase() {
    return window.supabaseClient || null;
}

// ============================================================
// LOAD CART FROM SERVER
// ============================================================

async function loadCartFromServer() {
    const userId = getUserId();
    const supabase = getSupabase();
    if (!userId || !supabase) return;

    try {
        const { data } = await supabase
            .from('user_carts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (data?.cart) {
            localStorage.setItem('amCart', JSON.stringify(data.cart));
            window.dispatchEvent(new CustomEvent('amCartUpdated'));
        }
    } catch (e) {
        console.warn("Cart load failed:", e);
    }
}

// ============================================================
// SAVE CART (LOCAL + CLOUD + ABANDONED)
// ============================================================

function saveCart(items) {
    localStorage.setItem('amCart', JSON.stringify(items));

    window.dispatchEvent(new CustomEvent('amCartUpdated'));
    window.AM?.updateCartBadge?.();

    const supabase = getSupabase();
    if (supabase) {
        saveCartToServer(items);
        saveAbandonedCart(items);
    }
}

async function saveCartToServer(cart) {
    const userId = getUserId();
    const supabase = getSupabase();
    if (!userId || !supabase) return;

    try {
        await supabase.from('user_carts').upsert({
            user_id: userId,
            cart,
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn("Cart sync failed:", e);
    }
}

// ============================================================
// CART ACTIONS
// ============================================================

function addToCart(productId, qty = 1) {
    qty = Math.max(1, Number(qty) || 1);

    const product = (window.AM_PRODUCTS || []).find(p => p.id === productId);
    if (!product || product.discontinued) return false;

    const cart = getCart();
    const existing = cart.find(i => i.id === productId);

    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            image: product.image,
            qty
        });
    }

    saveCart(cart);
    window.AM?.showToast?.(`${product.name} added to cart 🛒`);
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

// ============================================================
// TOTALS
// ============================================================

function getCartTotal() {
    return getCart().reduce((sum, i) =>
        sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0
    );
}

function getShipping() {
    return getCartTotal() >= 30 ? 0 : 3.99;
}

function getOrderTotal() {
    return getCartTotal() + getShipping();
}

// ============================================================
// CART RENDER
// ============================================================

function renderCartPage() {
    const container = document.getElementById('cart-content');
    if (!container) return;

    const cart = getCart();
    const config = getConfig();

    if (!cart.length) {
        container.innerHTML = `
        <div class="empty-cart">
            <h3>Your cart is empty</h3>
            <p>Start shopping to add items.</p>
            <a href="/products/">Browse Products</a>
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
                    <img src="${item.image}">
                    <div>${item.name}</div>
                    <div>${config.currencySymbol}${item.price * item.qty}</div>

                    <button data-id="${item.id}" class="dec">-</button>
                    <span>${item.qty}</span>
                    <button data-id="${item.id}" class="inc">+</button>
                    <button data-id="${item.id}" class="remove">✕</button>
                </div>
            `).join('')}
        </div>

        <div class="summary">
            <h3>Summary</h3>
            <p>Subtotal: ${config.currencySymbol}${subtotal.toFixed(2)}</p>
            <p>Shipping: ${shipping === 0 ? "FREE" : config.currencySymbol + shipping}</p>
            <h2>Total: ${config.currencySymbol}${total.toFixed(2)}</h2>

            <button onclick="proceedToCheckout()">Checkout</button>
        </div>
    </div>`;

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

// ============================================================
// CHECKOUT
// ============================================================

async function proceedToCheckout() {
    const cart = getCart();
    if (!cart.length) return;

    try {
        const res = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cart)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        window.location.href = data.url;
    } catch (e) {
        console.error(e);
        alert("Checkout failed");
    }
}

// ============================================================
// ORDERS (PREVIOUS ORDERS)
// ============================================================

async function getPreviousOrders() {
    const userId = getUserId();
    const supabase = getSupabase();
    if (!userId || !supabase) return [];

    try {
        const { data } = await supabase
            .from('user_orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        return data || [];
    } catch {
        return [];
    }
}

// ============================================================
// ABANDONED CART
// ============================================================

async function saveAbandonedCart(cart) {
    const userId = getUserId();
    const supabase = getSupabase();
    if (!userId || !supabase) return;

    try {
        await supabase.from('abandoned_carts').upsert({
            user_id: userId,
            cart,
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn("Abandoned cart failed:", e);
    }
}

async function getAbandonedCart() {
    const userId = getUserId();
    const supabase = getSupabase();
    if (!userId || !supabase) return [];

    try {
        const { data } = await supabase
            .from('abandoned_carts')
            .select('*')
            .eq('user_id', userId)
            .single();

        return data?.cart || [];
    } catch {
        return [];
    }
}

async function restoreAbandonedCart() {
    const cart = await getAbandonedCart();
    if (!cart.length) return;

    saveCart(cart);
    alert("Previous cart restored 🛒");
}

// ============================================================
// INIT
// ============================================================

(async function init() {
    if (getSupabase()) {
        await loadCartFromServer();
    }
})();

// ============================================================
// EXPORTS
// ============================================================

window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.clearCart = clearCart;
window.getCart = getCart;
window.renderCartPage = renderCartPage;
window.proceedToCheckout = proceedToCheckout;
window.getPreviousOrders = getPreviousOrders;
window.restoreAbandonedCart = restoreAbandonedCart;

console.log("✅ cart.js loaded (FIXED + PERSISTENT + ORDERS + ABANDONED)");
