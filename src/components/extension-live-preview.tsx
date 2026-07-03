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
  state: ExtensionPreviewState;
  onStateChange: (state: ExtensionPreviewState) => void;
};

const stateLabels: Record<ExtensionPreviewState, string> = {
  collapsed: "Logo",
  login: "Login",
  labels: "Menu",
  account: "Conta",
};

const demoSession = {
  label: "Cliente UEDA",
  expiresAtText: "7d 12h 30m",
  expiresAtLabel: "Expira em 10/07/2026 18:30",
  credits: 5,
};

export function ExtensionLivePreview({ settings, skills, state, onStateChange }: ExtensionLivePreviewProps) {
  const srcDoc = useMemo(() => buildPreviewDocument(settings, skills, state), [settings, skills, state]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Pré-visualização sincronizada
        </div>
        <div className="inline-flex rounded-lg border border-border bg-background p-1 text-xs font-semibold">
          {(Object.keys(stateLabels) as ExtensionPreviewState[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onStateChange(item)}
              className={`rounded-md px-3 py-1.5 transition-colors ${state === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {stateLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-slate-950">
        <iframe
          title="Prévia real da extensão"
          srcDoc={srcDoc}
          className="h-[520px] w-full border-0"
          sandbox="allow-same-origin"
        />
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        A prévia acima usa o mesmo CSS, estrutura e dados gravados no pacote da extensão.
      </p>
    </div>
  );
}

function buildPreviewDocument(settings: ExtensionPreviewSettings, skills: ExtensionPreviewSkill[], state: ExtensionPreviewState) {
  const accent = normalizeHexColor(settings.brand_color);
  const brand = escapeHtml(settings.brand_name || "UEDA EX 5.0");
  const welcome = escapeHtml(settings.welcome_message || "Ative sua chave para continuar.");
  const footer = escapeHtml(settings.footer_signature || "");
  const logo = escapeAttr(logoAsset.url);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; min-height: 100%; background: #0f172a; overflow: hidden; }
      body::before { content: ""; position: fixed; inset: 0; background: radial-gradient(circle at 78% 74%, ${accent}1f, transparent 28%), linear-gradient(135deg, #162033, #07101f 64%); }
      ${widgetCss}
    </style>
  </head>
  <body>
    <div id="ueda-root" style="--ueda-accent:${accent}">
      ${state === "login" ? loginPanel({ brand: "Entrar", welcome, footer, logo }) : ""}
      ${state === "labels" ? labelsPanel({ brand, footer, logo, skills }) : ""}
      ${state === "account" ? accountPanel({ footer, logo }) : ""}
      ${fab({ logo, brand })}
    </div>
  </body>
</html>`;
}

function loginPanel({ brand, welcome, footer, logo }: { brand: string; welcome: string; footer: string; logo: string }) {
  return `
    <div class="ueda-panel login">
      ${header(brand, logo)}
      <div class="ueda-body">
        <div class="ueda-welcome">${welcome}</div>
        <input class="ueda-input" placeholder="Chave de licença" />
        <button class="ueda-btn">Ativar licença</button>
      </div>
      <div class="ueda-footer">${footer}</div>
    </div>`;
}

function labelsPanel({ brand, footer, logo, skills }: { brand: string; footer: string; logo: string; skills: ExtensionPreviewSkill[] }) {
  const items = skills.length
    ? skills.map((skill) => menuItem("▸", escapeHtml(skill.name), skill.description || skill.name)).join("")
    : `<div class="ueda-welcome">Nenhuma skill ativa. Clique em Atualizar.</div>`;

  return `
    <div class="ueda-panel labels">
      ${header(brand, logo)}
      <div class="ueda-body">
        ${menuItem("👤", "Minha conta", "Minha conta")}
        ${items}
        ${menuItem("↻", "Atualizar extensão", "Atualizar extensão")}
      </div>
      <div class="ueda-footer">${footer}</div>
    </div>`;
}

function accountPanel({ footer, logo }: { footer: string; logo: string }) {
  return `
    <div class="ueda-panel account">
      ${header("Minha conta", logo)}
      <div class="ueda-body">
        <div class="ueda-welcome">${escapeHtml(demoSession.label)}</div>
        <div class="ueda-account-card">
          <div class="ueda-account-label">⏱ Tempo restante</div>
          <div class="ueda-account-value">${demoSession.expiresAtText}</div>
          <div class="ueda-progress"><div style="width:72%"></div></div>
          <div class="ueda-account-sub">${demoSession.expiresAtLabel}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="ueda-account-card"><div class="ueda-account-label">Créditos</div><div class="ueda-account-value">${demoSession.credits}</div></div>
          <div class="ueda-account-card"><div class="ueda-account-label">Status</div><div class="ueda-account-value" style="font-size:14px">Ativa</div></div>
        </div>
        <button class="ueda-btn secondary" style="margin-top:10px">Sair da conta</button>
      </div>
      <div class="ueda-footer">${footer}</div>
    </div>`;
}

function header(title: string, logo: string) {
  return `
    <div class="ueda-header">
      <img src="${logo}" alt="" />
      <div class="title">${title}</div>
      <button aria-label="Fechar">×</button>
    </div>`;
}

function menuItem(icon: string, label: string, title: string) {
  return `<div class="ueda-menu-item" title="${escapeAttr(title)}"><span class="ico">${icon}</span><span>${label}</span></div>`;
}

function fab({ logo, brand }: { logo: string; brand: string }) {
  return `<button class="ueda-fab" title="${escapeAttr(brand)}"><img src="${logo}" alt="logo" /></button>`;
}

function normalizeHexColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#4fa1c9";
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}