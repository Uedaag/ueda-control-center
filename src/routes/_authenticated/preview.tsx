import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, RefreshCw, LogOut, Play } from "lucide-react";
import logoAsset from "@/assets/ueda-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/preview")({
  component: Page,
  head: () => ({ meta: [{ title: "Preview — UEDA EX 5.0" }] }),
});

type Skill = { id: string; name: string; description: string | null; icon: string; status: boolean };

const KEYS = ["brand_name", "brand_color", "welcome_message", "footer_signature"] as const;

function Page() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [skills, setSkills] = useState<Skill[]>([]);
  const [state, setState] = useState<"collapsed" | "login" | "labels">("collapsed");
  const [session, setSession] = useState<{ key: string } | null>(null);

  const load = async () => {
    const [{ data: st }, { data: sk }] = await Promise.all([
      supabase.from("settings").select("key,value").in("key", KEYS as unknown as string[]),
      supabase.from("skills").select("id,name,description,icon,status").eq("status", true).order("display_order"),
    ]);
    const s: Record<string, string> = {};
    (st || []).forEach((r: any) => (s[r.key] = r.value));
    setSettings(s);
    setSkills((sk as Skill[]) || []);
  };
  useEffect(() => { load(); }, []);

  const accent = settings.brand_color || "#4fa1c9";
  const brand = settings.brand_name || "UEDA EX 5.0";
  const welcome = settings.welcome_message || "Ative sua chave para continuar.";
  const footer = settings.footer_signature || "";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Preview</h1>
          <p className="text-muted-foreground text-sm">Espelho fiel da extensão — usa os mesmos dados de Configurações + Skills.</p>
        </div>
        <button onClick={load} className="text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar dados
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl bg-white/5 border border-white/5 p-4 space-y-3 h-fit">
          <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Estado do widget</div>
          <div className="grid grid-cols-3 gap-1">
            {(["collapsed", "login", "labels"] as const).map((s) => (
              <button key={s} onClick={() => setState(s)}
                className={`px-2 py-1.5 rounded text-xs font-semibold ${state === s ? "bg-white/15 text-white" : "bg-transparent text-muted-foreground hover:bg-white/5"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground pt-2 border-t border-white/5">
            Sessão: <span className="text-white">{session ? "ativa" : "sem chave"}</span>
          </div>
          {session && (
            <button onClick={() => { setSession(null); setState("login"); }} className="w-full text-xs px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1.5">
              <LogOut className="w-3 h-3" /> Simular logout
            </button>
          )}
        </div>

        <div className="relative rounded-xl border border-white/5 bg-gradient-to-br from-slate-800 to-slate-950 min-h-[600px] p-6 overflow-hidden">
          {/* Right-side panel */}
          {state !== "collapsed" && (
            <div className="absolute bottom-24 right-24 w-[300px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#111827", color: "#f3f4f6" }}>
              <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: accent, color: "#fff" }}>
                <img src={logoAsset.url} className="w-6 h-6 rounded-full bg-white p-0.5" alt="" />
                <div className="text-xs font-bold flex-1">{brand}</div>
                <button onClick={() => setState("collapsed")} className="text-white/90">✕</button>
              </div>
              <div className="p-3 space-y-1.5">
                {state === "login" ? (
                  <>
                    <div className="text-xs text-slate-300 mb-2">{welcome}</div>
                    <input placeholder="Chave de licença" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500" />
                    <button onClick={() => { setSession({ key: "demo" }); setState("labels"); }}
                      className="w-full py-2 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5" style={{ background: accent }}>
                      <LogIn className="w-3.5 h-3.5" /> Ativar licença
                    </button>
                  </>
                ) : (
                  <>
                    {skills.length === 0 && <div className="text-xs text-slate-400 py-2">Nenhuma skill ativa.</div>}
                    {skills.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/5 cursor-pointer text-xs" title={s.description || ""}>
                        <Play className="w-3 h-3" style={{ color: accent }} />
                        <span className="flex-1 truncate">{s.name}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/5 mt-2 pt-2 space-y-1">
                      <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/5 cursor-pointer text-xs">
                        <RefreshCw className="w-3 h-3" /> Atualizar extensão
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="text-center text-[10px] text-slate-500 py-2 border-t border-white/5">{footer}</div>
            </div>
          )}

          {/* Floating pulsing FAB */}
          <button
            onClick={() => setState(state === "collapsed" ? (session ? "labels" : "login") : "collapsed")}
            className="absolute bottom-6 right-6 w-[60px] h-[60px] rounded-full bg-white shadow-2xl flex items-center justify-center"
            style={{ boxShadow: `0 0 0 0 ${accent}66` }}
          >
            <span className="absolute inset-0 rounded-full animate-ping" style={{ border: `2px solid ${accent}`, opacity: 0.5 }} />
            <img src={logoAsset.url} className="w-10 h-10 object-contain rounded-full" alt="logo" />
          </button>
        </div>
      </div>
    </div>
  );
}
