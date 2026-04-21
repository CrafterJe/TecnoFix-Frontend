import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  ShieldCheck,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Wrench,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Órdenes", href: "/ordenes", icon: ClipboardList },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Inventario", href: "/inventario", icon: Package },
  { label: "Cotizaciones", href: "/cotizaciones", icon: FileText },
  { label: "Usuarios", href: "/usuarios", icon: UserCog, roles: ["admin"] },
  { label: "Auditoría", href: "/auditoria", icon: ShieldCheck, roles: ["admin"] },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.rol))
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-14 border-b border-sidebar-border px-4 shrink-0",
            sidebarCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-lg tracking-tight">TecnoFix</span>
          )}
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-2">
          <nav className="px-2 space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const link = (
                <NavLink
                  to={item.href}
                  end={item.href === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70",
                      sidebarCollapsed && "justify-center px-2"
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.href}>{link}</div>;
            })}
          </nav>
        </ScrollArea>

        <Separator className="bg-sidebar-border" />

        {/* Collapse toggle */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Version footer */}
        <div
          className={cn(
            "px-3 pb-2 text-[10px] text-sidebar-foreground/50 select-none",
            sidebarCollapsed ? "text-center" : "text-left"
          )}
        >
          v{__APP_VERSION__}
        </div>
      </aside>
    </TooltipProvider>
  );
}
