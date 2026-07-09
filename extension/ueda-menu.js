// UEDA — Floating Menu (skills carregadas do servidor)
// NÃO altera o método original (background/content/inject/popup). É apenas UI.
(() => {
  if (window.__uedaMenuLoaded) return;
  window.__uedaMenuLoaded = true;

  const ENDPOINT = 'https://keqgzvcahsvseowfowwu.supabase.co/functions/v1/fn-sv03?check=updates';
  const LOGO_URL = chrome.runtime.getURL('logo.png');
  const STATE = { expanded: false, active: null, skills: [], enabled: {}, accent: '#1EAEDB' };

  // ---------- estilos ----------
  const css = `
    #ueda-fab-root, #ueda-fab-root * { box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    #ueda-fab-root { position: fixed; right: 18px; top: 50%; transform: translateY(-50%); z-index: 2147483646; }
    #ueda-fab-btn {
      width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;
      background: #fff; box-shadow: 0 10px 28px rgba(0,0,0,0.28), 0 0 0 6px color-mix(in srgb, var(--ueda-a, #1EAEDB) 18%, transparent);
      display: grid; place-items: center; transition: transform .2s ease, box-shadow .2s ease;
    }
    #ueda-fab-btn:hover { transform: scale(1.06); }
    #ueda-fab-btn img { width: 34px; height: 34px; object-fit: contain; }
    #ueda-fab-dot {
      position: absolute; top: 2px; right: 2px; width: 12px; height: 12px; border-radius: 50%;
      background: #22c55e; border: 2px solid #fff; box-shadow: 0 0 0 0 rgba(34,197,94,.6);
      animation: ueda-pulse 1.8s infinite;
    }
    @keyframes ueda-pulse { 0%{box-shadow:0 0 0 0 rgba(34,197,94,.55)} 70%{box-shadow:0 0 0 10px rgba(34,197,94,0)} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} }

    #ueda-panel {
      position: absolute; right: 68px; top: 50%; transform: translateY(-50%) translateX(8px);
      min-width: 260px; max-width: 300px;
      background: rgba(12, 16, 24, 0.92); backdrop-filter: blur(14px);
      border: 1px solid color-mix(in srgb, var(--ueda-a, #1EAEDB) 45%, transparent);
      border-radius: 18px; padding: 12px; color: #eef2f7;
      box-shadow: 0 24px 60px rgba(0,0,0,.45);
      opacity: 0; pointer-events: none; transition: opacity .2s ease, transform .2s ease;
    }
    #ueda-fab-root.open #ueda-panel { opacity: 1; pointer-events: auto; transform: translateY(-50%) translateX(0); }
    #ueda-panel header {
      display: flex; align-items: center; gap: 10px; padding: 6px 8px 10px;
      border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 8px;
    }
    #ueda-panel header .t { font-weight: 700; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: var(--ueda-a, #1EAEDB); }
    #ueda-panel header .s { font-size: 11px; color: #9aa4b2; margin-left: auto; }
    #ueda-list { display: flex; flex-direction: column; gap: 4px; max-height: 60vh; overflow: auto; }
    .ueda-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 10px; border-radius: 12px;
      border: 1px solid transparent; background: transparent; color: #dbe2ee; cursor: pointer;
      text-align: left; width: 100%; font-size: 13px; transition: background .15s ease, border-color .15s ease;
    }
    .ueda-item:hover { background: rgba(255,255,255,.05); }
    .ueda-item.active { background: color-mix(in srgb, var(--ueda-a, #1EAEDB) 22%, transparent); border-color: color-mix(in srgb, var(--ueda-a, #1EAEDB) 55%, transparent); color: #fff; }
    .ueda-item .ic { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; background: rgba(255,255,255,.06); font-size: 14px; }
    .ueda-item .lb { flex: 1; min-width: 0; }
    .ueda-item .lb .n { font-weight: 600; }
    .ueda-item .lb .d { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ueda-toggle {
      position: relative; width: 32px; height: 18px; border-radius: 999px; background: #2a323e; flex: 0 0 auto;
      transition: background .2s ease;
    }
    .ueda-toggle::after {
      content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;
      background: #fff; transition: transform .2s ease;
    }
    .ueda-toggle.on { background: var(--ueda-a, #1EAEDB); }
    .ueda-toggle.on::after { transform: translateX(14px); }
    #ueda-empty { padding: 16px 10px; text-align: center; color: #94a3b8; font-size: 12px; }
    #ueda-panel footer { display: flex; justify-content: space-between; align-items: center; padding: 8px 6px 2px; margin-top: 6px; border-top: 1px solid rgba(255,255,255,.06); font-size: 11px; color: #94a3b8; }
  `;

  const style = document.createElement('style');
  style.id = 'ueda-menu-style';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // ---------- DOM ----------
  const root = document.createElement('div');
  root.id = 'ueda-fab-root';
  root.innerHTML = `
    <button id="ueda-fab-btn" title="UEDA">
      <img src="${LOGO_URL}" alt="UEDA"/>
      <span id="ueda-fab-dot"></span>
    </button>
    <div id="ueda-panel" role="menu" aria-label="UEDA Skills">
      <header>
        <span class="t">Skills</span>
        <span class="s" id="ueda-count">0</span>
      </header>
      <div id="ueda-list"></div>
      <div id="ueda-empty" style="display:none">Nenhuma skill disponível.</div>
      <footer><span>UEDA Agency</span><span id="ueda-ver">v—</span></footer>
    </div>
  `;
  const attach = () => (document.body || document.documentElement).appendChild(root);
  if (document.body) attach(); else document.addEventListener('DOMContentLoaded', attach, { once: true });

  const $ = (sel) => root.querySelector(sel);
  const fab = () => $('#ueda-fab-btn');
  const panel = () => $('#ueda-panel');
  const list = () => $('#ueda-list');
  const empty = () => $('#ueda-empty');
  const countEl = () => $('#ueda-count');
  const verEl = () => $('#ueda-ver');

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) root.classList.remove('open');
  });

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('#ueda-fab-btn');
    if (btn) { root.classList.toggle('open'); return; }
    const item = e.target.closest('.ueda-item');
    if (item) {
      const id = item.dataset.id;
      const skill = STATE.skills.find((s) => String(s.id) === String(id));
      if (!skill) return;
      // toggle enabled
      STATE.enabled[id] = !STATE.enabled[id];
      try { chrome.storage.local.set({ uedaSkillsEnabled: STATE.enabled }); } catch {}
      STATE.active = id;
      render();
    }
  });

  function iconFor(s) {
    if (s.icon && /^https?:/.test(s.icon)) return `<img src="${s.icon}" style="width:18px;height:18px;border-radius:4px" alt=""/>`;
    if (s.icon && s.icon.length <= 3) return s.icon;
    return (s.name || '?').slice(0, 1).toUpperCase();
  }

  function render() {
    document.documentElement.style.setProperty('--ueda-a', STATE.accent);
    const ul = list();
    ul.innerHTML = '';
    countEl().textContent = String(STATE.skills.length);
    empty().style.display = STATE.skills.length ? 'none' : 'block';
    STATE.skills.forEach((s) => {
      const on = !!STATE.enabled[s.id];
      const row = document.createElement('button');
      row.className = 'ueda-item' + (STATE.active === s.id ? ' active' : '');
      row.dataset.id = s.id;
      row.innerHTML = `
        <span class="ic">${iconFor(s)}</span>
        <span class="lb"><div class="n">${escapeHtml(s.name || 'Skill')}</div>${s.description ? `<div class="d">${escapeHtml(s.description)}</div>` : ''}</span>
        <span class="ueda-toggle ${on ? 'on' : ''}" aria-hidden="true"></span>
      `;
      ul.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  async function sync() {
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      STATE.skills = Array.isArray(data.skills) ? data.skills : [];
      const settings = data.settings || {};
      STATE.accent = settings.brand_color || settings.widget_accent_color || STATE.accent;
      verEl().textContent = 'v' + (data.version || '—');
      try {
        chrome.storage.local.get(['uedaSkillsEnabled'], (r) => {
          STATE.enabled = (r && r.uedaSkillsEnabled) || STATE.enabled;
          // default: any newly-discovered skill starts enabled
          STATE.skills.forEach((s) => { if (!(s.id in STATE.enabled)) STATE.enabled[s.id] = true; });
          render();
        });
      } catch { render(); }
      try { chrome.storage.local.set({ uedaSkillsCache: STATE.skills, uedaAccent: STATE.accent }); } catch {}
    } catch {}
  }

  // cache primeiro
  try {
    chrome.storage.local.get(['uedaSkillsCache', 'uedaAccent', 'uedaSkillsEnabled'], (r) => {
      if (r && r.uedaSkillsCache) STATE.skills = r.uedaSkillsCache;
      if (r && r.uedaAccent) STATE.accent = r.uedaAccent;
      if (r && r.uedaSkillsEnabled) STATE.enabled = r.uedaSkillsEnabled;
      render();
    });
  } catch { render(); }

  sync();
  setInterval(sync, 5 * 60 * 1000);
})();
