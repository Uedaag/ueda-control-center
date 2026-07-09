import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import {
  Palette, Save, RotateCcw, Type, MessageSquare, FileText, Image as ImageIcon,
  Globe, Mail, Phone, RefreshCw, Upload, Download, Rocket, CircleDot,
} from "lucide-react";
import logoAsset from "@/assets/ueda-logo.png.asset.json";
import {
  ExtensionLivePreview,
  type ExtensionPreviewSettings,
  type ExtensionPreviewSkill,
} from "@/components/extension-live-preview";


export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Page,
  head: () => ({ meta: [{ title: "Configurações — UEDA EX 5.0" }] }),
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
  chat_custom_css: "",
};

type Vals = Record<string, string>;
type Skill = ExtensionPreviewSkill;

const SETTING_KEYS = Object.keys(DEFAULTS);

function Page() {
  const [vals, setVals] = useState<Vals>(DEFAULTS);           // draft (form)
  const [initial, setInitial] = useState<Vals>(DEFAULTS);     // last saved draft
  const [published, setPublished] = useState<Vals>(DEFAULTS); // live on extension
  const [skills, setSkills] = useState<Skill[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [version, setVersion] = useState("5.1");
  const [changelog, setChangelog] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("settings").select("key,value,draft_value").in("key", [...SETTING_KEYS, "ext_version"]),
      supabase
        .from("skills")
        .select("id,name,description,icon,payload,display_order")
        .eq("status", true)
        .order("display_order", { ascending: true }),
    ]).then(([settingsResult, skillsResult]) => {
      const draft: Vals = { ...DEFAULTS };
      const pub: Vals = { ...DEFAULTS };
      let curVer = "5.1";
      (settingsResult.data || []).forEach((r: any) => {
        if (r.key === "ext_version") { curVer = r.value || "5.1"; return; }
        if (r.key in DEFAULTS) {
          pub[r.key] = r.value ?? "";
          draft[r.key] = (r.draft_value ?? r.value) ?? "";
        }
      });
      setVals(draft); setInitial(draft); setPublished(pub);
      const p = curVer.split(".").map((n) => parseInt(n, 10) || 0);
      p[p.length - 1] = (p[p.length - 1] || 0) + 1;
      setVersion(p.join("."));
      setSkills((skillsResult.data as Skill[]) || []);
    });
  }, []);

  const set = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }));

  const hasDraftChanges = useMemo(
    () => SETTING_KEYS.some((k) => (vals[k] ?? "") !== (published[k] ?? "")),
    [vals, published]
  );

  const saveDraft = async (showToast = true) => {
    setSaving(true);
    const rows = Object.entries(vals).map(([key, value]) => ({ key, draft_value: value }));
    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    setInitial(vals);
    if (showToast) toast.success("Rascunho salvo — visível apenas na prévia");
    return true;
  };

  const publishRelease = async () => {
    const v = version.trim();
    if (!v) return toast.error("Informe o número da versão");
    setPublishing(true);
    // 1) garante draft salvo
    const rows = Object.entries(vals).map(([key, value]) => ({ key, value, draft_value: value }));
    const { error: upErr } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
    if (upErr) { setPublishing(false); return toast.error(upErr.message); }
    // 2) desativa releases antigas + cria nova
    await supabase.from("releases").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: relErr } = await supabase.from("releases").insert({
      version: v, min_version: v, download_url: "", changelog, force_update: false, is_active: true,
    });
    if (relErr) { setPublishing(false); return toast.error(relErr.message); }
    // 3) bump da versão + flag de notificação
    await supabase.from("settings").upsert(
      [
        { key: "ext_version", value: v, draft_value: v },
        { key: "min_version", value: v, draft_value: v },
        { key: "notify_update", value: "true", draft_value: "true" },
      ],
      { onConflict: "key" },
    );
    setPublished({ ...vals });
    setChangelog("");
    const p = v.split(".").map((n) => parseInt(n, 10) || 0);
    p[p.length - 1] = (p[p.length - 1] || 0) + 1;
    setVersion(p.join("."));
    setPublishing(false);
    toast.success(`Versão ${v} liberada — extensão será atualizada`);
  };

  const reset = () => { setVals(published); toast("Rascunho descartado — voltou ao publicado"); };

  const accent = useMemo(() => vals.brand_color || "#4fa1c9", [vals.brand_color]);

  const download = async () => {
    setDownloading(true);
    const ok = await saveDraft(false);
    if (ok) await downloadExtension(vals);
    setDownloading(false);
  };

  return (
    <div className="-m-6 min-h-full bg-background p-6 text-foreground">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
        {/* MAIN */}
        <div className="space-y-6 min-w-0">
          <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-end gap-2 shadow-sm">
            <button onClick={reset} className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-foreground px-3 py-2 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> RESETAR
            </button>
            <button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold tracking-widest px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-60">
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
                  <label className="w-14 h-11 rounded-lg cursor-pointer shrink-0 border border-border shadow-inner relative overflow-hidden" style={{ background: accent }}>
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
                  className="w-full h-11 rounded-lg bg-background border border-input px-3 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </Field>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-2">
                <ImageIcon className="w-4 h-4" style={{ color: accent }} /> Logotipo de Interface
              </div>
              <div className="rounded-2xl bg-background border border-border p-6 flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="w-28 h-28 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center shrink-0">
                  <img src={logoAsset.url} alt="Logo" className="w-20 h-20 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <button className="bg-card border border-border hover:bg-muted text-card-foreground text-xs font-bold tracking-widest px-5 py-3 rounded-lg flex items-center gap-2 shadow-sm">
                    <Upload className="w-4 h-4" /> UPLOAD NOVO LOGO
                  </button>
                  <p className="mt-3 text-[11px] tracking-widest uppercase text-muted-foreground leading-relaxed">
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
                className="min-h-[110px] bg-background border-input text-foreground focus-visible:border-ring focus-visible:ring-ring/20"
              />
            </Field>
            <Field label="Assinatura de Rodapé" hint="Aparece discretamente na base de todas as telas.">
              <LightInput value={vals.footer_signature} onChange={(e) => set("footer_signature", e.target.value)} />
            </Field>
          </Section>

          <Section icon={<MessageSquare className="w-4 h-4" style={{ color: accent }} />} title="CSS DO CHAT">
            <Field label="Ajustes visuais do chat" hint="Esse CSS é aplicado quando o cliente clicar em Atualizar na extensão, sem mostrar alerta.">
              <Textarea
                value={vals.chat_custom_css}
                onChange={(e) => set("chat_custom_css", e.target.value)}
                placeholder={'body.ueda-monitor-on .ueda-chat-active { border-color: #40d9ed !important; }'}
                className="min-h-[150px] bg-background border-input font-mono text-xs text-foreground focus-visible:border-ring focus-visible:ring-ring/20"
              />
            </Field>
          </Section>
        </div>

        {/* PREVIEW ASIDE */}
        <aside className="xl:sticky xl:top-6 self-start">
          <ExtensionLivePreview
            settings={vals as ExtensionPreviewSettings}
            skills={skills}
          />

            <button
              onClick={download}
              disabled={downloading || saving}
              className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-widest text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
            >
              <Download className="w-4 h-4" /> {downloading ? "SINCRONIZANDO..." : "BAIXAR EXTENSÃO"}
            </button>
        </aside>
      </div>
    </div>
  );
}

/* ---------- download with injected config ---------- */

async function downloadExtension(vals: Vals) {
  try {
    toast("Preparando pacote mínimo da extensão, com atualizações pelo servidor...");
    const res = await fetch("/ueda-ext-base.zip");
    if (!res.ok) throw new Error("Falha ao carregar base");
    const blob = await res.blob();
    saveAs(blob, `UEDA_EX_${(vals.brand_name || "ext").replace(/\s+/g, "_")}.zip`);
    toast.success("Extensão mínima pronta — sem arquivos do projeto no pacote");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Erro ao gerar extensão");
  }
}

/* ---------- helpers ---------- */

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
      <div className="flex items-center gap-2 pb-3 border-b border-border mb-6">
        {icon}
        <h2 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, counter, children }: { label: ReactNode; hint?: string; counter?: string; children: ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase flex items-center">{label}</label>
        {counter && <span className="text-[10px] text-muted-foreground tracking-wider">{counter}</span>}
      </div>
      {children}
      {hint && <p className="mt-2 text-[10px] tracking-widest uppercase text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LightInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      {...props}
      className={`h-11 bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/20 ${props.className ?? ""}`}
    />
  );
}

