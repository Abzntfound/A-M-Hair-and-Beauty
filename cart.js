/* ============================================================
   A&M Hair & Beauty — cart.js
   ============================================================ */

function getConfig(){return window.AM_CONFIG||{currencySymbol:'£'};}
function getCurrentUser(){try{return JSON.parse(localStorage.getItem('am_user')||'null');}catch{return null;}}
function getUserId(){return getCurrentUser()?.id||null;}
function safeParse(json,fallback){try{return JSON.parse(json);}catch{return fallback;}}
function getCartKey(){return getUserId()?`amCart_${getUserId()}`:'amCart_guest';}
function getCart(){const cart=safeParse(localStorage.getItem(getCartKey()),[]);return Array.isArray(cart)?cart:[];}
function getSupabase(){return window.supabaseClient||null;}

const PROMO_CODES=[{code:'IBMCHURCH',type:'free_shipping',value:true},{code:'AMHALF',type:'oil_half_price',value:.5}];
const AMHALF_OIL_IDS=['rosemary-hair-oil-60ml','hair-growth-oil-100ml'];
const AMHALF_PRODUCT_QUERY_ALIASES=['eligible_products','elegible_products'];
const DEFAULT_AMHALF_PRODUCT_ID='rosemary-hair-oil-60ml';
const ADMIN_EMAIL='adube6113@outlook.com';
const ADMIN_TEST_PRODUCT_ID='admin-checkout-test';
let activePromo=null,activePromoShareKey=null;
let adminTestAllowed=false;

function normalisePromoCode(code){return String(code||'').trim().toUpperCase();}
function findPromo(code){const n=normalisePromoCode(code);return PROMO_CODES.find(p=>p.code===n)||null;}
function makePromoShareKey(code){const c=normalisePromoCode(code)||'PROMO',b=new Uint8Array(6);if(window.crypto?.getRandomValues)window.crypto.getRandomValues(b);else for(let i=0;i<b.length;i++)b[i]=Math.floor(Math.random()*256);return `${c}-${Array.from(b).map(v=>v.toString(16).padStart(2,'0')).join('')}`;}
function clearPromoQueryFromUrl(){const u=new URL(location.href);if(!u.searchParams.has('promo')&&!u.searchParams.has('share'))return;u.searchParams.delete('promo');u.searchParams.delete('share');history.replaceState({},'',u);}
function isPageReload(){try{const n=performance.getEntriesByType?.('navigation')?.[0];return n?n.type==='reload':performance.navigation?.type===1;}catch{return false;}}
function loadPromo(){activePromo=null;activePromoShareKey=null;const p=new URLSearchParams(location.search),has=p.has('promo')||p.has('share');if(has&&isPageReload()){clearPromoQueryFromUrl();return;}const promo=findPromo(p.get('promo'));if(promo){activePromo=promo;activePromoShareKey=p.get('share')||null;}}
function applyPromo(code){activePromo=findPromo(code);activePromoShareKey=null;const u=new URL(location.href);u.searchParams.delete('promo');u.searchParams.delete('share');if(activePromo)u.searchParams.set('promo',activePromo.code);history.replaceState({},'',u);renderCartPage();}
function getPromoShareUrl(code=activePromo?.code){const p=findPromo(code);if(!p)return null;const key=makePromoShareKey(p.code),u=new URL(location.href);u.searchParams.delete('promo');u.searchParams.delete('share');u.searchParams.set('promo',p.code);u.searchParams.set('share',key);activePromoShareKey=key;return u.toString();}
async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch{window.prompt('Copy this promo link:',text);return true;}}
async function copyPromoShareLink(code=activePromo?.code,url=null){const u=url||getPromoShareUrl(code);return u?copyText(u):false;}
function getPromoShareMessage(){if(!activePromo)return'';if(activePromo.code==='AMHALF')return'Get 50% off eligible hair oils at A&M Hair & Beauty with code AMHALF.';if(activePromo.code==='IBMCHURCH')return'Get free shipping at A&M Hair & Beauty with code IBMCHURCH.';return`Use promo code ${activePromo.code} at A&M Hair & Beauty.`;}
function openSharePopup(url){window.open(url,'_blank','noopener,noreferrer,width=720,height=620');}
async function handlePromoShareAction(action,shareUrl,button){if(!shareUrl||!activePromo)return;const m=getPromoShareMessage(),title=`A&M Hair & Beauty — ${activePromo.code}`,eu=encodeURIComponent(shareUrl),em=encodeURIComponent(m);if(action==='facebook')openSharePopup(`https://www.facebook.com/sharer/sharer.php?u=${eu}`);else if(action==='whatsapp')openSharePopup(`https://wa.me/?text=${encodeURIComponent(`${m} ${shareUrl}`)}`);else if(action==='x')openSharePopup(`https://twitter.com/intent/tweet?text=${em}&url=${eu}`);else if(action==='email')location.href=`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${m}\n\n${shareUrl}`)}`;else if(action==='copy'){await copyPromoShareLink(activePromo.code,shareUrl);if(button){const o=button.textContent;button.textContent='✓ Copied';setTimeout(()=>button.textContent=o,1800);}}else if(action==='native'&&navigator.share){try{await navigator.share({title,text:m,url:shareUrl});}catch{}}}

function getCartItemTotal(item){const q=Math.max(1,Number(item.qty)||1),p=Number(item.price)||0;return activePromo?.type==='oil_half_price'&&AMHALF_OIL_IDS.includes(item.id)?q*p*.5:q*p;}
function saveLocalCart(items){localStorage.setItem(getCartKey(),JSON.stringify(items));}
function saveCart(items){saveLocalCart(items);window.dispatchEvent(new CustomEvent('amCartUpdated'));window.AM?.updateCartBadge?.();if(getUserId()&&getSupabase()){saveCartToServer(items);saveAbandonedCart(items);}}
async function saveCartToServer(cart){const s=getSupabase(),id=getUserId();if(!s||!id)return;const{error}=await s.from('user_carts').upsert({user_id:id,cart,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)console.error('Cart save failed:',error);}
function addToCart(productId,qty=1){qty=Math.max(1,Number(qty)||1);const p=(window.AM_PRODUCTS||[]).find(x=>x.id===productId);if(!p)return false;const c=getCart(),e=c.find(i=>i.id===productId);if(e)e.qty+=qty;else c.push({id:p.id,name:p.name,price:Number(p.price)||0,image:p.image,qty});saveCart(c);return true;}
function removeFromCart(id){saveCart(getCart().filter(i=>i.id!==id));}
function updateQty(id,qty){qty=Number(qty);const c=getCart(),i=c.find(x=>x.id===id);if(!i)return;if(qty<1)return removeFromCart(id);i.qty=qty;saveCart(c);}
function clearCart(){saveCart([]);}
function getCartTotal(){return getCart().reduce((s,i)=>s+getCartItemTotal(i),0);}
function getShipping(){if(activePromo?.type==='free_shipping')return 0;return getCartTotal()>=30?0:3.99;}
function getOrderTotal(){return getCartTotal()+getShipping();}

function applyProductQueryPromo(){
  const params=new URLSearchParams(location.search);
  const raw=String(params.get('product')||'').trim().toLowerCase();
  if(!raw)return;
  let productId=null;
  if(AMHALF_OIL_IDS.includes(raw))productId=raw;
  else if(AMHALF_PRODUCT_QUERY_ALIASES.includes(raw))productId=DEFAULT_AMHALF_PRODUCT_ID;
  if(!productId)return;

  // Product campaign links automatically use AMHALF, but checkout still validates
  // the promo and product prices server-side in create-checkout.js.
  activePromo=findPromo('AMHALF');
  activePromoShareKey=null;

  // Keep refreshes/back-forward navigation from repeatedly increasing quantity.
  const marker=`amProductQuery:${location.pathname}:${raw}`;
  let alreadyProcessed=false;
  try{alreadyProcessed=sessionStorage.getItem(marker)==='1';}catch{}
  if(!alreadyProcessed){
    const cart=getCart();
    if(!cart.some(item=>item.id===productId))addToCart(productId,1);
    try{sessionStorage.setItem(marker,'1');}catch{}
  }

  const u=new URL(location.href);
  u.searchParams.set('promo','AMHALF');
  history.replaceState({},'',u);
}

async function refreshAdminTestAccess(){try{const s=getSupabase()||await window.AM?.ensureSupabaseClient?.();if(!s){adminTestAllowed=false;return;}const{data}=await s.auth.getUser();adminTestAllowed=String(data?.user?.email||'').toLowerCase()===ADMIN_EMAIL;}catch{adminTestAllowed=false;}}
async function startAdminTestCheckout(){try{const s=getSupabase()||await window.AM?.ensureSupabaseClient?.();if(!s)throw new Error('Please sign in to your admin account first.');const{data}=await s.auth.getSession();const token=data?.session?.access_token;if(!token)throw new Error('Please sign in to your admin account first.');const r=await fetch('/.netlify/functions/create-checkout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({cart:[{id:ADMIN_TEST_PRODUCT_ID,qty:1}],promo:null})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Admin test checkout failed');location.href=d.url;}catch(e){alert(e.message||'Admin test checkout failed');}}

function renderCartPage(){const c=document.getElementById('cart-content');if(!c)return;const cart=getCart(),cfg=getConfig();if(!cart.length){c.innerHTML=`<div class="empty-cart"><div class="icon">🛍️</div><h3>Your cart is empty</h3><p>Add items to continue</p><a href="/products/" class="btn btn-primary" style="margin-top:1rem;">Shop Now</a>${adminTestAllowed?`<div style="margin-top:2rem;padding:1rem;border:1px dashed #d946a6;border-radius:14px"><strong>Admin tools</strong><p style="font-size:.85rem">Create a £0 test checkout to test the order webhook and tracking flow.</p><button id="admin-test-checkout" class="btn btn-outline" type="button">🧪 Admin Checkout Test — £0.00</button></div>`:''}</div>`;c.querySelector('#admin-test-checkout')?.addEventListener('click',startAdminTestCheckout);return;}
const subtotal=getCartTotal(),shipping=getShipping(),total=getOrderTotal(),promoMsg=activePromo?`<div style="color:#16a34a;font-size:.85rem;margin-top:.5rem;font-weight:600">${activePromo.type==='free_shipping'?`✓ Free shipping applied (${activePromo.code})`:`✓ ${activePromo.code} applied — eligible oils are 50% off`}</div>`:'';
c.innerHTML=`<div class="cart-layout"><div class="cart-items-section"><h2>Your Cart</h2>${cart.map(i=>`<div class="cart-item"><img class="cart-item-img" src="${i.image}" alt="${i.name}" onerror="this.src='/assets/placeholder.webp'"><div class="cart-item-info"><div class="cart-item-name">${i.name}</div><div class="cart-item-price">${cfg.currencySymbol}${getCartItemTotal(i).toFixed(2)}</div></div><div class="qty-control"><button class="qty-btn" data-id="${i.id}" data-action="dec">−</button><span class="qty-num">${i.qty}</span><button class="qty-btn" data-id="${i.id}" data-action="inc">+</button></div><button class="cart-item-remove" data-id="${i.id}" data-action="remove">✕</button></div>`).join('')}</div><div class="cart-summary"><h3>Order Summary</h3><div class="summary-row"><span>Subtotal</span><span>${cfg.currencySymbol}${subtotal.toFixed(2)}</span></div><div class="summary-row"><span>Shipping</span><span>${shipping===0?'FREE':cfg.currencySymbol+shipping.toFixed(2)}</span></div><div class="summary-row total"><span>Total</span><span>${cfg.currencySymbol}${total.toFixed(2)}</span></div><div class="promo"><input id="promo-input" placeholder="Promo code" value="${activePromo?.code||''}"><button id="apply-promo" type="button">Apply</button></div>${promoMsg}<button class="btn btn-primary checkout-btn" style="width:100%;margin-top:1.2rem" id="normal-checkout">Checkout</button>${adminTestAllowed?`<div style="margin-top:1rem;padding:1rem;border:1px dashed #d946a6;border-radius:14px"><strong>Admin only</strong><p style="font-size:.8rem;margin:.35rem 0 .7rem">Run a separate £0 checkout without changing this cart.</p><button id="admin-test-checkout" class="btn btn-outline" style="width:100%" type="button">🧪 Admin Checkout Test — £0.00</button></div>`:''}<p class="checkout-note">Secure payment via Stripe.<br><a href="/policies/">Terms &amp; refund policy</a></p></div></div>`;
c.querySelector('#normal-checkout').onclick=proceedToCheckout;c.querySelector('#admin-test-checkout')?.addEventListener('click',startAdminTestCheckout);c.querySelector('#apply-promo').onclick=()=>applyPromo(c.querySelector('#promo-input')?.value||'');c.querySelectorAll('[data-action="inc"]').forEach(b=>b.onclick=()=>{const i=getCart().find(x=>x.id===b.dataset.id);if(i){updateQty(b.dataset.id,i.qty+1);renderCartPage();}});c.querySelectorAll('[data-action="dec"]').forEach(b=>b.onclick=()=>{const i=getCart().find(x=>x.id===b.dataset.id);if(i){updateQty(b.dataset.id,i.qty-1);renderCartPage();}});c.querySelectorAll('[data-action="remove"]').forEach(b=>b.onclick=()=>{removeFromCart(b.dataset.id);renderCartPage();});}

async function proceedToCheckout(){const cart=getCart();if(!cart.length)return;const r=await fetch('/.netlify/functions/create-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cart,promo:activePromo?{...activePromo,shareKey:activePromoShareKey}:null})});const d=await r.json();if(!r.ok){alert(d?.error||'Checkout failed');return;}location.href=d.url;}
async function saveAbandonedCart(cart){const s=getSupabase(),id=getUserId();if(!s||!id)return;const{error}=await s.from('abandoned_carts').upsert({user_id:id,cart,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)console.error('Abandoned cart error:',error);}
(async function init(){loadPromo();applyProductQueryPromo();try{if(!getSupabase()&&window.AM?.ensureSupabaseClient)await window.AM.ensureSupabaseClient();await refreshAdminTestAccess();const s=getSupabase(),id=getUserId();if(s&&id){const{data,error}=await s.from('user_carts').select('cart').eq('user_id',id).maybeSingle();if(error)console.error('Cart loading error:',error);if(data?.cart)localStorage.setItem(`amCart_${id}`,JSON.stringify(data.cart));}}catch(e){console.error('Cart sync failed:',e);}renderCartPage();})();
window.addToCart=addToCart;window.removeFromCart=removeFromCart;window.updateQty=updateQty;window.clearCart=clearCart;window.getCart=getCart;window.getCartTotal=getCartTotal;window.renderCartPage=renderCartPage;window.proceedToCheckout=proceedToCheckout;window.applyPromo=applyPromo;window.getPromoShareUrl=getPromoShareUrl;window.copyPromoShareLink=copyPromoShareLink;window.startAdminTestCheckout=startAdminTestCheckout;
