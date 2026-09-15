(() => {
  if (customElements.get('am-feedback')) return;

  const RENDER_URL = 'https://a-m-hair-and-beauty.onrender.com';

  class AMFeedback extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === 'true') return;
      this.dataset.ready = 'true';

      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          :host{font-family:Poppins,Arial,sans-serif}
          *{box-sizing:border-box}
          .btn{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:1450;border:0;border-radius:999px;padding:14px 19px;background:#151515;color:#fff;font:700 14px/1 Poppins,Arial,sans-serif;box-shadow:0 16px 44px rgba(0,0,0,.23);cursor:pointer;display:flex;align-items:center;gap:9px;transition:.25s ease}
          .btn:hover{transform:translateY(-3px);background:#d946a6}
          .overlay{position:fixed;inset:0;z-index:2400;background:rgba(10,10,10,.48);backdrop-filter:blur(10px);display:grid;place-items:end;padding:24px;opacity:0;pointer-events:none;transition:opacity .28s ease}
          .overlay.open{opacity:1;pointer-events:auto}
          .card{width:min(470px,100%);background:#fff;color:#151515;border-radius:28px;padding:28px;border:1px solid rgba(21,21,21,.08);box-shadow:0 30px 100px rgba(0,0,0,.24);max-height:min(82vh,720px);overflow:auto;transform:translateY(30px);transition:transform .35s ease}
          .overlay.open .card{transform:none}
          .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:22px}
          .kicker{color:#d946a6;font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}
          h3{font-size:clamp(1.7rem,4vw,2.2rem);line-height:1;letter-spacing:-.04em;margin:0}
          .close{border:0;background:#f5f5f5;width:38px;height:38px;border-radius:50%;font-size:20px;cursor:pointer}
          .field{margin-top:15px}
          label{display:block;font-size:13px;font-weight:700;margin-bottom:7px;color:#333}
          input,textarea{width:100%;border:1px solid #dedede;background:#fafafa;border-radius:15px;padding:13px 14px;font:500 14px/1.5 Poppins,Arial,sans-serif;outline:none}
          input:focus,textarea:focus{border-color:#d946a6;background:#fff;box-shadow:0 0 0 4px rgba(217,70,166,.1)}
          textarea{min-height:135px;resize:vertical}
          .submit{width:100%;margin-top:18px;border:0;border-radius:999px;padding:14px 18px;background:linear-gradient(135deg,#d946a6,#ec4899);color:#fff;font:800 14px Poppins,Arial,sans-serif;cursor:pointer}
          .submit:disabled{opacity:.6;cursor:wait}
          .status{min-height:22px;margin-top:11px;font-size:13px;font-weight:600}
          .success{color:#15803d}.error{color:#b91c1c}
          @media(max-width:720px){.btn{right:14px;padding:13px;width:48px;height:48px;justify-content:center}.label{display:none}.overlay{padding:0;place-items:end center}.card{width:100%;border-radius:26px 26px 0 0;padding:24px 20px calc(22px + env(safe-area-inset-bottom));max-height:88vh}}
          @media(prefers-reduced-motion:reduce){.btn,.overlay,.card{transition:none!important}}
        </style>
        <button class="btn" type="button" aria-haspopup="dialog"><span>💬</span><span class="label">Feedback</span></button>
        <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="title">
          <form class="card">
            <div class="top"><div><div class="kicker">We're listening</div><h3 id="title">Send us feedback</h3></div><button class="close" type="button" aria-label="Close feedback">×</button></div>
            <div class="field"><label>Name</label><input name="name" maxlength="80" autocomplete="name" required></div>
            <div class="field"><label>Email (optional)</label><input name="email" type="email" maxlength="160" autocomplete="email"></div>
            <div class="field"><label>Feedback / enquiry</label><textarea name="inquiry" maxlength="2000" required placeholder="Tell us what you think or how we can help..."></textarea></div>
            <button class="submit" type="submit">Send feedback</button>
            <div class="status" aria-live="polite"></div>
          </form>
        </div>`;

      const button = root.querySelector('.btn');
      const overlay = root.querySelector('.overlay');
      const close = root.querySelector('.close');
      const form = root.querySelector('form');
      const status = root.querySelector('.status');
      const submit = root.querySelector('.submit');
      let lastFocus = null;

      const open = () => { lastFocus = document.activeElement; overlay.classList.add('open'); document.body.style.overflow='hidden'; setTimeout(()=>form.elements.name.focus(),50); };
      const shut = () => { overlay.classList.remove('open'); document.body.style.overflow=''; lastFocus?.focus?.(); };

      button.addEventListener('click', open);
      close.addEventListener('click', shut);
      overlay.addEventListener('click', e => { if (e.target === overlay) shut(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) shut(); });

      form.addEventListener('submit', async e => {
        e.preventDefault();
        const payload = {
          name: form.elements.name.value.trim(),
          email: form.elements.email.value.trim(),
          inquiry: form.elements.inquiry.value.trim(),
          page: location.href,
          viewport: `${innerWidth}x${innerHeight}`,
          userAgent: navigator.userAgent
        };
        if (!payload.name || !payload.inquiry) return;
        submit.disabled = true; submit.textContent = 'Sending…'; status.textContent = '';
        try {
          const response = await fetch(`${RENDER_URL}/feedback`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
          const result = await response.json().catch(()=>({}));
          if (!response.ok) throw new Error(result.error || 'Unable to send feedback.');
          status.className='status success'; status.textContent='Thank you — your feedback was sent.'; form.reset();
          setTimeout(shut,1400);
        } catch (err) {
          status.className='status error'; status.textContent=err.message || 'Something went wrong. Please try again.';
        } finally {
          submit.disabled=false; submit.textContent='Send feedback';
        }
      });
    }
  }

  customElements.define('am-feedback', AMFeedback);
})();