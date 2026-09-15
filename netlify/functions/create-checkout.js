const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SHIPPING_FEE = 399;
const FREE_SHIPPING_THRESHOLD = 3000;
const ADMIN_EMAIL = 'adube6113@outlook.com';
const ADMIN_TEST_PRODUCT_ID = 'admin-checkout-test';

const PRODUCTS = {
  'hair-growth-oil-100ml': { name: 'Hair Growth Oil', price: 999 },
  'satin-bonnet': { name: 'Satin Bonnet', price: 299 },
  'rosemary-hair-oil-60ml': { name: 'Rosemary Hair Oil', price: 499 },
  'shampoo': { name: 'Nourishing Shampoo', price: 1299 },
  'conditioner': { name: 'Deep Conditioner', price: 999 },
  'pomade': { name: 'Pomade', price: 499 },
  'sisal-soap-bag': { name: 'Sisal Soap Bag', price: 259 },
  'turmeric-soap': { name: 'Turmeric Soap', price: 349 },
  'silk-and-shine': { name: 'Silk and Shine Bundle', price: 1799 },
  'silk-and-shine-set': { name: 'Silk and Shine Bundle', price: 1799 },
  'wash-set': { name: 'Wash Bundle', price: 1599 },
  'blow-dry-set': { name: 'Blowdryer Bundle', price: 2799 },
  'silk-care-trio': { name: 'Silk Care Trio', price: 3299 },
  'root-revival-duo': { name: 'Root Revival Duo', price: 2499 },
  'botanical-growth-duo': { name: 'Botanical Growth Duo', price: 1399 },
  'kids-set': { name: 'Kids Set', price: 2499 },
  'premium-hair-collection': { name: 'Premium Hair Collection', price: 3799 },
  'conditioner-150-ml': { name: 'Nourishing Conditioner 150ml', price: 999 },
  [ADMIN_TEST_PRODUCT_ID]: { name: 'Admin Checkout Test', price: 0, adminOnly: true },
};

const PROMO_CODES = { IBMCHURCH: { type: 'free_shipping' }, AMHALF: { type: 'oil_half_price' } };
const AMHALF_OIL_IDS = ['rosemary-hair-oil-60ml', 'hair-growth-oil-100ml'];
function normalisePromoCode(code){return String(code||'').trim().toUpperCase();}
function getValidPromo(promo){if(!promo||typeof promo!=='object')return null;const code=normalisePromoCode(promo.code),definition=PROMO_CODES[code];return definition?{code,...definition}:null;}
async function getAuthenticatedEmail(event){const auth=String(event.headers?.authorization||event.headers?.Authorization||''),token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';if(!token||!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return null;const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const{data,error}=await supabase.auth.getUser(token);if(error||!data?.user?.email)return null;return data.user.email.trim().toLowerCase();}
function getSafeCart(cart,isAdmin){return cart.map(item=>{const product=PRODUCTS[item?.id];if(!product)throw new Error('Unknown product: '+String(item?.id||'missing-id'));if(product.adminOnly&&!isAdmin)throw new Error('This test product is only available to the admin account.');return{id:item.id,qty:product.adminOnly?1:Math.max(1,Math.floor(Number(item.qty)||1)),product};});}
function buildCheckoutLines(safeCart,amHalfActive){const pricedLines=safeCart.map(item=>{const isAmHalfOil=amHalfActive&&AMHALF_OIL_IDS.includes(item.id),rawAmount=isAmHalfOil?item.product.price*item.qty*.5:item.product.price*item.qty;return{...item,isAmHalfOil,rawAmount,stripeAmount:Math.floor(rawAmount)};});const rawMerchandiseTotal=pricedLines.reduce((s,l)=>s+l.rawAmount,0),targetMerchandiseTotal=Math.round(rawMerchandiseTotal),flooredTotal=pricedLines.reduce((s,l)=>s+l.stripeAmount,0);let penniesToDistribute=targetMerchandiseTotal-flooredTotal;for(const line of pricedLines){if(penniesToDistribute<=0)break;if(line.isAmHalfOil&&!Number.isInteger(line.rawAmount)){line.stripeAmount++;penniesToDistribute--;}}if(penniesToDistribute!==0)throw new Error('Unable to reconcile checkout total');return{pricedLines,rawMerchandiseTotal,targetMerchandiseTotal};}

exports.handler=async(event)=>{try{
 if(event.httpMethod&&event.httpMethod!=='POST')return{statusCode:405,headers:{Allow:'POST','Content-Type':'application/json'},body:JSON.stringify({error:'Method not allowed'})};
 let payload;try{payload=JSON.parse(event.body||'{}');}catch{return{statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Invalid checkout request'})};}
 const{cart,promo}=payload;if(!Array.isArray(cart)||!cart.length)return{statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Cart is empty'})};if(!process.env.STRIPE_SECRET_KEY)throw new Error('Stripe is not configured');
 const containsAdminTest=cart.some(i=>i?.id===ADMIN_TEST_PRODUCT_ID),authenticatedEmail=containsAdminTest?await getAuthenticatedEmail(event):null,isAdmin=authenticatedEmail===ADMIN_EMAIL,safeCart=getSafeCart(cart,isAdmin);if(containsAdminTest&&(safeCart.length!==1||safeCart[0].id!==ADMIN_TEST_PRODUCT_ID))throw new Error('The admin test product must be checked out by itself.');
 const validPromo=getValidPromo(promo),amHalfActive=validPromo?.type==='oil_half_price',built=buildCheckoutLines(safeCart,amHalfActive),{pricedLines,rawMerchandiseTotal,targetMerchandiseTotal}=built;

 // Stripe Checkout cannot create a normal one-time payment session with a £0 line item.
 // For the admin-only test we create a real £0 Checkout Session using a 100% off
 // one-time coupon on a 1p test item. This still fires checkout.session.completed.
 let line_items;
 let discounts;
 if(containsAdminTest){
   const coupon=await stripe.coupons.create({percent_off:100,duration:'once',name:'A&M Admin Test — 100% off'});
   line_items=[{price_data:{currency:'gbp',product_data:{name:'Admin Checkout Test'},unit_amount:1},quantity:1}];
   discounts=[{coupon:coupon.id}];
 }else{
   line_items=pricedLines.map(line=>{const{product,qty,isAmHalfOil,stripeAmount}=line;if(isAmHalfOil)return{price_data:{currency:'gbp',product_data:{name:`${product.name} × ${qty} — AMHALF 50% off`},unit_amount:stripeAmount},quantity:1};return{price_data:{currency:'gbp',product_data:{name:product.name},unit_amount:product.price},quantity:qty};});
   let shipping=SHIPPING_FEE;if(validPromo?.type==='free_shipping'||rawMerchandiseTotal>=FREE_SHIPPING_THRESHOLD)shipping=0;if(shipping>0)line_items.push({price_data:{currency:'gbp',product_data:{name:'Shipping'},unit_amount:shipping},quantity:1});
 }

 const sessionParams={mode:'payment',payment_method_types:['card'],line_items,customer_email:containsAdminTest?ADMIN_EMAIL:undefined,metadata:{promo_code:validPromo?.code||'',share_key:String(promo?.shareKey||'').slice(0,100),merchandise_total_pence:String(targetMerchandiseTotal),admin_test:containsAdminTest?'true':'false'},success_url:'https://amhairandbeauty.com/success?success=true&session_id={CHECKOUT_SESSION_ID}',cancel_url:'https://amhairandbeauty.com/cart/'};
 if(discounts)sessionParams.discounts=discounts;
 const session=await stripe.checkout.sessions.create(sessionParams);
 return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({url:session.url})};
}catch(err){console.error('Checkout error:',err);return{statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:err?.message||'Checkout failed'})};}};
