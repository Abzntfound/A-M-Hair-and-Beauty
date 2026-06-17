/* ============================================================
   A&M Hair & Beauty — cart.js (FIXED FINAL)
   ============================================================ */

function getConfig() {
    return window.AM_CONFIG || { currencySymbol: "£" };
}

// -----------------------------
// SUPABASE
// -----------------------------
function getSupabase() {
    return window.supabaseClient || null;
}

// -----------------------------
// USER (FIXED)
// -----------------------------
async function getUserId() {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
        const { data } = await supabase.auth.getUser();
        return data?.user?.id || null;
    } catch {
        return null;
    }
}

// -----------------------------
// CART
// -----------------------------
function safeParse(json, fallback) {
    try { return JSON.parse(json); }
    catch { return fallback; }
}

function getCart() {
    return safeParse(localStorage.getItem('amCart'), []);
}

// -----------------------------
// SAVE CART
// -----------------------------
function saveCart(items) {
    localStorage.setItem('amCart', JSON.stringify(items));

    window.dispatchEvent(new CustomEvent('amCartUpdated'));
    window.AM?.updateCartBadge?.();

    syncCartToServer(items);
    saveAbandonedCart(items);
}

// -----------------------------
// SYNC CART
// -----------------------------
async function syncCartToServer(cart) {
    const supabase = getSupabase();
    const userId = await getUserId();
    if (!supabase || !userId) return;

    await supabase.from('user_carts').upsert({
        user_id: userId,
        cart,
        updated_at: new Date().toISOString()
    });
}

// -----------------------------
// CART ACTIONS
// -----------------------------
function addToCart(productId, qty = 1) {
    qty = Math.max(1, Number(qty) || 1);

    const product = (window.AM_PRODUCTS || []).find(p => p.id === productId);
    if (!product) return false;

    const cart = getCart();
    const item = cart.find(i => i.id === productId);

    if (item) item.qty += qty;
    else cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image,
        qty
    });

    saveCart(cart);
    window.AM?.showToast?.("Added to cart");
    return true;
}

function removeFromCart(id) {
    saveCart(getCart().filter(i => i.id !== id));
}

function updateQty(id, qty) {
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

// -----------------------------
// TOTALS
// -----------------------------
function getCartTotal() {
    return getCart().reduce(
        (s, i) => s + (i.price * i.qty),
        0
    );
}

function getShipping() {
    return getCartTotal() >= 30 ? 0 : 3.99;
}

function getOrderTotal() {
    return getCartTotal() + getShipping();
}

// -----------------------------
// RENDER CART
// -----------------------------
function renderCartPage() {
    const el = document.getElementById('cart-content');
    if (!el) return;

    const cart = getCart();
    const c = getConfig();

    if (!cart.length) {
        el.innerHTML = "<p>Cart empty</p>";
        return;
    }

    el.innerHTML = `
        ${cart.map(i => `
            <div>
                ${i.name} - ${c.currencySymbol}${i.price * i.qty}
                <button class="dec" data-id="${i.id}">-</button>
                <span>${i.qty}</span>
                <button class="inc" data-id="${i.id}">+</button>
                <button class="remove" data-id="${i.id}">x</button>
            </div>
        `).join('')}

        <h3>Total: ${c.currencySymbol}${getOrderTotal()}</h3>
        <button onclick="proceedToCheckout()">Checkout</button>
    `;

    el.querySelectorAll('.inc').forEach(b =>
        b.onclick = () => {
            const i = cart.find(x => x.id === b.dataset.id);
            updateQty(i.id, i.qty + 1);
            renderCartPage();
        }
    );

    el.querySelectorAll('.dec').forEach(b =>
        b.onclick = () => {
            const i = cart.find(x => x.id === b.dataset.id);
            updateQty(i.id, i.qty - 1);
            renderCartPage();
        }
    );

    el.querySelectorAll('.remove').forEach(b =>
        b.onclick = () => {
            removeFromCart(b.dataset.id);
            renderCartPage();
        }
    );
}

// -----------------------------
// CHECKOUT
// -----------------------------
async function proceedToCheckout() {
    const cart = getCart();
    if (!cart.length) return;

    const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cart)
    });

    const data = await res.json();
    if (data?.url) window.location.href = data.url;
}

// -----------------------------
// ABANDONED CART
// -----------------------------
async function saveAbandonedCart(cart) {
    const supabase = getSupabase();
    const userId = await getUserId();
    if (!supabase || !userId) return;

    await supabase.from('abandoned_carts').upsert({
        user_id: userId,
        cart,
        updated_at: new Date().toISOString()
    });
}

async function restoreAbandonedCart() {
    const supabase = getSupabase();
    const userId = await getUserId();
    if (!supabase || !userId) return;

    const { data } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!data?.cart?.length) return;

    saveCart(data.cart);
    alert("Cart restored");
}

// -----------------------------
// ORDERS
// -----------------------------
async function getPreviousOrders() {
    const supabase = getSupabase();
    const userId = await getUserId();
    if (!supabase || !userId) return [];

    const { data } = await supabase
        .from('user_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    return data || [];
}

// -----------------------------
// INIT
// -----------------------------
(async function () {
    // optional preload cart
    const supabase = getSupabase();
    const userId = await getUserId();

    if (supabase && userId) {
        const { data } = await supabase
            .from('user_carts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (data?.cart) {
            localStorage.setItem('amCart', JSON.stringify(data.cart));
        }
    }
})();

// -----------------------------
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.clearCart = clearCart;
window.renderCartPage = renderCartPage;
window.proceedToCheckout = proceedToCheckout;
window.getPreviousOrders = getPreviousOrders;
window.restoreAbandonedCart = restoreAbandonedCart;

console.log("cart.js fixed");
