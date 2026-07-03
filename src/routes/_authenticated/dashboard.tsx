import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Sparkles, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — UEDA EX 5.0" }] }),
});

function Dashboard() {
  const [stats, setStats] = useState({ requests24h: 0, activeSkills: 0, version: "-" });

  useEffect(() => {
    (async () => {
      const [req, sk, ver] = await Promise.all([
        supabase.from("request_log").select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", true),
        supabase.from("settings").select("value").eq("key", "ext_version").maybeSingle(),
      ]);
      setStats({
        requests24h: req.count ?? 0,
        activeSkills: sk.count ?? 0,
        version: ver.data?.value ?? "-",
      });
    })();
  }, []);

  const cards = [
    { label: "Requisições 24h", value: stats.requests24h, icon: Activity },
    { label: "Skills ativas", value: stats.activeSkills, icon: Sparkles },
    { label: "Versão atual", value: stats.version, icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral em tempo real</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="glass-card border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
