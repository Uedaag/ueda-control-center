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
  const logo = escapeAttr(logoAsset.url);

  const loginHtml = `
    <section id="loginView" class="login-wrapper new-login-wrapper">
      <div class="login-centered-box">
        <div class="login-top-icons">
          <div class="login-logo-container">
            <img src="${logo}" class="login-logo-img" alt="Logo" />
          </div>
        </div>
        <p class="login-subtitle">${welcome}</p>
        <form class="login-form-new" onsubmit="return false">
          <input type="text" class="login-input-new" placeholder="Sua chave de licença..." />
          <button class="login-button-new" type="button">Ativar Licença</button>
        </form>
        <a class="login-support-new">Suporte</a>
        <p class="login-footer-text">${brand} - v5.0</p>
      </div>
    </section>`;

  const accent = normalizeHexColor(settings.brand_color);
  const activatedHtml = `
    <div class="activated-toast" role="status">
      <div class="activated-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="activated-text">
        <strong>Chave ativada com sucesso</strong>
        <span>${brand} atualizado — este painel será fechado.</span>
      </div>
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    ${popupCss}
    html, body { width: 100%; height: 100%; margin:0; }
    body { display: flex; align-items: center; justify-content: center; padding: 20px; background:#0b1220; }
    .app-shell { width: ${activated ? "280px" : "320px"}; display:flex; align-items:center; justify-content:center; }
    .activated-toast {
      width: 100%;
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px;
      background: rgba(20,32,44,0.92);
      border: 1px solid ${accent}55;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px ${accent}22 inset;
      color: #e6edf7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .activated-icon {
      width: 34px; height: 34px; border-radius: 50%;
      display:flex;align-items:center;justify-content:center;
      background: ${accent}22; color: ${accent}; flex:0 0 34px;
    }
    .activated-icon svg { width: 18px; height: 18px; }
    .activated-text { display:flex; flex-direction:column; gap: 2px; min-width: 0; }
    .activated-text strong { font-size: 13px; font-weight: 700; color:#fff; }
    .activated-text span { font-size: 11.5px; color:#a8b2c8; line-height:1.35; }
  </style></head><body>
    <main class="app-shell">${activated ? activatedHtml : loginHtml}</main>
  </body></html>`;
}



function buildPreviewDocument(settings: ExtensionPreviewSettings, skills: ExtensionPreviewSkill[], bg: "dark" | "light" = "dark") {
  const accent = normalizeHexColor(settings.brand_color);
  const brand = escapeHtml(settings.brand_name || "UEDA EX 5.0");
  const logo = escapeAttr(logoAsset.url);

  const skillItems = (skills.length ? skills : [
    { id: "_p1", name: "Atalhos", icon: "Zap" },
    { id: "_p2", name: "Notificações", icon: "Bell" },
    { id: "_p3", name: "Baixar projeto", icon: "Download" },
    { id: "_p4", name: "Remover marca", icon: "Edit" },
  ]).slice(0, 8).map((s, i) => `
    <div class="ueda-menu-item ueda-skill-item${i === 2 ? " is-active" : ""}">
      ${iconByName(s.icon || "Sparkles")}
      <span class="ueda-item-text">${escapeHtml(s.name)}</span>
    </div>`).join("");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  html,body { margin:0; height:100%; background:#0b1220; overflow:hidden; }
  body::before { content:""; position:fixed; inset:0; background: radial-gradient(circle at 88% 92%, ${accent}30, transparent 32%), linear-gradient(135deg,#0b1220,#141b2e); }
  ${widgetCss}
  #ueda-widget-container { --ueda-accent: ${accent}; }
  .preview-hint { position: fixed; left:24px; top:24px; color:#94a3b8; font-size:11px; letter-spacing:.1em; text-transform:uppercase; z-index: 1; }
</style></head>
<body>
  <div class="preview-hint">Prévia • Widget flutuante (canto inferior direito)</div>
  <div id="ueda-widget-container">
    <div class="ueda-widget-menu">
      <div class="ueda-menu-header">${iconChevron()}</div>
      <div class="ueda-menu-item" style="cursor:default;">
        ${iconUser()}
        <div class="ueda-account-info">
          <span style="color:#e2e8f0;font-weight:700;font-size:13px;line-height:1.2;">${brand}</span>
          <span style="font-size:11px;color:${accent};font-weight:700;margin-top:2px;">Licença ativa</span>
        </div>
      </div>
      ${skillItems}
      <div class="ueda-menu-item">${iconRefresh()}<span class="ueda-item-text">Atualizar extensão</span></div>
      <div class="ueda-menu-item">${iconHelp()}<span class="ueda-item-text">Ajuda &amp; Suporte</span></div>
      <div class="ueda-menu-item ueda-text-red">${iconPower()}<span class="ueda-item-text">Logoff</span></div>
    </div>
    <button class="ueda-widget-btn" id="ueda-main-btn" title="${escapeAttr(brand)}">
      <img src="${logo}" alt="UEDA" class="ueda-widget-logo"/>
    </button>
  </div>
  <script>
    (function(){
      var c = document.getElementById('ueda-widget-container');
      var btn = document.getElementById('ueda-main-btn');
      var header = c.querySelector('.ueda-menu-header');
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
      // Auto-open expanded on preview load
      setTimeout(function(){ c.classList.add('ueda-open','ueda-expanded'); }, 250);
    })();
  </script>
</body></html>`;
}

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
