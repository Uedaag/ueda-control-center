// UEDA EX — bootstrap MV3-safe com ponte chrome.* via postMessage.
// Content script injeta o runtime remoto (page world) e faz o proxy das
// chamadas chrome.storage/chrome.runtime que o runtime precisa.
// Toda mudança futura vai em runtime.js — nenhuma reinstalação.
(function bootstrap() {
  try {
    if (window.top !== window.self) return;
    if (window.__uedaBootstrapped) return;
    window.__uedaBootstrapped = true;

    var RUNTIME_URL = 'https://keqgzvcahsvseowfowwu.supabase.co/functions/v1/widget-js';

    // ---- Info da extensão exposta ao page world via dataset ----
    var LOGO_URL = '';
    var EXT_VERSION = '0.0.0';
    try { LOGO_URL = chrome.runtime.getURL('logo.png'); } catch (_) {}
    try { EXT_VERSION = chrome.runtime.getManifest().version; } catch (_) {}
    var root = document.documentElement;
    root.setAttribute('data-ueda-logo-url', LOGO_URL);
    root.setAttribute('data-ueda-ext-version', EXT_VERSION);

    // ---- Ponte: content script executa chrome.* em nome do page world ----
    window.addEventListener('message', function (e) {
      if (e.source !== window) return;
      var msg = e.data;
      if (!msg || msg.__uedaBridge !== 'req' || !msg.id) return;
      function reply(result) {
        window.postMessage({ __uedaBridge: 'res', id: msg.id, result: result }, '*');
      }
      try {
        if (msg.type === 'storage.get') {
          chrome.storage.local.get(msg.keys || null, function (r) { reply(r || {}); });
        } else if (msg.type === 'storage.set') {
          chrome.storage.local.set(msg.data || {}, function () { reply(true); });
        } else if (msg.type === 'storage.remove') {
          chrome.storage.local.remove(msg.keys || [], function () { reply(true); });
        } else if (msg.type === 'download' && chrome.downloads && chrome.downloads.download) {
          chrome.downloads.download(msg.opts || {}, function (id) { reply(id || null); });
        } else if (msg.type === 'openTab' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: msg.url }, function (t) { reply((t && t.id) || null); });
        } else {
          reply(null);
        }
      } catch (err) {
        reply({ __error: String(err && err.message || err) });
      }
    });

    // ---- Injeta o runtime remoto ----
    function inject() {
      if (document.querySelector('script[data-ueda-loader]')) return;
      var s = document.createElement('script');
      s.setAttribute('data-ueda-loader', '1');
      s.src = RUNTIME_URL + '?t=' + Date.now();
      s.async = false;
      s.onerror = function () { console.error('[UEDA] falha ao carregar runtime remoto'); };
      (document.head || document.documentElement).appendChild(s);
      console.log('[UEDA] bootstrap OK — runtime remoto solicitado', EXT_VERSION);
    }
    if (document.head || document.documentElement) inject();
    else document.addEventListener('DOMContentLoaded', inject, { once: true });
  } catch (e) {
    console.error('[UEDA] bootstrap falhou', e);
  }
})();
