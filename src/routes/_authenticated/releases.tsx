import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/releases")({
  component: Page,
  head: () => ({ meta: [{ title: "Releases — UEDA EX" }] }),
});

type Release = { id: string; version: string; min_version: string; download_url: string; changelog: string; force_update: boolean; is_active: boolean; created_at: string; };

function Page() {
  const [rows, setRows] = useState<Release[]>([]);
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [notify, setNotify] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("releases").select("*").order("created_at", { ascending: false });
    const list = (data as Release[]) || [];
    setRows(list);
    if (!version) {
      const last = list[0]?.version;
      if (last) {
        const p = last.split(".").map((n) => parseInt(n, 10) || 0);
        p[p.length - 1] = (p[p.length - 1] || 0) + 1;
        setVersion(p.join("."));
      } else {
        setVersion("5.1");
      }
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const create = async () => {
    const v = version.trim();
    if (!v) return toast.error("Informe o número da versão");
    await supabase.from("releases").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from("releases").insert({
      version: v,
      min_version: v,
      download_url: "",
      changelog,
      force_update: false,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    await supabase.from("settings").upsert({ key: "ext_version", value: v }, { onConflict: "key" });
    await supabase.from("settings").upsert({ key: "min_version", value: v }, { onConflict: "key" });
    await supabase.from("settings").upsert({ key: "force_update", value: "false" }, { onConflict: "key" });
    await supabase.from("settings").upsert({ key: "notify_update", value: notify ? "true" : "false" }, { onConflict: "key" });
    toast.success(`Versão ${v} liberada — clientes serão notificados`);
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
        <p className="text-muted-foreground text-sm">Publique uma nova versão — o cliente recebe notificação com número e observações</p>
      </div>

      <Card className="glass-card border-0 p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Liberar nova atualização</h2>
          <p className="text-sm text-muted-foreground">O cliente vê a notificação assim que abrir o Lovable ou clicar em Atualizar.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Label>Número da versão</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="5.1" />
          </div>
          <div className="md:col-span-2 flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={notify} onCheckedChange={setNotify} id="notify" />
              <Label htmlFor="notify" className="cursor-pointer">Notificar clientes automaticamente</Label>
            </div>
          </div>
        </div>
        <div>
          <Label>Observações / novidades da versão</Label>
          <Textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} rows={5} placeholder="• Corrigido borda azul do chat&#10;• Botão renomeado para 'Reescrever prompt'&#10;• Melhorias de estabilidade" />
        </div>
        <Button onClick={create} className="gradient-accent border-0 text-white"><Rocket className="h-4 w-4 mr-1" />Liberar nova atualização</Button>
      </Card>

      <Card className="glass-card border-0 p-4 space-y-2">
        <h2 className="font-semibold mb-2">Histórico</h2>
        {rows.map((r) => (
          <div key={r.id} className="flex items-start justify-between p-3 rounded-lg bg-white/5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">v{r.version}</span>
                {r.is_active && <Badge className="gradient-accent border-0 text-white">Ativa</Badge>}
                {r.force_update && <Badge variant="destructive">Forçada</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              {r.changelog && <pre className="text-xs text-muted-foreground whitespace-pre-wrap mt-2 font-sans">{r.changelog}</pre>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        ))}
        {rows.length === 0 && <div className="text-center text-muted-foreground py-6">Nenhuma release</div>}
      </Card>
    </div>
  );
}
