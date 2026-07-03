import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Zap, StickyNote, Download, Eraser, Monitor, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/preview")({
  component: Page,
  head: () => ({ meta: [{ title: "Preview — UEDA EX 5.0" }] }),
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, StickyNote, Download, Eraser, Monitor, Sparkles,
};

type Skill = { id: string; name: string; icon: string; status: boolean; display_order: number; };

function Page() {
  const [layout, setLayout] = useState<"floating" | "sidebar">("floating");
  const [dark, setDark] = useState(true);
  const [logged, setLogged] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [{ data: sk }, { data: st }] = await Promise.all([
        supabase.from("skills").select("id,name,icon,status,display_order").eq("status", true).order("display_order"),
        supabase.from("settings").select("key,value"),
      ]);
      setSkills((sk as Skill[]) || []);
      const s: Record<string, string> = {};
      (st || []).forEach((r: any) => (s[r.key] = r.value));
      setSettings(s);
    })();
  }, []);

  const accent = settings.widget_accent_color || "#7c3aed";
  const bg = dark ? "hsl(222,20%,10%)" : "#ffffff";
  const fg = dark ? "#f3f4f6" : "#111827";
  const cardBg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  const widget = (
    <div style={{
      background: bg, color: fg, borderRadius: 14, padding: 20,
      boxShadow: "0 20px 60px -20px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif",
      width: layout === "floating" ? 360 : "100%", height: layout === "sidebar" ? "100%" : "auto",
    }}>
      <div className="flex items-center gap-2 mb-4">
        <div style={{ width: 32, height: 32, borderRadius: 8, background: accent }} className="flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{settings.widget_title || "UEDA EX 5.0"}</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>{settings.widget_subtitle || ""}</div>
        </div>
      </div>

      {!logged ? (
        <>
          <input placeholder="Chave de licença" style={{
            width: "100%", background: cardBg, border: "none", borderRadius: 10,
            padding: "10px 12px", color: fg, fontSize: 13, marginBottom: 10,
          }} />
          <button style={{
            width: "100%", background: "hsl(234,89%,56%)", color: "white", border: "none",
            borderRadius: 10, padding: "10px", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>Entrar</button>
        </>
      ) : (
        <div className="space-y-2">
          {skills.map((s) => {
            const Icon = ICONS[s.icon] ?? Zap;
            return (
              <div key={s.id} style={{ background: cardBg, borderRadius: 10, padding: "10px 12px" }} className="flex items-center gap-2">
                <div style={{ width: 28, height: 28, borderRadius: 6, background: accent }} className="flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              </div>
            );
          })}
          {skills.length === 0 && <div style={{ fontSize: 12, opacity: 0.6 }}>Nenhuma skill ativa</div>}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Preview</h1>
        <p className="text-muted-foreground text-sm">Simulação em tempo real do widget</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="glass-card border-0 p-4 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <Label>Modo</Label>
            <div className="flex gap-1">
              <Button size="sm" variant={layout === "floating" ? "default" : "outline"} onClick={() => setLayout("floating")}>Flutuante</Button>
              <Button size="sm" variant={layout === "sidebar" ? "default" : "outline"} onClick={() => setLayout("sidebar")}>Sidebar</Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Tema escuro</Label>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Logado</Label>
            <Switch checked={logged} onCheckedChange={setLogged} />
          </div>
        </Card>

        <div className="relative rounded-xl border border-white/5 bg-gradient-to-br from-slate-800 to-slate-950 min-h-[600px] p-6 overflow-hidden">
          {layout === "floating" ? (
            <div className="absolute bottom-6 right-6">{widget}</div>
          ) : (
            <div className="absolute inset-y-0 right-0 w-[360px]">{widget}</div>
          )}
        </div>
      </div>
    </div>
  );
}
