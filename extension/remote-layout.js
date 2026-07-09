// UEDA — Remote Layout Loader
// NÃO altera o método original. Apenas puxa CSS/cores do servidor e aplica
// como override visual. Assim o cliente instala UMA vez e todo ajuste de
// layout futuro vem do painel sem reinstalar a extensão.
(() => {
  const ENDPOINT = 'https://keqgzvcahsvseowfowwu.supabase.co/functions/v1/fn-sv03?check=updates';
  const STYLE_ID = 'ueda-remote-layout-style';
  const VAR_STYLE_ID = 'ueda-remote-layout-vars';

  function currentVersion() {
    try { return chrome.runtime.getManifest().version || '0.0.0'; } catch { return '0.0.0'; }
  }

  function cmpVer(a, b) {
    const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  }

  function setStyle(id, cssText) {
    let el = document.getElementById(id);
    if (!cssText) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = cssText;
  }

  const BASE_MODERN_CSS = `
    /* ---- UEDA Modern Widget Overlay (aplica sobre inject.js/content.js) ---- */
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
    :root, body { --ueda-accent: var(--ueda-accent, #1E88E5); }

    /* Chat glow (borda azul animada no textarea do Lovable) */
    @keyframes ueda-chat-glow-modern {
      0%,100% { box-shadow: 0 0 0 2px var(--ueda-accent), 0 0 22px color-mix(in srgb, var(--ueda-accent) 40%, transparent); }
      50%     { box-shadow: 0 0 0 2px var(--ueda-accent), 0 0 36px color-mix(in srgb, var(--ueda-accent) 65%, transparent); }
    }
    body textarea[placeholder*="Lovable" i]:not([id*="ueda"]),
    body textarea[placeholder*="Pergunte" i]:not([id*="ueda"]),
    body textarea[placeholder*="Ask" i]:not([id*="ueda"]) {
      outline: 2px solid var(--ueda-accent) !important;
      outline-offset: 2px !important;
      border-radius: 14px !important;
      animation: ueda-chat-glow-modern 2.6s ease-in-out infinite !important;
      transition: outline-color .25s ease !important;
    }

    /* Floating widget container — se existir com IDs conhecidos */
    #ueda-widget, #ueda-fab, [id*="ueda-widget"] {
      font-family: "DM Sans", Inter, system-ui, sans-serif !important;
    }
    #ueda-widget-container .ueda-widget-btn,
    #ueda-fab {
      border: 1px solid color-mix(in srgb, var(--ueda-accent) 45%, transparent) !important;
      box-shadow: 0 18px 44px rgba(0,0,0,0.42), 0 0 0 10px color-mix(in srgb, var(--ueda-accent) 12%, transparent), 0 0 28px color-mix(in srgb, var(--ueda-accent) 30%, transparent) !important;
    }
  `;

  function apply(cfg) {
    if (!cfg) return;
    const settings = cfg.settings || {};
    const accent = settings.brand_color || settings.widget_accent_color || '#1E88E5';
    setStyle(VAR_STYLE_ID, `
      :root, html, body {
        --ueda-accent: ${accent} !important;
        --ueda-brand: ${accent} !important;
      }
    `);
    const custom = settings.chat_custom_css || settings.custom_css || '';
    // Base moderna sempre + override do painel
    setStyle(STYLE_ID, BASE_MODERN_CSS + '\n' + (custom || ''));
  }

  function showReleaseModal(version, changelog) {
    if (document.getElementById('ueda-remote-release-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ueda-remote-release-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;';
    overlay.innerHTML = `
      <div style="width:min(420px,94vw);background:#16181f;color:#f4f7fb;border:1px solid var(--ueda-accent,#1E88E5);border-radius:20px;padding:24px;box-shadow:0 0 30px rgba(30,136,229,0.25);">
        <div style="text-align:center;font-size:13px;font-weight:800;letter-spacing:0.08em;color:var(--ueda-accent,#1E88E5);">NOVA ATUALIZAÇÃO DISPONÍVEL</div>
        <div style="text-align:center;font-size:24px;font-weight:800;color:var(--ueda-accent,#1E88E5);margin:8px 0 14px;">v${version}</div>
        <div id="ueda-rr-notes" style="white-space:pre-wrap;background:rgba(255,255,255,0.04);padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);max-height:220px;overflow:auto;font-size:13px;line-height:1.5;color:#d9dde7;"></div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button id="ueda-rr-ok" style="flex:1;padding:10px 16px;border-radius:12px;border:1px solid var(--ueda-accent,#1E88E5);background:var(--ueda-accent,#1E88E5);color:#050506;font-weight:700;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;">OK</button>
        </div>
      </div>`;
    overlay.querySelector('#ueda-rr-notes').textContent = changelog || 'Melhorias e correções.';
    const close = () => overlay.remove();
    overlay.querySelector('#ueda-rr-ok').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
  }

  async function sync() {
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store', headers: { 'x-ext-version': currentVersion() } });
      if (!res.ok) return;
      const cfg = await res.json();
      apply(cfg);
      try { chrome.storage.local.set({ uedaRemoteLayout: cfg, uedaLayoutSyncedAt: Date.now() }); } catch {}

      const rel = cfg && cfg.release;
      const latest = cfg && (cfg.version || (rel && rel.version));
      if (latest && cmpVer(latest, currentVersion()) > 0) {
        chrome.storage.local.get(['uedaSeenReleaseVersion'], (r) => {
          if (r && r.uedaSeenReleaseVersion === latest) return;
          showReleaseModal(latest, rel && rel.changelog);
          chrome.storage.local.set({ uedaSeenReleaseVersion: latest });
        });
      }
    } catch (e) {}
  }

  // aplica cache local primeiro para não piscar
  try {
    chrome.storage.local.get(['uedaRemoteLayout'], (r) => {
      if (r && r.uedaRemoteLayout) apply(r.uedaRemoteLayout);
    });
  } catch {}

  // sincroniza agora e a cada 5 min
  sync();
  setInterval(sync, 5 * 60 * 1000);
})();
