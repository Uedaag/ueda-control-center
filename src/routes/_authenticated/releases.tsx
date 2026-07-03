import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/releases")({
  component: Page,
  head: () => ({ meta: [{ title: "Releases — UEDA EX 5.0" }] }),
});

type Release = { id: string; version: string; min_version: string; download_url: string; changelog: string; force_update: boolean; is_active: boolean; created_at: string; };

function Page() {
  const [rows, setRows] = useState<Release[]>([]);
  const [form, setForm] = useState({ version: "", min_version: "", download_url: "", changelog: "", force_update: false });

  const load = async () => {
    const { data } = await supabase.from("releases").select("*").order("created_at", { ascending: false });
    setRows((data as Release[]) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.version || !form.min_version) return toast.error("Versão obrigatória");
    // deactivate previous
    await supabase.from("releases").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from("releases").insert({ ...form, is_active: true });
    if (error) return toast.error(error.message);
    // update settings mirror
    await supabase.from("settings").upsert({ key: "ext_version", value: form.version }, { onConflict: "key" });
    await supabase.from("settings").upsert({ key: "min_version", value: form.min_version }, { onConflict: "key" });
    await supabase.from("settings").upsert({ key: "force_update", value: form.force_update ? "true" : "false" }, { onConflict: "key" });
    toast.success("Release publicada");
    setForm({ version: "", min_version: "", download_url: "", changelog: "", force_update: false });
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
        <h1 className="text-3xl font-bold gradient-text">Releases</h1>
        <p className="text-muted-foreground text-sm">Publique novas versões e force atualizações</p>
      </div>

      <Card className="glass-card border-0 p-6 space-y-4">
        <h2 className="font-semibold">Nova release</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Versão</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="15.4.0" /></div>
          <div><Label>Versão mínima</Label><Input value={form.min_version} onChange={(e) => setForm({ ...form, min_version: e.target.value })} placeholder="15.3.0" /></div>
        </div>
        <div><Label>URL do .zip</Label><Input value={form.download_url} onChange={(e) => setForm({ ...form, download_url: e.target.value })} placeholder="https://..." /></div>
        <div><Label>Changelog</Label><Textarea value={form.changelog} onChange={(e) => setForm({ ...form, changelog: e.target.value })} rows={4} /></div>
        <div className="flex items-center gap-2">
          <Switch checked={form.force_update} onCheckedChange={(v) => setForm({ ...form, force_update: v })} />
          <Label>Forçar atualização</Label>
        </div>
        <Button onClick={create} className="gradient-accent border-0 text-white"><Plus className="h-4 w-4 mr-1" />Publicar</Button>
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
