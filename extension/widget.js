// UEDA EX — Bootstrap MV3-safe com ponte chrome.* via postMessage.
// Carrega o runtime remoto do GitHub (sem reinstalação necessária).
// v5.2.0
(function bootstrap() {
  try {
    if (window.top !== window.self) return;
    if (window.__uedaBootstrapped) return;
    window.__uedaBootstrapped = true;

    // ---- Fonte do runtime: GitHub raw (atualiza sem reinstalar) ----
    var RUNTIME_URL = 'https://raw.githubusercontent.com/Uedaag/ueda-control-center/main/extension/widget-runtime.js';
    var CONFIG_URL  = 'https://raw.githubusercontent.com/Uedaag/ueda-control-center/main/extension/config.json';

    // ---- Info da extensão exposta ao page world via dataset ----
    var LOGO_URL    = '';
    var EXT_VERSION = '5.2.0';
    try { LOGO_URL    = chrome.runtime.getURL('logo.png'); }    catch (_) {}
    try { EXT_VERSION = chrome.runtime.getManifest().version; } catch (_) {}
    var root = document.documentElement;
    root.setAttribute('data-ueda-logo-url',    LOGO_URL);
    root.setAttribute('data-ueda-ext-version', EXT_VERSION);
    root.setAttribute('data-ueda-config-url',  CONFIG_URL);

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
        } else if (msg.type === 'runtime.sendMessage') {
          try { chrome.runtime.sendMessage(msg.msg, function (r) { reply(r || null); }); }
          catch (_) { reply(null); }
        } else if (msg.type === 'openTab' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: msg.url }, function (t) { reply((t && t.id) || null); });
        } else {
          reply(null);
        }
      } catch (err) {
        reply({ __error: String(err && err.message || err) });
      }
    });

    // ---- Escuta mudanças de storage (notificações do servidor) ----
    try {
      chrome.storage.onChanged.addListener(function(changes, area) {
        if (area !== 'local') return;
        window.postMessage({ __uedaStorageChanged: true, changes: changes }, '*');
      });
    } catch(_) {}

    // ---- Injeta o runtime remoto do GitHub ----
    function inject() {
      if (document.querySelector('script[data-ueda-loader]')) return;
      var s = document.createElement('script');
      s.setAttribute('data-ueda-loader', '1');
      // cache-bust a cada 15 minutos para pegar atualizações
      var cacheBust = Math.floor(Date.now() / (15 * 60 * 1000));
      s.src = RUNTIME_URL + '?v=' + EXT_VERSION + '&cb=' + cacheBust;
      s.async = false;
      s.onerror = function () {
        console.error('[UEDA] Falha ao carregar runtime. Usando fallback local.');
        injectFallback();
      };
      (document.head || document.documentElement).appendChild(s);
      console.log('[UEDA] Bootstrap OK — runtime v' + EXT_VERSION + ' solicitado');
    }

    // ---- Fallback inline caso o GitHub esteja indisponível ----
    function injectFallback() {
      console.warn('[UEDA] Modo offline — funcionalidades limitadas.');
    }

    if (document.head || document.documentElement) inject();
    else document.addEventListener('DOMContentLoaded', inject, { once: true });

  } catch (e) {
    console.error('[UEDA] bootstrap falhou', e);
  }
})();
