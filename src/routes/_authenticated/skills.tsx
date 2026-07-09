import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/skills")({
  component: Page,
  head: () => ({ meta: [{ title: "Skills — UEDA EX 5.0" }] }),
});

type Skill = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: boolean;
  payload: string;
  display_order: number;
  parent_id: string | null;
  action_type: string; // 'js' | 'chat_prompt'
  auto_send: boolean;
  prompt_text: string;
};

function Page() {
  const [rows, setRows] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Skill | null>(null);

  const load = async () => {
    const { data } = await supabase.from("skills").select("*").order("display_order");
    setRows((data as Skill[]) || []);
    setEditing((cur) => (cur ? (data as Skill[])?.find((r) => r.id === cur.id) ?? null : cur));
  };
  useEffect(() => {
    load();
  }, []);

  const parents = useMemo(() => rows.filter((r) => !r.parent_id), [rows]);
  const grouped = useMemo(() => {
    const top = rows.filter((r) => !r.parent_id);
    return top.map((p) => ({ parent: p, children: rows.filter((r) => r.parent_id === p.id) }));
  }, [rows]);

  const toggle = async (s: Skill) => {
    await supabase.from("skills").update({ status: !s.status }).eq("id", s.id);
    load();
  };

  const move = async (s: Skill, dir: -1 | 1) => {
    const siblings = rows.filter((r) => r.parent_id === s.parent_id);
    const idx = siblings.findIndex((r) => r.id === s.id);
    const swap = siblings[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("skills").update({ display_order: swap.display_order }).eq("id", s.id),
      supabase.from("skills").update({ display_order: s.display_order }).eq("id", swap.id),
    ]);
    load();
  };

  const create = async (parent_id: string | null = null) => {
    const max = rows.reduce((m, r) => Math.max(m, r.display_order), 0);
    await supabase.from("skills").insert({
      name: parent_id ? "Novo submenu" : "Nova skill",
      display_order: max + 1,
      icon: "Zap",
      payload: "",
      parent_id,
      action_type: "chat_prompt",
      auto_send: true,
      prompt_text: "",
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Deletar skill? Submenus também serão removidos.")) return;
    await supabase.from("skills").delete().eq("id", id);
    if (editing?.id === id) setEditing(null);
    load();
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("skills")
      .update({
        name: editing.name,
        description: editing.description,
        icon: editing.icon,
        payload: editing.payload,
        parent_id: editing.parent_id,
        action_type: editing.action_type,
        auto_send: editing.auto_send,
        prompt_text: editing.prompt_text,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Skill salva");
    load();
  };

  const renderRow = (s: Skill, i: number, total: number, isChild = false) => (
    <div
      key={s.id}
      className={`flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer ${editing?.id === s.id ? "bg-white/10" : ""} ${isChild ? "ml-6 border-l border-white/10 pl-3" : ""}`}
      onClick={() => setEditing(s)}
    >
      {isChild && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
      <Switch checked={s.status} onCheckedChange={() => toggle(s)} onClick={(e) => e.stopPropagation()} />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate flex items-center gap-2">
          {s.name}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground uppercase tracking-wider">
            {s.action_type === "chat_prompt" ? (s.auto_send ? "prompt • auto" : "prompt") : "js"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">{s.description}</div>
      </div>
      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); move(s, -1); }} disabled={i === 0}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); move(s, 1); }} disabled={i === total - 1}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      {!isChild && (
        <Button size="icon" variant="ghost" title="Adicionar submenu" onClick={(e) => { e.stopPropagation(); create(s.id); }}>
          <Plus className="h-4 w-4" />
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del(s.id); }}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Skills</h1>
          <p className="text-muted-foreground text-sm">
            Menus e submenus da extensão. Aprove com o Switch — só skills ativas aparecem para o cliente.
          </p>
        </div>
        <Button onClick={() => create(null)} className="gradient-accent border-0 text-white">
          <Plus className="h-4 w-4 mr-1" />
          Nova skill
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-0 p-4 space-y-1">
          {grouped.map(({ parent, children }, i) => (
            <div key={parent.id} className="space-y-1">
              {renderRow(parent, i, parents.length)}
              {children.map((c, ci) => renderRow(c, ci, children.length, true))}
            </div>
          ))}
          {rows.length === 0 && (
            <div className="text-center text-muted-foreground py-10 text-sm">
              Sem skills. Clique em "Nova skill" para começar.
            </div>
          )}
        </Card>
        <Card className="glass-card border-0 p-4">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label>Ícone (Lucide)</Label>
                  <Input
                    value={editing.icon}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                    placeholder="Zap, Sparkles, Download..."
                  />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Localização no menu</Label>
                  <Select
                    value={editing.parent_id ?? "__root__"}
                    onValueChange={(v) => setEditing({ ...editing, parent_id: v === "__root__" ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__root__">Menu principal</SelectItem>
                      {parents
                        .filter((p) => p.id !== editing.id)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>Submenu de: {p.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de ação</Label>
                  <Select
                    value={editing.action_type}
                    onValueChange={(v) => setEditing({ ...editing, action_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat_prompt">Injetar prompt no chat</SelectItem>
                      <SelectItem value="js">Executar código JS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editing.action_type === "chat_prompt" ? (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                    <div>
                      <Label className="cursor-pointer">Envio automático</Label>
                      <p className="text-xs text-muted-foreground">Ao clicar, injeta o texto e aperta Enter sem confirmação.</p>
                    </div>
                    <Switch
                      checked={editing.auto_send}
                      onCheckedChange={(v) => setEditing({ ...editing, auto_send: v })}
                    />
                  </div>
                  <div>
                    <Label>Prompt / mensagem a injetar</Label>
                    <Textarea
                      value={editing.prompt_text}
                      onChange={(e) => setEditing({ ...editing, prompt_text: e.target.value })}
                      className="min-h-[240px] bg-black/40"
                      placeholder="Texto que será colado no chat ao clicar nesta skill..."
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label>Payload (JS)</Label>
                  <Textarea
                    value={editing.payload}
                    onChange={(e) => setEditing({ ...editing, payload: e.target.value })}
                    className="font-mono text-xs min-h-[240px] bg-black/40"
                  />
                </div>
              )}

              <Button onClick={save} className="gradient-accent border-0 text-white w-full">
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">Selecione uma skill para editar</div>
          )}
        </Card>
      </div>
    </div>
  );
}
