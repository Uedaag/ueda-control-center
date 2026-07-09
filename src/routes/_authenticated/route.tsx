import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutDashboard, Sparkles, Settings, LogOut, KeyRound, Sun, Moon } from "lucide-react";
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
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function Layout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const currentLabel = items.find((i) => i.to === pathname)?.label ?? "";

  return (
    <SidebarProvider defaultOpen={false}>
      <TooltipProvider delayDuration={150}>
        <div className="min-h-screen flex w-full bg-background">
          <Sidebar collapsible="icon" className="border-r border-sidebar-border">
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
                            <SidebarMenuButton asChild isActive={active} className="transition-colors">
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
                  <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start gap-2">
                    <LogOut className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Sair</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </SidebarFooter>
          </Sidebar>
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center border-b border-border/60 bg-background/70 backdrop-blur-md px-4 gap-3 sticky top-0 z-30">
              <SidebarTrigger />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">UEDA EX</span>
                <span className="text-sm font-semibold text-foreground truncate">{currentLabel}</span>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
                      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{theme === "dark" ? "Tema claro" : "Tema escuro"}</TooltipContent>
                </Tooltip>
              </div>
            </header>
            <main className="flex-1 p-6 overflow-auto">
              <div className="mx-auto w-full max-w-7xl">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}

