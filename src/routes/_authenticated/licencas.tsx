import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/licencas")({
  component: Page,
  head: () => ({ meta: [{ title: "Licenças — UEDA EX 5.0" }] }),
});

type Lic = {
  id: string; key: string; label: string | null; status: string;
  fingerprint: string | null; credits: number; expires_at: string | null;
};

const statusVariant = (s: string) =>
  s === "active" ? "default" : s === "suspended" ? "secondary" : s === "banned" ? "destructive" : "outline";

function Page() {
  const [rows, setRows] = useState<Lic[]>([]);
  const [search, setSearch] = useState("");
  const [newKey, setNewKey] = useState("");

  const load = async () => {
    const { data } = await supabase.from("licenses").select("*").order("created_at", { ascending: false });
    setRows((data as Lic[]) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const key = newKey || crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
    const { error } = await supabase.from("licenses").insert({ key, credits: 1000, status: "active" });
    if (error) return toast.error(error.message);
    setNewKey(""); toast.success("Licença criada"); load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("licenses").update({ status }).eq("id", id);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Deletar licença?")) return;
    await supabase.from("licenses").delete().eq("id", id);
    load();
  };

  const setCredits = async (id: string, credits: number) => {
    await supabase.from("licenses").update({ credits }).eq("id", id);
    load();
  };

  const filtered = rows.filter((r) => r.key.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Licenças</h1>
          <p className="text-muted-foreground text-sm">Gerencie chaves e créditos</p>
        </div>
      </div>
      <Card className="glass-card border-0 p-4 space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Buscar por key..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Input placeholder="Nova key (vazio = auto)" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="max-w-xs" />
          <Button onClick={create} className="gradient-accent border-0 text-white"><Plus className="h-4 w-4 mr-1" />Nova</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>Fingerprint</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.key}</TableCell>
                <TableCell><Badge variant={statusVariant(l.status)}>{l.status}</Badge></TableCell>
                <TableCell>
                  <Input type="number" defaultValue={l.credits} className="w-24 h-8"
                    onBlur={(e) => setCredits(l.id, Number(e.target.value))} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[160px]">
                  {l.fingerprint || "—"}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {l.status !== "active" && (
                    <Button size="icon" variant="ghost" onClick={() => setStatus(l.id, "active")}><CheckCircle className="h-4 w-4 text-green-500" /></Button>
                  )}
                  {l.status !== "suspended" && (
                    <Button size="icon" variant="ghost" onClick={() => setStatus(l.id, "suspended")}><Ban className="h-4 w-4 text-yellow-500" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => del(l.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma licença</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
