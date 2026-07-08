(function() {
  if (document.getElementById('ueda-widget-container')) return;

  const logoUrl = chrome.runtime.getURL('icon.png');
  const UPDATE_ENDPOINT = 'https://keqgzvcahsvseowfowwu.supabase.co/functions/v1/fn-sv03?check=updates';

  // ---- Remote config: greeting audio + chat SFX ----
  const chatAudio = new Audio();
  chatAudio.volume = 0.4;
  const welcomeAudio = new Audio();
  welcomeAudio.volume = 0.6;

  function playChatSfx() {
    try {
      chrome.storage.local.get(['uedaSoundMuted'], (r) => {
        if (r.uedaSoundMuted) return;
        if (!chatAudio.src) return;
        chatAudio.currentTime = 0;
        chatAudio.play().catch(() => {});
      });
    } catch (e) {}
  }

  function playWelcomeOnce() {
    try {
      chrome.storage.local.get(['uedaWelcomePlayedAt', 'uedaSoundMuted'], (r) => {
        if (r.uedaSoundMuted) return;
        if (Date.now() - (r.uedaWelcomePlayedAt || 0) < 6 * 3600 * 1000) return;
        if (!welcomeAudio.src) return;
        welcomeAudio.play().then(() => {
          chrome.storage.local.set({ uedaWelcomePlayedAt: Date.now() });
        }).catch(() => {});
      });
    } catch (e) {}
  }

  function attachChatListeners() {
    if (document.__uedaChatAttached) return;
    document.__uedaChatAttached = true;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      const t = e.target;
      if (!t) return;
      const tag = (t.tagName || '').toLowerCase();
      const isEditable = tag === 'textarea' || (t.getAttribute && t.getAttribute('contenteditable') === 'true');
      if (isEditable) playChatSfx();
    }, true);
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('button');
      if (!btn) return;
      const label = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.textContent || '')).toLowerCase();
      if (label.includes('send') || label.includes('enviar') || btn.type === 'submit') playChatSfx();
    }, true);
  }

  function setManagedStyle(id, cssText) {
    let style = document.getElementById(id);
    if (!cssText) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.documentElement.appendChild(style);
    }
    style.textContent = cssText;
  }

  function buildRuntimeChatCss(accent) {
    return `
      :root, body { --ueda-accent: ${accent}; }
      @keyframes ueda-chat-glow {
        0%, 100% { box-shadow: 0 0 0 2px ${accent}, 0 0 20px color-mix(in srgb, ${accent} 35%, transparent) !important; }
        50%      { box-shadow: 0 0 0 2px ${accent}, 0 0 32px color-mix(in srgb, ${accent} 60%, transparent) !important; }
      }
      body.ueda-monitor-on textarea[placeholder*="Lovable" i]:not(#ueda-widget-container textarea),
      body.ueda-monitor-on textarea[placeholder*="Pergunte" i]:not(#ueda-widget-container textarea),
      body.ueda-monitor-on textarea[placeholder*="Ask" i]:not(#ueda-widget-container textarea) {
        outline: 2px solid ${accent} !important;
        outline-offset: 2px !important;
        border-radius: 12px !important;
        animation: ueda-chat-glow 2.4s ease-in-out infinite !important;
        transition: outline-color .25s ease !important;
      }
      body.ueda-monitor-on form.relative,
      body.ueda-monitor-on .relative form,
      body.ueda-monitor-on [class*="ChatInput"],
      body.ueda-monitor-on [class*="chat-input"],
      body.ueda-monitor-on [data-testid="chat-input"],
      body.ueda-monitor-on [data-testid="chat-input-container"] {
        border-radius: 14px !important;
        animation: ueda-chat-glow 2.4s ease-in-out infinite !important;
      }
      @media (prefers-reduced-motion: reduce) {
        body.ueda-monitor-on [class*="chat"], body.ueda-monitor-on textarea { animation: none !important; }
      }
    `;
  }

  function applyDirectGlow(accent) {
    try {
      document.querySelectorAll('textarea').forEach((ta) => {
        if (ta.closest('#ueda-widget-container')) return;
        const ph = (ta.placeholder || '').toLowerCase();
        if (!ph) return;
        if (!/lovable|pergunte|ask/.test(ph)) return;
        let el = ta.parentElement;
        for (let i = 0; i < 3 && el && el !== document.body; i += 1) {
          el.style.setProperty('box-shadow', `0 0 0 2px ${accent}, 0 0 20px ${accent}55`, 'important');
          el.style.setProperty('border-radius', '14px', 'important');
          el.style.setProperty('transition', 'box-shadow .25s ease', 'important');
          el.dataset.uedaGlow = 'true';
          el = el.parentElement;
        }
      });
    } catch (e) {}
  }

  let currentAccent = '#1E88E5';
  function startChatHighlighter() {
    if (document.__uedaChatHighlighterStarted) return;
    document.__uedaChatHighlighterStarted = true;
    applyDirectGlow(currentAccent);
    setInterval(() => applyDirectGlow(currentAccent), 1500);
    try {
      const observer = new MutationObserver(() => applyDirectGlow(currentAccent));
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }


  function applyRemoteConfig(cfg) {
    if (!cfg) return;
    const sounds = (cfg.config && cfg.config.sounds) || cfg.sounds || {};
    if (sounds.chat) chatAudio.src = sounds.chat;
    if (sounds.welcome) {
      welcomeAudio.src = sounds.welcome;
      welcomeAudio.addEventListener('canplaythrough', playWelcomeOnce, { once: true });
    }
    const settings = cfg.settings || {};
    const accent = settings.brand_color || settings.widget_accent_color || cfg.accent || '#1E88E5';
    document.documentElement.style.setProperty('--ueda-accent', accent);
    document.body.style.setProperty('--ueda-accent', accent);
    if (container) container.style.setProperty('--ueda-accent', accent);
    currentAccent = accent;
    setManagedStyle('ueda-runtime-chat-css', buildRuntimeChatCss(accent));
    setManagedStyle('ueda-remote-custom-css', settings.chat_custom_css || settings.custom_css || cfg.custom_css || '');
    const helpLink = document.getElementById('ueda-menu-help');
    const supportUrl = settings.support_url || (settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : '');
    if (helpLink && supportUrl) helpLink.href = supportUrl;
    renderRemoteSkills(Array.isArray(cfg.skills) ? cfg.skills : []);
    attachChatListeners();
    startChatHighlighter();
    applyDirectGlow(accent);
  }

  function uedaToast(message, kind = 'success', ms = 3200) {
    try {
      const t = document.createElement('div');
      t.className = 'ueda-toast ueda-toast-' + kind;
      t.innerHTML = `
        <span class="ueda-toast-icon">${kind === 'success' ? '✓' : (kind === 'error' ? '!' : 'i')}</span>
        <span class="ueda-toast-msg"></span>
      `;
      t.querySelector('.ueda-toast-msg').textContent = message;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('ueda-toast-in'));
      setTimeout(() => {
        t.classList.remove('ueda-toast-in');
        setTimeout(() => t.remove(), 320);
      }, ms);
    } catch (e) {}
  }
  window.uedaToast = uedaToast;

  function cmpVer(a, b) {
    const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  }

  function injectRemoteCoreJs(code) {
    if (!code || typeof code !== 'string') return;
    if (document.__uedaCoreInjected === code) return;
    document.__uedaCoreInjected = code;
    try {
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.textContent = code;
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    } catch (e) {}
  }

  function showUpdateBadge(latest) {
    const btn = document.getElementById('ueda-menu-update');
    if (!btn) return;
    btn.classList.add('ueda-has-update');
    if (!btn.querySelector('.ueda-update-dot')) {
      const dot = document.createElement('span');
      dot.className = 'ueda-update-dot';
      dot.title = `Nova versão ${latest} disponível`;
      btn.appendChild(dot);
    }
  }

  async function fetchUpdateConfig({ announce = false } = {}) {
    const currentVersion = chrome.runtime.getManifest().version || '0.0.0';
    const response = await fetch(UPDATE_ENDPOINT, {
      cache: 'no-store',
      headers: { 'x-ext-version': currentVersion },
    });
    if (!response.ok) throw new Error(`Falha ao sincronizar (${response.status})`);
    const cfg = await response.json();
    applyRemoteConfig(cfg);
    if (cfg && typeof cfg.core_js === 'string') injectRemoteCoreJs(cfg.core_js);
    chrome.storage.local.set({ uedaRemoteConfig: cfg, uedaLastSyncAt: Date.now() });

    const latest = cfg && (cfg.version || (cfg.release && cfg.release.version));
    if (latest && cmpVer(latest, currentVersion) > 0) {
      showUpdateBadge(latest);
      if (announce) uedaToast(`Nova versão ${latest} disponível`, 'info', 4200);
    } else if (announce) {
      uedaToast('Extensão sincronizada com o servidor', 'success');
    }

    if (announce) applyDirectGlow(currentAccent);
    return cfg;
  }



  const html = `
    <div id="ueda-widget-container" class="ueda-collapsed">
      <div class="ueda-widget-menu">
        <div class="ueda-menu-header" id="ueda-menu-toggle">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span class="ueda-text" id="ueda-toggle-text">Expandir menu</span>
        </div>

        <div class="ueda-menu-item" style="cursor: default;">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <div class="ueda-text" style="display: flex; flex-direction: column;">
            <span id="ueda-user-name">Minha conta</span>
            <span id="ueda-time-value" style="font-size: 11px; color: #1E88E5; font-weight: bold; margin-top: 2px;">Calculando...</span>
            <span id="ueda-version-value" style="font-size: 10px; color: #6b7280; font-weight: 500; margin-top: 2px; letter-spacing: 0.05em;">v1.0</span>
          </div>
        </div>

        <div class="ueda-menu-item" id="ueda-menu-mode">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg> 
          <span class="ueda-text" id="ueda-mode-text">Modo Padrão</span>
        </div>

        <div id="ueda-remote-skills"></div>

        <div class="ueda-menu-item" id="ueda-menu-watermark">
          <svg viewBox="0 0 24 24"><path d="m7 21-4-4 12-12a3 3 0 0 1 4 4L7 21Z"></path><path d="M14 7 17 10"></path><path d="M5 19h16"></path></svg>
          <span class="ueda-text">Remover marca d'água</span>
        </div>

        <div class="ueda-menu-item" id="ueda-menu-update">
          <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span class="ueda-text">Atualizar extensão</span>
        </div>

        <a href="https://wa.me/5511999999999" target="_blank" class="ueda-menu-item" id="ueda-menu-help" style="text-decoration: none;">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> 
          <span class="ueda-text">Ajuda & Suporte</span>
        </a>


        <div class="ueda-menu-item ueda-text-red" id="ueda-menu-status">
          <svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg> 
          <span class="ueda-text" id="ueda-status-text">Logoff</span>
        </div>

      </div>
      <button class="ueda-widget-btn" id="ueda-fab" aria-label="Abrir opções UEDA EX" title="Abrir opções UEDA EX">
        <img src="${logoUrl}" alt="U" class="ueda-widget-logo">
      </button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const container = document.getElementById('ueda-widget-container');
  const fabBtn = document.getElementById('ueda-fab');
  const toggleBtn = document.getElementById('ueda-menu-toggle');
  const toggleText = document.getElementById('ueda-toggle-text');
  
  const timeValue = document.getElementById('ueda-time-value');
  const modeBtn = document.getElementById('ueda-menu-mode');
  const modeText = document.getElementById('ueda-mode-text');
  const statusBtn = document.getElementById('ueda-menu-status');
  const statusText = document.getElementById('ueda-status-text');
  
  const updateBtn = document.getElementById('ueda-menu-update');
  if (updateBtn) {
    updateBtn.addEventListener('click', async () => {
      const label = updateBtn.querySelector('.ueda-text');
      const originalLabel = label ? label.textContent : '';
      if (label) label.textContent = 'Atualizando...';
      let updated = false;
      try {
        await fetchUpdateConfig({ announce: true });
        updated = true;
        if (label) label.textContent = 'Atualizado';
      } catch (e) {
        await uedaConfirm(e && e.message ? e.message : 'Não foi possível sincronizar a extensão agora.', { okText: 'OK', cancelText: '' });
      } finally {
        if (label) setTimeout(() => { label.textContent = originalLabel || 'Atualizar extensão'; }, updated ? 1200 : 0);
      }
    });
  }

  const watermarkBtn = document.getElementById('ueda-menu-watermark');
  if (watermarkBtn) {
    watermarkBtn.addEventListener('click', () => {
      try {
        // Run remote command if present, otherwise fallback: hide "Made with Lovable" nodes.
        chrome.storage.local.get(['uedaRemoteConfig'], (r) => {
          const cmd = r && r.uedaRemoteConfig && r.uedaRemoteConfig.commands && r.uedaRemoteConfig.commands.remove_watermark;
          if (cmd) {
            injectRemoteCoreJs(cmd);
          } else {
            document.querySelectorAll('a[href*="lovable.dev"], [class*="badge"], [class*="watermark"]').forEach(el => {
              const txt = (el.textContent || '').toLowerCase();
              if (txt.includes('lovable') || txt.includes('made with')) el.style.display = 'none';
            });
          }
          uedaToast("Marca d'água removida!", 'success');
        });
      } catch (e) {
        uedaToast("Falha ao remover marca d'água", 'error');
      }
    });
  }

  let currentMode = "1";
  let isEnabled = true;

  function getSkillIcon(icon) {
    const key = String(icon || '').toLowerCase();
    if (key.includes('download')) return '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
    if (key.includes('eraser') || key.includes('marca')) return '<svg viewBox="0 0 24 24"><path d="m7 21-4-4 12-12a3 3 0 0 1 4 4L7 21Z"></path><path d="M14 7 17 10"></path><path d="M5 19h16"></path></svg>';
    if (key.includes('note') || key.includes('sticky')) return '<svg viewBox="0 0 24 24"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5Z"></path><path d="M15 3v6h6"></path></svg>';
    return '<svg viewBox="0 0 24 24"><path d="M9.9 10.8 8 15l-1.9-4.2L2 9l4.1-1.8L8 3l1.9 4.2L14 9l-4.1 1.8Z"></path><path d="M19 13l-1.2 2.8L15 17l2.8 1.2L19 21l1.2-2.8L23 17l-2.8-1.2L19 13Z"></path></svg>';
  }

  function escapeText(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function renderRemoteSkills(skills) {
    const target = document.getElementById('ueda-remote-skills');
    if (!target) return;
    target.innerHTML = skills.filter((skill) => String(skill.name || '').toLowerCase() !== 'logoff').map((skill) => `
      <div class="ueda-menu-item ueda-skill-item" title="${escapeText(skill.description || skill.name)}" data-skill-id="${escapeText(skill.id)}">
        ${getSkillIcon(skill.icon || skill.name)}
        <span class="ueda-text">${escapeText(skill.name)}</span>
      </div>
    `).join('');
  }

  function showIconMenu() {
    container.classList.add('ueda-visible');
    container.classList.add('ueda-collapsed');
    container.classList.remove('ueda-expanded');
    if (toggleText) toggleText.textContent = "Expandir menu";
  }

  function hideMenu() {
    container.classList.remove('ueda-visible');
    container.classList.remove('ueda-expanded');
    container.classList.add('ueda-collapsed');
    if (toggleText) toggleText.textContent = "Expandir menu";
  }

  function expandMenu() {
    container.classList.add('ueda-visible');
    container.classList.add('ueda-expanded');
    container.classList.remove('ueda-collapsed');
    if (toggleText) toggleText.textContent = "Recolher menu";
  }

  if (fabBtn) {
    fabBtn.addEventListener('click', () => {
      if (container.classList.contains('ueda-visible')) {
        hideMenu();
      } else {
        showIconMenu();
      }
    });
  }

  // Toggle expand/collapse
  toggleBtn.addEventListener('click', () => {
    if (container.classList.contains('ueda-expanded')) {
      showIconMenu();
    } else {
      expandMenu();
    }
  });

  chrome.storage.local.get(['enabled', 'mode', 'userName', 'user'], (result) => {
    isEnabled = result.enabled !== false;
    currentMode = result.mode || "1";
    
    const name = result.userName || result.user || "Minha conta";
    document.getElementById('ueda-user-name').textContent = name;

    try {
      const v = chrome.runtime.getManifest().version || '1.0';
      const ver = document.getElementById('ueda-version-value');
      if (ver) ver.textContent = 'v' + v;
    } catch (e) {}
    
    updateUI();
  });

  chrome.storage.local.get(['uedaRemoteConfig'], (result) => {
    if (result && result.uedaRemoteConfig) {
      applyRemoteConfig(result.uedaRemoteConfig);
      if (typeof result.uedaRemoteConfig.core_js === 'string') injectRemoteCoreJs(result.uedaRemoteConfig.core_js);
    }
    fetchUpdateConfig().catch(() => {});
  });

  // Auto-sync a cada 5 minutos — permite atualizar remotamente sem reinstalar
  setInterval(() => { fetchUpdateConfig().catch(() => {}); }, 5 * 60 * 1000);

  function updateUI() {
    modeText.textContent = currentMode === "2" ? "Modo Avançado" : "Modo Padrão";
    statusText.textContent = "Logoff";
    statusBtn.classList.add("ueda-text-red");
    statusBtn.classList.remove("ueda-text-green");
    // Monitor visual sempre ativo enquanto a sessão existir
    document.body.classList.add("ueda-monitor-on");
    startChatHighlighter();
  }

  modeBtn.addEventListener('click', () => {
    currentMode = currentMode === "1" ? "2" : "1";
    chrome.storage.local.set({ mode: currentMode }, updateUI);
  });

  function uedaConfirm(message, { okText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'ueda-modal-overlay';
      overlay.innerHTML = `
        <div class="ueda-modal" role="dialog" aria-modal="true">
          <img src="${logoUrl}" alt="" class="ueda-modal-logo" />
          <div class="ueda-modal-title">UEDA EX</div>
          <div class="ueda-modal-msg"></div>
          <div class="ueda-modal-actions">
            <button type="button" class="ueda-modal-btn ueda-modal-cancel"></button>
            <button type="button" class="ueda-modal-btn ueda-modal-ok"></button>
          </div>
        </div>`;
      overlay.querySelector('.ueda-modal-msg').textContent = message;
      overlay.querySelector('.ueda-modal-ok').textContent = okText;
      overlay.querySelector('.ueda-modal-cancel').textContent = cancelText;
      const close = (val) => { overlay.remove(); resolve(val); };
      overlay.querySelector('.ueda-modal-ok').addEventListener('click', () => close(true));
      overlay.querySelector('.ueda-modal-cancel').addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
      document.body.appendChild(overlay);
    });
  }
  // Expose so any extension alert can use it
  window.uedaAlert = (msg) => uedaConfirm(msg, { okText: 'OK', cancelText: '' });

  statusBtn.addEventListener('click', async () => {
    const ok = await uedaConfirm('Encerrar sessão da extensão UEDA EX?');
    if (!ok) return;
    try {
      chrome.storage.local.clear(() => {
        document.body.classList.remove('ueda-monitor-on');
        const el = document.getElementById('ueda-widget-container');
        if (el) el.remove();
        try { chrome.runtime.sendMessage({ action: 'logoff' }); } catch(e) {}
      });
    } catch(e) {
      document.getElementById('ueda-widget-container')?.remove();
    }
  });


  // Chat glow is now handled purely in CSS via body.ueda-monitor-on

  const pollInterval = setInterval(() => {
    // Hide the ugly "Acesso Negado" text and icon, but keep the chat blocked
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.includes('Acesso Negado')) {
          let container = node.parentElement;
          while (container && container !== document.body) {
             // Find the wrapper (usually has absolute positioning or flex layout blocking the chat)
             if (container.style.position === 'absolute' || container.style.zIndex || container.style.display === 'flex') {
                 node.nodeValue = ''; // Clear text
                 // Hide all SVGs inside the overlay (the warning icon)
                 const svgs = container.querySelectorAll('svg');
                 svgs.forEach(s => s.style.display = 'none');
                 
                 // Make the background look like a subtle disabled state
                 container.style.backgroundColor = 'rgba(20, 20, 20, 0.6)';
                 container.style.backdropFilter = 'grayscale(1) blur(4px)';
                 
                 // Remove any warning emojis
                 const warnWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
                 let wNode;
                 while ((wNode = warnWalker.nextNode())) {
                     if (wNode.nodeValue.includes('⚠️')) wNode.nodeValue = wNode.nodeValue.replace('⚠️', '');
                 }
                 break;
             }
             container = container.parentElement;
          }
        }
      }
    } catch(e) {}

    try {
      if (!chrome.runtime.id) {
        clearInterval(pollInterval);
        return;
      }

      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) return;
        
        let name = result.userName || result.user || result.username || result.cliente || result.clientName || result.nome || result.name || result.owner || result.usuario || "Minha conta";
        // fallback search for any key with 'user' or 'name' that is a string
        if (name === "Minha conta") {
          for (let k in result) {
             if (typeof result[k] === 'string' && result[k].toLowerCase() === 'magda') name = result[k]; // hack if we can't find it
             if (typeof result[k] === 'string' && (k.toLowerCase().includes('user') || k.toLowerCase().includes('name') || k.toLowerCase().includes('cliente'))) {
               if (result[k] && result[k].length < 30) {
                 name = result[k];
                 break;
               }
             }
          }
        }
        document.getElementById('ueda-user-name').textContent = name;

        if (!result.enabled) {
          timeValue.textContent = 'Pausado';
          timeValue.style.color = '#ff8b8b';
          return;
        }
        
        if (!result.validade || result.validade === 'Sem validade') {
          timeValue.textContent = 'Ilimitado';
          timeValue.style.color = '#70f0c1';
          return;
        }

        let validadeTime = result.validade;
        if (typeof validadeTime === 'string') {
          const parsed = new Date(validadeTime).getTime();
          if (!isNaN(parsed)) {
            validadeTime = parsed;
          } else {
            // fallback if it's really a custom string like "29d 21h..."
            timeValue.textContent = validadeTime;
            timeValue.style.color = '#1E88E5';
            return;
          }
        }

        const now = new Date().getTime();
        const timeLeft = Math.max(0, Math.floor((validadeTime - now) / 1000));
        
        if (timeLeft <= 0) {
          timeValue.textContent = 'Expirado';
          timeValue.style.color = '#ff8b8b';
        } else {
          const days = Math.floor(timeLeft / (3600 * 24));
          const hours = String(Math.floor((timeLeft % (3600 * 24)) / 3600)).padStart(2, '0');
          const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
          
          if (days > 0) {
             timeValue.textContent = `${days} dias restantes`;
          } else {
             const seconds = String(timeLeft % 60).padStart(2, '0');
             timeValue.textContent = `${hours}:${minutes}:${seconds}`;
          }
          timeValue.style.color = '#1E88E5';
        }
      });
    } catch (e) {
      if (e.message && e.message.includes('Extension context invalidated')) {
        clearInterval(pollInterval);
      }
    }
  }, 1000);

})();
