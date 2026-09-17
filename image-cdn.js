/* A&M Image CDN
   Converts same-site image URLs to Netlify Image CDN URLs at runtime.
   This keeps existing HTML/product data working while images are optimized at the edge. */
(() => {
  const IMAGE_EXT = /\.(?:png|jpe?g|webp|gif)(?:[?#].*)?$/i;
  const CDN_PREFIX = '/.netlify/images?url=';

  function cdnUrl(raw) {
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith(CDN_PREFIX)) return raw;
    try {
      const url = new URL(raw, location.href);
      if (url.origin !== location.origin || !IMAGE_EXT.test(url.pathname)) return raw;
      // Netlify requires the source URL to be URI encoded.
      return `${CDN_PREFIX}${encodeURIComponent(url.pathname)}&q=82`;
    } catch { return raw; }
  }

  function optimiseImage(img) {
    const src = img.getAttribute('src');
    if (src) img.setAttribute('src', cdnUrl(src));
    const srcset = img.getAttribute('srcset');
    if (srcset) {
      img.setAttribute('srcset', srcset.split(',').map(part => {
        const bits = part.trim().split(/\s+/);
        bits[0] = cdnUrl(bits[0]);
        return bits.join(' ');
      }).join(', '));
    }
    // Native lazy loading helps below-the-fold images without changing page layout.
    if (!img.hasAttribute('loading') && !img.closest('.hero,.page-hero,.site-header')) img.loading = 'lazy';
    img.decoding = 'async';
  }

  function scan(root = document) {
    if (root.matches?.('img')) optimiseImage(root);
    root.querySelectorAll?.('img').forEach(optimiseImage);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan(), { once:true });
  else scan();

  // Product cards and other components are created dynamically, so catch new images too.
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) scan(node);
  }))).observe(document.documentElement, { childList:true, subtree:true });
})();
