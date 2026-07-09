import { useMemo, useState } from "react";
import widgetCss from "../../extension/widget.css?raw";
import popupCss from "../../extension/popup.css?raw";
import logoAsset from "@/assets/ueda-logo.png.asset.json";

export type ExtensionPreviewState = "collapsed" | "login" | "labels" | "account";

export type ExtensionPreviewSettings = {
  brand_name: string;
  brand_color: string;
  welcome_message: string;
  footer_signature: string;
  chat_custom_css?: string;
};

export type ExtensionPreviewSkill = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  payload?: string | null;
  display_order?: number | null;
  parent_id?: string | null;
};

type ExtensionLivePreviewProps = {
  settings: ExtensionPreviewSettings;
  skills: ExtensionPreviewSkill[];
  state?: ExtensionPreviewState;
  onStateChange?: (state: ExtensionPreviewState) => void;
};

type View = "widget" | "chat" | "login" | "account";

const VIEW_LABELS: Record<View, string> = {
  widget: "Widget",
  chat: "Chat",
  login: "Ativação",
  account: "Conta ativa",
};

export function ExtensionLivePreview({ settings, skills }: ExtensionLivePreviewProps) {
  const [view, setView] = useState<View>("widget");
  const [bg, setBg] = useState<"dark" | "light">("dark");
  const srcDoc = useMemo(() => {
    if (view === "chat") return buildChatDocument(settings);
    if (view === "login") return buildLoginDocument(settings, false);
    if (view === "account") return buildLoginDocument(settings, true);
    return buildPreviewDocument(settings, skills, bg);
  }, [settings, skills, view, bg]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Prévia sincronizada
        </div>
        <div className="inline-flex rounded-lg border border-border bg-background p-1 text-xs font-semibold">
          {(Object.keys(VIEW_LABELS) as View[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`rounded-md px-3 py-1.5 transition-colors ${view === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {VIEW_LABELS[item]}
            </button>
          ))}
        </div>
      </div>

      {view === "widget" && (
        <div className="mb-3 flex justify-end">
          <div className="inline-flex rounded-lg border border-border bg-background p-1 text-xs font-semibold">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setBg(mode)}
                className={`rounded-md px-3 py-1 transition-colors ${bg === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {mode === "light" ? "☀ Claro" : "🌙 Escuro"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-muted">
        <iframe
          key={view}
          title="Prévia real da extensão"
          srcDoc={srcDoc}
          className="h-[680px] w-full border-0"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        {view === "widget"
          ? "Clique na logo flutuante e depois na seta para expandir o menu."
          : view === "chat"
            ? "Prévia da borda aplicada ao bloco de chat quando a extensão está ativa."
          : view === "login"
            ? "Painel de ativação exibido ao usuário antes de inserir a chave."
            : "Painel exibido após ativação — dados da conta e tempo restante."}
      </p>
    </div>
  );
}

function buildChatDocument(settings: ExtensionPreviewSettings) {
  const accent = normalizeHexColor(settings.brand_color);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; min-height: 100%; background: #20201f; color: #f7f7f4; overflow: hidden; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { display: flex; align-items: end; padding: 26px 22px; }
      ${widgetCss}
      .lovable-chat-shell { width: min(100%, 720px); margin: 0 auto; }
      .lovable-chip-row { display: flex; gap: 8px; margin: 0 0 8px; overflow: hidden; }
      .lovable-chip { flex: 0 0 auto; height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.22); background: #242424; color: #f3f3f0; display: inline-flex; align-items: center; font-size: 13px; font-weight: 700; box-shadow: inset 0 1px 0 rgba(255,255,255,.05); }
      .lovable-chip.is-muted { color: #777; }
      .lovable-chat-box { min-height: 108px; border: 1px solid rgba(255,255,255,.08); border-radius: 18px; background: #282927; display: flex; flex-direction: column; justify-content: space-between; padding: 18px 14px 12px; }
      .lovable-chat-box textarea { width: 100%; min-height: 42px; resize: none; border: 0; outline: 0; background: transparent; color: #f4f4f2; font: inherit; font-size: 16px; line-height: 1.45; }
      .lovable-chat-box textarea::placeholder { color: #b8b8b4; }
      .lovable-chat-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .lovable-icon-btn { width: 28px; height: 28px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: #3a3a38; color: #f7f7f4; display: inline-grid; place-items: center; }
      .lovable-action-group { display: flex; align-items: center; gap: 8px; }
      .lovable-build { border: 0; background: transparent; color: #f5f5f2; font-size: 13px; font-weight: 700; }
      .lovable-send { background: #9a9a96; color: #111; }
      svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; }
      /* Override widget.css chat glow so it responds ao brand_color */
      .ueda-chat-glow-active {
        box-shadow: 0 0 0 2px ${accent}, 0 0 24px ${accent}59 !important;
        border-radius: 18px !important;
        transition: box-shadow 0.3s ease !important;
      }
      ${settings.chat_custom_css || ""}
    </style>
  </head>
  <body class="ueda-monitor-on" style="--ueda-accent:${accent}">
    <main class="lovable-chat-shell" aria-label="Prévia do chat Lovable">
      <div class="lovable-chip-row">
        <span class="lovable-chip">Ajustar efeito 3D</span>
        <span class="lovable-chip">Animações nas células</span>
        <span class="lovable-chip">Adicionar placar e reset</span>
        <span class="lovable-chip is-muted">Status do</span>
      </div>
      <form class="lovable-chat-box ueda-chat-active ueda-chat-glow-active" style="--ueda-accent:${accent}">
        <textarea placeholder="Pergunte à Lovable..." aria-label="Pergunte à Lovable"></textarea>
        <div class="lovable-chat-actions">
          <button class="lovable-icon-btn" type="button" aria-label="Adicionar"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
          <div class="lovable-action-group">
            <button class="lovable-icon-btn" type="button" aria-label="Melhorar prompt"><svg class="lucide-wand" viewBox="0 0 24 24"><path d="M15 4V2M15 16v-2M8 9H6M20 9h-2M17.8 6.2 19 5M11 13l-6 6M13 11l-2-2 6-6 2 2-6 6Z"/></svg></button>
            <button class="lovable-build" type="button">Construir</button>
            <button class="lovable-icon-btn" type="button" aria-label="Microfone"><svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg></button>
            <button class="lovable-icon-btn lovable-send" type="button" aria-label="Enviar"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
          </div>
        </div>
      </form>
    </main>
  </body>
</html>`;
}

function buildLoginDocument(settings: ExtensionPreviewSettings, activated: boolean) {
  const brand = escapeHtml(settings.brand_name || "UEDA EX 5.0");
  const welcome = escapeHtml(settings.welcome_message || "Insira sua chave para ativar a extensão.");
  const footer = escapeHtml(settings.footer_signature || "UEDA AGENCY · v5.0");
  const logo = escapeAttr(logoAsset.url);
  const accent = normalizeHexColor(settings.brand_color);
  const accentGlow = `${accent}47`; // ~28% alpha

  const loginHtml = `
    <div class="card" id="loginView">
      <div class="card-top">
        <img src="${logo}" class="card-logo" alt="${escapeAttr(brand)}" />
        <button class="theme-btn" type="button" aria-label="Alternar tema">
          <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
      </div>
      <p class="card-sub">${welcome}</p>
      <input type="text" class="key-input" placeholder="Sua chave de licença..." />
      <button class="activate-btn" type="button">Ativar Licença</button>
      <a class="support-link" href="#" onclick="return false">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="#25D366" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592"/>
        </svg>
        Suporte: 77 99913-4858
      </a>
      <span class="card-footer">${footer}</span>
    </div>`;

  const activatedHtml = `
    <div class="card" id="homeView">
      <div class="card-top">
        <img src="${logo}" class="card-logo" alt="${escapeAttr(brand)}" />
        <button class="theme-btn" type="button" aria-label="Alternar tema">
          <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
      </div>
      <p class="home-name">${brand}</p>
      <p class="home-validity">28 dias restantes</p>
      <p class="home-desc">Use o ícone flutuante <strong>na tela do site</strong> para gerenciar a extensão.</p>
      <div class="monitor-row">
        <span class="monitor-label">Monitor</span>
        <button class="pill on" type="button"></button>
      </div>
      <button class="logout-btn" type="button">Sair da conta</button>
    </div>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --accent: ${accent};
    --accent-glow: ${accentGlow};
    --bg: #10121c;
    --surface: #181a26;
    --surface2: #1e2133;
    --border: ${accent}4D;
    --text: #e2e8f0;
    --text-muted: #6a7590;
    --input-bg: #0d0f1a;
    --input-border: ${accent}38;
    --btn-text: #ffffff;
    --support-bg: #0d0f1a;
    --support-border: rgba(255,255,255,0.06);
    --support-text: #6a7590;
    --logout-border: rgba(255,90,90,0.22);
    --logout-text: #ff6b6b;
    --shadow: 0 8px 40px rgba(0,0,0,0.55), 0 0 28px var(--accent-glow);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; font-family: 'Montserrat', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  body {
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    background:
      radial-gradient(140% 80% at 80% -10%, ${accent}40, transparent 42%),
      radial-gradient(120% 70% at -10% 100%, ${accent}38, transparent 45%),
      linear-gradient(180deg, #000000 0%, #10121c 100%);
  }
  .card {
    width: 320px;
    background: var(--bg);
    border-radius: 22px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    padding: 28px 22px 22px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .card-top { width: 100%; display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 16px; }
  .card-logo { width: 46px; height: 46px; object-fit: contain; filter: drop-shadow(0 0 10px var(--accent-glow)); }
  .theme-btn {
    position: absolute; right: 0; top: 0;
    width: 30px; height: 30px; border-radius: 50%;
    background: var(--surface2);
    border: 1px solid var(--support-border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted);
  }
  .theme-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .card-sub {
    font-size: 12px; color: var(--text-muted); text-align: center;
    margin-bottom: 18px; line-height: 1.55; font-weight: 500; letter-spacing: 0.01em;
  }
  .key-input {
    width: 100%; padding: 11px 14px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 11px; color: var(--text);
    font-size: 13px; font-family: inherit; font-weight: 500;
    outline: none; margin-bottom: 10px;
  }
  .key-input::placeholder { color: var(--text-muted); }
  .activate-btn {
    width: 100%; padding: 12px;
    background: var(--accent);
    border: none; border-radius: 11px;
    color: var(--btn-text);
    font-size: 13px; font-weight: 700; font-family: inherit;
    letter-spacing: 0.02em; cursor: pointer; margin-bottom: 10px;
    box-shadow: 0 4px 18px ${accent}61;
  }
  .support-link {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 10px;
    background: var(--support-bg);
    border: 1px solid var(--support-border);
    border-radius: 11px; color: var(--support-text);
    font-size: 12px; font-family: inherit; font-weight: 600;
    text-decoration: none; margin-bottom: 16px;
  }
  .card-footer {
    font-size: 10px; color: var(--text-muted);
    letter-spacing: 1.2px; text-transform: uppercase;
    font-weight: 600; opacity: 0.5;
  }
  .home-name { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; text-align: center; }
  .home-validity { font-size: 12px; font-weight: 600; color: var(--accent); margin-bottom: 16px; }
  .home-desc { font-size: 12px; color: var(--text-muted); line-height: 1.6; text-align: center; margin-bottom: 18px; }
  .home-desc strong { color: var(--text); }
  .monitor-row {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 12px 14px;
    background: var(--surface);
    border: 1px solid var(--support-border);
    border-radius: 12px; margin-bottom: 10px;
  }
  .monitor-label { font-size: 13px; font-weight: 700; color: var(--text); }
  .pill {
    position: relative; width: 44px; height: 24px;
    background: var(--surface2); border-radius: 100px;
    cursor: pointer; border: none; outline: none; flex-shrink: 0;
  }
  .pill.on { background: var(--accent); }
  .pill::after {
    content: ''; position: absolute; top: 3px; left: 3px;
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; transition: transform 0.25s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  }
  .pill.on::after { transform: translateX(20px); }
  .logout-btn {
    width: 100%; padding: 10px;
    background: transparent;
    border: 1px solid var(--logout-border);
    border-radius: 11px; color: var(--logout-text);
    font-size: 12px; font-family: inherit; font-weight: 600;
    cursor: pointer;
  }
</style></head><body>${activated ? activatedHtml : loginHtml}</body></html>`;
}



function buildPreviewDocument(settings: ExtensionPreviewSettings, skills: ExtensionPreviewSkill[], bg: "dark" | "light" = "dark") {
  const accent = normalizeHexColor(settings.brand_color);
  const brand = escapeHtml(settings.brand_name || "UEDA EX 5.0");
  const logo = escapeAttr(logoAsset.url);

  // Mirror widget.js exactly: server-driven skills only (no placeholders here)
  const topSkills = skills.filter((skill) => !skill.parent_id).slice(0, 8);
  const skillItems = topSkills.map((skill) => {
    const children = skills.filter((child) => child.parent_id === skill.id);
    const hasChildren = children.length > 0;
    const parent = `
      <div class="ueda-menu-item ueda-skill-row"${hasChildren ? " data-has-children=\"1\"" : ""}>
        ${iconByName(skill.icon || "Sparkles")}
        <span class="ueda-item-text">${escapeHtml(skill.name)}</span>
        ${hasChildren ? '<svg class="ueda-sk-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;transition:transform .2s"><polyline points="6 9 12 15 18 9"></polyline></svg>' : ""}
      </div>`;

    const submenu = hasChildren
      ? `<div class="ueda-skill-sub" style="display:block;padding-left:16px;border-left:2px solid rgba(255,255,255,.08);margin:2px 0 4px 12px;">
          ${children.map((child) => `
            <div class="ueda-menu-item ueda-skill-row" style="padding-left:10px">
              ${iconByName(child.icon || "Sparkles")}
              <span class="ueda-item-text">${escapeHtml(child.name)}</span>
            </div>`).join("")}
        </div>`
      : "";

    return parent + submenu;
  }).join("");

  const bgStyles = bg === "light"
    ? `background: linear-gradient(135deg,#f4f6fb,#e6ebf2); }
       body::before { content:""; position:fixed; inset:0; background: radial-gradient(circle at 88% 92%, ${accent}22, transparent 36%); }`
    : `background:#0b1220; }
       body::before { content:""; position:fixed; inset:0; background: radial-gradient(circle at 88% 92%, ${accent}30, transparent 32%), linear-gradient(135deg,#0b1220,#141b2e); }`;
  const hintColor = bg === "light" ? "#475569" : "#94a3b8";

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  html,body { margin:0; height:100%; overflow:hidden; ${bgStyles}
  ${widgetCss}
  #ueda-widget-container { --ueda-accent: ${accent}; }
  .preview-hint { position: fixed; left:24px; top:24px; color:${hintColor}; font-size:11px; letter-spacing:.1em; text-transform:uppercase; z-index: 1; }
</style></head>
<body>
  <div class="preview-hint">Prévia • widget real da extensão</div>
  <div id="ueda-widget-container">
    <div class="ueda-widget-menu">
      <div class="ueda-menu-header" id="ueda-menu-toggle">
        ${iconChevron()}
        <span class="ueda-menu-header-text">Recolher menu</span>
      </div>

      <div class="ueda-menu-item" style="cursor:default;">
        ${iconUser()}
        <div class="ueda-account-info">
          <span style="color:#e2e8f0;font-weight:600;font-size:13px;line-height:1.2;">${brand}</span>
          <span style="color:${accent};font-size:11px;font-weight:600;margin-top:2px;">28 dias restantes</span>
        </div>
      </div>

      <div class="ueda-menu-item ueda-text-green">
        ${iconVolume()}
        <span class="ueda-item-text">Som ON</span>
      </div>

      ${skillItems}

      <div class="ueda-menu-item">
        ${iconRefresh()}
        <span class="ueda-item-text">Atualizar extensão</span>
      </div>

      <div class="ueda-menu-item">
        ${iconHelp()}
        <span class="ueda-item-text">Ajuda &amp; Suporte</span>
      </div>

      <div class="ueda-menu-item ueda-text-green">
        ${iconPower()}
        <span class="ueda-item-text">Monitor ON</span>
      </div>
    </div>

    <button class="ueda-widget-btn" id="ueda-main-btn" title="${escapeAttr(brand)}">
      <img src="${logo}" alt="UEDA" class="ueda-widget-logo"/>
    </button>
  </div>
  <script>
    (function(){
      var c = document.getElementById('ueda-widget-container');
      var btn = document.getElementById('ueda-main-btn');
      var header = document.getElementById('ueda-menu-toggle');
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        if (c.classList.contains('ueda-open')) {
          c.classList.remove('ueda-open','ueda-expanded');
        } else {
          c.classList.add('ueda-open');
        }
      });
      header.addEventListener('click', function(e){
        e.stopPropagation();
        c.classList.toggle('ueda-expanded');
      });
      document.addEventListener('click', function(e){
        if (!c.contains(e.target)) c.classList.remove('ueda-open','ueda-expanded');
      });
      setTimeout(function(){ c.classList.add('ueda-open','ueda-expanded'); }, 250);
    })();
  </script>
</body></html>`;
}

function iconVolume() { return svg(`<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>`); }

function svg(paths: string) { return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`; }
function iconChevron() { return svg(`<polyline points="15 18 9 12 15 6"></polyline>`); }
function iconUser() { return svg(`<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>`); }
function iconRefresh() { return svg(`<polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>`); }
function iconHelp() { return svg(`<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>`); }
function iconPower() { return svg(`<path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line>`); }
function iconSparkles() { return svg(`<path d="M9.9 10.8 8 15l-1.9-4.2L2 9l4.1-1.8L8 3l1.9 4.2L14 9l-4.1 1.8Z"></path>`); }
const SKILL_ICON_PATHS: Record<string, string> = {
  Sparkles: `<path d="M12 3l1.9 4.2L18 9l-4.1 1.8L12 15l-1.9-4.2L6 9l4.1-1.8z"/><path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`,
  Zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  Bell: `<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>`,
  Download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
  FileText: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>`,
  Edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>`,
  Shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  Star: `<polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 8.9 8.5 12 2"/>`,
  Rocket: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>`,
  Palette: `<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 1 0 10 10c0-2-2-2-2-4s2-2 2-4a6 6 0 0 0-10-4z"/>`,
  Volume: `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`,
  Bookmark: `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`,
};
function iconByName(name: string) { return svg(SKILL_ICON_PATHS[name] || SKILL_ICON_PATHS.Sparkles); }

function normalizeHexColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#4fa1c9";
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
