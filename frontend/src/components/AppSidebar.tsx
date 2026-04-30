import { Building2, LayoutDashboard, FileText, ClipboardCheck, BookOpen, FileCheck, BarChart3, CreditCard, ChevronRight, Users, ClipboardList, AlertTriangle, ShieldCheck, MessageSquare } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";


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
];

const managementNav = [
  { title: "Company", url: "/companies", icon: Building2 },
  { title: "Users", url: "/users", icon: Users },
  { title: "Self Assessment", url: "/self-assessment", icon: ClipboardCheck },
  { title: "Gap Analysis", url: "/gap-analysis", icon: ClipboardList },
  { title: "Audit Program", url: "/audits", icon: FileCheck },
  { title: "Audit Plan", url: "/audit-program", icon: ClipboardCheck },
  { title: "Audit", url: "/audit", icon: ClipboardList },
  { title: "Findings", url: "/audit-findings", icon: AlertTriangle },
  { title: "Audit Templates", url: "/audit-templates", icon: FileText },
];

const billingNav = [
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Subscription", url: "/subscription", icon: CreditCard },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/companies") return currentPath === "/companies" || currentPath.startsWith("/company/");
    return currentPath === path;
  };

  const isSuperAdminPage = currentPath === "/super-admin";

  return (
    <Sidebar className="border-r border-slate-200">
      <SidebarHeader className="p-0 gap-0">
        <div className="flex items-center justify-start p-0 m-0 pl-4">
          <img src="/iAudit Global-01.png" alt="iAudit Global" className="h-20 w-auto object-contain block" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-0 mt-0 gap-0">
        {!isSuperAdminPage ? (
          <>
            <SidebarGroup className="py-0 px-2 mt-2 first:mt-0">
              <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                OVERVIEW
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {dashboardNav.map((item) => {
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

            <SidebarGroup className="py-0 px-2 mt-2">
              <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                MANAGEMENT
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {managementNav.map((item) => {
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

            <SidebarGroup className="py-0 px-2 mt-2">
              <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 px-4 mb-0.5">
                BILLING
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {billingNav.map((item) => {
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
      </SidebarContent>
    </Sidebar>
  );
}