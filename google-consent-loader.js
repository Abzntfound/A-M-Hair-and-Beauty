/* A&M Hair & Beauty — Google Privacy & Messaging helper.
   Keeps the AdSense/CMP bootstrap centralised and avoids duplicate injection. */
(function () {
  'use strict';

  const PUBLISHER_ID = 'ca-pub-6839198574351209';
  const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

  // Funding Choices / Google Privacy & Messaging uses the googlefc object.
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];

  // Ensure Google's account marker exists and always points at this site's
  // AdSense publisher account.
  let account = document.querySelector('meta[name="google-adsense-account"]');
  if (!account) {
    account = document.createElement('meta');
    account.name = 'google-adsense-account';
    document.head.appendChild(account);
  }
  account.content = PUBLISHER_ID;

  // Reuse the official AdSense bootstrap when it is already present.
  // Do not add custom data-* attributes to Google's HEAD script: AdSense
  // validates this tag and reports unsupported attributes in the console.
  const existing = Array.from(document.scripts).find((script) =>
    (script.src || '').includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')
  );
  if (existing) return;

  // Keep the bootstrap identical to Google's supported HEAD tag shape.
  const adsense = document.createElement('script');
  adsense.async = true;
  adsense.src = `${ADSENSE_SRC}?client=${encodeURIComponent(PUBLISHER_ID)}`;
  adsense.crossOrigin = 'anonymous';
  document.head.appendChild(adsense);
})();
