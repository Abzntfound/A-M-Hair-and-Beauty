/* A&M conversion funnel analytics */
(function(){
 const ENDPOINT='/.netlify/functions/track-event';
 function getVisitorId(){let id;try{id=localStorage.getItem('am_visitor_id');if(!id){id=(crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`);localStorage.setItem('am_visitor_id',id);}}catch{id=`session-${Date.now()}`;}return id;}
 async function track(eventName,details={}){try{await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({eventName,visitorId:getVisitorId(),path:location.pathname,productId:details.productId||null,quantity:details.quantity||null,referrer:document.referrer||null})});}catch{}}
 window.AMAnalytics={track};
 function pageEvents(){const path=location.pathname,params=new URLSearchParams(location.search),productId=params.get('id');if(path==='/'||path==='/index.html')track('homepage_view');if((path==='/products/'||path==='/products.html')&&productId)track('product_view',{productId});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pageEvents,{once:true});else pageEvents();
 document.addEventListener('click',event=>{
   const add=event.target.closest?.('#add-to-cart-btn');
   if(add){const productId=new URLSearchParams(location.search).get('id'),quantity=Number(document.getElementById('qty-display')?.textContent)||1;if(productId)track('add_to_cart',{productId,quantity});}
   const checkout=event.target.closest?.('#normal-checkout');
   if(checkout)track('checkout_started');
 });
})();