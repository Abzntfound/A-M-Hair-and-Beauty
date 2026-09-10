/* ==========================================================
   A&M Hair & Beauty — nav.js
   Shared navigation, auth-aware UI, global theme loader
   ============================================================ */

const BASE = "https://amhairandbeauty.com";
const USER_CACHE_KEY = "am_user";
const SUPABASE_URL = "https://bipejrjipvoqvkwuzftz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcGVqcmppcHZvcXZrd3V6ZnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzYzMjMsImV4cCI6MjA5NzIxMjMyM30.Z8V7chc-UOK2UU5dxBydgLbT0u1DUv2_DGtisLmZWq4";
const AM_COOKIE_DOMAIN = ".amhairandbeauty.com";

function loadPremiumTheme(){
  if(document.querySelector('link[data-am-premium-theme]')) return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='/manifest-theme.css';
  link.setAttribute('data-am-premium-theme','true');
  document.head.appendChild(link);
}
loadPremiumTheme();

function loadHomepageFeedback(){
  const isHome=location.pathname==='/' || location.pathname==='/index.html';
  if(!isHome || document.querySelector('script[data-am-feedback-widget]')) return;
  const script=document.createElement('script');
  script.src='/feedback-widget.js';
  script.defer=true;
  script.setAttribute('data-am-feedback-widget','true');
  document.body.appendChild(script);
}

function am_setCookie(name,value,days){
  const maxAge=days?`; max-age=${days*24*60*60}`:'';
  document.cookie=`${name}=${encodeURIComponent(value)}; path=/; domain=${AM_COOKIE_DOMAIN}${maxAge}; secure; samesite=lax`;
}
function am_getCookieRaw(name){
  const eq=name+'=';
  for(let c of document.cookie.split(';')){
    c=c.trim();
    if(c.indexOf(eq)===0) return decodeURIComponent(c.substring(eq.length));
  }
  return null;
}
function am_removeCookie(name){
  document.cookie=`${name}=; path=/; domain=${AM_COOKIE_DOMAIN}; max-age=0; secure; samesite=lax`;
}
const am_cookieStorage={
  getItem:key=>am_getCookieRaw(key),
  setItem:(key,value)=>am_setCookie(key,value,7),
  removeItem:key=>am_removeCookie(key)
};
const AM_SUPABASE_CLIENT_OPTIONS={
  auth:{
    storage:am_cookieStorage,
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true
  }
};

function ensureSupabaseClient(){
  if(window.supabaseClient) return Promise.resolve(window.supabaseClient);
  if(window.supabase && typeof window.supabase.createClient==='function'){
    window.supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,AM_SUPABASE_CLIENT_OPTIONS);
    return Promise.resolve(window.supabaseClient);
  }
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-am-supabase-sdk]');
    const onReady=()=>{
      try{
        window.supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,AM_SUPABASE_CLIENT_OPTIONS);
        resolve(window.supabaseClient);
      }catch(err){reject(err);}
    };
    if(existing){
      existing.addEventListener('load',onReady,{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
    script.setAttribute('data-am-supabase-sdk','true');
    script.addEventListener('load',onReady,{once:true});
    script.addEventListener('error',()=>reject(new Error('Supabase SDK failed to load')),{once:true});
    document.head.appendChild(script);
  });
}

function getCookie(name){return am_getCookieRaw(name);}
function getUserData(){
  const raw=localStorage.getItem(USER_CACHE_KEY)||getCookie(USER_CACHE_KEY);
  if(!raw) return null;
  try{return JSON.parse(raw);}catch{return null;}
}
function setUserData(user){
  if(user) localStorage.setItem(USER_CACHE_KEY,JSON.stringify(user));
  else localStorage.removeItem(USER_CACHE_KEY);
}
function displayNameFor(user){
  if(!user) return 'Sign In';
  const name=user.profile?.name;
  return name?name.split(' ')[0]:(user.email?user.email.split('@')[0]:'Account');
}

function applyTheme(theme){
  if(theme==='dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
}
function loadTheme(){
  let theme=null;
  const u=getUserData();
  if(u){
    const dark=u.darkMode??u.profile?.darkMode;
    if(dark!==undefined) theme=dark?'dark':'light';
  }
  if(!theme) theme=localStorage.getItem('amTheme')||getCookie('amTheme')||'light';
  applyTheme(theme);
}
loadTheme();

async function fetchLiveUser(){
  let client;
  try{client=await ensureSupabaseClient();}
  catch(err){console.warn('nav.js: Supabase unavailable, using cached user',err);return getUserData();}
  try{
    const {data:sessionData}=await client.auth.getSession();
    if(!sessionData?.session){setUserData(null);return null;}
    const {data,error}=await client.auth.getUser();
    if(error){console.warn('nav.js: getUser failed',error);return getUserData();}
    if(!data?.user){setUserData(null);return null;}
    const {data:profile,error:profileError}=await client.from('profiles').select('*').eq('id',data.user.id).single();
    if(profileError) console.warn('nav.js: profile fetch failed',profileError);
    const user={...data.user,profile:profile||null};
    setUserData(user);
    return user;
  }catch(err){
    console.warn('nav.js: live user check failed',err);
    return getUserData();
  }
}

function getCartKey(){
  try{
    const user=JSON.parse(localStorage.getItem(USER_CACHE_KEY));
    if(user?.id) return `amCart_${user.id}`;
  }catch{}
  return 'amCart_guest';
}
function getCartCount(){
  try{
    const items=JSON.parse(localStorage.getItem(getCartKey())||'[]');
    return items.reduce((total,item)=>total+Number(item.qty||0),0);
  }catch{return 0;}
}
function updateCartBadge(){
  const el=document.getElementById('header-cart-count');
  if(!el) return;
  const count=getCartCount();
  el.textContent=count>0?count:'';
  if(count>0){el.classList.add('bump');setTimeout(()=>el.classList.remove('bump'),300);}
}

function renderHeader(activePage){
  renderHeaderWith(activePage,getUserData());
  fetchLiveUser().then(liveUser=>{
    updateUserDisplay(liveUser);
    updateCartBadge();
  });
}
function renderHeaderWith(activePage,user){
  const cartCount=getCartCount();
  const displayName=displayNameFor(user);
  const currentPath=window.location.pathname.replace(/\/$/,'');
  const navLinks=(window.AM_NAV||[]).map(l=>{
    const resolvedUrl=new URL(l.href,BASE);
    const linkPath=resolvedUrl.pathname.replace(/\/$/,'');
    const isActive=activePage?activePage===l.label:currentPath===linkPath;
    return `<a href="${resolvedUrl.href}" class="${isActive?'active':''}">${l.label}</a>`;
  }).join('');

  const html=`
    <header class="site-header" id="site-header">
      <a href="/" class="logo">
        <img src="/A&M.png" alt="A&M" onerror="this.style.display='none'">
        <span>A&amp;M Hair &amp; Beauty</span>
      </a>
      <nav>${navLinks}</nav>
      <div class="header-right">
        <a href="/cart/" class="cart-icon-btn" title="Cart">🛒<span class="cart-count" id="header-cart-count">${cartCount||''}</span></a>
        <a href="${window.AM_CONFIG?.authUrl||'https://auth.amhairandbeauty.com'}" class="user-link" id="user-link">👤 <span id="user-display-name">${displayName}</span></a>
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu"><span></span><span></span><span></span></button>
      </div>
    </header>
    <div class="mobile-overlay" id="mobile-overlay"></div>
    <div class="mobile-menu" id="mobile-menu">
      <nav>
        ${navLinks}
        <a href="/cart/">Cart (${cartCount})</a>
        <a href="${window.AM_CONFIG?.authUrl||'https://auth.amhairandbeauty.com'}" id="mobile-user-link">${displayName}</a>
      </nav>
    </div>`;

  const placeholder=document.getElementById('header-placeholder');
  if(placeholder) placeholder.outerHTML=html;
  else document.body.insertAdjacentHTML('afterbegin',html);
  initHeader();
}
function updateUserDisplay(user){
  const displayName=displayNameFor(user);
  const nameEl=document.getElementById('user-display-name');
  if(nameEl) nameEl.textContent=displayName;
  const mobileLink=document.getElementById('mobile-user-link');
  if(mobileLink) mobileLink.textContent=displayName;
}
function initHeader(){
  const header=document.getElementById('site-header');
  const menuBtn=document.getElementById('mobile-menu-btn');
  const menu=document.getElementById('mobile-menu');
  const overlay=document.getElementById('mobile-overlay');
  const syncHeader=()=>header?.classList.toggle('scrolled',window.scrollY>80);
  syncHeader();
  window.addEventListener('scroll',syncHeader,{passive:true});
  menuBtn?.addEventListener('click',()=>{menu?.classList.toggle('open');overlay?.classList.toggle('open');});
  overlay?.addEventListener('click',()=>{menu?.classList.remove('open');overlay?.classList.remove('open');});
  document.querySelectorAll('.mobile-menu nav a').forEach(a=>a.addEventListener('click',()=>{menu?.classList.remove('open');overlay?.classList.remove('open');}));
}

function renderFooter(){
  const f=window.AM_FOOTER||{columns:[],tagline:''};
  const cols=(f.columns||[]).map(col=>`<div class="footer-col"><h4>${col.heading}</h4>${(col.links||[]).map(l=>`<a href="${l.href}">${l.label}</a>`).join('')}</div>`).join('');
  const html=`<footer class="footer"><div class="footer-grid"><div class="footer-brand"><a href="/" class="logo"><img src="/A&M.png" alt="A&M" onerror="this.style.display='none'"><span>A&amp;M Hair &amp; Beauty</span></a><p>${f.tagline||''}</p></div>${cols}</div><div class="footer-bottom"><span>© ${new Date().getFullYear()} A&amp;M Hair &amp; Beauty</span><span>Made with ❤️</span></div></footer>`;
  const placeholder=document.getElementById('footer-placeholder');
  if(placeholder) placeholder.outerHTML=html;
  else document.body.insertAdjacentHTML('beforeend',html);
}

function initScrollReveal(){
  const targets=document.querySelectorAll('.scroll-reveal,.scroll-reveal-left,.scroll-reveal-right,.scale-in');
  if(!targets.length) return;
  if(!('IntersectionObserver' in window)){
    targets.forEach(el=>el.classList.add('revealed'));
    return;
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target);}
    });
  },{threshold:.12,rootMargin:'0px 0px -4%'});
  targets.forEach(el=>observer.observe(el));
}

window.AM={
  renderHeader,
  renderFooter,
  initScrollReveal,
  getCartCount,
  updateCartBadge,
  getUserData,
  fetchLiveUser,
  getCookie,
  applyTheme,
  ensureSupabaseClient
};

document.addEventListener('DOMContentLoaded',()=>{
  initScrollReveal();
  loadHomepageFeedback();
});