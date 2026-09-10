(() => {
  if (window.__amFeedbackLoaded) return;
  window.__amFeedbackLoaded = true;

  const isHome = location.pathname === '/' || location.pathname === '/index.html';
  if (!isHome) return;

  const css = `
    .am-feedback-btn{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:1450;border:0;border-radius:999px;padding:14px 19px;background:#151515;color:#fff;font:700 14px/1 Poppins,sans-serif;box-shadow:0 16px 44px rgba(0,0,0,.23);cursor:pointer;display:flex;align-items:center;gap:9px;transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s ease,background .25s ease}
    .am-feedback-btn:hover{transform:translateY(-4px) scale(1.02);background:#d946a6;box-shadow:0 22px 55px rgba(217,70,166,.28)}
    .am-feedback-btn .am-feedback-icon{font-size:17px}
    .am-feedback-overlay{position:fixed;inset:0;z-index:2400;background:rgba(10,10,10,.48);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:grid;place-items:end;padding:24px;opacity:0;pointer-events:none;transition:opacity .28s ease}
    .am-feedback-overlay.open{opacity:1;pointer-events:auto}
    .am-feedback-card{width:min(470px,100%);background:#fff;border-radius:28px;padding:28px;border:1px solid rgba(21,21,21,.08);box-shadow:0 30px 100px rgba(0,0,0,.24);transform:translateY(38px) scale(.97);transition:transform .45s cubic-bezier(.16,1,.3,1);max-height:min(82vh,720px);overflow:auto}
    .am-feedback-overlay.open .am-feedback-card{transform:none}
    .am-feedback-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:22px}
    .am-feedback-kicker{color:#d946a6;font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}
    .am-feedback-card h3{font-size:clamp(1.7rem,4vw,2.2rem);line-height:1;letter-spacing:-.04em;margin:0}
    .am-feedback-close{border:0;background:#f5f5f5;width:38px;height:38px;border-radius:50%;font-size:20px;cursor:pointer}
    .am-feedback-field{margin-top:15px}
    .am-feedback-field label{display:block;font-size:13px;font-weight:700;margin-bottom:7px;color:#333}
    .am-feedback-field input,.am-feedback-field textarea{width:100%;border:1px solid #dedede;background:#fafafa;border-radius:15px;padding:13px 14px;font:500 14px/1.5 Poppins,sans-serif;outline:none;transition:border-color .2s,box-shadow .2s,background .2s}
    .am-feedback-field textarea{min-height:135px;resize:vertical}
    .am-feedback-field input:focus,.am-feedback-field textarea:focus{border-color:#d946a6;background:#fff;box-shadow:0 0 0 4px rgba(217,70,166,.1)}
    .am-feedback-submit{width:100%;margin-top:18px;border:0;border-radius:999px;padding:14px 18px;background:linear-gradient(135deg,#d946a6,#ec4899);color:#fff;font:800 14px Poppins,sans-serif;cursor:pointer;box-shadow:0 12px 28px rgba(217,70,166,.25)}
    .am-feedback-submit:disabled{opacity:.6;cursor:wait}
    .am-feedback-status{min-height:22px;margin-top:11px;font-size:13px;font-weight:600}
    .am-feedback-status.success{color:#15803d}.am-feedback-status.error{color:#b91c1c}
    @media(max-width:720px){.am-feedback-btn{right:14px;bottom:max(14px,env(safe-area-inset-bottom));padding:13px;width:48px;height:48px;justify-content:center}.am-feedback-btn .am-feedback-label{display:none}.am-feedback-overlay{padding:0;place-items:end center}.am-feedback-card{width:100%;border-radius:26px 26px 0 0;padding:24px 20px calc(22px + env(safe-area-inset-bottom));max-height:88vh}}
    @media(max-width:380px){.am-feedback-btn{width:44px;height:44px}.am-feedback-card{padding-left:16px;padding-right:16px}}
    @media(orientation:landscape) and (max-height:520px){.am-feedback-overlay{place-items:center;padding:12px}.am-feedback-card{max-height:94vh;border-radius:22px}.am-feedback-btn{bottom:12px;right:12px}}
    @media(prefers-reduced-motion:reduce){.am-feedback-btn,.am-feedback-overlay,.am-feedback-card{transition:none!important}}
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML('beforeend', `
    <button class="am-feedback-btn" id="am-feedback-btn" type="button" aria-haspopup="dialog" aria-controls="am-feedback-dialog">
      <span class="am-feedback-icon">💬</span><span class="am-feedback-label">Feedback</span>
    </button>
    <div class="am-feedback-overlay" id="am-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="am-feedback-title">
      <form class="am-feedback-card" id="am-feedback-form">
        <div class="am-feedback-top">
          <div><div class="am-feedback-kicker">We’re listening</div><h3 id="am-feedback-title">Send us feedback</h3></div>
          <button class="am-feedback-close" type="button" aria-label="Close feedback">×</button>
        </div>
        <div class="am-feedback-field"><label for="am-feedback-name">Your name</label><input id="am-feedback-name" name="name" maxlength="80" autocomplete="name" required></div>
        <div class="am-feedback-field"><label for="am-feedback-email">Email (optional)</label><input id="am-feedback-email" name="email" type="email" maxlength="160" autocomplete="email"></div>
        <div class="am-feedback-field"><label for="am-feedback-message">Feedback / enquiry</label><textarea id="am-feedback-message" name="inquiry" maxlength="2000" required placeholder="Tell us what you think or how we can help..."></textarea></div>
        <button class="am-feedback-submit" type="submit">Send feedback</button>
        <div class="am-feedback-status" id="am-feedback-status" aria-live="polite"></div>
      </form>
    </div>
  `);

  const button = document.getElementById('am-feedback-btn');
  const overlay = document.getElementById('am-feedback-dialog');
  const form = document.getElementById('am-feedback-form');
  const close = overlay.querySelector('.am-feedback-close');
  const status = document.getElementById('am-feedback-status');
  let lastFocus = null;

  const open = () => { lastFocus = document.activeElement; overlay.classList.add('open'); document.body.style.overflow='hidden'; setTimeout(()=>document.getElementById('am-feedback-name')?.focus(),50); };
  const shut = () => { overlay.classList.remove('open'); document.body.style.overflow=''; lastFocus?.focus?.(); };
  button.addEventListener('click', open);
  close.addEventListener('click', shut);
  overlay.addEventListener('click', e => { if (e.target === overlay) shut(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) shut(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = form.querySelector('.am-feedback-submit');
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      inquiry: form.inquiry.value.trim(),
      page: location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent
    };
    if (!payload.name || !payload.inquiry) return;

    submit.disabled = true;
    submit.textContent = 'Sending…';
    status.textContent = '';
    status.className = 'am-feedback-status';
    try {
      const response = await fetch('/.netlify/functions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not send feedback');
      status.textContent = 'Thank you — your feedback has been sent.';
      status.classList.add('success');
      form.reset();
      setTimeout(shut, 1600);
    } catch (err) {
      status.textContent = err.message || 'Something went wrong. Please try again.';
      status.classList.add('error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send feedback';
    }
  });
})();