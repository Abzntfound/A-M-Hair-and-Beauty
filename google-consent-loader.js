/* A&M Hair & Beauty — Google Privacy & Messaging helper.
   Keeps the AdSense/CMP bootstrap centralised and avoids duplicate injection. */
(function () {
  'use strict';

  const PUBLISHER_ID = 'ca-pub-6839198574351209';
  const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

  // Funding Choices / Google Privacy & Messaging uses the googlefc object.
  // Initialise its callback queue before the AdSense script so the CMP has a
  // stable queue even when this helper is the first Google script on a page.
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];

  // Ensure Google's account marker exists and always points at this site’s
  // AdSense publisher account.
  let account = document.querySelector('meta[name="google-adsense-account"]');
  if (!account) {
    account = document.createElement('meta');
    account.name = 'google-adsense-account';
    document.head.appendChild(account);
  }
  account.content = PUBLISHER_ID;

  // Reuse the official AdSense bootstrap when it is already present. This is
  // important on index.html, which intentionally has the tag directly in HEAD.
  const existing = Array.from(document.scripts).find((script) =>
    (script.src || '').includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')
  );

  if (existing) {
    // Do not load a second copy. If the tag was created without a client query
    // parameter, expose the publisher ID as data-ad-client for consistency.
    if (!(existing.src || '').includes('client=')) {
      existing.setAttribute('data-ad-client', PUBLISHER_ID);
    }
    return;
  }

  const adsense = document.createElement('script');
  adsense.async = true;
  adsense.src = `${ADSENSE_SRC}?client=${encodeURIComponent(PUBLISHER_ID)}`;
  adsense.crossOrigin = 'anonymous';
  adsense.setAttribute('data-ad-client', PUBLISHER_ID);
  adsense.setAttribute('data-am-adsense', 'true');
  document.head.appendChild(adsense);
})();
