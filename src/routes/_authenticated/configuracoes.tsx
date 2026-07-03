import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Page,
  head: () => ({ meta: [{ title: "Configurações — UEDA EX 5.0" }] }),
});

const KEYS = [
  { key: "widget_accent_color", label: "Cor accent do widget", type: "color" },
  { key: "widget_title", label: "Título do widget", type: "text" },
  { key: "widget_subtitle", label: "Subtítulo do widget", type: "text" },
  { key: "update_url", label: "URL de atualização", type: "text" },
];

function Page() {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("settings").select("key,value").then(({ data }) => {
      const v: Record<string, string> = {};
      (data || []).forEach((r: any) => (v[r.key] = r.value));
      setValues(v);
    });
  }, []);

  const save = async () => {
    const rows = KEYS.map((k) => ({ key: k.key, value: values[k.key] ?? "" }));
    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Configurações</h1>
        <p className="text-muted-foreground text-sm">Personalize o widget da extensão</p>
      </div>
      <Card className="glass-card border-0 p-6 space-y-4">
        {KEYS.map((k) => (
          <div key={k.key}>
            <Label>{k.label}</Label>
            <Input
              type={k.type}
              value={values[k.key] ?? ""}
              onChange={(e) => setValues({ ...values, [k.key]: e.target.value })}
            />
          </div>
        ))}
        <Button onClick={save} className="gradient-accent border-0 text-white"><Save className="h-4 w-4 mr-1" />Salvar</Button>
      </Card>
    </div>
  );
}
