/* A&M Hair & Beauty — promo sharing UI */
(() => {
  const VALID_CODES = new Set(['AMHALF', 'IBMCHURCH']);
  let observer = null;

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
    try { await navigator.clipboard.writeText(text); }
    catch { window.prompt('Copy this promo link:', text); }
    if (button) {
      const old = button.textContent;
      button.textContent = '✓ Copied';
      setTimeout(() => { button.textContent = old; }, 1800);
    }
  }

  async function share(action, shareUrl, promo, button) {
    const text = message(promo);
    const title = `A&M Hair & Beauty — ${promo}`;
    const encodedUrl = encodeURIComponent(shareUrl);
    if (action === 'facebook') popup(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
    else if (action === 'whatsapp') popup(`https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`);
    else if (action === 'x') popup(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodedUrl}`);
    else if (action === 'email') location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`;
    else if (action === 'copy') await copy(shareUrl, button);
    else if (action === 'native' && navigator.share) {
      try { await navigator.share({ title, text, url: shareUrl }); } catch {}
    }
  }

  function install() {
    const input = document.getElementById('promo-input');
    const apply = document.getElementById('apply-promo');
    if (!input || !apply) return;

    const promo = code();
    const applied = VALID_CODES.has(promo) && typeof window.getPromoShareUrl === 'function';
    const existing = document.getElementById('share-promo-wrap');

    if (!applied) {
      existing?.remove();
      return;
    }

    // Do not rebuild the controls on every DOM mutation. Rebuilding was
    // immediately closing the dropdown after the user clicked it.
    if (existing?.dataset.promo === promo) return;
    existing?.remove();

    const wrap = document.createElement('div');
    wrap.id = 'share-promo-wrap';
    wrap.dataset.promo = promo;
    wrap.innerHTML = `
      <button id="share-promo" type="button" aria-expanded="false" aria-controls="promo-share-panel">↗ Share promo code</button>
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

    toggle?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!shareUrl) shareUrl = window.getPromoShareUrl(promo);
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', String(willOpen));
    });

    wrap.querySelectorAll('[data-promo-share]').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!shareUrl) shareUrl = window.getPromoShareUrl(promo);
        await share(btn.dataset.promoShare, shareUrl, promo, btn);
      });
    });
  }

  function start() {
    install();
    const root = document.getElementById('cart-content');
    if (!root || observer) return;
    observer = new MutationObserver(() => install());
    observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('amCartUpdated', () => setTimeout(install, 0));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
