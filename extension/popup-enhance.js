    (function () {
      'use strict';

      /* ── Theme ────────────────────────────────── */
      const THEME_KEY = 'ueda_theme';
      const root = document.documentElement;

      function applyTheme(t) {
        root.setAttribute('data-theme', t);
        const isDark = t === 'dark';
        ['iconMoon','iconMoonHome'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = isDark ? 'block' : 'none';
        });
        ['iconSun','iconSunHome'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = isDark ? 'none' : 'block';
        });
        localStorage.setItem(THEME_KEY, t);
      }

      function toggleTheme() {
        const current = root.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      }

      // Load saved theme (or system preference)
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) {
        applyTheme(saved);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
      }

      document.getElementById('themeBtn').addEventListener('click', toggleTheme);
      document.getElementById('themeBtnHome').addEventListener('click', toggleTheme);

      /* ── Monitor toggle ────────────────────────── */
      const monitorPill = document.getElementById('monitorToggle');
      const enabledCb   = document.getElementById('enabled');

      function syncPill() {
        monitorPill.classList.toggle('on', !!enabledCb.checked);
      }

      monitorPill.addEventListener('click', () => {
        enabledCb.checked = !enabledCb.checked;
        enabledCb.dispatchEvent(new Event('change'));
        syncPill();
      });
      enabledCb.addEventListener('change', syncPill);
      syncPill();

      /* ── Home view: name & validity ─────────────── */
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(null, (r) => {
            const nameKeys = ['userName','user','username','cliente','nome','name'];
            let name = 'Minha conta';
            for (const k of nameKeys) {
              if (r[k] && typeof r[k] === 'string' && r[k].length < 50) { name = r[k]; break; }
            }
            const nameEl = document.getElementById('userName');
            if (nameEl) nameEl.textContent = name;

            const valEl = document.getElementById('userValidity');
            if (valEl) {
              const v = r.validade;
              if (!v || v === 'Sem validade') {
                valEl.textContent = 'Ilimitado ✓';
                valEl.style.color = '#22e5a0';
              } else {
                const ms = typeof v === 'string' ? new Date(v).getTime() : Number(v);
                const days = Math.max(0, Math.floor((ms - Date.now()) / 86400000));
                if (days <= 0) {
                  valEl.textContent = 'Expirado';
                  valEl.style.color = '#ff6b6b';
                } else {
                  valEl.textContent = `${days} dias restantes`;
                  valEl.style.color = days <= 5 ? '#f59e0b' : 'var(--accent)';
                }
              }
            }
            syncPill();
          });
        }
      } catch (_) {}

      /* ── Detect activation success → show msg + auto-close ── */
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
          let closed = false;
          const showActivated = () => {
            if (closed) return;
            closed = true;
            const msg = document.getElementById('loginMsg');
            if (msg) {
              msg.textContent = '✓ Chave ativada com sucesso!';
              msg.className = 'msg success';
            }
            const btn = document.getElementById('loginButton');
            if (btn) { btn.textContent = 'Ativada ✓'; btn.disabled = true; }
            setTimeout(() => { try { window.close(); } catch (_) {} }, 1600);
          };
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            const s = changes.authStatus;
            if (s && s.newValue === 'success') showActivated();
            const k = changes.keyValid;
            if (k && k.newValue === true) showActivated();
          });
        }
      } catch (_) {}
    })();
