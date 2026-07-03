import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/licencas")({
  component: Page,
  head: () => ({ meta: [{ title: "Licenças — UEDA EX 5.0" }] }),
});

type License = {
  id: string; key: string; label: string; status: string;
  credits: number; expires_at: string | null; created_at: string;
};

function genKey() {
  const rand = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("");
  return `UEDA-${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}`.toUpperCase();
}

function Page() {
  const [rows, setRows] = useState<License[]>([]);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(30);
  const [credits, setCredits] = useState(500);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("licenses").select("*").order("created_at", { ascending: false });
    setRows((data as License[]) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!label.trim()) return toast.error("Informe um nome/rótulo");
    setCreating(true);
    const expires_at = days > 0 ? new Date(Date.now() + days * 86400_000).toISOString() : null;
    const { error } = await supabase.from("licenses").insert({
      key: genKey(), label: label.trim(), credits, expires_at, status: "active",
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    setLabel(""); toast.success("Licença criada");
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir licença?")) return;
    await supabase.from("licenses").delete().eq("id", id);
    load();
  };

  const copy = (k: string) => { navigator.clipboard.writeText(k); toast.success("Chave copiada"); };

  const fmtRemaining = (iso: string | null) => {
    if (!iso) return "∞";
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "Expirada";
    const d = Math.floor(ms / 86400_000);
    const h = Math.floor((ms % 86400_000) / 3600_000);
    return `${d}d ${h}h`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Licenças</h1>
        <p className="text-muted-foreground text-sm">Gere chaves de ativação para seus clientes.</p>
      </div>

      <Card className="glass-card border-0 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_120px_120px_auto]">
          <div>
            <Label className="text-xs">Nome / Cliente</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: João Silva" />
          </div>
          <div>
            <Label className="text-xs">Dias</Label>
            <Input type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Créditos</Label>
            <Input type="number" min={0} value={credits} onChange={(e) => setCredits(Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <Button onClick={create} disabled={creating} className="gradient-accent border-0 text-white w-full">
              <Plus className="h-4 w-4 mr-1" /> Gerar chave
            </Button>
          </div>
        </div>
      </Card>

      <Card className="glass-card border-0 p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b border-white/5">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Chave</th>
              <th className="text-left px-4 py-3">Créditos</th>
              <th className="text-left px-4 py-3">Restante</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 font-medium">{r.label || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  <span className="truncate max-w-[220px] inline-block align-middle">{r.key}</span>
                  <button onClick={() => copy(r.key)} className="ml-2 text-muted-foreground hover:text-white">
                    <Copy className="h-3.5 w-3.5 inline" />
                  </button>
                </td>
                <td className="px-4 py-3">{r.credits}</td>
                <td className="px-4 py-3">{fmtRemaining(r.expires_at)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => del(r.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nenhuma licença. Gere a primeira acima.
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
