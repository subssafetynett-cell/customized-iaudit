import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyStore } from "@/hooks/useCompanyStore";
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

const CompaniesPage = () => {
  const {
    companies, addCompany, addSite, addDepartment, deleteSite,
    deleteDepartment, updateCompany, updateSite, updateDepartment, deleteCompany
  } = useCompanyStore();
  const navigate = useNavigate();

  // Navigation and Selection state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
  const allDepartments = selectedCompany?.sites.flatMap((s) =>
    s.departments.map((d) => ({ ...d, siteName: s.name, siteId: s.id }))
  ) || [];

  const handleBackToList = () => {
    setSelectedCompanyId(null);
  };

  // Auto-select first company if exists
  useMemo(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // If a company is selected, show the detailed view
  if (selectedCompany) {
    return (
      <div className="h-full bg-white overflow-auto pb-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-8 relative z-10 transition-all duration-500 ease-in-out">
          {/* 2. Company Info Card */}
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
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                      {selectedCompany.name}
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-4xl">
                      {selectedCompany.description || "A forward-thinking organization dedicated to implementing world-class auditing standards and operational excellence across all departments and sites."}
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

          {/* 3. Stats Bar */}
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

          {/* 4. Tabs Section */}
          <Tabs defaultValue="sites" className="w-full">
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
              <Card className="border border-slate-100 shadow-md rounded-2xl overflow-hidden bg-white">
                <div className="p-6 flex justify-between items-center border-b border-slate-100 text-foreground">
                  <h2 className="text-xl font-bold">Sites</h2>
                  <Button
                    onClick={() => setShowAddSite(true)}
                    className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 px-6 rounded-lg font-bold"
                  >
                    <Plus className="h-4 w-4" /> Add Site
                  </Button>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100">
                      <TableHead className="font-bold text-slate-500 py-4 px-6 uppercase text-[11px] tracking-wider">Site Name</TableHead>
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
                      selectedCompany.sites.map((site) => (
                        <TableRow key={site.id} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                          <TableCell className="py-5 px-6">
                            <div className="font-bold text-slate-900">{site.name}</div>
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
                          <TableCell className="py-5 text-slate-400 font-medium">—</TableCell>
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="departments">
              <Card className="border border-slate-100 shadow-md rounded-2xl overflow-hidden bg-white">
                <div className="p-6 flex justify-between items-center border-b border-slate-100 text-foreground">
                  <h2 className="text-xl font-bold">Departments</h2>
                  {selectedCompany.sites.length > 0 && (
                    <Button
                      onClick={() => setAddDeptSiteId(selectedCompany.sites[0].id)}
                      className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 px-6 rounded-lg font-bold"
                    >
                      <Plus className="h-4 w-4" /> Add Department
                    </Button>
                  )}
                </div>
                <Table>
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      allDepartments.map((dept: any) => (
                        <TableRow key={dept.id} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                          <TableCell className="py-5 px-6">
                            <div className="font-bold text-slate-900">{dept.name}</div>
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
              </Card>
            </TabsContent>

          </Tabs>


          {/* Modal Definitions inside drill-down */}
          <SiteModal
            open={showAddSite}
            onClose={() => setShowAddSite(false)}
            onSubmit={(data) => addSite(selectedCompany.id, data)}
            mode="create"
          />

          {
            activeSite && (
              <DepartmentModal
                open={!!addDeptSiteId}
                onClose={() => setAddDeptSiteId(null)}
                onSubmit={(data) => addDepartment(selectedCompany.id, activeSite.id, data.name, data)}
                siteName={activeSite.name}
                mode="create"
              />
            )
          }

          {
            showEditCompany && (
              <CompanyModal
                open={!!showEditCompany}
                onClose={() => setShowEditCompany(null)}
                onSubmit={(data) => updateCompany(selectedCompany.id, data)}
                initialData={showEditCompany}
                mode="edit"
              />
            )
          }

          <SiteModal
            open={!!editSite}
            onClose={() => setEditSite(null)}
            onSubmit={(data) => editSite && updateSite(selectedCompany.id, editSite.id, data)}
            initialData={editSite || undefined}
            mode="edit"
          />

          {
            editDept && (
              <DepartmentModal
                open={!!editDept}
                onClose={() => setEditDept(null)}
                onSubmit={(data) => updateDepartment(selectedCompany.id, editDept.siteId, editDept.dept.id, data)}
                mode="edit"
              />
            )
          }

          {/* Shared Delete Dialogs (Site/Dept) */}
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
            title={siteToDelete ? `Delete Site: ${siteToDelete.name}?` : "Delete Site?"}
            description="Are you sure you want to delete this site? All associated departments will be permanently removed."
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
            title={deptToDelete ? `Delete Department: ${deptToDelete.dept.name}?` : "Delete Department?"}
            description={`Are you sure you want to delete this department?`}
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
                setSelectedCompanyId(null); // Return to list after deletion
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Company</h1>
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className="text-black font-medium">Dashboard</span>
            </div>
          </div>
          {/* Create Company explicitly hidden if user already has a company registered */}
          {companies.length === 0 && (
            <Button onClick={() => setShowCreateCompany(true)} className="gap-2 shadow-sm font-semibold bg-[#213847] hover:bg-[#213847]/90 text-white rounded-xl px-5 h-11">
              <Plus className="h-4 w-4" /> Create Company
            </Button>
          )}
        </div>



        {/* Companies Table or Empty State */}
        {filteredCompanies.length === 0 && !searchQuery ? (
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
                          {company.sites.reduce((acc, s) => acc + s.departments.length, 0)}
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
