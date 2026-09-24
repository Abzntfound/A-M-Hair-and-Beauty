/* A&M conversion funnel analytics */
(function(){
  const ENDPOINT='/.netlify/functions/track-event';
  function getVisitorId(){let id;try{id=localStorage.getItem('am_visitor_id');if(!id){id=(crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`);localStorage.setItem('am_visitor_id',id);}}catch{id=`session-${Date.now()}`;}return id;}
  async function track(eventName,details={}){try{await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({eventName,visitorId:getVisitorId(),path:location.pathname,productId:details.productId||null,quantity:details.quantity||null,referrer:document.referrer||null})});}catch{}}
  window.AMAnalytics={track};
  document.addEventListener('DOMContentLoaded',()=>{if(location.pathname==='/'||location.pathname==='/index.html')track('homepage_view');});
})();