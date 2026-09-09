/* ============================================================
   A&M Hair & Beauty — cart.js
   ============================================================ */

function getConfig() {
    return window.AM_CONFIG || { currencySymbol: "£" };
}

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
    return getCurrentUser()?.id || null;
}

function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
}

function getCartKey() {
    const userId = getUserId();
    return userId ? `amCart_${userId}` : "amCart_guest";
}

function getCart() {
    const cart = safeParse(localStorage.getItem(getCartKey()), []);
    return Array.isArray(cart) ? cart : [];
}

function getSupabase() {
    return window.supabaseClient || null;
}

/* =========================
   PROMO SYSTEM
========================= */

const PROMO_CODES = [
    { code: "IBMCHURCH", type: "free_shipping", value: true },
    { code: "AMHALF", type: "oil_half_price", value: 0.5 }
];

const AMHALF_OIL_IDS = [
    "rosemary-hair-oil-60ml",
    "hair-growth-oil-100ml"
];

let activePromo = null;
let activePromoShareKey = null;

function normalisePromoCode(code) {
    return String(code || "").trim().toUpperCase();
}

function findPromo(code) {
    const normalised = normalisePromoCode(code);
    return PROMO_CODES.find(p => p.code === normalised) || null;
}

function makePromoShareKey(code) {
    const cleanCode = normalisePromoCode(code) || "PROMO";
    const bytes = new Uint8Array(6);

    if (window.crypto?.getRandomValues) {
        window.crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }

    const randomPart = Array.from(bytes)
        .map(value => value.toString(16).padStart(2, "0"))
        .join("");

    return `${cleanCode}-${randomPart}`;
}

function clearPromoQueryFromUrl() {
    const url = new URL(window.location.href);
    const hadPromoQuery = url.searchParams.has("promo") || url.searchParams.has("share");

    if (!hadPromoQuery) return;

    url.searchParams.delete("promo");
    url.searchParams.delete("share");
    window.history.replaceState({}, "", url);
}

function isPageReload() {
    try {
        const navEntry = performance.getEntriesByType?.("navigation")?.[0];
        if (navEntry) return navEntry.type === "reload";
        return performance.navigation?.type === 1;
    } catch {
        return false;
    }
}

function loadPromo() {
    activePromo = null;
    activePromoShareKey = null;

    const params = new URLSearchParams(window.location.search);
    const hasPromoQuery = params.has("promo") || params.has("share");

    // Promo query parameters are valid for one page view only.
    // If the customer refreshes the page, remove the query and do not
    // reactivate the offer.
    if (hasPromoQuery && isPageReload()) {
        clearPromoQueryFromUrl();
        return;
    }

    const promo = findPromo(params.get("promo"));
    if (promo) {
        activePromo = promo;
        activePromoShareKey = params.get("share") || null;
    }
}

function applyPromo(code) {
    const promo = findPromo(code);
    activePromo = promo;
    activePromoShareKey = null;

    const url = new URL(window.location.href);
    url.searchParams.delete("promo");
    url.searchParams.delete("share");

    if (promo) {
        // Show the promo in the URL for this page view.
        // A refresh will remove it again in loadPromo().
        url.searchParams.set("promo", promo.code);
    }

    window.history.replaceState({}, "", url);
    renderCartPage();
}

function getPromoShareUrl(code = activePromo?.code) {
    const promo = findPromo(code);
    if (!promo) return null;

    const shareKey = makePromoShareKey(promo.code);
    const url = new URL(window.location.href);
    url.searchParams.delete("promo");
    url.searchParams.delete("share");
    url.searchParams.set("promo", promo.code);
    url.searchParams.set("share", shareKey);
    activePromoShareKey = shareKey;
    return url.toString();
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        window.prompt("Copy this promo link:", text);
        return true;
    }
}

async function copyPromoShareLink(code = activePromo?.code, existingUrl = null) {
    const shareUrl = existingUrl || getPromoShareUrl(code);
    if (!shareUrl) return false;
    return copyText(shareUrl);
}

function getPromoShareMessage() {
    if (!activePromo) return "";

    if (activePromo.code === "AMHALF") {
        return "Get 50% off eligible hair oils at A&M Hair & Beauty with code AMHALF.";
    }

    if (activePromo.code === "IBMCHURCH") {
        return "Get free shipping at A&M Hair & Beauty with code IBMCHURCH.";
    }

    return `Use promo code ${activePromo.code} at A&M Hair & Beauty.`;
}

function openSharePopup(url) {
    window.open(url, "_blank", "noopener,noreferrer,width=720,height=620");
}

async function handlePromoShareAction(action, shareUrl, button) {
    if (!shareUrl || !activePromo) return;

    const message = getPromoShareMessage();
    const title = `A&M Hair & Beauty — ${activePromo.code}`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedMessage = encodeURIComponent(message);

    switch (action) {
        case "facebook":
            openSharePopup(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
            break;

        case "whatsapp":
            openSharePopup(`https://wa.me/?text=${encodeURIComponent(`${message} ${shareUrl}`)}`);
            break;

        case "x":
            openSharePopup(`https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`);
            break;

        case "email":
            window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${message}\n\n${shareUrl}`)}`;
            break;

        case "copy": {
            const copied = await copyPromoShareLink(activePromo.code, shareUrl);
            if (copied && button) {
                const original = button.textContent;
                button.textContent = "✓ Copied";
                setTimeout(() => { button.textContent = original; }, 1800);
            }
            break;
        }

        case "native":
            if (navigator.share) {
                try {
                    await navigator.share({ title, text: message, url: shareUrl });
                } catch (err) {
                    if (err?.name !== "AbortError") console.warn("Share cancelled or failed:", err);
                }
            } else {
                await copyPromoShareLink(activePromo.code, shareUrl);
            }
            break;
    }
}

/* =========================
   CART PRICING
========================= */

function getCartItemTotal(item) {
    const qty = Math.max(1, Number(item.qty) || 1);
    const price = Number(item.price) || 0;

    if (activePromo?.type === "oil_half_price" && AMHALF_OIL_IDS.includes(item.id)) {
        return qty * price * 0.5;
    }

    return qty * price;
}

function getChargedQty(item) {
    const qty = Math.max(1, Number(item.qty) || 1);
    const price = Number(item.price) || 0;
    if (!price) return qty;
    return getCartItemTotal(item) / price;
}

function saveLocalCart(items) {
    localStorage.setItem(getCartKey(), JSON.stringify(items));
}

function saveCart(items) {
    saveLocalCart(items);
    window.dispatchEvent(new CustomEvent("amCartUpdated"));
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
            { user_id: userId, cart, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
        );

    if (error) console.error("Cart save failed:", error);
}

function addToCart(productId, qty = 1) {
    qty = Math.max(1, Number(qty) || 1);
    const product = (window.AM_PRODUCTS || []).find(p => p.id === productId);
    if (!product) return false;

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

function getCartTotal() {
    return getCart().reduce((sum, item) => sum + getCartItemTotal(item), 0);
}

function getShipping() {
    if (activePromo?.type === "free_shipping") return 0;
    return getCartTotal() >= 30 ? 0 : 3.99;
}

function getOrderTotal() {
    return getCartTotal() + getShipping();
}

/* =========================
   RENDER CART
========================= */

function renderCartPage() {
    const container = document.getElementById("cart-content");
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

    const promoMsg = activePromo
        ? `<div style="color:#16a34a;font-size:0.85rem;margin-top:0.5rem;font-weight:600;">
            ${activePromo.type === "free_shipping"
                ? `✓ Free shipping applied (${activePromo.code})`
                : `✓ ${activePromo.code} applied — eligible oils are 50% off`}
           </div>`
        : "";

    container.innerHTML = `
    <div class="cart-layout">
        <div class="cart-items-section">
            <h2>Your Cart</h2>
            ${cart.map(item => `
                <div class="cart-item">
                    <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='/assets/placeholder.webp'" />
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${config.currencySymbol}${getCartItemTotal(item).toFixed(2)}</div>
                    </div>
                    <div class="qty-control">
                        <button class="qty-btn" data-id="${item.id}" data-action="dec">−</button>
                        <span class="qty-num">${item.qty}</span>
                        <button class="qty-btn" data-id="${item.id}" data-action="inc">+</button>
                    </div>
                    <button class="cart-item-remove" data-id="${item.id}" data-action="remove" title="Remove item">✕</button>
                </div>
            `).join("")}
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
                <input id="promo-input" placeholder="Promo code" value="${activePromo?.code || ""}" />
                <button id="apply-promo" type="button">Apply</button>
            </div>

            ${promoMsg}

            ${activePromo ? `
                <button id="share-promo" type="button" aria-expanded="false">↗ Share ${activePromo.code}</button>
                <div id="promo-share-panel" class="promo-share-panel" hidden>
                    <div class="promo-share-title">Share this offer</div>
                    <div class="promo-share-grid">
                        <button type="button" class="promo-share-option facebook" data-share-action="facebook">ⓕ Facebook</button>
                        <button type="button" class="promo-share-option whatsapp" data-share-action="whatsapp">◉ WhatsApp</button>
                        <button type="button" class="promo-share-option x-share" data-share-action="x">𝕏 X</button>
                        <button type="button" class="promo-share-option email-share" data-share-action="email">✉ Email</button>
                        <button type="button" class="promo-share-option copy-share" data-share-action="copy">🔗 Copy link</button>
                        <button type="button" class="promo-share-option native-share" data-share-action="native">↗ More</button>
                    </div>
                </div>
            ` : ""}

            <button class="btn btn-primary checkout-btn" style="width:100%;margin-top:1.2rem;" onclick="proceedToCheckout()">Checkout</button>

            <p class="checkout-note">
                Secure payment via Stripe.<br>
                <a href="/policies/">Terms &amp; refund policy</a>
            </p>
        </div>
    </div>`;

    const applyPromoButton = container.querySelector("#apply-promo");
    if (applyPromoButton) {
        applyPromoButton.onclick = () => {
            const input = container.querySelector("#promo-input");
            applyPromo(input?.value || "");
        };
    }

    const sharePromoButton = container.querySelector("#share-promo");
    const sharePanel = container.querySelector("#promo-share-panel");

    if (sharePromoButton && sharePanel) {
        sharePromoButton.onclick = () => {
            const opening = sharePanel.hidden;
            sharePanel.hidden = !opening;
            sharePromoButton.setAttribute("aria-expanded", String(opening));

            if (opening && !sharePanel.dataset.shareUrl) {
                const shareUrl = getPromoShareUrl();
                if (shareUrl) sharePanel.dataset.shareUrl = shareUrl;
            }
        };

        const nativeShareButton = sharePanel.querySelector('[data-share-action="native"]');
        if (nativeShareButton && !navigator.share) {
            nativeShareButton.style.display = "none";
        }

        sharePanel.querySelectorAll("[data-share-action]").forEach(button => {
            button.onclick = async () => {
                let shareUrl = sharePanel.dataset.shareUrl;
                if (!shareUrl) {
                    shareUrl = getPromoShareUrl();
                    if (shareUrl) sharePanel.dataset.shareUrl = shareUrl;
                }

                await handlePromoShareAction(button.dataset.shareAction, shareUrl, button);
            };
        });
    }

    container.querySelectorAll('[data-action="inc"]').forEach(button => {
        button.onclick = () => {
            const item = getCart().find(i => i.id === button.dataset.id);
            if (item) {
                updateQty(button.dataset.id, item.qty + 1);
                renderCartPage();
            }
        };
    });

    container.querySelectorAll('[data-action="dec"]').forEach(button => {
        button.onclick = () => {
            const item = getCart().find(i => i.id === button.dataset.id);
            if (item) {
                updateQty(button.dataset.id, item.qty - 1);
                renderCartPage();
            }
        };
    });

    container.querySelectorAll('[data-action="remove"]').forEach(button => {
        button.onclick = () => {
            removeFromCart(button.dataset.id);
            renderCartPage();
        };
    });
}

async function proceedToCheckout() {
    const cart = getCart();
    if (!cart.length) return;

    const res = await fetch("/.netlify/functions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            cart,
            promo: activePromo
                ? { ...activePromo, shareKey: activePromoShareKey }
                : null
        })
    });

    const data = await res.json();
    if (!res.ok) {
        alert(data?.error || "Checkout failed");
        return;
    }

    window.location.href = data.url;
}

async function saveAbandonedCart(cart) {
    const supabase = getSupabase();
    const userId = getUserId();
    if (!supabase || !userId) return;

    const { error } = await supabase
        .from("abandoned_carts")
        .upsert(
            { user_id: userId, cart, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
        );

    if (error) console.error("Abandoned cart error:", error);
}

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
        const { data, error } = await supabase
            .from("user_carts")
            .select("cart")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) console.error("Cart loading error:", error);

        if (data?.cart) {
            localStorage.setItem(`amCart_${userId}`, JSON.stringify(data.cart));
        }

        renderCartPage();
    } catch (err) {
        console.error("Cart sync failed:", err);
        renderCartPage();
    }
})();

window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.clearCart = clearCart;
window.getCart = getCart;
window.getCartTotal = getCartTotal;
window.renderCartPage = renderCartPage;
window.proceedToCheckout = proceedToCheckout;
window.applyPromo = applyPromo;
window.getPromoShareUrl = getPromoShareUrl;
window.copyPromoShareLink = copyPromoShareLink;
