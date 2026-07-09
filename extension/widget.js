// UEDA EX — remote-loading bootstrap.
// This file only injects the real widget code from the server, so any future
// change to the widget can be deployed instantly WITHOUT reinstalling the
// extension. Do not add UI/business logic here — edit runtime.js in the
// widget-js edge function instead.
(function bootstrap() {
  try {
    if (window.top !== window.self) return;                 // only top frame
    if (window.__uedaBootstrapped) return;                  // never twice
    window.__uedaBootstrapped = true;

    var RUNTIME_URL = 'https://keqgzvcahsvseowfowwu.supabase.co/functions/v1/widget-js';

    function inject() {
      if (document.querySelector('script[data-ueda-loader]')) return;
      var s = document.createElement('script');
      s.setAttribute('data-ueda-loader', '1');
      s.setAttribute('data-logo-url', chrome.runtime.getURL('logo.png'));
      try { s.setAttribute('data-ext-version', chrome.runtime.getManifest().version); } catch (_) {}
      // Cache-buster: guarantees a fresh runtime on every page load.
      s.src = RUNTIME_URL + '?t=' + Date.now();
      s.async = false;
      (document.head || document.documentElement).appendChild(s);
      console.log('[UEDA] bootstrap: runtime remoto solicitado');
    }

    if (document.head || document.documentElement) inject();
    else document.addEventListener('DOMContentLoaded', inject, { once: true });
  } catch (e) {
    console.error('[UEDA] bootstrap falhou', e);
  }
})();
