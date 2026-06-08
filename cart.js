/* ============================================================
   A&M Hair & Beauty — cart.js
   Cart state management + Stripe checkout.
   ============================================================ */

// ============================================================
// CART STATE
// ============================================================
function getCart() {
    try { return JSON.parse(localStorage.getItem('amCart') || '[]'); }
    catch (e) { return []; }
}

function saveCart(items) {
    localStorage.setItem('amCart', JSON.stringify(items));
    window.AM && window.AM.updateCartBadge && window.AM.updateCartBadge();
    window.dispatchEvent(new CustomEvent('amCartUpdated'));
}

function addToCart(productId, qty = 1) {
    const product = AM_PRODUCTS.find(p => p.id === productId);
    if (!product || product.discontinued) return false;

    const cart = getCart();
    const existing = cart.find(i => i.id === productId);

    if (existing) {
        existing.qty = (existing.qty || 1) + qty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            qty: qty,
        });
    }

    saveCart(cart);
    window.AM && window.AM.showToast(`${product.name} added to cart 🛒`);
    return true;
}

function removeFromCart(productId) {
    const cart = getCart().filter(i => i.id !== productId);
    saveCart(cart);
}

function updateQty(productId, qty) {
    if (qty < 1) { removeFromCart(productId); return; }
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) { item.qty = qty; saveCart(cart); }
}

function clearCart() {
    saveCart([]);
}

function getCartTotal() {
    return getCart().reduce((sum, i) => sum + i.price * (i.qty || 1), 0);
}

function getShipping() {
    return getCartTotal() >= 30 ? 0 : 3.99;
}

function getOrderTotal() {
    return getCartTotal() + getShipping();
}

// ============================================================
// STRIPE CHECKOUT (NO BACKEND / NO NETLIFY FUNCTIONS)
// ============================================================
async function proceedToCheckout() {
    const cart = getCart();

    if (cart.length === 0) return;

    const btn = document.getElementById('checkout-btn');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Redirecting...';
    }

    try {
        const response = await fetch(
            '/.netlify/functions/create-checkout',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cart),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        window.location.href = data.url;
    } catch (err) {
        console.error(err);

        alert('Checkout failed.');

        if (btn) {
            btn.disabled = false;
            btn.textContent =
                `Checkout — ${AM_CONFIG.currencySymbol}${getOrderTotal().toFixed(2)}`;
        }
    }
}

// ============================================================
// CART PAGE RENDERER
// ============================================================
function renderCartPage() {
    const container = document.getElementById('cart-content');
    if (!container) return;

    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = `
        <div class="empty-cart scroll-reveal">
          <div class="icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything yet.</p>
          <a href="products.html" class="btn btn-primary">Browse Products</a>
        </div>`;
        window.AM && window.AM.initScrollReveal();
        return;
    }

    const subtotal = getCartTotal();
    const shipping = getShipping();
    const total    = getOrderTotal();

    const itemsHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img"
           onerror="this.src='https://via.placeholder.com/90x90/f9a8d4/fff?text=A%26M'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${AM_CONFIG.currencySymbol}${(item.price * item.qty).toFixed(2)}</div>
        <div style="font-size:0.8rem;color:#aaa;margin-top:0.2rem">
          ${AM_CONFIG.currencySymbol}${item.price.toFixed(2)} each
        </div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
      </div>
      <button class="cart-item-remove" data-id="${item.id}" title="Remove">✕</button>
    </div>`).join('');

    container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items-section">
        <h2>Your Cart (${cart.reduce((s,i)=>s+(i.qty||1),0)} items)</h2>
        ${itemsHTML}
        <div style="margin-top:1.5rem">
          <a href="products.html" class="btn btn-outline btn-sm">← Continue Shopping</a>
        </div>
      </div>

      <div class="cart-summary">
        <h3>Order Summary</h3>

        <div class="summary-row">
          <span>Subtotal</span>
          <span>${AM_CONFIG.currencySymbol}${subtotal.toFixed(2)}</span>
        </div>

        <div class="summary-row">
          <span>Shipping</span>
          <span>${shipping === 0 ? '<strong style="color:#10b981">FREE</strong>' : AM_CONFIG.currencySymbol + shipping.toFixed(2)}</span>
        </div>

        ${shipping > 0 ? `<div style="font-size:0.78rem;color:#aaa;margin-bottom:0.5rem">
          Free shipping on orders over ${AM_CONFIG.currencySymbol}30
        </div>` : ''}

        <div class="summary-row total">
          <span>Total</span>
          <span>${AM_CONFIG.currencySymbol}${total.toFixed(2)}</span>
        </div>

        <div class="stripe-info">
          <strong>🔒 Secure Checkout via Stripe</strong><br>
          You’ll be redirected to Stripe to complete your payment.
        </div>

        <button class="btn btn-primary" style="width:100%" id="checkout-btn" onclick="proceedToCheckout()">
          Checkout — ${AM_CONFIG.currencySymbol}${total.toFixed(2)}
        </button>

        <p class="checkout-note">
          Payments are securely handled by <a href="https://stripe.com" target="_blank">Stripe</a>.
        </p>
      </div>
    </div>`;

    // Event listeners
    container.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const current = getCart().find(i => i.id === id);
            if (!current) return;

            if (action === 'inc') updateQty(id, current.qty + 1);
            if (action === 'dec') updateQty(id, current.qty - 1);

            renderCartPage();
        });
    });

    container.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromCart(btn.dataset.id);
            renderCartPage();
        });
    });
}

async function proceedToCheckout() {
    const cart = getCart();
    if (cart.length === 0) return;

    const btn = document.getElementById('checkout-btn');
    if (btn) {
        btn.textContent = 'Redirecting...';
        btn.disabled = true;
    }

    try {
        redirectToStripeCheckout();
    } catch (err) {
        console.error('Checkout error:', err);
        alert('Something went wrong. Please try again.');

        if (btn) {
            btn.textContent = `Checkout — ${AM_CONFIG.currencySymbol}${getOrderTotal().toFixed(2)}`;
            btn.disabled = false;
        }
    }
}

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.addToCart         = addToCart;
window.removeFromCart    = removeFromCart;
window.updateQty         = updateQty;
window.clearCart         = clearCart;
window.getCart           = getCart;
window.getCartTotal      = getCartTotal;
window.getShipping       = getShipping;
window.getOrderTotal     = getOrderTotal;
window.proceedToCheckout = proceedToCheckout;
window.renderCartPage    = renderCartPage;

console.log('✅ cart.js loaded (Netlify removed)');
