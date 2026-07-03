import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/skills")({
  component: Page,
  head: () => ({ meta: [{ title: "Skills — UEDA EX 5.0" }] }),
});

type Skill = {
  id: string; name: string; description: string; icon: string;
  status: boolean; payload: string; display_order: number;
};

function Page() {
  const [rows, setRows] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Skill | null>(null);

  const load = async () => {
    const { data } = await supabase.from("skills").select("*").order("display_order");
    setRows((data as Skill[]) || []);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (s: Skill) => {
    await supabase.from("skills").update({ status: !s.status }).eq("id", s.id);
    load();
  };

  const move = async (s: Skill, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === s.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("skills").update({ display_order: swap.display_order }).eq("id", s.id),
      supabase.from("skills").update({ display_order: s.display_order }).eq("id", swap.id),
    ]);
    load();
  };

  const create = async () => {
    const max = rows.reduce((m, r) => Math.max(m, r.display_order), 0);
    await supabase.from("skills").insert({ name: "Nova skill", display_order: max + 1, icon: "Zap", payload: "" });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Deletar skill?")) return;
    await supabase.from("skills").delete().eq("id", id);
    if (editing?.id === id) setEditing(null);
    load();
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from("skills").update({
      name: editing.name, description: editing.description, icon: editing.icon, payload: editing.payload,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Skills</h1>
          <p className="text-muted-foreground text-sm">Ative, reordene e edite payloads</p>
        </div>
        <Button onClick={create} className="gradient-accent border-0 text-white"><Plus className="h-4 w-4 mr-1" />Nova</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-0 p-4 space-y-2">
          {rows.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer ${editing?.id === s.id ? "bg-white/10" : ""}`} onClick={() => setEditing(s)}>
              <Switch checked={s.status} onCheckedChange={() => toggle(s)} onClick={(e) => e.stopPropagation()} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground truncate">{s.description}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); move(s, -1); }} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); move(s, 1); }} disabled={i === rows.length - 1}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del(s.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          ))}
        </Card>
        <Card className="glass-card border-0 p-4">
          {editing ? (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Ícone (Lucide)</Label><Input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="Zap, StickyNote, Download..." /></div>
              <div>
                <Label>Payload (JS)</Label>
                <Textarea value={editing.payload} onChange={(e) => setEditing({ ...editing, payload: e.target.value })}
                  className="font-mono text-xs min-h-[300px] bg-black/40" />
              </div>
              <Button onClick={save} className="gradient-accent border-0 text-white w-full"><Save className="h-4 w-4 mr-1" />Salvar</Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">Selecione uma skill para editar</div>
          )}
        </Card>
      </div>
    </div>
  );
}
