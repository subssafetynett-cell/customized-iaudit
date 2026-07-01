import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyStore } from "@/hooks/useCompanyStore";
import {
  formatDeleteDepartmentDescription,
  formatDeleteSiteDescription,
  SITE_NAME_MAX,
  COMPANY_NAME_MAX,
  COMPANY_DESCRIPTION_MAX,
  truncateForDisplay,
} from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  ShieldCheck,
  MapPin,
  Users,
  Trash2,
  Pencil,
  ArrowLeft,
  Search,
  Eye,
  MoreHorizontal,
  Phone,
  Briefcase,
  UserCheck,
  Award
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import CompanyModal from "@/components/CompanyModal";
import SiteModal from "@/components/SiteModal";
import DepartmentModal from "@/components/DepartmentModal";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import ReusablePagination from "@/components/ReusablePagination";
import { Company, Site, Department } from "@/types/company";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TourStepPopover } from "@/components/TourStepPopover";
import { ONBOARDING_TOTAL_STEPS } from "@/lib/onboardingTour";
import { toast } from "sonner";

function siteContactDisplay(site: Site): { primary: string; secondary?: string } | null {
  const name = site.contactName?.trim();
  const position = site.contactPosition?.trim();
  const phone = site.contactNumber?.trim();
  const email = site.email?.trim();

  if (name) {
    return {
      primary: position ? `${name}, ${position}` : name,
      secondary: phone || email || undefined,
    };
  }
  if (phone) return { primary: phone, secondary: email || undefined };
  if (email) return { primary: email };
  return null;
}

const CompaniesPage = () => {
  const {
    companies, addCompany, addSite, addDepartment, deleteSite,
    deleteDepartment, updateCompany, updateSite, updateDepartment, deleteCompany, isLoading
  } = useCompanyStore();
  const navigate = useNavigate();

  // Navigation and Selection state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("sites");

  /** Keep onboarding step in the URL so Next/Back survives re-renders and matches UI state. */
  const setTourStep = (step: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("onboarding", "true");
        next.set("step", String(step));
        return next;
      },
      { replace: true }
    );
  };

  const exitOnboardingTour = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("onboarding");
        next.delete("step");
        return next;
      },
      { replace: true }
    );
    setShowOnboardingGuide(false);
    setShowAddSite(false);
    setAddDeptSiteId(null);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Modal states
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showEditCompany, setShowEditCompany] = useState<Company | null>(null);
  const [showAddSite, setShowAddSite] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [addDeptSiteId, setAddDeptSiteId] = useState<string | null>(null);
  const [editDept, setEditDept] = useState<{ siteId: string; dept: Department } | null>(null);

  const tourCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) ?? companies[0],
    [companies, selectedCompanyId],
  );
  const tourCompanyHasSites = (tourCompany?.sites?.length ?? 0) > 0;

  useEffect(() => {
    const onboarding = searchParams.get("onboarding") === "true";
    if (!onboarding) {
      setShowOnboardingGuide(false);
      return;
    }

    const step = parseInt(searchParams.get("step") || "3", 10);
    if (!Number.isFinite(step)) return;

    setShowOnboardingGuide(true);

    const firstSiteId = tourCompany?.sites?.[0]?.id;

    // Step 4 is only for adding a first site; skip if the company already has sites
    let effectiveStep = step;
    if (step === 4 && tourCompanyHasSites) {
      effectiveStep = 5;
      if (searchParams.get("step") !== "5") {
        setTourStep(5);
      }
    }

    setOnboardingStep(effectiveStep);

    // Step 4: open Add Site only when the company has no sites yet
    setShowAddSite(
      (effectiveStep === 4 && !tourCompanyHasSites) ||
        (effectiveStep === 7 && !firstSiteId),
    );

    if (effectiveStep >= 6 && effectiveStep <= 9) {
      setActiveTab("departments");
    } else if (effectiveStep >= 3 && effectiveStep <= 5) {
      setActiveTab("sites");
    }

    if (effectiveStep === 7 && firstSiteId) {
      setAddDeptSiteId(firstSiteId);
    } else if (effectiveStep !== 7) {
      setAddDeptSiteId(null);
    } else {
      setAddDeptSiteId(null);
    }
  }, [searchParams, tourCompany, tourCompanyHasSites]);

  // Deletion states
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<{ siteId: string; dept: Department } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Derived states
  const selectedCompany = useMemo(() =>
    companies.find(c => c.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const filteredCompanies = useMemo(() => {
    return companies.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.isoStandards.some(std => std.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [companies, searchQuery]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, currentPage, itemsPerPage]);

  const activeSite = selectedCompany?.sites.find((s) => s.id === addDeptSiteId);
  const selectedCompanyHasSites = (selectedCompany?.sites?.length ?? 0) > 0;

  const openAddDepartmentModal = (siteId?: string) => {
    if (!selectedCompany) return;
    if (selectedCompany.sites.length === 0) {
      toast.error("Add a site first, then you can create departments.");
      setActiveTab("sites");
      return;
    }
    const targetSiteId = siteId ?? selectedCompany.sites[0]?.id;
    if (!targetSiteId) return;
    setAddDeptSiteId(targetSiteId);
  };

  /** Advance tour step; modals open/close via onboarding useEffect for steps 4 and 7. */
  const goToTourStep = (step: number) => setTourStep(step);

  const advanceFromDepartmentIntroStep = () => {
    if (!selectedCompany) return;
    setActiveTab("departments");
    const siteId = selectedCompany.sites[0]?.id;
    if (siteId) {
      setAddDeptSiteId(siteId);
      setShowAddSite(false);
    } else {
      setAddDeptSiteId(null);
      setShowAddSite(true);
    }
    goToTourStep(7);
  };
  const allDepartments = selectedCompany?.sites.flatMap((s) =>
    (s.departments ?? []).map((d) => ({ ...d, siteName: s.name, siteId: s.id }))
  ) ?? [];

  const handleBackToList = () => {
    setSelectedCompanyId(null);
  };

  // Auto-select first company if exists
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // If a company is selected, show the detailed view
  if (selectedCompany) {
    return (
      <div className="h-full bg-white overflow-auto pb-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-8 relative z-10 transition-all duration-500 ease-in-out">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Company Details</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your company profile, sites, and departments</p>
            </div>
            {!isLoading && companies.length === 0 && !selectedCompanyId && (
              <Button onClick={() => setShowCreateCompany(true)} className="gap-2 shadow-sm font-semibold bg-[#213847] hover:bg-[#213847]/90 text-white rounded-xl px-5 h-11">
                <Plus className="h-4 w-4" /> Create Company
              </Button>
            )}
          </div>

          {/* Company Info Card */}
          <Card className="bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden mb-8">
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col lg:flex-row gap-10 items-start">
                {/* Logo Section */}
                <div className="h-36 w-36 rounded-full bg-slate-50 p-4 border border-slate-100 shadow-inner flex items-center justify-center shrink-0 group transition-transform hover:scale-105 overflow-hidden">
                  {selectedCompany.logo ? (
                    <img src={selectedCompany.logo} alt={selectedCompany.name} className="h-full w-full rounded-full object-contain transition-transform" />
                  ) : (
                    <Building2 className="h-20 w-20 text-slate-400 opacity-80" />
                  )}
                </div>

                {/* Info Section */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <h1
                      className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight break-words"
                      title={selectedCompany.name}
                    >
                      {truncateForDisplay(selectedCompany.name, COMPANY_NAME_MAX)}
                    </h1>
                    <p
                      className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-4xl break-words"
                      title={selectedCompany.description || undefined}
                    >
                      {selectedCompany.description
                        ? truncateForDisplay(selectedCompany.description, COMPANY_DESCRIPTION_MAX)
                        : "A forward-thinking organization dedicated to implementing world-class auditing standards and operational excellence across all departments and sites."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-3 text-slate-600 bg-slate-50/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-slate-200/60 hover:bg-white hover:shadow-md transition-all cursor-default">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shadow-lg shadow-slate-800/20">
                        <Phone className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Contact Number</span>
                        <span className="text-sm font-bold text-slate-700">{selectedCompany.contactNumber || "6235651202"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Section */}
                <div className="flex lg:flex-col gap-3 shrink-0 self-stretch justify-center lg:justify-start">
                  <Button
                    variant="ghost"
                    onClick={() => setShowEditCompany(selectedCompany)}
                    className="h-12 w-full lg:w-12 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 border border-slate-100 hover:border-blue-100 transition-all flex items-center justify-center gap-3 lg:gap-0 px-6 lg:px-0"
                  >
                    <Pencil className="h-5 w-5" />
                    <span className="lg:hidden font-bold">Edit Profile</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Bar */}
          <Card className="border-none shadow-sm mb-8 overflow-hidden rounded-xl bg-white/80">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="py-6 px-10 text-center hover:bg-slate-50/50 transition-colors">
                  <p className="text-4xl font-extrabold text-slate-800 mb-1">{selectedCompany.sites.length}</p>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Sites</p>
                </div>
                <div className="py-6 px-10 text-center hover:bg-slate-50/50 transition-colors">
                  <p className="text-4xl font-extrabold text-slate-800 mb-1">{allDepartments.length}</p>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-white border border-slate-100 shadow-sm h-14 p-0 mb-8 overflow-x-auto rounded-xl">
              <TabsTrigger
                value="sites"
                className="h-full px-8 gap-2 data-[state=active]:bg-slate-100/50 data-[state=active]:shadow-none data-[state=active]:text-slate-800 data-[state=active]:border-b-2 data-[state=active]:border-slate-800 rounded-none text-slate-500 font-bold transition-all"
              >
                <Building2 className="h-4 w-4" /> Sites
              </TabsTrigger>
              <TabsTrigger
                value="departments"
                className="h-full px-8 gap-2 data-[state=active]:bg-slate-100/50 data-[state=active]:shadow-none data-[state=active]:text-slate-800 data-[state=active]:border-b-2 data-[state=active]:border-slate-800 rounded-none text-slate-500 font-bold transition-all"
              >
                <Briefcase className="h-4 w-4" /> Departments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sites">
              <Card id="tour-step-sites-card" className="border border-slate-100 shadow-md rounded-2xl overflow-hidden bg-white">
                <div className="relative p-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 text-foreground">
                  <h2 className="text-xl font-bold shrink-0">Sites</h2>
                  <div className={`relative shrink-0 ${showOnboardingGuide && onboardingStep === 3 ? "z-[60]" : ""}`}>
                    {showOnboardingGuide && onboardingStep === 3 && (
                      <div className="absolute inset-0 -m-2 rounded-2xl ring-[8px] ring-blue-500/50 animate-pulse z-[-1]" />
                    )}
                    <Button
                      id="tour-step-add-site"
                      onClick={() => {
                        setShowAddSite(true);
                        if (showOnboardingGuide) goToTourStep(tourCompanyHasSites ? 5 : 4);
                      }}
                      className={`w-full sm:w-auto bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 px-6 rounded-lg font-bold transition-all ${showOnboardingGuide && onboardingStep === 3 ? "relative z-[60] scale-105 shadow-2xl" : ""}`}
                    >
                      <Plus className="h-4 w-4" /> Add Site
                    </Button>
                    {showOnboardingGuide && onboardingStep === 3 && (
                      <TourStepPopover
                        targetId="tour-step-add-site"
                        step={3}
                        totalSteps={ONBOARDING_TOTAL_STEPS}
                        title="Create Sites"
                        description={
                          tourCompanyHasSites
                            ? "You already have a site for this company. Press Next to continue the tour."
                            : "Use Add Site to create locations for your company, then continue with Next."
                        }
                        onNext={() => goToTourStep(tourCompanyHasSites ? 5 : 4)}
                        onBack={() => {
                          setShowOnboardingGuide(false);
                          navigate("/?restartOnboarding=true&step=2");
                        }}
                        onClose={exitOnboardingTour}
                        position="left"
                        disableShadow={false}
                      />
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                <Table className="w-full table-fixed min-w-[720px]">
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100">
                      <TableHead className="font-bold text-slate-500 py-4 px-6 uppercase text-[11px] tracking-wider w-[22%]">Site Name</TableHead>
                      <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">Type</TableHead>
                      <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">Location</TableHead>
                      <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">Contact</TableHead>
                      <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">Status</TableHead>
                      <TableHead className="font-bold text-slate-500 py-4 text-right px-6 uppercase text-[11px] tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCompany.sites.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <MapPin className="h-10 w-10 text-slate-100" />
                            <p className="text-sm font-medium">No sites recorded for this company.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedCompany.sites.map((site) => {
                        const contact = siteContactDisplay(site);
                        return (
                        <TableRow key={site.id} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                          <TableCell className="py-5 px-6 max-w-0 w-[22%]">
                            <div className="font-bold text-slate-900 break-all line-clamp-2" title={site.name}>
                              {truncateForDisplay(site.name, SITE_NAME_MAX)}
                            </div>
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3 py-0.5 text-[10px] uppercase border-none">
                              {site.siteType || "Factory"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin className="h-4 w-4 text-emerald-500" />
                              <span className="text-sm font-medium text-slate-500">{site.city || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-5">
                            {contact ? (
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-700 truncate" title={contact.primary}>
                                  {contact.primary}
                                </div>
                                {contact.secondary ? (
                                  <div className="text-xs text-slate-400 truncate" title={contact.secondary}>
                                    {contact.secondary}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold px-3 py-0.5 text-[10px]">
                              {site.status || "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5 text-right px-6">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-300 hover:text-slate-600" onClick={() => setEditSite(site)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-300 hover:text-red-500" onClick={() => setSiteToDelete(site)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                </div>
              </Card>

            </TabsContent>

            <TabsContent value="departments">
              <Card id="tour-step-departments-card" className="border border-slate-100 shadow-md rounded-2xl overflow-hidden bg-white">
                <div className="relative p-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 text-foreground">
                  <h2 className="text-xl font-bold shrink-0">Departments</h2>
                  <div className={`relative shrink-0 ${showOnboardingGuide && onboardingStep === 6 ? "z-[60]" : ""}`}>
                      {showOnboardingGuide && onboardingStep === 6 && (
                        <div className="absolute inset-0 -m-2 rounded-2xl ring-[8px] ring-blue-500/50 animate-pulse z-[-1]" />
                      )}
                      <Button
                        id="tour-step-add-dept"
                        type="button"
                        onClick={() => openAddDepartmentModal()}
                        className={`w-full sm:w-auto bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 px-6 rounded-lg font-bold transition-all ${showOnboardingGuide && onboardingStep === 6 ? "relative z-[60] scale-105 shadow-2xl" : ""}`}
                      >
                        <Plus className="h-4 w-4" /> Add Department
                      </Button>
                      {showOnboardingGuide && onboardingStep === 6 && (
                        <TourStepPopover
                          targetId="tour-step-add-dept"
                          step={6}
                          totalSteps={ONBOARDING_TOTAL_STEPS}
                          title="Create Departments"
                          description="Click Add Department to create departments for your site, or press Next to continue."
                          onNext={advanceFromDepartmentIntroStep}
                          onBack={() => goToTourStep(5)}
                          onClose={exitOnboardingTour}
                          position="left"
                          disableShadow={false}
                        />
                      )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                <Table className="w-full table-fixed min-w-[640px]">
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100">
                      <TableHead className="font-bold text-slate-500 py-4 px-6 uppercase text-[11px] tracking-wider">Dept Name</TableHead>
                      <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">Site</TableHead>
                      <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">Manager</TableHead>
                      <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">Status</TableHead>
                      <TableHead className="font-bold text-slate-500 py-4 text-right px-6 uppercase text-[11px] tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDepartments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-10 w-10 text-slate-100" />
                            <p className="text-sm font-medium">No departments defined in any site.</p>
                            <Button
                              type="button"
                              className="mt-4 bg-[#213847] hover:bg-[#213847]/90 text-white gap-2"
                              onClick={() => openAddDepartmentModal()}
                            >
                              <Plus className="h-4 w-4" /> Add Department
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      allDepartments.map((dept: any) => (
                        <TableRow key={dept.id} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                          <TableCell className="py-5 px-6 max-w-0 w-[28%]">
                            <div className="font-bold text-slate-900 break-all line-clamp-2" title={dept.name}>
                              {truncateForDisplay(dept.name, 100)}
                            </div>
                            {dept.description && <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate max-w-xs">{dept.description}</div>}
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge variant="outline" className="text-slate-500 border-slate-200 px-2 py-0 h-5 text-[10px] font-bold">
                              {dept.siteName}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5 text-slate-400 font-medium">{dept.manager || "—"}</TableCell>
                          <TableCell className="py-5">
                            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold px-3 py-0.5 text-[10px]">
                              {dept.status || "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5 text-right px-6">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-300 hover:text-slate-600" onClick={() => setEditDept({ siteId: dept.siteId, dept })}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-300 hover:text-red-500" onClick={() => setDeptToDelete({ siteId: dept.siteId, dept })}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </Card>

            {/* Step 9: Final Step on Companies - Move to Users sidebar */}
            {showOnboardingGuide && onboardingStep === 9 && (
              <TourStepPopover
                targetId="tour-step-users"
                step={9}
                totalSteps={ONBOARDING_TOTAL_STEPS}
                title="User Management"
                description="In this page, you can see the user list and create, edit, delete, and manage users."
                onNext={() => {
                  setShowOnboardingGuide(false);
                  navigate("/users?onboarding=true&step=10");
                }}
                onBack={() => goToTourStep(8)}
                onClose={exitOnboardingTour}
                position="right"
                disableShadow={false}
              />
            )}
            </TabsContent>
          </Tabs>

          {/* Step 5: View Sites — outside Tabs so the target is always measurable */}
          {showOnboardingGuide && onboardingStep === 5 && !showAddSite && (
            <TourStepPopover
              targetId="tour-step-sites-card"
              step={5}
              totalSteps={ONBOARDING_TOTAL_STEPS}
              title="View Your Sites"
              description={
                selectedCompany.sites.length > 0
                  ? "Your site has been created! You can view all your sites here. Use the edit and delete buttons in the Actions column to manage them."
                  : "This is where your sites will appear once created. You can manage them using the edit and delete buttons in the Actions column."
              }
              onNext={() => goToTourStep(6)}
              onBack={() => goToTourStep(tourCompanyHasSites ? 3 : 4)}
              onClose={exitOnboardingTour}
              position="top"
              disableShadow={false}
            />
          )}

          {/* Step 8: View Departments — outside Tabs for the same reason */}
          {showOnboardingGuide && onboardingStep === 8 && !addDeptSiteId && (
            <TourStepPopover
              targetId="tour-step-departments-card"
              step={8}
              totalSteps={ONBOARDING_TOTAL_STEPS}
              title="View Your Departments"
              description={
                allDepartments.length > 0
                  ? "Your department has been created! You can view all your departments here. Use the edit and delete buttons in the Actions column to manage them."
                  : "This is where your departments will appear once created. You can manage them using the edit and delete buttons in the Actions column."
              }
              onNext={() => goToTourStep(9)}
              onBack={() => goToTourStep(7)}
              onClose={exitOnboardingTour}
              position="top"
              disableShadow={false}
            />
          )}

          {/* ------------------------------------------------------------------ */}
          {/* SITE MODAL                                                          */}
          {/* During step 4 the modal renders without its own overlay (the tour  */}
          {/* CSS in TourStepPopover raises [role="dialog"] above everything).   */}
          {/* ------------------------------------------------------------------ */}
          <SiteModal
            open={showAddSite}
            hideOverlay={
              showOnboardingGuide && (onboardingStep === 4 || onboardingStep === 7)
            }
            hideCancel={
              showOnboardingGuide && (onboardingStep === 4 || onboardingStep === 7)
            }
            onClose={() => {
              if (showOnboardingGuide && (onboardingStep === 4 || onboardingStep === 7)) {
                return;
              }
              setShowAddSite(false);
            }}
            onSubmit={async (data) => {
              const res = await addSite(selectedCompany.id, data);
              if (res?.success) {
                if (showOnboardingGuide && onboardingStep === 7) {
                  setShowAddSite(false);
                  if (res.site?.id) {
                    setAddDeptSiteId(res.site.id);
                  }
                } else if (showOnboardingGuide && onboardingStep === 4) {
                  setShowAddSite(false);
                  goToTourStep(5);
                } else {
                  setShowAddSite(false);
                }
              }
            }}
            mode="create"
          />

          {showOnboardingGuide && onboardingStep === 4 && showAddSite && !tourCompanyHasSites && (
            <TourStepPopover
              targetId="tour-step-site-modal"
              step={4}
              totalSteps={ONBOARDING_TOTAL_STEPS}
              title="Step 4 — Add Site Details"
              description="Fill in all the site details and click Add Site when ready. The next step will appear after your site is saved."
              onNext={() => goToTourStep(5)}
              onBack={() => goToTourStep(3)}
              onClose={exitOnboardingTour}
              position="right"
              disableShadow={true}
              hideNext={true}
            />
          )}

          {showOnboardingGuide && onboardingStep === 7 && showAddSite && !addDeptSiteId && (
            <TourStepPopover
              targetId="tour-step-site-modal"
              step={7}
              totalSteps={ONBOARDING_TOTAL_STEPS}
              title="Add a Site First"
              description={
                selectedCompanyHasSites
                  ? "Create another site if needed, then continue. The department form opens after you save a site."
                  : "Create a site for this company, then the department form will open. The next step appears after your site is saved."
              }
              onNext={() => goToTourStep(8)}
              onBack={() => goToTourStep(6)}
              onClose={exitOnboardingTour}
              position="right"
              disableShadow={true}
              hideNext={!selectedCompanyHasSites}
            />
          )}

          {(() => {
            const deptModalSite = selectedCompany.sites.find((s) => s.id === addDeptSiteId);
            if (!deptModalSite) return null;
            return (
              <DepartmentModal
                open={!!addDeptSiteId}
                hideOverlay={showOnboardingGuide && onboardingStep === 7}
                hideCancel={showOnboardingGuide && onboardingStep === 7}
                onClose={() => {
                  if (showOnboardingGuide && onboardingStep === 7) return;
                  setAddDeptSiteId(null);
                }}
                onSubmit={async (data) => {
                  const targetSiteId = data.siteId ?? deptModalSite.id;
                  const res = await addDepartment(
                    selectedCompany.id,
                    targetSiteId,
                    data.name,
                    data
                  );
                  if (res && showOnboardingGuide) {
                    goToTourStep(8);
                  } else if (res) {
                    setAddDeptSiteId(null);
                  }
                }}
                sites={selectedCompany.sites.map((s) => ({ id: s.id, name: s.name }))}
                initialSiteId={deptModalSite.id}
                mode="create"
              />
            );
          })()}

          {showOnboardingGuide && onboardingStep === 7 && !!addDeptSiteId && (
            <TourStepPopover
              targetId="tour-step-dept-modal"
              step={7}
              totalSteps={ONBOARDING_TOTAL_STEPS}
              title="Add Department Details"
              description="Fill in the department name and other details, then click Create Department, or press Next to continue."
              onNext={() => goToTourStep(8)}
              onBack={() => goToTourStep(6)}
              onClose={exitOnboardingTour}
              position="right"
              disableShadow={true}
            />
          )}

          {showEditCompany && (
            <CompanyModal
              open={!!showEditCompany}
              onClose={() => setShowEditCompany(null)}
              onSubmit={(data) => updateCompany(selectedCompany.id, data)}
              initialData={showEditCompany}
              mode="edit"
            />
          )}

          <SiteModal
            open={!!editSite}
            onClose={() => setEditSite(null)}
            onSubmit={(data) => {
              if (editSite) {
                updateSite(selectedCompany.id, editSite.id, data);
                setEditSite(null);
              }
            }}
            initialData={editSite || undefined}
            mode="edit"
          />

          {editDept && (
            <DepartmentModal
              key={`edit-dept-${editDept.dept.id}`}
              open={!!editDept}
              onClose={() => setEditDept(null)}
              onSubmit={(data) => {
                updateDepartment(selectedCompany.id, editDept.siteId, editDept.dept.id, data);
                setEditDept(null);
              }}
              initialData={editDept.dept}
              siteName={selectedCompany.sites.find((s) => s.id === editDept.siteId)?.name}
              mode="edit"
            />
          )}

          {/* Shared Delete Dialogs */}
          <DeleteConfirmationDialog
            open={!!siteToDelete}
            onOpenChange={(open) => !open && setSiteToDelete(null)}
            onConfirm={async () => {
              if (siteToDelete) {
                setIsDeleting(true);
                await deleteSite(selectedCompany.id, siteToDelete.id);
                setIsDeleting(false);
                setSiteToDelete(null);
              }
            }}
            isLoading={isDeleting}
            title="Delete site?"
            description={
              siteToDelete
                ? formatDeleteSiteDescription(siteToDelete.name)
                : "Are you sure you want to delete this site? All associated departments will be permanently removed."
            }
          />

          <DeleteConfirmationDialog
            open={!!deptToDelete}
            onOpenChange={(open) => !open && setDeptToDelete(null)}
            onConfirm={async () => {
              if (deptToDelete) {
                setIsDeleting(true);
                await deleteDepartment(selectedCompany.id, deptToDelete.siteId, deptToDelete.dept.id);
                setIsDeleting(false);
                setDeptToDelete(null);
              }
            }}
            isLoading={isDeleting}
            title="Delete department?"
            description={
              deptToDelete
                ? formatDeleteDepartmentDescription(
                    deptToDelete.dept.name,
                    selectedCompany?.sites.find((s) => s.id === deptToDelete.siteId)?.name
                  )
                : "Are you sure you want to delete this department?"
            }
          />

          <DeleteConfirmationDialog
            open={!!companyToDelete}
            onOpenChange={(open) => !open && setCompanyToDelete(null)}
            onConfirm={async () => {
              if (companyToDelete) {
                setIsDeleting(true);
                await deleteCompany(companyToDelete.id);
                setIsDeleting(false);
                setCompanyToDelete(null);
                setSelectedCompanyId(null);
              }
            }}
            isLoading={isDeleting}
            title={`Delete ${companyToDelete?.name}?`}
            description="Are you sure you want to delete this company? All associated data will be lost. This cannot be undone."
          />
        </div>
      </div>
    );
  }

  // --- Main List View ---
  return (
    <div className="h-full bg-white overflow-auto pb-10">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Company Details</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your company profile, sites, and departments</p>
          </div>
          {!isLoading && companies.length === 0 && !selectedCompanyId && (
            <Button onClick={() => setShowCreateCompany(true)} className="gap-2 shadow-sm font-semibold bg-[#213847] hover:bg-[#213847]/90 text-white rounded-xl px-5 h-11">
              <Plus className="h-4 w-4" /> Create Company
            </Button>
          )}
        </div>

        {/* Companies Table or Empty State */}
        {isLoading ? (
          <div className="bg-white/40 rounded-[2rem] border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-slate-500 font-medium">Loading companies...</p>
          </div>
        ) : filteredCompanies.length === 0 && !searchQuery && !selectedCompanyId ? (
          <div className="bg-white/40 rounded-[2rem] border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-400">
              <Building2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">No companies yet</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Create your first company to begin setting up audits.
              </p>
            </div>
            <Button
              onClick={() => setShowCreateCompany(true)}
              className="bg-[#213847] hover:bg-[#213847]/90 text-white font-bold rounded-[2rem] h-14 px-10 shadow-lg shadow-blue-100 transition-all hover:scale-105 active:scale-95 gap-2"
            >
              <Plus className="w-5 h-5 font-bold" /> Create Company
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-muted shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-muted/50">
                  <TableHead className="w-[80px] font-bold text-xs uppercase tracking-wider text-muted-foreground pl-6">SL. No.</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Company Details</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">ISO Standards</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Sites</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Depts</TableHead>
                  <TableHead className="w-[100px] font-bold text-xs uppercase tracking-wider text-muted-foreground text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-10 w-10 text-muted-foreground/20" />
                        <p className="text-sm">No companies found match your search criteria.</p>
                        <Button variant="link" size="sm" onClick={() => setSearchQuery("")}>Clear search</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCompanies.map((company, index) => (
                    <TableRow key={company.id} className="group cursor-pointer hover:bg-muted/20 border-muted/30" onClick={() => setSelectedCompanyId(company.id)}>
                      <TableCell className="font-medium text-muted-foreground/60 pl-6">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground group-hover:text-blue-600 transition-colors uppercase">{company.name}</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" />
                            {company.industry || "General Industry"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {company.isoStandards.map(std => (
                            <Badge key={std} variant="outline" className="text-[10px] font-medium py-0 h-4 bg-blue-50 border-blue-200 text-blue-700 lowercase">
                              {std}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {company.sites.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {company.sites.reduce((acc, s) => acc + (s.departments?.length ?? 0), 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setSelectedCompanyId(company.id)}>
                              <Eye className="h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setShowEditCompany(company)}>
                              <Pencil className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => setCompanyToDelete(company)}>
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="p-4 border-t border-muted/50">
              <ReusablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredCompanies.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main List Modals */}
      <CompanyModal
        open={showCreateCompany}
        onClose={() => setShowCreateCompany(false)}
        onSubmit={addCompany}
        mode="create"
      />

      {showEditCompany && (
        <CompanyModal
          open={!!showEditCompany}
          onClose={() => setShowEditCompany(null)}
          onSubmit={(data) => updateCompany(showEditCompany.id, data)}
          initialData={showEditCompany}
          mode="edit"
        />
      )}

      <DeleteConfirmationDialog
        open={!!companyToDelete}
        onOpenChange={(open) => !open && setCompanyToDelete(null)}
        onConfirm={async () => {
          if (companyToDelete) {
            setIsDeleting(true);
            await deleteCompany(companyToDelete.id);
            setIsDeleting(false);
            setCompanyToDelete(null);
          }
        }}
        isLoading={isDeleting}
        title={`Delete ${companyToDelete?.name}?`}
        description="Are you sure you want to delete this company? All associated data will be lost. This cannot be undone."
      />
    </div>
  );
};

export default CompaniesPage;