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

function getCurrentUser() {
    try {
        const raw = localStorage.getItem("am_user");
        if (!raw) return null;

        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function getUserId() {
    const user = getCurrentUser();
    return user?.id || null;
}


/* =========================
   CART STORAGE
========================= */

function safeParse(json, fallback) {
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
}


function getCartKey() {
    const userId = getUserId();

    // Logged-in users get their own cart
    if (userId) {
        return `amCart_${userId}`;
    }

    // Guest cart
    return "amCart_guest";
}


function getCart() {
    const cart = safeParse(
        localStorage.getItem(getCartKey()),
        []
    );

    return Array.isArray(cart) ? cart : [];
}


function getEligiblePromoUnits(allItems = getCart()) {
    const eligibleIds = [
        "rosemary-hair-oil-60ml",
        "hair-growth-oil-100ml"
    ];

    const units = [];

    allItems
        .filter(item => eligibleIds.includes(item.id))
        .forEach(item => {
            const qty = Math.max(1, Number(item.qty) || 1);
            const price = Number(item.price) || 0;

            for (let i = 0; i < qty; i++) {
                units.push({
                    id: item.id,
                    price
                });
            }
        });

    return units;
}


function getDiscountedPromoUnits(allItems = getCart()) {
    const units = getEligiblePromoUnits(allItems);

    // One half-price item for every pair.
    const discountQty = Math.floor(units.length / 2);

    if (discountQty <= 0) return [];

    // Discount the cheapest eligible items.
    return [...units]
        .sort((a, b) => a.price - b.price)
        .slice(0, discountQty);
}


function getCartItemTotal(item, allItems = getCart()) {
    const qty = Math.max(1, Number(item.qty) || 1);
    const price = Number(item.price) || 0;

    const discountedUnits = getDiscountedPromoUnits(allItems)
        .filter(unit => unit.id === item.id);

    const discountedQty = discountedUnits.length;
    const fullPriceQty = qty - discountedQty;

    return (
        (fullPriceQty * price) +
        (discountedQty * price * 0.5)
    );
}


function getChargedQty(item, allItems = getCart()) {
    // Kept for compatibility with any other code that may use it.
    const qty = Math.max(1, Number(item.qty) || 1);

    const total = getCartItemTotal(item, allItems);
    const price = Number(item.price) || 0;

    if (!price) return qty;

    return total / price;
}




function saveLocalCart(items) {
    localStorage.setItem(
        getCartKey(),
        JSON.stringify(items)
    );
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

    saveLocalCart(items);

    window.dispatchEvent(
        new CustomEvent("amCartUpdated")
    );

    window.AM?.updateCartBadge?.();


    const userId = getUserId();

    if (userId && getSupabase()) {

        saveCartToServer(items);
        saveAbandonedCart(items);

    }
}

async function saveCartToServer(cart) {

    const supabase = getSupabase();
    const userId = getUserId();

    if (!supabase || !userId) return;


    const { error } = await supabase
        .from("user_carts")
        .upsert(
            {
                user_id: userId,
                cart: cart,
                updated_at: new Date().toISOString()
            },
            {
                onConflict:"user_id"
            }
        );


    if(error)
        console.error(
            "Cart save failed:",
            error
        );
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
    const cart = getCart();

    return cart.reduce((sum, item) => {
        return sum + getCartItemTotal(item, cart);
    }, 0);
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
            <a href="/products/" class="btn btn-primary" style="margin-top:1rem;">
                Shop Now
            </a>
        </div>`;
        return;
    }

    const subtotal = getCartTotal();
    const shipping = getShipping();
    const total = getOrderTotal();

    // ==========================================================
    // 3-FOR-2 PROMOTION
    // Rosemary Hair Oil + Hair Growth Oil count together.
    // ==========================================================

    const eligibleIds = [
    "rosemary-hair-oil-60ml",
    "hair-growth-oil-100ml"
];

const eligiblePromoQty = cart
    .filter(item => eligibleIds.includes(item.id))
    .reduce(
        (total, item) =>
            total + Math.max(1, Number(item.qty) || 1),
        0
    );

const halfPriceQty = Math.floor(eligiblePromoQty / 2);

const buyOneGetOneMsg = halfPriceQty > 0
    ? `
        <div style="color:#16a34a;font-size:0.85rem;margin-top:0.5rem;">
            ✓ Buy 1 Get 1 Half Price applied — ${halfPriceQty} eligible item${halfPriceQty > 1 ? 's' : ''} at 50% off
        </div>
      `
    : '';

    const promoMsg = activePromo?.type === "free_shipping"
        ? `
            <div style="color:#16a34a;font-size:0.85rem;margin-top:0.5rem;">
                ✓ Free shipping applied (${activePromo.code})
            </div>
          `
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

                        <div class="cart-item-name">
                            ${item.name}
                        </div>

                        <div class="cart-item-price">
                            ${config.currencySymbol}${getCartItemTotal(item, cart).toFixed(2)}
                        </div>

                    </div>

                    <div class="qty-control">

                        <button
                            class="qty-btn"
                            data-id="${item.id}"
                            data-action="dec"
                        >
                            −
                        </button>

                        <span class="qty-num">
                            ${item.qty}
                        </span>

                        <button
                            class="qty-btn"
                            data-id="${item.id}"
                            data-action="inc"
                        >
                            +
                        </button>

                    </div>

                    <button
                        class="cart-item-remove"
                        data-id="${item.id}"
                        data-action="remove"
                        title="Remove item"
                    >
                        ✕
                    </button>

                </div>

            `).join('')}

        </div>

        <div class="cart-summary">

            <h3>Order Summary</h3>

            <div class="summary-row">
                <span>Subtotal</span>
                <span>
                    ${config.currencySymbol}${subtotal.toFixed(2)}
                </span>
            </div>

            ${buyOneGetOneMsg}    

            <div class="summary-row">

                <span>Shipping</span>

                <span>
                    ${
                        shipping === 0
                            ? "FREE"
                            : config.currencySymbol + shipping.toFixed(2)
                    }
                </span>

            </div>

            <div class="summary-row total">

                <span>Total</span>

                <span>
                    ${config.currencySymbol}${total.toFixed(2)}
                </span>

            </div>

            <div class="promo">

                <input
                    id="promo-input"
                    placeholder="Promo code"
                />

                <button id="apply-promo">
                    Apply
                </button>

            </div>

            ${promoMsg}

            <button
                class="btn btn-primary checkout-btn"
                style="width:100%;margin-top:1.2rem;"
                onclick="proceedToCheckout()"
            >
                Checkout
            </button>

            <p class="checkout-note">
                Secure payment via Stripe.<br>
                <a href="/policies/">
                    Terms &amp; refund policy
                </a>
            </p>

        </div>

    </div>`;

    // ==========================================================
    // EVENTS
    // ==========================================================

    const applyPromoButton =
        container.querySelector('#apply-promo');

    if (applyPromoButton) {
        applyPromoButton.onclick = () => {
            const input =
                container.querySelector('#promo-input');

            applyPromo(input?.value || '');
        };
    }

    container
        .querySelectorAll('[data-action="inc"]')
        .forEach(button => {

            button.onclick = () => {

                const item = getCart()
                    .find(i => i.id === button.dataset.id);

                if (item) {
                    updateQty(
                        button.dataset.id,
                        item.qty + 1
                    );

                    renderCartPage();
                }
            };
        });

    container
        .querySelectorAll('[data-action="dec"]')
        .forEach(button => {

            button.onclick = () => {

                const item = getCart()
                    .find(i => i.id === button.dataset.id);

                if (item) {
                    updateQty(
                        button.dataset.id,
                        item.qty - 1
                    );

                    renderCartPage();
                }
            };
        });

    container
        .querySelectorAll('[data-action="remove"]')
        .forEach(button => {

            button.onclick = () => {

                removeFromCart(button.dataset.id);

                renderCartPage();
            };
        });
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

async function saveAbandonedCart(cart){

    const supabase = getSupabase();
    const userId = getUserId();


    if(!supabase || !userId)
        return;



    const {error}=await supabase
        .from("abandoned_carts")
        .upsert(
        {
            user_id:userId,
            cart:cart,
            updated_at:new Date().toISOString()
        },
        {
            onConflict:"user_id"
        });



    if(error)
        console.error(
            "Abandoned cart error:",
            error
        );
}

/* =========================
   INIT
========================= */

(async function init() {

    loadPromo();


    const supabase = getSupabase();

    if (!supabase) {
        renderCartPage();
        return;
    }


    const userId = getUserId();

    if (!userId) {
        renderCartPage();
        return;
    }


    try {

        const { data, error } =
            await supabase
            .from("user_carts")
            .select("cart")
            .eq("user_id", userId)
            .maybeSingle();



        if (error) {

            console.error(
                "Cart loading error:",
                error
            );

        }


        if (data?.cart) {

            localStorage.setItem(
                `amCart_${userId}`,
                JSON.stringify(data.cart)
            );

        }


        renderCartPage();


    } catch(err) {

        console.error(
            "Cart sync failed:",
            err
        );

        renderCartPage();

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
