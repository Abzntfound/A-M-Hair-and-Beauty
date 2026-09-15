(() => {
  if (customElements.get('am-order-tracking')) return;

  class AMOrderTracking extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === 'true') return;
      this.dataset.ready = 'true';
      const root = this.attachShadow({ mode: 'open' });

      root.innerHTML = `
        <style>
          :host{display:block;font-family:Poppins,Arial,sans-serif;--bg:#fff;--panel:#fff;--text:#171717;--muted:#666;--border:#ececec;--field:#fafafa;--shadow:rgba(0,0,0,.08)}
          :host([data-theme="dark"]){--bg:#101010;--panel:#181818;--text:#f8f8f8;--muted:#b7b7b7;--border:#343434;--field:#232323;--shadow:rgba(0,0,0,.4)}
          *{box-sizing:border-box} section{background:var(--bg);color:var(--text);padding:90px 5%;transition:.2s ease}.wrap{max-width:900px;margin:auto;text-align:center}.eyebrow{font-size:.78rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#d946a6;margin-bottom:10px}h2{font-size:clamp(2rem,5vw,3.2rem);letter-spacing:-.045em;margin:0 0 12px}.intro{color:var(--muted);max-width:650px;margin:0 auto 30px;line-height:1.7}.panel{max-width:700px;margin:auto;background:var(--panel);border:1px solid var(--border);border-radius:26px;padding:26px;box-shadow:0 18px 55px var(--shadow);text-align:left}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}label{display:block;font-size:.84rem;font-weight:700;margin-bottom:7px;color:var(--text)}input{width:100%;border:1px solid var(--border);background:var(--field);color:var(--text);border-radius:13px;padding:13px 14px;font:500 14px Poppins,Arial,sans-serif;outline:none}input:focus{border-color:#d946a6;box-shadow:0 0 0 4px rgba(217,70,166,.1)}button{width:100%;margin-top:16px;border:0;border-radius:999px;padding:14px 18px;background:linear-gradient(135deg,#d946a6,#ec4899);color:#fff;font:800 14px Poppins,Arial,sans-serif;cursor:pointer}button:disabled{opacity:.6;cursor:wait}.result{display:none;margin-top:20px;padding:18px;border:1px solid var(--border);border-radius:16px;background:var(--field);color:var(--text)}.result.show{display:block}.result strong{display:block;margin-bottom:5px}.result p{margin:5px 0;color:var(--muted)}.rm-number{font-weight:800!important;color:var(--text)!important}.track{display:inline-flex;margin-top:12px;padding:11px 16px;border-radius:999px;background:#151515;color:#fff;text-decoration:none;font-weight:700;font-size:13px}.error{color:#dc2626;font-weight:600}@media(max-width:650px){section{padding:65px 18px}.panel{padding:20px}.grid{grid-template-columns:1fr}}
        </style>
        <section id="track-order"><div class="wrap"><div class="eyebrow">Order tracking</div><h2>Track your order</h2><p class="intro">Use the A&amp;M tracking code you received with your order, for example AM-123456789. Once dispatched, we'll show the linked Royal Mail tracking reference.</p><form class="panel"><div class="grid"><div><label for="email">Checkout email</label><input id="email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div><div><label for="code">A&amp;M tracking code</label><input id="code" name="trackingCode" autocomplete="off" required maxlength="12" pattern="AM-[0-9]{9}" placeholder="AM-123456789"></div></div><button type="submit">Track order</button><div class="result" aria-live="polite"></div></form></div></section>`;

      const syncTheme=()=>this.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'); syncTheme(); new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
      const form=root.querySelector('form'),button=root.querySelector('button'),result=root.querySelector('.result'),codeInput=root.querySelector('#code');
      codeInput.addEventListener('input',()=>{let value=codeInput.value.toUpperCase().replace(/[^A-Z0-9-]/g,'');if(value.startsWith('AM')&&!value.startsWith('AM-')&&value.length>2)value=`AM-${value.slice(2).replace(/-/g,'')}`;codeInput.value=value.slice(0,12);});

      form.addEventListener('submit',async event=>{
        event.preventDefault(); button.disabled=true; button.textContent='Checking…'; result.className='result'; result.textContent='';
        try {
          const response=await fetch('/.netlify/functions/track-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value.trim(),trackingCode:form.elements.trackingCode.value.trim()})});
          const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error||'Unable to find this order.');
          result.className='result show';
          const heading=document.createElement('strong'); heading.textContent=`A&M tracking: ${data.trackingCode}`;
          const status=document.createElement('p'); status.textContent=`Status: ${String(data.status||'processing').replace(/_/g,' ')}`;
          result.append(heading,status);
          if(data.dispatched&&data.royalMailUrl){
            const number=document.createElement('p'); number.className='rm-number'; number.textContent=`Royal Mail tracking: ${data.royalMailTracking}`;
            const link=document.createElement('a'); link.className='track'; link.href=data.royalMailUrl; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent='Track parcel with Royal Mail →'; result.append(number,link);
          } else {const waiting=document.createElement('p');waiting.textContent='Royal Mail tracking has not been added to this order yet.';result.append(waiting);}
        } catch(err){result.className='result show error';result.textContent=err.message||'Unable to check your order.';} finally{button.disabled=false;button.textContent='Track order';}
      });
    }
  }
  customElements.define('am-order-tracking',AMOrderTracking);
})();