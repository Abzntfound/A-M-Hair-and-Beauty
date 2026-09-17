/* A&M Hair & Beauty — desktop mouse interaction */
(() => {
  /* Header ribbon CSS: kept separate so the curled header treatment is easy to maintain. */
  if (!document.querySelector('link[data-am-header-ribbon]')) {
    const ribbonCss=document.createElement('link');ribbonCss.rel='stylesheet';ribbonCss.href='/header-ribbon.css';ribbonCss.dataset.amHeaderRibbon='true';document.head.appendChild(ribbonCss);
  }

  /* Header ribbon tweak: replace the old <marquee> with a normal div.
     All ribbon movement/shape is controlled by header-ribbon.css. */
  const upgradeHeaderRibbon = () => {
    const shell = document.querySelector('.contact-marquee');
    const legacy = shell?.querySelector('marquee');
    if (!shell || !legacy) return;
    const track = document.createElement('div');
    track.className = 'marquee-track';
    while (legacy.firstChild) track.appendChild(legacy.firstChild);
    legacy.replaceWith(track);
    shell.classList.add('header-ribbon');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', upgradeHeaderRibbon, {once:true});
  else upgradeHeaderRibbon();

  /* Mouse tweak: disabled on touch devices and reduced-motion setups. */
  if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'am-cursor'; cursor.setAttribute('aria-hidden','true');
  const dot = document.createElement('div');
  dot.className = 'am-cursor-dot'; dot.setAttribute('aria-hidden','true');
  document.body.append(cursor,dot);

  let mouseX=innerWidth/2,mouseY=innerHeight/2,cursorX=mouseX,cursorY=mouseY,visible=false;

  /* Mouse tweak: soft trailing ring behind the precise pointer dot. */
  const render=()=>{cursorX+=(mouseX-cursorX)*.16;cursorY+=(mouseY-cursorY)*.16;cursor.style.transform=`translate3d(${cursorX}px,${cursorY}px,0) translate(-50%,-50%)`;dot.style.transform=`translate3d(${mouseX}px,${mouseY}px,0) translate(-50%,-50%)`;requestAnimationFrame(render);};
  requestAnimationFrame(render);

  addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY;if(!visible){visible=true;document.documentElement.classList.add('am-cursor-visible');}},{passive:true});
  document.addEventListener('mouseleave',()=>document.documentElement.classList.remove('am-cursor-visible'));
  document.addEventListener('mouseenter',()=>visible&&document.documentElement.classList.add('am-cursor-visible'));

  const interactive='a,button,[role="button"],input,textarea,select,.product-card,.review-card,.value-card,.team-card';
  document.addEventListener('mouseover',e=>{if(e.target.closest(interactive))cursor.classList.add('is-active');});
  document.addEventListener('mouseout',e=>{const from=e.target.closest(interactive);const to=e.relatedTarget?.closest?.(interactive);if(from&&from!==to)cursor.classList.remove('is-active');});

  /* Mouse tweak: subtle tilt/highlight gives cards depth without hurting usability. */
  document.addEventListener('mousemove',e=>{const card=e.target.closest('.product-card,.review-card,.value-card,.team-card,.media3-section');if(!card)return;const r=card.getBoundingClientRect();const nx=(e.clientX-r.left)/r.width-.5;const ny=(e.clientY-r.top)/r.height-.5;card.style.setProperty('--mouse-x',`${50+nx*20}%`);card.style.setProperty('--mouse-y',`${50+ny*20}%`);if(!card.classList.contains('media3-section')){card.style.setProperty('--tilt-x',`${-ny*2.2}deg`);card.style.setProperty('--tilt-y',`${nx*2.2}deg`);}},{passive:true});
  document.addEventListener('mouseout',e=>{const card=e.target.closest('.product-card,.review-card,.value-card,.team-card');if(card&&!card.contains(e.relatedTarget)){card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y');}});
})();
