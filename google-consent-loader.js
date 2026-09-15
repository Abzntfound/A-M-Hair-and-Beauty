/* A&M Hair & Beauty — Google Privacy & Messaging helper.
   Keeps Google consent-message resources centralised and avoids duplicate injection. */
(function () {
  'use strict';

  const PUBLISHER_ID = 'ca-pub-6839198574351209';

  // AdSense Privacy & Messaging is delivered through the normal adsbygoogle tag.
  // Only inject it if this page has not already loaded the correct publisher tag.
  const hasAdSense = Array.from(document.scripts).some((script) =>
    (script.src || '').includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js') &&
    (script.src || '').includes(PUBLISHER_ID)
  );

  if (!hasAdSense) {
    const adsense = document.createElement('script');
    adsense.async = true;
    adsense.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
    adsense.crossOrigin = 'anonymous';
    document.head.appendChild(adsense);
  }

  // Make sure the publisher-account marker exists on pages that use the shared nav.
  if (!document.querySelector('meta[name="google-adsense-account"]')) {
    const account = document.createElement('meta');
    account.name = 'google-adsense-account';
    account.content = PUBLISHER_ID;
    document.head.appendChild(account);
  }
})();
