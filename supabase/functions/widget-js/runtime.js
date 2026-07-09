// ---------- Chrome API shim (page world → content script bridge) ----------
// O runtime remoto executa no page world (script src) e não tem acesso nativo
// a chrome.*. O widget.js (content script) proxia via postMessage.
(function installChromeShim() {
  if (window.__uedaChromeShim) return;
  window.__uedaChromeShim = true;
  var pending = new Map();
  var seq = 0;
  window.addEventListener('message', function (e) {
    if (e.source !== window) return;
    var d = e.data;
    if (!d || d.__uedaBridge !== 'res' || !d.id) return;
    var cb = pending.get(d.id);
    if (cb) { pending.delete(d.id); cb(d.result); }
  });
  function bridge(type, payload) {
    return new Promise(function (resolve) {
      var id = 'u' + (++seq) + '_' + Date.now();
      pending.set(id, resolve);
      var msg = Object.assign({ __uedaBridge: 'req', id: id, type: type }, payload || {});
      window.postMessage(msg, '*');
      // Timeout de segurança
      setTimeout(function () {
        if (pending.has(id)) { pending.delete(id); resolve(null); }
      }, 4000);
    });
  }
  var root = document.documentElement;
  var LOGO_URL = root.getAttribute('data-ueda-logo-url') || '';
  var EXT_VERSION = root.getAttribute('data-ueda-ext-version') || '0.0.0';
  window.UEDA_LOGO_URL = LOGO_URL;
  window.UEDA_EXT_VERSION = EXT_VERSION;

  if (!window.chrome) window.chrome = {};
  if (!window.chrome.storage) window.chrome.storage = {};
  if (!window.chrome.storage.local) {
    window.chrome.storage.local = {
      get: function (keys, cb) {
        bridge('storage.get', { keys: keys }).then(function (r) { cb && cb(r || {}); });
      },
      set: function (data, cb) {
        bridge('storage.set', { data: data }).then(function () { cb && cb(); });
      },
      remove: function (keys, cb) {
        bridge('storage.remove', { keys: keys }).then(function () { cb && cb(); });
      },
    };
  }
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      getManifest: function () { return { version: EXT_VERSION }; },
      getURL: function (p) { return p === 'logo.png' ? LOGO_URL : ''; },
    };
  }
  if (!window.chrome.downloads) {
    window.chrome.downloads = {
      download: function (opts, cb) {
        bridge('download', { opts: opts }).then(function (id) { cb && cb(id); });
      },
    };
  }
  console.log('[UEDA] chrome shim instalado (page world)');
})();

window.__uedaWidgetInit = function() {
  if (window.top !== window.self) return;
  if (window.__uedaWidgetMounted) return;
  window.__uedaWidgetMounted = true;
  if (document.getElementById('ueda-widget-container')) return;

  var __uedaScript = document.currentScript || document.querySelector('script[data-ueda-loader]');
  var logoUrl = window.UEDA_LOGO_URL || (__uedaScript && __uedaScript.getAttribute('data-logo-url')) || '';
  var extVersion = window.UEDA_EXT_VERSION || (__uedaScript && __uedaScript.getAttribute('data-ext-version')) || '0.0.0';


  const UEDA_DEBUG = true;
  function uedaLog(message, extra) {
    if (!UEDA_DEBUG) return;
    if (extra !== undefined) console.log('[UEDA]', message, extra);
    else console.log('[UEDA]', message);
  }

  uedaLog('Widget carregado na página', location.href);

  // ---------- Hider do card legado "Validade" (injetado por content.js/inject.js) ----------
  // Como o script antigo está bundleado na extensão, não dá para removê-lo sem reinstalar.
  // Aqui neutralizamos o elemento em runtime, sem exigir reinstalação.
  (function hideLegacyValidity() {
    try {
      const style = document.createElement('style');
      style.setAttribute('data-ueda-hide-legacy', '1');
      style.textContent = `
        [data-show-validity],[data-validade],[data-key-valid],
        [id*="validity" i],[id*="validade" i],
        [class*="validity" i],[class*="validade" i] { display:none !important; visibility:hidden !important; opacity:0 !important; pointer-events:none !important; }
      `;
      (document.head || document.documentElement).appendChild(style);

      function sweep(root) {
        try {
          const nodes = (root || document).querySelectorAll('div,section,aside,span');
          nodes.forEach((el) => {
            if (el.closest('#ueda-widget-container')) return;
            if (el.__uedaChecked) return;
            const t = (el.textContent || '').trim();
            if (!t) return;
            // Match pill legado: título "Validade" + contagem "XXd XXh XXm XXs"
            if (/^\s*Validade\s*\d+d\s*\d+h\s*\d+m\s*\d+s\s*$/i.test(t) ||
                (t.length < 60 && /Validade/i.test(t) && /\d+d\s*\d+h/i.test(t))) {
              el.__uedaChecked = true;
              el.style.setProperty('display', 'none', 'important');
            }
          });
        } catch (_) {}
      }
      sweep(document);
      const obs = new MutationObserver(() => sweep(document));
      obs.observe(document.documentElement, { childList: true, subtree: true });
      uedaLog('Hider do card Validade ativado');
    } catch (e) { console.warn('[UEDA] hider falhou', e); }
  })();


  const html = `
    <div id="ueda-widget-container">
      <div class="ueda-widget-menu">

        <!-- Toggle header: click to expand/collapse text -->
        <div class="ueda-menu-header" id="ueda-menu-toggle">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span class="ueda-menu-header-text">Recolher menu</span>
        </div>

        <!-- Account Info -->
        <div class="ueda-menu-item" style="cursor:default;">
          <svg viewBox="0 0 24 24" style="flex-shrink:0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <div class="ueda-account-info">
            <span id="ueda-user-name" style="color:#e2e8f0; font-weight:600; font-size:13px; line-height:1.2;">Minha conta</span>
            <span id="ueda-time-value" style="display:none;"></span>
          </div>
        </div>

        <div class="ueda-menu-item" id="ueda-menu-sound">
          <svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          <span class="ueda-item-text" id="ueda-sound-text">Som ON</span>
        </div>

        <!-- Server-driven skills injected here -->
        <div id="ueda-skills-list"></div>


        <div class="ueda-menu-item" id="ueda-menu-update">
          <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span class="ueda-item-text" id="ueda-update-text">Atualizar extensão</span>
        </div>

        <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" class="ueda-menu-item" id="ueda-menu-support" style="text-decoration:none;">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <span class="ueda-item-text">Ajuda &amp; Suporte</span>
        </a>

        <div class="ueda-menu-item" id="ueda-menu-status">
          <svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
          <span class="ueda-item-text" id="ueda-status-text">Monitor ON</span>
        </div>

      </div>

      <!-- The floating logo button -->
      <button class="ueda-widget-btn" id="ueda-main-btn" title="UEDA EX">
        <img src="${logoUrl}" alt="U" class="ueda-widget-logo">
      </button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  // ---------- Element refs ----------
  const container  = document.getElementById('ueda-widget-container');
  const mainBtn    = document.getElementById('ueda-main-btn');
  const toggleBtn  = document.getElementById('ueda-menu-toggle');
  const timeValue  = document.getElementById('ueda-time-value');
  const statusBtn  = document.getElementById('ueda-menu-status');
  const statusText = document.getElementById('ueda-status-text');
  const updateBtn  = document.getElementById('ueda-menu-update');
  const updateText = document.getElementById('ueda-update-text');
  const supportLink = document.getElementById('ueda-menu-support');
  const soundBtn   = document.getElementById('ueda-menu-sound');
  const soundText  = document.getElementById('ueda-sound-text');
  const rmvMarkBtn = document.getElementById('ueda-menu-remove-watermark');

  let isEnabled  = true;
  let isSoundEnabled = true;
  let hasPlayedWelcome = false;
  let chatGlowEl = null;
  let pendingUpdateData = null;
  const FALLBACK_CONFIG_VERSION = '5.0.0';
  
  // Remote Server Config
  let remoteConfig = {
    sounds: {
      welcome: "https://cdn.freesound.org/previews/275/275673_5123851-lq.mp3",
      chat: "https://cdn.freesound.org/previews/411/411456_5123851-lq.mp3"
    },
    commands: {
      remove_watermark: "const els = document.querySelectorAll('*'); els.forEach(el => { if(el.textContent && el.textContent.includes('Made with Lovable')) { el.style.display = 'none'; } }); console.log('[UEDA] Marca da água removida pelo servidor.');"
    }
  };

  // ---------- Server endpoint (Lovable Cloud / Supabase) ----------
  const SERVER_URL = 'https://keqgzvcahsvseowfowwu.supabase.co/functions/v1/fn-sv03';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char] || char);
  }

  function showUedaToast(message) {
    const old = document.getElementById('ueda-update-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'ueda-update-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('ueda-visible'));
    setTimeout(() => {
      toast.classList.remove('ueda-visible');
      setTimeout(() => toast.remove(), 240);
    }, 2800);
  }

  function setUpdatePending(hasUpdate) {
    if (!updateBtn) return;
    updateBtn.classList.toggle('ueda-update-pending', !!hasUpdate);
    if (updateText) updateText.textContent = hasUpdate ? 'Atualização disponível' : 'Atualizar extensão';
  }

  function getCurrentConfigVersion(store) {
    return store.uedaAppliedVersion || store.appliedVersion || FALLBACK_CONFIG_VERSION;
  }

  // Fetch configs from server (legacy sounds/commands)
  fetch('https://preview-panel-buddy.lovable.app/config.json')
    .then(r => r.json())
    .then(data => { if(data && data.sounds) remoteConfig = data; })
    .catch(e => console.log('[UEDA] Usando configurações locais.'));

  // ---------- Skill icons (SVG paths keyed by lucide-ish name) ----------
  const SKILL_ICONS = {
    Sparkles: '<path d="M12 3l1.9 4.2L18 9l-4.1 1.8L12 15l-1.9-4.2L6 9l4.1-1.8z"/><path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
    Zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    Bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    Download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    FileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
    Edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    Shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    Star: '<polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 8.9 8.5 12 2"/>',
    Rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>',
    Palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 1 0 10 10c0-2-2-2-2-4s2-2 2-4a6 6 0 0 0-10-4z"/>',
    Volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
    Bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  };
  function iconSvg(name) {
    const paths = SKILL_ICONS[name] || SKILL_ICONS.Sparkles;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }

  // ---------- Render skills from server (read-only for clients) ----------
  const skillsList = document.getElementById('ueda-skills-list');
  let skillsById = {};

  function renderSkills(skills) {
    if (!skillsList) return;
    skillsById = {};
    skills.forEach(s => { skillsById[s.id] = s; });
    const top = skills.filter(s => !s.parent_id);
    const childrenOf = (pid) => skills.filter(s => s.parent_id === pid);
    uedaLog('Skills renderizadas', { total: skills.length, menu: top.length });

    skillsList.innerHTML = top.map(s => {
      const kids = childrenOf(s.id);
      const hasKids = kids.length > 0;
      const chevron = hasKids
        ? '<svg class="ueda-sk-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;transition:transform .2s"><polyline points="6 9 12 15 18 9"></polyline></svg>'
        : '';
      const parent =
        '<div class="ueda-menu-item ueda-skill-row" data-skill-id="' + s.id + '"' +
        (hasKids ? ' data-has-children="1"' : '') + '>' +
        iconSvg(s.icon || 'Sparkles') +
        '<span class="ueda-item-text">' + escapeHtml(s.name || 'Skill') + '</span>' +
        chevron +
        '</div>';
      const sub = hasKids
        ? '<div class="ueda-skill-sub" data-parent="' + s.id + '" style="display:none;padding-left:16px;border-left:2px solid rgba(255,255,255,.08);margin:2px 0 4px 12px;">' +
          kids.map(c =>
            '<div class="ueda-menu-item ueda-skill-row" data-skill-id="' + c.id + '" style="padding-left:10px">' +
            iconSvg(c.icon || 'Sparkles') +
            '<span class="ueda-item-text">' + escapeHtml(c.name || 'Skill') + '</span>' +
            '</div>'
          ).join('') +
          '</div>'
        : '';
      return parent + sub;
    }).join('');
  }

  // Locate the chat input on the host page and send text (optionally auto-submit)
  function isUsableChatElement(el) {
    if (!el || el.closest('#ueda-widget-container')) return false;
    if (el.disabled || el.readOnly) return false;
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (!rect || rect.width < 8 || rect.height < 8) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || '1') > 0;
  }

  function findChatTextarea() {
    const fields = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"], [role="textbox"]'))
      .filter(isUsableChatElement);

    const byIntent = fields.find(t => {
      const ph = (t.getAttribute('placeholder') || '').toLowerCase();
      const aria = (t.getAttribute('aria-label') || '').toLowerCase();
      const testId = (t.getAttribute('data-testid') || '').toLowerCase();
      const joined = ph + ' ' + aria + ' ' + testId;
      return joined.includes('pergunt') || joined.includes('lovable') || joined.includes('ask') || joined.includes('message') || joined.includes('mensagem') || joined.includes('chat') || joined.includes('prompt');
    });
    if (byIntent) return byIntent;

    // Visible field inside a form (chat composer usually has form submit)
    const inForm = fields.find(t => t.closest('form'));
    if (inForm) return inForm;

    // Last visible editable on page: the Lovable composer sits at the bottom.
    return fields.length ? fields[fields.length - 1] : null;
  }

  function findSendButton(fromEl) {
    const scopes = [];
    if (fromEl) {
      let p = fromEl.parentElement;
      for (let i = 0; i < 8 && p; i++) { scopes.push(p); p = p.parentElement; }
    }
    scopes.push(document);

    const isEnabledButton = (b) => {
      if (!b || b.closest('#ueda-widget-container')) return false;
      if (b.disabled || b.getAttribute('aria-disabled') === 'true') return false;
      const rect = b.getBoundingClientRect ? b.getBoundingClientRect() : null;
      if (!rect || rect.width < 10 || rect.height < 10) return false;
      const style = window.getComputedStyle(b);
      return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || '1') > 0;
    };

    const rejectText = /(construir|build|melhorar|improve|microfone|microphone|anexar|attach|adicionar|add)/i;
    for (const scope of scopes) {
      const btns = Array.from(scope.querySelectorAll('button, [role="button"]')).filter(isEnabledButton);
      const byLabel = btns.find(b => {
        const al = ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '') + ' ' + (b.textContent || '')).toLowerCase();
        return al.includes('enviar') || al.includes('send') || al.includes('submit');
      });
      if (byLabel && !byLabel.disabled) return byLabel;
      const bySubmit = btns.find(b => b.getAttribute('type') === 'submit' && !b.disabled);
      if (bySubmit) return bySubmit;

      const iconOnly = btns
        .filter(b => !rejectText.test(b.textContent || ''))
        .filter(b => b.querySelector('svg'))
        .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
      if (iconOnly[0]) return iconOnly[0];
    }
    return null;
  }

  function clickLikeUser(button) {
    const opts = { bubbles: true, cancelable: true, view: window };
    try { button.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch (_) {}
    try { button.dispatchEvent(new MouseEvent('mousedown', opts)); } catch (_) {}
    try { button.dispatchEvent(new PointerEvent('pointerup', opts)); } catch (_) {}
    try { button.dispatchEvent(new MouseEvent('mouseup', opts)); } catch (_) {}
    button.click();
  }

  function injectPromptIntoChat(text, autoSend) {
    if (!text) { uedaLog('Prompt vazio'); showUedaToast('Prompt vazio'); return; }
    const el = findChatTextarea();
    if (!el) { uedaLog('Chat input não encontrado'); showUedaToast('Chat não encontrado'); return; }
    uedaLog('Chat input encontrado', { tag: el.tagName, autoSend });
    el.focus();

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value');
      if (setter && setter.set) setter.set.call(el, text); else el.value = text;
      el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // contenteditable — ProseMirror needs a real beforeinput/insertText
      el.focus();
      try { document.execCommand('selectAll', false, undefined); } catch(_) {}
      try { document.execCommand('insertText', false, text); } catch(_) {
        el.innerText = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
      }
    }

    if (!autoSend) { showUedaToast('Prompt inserido'); return; }

    const trySend = (attempt = 1) => {
      // Preferred: click the send button (React-friendly)
      const btn = findSendButton(el);
      if (btn) {
        clickLikeUser(btn);
        uedaLog('Skill enviada via botão', { attempt });
        showUedaToast('Comando enviado');
        return;
      }
      if (attempt < 3) return setTimeout(() => trySend(attempt + 1), attempt * 260);

      // Fallback: try submitting the enclosing form
      const form = el.closest && el.closest('form');
      if (form) {
        try { form.requestSubmit ? form.requestSubmit() : form.submit(); uedaLog('Skill enviada via formulário'); showUedaToast('Comando enviado'); return; } catch(_) {}
      }
      // Last resort: dispatch Enter
      const evInit = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      el.dispatchEvent(new KeyboardEvent('keydown', evInit));
      el.dispatchEvent(new KeyboardEvent('keypress', evInit));
      el.dispatchEvent(new KeyboardEvent('keyup', evInit));
      uedaLog('Skill enviada via Enter simulado');
      showUedaToast('Comando enviado');
    };
    setTimeout(() => trySend(1), 160);
  }

  // Delegate skill clicks (parent expand / child execute)
  skillsList && skillsList.addEventListener('click', (e) => {
    const row = e.target.closest('.ueda-skill-row');
    if (!row) return;
    e.stopPropagation();
    const id = row.getAttribute('data-skill-id');
    const skill = skillsById[id];
    if (!skill) return;

    if (row.getAttribute('data-has-children')) {
      const sub = skillsList.querySelector('.ueda-skill-sub[data-parent="' + id + '"]');
      const chev = row.querySelector('.ueda-sk-chevron');
      if (sub) {
        const open = sub.style.display !== 'none';
        sub.style.display = open ? 'none' : 'block';
        if (chev) chev.style.transform = open ? '' : 'rotate(180deg)';
      }
      return;
    }

    // Execute skill action
    try {
      uedaLog('Executando skill', { name: skill.name, action_type: skill.action_type, auto_send: skill.auto_send });
      if (skill.action_type === 'chat_prompt') {
        injectPromptIntoChat(skill.prompt_text || '', !!skill.auto_send);
      } else if (skill.payload) {
        new Function(skill.payload)();
        showUedaToast('Skill executada');
      }
    } catch (err) {
      uedaLog('Erro executando skill', err);
      showUedaToast('Erro na skill');
    }
  });

  // Apply server-driven layout/branding (color + custom CSS + commands)
  let __uedaStyleEl = null;
  function applyServerLayout(data) {
    try {
      const s = (data && data.settings) || {};
      const color = s.widget_accent_color || s.brand_color;
      if (color) {
        document.documentElement.style.setProperty('--ueda-accent', color);
        if (container) container.style.setProperty('--ueda-accent', color);
      }
      if (supportLink) {
        const rawSupport = s.support_url || (s.whatsapp ? 'https://wa.me/' + String(s.whatsapp).replace(/\D/g, '') : '');
        if (rawSupport) supportLink.href = rawSupport;
      }
      const css = s.custom_css || s.chat_custom_css || '';
      if (!__uedaStyleEl) {
        __uedaStyleEl = document.createElement('style');
        __uedaStyleEl.id = 'ueda-server-style';
        document.head.appendChild(__uedaStyleEl);
      }
      __uedaStyleEl.textContent = css;
      if (data && data.commands && data.commands.remove_watermark) {
        try { new Function(data.commands.remove_watermark)(); } catch (e) {}
      }
      uedaLog('Layout publicado aplicado', { color });
    } catch (e) { uedaLog('applyServerLayout error', e); }
  }

  function applyPublishedPayload(data) {
    if (!data || !data.ok) return;
    applyServerLayout(data);
    if (Array.isArray(data.skills)) {
      const active = data.skills.filter(s => (typeof s.status === 'boolean' ? s.status : s.status === 'active' || s.status == null));
      renderSkills(active);
    }
    uedaLog('Payload publicado aplicado', { version: data.version });
  }

  function loadAppliedPayload() {
    chrome.storage.local.get(['uedaPublishedPayload', 'uedaAppliedVersion'], (r) => {
      if (r.uedaPublishedPayload) {
        applyPublishedPayload(r.uedaPublishedPayload);
      } else {
        applyPendingUpdate(true);
        return;
      }
      checkForServerUpdate(false);
    });
  }

  function checkForServerUpdate(notify) {
    chrome.storage.local.get(['licenseKey'], (r) => {
      chrome.storage.local.get(['uedaAppliedVersion', 'appliedVersion'], (versionStore) => {
      const currentVersion = getCurrentConfigVersion(versionStore);
      fetch(SERVER_URL + '?check=updates', {
        headers: { 'x-license-key': r.licenseKey || '', 'x-ext-version': currentVersion }
      })
        .then(res => res.json())
        .then(data => {
          const serverVersion = data && data.version ? String(data.version) : '';
          const hasUpdate = !!(data && data.ok && (data.update_required || (serverVersion && serverVersion !== String(currentVersion))));
          pendingUpdateData = hasUpdate ? data : null;
          setUpdatePending(hasUpdate);
          if (hasUpdate && notify !== false) {
            showUedaToast('Nova atualização disponível');
          }
        })
        .catch(err => console.log('[UEDA] Falha ao carregar skills:', err));
      });
    });
  }
  function applyPendingUpdate(silent) {
    chrome.storage.local.get(['licenseKey', 'uedaAppliedVersion', 'appliedVersion'], (r) => {
      const currentVersion = getCurrentConfigVersion(r);
      const applyData = (data) => {
        if (!data || !data.ok) {
          if (!silent) showUedaToast('Nenhuma atualização disponível');
          return;
        }
        applyPublishedPayload(data);
        const nextVersion = data.version || currentVersion;
        chrome.storage.local.set({
          uedaPublishedPayload: data,
          uedaAppliedVersion: nextVersion,
        }, () => {
          pendingUpdateData = null;
          setUpdatePending(false);
          if (!silent) showUedaToast('Extensão atualizada');
        });
      };
      fetch(SERVER_URL + '?check=updates&apply=1', {
        headers: { 'x-license-key': r.licenseKey || '', 'x-ext-version': currentVersion }
      })
        .then(res => res.json())
        .then(applyData)
        .catch(() => { if (!silent) showUedaToast('Falha ao atualizar'); });
    });
  }
  loadAppliedPayload();
  setInterval(() => checkForServerUpdate(true), 5 * 60 * 1000);
  window.addEventListener('focus', () => checkForServerUpdate(false));


  function playSound(type) {
    if (!isSoundEnabled || !remoteConfig.sounds[type]) return;
    try {
      const audio = new Audio(remoteConfig.sounds[type]);
      audio.volume = 0.5;
      audio.play().catch(e => {}); // Ignore browser autoplay restrictions
    } catch (e) {}
  }

  // ---------- CLICK LOGO: toggle menu open/closed ----------
  mainBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = container.classList.contains('ueda-open');
    if (isOpen) {
      // Close: remove both open and expanded
      container.classList.remove('ueda-open', 'ueda-expanded');
    } else {
      // Open in icons-only mode
      container.classList.add('ueda-open');
    }
  });

  // ---------- CLICK ARROW: toggle expand (icons + text) ----------
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    container.classList.toggle('ueda-expanded');
  });

  // ---------- CLICK OUTSIDE: close menu ----------
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      container.classList.remove('ueda-open', 'ueda-expanded');
    }
  });

  // ---------- Update button ----------
  if (updateBtn) {
    updateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      applyPendingUpdate();
    });
  }

  // ---------- Remove Watermark Server Command ----------
  if (rmvMarkBtn) {
    rmvMarkBtn.addEventListener('click', () => {
      try {
        const scriptCode = remoteConfig.commands.remove_watermark;
        if (scriptCode) {
          const fn = new Function(scriptCode);
          fn();
        }
      } catch (e) {
        console.error('[UEDA] Erro ao executar script do servidor:', e);
      }
    });
  }

  // ---------- Load initial state ----------
  chrome.storage.local.get(['enabled', 'mode', 'userName', 'user', 'soundEnabled', 'welcomePlayed'], (result) => {
    isEnabled = result.enabled !== false;
    isSoundEnabled = result.soundEnabled !== false;
    hasPlayedWelcome = !!result.welcomePlayed;
    const name = result.userName || result.user || 'Minha conta';
    document.getElementById('ueda-user-name').textContent = name;
    updateUI();
  });

  // ---------- UI update ----------
  function updateUI() {
    if (isEnabled) {
      if (statusText) statusText.textContent = 'Monitor ON';
      if (statusBtn)  {
        statusBtn.classList.add('ueda-text-green');
        statusBtn.classList.remove('ueda-text-red');
      }
      applyChatGlow(true);
    } else {
      if (statusText) statusText.textContent = 'Monitor OFF';
      if (statusBtn) {
        statusBtn.classList.add('ueda-text-red');
        statusBtn.classList.remove('ueda-text-green');
      }
      applyChatGlow(false);
    }
    
    // Update Sound Button
    if (isSoundEnabled) {
      if (soundText) soundText.textContent = 'Som ON';
      if (soundBtn) {
        soundBtn.classList.add('ueda-text-green');
        soundBtn.classList.remove('ueda-text-red');
      }
    } else {
      if (soundText) soundText.textContent = 'Som OFF';
      if (soundBtn) {
        soundBtn.classList.add('ueda-text-red');
        soundBtn.classList.remove('ueda-text-green');
      }
    }
  }

  // ---------- Toggle Sound ----------
  if (soundBtn) {
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isSoundEnabled = !isSoundEnabled;
      chrome.storage.local.set({ soundEnabled: isSoundEnabled }, updateUI);
    });
  }

  // ---------- Toggle monitor ----------
  if (statusBtn) {
    statusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isEnabled = !isEnabled;
      chrome.storage.local.set({ enabled: isEnabled }, updateUI);
    });
  }

  // ---------- Chat glow — CSS injection approach (very reliable) ----------
  const GLOW_STYLE_ID = 'ueda-chat-glow-style';

  function applyChatGlow(on) {
    // Remove existing style first
    const existing = document.getElementById(GLOW_STYLE_ID);
    if (existing) existing.remove();
    if (!on) return;

    // Inject a <style> tag that targets all possible Lovable chat selectors.
    // Using !important on every rule to override Lovable's own styles.
    // This approach is MUCH more reliable than DOM traversal.
    const style = document.createElement('style');
    style.id = GLOW_STYLE_ID;
    style.textContent = `
      /* UEDA EX — Chat Glow Border */

      /* Target 1: The main chat input container (Lovable v2 / new layout) */
      [data-testid="chat-input"],
      [data-testid="chat-input-container"],
      .chat-input-container,

      /* Target 2: Any div that directly wraps the main textarea */
      textarea[placeholder*="Lovable"]:not(#ueda-widget-container textarea),
      textarea[placeholder*="lovable"]:not(#ueda-widget-container textarea),
      textarea[placeholder*="Pergunte"]:not(#ueda-widget-container textarea),
      textarea[placeholder*="pergunte"]:not(#ueda-widget-container textarea),
      textarea[placeholder*="Ask"]:not(#ueda-widget-container textarea),
      textarea[placeholder*="ask"]:not(#ueda-widget-container textarea) {
        outline: 2px solid var(--ueda-accent,#1DAFD8) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 2px var(--ueda-accent,#1DAFD8), 0 0 20px color-mix(in oklab, var(--ueda-accent,#1DAFD8) 45%, transparent) !important;
        border-radius: 12px !important;
        transition: box-shadow 0.3s ease, outline 0.3s ease !important;
      }

      /* Target 3: Walk up 2 levels from textarea for Lovable's wrapper divs */
      #__next textarea[placeholder]:not(#ueda-widget-container *) ~ *,

      /* Target 4: Lovable-specific selectors (inspect-based) */
      .relative form,
      form.relative,
      [class*="chat"][class*="input"],
      [class*="ChatInput"],
      [class*="chat-form"] {
        box-shadow: 0 0 0 2px var(--ueda-accent,#1DAFD8), 0 0 20px color-mix(in oklab, var(--ueda-accent,#1DAFD8) 45%, transparent) !important;
        border-radius: 14px !important;
        transition: box-shadow 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);

    // ALSO try direct element targeting as backup
    setTimeout(() => {
      const allTextareas = document.querySelectorAll('textarea');
      for (const ta of allTextareas) {
        // Skip our own widget
        if (ta.closest('#ueda-widget-container')) continue;
        const ph = (ta.placeholder || '').toLowerCase();
        if (ph.length > 0) {
          // Walk up max 6 levels to find a good container
          let el = ta;
          for (let i = 0; i < 6; i++) {
            el = el.parentElement;
            if (!el || el === document.body) break;
            // Apply directly with setProperty
            el.style.setProperty('box-shadow', '0 0 0 2px var(--ueda-accent,#1DAFD8), 0 0 20px color-mix(in oklab, var(--ueda-accent,#1DAFD8) 45%, transparent)', 'important');
            el.style.setProperty('border-radius', '14px', 'important');
            el.style.setProperty('transition', 'box-shadow 0.3s ease', 'important');
            // Tag it so we can remove later
            el.dataset.uedaGlow = 'true';
          }
        }
      }
    }, 500);
  }

  // Re-try applying glow when DOM changes
  let glowRetryCount = 0;
  const domObserver = new MutationObserver(() => {
    // Re-apply glow if it was removed by Lovable's React re-renders
    if (isEnabled) {
      const glowStyle = document.getElementById(GLOW_STYLE_ID);
      if (!glowStyle && glowRetryCount < 5) {
        glowRetryCount++;
        applyChatGlow(true);
      }
    }
  });
  domObserver.observe(document.body, { childList: true, subtree: true });

  // ---------- Polling: update name, time, hide "Acesso Negado" ----------
  const pollInterval = setInterval(() => {
    try {
      if (!chrome.runtime?.id) { clearInterval(pollInterval); return; }
    } catch (_) { clearInterval(pollInterval); return; }

    // Aggressive cleanup: hide ⚠️ warning icon and "Acesso Negado" / expired key overlays
    try {
      // Strategy 1: hide any SVG/img that is purely decorative warning inside overlays
      document.querySelectorAll('svg, img').forEach(icon => {
        const parent = icon.parentElement;
        if (!parent || icon.closest('#ueda-widget-container')) return;
        // If the SVG contains a warning path or is orange/yellow colored
        const fill = icon.getAttribute('fill') || '';
        const color = icon.getAttribute('color') || '';
        const stroke = icon.getAttribute('stroke') || '';
        const style = icon.getAttribute('style') || '';
        const cls = (icon.className?.baseVal || icon.className || '').toString();
        const isWarning = fill.includes('fbbf') || fill.includes('f59e') || fill.includes('f97') ||
                         color.includes('orange') || color.includes('yellow') || color.includes('warn') ||
                         style.includes('orange') || style.includes('yellow') || style.includes('#f') ||
                         cls.includes('warn') || cls.includes('alert');
        // Also check if sibling text says expirou/inválida
        const siblingText = parent.textContent || '';
        if (isWarning && (siblingText.includes('expirou') || siblingText.includes('inválida') || siblingText.includes('Acesso'))) {
          icon.style.display = 'none';
        }
        // Brute force: hide any standalone triangle/warning SVG with no useful sibling text
        if (icon.tagName === 'svg' && parent && parent.children.length === 1) {
          const grandParentText = (parent.parentElement?.textContent || '').trim();
          if (grandParentText.includes('expirou') || grandParentText.includes('inválida') || grandParentText.includes('Acesso')) {
            icon.style.display = 'none';
          }
        }
      });

      // Strategy 2: remove ⚠️ text emoji and overlay text cleanup
      let isExpired = false;
      document.querySelectorAll('*').forEach(el => {
        if (el.children.length === 0 && (el.textContent.includes('Acesso Negado') || el.textContent.includes('expirou ou') || el.textContent.includes('inválida'))) {
          if (el.textContent.includes('⚠️') || el.textContent.includes('⚠')) {
            el.textContent = el.textContent.replace(/⚠️|⚠/g, '').trim();
          }
          if (el.textContent.includes('Acesso Negado')) {
            el.textContent = '';
          }
          const overlay = el.closest('[style*="position"]') || el.parentElement;
          if (overlay) {
            isExpired = true;
            if (el.textContent === '') {
              overlay.style.background = 'rgba(10,10,14,0.7)';
              overlay.style.backdropFilter = 'blur(4px)';
            }
            overlay.querySelectorAll('svg, img, [role="img"]').forEach(s => s.style.display = 'none');
          }
        }
      });
      
      const blocker = document.getElementById('lovable-chat-blocker');
      if (blocker || isExpired) {
        document.body.classList.add('ueda-is-expired');
      } else {
        document.body.classList.remove('ueda-is-expired');
      }
    } catch (_) {}

    chrome.storage.local.get(null, (result) => {
      if (chrome.runtime.lastError) return;

      // --- Name ---
      let name = 'Minha conta';
      const nameCandidates = ['userName','user','username','cliente','clientName','nome','name','owner','usuario'];
      for (const k of nameCandidates) {
        if (result[k] && typeof result[k] === 'string' && result[k].length < 40) {
          name = result[k]; break;
        }
      }
      if (name === 'Minha conta') {
        for (const k in result) {
          if (typeof result[k] === 'string' && result[k].length > 1 && result[k].length < 40 &&
              (k.toLowerCase().includes('user') || k.toLowerCase().includes('name') || k.toLowerCase().includes('cliente'))) {
            name = result[k]; break;
          }
        }
      }
      document.getElementById('ueda-user-name').textContent = name;

      // Welcome Sound Logic
      if (result.enabled && !hasPlayedWelcome) {
        hasPlayedWelcome = true;
        chrome.storage.local.set({ welcomePlayed: true });
        playSound('welcome');
      }

      // --- Time ---
      if (!result.enabled) {
        timeValue.textContent = 'Pausado';
        timeValue.style.color = '#ff6b6b';
        return;
      }

      // Procura por campos de data de validade/expiracao caso 'validade' não esteja presente
      let expiresMs = result.validade;
      if (!expiresMs || expiresMs === 'Sem validade') {
        const timeCandidates = ['expiration', 'expiresAt', 'expires', 'data_expiracao', 'validTime', 'time'];
        for (const k of timeCandidates) {
          if (result[k]) {
            expiresMs = result[k];
            break;
          }
        }
      }

      if (!expiresMs || expiresMs === 'Sem validade') {
        timeValue.textContent = 'Ilimitado';
        timeValue.style.color = '#22e5a0';
        return;
      }
      if (typeof expiresMs === 'string') {
        const parsed = new Date(expiresMs).getTime();
        if (!isNaN(parsed)) {
          expiresMs = parsed;
        } else {
          timeValue.textContent = expiresMs;
          timeValue.style.color = 'var(--ueda-accent,#1DAFD8)';
          return;
        }
      }

      const secsLeft = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      if (secsLeft <= 0) {
        timeValue.textContent = 'Expirado';
        timeValue.style.color = '#ff6b6b';
      } else {
        const days  = Math.floor(secsLeft / 86400);
        const hours = String(Math.floor((secsLeft % 86400) / 3600)).padStart(2, '0');
        const mins  = String(Math.floor((secsLeft % 3600) / 60)).padStart(2, '0');
        const secs  = String(secsLeft % 60).padStart(2, '0');
        timeValue.textContent = days > 0 ? `${days} dias restantes` : `${hours}:${mins}:${secs}`;
        timeValue.style.color = 'var(--ueda-accent,#1DAFD8)';
      }
    });
  }, 1000);

};

// Initial injection (retry until <body> exists)
(function ensureWidget() {
  if (!document.body) {
    return setTimeout(ensureWidget, 50);
  }
  try { window.__uedaWidgetInit(); } catch (e) {}
})();

// Keep-alive: re-inject if SPA removes the container
(function keepAlive() {
  const check = () => {
    if (document.body && !document.getElementById('ueda-widget-container')) {
      try { window.__uedaWidgetInit(); } catch (e) {}
    }
  };
  try {
    new MutationObserver(check).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch (e) {}
  // Safety fallback: poll every 2s in case the observer misses
  setInterval(check, 2000);
})();

