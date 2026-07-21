import { useEffect, useState } from "react";
import { Building2, LayoutDashboard, FileText, ClipboardCheck, BookOpen, FileCheck, BarChart3, CreditCard, ChevronRight, Users, ClipboardList, AlertTriangle, ShieldCheck, MessageSquare, Rocket, UserPlus } from "lucide-react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { isAuditeeUser, AUDITEE_SIDEBAR_URLS } from "@/lib/auditeeAccess";
import { useStoredUser } from "@/hooks/useStoredUser";


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
  SidebarSeparator,
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
  { title: "Invite Auditee", url: "/invite-auditee", icon: UserPlus },
  { title: "Audit Templates", url: "/audit-templates", icon: FileText },
];

const billingNav = [
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Subscription", url: "/subscription", icon: CreditCard },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [canInviteAuditee, setCanInviteAuditee] = useState(false);
  const { user } = useStoredUser();
  const isAuditee = isAuditeeUser(user as { role?: string } | null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/users/invite-auditee/access");
        if (cancelled) return;
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCanInviteAuditee(data.allowed === true);
      } catch {
        if (!cancelled) setCanInviteAuditee(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleManagementNav = managementNav.filter((item) => {
    const path = item.url.split("?")[0];
    if (isAuditee && !AUDITEE_SIDEBAR_URLS.has(path)) {
      return false;
    }
    if (item.title === "Invite Auditee" && !canInviteAuditee) {
      return false;
    }
    return true;
  });

  const visibleDashboardNav = dashboardNav.filter((item) => {
    const path = item.url.split("?")[0];
    if (isAuditee && !AUDITEE_SIDEBAR_URLS.has(path)) {
      return false;
    }
    return true;
  });

  const visibleBillingNav = billingNav.filter((item) => {
    const path = item.url.split("?")[0];
    if (isAuditee && !AUDITEE_SIDEBAR_URLS.has(path)) {
      return false;
    }
    return true;
  });

  const isActive = (path: string) => {
    if (path === "/companies") return currentPath === "/companies" || currentPath.startsWith("/company/");
    if (path === "/getting-started") return currentPath === "/getting-started";
    if (path === "/audit-findings") return currentPath === "/audit-findings";
    const pathOnly = path.split("?")[0];
    return currentPath === pathOnly;
  };

  const isSuperAdminPage = currentPath === "/super-admin";

  return (
    <Sidebar className="border-r border-slate-200 [&_[data-sidebar=sidebar]]:overflow-hidden">
      <SidebarHeader className="shrink-0 p-0 gap-0">
        <div className="flex items-center justify-start p-0 m-0 pl-4">
          <img src="/iAudit Global-01.png" alt="iAudit Global" className="h-20 w-auto object-contain block" />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden px-0 pt-0 mt-0">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
        {!isSuperAdminPage ? (
          <>
            <SidebarGroup className="py-0 px-2 mt-2 first:mt-0">
              <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                OVERVIEW
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {visibleDashboardNav.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn(
                            "h-auto py-1.5 px-3 transition-all duration-200 group",
                            active
                              ? "bg-[#ecfdf5] rounded-[14px]"
                              : "rounded-lg"
                          )}
                        >
                          <NavLink to={item.url} end={item.url === "/"} className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
                              active
                                ? "bg-[#1e855e] text-white"
                                : "bg-transparent text-slate-400"
                            )}>
                              <item.icon className="h-[18px] w-[18px]" />
                            </div>
                            <span className={cn(
                              "text-sm tracking-tight transition-colors",
                              item.title === "Start Onboarding"
                                ? "text-[#166534] font-bold"
                                : active
                                  ? "text-[#1e855e] font-bold"
                                  : "text-slate-400 font-normal"
                            )}>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="py-0 px-2 mt-2">
              <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                MANAGEMENT
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {visibleManagementNav.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn(
                            "h-auto py-1 px-3 transition-all duration-200 group",
                            active
                              ? "bg-[#ecfdf5] rounded-[14px]"
                              : "rounded-lg"
                          )}
                        >
                          <NavLink 
                            id={
                              item.title === "Companies"
                                ? "tour-step-companies"
                                : item.title === "Users"
                                  ? "tour-step-users"
                                  : item.title === "Self Assessment"
                                    ? "tour-step-self-assessment"
                                    : item.title === "Gap Analysis"
                                      ? "tour-step-gap-analysis"
                                      : item.title === "Audit Program"
                                        ? "tour-step-audit-program-nav"
                                        : item.title === "Audit Plan"
                                          ? "tour-step-audit-plan-nav"
                                          : item.title === "Audit"
                                            ? "tour-step-audit-nav"
                                            : item.title === "Findings"
                                              ? "tour-step-findings-nav"
                                              : item.title === "Invite Auditee"
                                                ? "tour-step-invite-auditee-nav"
                                                : item.title === "Audit Templates"
                                                ? "tour-step-audit-templates-nav"
                                                : undefined
                            }
                            to={item.url} 
                            className="flex items-center gap-3"
                          >
                            <div className={cn(
                              "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
                              active
                                ? "bg-[#1e855e] text-white"
                                : "bg-transparent text-slate-400"
                            )}>
                              <item.icon className="h-[18px] w-[18px]" />
                            </div>
                            <span className={cn(
                              "text-sm tracking-tight transition-colors flex-1",
                              active
                                ? "text-[#1e855e] font-bold"
                                : "text-slate-400 font-normal"
                            )}>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="py-0 px-2 mt-2 mb-1">
              <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                BILLING
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {visibleBillingNav.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn(
                            "h-auto py-1 px-3 transition-all duration-200 group",
                            active
                              ? "bg-[#ecfdf5] rounded-[14px]"
                              : "rounded-lg"
                          )}
                        >
                          <NavLink to={item.url} className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
                              active
                                ? "bg-[#1e855e] text-white"
                                : "bg-transparent text-slate-400"
                            )}>
                              <item.icon className="h-[18px] w-[18px]" />
                            </div>
                            <span className={cn(
                              "text-sm tracking-tight transition-colors",
                              active
                                ? "text-[#1e855e] font-bold"
                                : "text-slate-400 font-normal"
                            )}>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Super Admin Section - only shown to superadmin users */}
            {(() => {
              const userString = localStorage.getItem('user');
              if (!userString) return null;
              try {
                const user = JSON.parse(userString);
                if (user.role !== 'superadmin') return null;
              } catch (e) {
                return null;
              }

              return (
                <SidebarGroup className="py-0 px-2 mt-2">
                  <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                    SUPER ADMIN
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive("/super-admin")}
                          className={cn(
                            "h-auto py-1 px-3 transition-all duration-200 group",
                            isActive("/super-admin")
                              ? "bg-[#ecfdf5] rounded-[14px]"
                              : "rounded-lg"
                          )}
                        >
                          <NavLink to="/super-admin" className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
                              isActive("/super-admin")
                                ? "bg-[#1e855e] text-white"
                                : "bg-transparent text-slate-400"
                            )}>
                              <ShieldCheck className="h-[18px] w-[18px]" />
                            </div>
                            <span className={cn(
                              "text-sm tracking-tight transition-colors",
                              isActive("/super-admin")
                                ? "text-[#1e855e] font-bold"
                                : "text-slate-400 font-normal"
                            )}>Super Admin</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })()}
          </>
        ) : (
          <SidebarGroup className="py-0 px-2 mt-2">
            <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
              ADMINISTRATION
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={true}
                    className="h-auto py-1.5 px-3 bg-[#ecfdf5] rounded-[14px] group"
                  >
                    <NavLink to="/super-admin" className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-lg p-1.5 bg-[#1e855e] text-white transition-all duration-200">
                        <Users className="h-[18px] w-[18px]" />
                      </div>
                      <span className="text-sm tracking-tight text-[#1e855e] font-bold transition-colors">Users</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}