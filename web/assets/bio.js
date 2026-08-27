(function () {
  'use strict';

  var anchors = document.querySelectorAll('[data-bio-cta]');
  var eventName = 'uli_bio_cta_click';

  function track(anchor) {
    var payload = {
      event: eventName,
      cta: anchor.getAttribute('data-bio-cta'),
      destination: anchor.href,
      path: window.location.pathname,
      timestamp: new Date().toISOString()
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        cta: payload.cta,
        destination: payload.destination
      });
    }

    if (typeof window.ULI_BIO_TRACKING_ENDPOINT === 'string' && navigator.sendBeacon) {
      navigator.sendBeacon(window.ULI_BIO_TRACKING_ENDPOINT, JSON.stringify(payload));
    }
  }

  anchors.forEach(function (anchor) {
    anchor.addEventListener('click', function () {
      track(anchor);
    });
  });
}());
