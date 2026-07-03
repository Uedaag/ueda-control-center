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
  const srcDoc = useMemo(() => {
    if (view === "chat") return buildChatDocument(settings);
    if (view === "login") return buildLoginDocument(settings, false);
    if (view === "account") return buildLoginDocument(settings, true);
    return buildPreviewDocument(settings, skills);
  }, [settings, skills, view]);

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
      <form class="lovable-chat-box ueda-chat-active">
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

  const activatedHtml = `
    <div class="home-view-replacement" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:420px;text-align:center;padding:32px 24px;">
      <div class="login-logo-container" style="width:56px;height:56px;margin-bottom:18px;">
        <img src="${logo}" style="width:100%;height:100%;object-fit:contain;" alt="Logo" />
      </div>
      <h3 style="color:#fff;font-size:16px;margin:0 0 10px;font-weight:700;">${brand} Ativo</h3>
      <p style="margin:0;color:#a8b2c8;font-size:13px;line-height:1.5;">O painel de controle foi movido.<br/><br/>Use o ícone flutuante <b style="color:#1DAFD8;">na tela do site</b> para gerenciar.</p>
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    ${popupCss}
    html, body { width: 100%; height: 100%; }
    body { display: flex; align-items: center; justify-content: center; padding: 20px; }
    .app-shell { width: 320px; }
  </style></head><body>
    <main class="app-shell">${activated ? activatedHtml : loginHtml}</main>
  </body></html>`;
}



function buildPreviewDocument(settings: ExtensionPreviewSettings, skills: ExtensionPreviewSkill[]) {
  const accent = normalizeHexColor(settings.brand_color);
  const brand = escapeHtml(settings.brand_name || "UEDA EX 5.0");
  const logo = escapeAttr(logoAsset.url);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; min-height: 100%; background: #eef3f7; overflow: hidden; }
      body::before { content: ""; position: fixed; inset: 0; background: radial-gradient(circle at 86% 88%, ${accent}24, transparent 24%), linear-gradient(135deg, #f7fafc, #e9f1f6); }
      ${widgetCss}
    </style>
  </head>
  <body>
    <div id="ueda-widget-container" style="--ueda-accent:${accent}">
      ${widgetMenu({ brand, skills })}
      <button class="ueda-widget-btn" id="ueda-fab" title="${escapeAttr(brand)}"><img src="${logo}" alt="U" class="ueda-widget-logo" /></button>
    </div>
    <script>
      (function(){
        var c = document.getElementById('ueda-widget-container');
        var fab = document.getElementById('ueda-fab');
        var toggle = document.getElementById('ueda-menu-toggle');
        fab.addEventListener('click', function(){
          if (!c.classList.contains('ueda-visible')) {
            c.classList.add('ueda-visible','ueda-collapsed');
            c.classList.remove('ueda-expanded');
          } else {
            c.classList.remove('ueda-visible','ueda-collapsed','ueda-expanded');
          }
        });
        toggle && toggle.addEventListener('click', function(){
          if (c.classList.contains('ueda-expanded')) {
            c.classList.remove('ueda-expanded');
            c.classList.add('ueda-collapsed');
          } else {
            c.classList.add('ueda-expanded');
            c.classList.remove('ueda-collapsed');
          }
        });
      })();
    </script>
  </body>
</html>`;
}

function widgetMenu({ brand, skills }: { brand: string; skills: ExtensionPreviewSkill[] }) {
  const skillRows = skills.slice(0, 2).map((skill) => menuItem(iconSparkles(), escapeHtml(skill.name), skill.description || skill.name)).join("");
  const accountStatus = `<span id="ueda-time-value" style="font-size:11px;color:#70f0c1;font-weight:700;margin-top:2px;">Ativada</span>`;
  return `
    <div class="ueda-widget-menu">
      <div class="ueda-menu-header" id="ueda-menu-toggle">
        ${iconChevron()}
        <span class="ueda-text" id="ueda-toggle-text">Recolher menu</span>
      </div>
      <div class="ueda-menu-item" style="cursor:default;">
        ${iconUser()}
        <div class="ueda-text" style="display:flex;flex-direction:column;">
          <span id="ueda-user-name">Minha conta</span>
          ${accountStatus}
        </div>
      </div>
      ${menuItem(iconBell(), "Notificações", "Notificações")}
      ${menuItem(iconVolume(), "Som", "Som")}
      ${skillRows || menuItem(iconSparkles(), "Skills", "Skills")}
      ${menuItem(iconFolder(), "Baixar projeto", "Baixar projeto")}
      ${menuItem(iconPencil(), "Remover marca", "Remover marca")}
      ${menuItem(iconRefresh(), "Atualizar extensão", "Atualizar extensão")}
      ${menuItem(iconHelp(), "Ajuda & Suporte", "Ajuda & Suporte")}
      ${menuItem(iconPower(), "Logoff", "Encerrar sessão", "ueda-text-red")}
    </div>`;
}

function menuItem(icon: string, label: string, title: string, className = "") {
  return `<div class="ueda-menu-item ${className}" title="${escapeAttr(title)}">${icon}<span class="ueda-text">${label}</span></div>`;
}

function svg(paths: string) { return `<svg viewBox="0 0 24 24">${paths}</svg>`; }
function iconChevron() { return svg(`<polyline points="15 18 9 12 15 6"></polyline>`); }
function iconUser() { return svg(`<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>`); }
function iconBell() { return svg(`<path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>`); }
function iconVolume() { return svg(`<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>`); }
function iconPencil() { return svg(`<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>`); }
function iconRefresh() { return svg(`<polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>`); }
function iconHelp() { return svg(`<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>`); }
function iconPower() { return svg(`<path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line>`); }
function iconSparkles() { return svg(`<path d="M9.9 10.8 8 15l-1.9-4.2L2 9l4.1-1.8L8 3l1.9 4.2L14 9l-4.1 1.8Z"></path><path d="M19 13l-1.2 2.8L15 17l2.8 1.2L19 21l1.2-2.8L23 17l-2.8-1.2L19 13Z"></path>`); }
function iconFolder() { return svg(`<path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"></path>`); }

function normalizeHexColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#4fa1c9";
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
