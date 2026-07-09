// UEDA EX — bootstrap definitivo (fetch + eval no mundo isolado).
// Executa o runtime remoto no mesmo contexto da extensão (isolated world),
// mantendo acesso a chrome.* (storage, runtime, downloads).
// A partir daqui, TODA mudança de UI/lógica é feita apenas em
// supabase/functions/widget-js/runtime.js e propagada com um simples F5.
// Não adicione lógica de UI aqui.
(function bootstrap() {
  try {
    if (window.top !== window.self) return;
    if (window.__uedaBootstrapped) return;
    window.__uedaBootstrapped = true;

    var RUNTIME_URL = 'https://keqgzvcahsvseowfowwu.supabase.co/functions/v1/widget-js';

    // Contexto injetado no runtime (evita depender de document.currentScript).
    try {
      window.UEDA_LOGO_URL = chrome.runtime.getURL('logo.png');
    } catch (_) { window.UEDA_LOGO_URL = ''; }
    try {
      window.UEDA_EXT_VERSION = chrome.runtime.getManifest().version;
    } catch (_) { window.UEDA_EXT_VERSION = '0.0.0'; }

    function loadRuntime() {
      fetch(RUNTIME_URL + '?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(function (code) {
          try {
            // Indirect eval → executa no escopo do isolated world com chrome.*
            (0, eval)(code);
            console.log('[UEDA] runtime remoto carregado', window.UEDA_EXT_VERSION);
          } catch (err) {
            console.error('[UEDA] erro executando runtime remoto', err);
          }
        })
        .catch(function (err) {
          console.error('[UEDA] falha ao baixar runtime remoto', err);
          // Retry em 5s (rede oscilando)
          setTimeout(loadRuntime, 5000);
        });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadRuntime, { once: true });
    } else {
      loadRuntime();
    }
  } catch (e) {
    console.error('[UEDA] bootstrap falhou', e);
  }
})();
