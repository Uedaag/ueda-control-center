import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutDashboard, Sparkles, Rocket, Eye, Settings, LogOut, KeyRound, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

import logoAsset from "@/assets/ueda-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const isAdmin = (roles || []).some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/licencas", label: "Licenças", icon: KeyRound },
  { to: "/skills", label: "Skills", icon: Sparkles },
  { to: "/releases", label: "Releases", icon: Rocket },
  { to: "/preview", label: "Preview", icon: Eye },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function Layout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <TooltipProvider delayDuration={150}>
        <div className="min-h-screen flex w-full">
          <Sidebar collapsible="icon" className="border-r border-white/5">
            <SidebarHeader className="p-3 group-data-[collapsible=icon]:p-2">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <img src={logoAsset.url} alt="UEDA" width={32} height={32} className="w-8 h-8 shrink-0 object-contain" style={{ aspectRatio: "1 / 1" }} />
                <span className="font-bold gradient-text truncate group-data-[collapsible=icon]:hidden">UEDA EX</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = pathname === item.to;
                    return (
                      <SidebarMenuItem key={item.to}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild isActive={active}>
                              <Link to={item.to}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={logout} className="w-full justify-start gap-2">
                    <LogOut className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Sair</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </SidebarFooter>
          </Sidebar>
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-12 flex items-center border-b border-white/5 px-3 gap-2">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground">
                {items.find((i) => i.to === pathname)?.label ?? ""}
              </span>
            </header>
            <main className="flex-1 p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}
