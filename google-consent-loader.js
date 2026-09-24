/* A&M Hair & Beauty — Google Privacy & Messaging helper. */
(function(){
'use strict';
const PUBLISHER_ID='ca-pub-6839198574351209';
const ADSENSE_SRC='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
window.googlefc=window.googlefc||{};window.googlefc.callbackQueue=window.googlefc.callbackQueue||[];
let account=document.querySelector('meta[name="google-adsense-account"]');if(!account){account=document.createElement('meta');account.name='google-adsense-account';document.head.appendChild(account);}account.content=PUBLISHER_ID;
// Load A&M's own lightweight conversion-funnel tracker once on every shared page.
if(!document.querySelector('script[src="/analytics.js"]')){const analytics=document.createElement('script');analytics.src='/analytics.js';analytics.defer=true;document.head.appendChild(analytics);}
const existing=Array.from(document.scripts).find(script=>(script.src||'').includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'));if(existing)return;
const adsense=document.createElement('script');adsense.async=true;adsense.src=`${ADSENSE_SRC}?client=${encodeURIComponent(PUBLISHER_ID)}`;adsense.crossOrigin='anonymous';document.head.appendChild(adsense);
})();