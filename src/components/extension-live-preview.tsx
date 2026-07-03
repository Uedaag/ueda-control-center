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

type View = "widget" | "login" | "account";

const VIEW_LABELS: Record<View, string> = {
  widget: "Widget",
  login: "Ativação",
  account: "Conta ativa",
};

export function ExtensionLivePreview({ settings, skills }: ExtensionLivePreviewProps) {
  const [view, setView] = useState<View>("widget");
  const srcDoc = useMemo(() => {
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
          : view === "login"
            ? "Painel de ativação exibido ao usuário antes de inserir a chave."
            : "Painel exibido após ativação — dados da conta e tempo restante."}
      </p>
    </div>
  );
}

function buildLoginDocument(settings: ExtensionPreviewSettings, activated: boolean) {
  const accent = normalizeHexColor(settings.brand_color);
  const brand = escapeHtml(settings.brand_name || "UEDA EX 5.0");
  const welcome = escapeHtml(settings.welcome_message || "Bem-vindo! Ative sua chave para continuar.");
  const footer = escapeHtml(settings.footer_signature || "");
  const logo = escapeAttr(logoAsset.url);

  const body = activated
    ? `
      <div class="badge ok">✓ Chave ativada</div>
      <h1>Olá, Usuário</h1>
      <p class="sub">Sua licença está ativa e sincronizada.</p>
      <div class="stat">
        <span class="lbl">Tempo restante</span>
        <span class="val">7d 12h 34m</span>
      </div>
      <div class="stat">
        <span class="lbl">Créditos</span>
        <span class="val">Ilimitado</span>
      </div>
      <button class="btn ghost">Sair da conta</button>
    `
    : `
      <div class="badge">Ativação necessária</div>
      <h1>${brand}</h1>
      <p class="sub">${welcome}</p>
      <label class="lbl">Chave de ativação</label>
      <input class="key" placeholder="XXXX-XXXX-XXXX-XXXX" />
      <button class="btn primary">Ativar agora</button>
      <a class="link">Não tenho uma chave</a>
    `;

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    *{box-sizing:border-box;font-family:Inter,system-ui,sans-serif}
    html,body{margin:0;min-height:100%;background:#0a0a0b;color:#f4f7fb;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{width:340px;background:#111114;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px 24px;box-shadow:0 30px 80px rgba(0,0,0,.5);display:flex;flex-direction:column;align-items:center;gap:12px}
    .logo{width:64px;height:64px;border-radius:16px;background:#050506;border:1px solid ${accent}55;display:grid;place-items:center;padding:10px;margin-bottom:4px}
    .logo img{width:100%;height:100%;object-fit:contain}
    .badge{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${accent};background:${accent}18;padding:6px 12px;border-radius:999px;border:1px solid ${accent}44}
    .badge.ok{color:#70f0c1;background:#70f0c118;border-color:#70f0c144}
    h1{margin:6px 0 0;font-size:22px;font-weight:800;letter-spacing:-.01em;text-align:center}
    .sub{margin:0;font-size:12px;color:#8b93a5;text-align:center;line-height:1.5}
    .lbl{align-self:flex-start;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#8b93a5;margin-top:8px}
    .key{width:100%;height:44px;background:#050506;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;padding:0 14px;font-size:13px;letter-spacing:.05em;outline:none}
    .key:focus{border-color:${accent}}
    .btn{width:100%;height:44px;border-radius:10px;border:0;font-size:12px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;margin-top:6px}
    .btn.primary{background:${accent};color:#050506}
    .btn.ghost{background:transparent;color:#aeb7c8;border:1px solid rgba(255,255,255,.12)}
    .link{font-size:11px;color:#8b93a5;text-decoration:underline;cursor:pointer;margin-top:4px}
    .stat{width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#050506;border:1px solid rgba(255,255,255,.06);border-radius:10px}
    .stat .lbl{margin:0;align-self:auto}
    .stat .val{font-size:13px;font-weight:700;color:${accent}}
    footer{position:fixed;bottom:12px;left:0;right:0;text-align:center;font-size:10px;color:#4a5060;letter-spacing:.1em}
  </style></head><body>
    <div class="card">
      <div class="logo"><img src="${logo}" alt=""/></div>
      ${body}
    </div>
    ${footer ? `<footer>${footer}</footer>` : ""}
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
      ${menuItem(iconPower(), "Monitor ON", `${brand} ativo`, "ueda-text-green")}
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
