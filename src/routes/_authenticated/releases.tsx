import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/releases")({
  component: Page,
  head: () => ({ meta: [{ title: "Releases — UEDA EX 5.0" }] }),
});

type Release = { id: string; version: string; min_version: string; download_url: string; changelog: string; force_update: boolean; is_active: boolean; created_at: string; };

const CURRENT_EXTENSION_VERSION = "5.0";

function Page() {
  const [rows, setRows] = useState<Release[]>([]);
  const [changelog, setChangelog] = useState("");

  const load = async () => {
    const { data } = await supabase.from("releases").select("*").order("created_at", { ascending: false });
    setRows((data as Release[]) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    // deactivate previous
    await supabase.from("releases").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from("releases").insert({
      version: CURRENT_EXTENSION_VERSION,
      min_version: CURRENT_EXTENSION_VERSION,
      download_url: "",
      changelog,
      force_update: false,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    // update settings mirror
    await supabase.from("settings").upsert({ key: "ext_version", value: CURRENT_EXTENSION_VERSION }, { onConflict: "key" });
    await supabase.from("settings").upsert({ key: "min_version", value: CURRENT_EXTENSION_VERSION }, { onConflict: "key" });
    await supabase.from("settings").upsert({ key: "force_update", value: "false" }, { onConflict: "key" });
    toast.success("Atualização liberada para sincronização manual");
    setChangelog("");
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Deletar release?")) return;
    await supabase.from("releases").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Atualizações</h1>
        <p className="text-muted-foreground text-sm">Libere ajustes para o cliente aplicar pelo botão Atualizar da extensão</p>
      </div>

      <Card className="glass-card border-0 p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Liberar nova atualização</h2>
          <p className="text-sm text-muted-foreground">Use depois de salvar cores, skills ou CSS. O cliente só precisa clicar em Atualizar.</p>
        </div>
        <div><Label>Observações internas</Label><Textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} rows={4} /></div>
        <Button onClick={create} className="gradient-accent border-0 text-white"><Rocket className="h-4 w-4 mr-1" />Liberar nova atualização</Button>
      </Card>

      <Card className="glass-card border-0 p-4 space-y-2">
        <h2 className="font-semibold mb-2">Histórico</h2>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{r.version}</span>
                {r.is_active && <Badge className="gradient-accent border-0 text-white">Ativa</Badge>}
                {r.force_update && <Badge variant="destructive">Force</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">min: {r.min_version} • {new Date(r.created_at).toLocaleString()}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        ))}
        {rows.length === 0 && <div className="text-center text-muted-foreground py-6">Nenhuma release</div>}
      </Card>
    </div>
  );
}
