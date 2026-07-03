import { useMemo } from "react";
import widgetCss from "../../extension/widget.css?raw";
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

export function ExtensionLivePreview({ settings, skills }: ExtensionLivePreviewProps) {
  const srcDoc = useMemo(() => buildPreviewDocument(settings, skills), [settings, skills]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Prévia interativa
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Clique na logo · depois na seta
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-muted">
        <iframe
          title="Prévia real da extensão"
          srcDoc={srcDoc}
          className="h-[680px] w-full border-0"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        Mesmo CSS, estrutura e comportamento que a extensão baixada.
      </p>
    </div>
  );
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
