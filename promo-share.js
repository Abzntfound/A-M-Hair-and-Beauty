/* A&M Hair & Beauty — promo sharing UI */
(() => {
  const VALID_CODES = new Set(['AMHALF', 'IBMCHURCH']);
  let observerBusy = false;

  function code() {
    return String(document.getElementById('promo-input')?.value || '').trim().toUpperCase();
  }

  function message(promo) {
    if (promo === 'AMHALF') return 'Get 50% off eligible hair oils at A&M Hair & Beauty with code AMHALF.';
    if (promo === 'IBMCHURCH') return 'Get free shipping at A&M Hair & Beauty with code IBMCHURCH.';
    return `Use promo code ${promo} at A&M Hair & Beauty.`;
  }

  function popup(url) {
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=620');
  }

  async function copy(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy this promo link:', text);
    }
    if (button) {
      const old = button.textContent;
      button.textContent = '✓ Copied';
      setTimeout(() => { button.textContent = old; }, 1800);
    }
  }

  async function share(action, shareUrl, promo, button) {
    const text = message(promo);
    const title = `A&M Hair & Beauty — ${promo}`;
    if (action === 'facebook') popup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
    else if (action === 'whatsapp') popup(`https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`);
    else if (action === 'x') popup(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`);
    else if (action === 'email') location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`;
    else if (action === 'copy') await copy(shareUrl, button);
    else if (action === 'native' && navigator.share) {
      try { await navigator.share({ title, text, url: shareUrl }); } catch {}
    }
  }

  function install() {
    if (observerBusy) return;
    observerBusy = true;
    try {
      const input = document.getElementById('promo-input');
      const apply = document.getElementById('apply-promo');
      if (!input || !apply) return;

      const promo = code();
      const applied = VALID_CODES.has(promo) && typeof window.getPromoShareUrl === 'function';
      document.getElementById('share-promo-wrap')?.remove();
      if (!applied) return;

      const wrap = document.createElement('div');
      wrap.id = 'share-promo-wrap';
      wrap.innerHTML = `
        <button id="share-promo" type="button">↗ Share promo code</button>
        <div id="promo-share-panel" class="promo-share-panel" hidden>
          <div class="promo-share-title">Share ${promo} with someone</div>
          <div class="promo-share-grid">
            <button type="button" class="promo-share-option facebook" data-promo-share="facebook">Facebook</button>
            <button type="button" class="promo-share-option whatsapp" data-promo-share="whatsapp">WhatsApp</button>
            <button type="button" class="promo-share-option x-share" data-promo-share="x">X</button>
            <button type="button" class="promo-share-option email-share" data-promo-share="email">Email</button>
            <button type="button" class="promo-share-option copy-share" data-promo-share="copy">Copy link</button>
            ${navigator.share ? '<button type="button" class="promo-share-option native-share" data-promo-share="native">More…</button>' : ''}
          </div>
        </div>`;

      const promoMessage = apply.parentElement?.nextElementSibling;
      if (promoMessage && promoMessage.parentElement) promoMessage.after(wrap);
      else apply.parentElement?.after(wrap);

      const toggle = wrap.querySelector('#share-promo');
      const panel = wrap.querySelector('#promo-share-panel');
      let shareUrl = null;

      toggle?.addEventListener('click', () => {
        if (!shareUrl) shareUrl = window.getPromoShareUrl(promo);
        panel.hidden = !panel.hidden;
      });

      wrap.querySelectorAll('[data-promo-share]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!shareUrl) shareUrl = window.getPromoShareUrl(promo);
          await share(btn.dataset.promoShare, shareUrl, promo, btn);
        });
      });
    } finally {
      observerBusy = false;
    }
  }

  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('amCartUpdated', () => setTimeout(install, 0));
  const observer = new MutationObserver(() => setTimeout(install, 0));
  const start = () => {
    const root = document.getElementById('cart-content');
    if (root) observer.observe(root, { childList: true, subtree: true });
    install();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
