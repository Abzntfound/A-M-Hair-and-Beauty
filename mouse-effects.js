/* A&M Hair & Beauty — desktop mouse interaction */
(() => {
  /* Header ribbon CSS: kept separate so the curled header treatment is easy to maintain. */
  if (!document.querySelector('link[data-am-header-ribbon]')) {
    const ribbonCss=document.createElement('link');ribbonCss.rel='stylesheet';ribbonCss.href='/header-ribbon.css';ribbonCss.dataset.amHeaderRibbon='true';document.head.appendChild(ribbonCss);
  }

  /* Header ribbon: replace deprecated <marquee> with a DIV and duplicate its contents.
     Two identical groups make the CSS animation loop continuously without a visible jump. */
  const upgradeHeaderRibbon=()=>{
    const shell=document.querySelector('.contact-marquee');
    if(!shell)return;
    let track=shell.querySelector('.marquee-track');
    const legacy=shell.querySelector('marquee');
    if(legacy){
      track=document.createElement('div');
      track.className='marquee-track';
      while(legacy.firstChild)track.appendChild(legacy.firstChild);
      legacy.replaceWith(track);
    }
    if(!track)return;
    shell.classList.add('header-ribbon');
    const original=track.querySelector('.marquee-content');
    if(original&&!track.dataset.loopReady){
      const clone=original.cloneNode(true);
      clone.setAttribute('aria-hidden','true');
      original.append(...Array.from(clone.childNodes));
      track.dataset.loopReady='true';
    }
  };

  /* Link titles: add a useful native tooltip to every link that does not already have one. */
  const addLinkTitles=()=>{
    document.querySelectorAll('a').forEach(link=>{
      if(link.hasAttribute('title'))return;
      const text=(link.getAttribute('aria-label')||link.textContent||'').replace(/\s+/g,' ').trim();
      let title=text;
      if(!title){
        try{const url=new URL(link.href,location.href);title=url.hostname===location.hostname?'Open page':'Visit '+url.hostname;}catch{title='Open link';}
      }
      link.title=title.slice(0,100);
    });
  };

  const preparePage=()=>{upgradeHeaderRibbon();addLinkTitles();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',preparePage,{once:true});else preparePage();

  /* Keep titles applied to navigation/components inserted after initial page load. */
  const pageObserver=new MutationObserver(()=>addLinkTitles());
  pageObserver.observe(document.documentElement,{childList:true,subtree:true});

  /* Mouse tweak: disabled on touch devices and reduced-motion setups. */
  if(window.matchMedia('(pointer: coarse)').matches||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  const cursor=document.createElement('div');
  cursor.className='am-cursor';cursor.setAttribute('aria-hidden','true');
  const cursorText=document.createElement('span');
  cursorText.className='am-cursor-text';
  cursor.appendChild(cursorText);
  const dot=document.createElement('div');
  dot.className='am-cursor-dot';dot.setAttribute('aria-hidden','true');
  document.body.append(cursor,dot);

  let mouseX=innerWidth/2,mouseY=innerHeight/2,cursorX=mouseX,cursorY=mouseY,visible=false;

  /* Fluid cursor: lerp gives the outer ring a smooth trailing movement. */
  const render=()=>{
    cursorX+=(mouseX-cursorX)*.115;
    cursorY+=(mouseY-cursorY)*.115;
    cursor.style.transform=`translate3d(${cursorX}px,${cursorY}px,0) translate(-50%,-50%)`;
    dot.style.transform=`translate3d(${mouseX}px,${mouseY}px,0) translate(-50%,-50%)`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY;if(!visible){visible=true;document.documentElement.classList.add('am-cursor-visible');}},{passive:true});
  document.addEventListener('mouseleave',()=>document.documentElement.classList.remove('am-cursor-visible'));
  document.addEventListener('mouseenter',()=>visible&&document.documentElement.classList.add('am-cursor-visible'));

  /* Mouse labels explain what the hovered control will do. */
  const getCursorLabel=el=>{
    if(!el)return'';
    if(el.matches('input,textarea,select'))return'TYPE';
    if(el.matches('.product-card'))return'VIEW';
    if(el.matches('.review-card,.value-card,.team-card'))return'EXPLORE';
    if(el.matches('button,[role="button"]'))return(el.getAttribute('aria-label')||el.textContent||'SELECT').replace(/\s+/g,' ').trim().slice(0,14).toUpperCase();
    if(el.matches('a')){
      const text=(el.getAttribute('aria-label')||el.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
      return text&&text.length<=14?text:'OPEN';
    }
    return'';
  };
  const interactive='a,button,[role="button"],input,textarea,select,.product-card,.review-card,.value-card,.team-card';
  document.addEventListener('mouseover',e=>{
    const el=e.target.closest(interactive);
    if(!el)return;
    cursor.classList.add('is-active');
    cursorText.textContent=getCursorLabel(el);
  });
  document.addEventListener('mouseout',e=>{
    const from=e.target.closest(interactive);const to=e.relatedTarget?.closest?.(interactive);
    if(from&&from!==to){cursor.classList.remove('is-active');cursorText.textContent='';}
  });

  /* Card movement is intentionally gentle and smoothed by CSS transitions. */
  document.addEventListener('mousemove',e=>{
    const card=e.target.closest('.product-card,.review-card,.value-card,.team-card,.media3-section');if(!card)return;
    const r=card.getBoundingClientRect();const nx=(e.clientX-r.left)/r.width-.5;const ny=(e.clientY-r.top)/r.height-.5;
    card.style.setProperty('--mouse-x',`${50+nx*20}%`);card.style.setProperty('--mouse-y',`${50+ny*20}%`);
    if(!card.classList.contains('media3-section')){card.style.setProperty('--tilt-x',`${-ny*1.6}deg`);card.style.setProperty('--tilt-y',`${nx*1.6}deg`);}
  },{passive:true});
  document.addEventListener('mouseout',e=>{const card=e.target.closest('.product-card,.review-card,.value-card,.team-card');if(card&&!card.contains(e.relatedTarget)){card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y');}});
})();
