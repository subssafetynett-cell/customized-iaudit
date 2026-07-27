import { type ComponentType } from "react";
import { Building2, LayoutDashboard, FileText, ClipboardCheck, FileCheck, CreditCard, Users, ClipboardList, AlertTriangle, ShieldCheck, MessageSquare, Rocket } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { AUDITEE_SIDEBAR_URLS } from "@/lib/auditeeAccess";
import { useStoredUser } from "@/hooks/useStoredUser";
import { isAuditeeRole } from "@/lib/userRoles";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const dashboardNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Start Onboarding", url: "/getting-started", icon: Rocket },
];

const managementNav = [
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "Users", url: "/users", icon: Users },
  { title: "Self Assessment", url: "/self-assessment", icon: ClipboardCheck },
  { title: "Gap Analysis", url: "/gap-analysis", icon: ClipboardList },
  { title: "Audit Program", url: "/audits", icon: FileCheck },
  { title: "Audit Plan", url: "/audit-program", icon: ClipboardCheck },
  { title: "Audit", url: "/audit", icon: ClipboardList },
  { title: "Findings", url: "/audit-findings", icon: AlertTriangle },
  { title: "Findings Dashboard", url: "/nonconformances", icon: ClipboardList },
  { title: "Audit Templates", url: "/audit-templates", icon: FileText },
];

const billingNav = [
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Subscription", url: "/subscription", icon: CreditCard },
];

function readRoleFromStorage(): string | undefined {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { role?: unknown };
    return typeof parsed.role === "string" ? parsed.role : undefined;
  } catch {
    return undefined;
  }
}

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useStoredUser();

  // Prefer live stored role; fall back to localStorage so a stale React state
  // cannot briefly (or persistently) apply the reduced auditee menu.
  const role =
    (typeof user?.role === "string" && user.role) || readRoleFromStorage();
  const isAuditee = isAuditeeRole(role);

  const filterForRole = <T extends { url: string }>(items: T[]): T[] => {
    if (!isAuditee) return items;
    return items.filter((item) => AUDITEE_SIDEBAR_URLS.has(item.url.split("?")[0]));
  };

  const visibleDashboardNav = filterForRole(dashboardNav);
  const visibleManagementNav = filterForRole(managementNav);
  const visibleBillingNav = filterForRole(billingNav);

  const isActive = (path: string) => {
    if (path === "/companies") return currentPath === "/companies" || currentPath.startsWith("/company/");
    if (path === "/getting-started") return currentPath === "/getting-started";
    if (path === "/audit-findings") return currentPath === "/audit-findings";
    if (path === "/nonconformances") {
      return (
        currentPath === "/nonconformances" ||
        /^\/nonconformances\/[^/]+$/.test(currentPath)
      );
    }
    const pathOnly = path.split("?")[0];
    return currentPath === pathOnly;
  };

  const isSuperAdminPage = currentPath === "/super-admin";
  const isSuperAdminUser = String(role ?? "").trim().toLowerCase() === "superadmin";

  const navButtonClass = (active: boolean) =>
    cn(
      "h-auto py-1.5 px-3 transition-all duration-200 group",
      active ? "bg-[#ecfdf5] rounded-[14px]" : "rounded-lg",
    );

  const renderNavItem = (
    item: { title: string; url: string; icon: ComponentType<{ className?: string }> },
    opts?: { id?: string; end?: boolean; emphasize?: boolean },
  ) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={active} className={navButtonClass(active)}>
          <NavLink
            id={opts?.id}
            to={item.url}
            end={opts?.end}
            className="flex items-center gap-3"
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
                active ? "bg-[#1e855e] text-white" : "bg-transparent text-slate-400",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
            </div>
            <span
              className={cn(
                "text-sm tracking-tight transition-colors flex-1",
                opts?.emphasize
                  ? "text-[#166534] font-bold"
                  : active
                    ? "text-[#1e855e] font-bold"
                    : "text-slate-400 font-normal",
              )}
            >
              {item.title}
            </span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const managementTourId = (title: string): string | undefined => {
    switch (title) {
      case "Companies":
        return "tour-step-companies";
      case "Users":
        return "tour-step-users";
      case "Self Assessment":
        return "tour-step-self-assessment";
      case "Gap Analysis":
        return "tour-step-gap-analysis";
      case "Audit Program":
        return "tour-step-audit-program-nav";
      case "Audit Plan":
        return "tour-step-audit-plan-nav";
      case "Audit":
        return "tour-step-audit-nav";
      case "Findings":
        return "tour-step-findings-nav";
      case "Findings Dashboard":
        return "tour-step-nonconformances-nav";
      case "Audit Templates":
        return "tour-step-audit-templates-nav";
      default:
        return undefined;
    }
  };

  return (
    <Sidebar className="border-r border-slate-200">
      <SidebarHeader className="shrink-0 p-0 gap-0">
        <div className="flex items-center justify-start p-0 m-0 pl-4">
          <img src="/iAudit Global-01.png" alt="iAudit Global" className="h-20 w-auto object-contain block" />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto overflow-x-hidden px-0 pt-0 mt-0">
        <div className="px-2 pb-4">
        {!isSuperAdminPage ? (
          <>
            {visibleDashboardNav.length > 0 && (
              <SidebarGroup className="py-0 px-2 mt-2 first:mt-0">
                <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                  OVERVIEW
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {visibleDashboardNav.map((item) =>
                      renderNavItem(item, {
                        end: item.url === "/",
                        emphasize: item.title === "Start Onboarding",
                      }),
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {visibleManagementNav.length > 0 && (
              <SidebarGroup className="py-0 px-2 mt-2">
                <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                  MANAGEMENT
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {visibleManagementNav.map((item) =>
                      renderNavItem(item, { id: managementTourId(item.title) }),
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {visibleBillingNav.length > 0 && (
              <SidebarGroup className="py-0 px-2 mt-2 mb-1">
                <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                  {visibleBillingNav.some((i) => i.url === "/subscription")
                    ? "BILLING"
                    : "SUPPORT"}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {visibleBillingNav.map((item) => renderNavItem(item))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {isSuperAdminUser && (
              <SidebarGroup className="py-0 px-2 mt-2">
                <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                  SUPER ADMIN
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {renderNavItem(
                      { title: "Super Admin", url: "/super-admin", icon: ShieldCheck },
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        ) : (
          <SidebarGroup className="py-0 px-2 mt-2">
            <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
              ADMINISTRATION
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {renderNavItem({ title: "Users", url: "/super-admin", icon: Users })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
