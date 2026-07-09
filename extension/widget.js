(function() {
  if (document.getElementById('ueda-widget-container')) return;

  const logoUrl = chrome.runtime.getURL('logo.png');

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
            <span id="ueda-time-value" style="color:#1DAFD8; font-size:11px; font-weight:600; margin-top:2px;">Calculando...</span>
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
          <span class="ueda-item-text">Atualizar extensão</span>
        </div>

        <a href="https://wa.me/5511999999999" target="_blank" class="ueda-menu-item" style="text-decoration:none;">
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
  const soundBtn   = document.getElementById('ueda-menu-sound');
  const soundText  = document.getElementById('ueda-sound-text');
  const rmvMarkBtn = document.getElementById('ueda-menu-remove-watermark');

  let isEnabled  = true;
  let isSoundEnabled = true;
  let hasPlayedWelcome = false;
  let chatGlowEl = null;
  
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

  function renderSkills(skills) {
    if (!skillsList) return;
    // Toggle is hidden from end users; management lives in the admin skills panel.
    skillsList.innerHTML = skills.map(s => {
      return '<div class="ueda-menu-item ueda-skill-row" data-skill-id="' + s.id + '">' +
        iconSvg(s.icon || 'Sparkles') +
        '<span class="ueda-item-text">' + (s.name || 'Skill') + '</span>' +
        '</div>';
    }).join('');
  }

  // Apply server-driven layout/branding (color + custom CSS + commands)
  let __uedaStyleEl = null;
  function applyServerLayout(data) {
    try {
      const s = (data && data.settings) || {};
      const color = s.widget_accent_color || s.brand_color;
      if (color) document.documentElement.style.setProperty('--ueda-accent', color);
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
    } catch (e) { console.log('[UEDA] applyServerLayout error', e); }
  }

  function loadSkillsFromServer() {
    chrome.storage.local.get(['licenseKey'], (r) => {
      fetch(SERVER_URL + '?check=updates', {
        headers: { 'x-license-key': r.licenseKey || '', 'x-ext-version': '5.0.0' }
      })
        .then(res => res.json())
        .then(data => {
          applyServerLayout(data);
          if (data && Array.isArray(data.skills)) {
            const active = data.skills.filter(s => s.status ? s.status === 'active' : true);
            renderSkills(active);
          }
          if (data && data.update_required && data.release && data.release.download_url) {
            console.log('[UEDA] Nova versão disponível:', data.version, data.release.download_url);
          }
        })
        .catch(err => console.log('[UEDA] Falha ao carregar skills:', err));
    });
  }
  loadSkillsFromServer();
  setInterval(loadSkillsFromServer, 5 * 60 * 1000);
  window.addEventListener('focus', loadSkillsFromServer);


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
    updateBtn.addEventListener('click', () => {
      try { chrome.runtime.sendMessage({ action: 'reload_extension' }); } catch (_) {}
      setTimeout(() => window.location.reload(), 300);
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
        outline: 2px solid #1DAFD8 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 2px #1DAFD8, 0 0 20px rgba(29,175,216,0.4) !important;
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
        box-shadow: 0 0 0 2px #1DAFD8, 0 0 20px rgba(29,175,216,0.4) !important;
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
            el.style.setProperty('box-shadow', '0 0 0 2px #1DAFD8, 0 0 20px rgba(29,175,216,0.4)', 'important');
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
          timeValue.style.color = '#1DAFD8';
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
        timeValue.style.color = '#1DAFD8';
      }
    });
  }, 1000);

})();
