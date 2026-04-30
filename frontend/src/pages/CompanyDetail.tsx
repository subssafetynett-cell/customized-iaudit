import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCompanyStore } from "@/hooks/useCompanyStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, MapPin, Users, Trash2, Building2, Pencil, ShieldCheck,
} from "lucide-react";
import SiteModal from "@/components/SiteModal";
import DepartmentModal from "@/components/DepartmentModal";
import CompanyModal from "@/components/CompanyModal";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { Site, Department, ISOStandard } from "@/types/company";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getCompany, addSite, addDepartment, deleteSite, deleteDepartment,
    updateCompany, updateSite, updateDepartment, deleteCompany,
  } = useCompanyStore();

  const [showAddSite, setShowAddSite] = useState(false);
  const [addDeptSiteId, setAddDeptSiteId] = useState<string | null>(null);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [editDept, setEditDept] = useState<{ siteId: string; dept: Department } | null>(null);

  // Deletion states
  const [showDeleteCompany, setShowDeleteCompany] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<{ siteId: string; dept: Department } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const company = getCompany(id!);

  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Company not found</p>
          <Button variant="outline" onClick={() => navigate("/companies")}>Go Back</Button>
        </div>
      </div>
    );
  }

  const activeSite = company.sites.find((s) => s.id === addDeptSiteId);
  const allDepartments = company.sites.flatMap((s) =>
    s.departments.map((d) => ({ ...d, siteName: s.name, siteId: s.id }))
  );

  return (
    <div className="h-full bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/companies")} className="mb-3 -ml-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Companies
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                {company.name}
              </h1>
              <div className="flex gap-2 mt-2">
                {company.isoStandards.map((std) => (
                  <Badge key={std} variant="secondary" className="bg-accent text-accent-foreground gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {std}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditCompany(true)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Company
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteCompany(true)}
                className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Company
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 px-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{company.sites.length}</p>
                <p className="text-xs text-muted-foreground">Sites</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 px-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allDepartments.length}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sites" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="sites" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Sites
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Departments
            </TabsTrigger>
          </TabsList>

          {/* Sites Tab */}
          <TabsContent value="sites">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">{company.sites.length} site{company.sites.length !== 1 ? "s" : ""}</p>
              <Button size="sm" onClick={() => setShowAddSite(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Site
              </Button>
            </div>

            {company.sites.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <MapPin className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-4">No sites yet. Add your first site to get started.</p>
                  <Button size="sm" onClick={() => setShowAddSite(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Add Site
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {company.sites.map((site) => (
                  <Card key={site.id}>
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{site.name}</p>
                            {site.address && <p className="text-xs text-muted-foreground truncate">{site.address}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs mr-2">
                            {site.departments.length} dept{site.departments.length !== 1 ? "s" : ""}
                          </Badge>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditSite(site)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setSiteToDelete(site)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">{allDepartments.length} department{allDepartments.length !== 1 ? "s" : ""}</p>
              {company.sites.length > 0 && (
                <Button size="sm" onClick={() => setAddDeptSiteId(company.sites[0].id)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Department
                </Button>
              )}
            </div>

            {allDepartments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-1">No departments yet.</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {company.sites.length === 0 ? "Add a site first, then create departments." : "Create a department under one of your sites."}
                  </p>
                  {company.sites.length > 0 && (
                    <Button size="sm" onClick={() => setAddDeptSiteId(company.sites[0].id)} className="gap-1.5">
                      <Plus className="h-4 w-4" /> Add Department
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allDepartments.map((dept) => (
                  <Card key={dept.id}>
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{dept.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {dept.siteName}
                              {dept.description && ` · ${dept.description}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs mr-2">{dept.siteName}</Badge>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditDept({ siteId: dept.siteId, dept })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeptToDelete({ siteId: dept.siteId, dept })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <SiteModal
        open={showAddSite}
        onClose={() => setShowAddSite(false)}
        onSubmit={(data) => addSite(company.id, data)}
        mode="create"
      />

      {activeSite && (
        <DepartmentModal
          open={!!addDeptSiteId}
          onClose={() => setAddDeptSiteId(null)}
          onSubmit={(data) => addDepartment(company.id, activeSite.id, data.name, data)}
          siteName={activeSite.name}
          mode="create"
        />
      )}

      <CompanyModal
        open={showEditCompany}
        onClose={() => setShowEditCompany(false)}
        onSubmit={(data) => updateCompany(company.id, data)}
        initialData={company}
        mode="edit"
      />

      <SiteModal
        open={!!editSite}
        onClose={() => setEditSite(null)}
        onSubmit={(data) => editSite && updateSite(company.id, editSite.id, data)}
        initialData={editSite || undefined}
        mode="edit"
      />

      {editDept && (
        <DepartmentModal
          open={!!editDept}
          onClose={() => setEditDept(null)}
          onSubmit={(data) => updateDepartment(company.id, editDept.siteId, editDept.dept.id, data)}
          mode="edit"
        />
      )}

      {/* Deletion Confirmations */}
      <DeleteConfirmationDialog
        open={showDeleteCompany}
        onOpenChange={setShowDeleteCompany}
        onConfirm={async () => {
          setIsDeleting(true);
          await deleteCompany(company.id);
          setIsDeleting(false);
          setShowDeleteCompany(false);
          navigate("/companies");
        }}
        isLoading={isDeleting}
        title={`Delete ${company.name}?`}
        description="Are you sure you want to delete this company? All associated sites and departments will be permanently removed. This action cannot be undone."
      />

      <DeleteConfirmationDialog
        open={!!siteToDelete}
        onOpenChange={(open) => !open && setSiteToDelete(null)}
        onConfirm={async () => {
          if (siteToDelete) {
            setIsDeleting(true);
            await deleteSite(company.id, siteToDelete.id);
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
            await deleteDepartment(company.id, deptToDelete.siteId, deptToDelete.dept.id);
            setIsDeleting(false);
            setDeptToDelete(null);
          }
        }}
        isLoading={isDeleting}
        title={deptToDelete ? `Delete Department: ${deptToDelete.dept.name}?` : "Delete Department?"}
        description={`Are you sure you want to delete this department from ${deptToDelete ? company.sites.find(s => s.id === deptToDelete.siteId)?.name : "this site"}?`}
      />
    </div>
  );
}
