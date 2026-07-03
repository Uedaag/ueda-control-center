import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  Palette, Save, RotateCcw, Type, MessageSquare, FileText, Image as ImageIcon,
  Globe, Mail, Phone, RefreshCw, Upload, HelpCircle, Volume2, Pencil,
  Download, ChevronLeft, ChevronRight, User, Power,
} from "lucide-react";
import logoAsset from "@/assets/ueda-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Page,
  head: () => ({ meta: [{ title: "Identidade Visual — UEDA EX 5.0" }] }),
});

const DEFAULTS = {
  brand_name: "Ueda ex",
  brand_color: "#4fa1c9",
  test_credits: "5",
  default_language: "pt-BR",
  support_url: "",
  support_email: "",
  whatsapp: "",
  renewal_url: "",
  welcome_message: "Bem-vindo! Ative sua chave para continuar.",
  footer_signature: "© 2026 Ueda Agency – Todos os direitos reservados",
  widget_title: "Ueda ex",
};

type Vals = Record<string, string>;

function Page() {
  const [vals, setVals] = useState<Vals>(DEFAULTS);
  const [initial, setInitial] = useState<Vals>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"login" | "chat">("login");

  useEffect(() => {
    supabase.from("settings").select("key,value").then(({ data }) => {
      const v: Vals = { ...DEFAULTS };
      (data || []).forEach((r: any) => { if (r.key in DEFAULTS) v[r.key] = r.value ?? ""; });
      setVals(v); setInitial(v);
    });
  }, []);

  const set = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    const rows = Object.entries(vals).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setInitial(vals);
    toast.success("Alterações salvas");
  };

  const reset = () => { setVals(initial); toast("Alterações revertidas"); };

  const accent = useMemo(() => vals.brand_color || "#4fa1c9", [vals.brand_color]);

  return (
    <div className="-m-6 min-h-full bg-slate-100 text-slate-900 p-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* MAIN */}
        <div className="space-y-6 min-w-0">
          {/* HERO CARD */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-6 flex items-center gap-5 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0" style={{ color: accent }}>
              <Palette className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black italic tracking-tight text-slate-900">IDENTIDADE VISUAL</h1>
              <p className="text-sm text-slate-500 mt-0.5">Molde o ecossistema com a essência da sua marca.</p>
            </div>
            <button onClick={reset} className="text-xs font-semibold tracking-widest text-slate-500 hover:text-slate-800 px-3 py-2 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> RESETAR
            </button>
            <button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-blue-600/25 flex items-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4" /> {saving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
            </button>
          </div>

          {/* ESSÊNCIA VISUAL */}
          <Section icon={<Type className="w-4 h-4" style={{ color: accent }} />} title="ESSÊNCIA VISUAL">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Nome da Operação" hint="Nomenclatura pública do ecossistema.">
                <LightInput value={vals.brand_name} onChange={(e) => set("brand_name", e.target.value)} />
              </Field>
              <Field label="Cor de Identidade" hint="Tom cromático primário do software.">
                <div className="flex items-center gap-3">
                  <label className="w-14 h-11 rounded-lg cursor-pointer shrink-0 border border-slate-200 shadow-inner relative overflow-hidden" style={{ background: accent }}>
                    <input type="color" value={accent} onChange={(e) => set("brand_color", e.target.value)} className="opacity-0 absolute inset-0 cursor-pointer" />
                  </label>
                  <LightInput value={vals.brand_color} onChange={(e) => set("brand_color", e.target.value)} />
                </div>
              </Field>
              <Field label="Créditos de Teste (0-20)" hint="Créditos iniciais das chaves geradas em sua loja.">
                <LightInput type="number" min={0} max={20} value={vals.test_credits} onChange={(e) => set("test_credits", e.target.value)} />
              </Field>
              <Field label="Idioma Padrão" hint="Idioma inicial da interface para seus clientes.">
                <select
                  value={vals.default_language}
                  onChange={(e) => set("default_language", e.target.value)}
                  className="w-full h-11 rounded-lg bg-slate-50 border border-slate-200 px-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </Field>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase mb-2">
                <ImageIcon className="w-4 h-4" style={{ color: accent }} /> Logotipo de Interface
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 flex items-center gap-6">
                <div className="w-28 h-28 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                  <img src={logoAsset.url} alt="Logo" className="w-20 h-20 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <button className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold tracking-widest px-5 py-3 rounded-lg flex items-center gap-2 shadow-sm">
                    <Upload className="w-4 h-4" /> UPLOAD NOVO LOGO
                  </button>
                  <p className="mt-3 text-[11px] tracking-widest uppercase text-slate-400 leading-relaxed">
                    Formato recomendado: quadrado (512px).<br />PNG transparente · máximo 2MB.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* CANAIS DE ATENDIMENTO */}
          <Section icon={<MessageSquare className="w-4 h-4" style={{ color: accent }} />} title="CANAIS DE ATENDIMENTO">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label={<><Globe className="w-3.5 h-3.5 inline mr-1" />Portal de Suporte</>}>
                <LightInput value={vals.support_url} onChange={(e) => set("support_url", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label={<><Mail className="w-3.5 h-3.5 inline mr-1" />E-mail Estratégico</>}>
                <LightInput type="email" value={vals.support_email} onChange={(e) => set("support_email", e.target.value)} placeholder="suporte@suaempresa.com" />
              </Field>
              <Field label={<><Phone className="w-3.5 h-3.5 inline mr-1" />WhatsApp Business</>} hint="Apenas caracteres numéricos (DDI + DDD + número).">
                <LightInput value={vals.whatsapp} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))} placeholder="5511999999999" />
              </Field>
              <Field label={<><RefreshCw className="w-3.5 h-3.5 inline mr-1" />Link de Renovação</>} hint="Link para onde o usuário será enviado quando a licença expirar.">
                <LightInput value={vals.renewal_url} onChange={(e) => set("renewal_url", e.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </Section>

          {/* MENSAGENS DE INTERFACE */}
          <Section icon={<FileText className="w-4 h-4" style={{ color: accent }} />} title="MENSAGENS DE INTERFACE">
            <Field label="Boas-vindas Premium" hint="Exibida no onboarding do cliente." counter={`${vals.welcome_message.length}/200`}>
              <Textarea
                value={vals.welcome_message}
                maxLength={200}
                onChange={(e) => set("welcome_message", e.target.value)}
                className="min-h-[110px] bg-slate-50 border-slate-200 text-slate-900 focus-visible:border-blue-400 focus-visible:ring-blue-100"
              />
            </Field>
            <Field label="Assinatura de Rodapé" hint="Aparece discretamente na base de todas as telas.">
              <LightInput value={vals.footer_signature} onChange={(e) => set("footer_signature", e.target.value)} />
            </Field>
          </Section>
        </div>

        {/* PREVIEW ASIDE */}
        <aside className="xl:sticky xl:top-6 self-start">
          <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Pré-visualização em Tempo Real
            </div>
            <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold">
              <button onClick={() => setTab("login")} className={`px-3 py-1.5 rounded-md ${tab === "login" ? "bg-slate-100 text-slate-900 ring-1 ring-blue-500" : "text-slate-500"}`}>Login</button>
              <button onClick={() => setTab("chat")} className={`px-3 py-1.5 rounded-md ${tab === "chat" ? "bg-slate-100 text-slate-900 ring-1 ring-blue-500" : "text-slate-500"}`}>Chat</button>
            </div>

            <div className="mt-4 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 p-4 border border-slate-200 min-h-[440px] relative overflow-hidden">
              {tab === "login" ? (
                <PhoneFrame>
                  <LoginView vals={vals} accent={accent} />
                  <div className="mt-auto pt-3 text-center text-[10px] text-slate-400 border-t border-slate-100">
                    {vals.footer_signature}
                  </div>
                </PhoneFrame>
              ) : (
                <FloatingWidget accent={accent} logo={logoAsset.url} brand={vals.brand_name} />
              )}
            </div>

            <p className="mt-4 text-center text-xs text-slate-500 leading-relaxed">
              Esta é a visualização real de como<br />sua marca aparecerá na extensão.
            </p>

            <button
              onClick={() => downloadExtension(vals, accent)}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-widest text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
            >
              <Download className="w-4 h-4" /> BAIXAR EXTENSÃO
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- download with injected config ---------- */

async function downloadExtension(vals: Vals, accent: string) {
  try {
    toast("Preparando sua extensão...");
    const res = await fetch("/ueda-ext-base.zip");
    if (!res.ok) throw new Error("Falha ao carregar base");
    const zip = await JSZip.loadAsync(await res.arrayBuffer());

    const supaUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
    const config = {
      brand_name: vals.brand_name,
      brand_color: accent,
      welcome_message: vals.welcome_message,
      footer_signature: vals.footer_signature,
      support_url: vals.support_url,
      support_email: vals.support_email,
      whatsapp: vals.whatsapp,
      renewal_url: vals.renewal_url,
      default_language: vals.default_language,
      test_credits: Number(vals.test_credits) || 0,
      api_endpoint: `${supaUrl}/functions/v1/fn-sv03`,
      validate_endpoint: `${supaUrl}/functions/v1/fn-vl04`,
      updates_url: `${supaUrl}/functions/v1/fn-sv03?check=updates`,
      generated_at: new Date().toISOString(),
    };
    zip.file("config.json", JSON.stringify(config, null, 2));
    zip.file("ueda-updates.json", JSON.stringify({ updates_url: config.updates_url, current: "5.1" }, null, 2));

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `UEDA_EX_${(vals.brand_name || "ext").replace(/\s+/g, "_")}.zip`);
    toast.success("Extensão pronta com suas configurações");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Erro ao gerar extensão");
  }
}

/* ---------- helpers ---------- */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 p-6 shadow-sm">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200/70 mb-6">
        {icon}
        <h2 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, counter, children }: { label: React.ReactNode; hint?: string; counter?: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-bold tracking-[0.15em] text-slate-500 uppercase flex items-center">{label}</label>
        {counter && <span className="text-[10px] text-slate-400 tracking-wider">{counter}</span>}
      </div>
      {children}
      {hint && <p className="mt-2 text-[10px] tracking-widest uppercase text-slate-400">{hint}</p>}
    </div>
  );
}

function LightInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      {...props}
      className={`h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-blue-100 ${props.className ?? ""}`}
    />
  );
}

/* ---------- preview widget ---------- */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full rounded-[28px] bg-white border-[3px] border-slate-900 p-4 min-h-[400px] flex flex-col">
      {children}
    </div>
  );
}

function LoginView({ vals, accent }: { vals: Vals; accent: string }) {
  return (
    <div className="flex flex-col items-center text-center px-2">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
        <img src={logoAsset.url} alt="" className="w-10 h-10 object-contain" />
      </div>
      <div className="text-base font-bold text-slate-800">Boas-vindas</div>
      <div className="text-[11px] italic text-slate-500 mt-1 mb-4 px-2">{vals.welcome_message}</div>
      <input placeholder="Sua chave de licença..." className="w-full h-9 rounded-lg bg-slate-50 border border-slate-200 px-3 text-xs text-slate-800 focus:outline-none" />
      <button className="mt-2 w-full h-9 rounded-lg text-white text-xs font-semibold" style={{ background: accent }}>Ativar Licença</button>
      <button className="mt-2 w-full h-9 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5" /> Obter suporte
      </button>
      <button className="mt-3 text-[11px] text-slate-500 flex items-center gap-1"><FileText className="w-3 h-3" /> Ver tutorial</button>
    </div>
  );
}

/* Floating right-side widget with pulsing logo + expandable menus */
function FloatingWidget({ accent, logo, brand }: { accent: string; logo: string; brand: string }) {
  const [mode, setMode] = useState<"collapsed" | "icons" | "labels">("collapsed");

  const items = [
    { icon: User, label: "Minha conta", status: "Pausado", statusColor: "#ef4444" },
    { icon: Volume2, label: "Som ON", active: true },
    { icon: Pencil, label: "Remover marca" },
    { icon: RefreshCw, label: "Atualizar extensão" },
    { icon: HelpCircle, label: "Ajuda & Suporte" },
    { icon: Power, label: "Monitor ON", active: true },
  ];

  return (
    <div className="absolute inset-0 flex items-end justify-end p-5">
      {/* Expanded label menu */}
      {mode === "labels" && (
        <div className="absolute right-20 bottom-24 w-[210px] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3 animate-in fade-in zoom-in-95">
          <button
            onClick={() => setMode("icons")}
            className="w-full mb-2 rounded-lg border py-2 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5"
            style={{ borderColor: accent, color: accent }}
          >
            <ChevronRight className="w-3.5 h-3.5" /> Recolher menu
          </button>
          <div className="space-y-2">
            {items.map((it) => (
              <button key={it.label} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-800 text-left">
                <it.icon className="w-4 h-4 shrink-0" style={{ color: it.active ? accent : "#94a3b8" }} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold" style={{ color: it.active ? accent : "#e2e8f0" }}>{it.label}</div>
                  {it.status && <div className="text-[10px] font-bold" style={{ color: it.statusColor }}>{it.status}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        {/* Icon strip */}
        {mode === "icons" && (
          <div className="flex flex-col items-center gap-2 rounded-full bg-slate-900 border border-slate-700 py-3 px-2 shadow-2xl animate-in fade-in slide-in-from-right-2">
            <button onClick={() => setMode("labels")} className="w-7 h-7 rounded-md border flex items-center justify-center" style={{ borderColor: accent, color: accent }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {items.map((it) => (
              <button key={it.label} className="w-7 h-7 flex items-center justify-center">
                <it.icon className="w-4 h-4" style={{ color: it.active ? accent : "#cbd5e1" }} />
              </button>
            ))}
          </div>
        )}

        {/* Pulsing logo button */}
        <button
          onClick={() => setMode(mode === "collapsed" ? "icons" : "collapsed")}
          className="relative w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center"
          aria-label={brand}
        >
          <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: accent }} />
          <span className="absolute -inset-1 rounded-full opacity-30 animate-pulse" style={{ boxShadow: `0 0 0 6px ${accent}22, 0 0 0 12px ${accent}11` }} />
          <img src={logo} alt="" className="relative w-9 h-9 object-contain" />
        </button>
      </div>
    </div>
  );
}

