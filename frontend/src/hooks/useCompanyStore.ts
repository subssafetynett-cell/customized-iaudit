import { useState, useCallback, useEffect } from "react";
import { Company, Site, Department, ISOStandard } from "@/types/company";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

let globalCompanies: Company[] = [];
let listeners: Array<() => void> = [];
let isInitialized = false;
let globalLoading = false;
let hasFetchedCompanies = false;
let initializedUserId: string | null = null;

function notify() {
  listeners.forEach((l) => l());
}

function normalizeDepartment(d: any): Department {
  return {
    ...d,
    id: String(d.id),
  };
}

function normalizeSite(s: any): Site {
  return {
    ...s,
    id: String(s.id),
    departments: (s.departments || []).map(normalizeDepartment),
  };
}

function normalizeCompany(c: any): Company {
  return {
    ...c,
    id: String(c.id),
    isoStandards: c.isoStandards || [],
    sites: (c.sites || []).map(normalizeSite),
    createdAt: new Date(c.createdAt),
  };
}

/** Synchronous read of cached companies (for tour routing without waiting on fetch). */
export function getCompaniesSnapshot(): Company[] {
  return globalCompanies;
}

async function fetchCompaniesFromApi() {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      globalLoading = false;
      hasFetchedCompanies = true;
      notify();
      return;
    }

    const user = JSON.parse(storedUser);
    if (!user.id) {
      globalLoading = false;
      hasFetchedCompanies = true;
      notify();
      return;
    }

    globalLoading = true;
    hasFetchedCompanies = false;
    notify();

    const response = await apiFetch(`/companies?_t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();
      globalCompanies = data.map(normalizeCompany);
    }
  } catch (error) {
    console.error("Failed to fetch companies:", error);
  } finally {
    globalLoading = false;
    hasFetchedCompanies = true;
    notify();
  }
}

export function useCompanyStore() {
  const [, setTick] = useState(0);

  const rerender = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    listeners.push(rerender);

    // Check current user
    const storedUser = localStorage.getItem('user');
    const currentUserId = storedUser ? JSON.parse(storedUser).id : null;

    // Invalidate cache if user has changed
    if (isInitialized && initializedUserId !== String(currentUserId)) {
      isInitialized = false;
      globalCompanies = [];
      hasFetchedCompanies = false;
    }

    if (!currentUserId) {
      hasFetchedCompanies = true;
    }

    if (!isInitialized && currentUserId) {
      isInitialized = true;
      initializedUserId = String(currentUserId);
      void fetchCompaniesFromApi();
    }

    return () => {
      listeners = listeners.filter((l) => l !== rerender);
    };
  }, [rerender]);

  const addCompany = async (data: {
    name: string;
    logo?: string;
    industry?: string;
    contactNumber?: string;
    description?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    standards: ISOStandard[];
  }) => {
    try {
      const response = await apiFetch(`/companies`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const newCompany = await response.json();
        const company: Company = normalizeCompany({
          ...newCompany,
          isoStandards: data.standards,
          sites: [],
        });
        globalCompanies = [...globalCompanies, company];
        notify();
        return company;
      }
      const errBody = await response.json().catch(() => ({}));
      const message = typeof errBody.error === "string" ? errBody.error : "Failed to create company";
      throw new Error(message);
    } catch (error) {
      console.error("Failed to add company:", error);
      throw error;
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const response = await apiFetch(`/companies/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        globalCompanies = globalCompanies.filter((c) => c.id !== id);
        notify();
      }
    } catch (error) {
      console.error("Failed to delete company:", error);
    }
  };

  const updateCompany = async (
    companyId: string,
    data: {
      name: string;
      logo?: string;
      industry?: string;
      contactNumber?: string;
      description?: string;
      streetAddress?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      standards: ISOStandard[];
    }
  ) => {
    try {
      const response = await apiFetch(`/companies/${companyId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const updated = await response.json();
        globalCompanies = globalCompanies.map((c) =>
          c.id === companyId
            ? {
              ...c,
              ...updated,
              id: String(updated.id),
              isoStandards: data.standards,
            }
            : c
        );
        notify();
        toast.success("Company updated successfully");
        return;
      }
      const errBody = await response.json().catch(() => ({}));
      const message =
        (typeof errBody.error === "string" && errBody.error) ||
        (typeof errBody.message === "string" && errBody.message) ||
        "Failed to update company";
      toast.error(message);
      throw new Error(message);
    } catch (error) {
      console.error("Failed to update company:", error);
      if (error instanceof Error) throw error;
      const message = "Failed to update company";
      toast.error(message);
      throw new Error(message);
    }
  };

  // Sites
  const addSite = async (companyId: string, data: any) => {
    console.log(`[useCompanyStore] Initiating addSite for company ${companyId}`, data);
    try {
      const response = await apiFetch(`/companies/${companyId}/sites`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const newSite = await response.json();
        console.log(`[useCompanyStore] addSite success:`, newSite);
        const site: Site = normalizeSite({ ...newSite, departments: [] });
        globalCompanies = globalCompanies.map((c) =>
          c.id === companyId ? { ...c, sites: [...c.sites, site] } : c
        );
        notify();
        return { success: true, site };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[useCompanyStore] addSite failed with status ${response.status}:`, errorData);
        return { success: false, error: errorData.message || `Failed to create site (Status: ${response.status})` };
      }
    } catch (error) {
      console.error("[useCompanyStore] addSite network error:", error);
      return { success: false, error: "Network error occurred while creating site" };
    }
  };

  const updateSite = async (companyId: string, siteId: string, data: any) => {
    try {
      const response = await apiFetch(`/sites/${siteId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const updated = await response.json();
        globalCompanies = globalCompanies.map((c) =>
          c.id === companyId
            ? {
              ...c,
              sites: c.sites.map((s) =>
                s.id === siteId
                  ? normalizeSite({ ...s, ...updated, departments: s.departments ?? [] })
                  : s
              )
            }
            : c
        );
        notify();
      }
    } catch (error) {
      console.error("Failed to update site:", error);
    }
  };
  const deleteSite = async (companyId: string, siteId: string) => {
    try {
      const response = await apiFetch(`/sites/${siteId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        globalCompanies = globalCompanies.map((c) =>
          c.id === companyId ? { ...c, sites: c.sites.filter((s) => s.id !== siteId) } : c
        );
        notify();
      }
    } catch (error) {
      console.error("Failed to delete site:", error);
    }
  };

  // Departments
  const addDepartment = async (companyId: string, siteId: string, name: string, data: any) => {
    try {
      const response = await apiFetch(`/sites/${siteId}/departments`, {
        method: "POST",
        body: JSON.stringify({ name, ...data }),
      });
      if (response.ok) {
        const newDept = await response.json();
        const dept: Department = {
          ...newDept,
          id: String(newDept.id),
        };
        globalCompanies = globalCompanies.map((c) =>
          c.id === companyId
            ? {
              ...c,
              sites: c.sites.map((s) =>
                s.id === siteId ? { ...s, departments: [...s.departments, dept] } : s
              ),
            }
            : c
        );
        notify();
        return dept;
      }
    } catch (error) {
      console.error("Failed to add department:", error);
    }
  };

  const updateDepartment = async (companyId: string, siteId: string, deptId: string, data: any) => {
    try {
      const response = await apiFetch(`/departments/${deptId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const updated = await response.json();
        const targetSiteId = String(updated.siteId ?? data.siteId ?? siteId);
        const sourceSiteId = String(siteId);

        globalCompanies = globalCompanies.map((c) => {
          if (c.id !== companyId) return c;

          if (targetSiteId === sourceSiteId) {
            return {
              ...c,
              sites: c.sites.map((s) =>
                s.id === sourceSiteId
                  ? {
                    ...s,
                    departments: s.departments.map((d) =>
                      d.id === deptId ? { ...d, ...updated, id: String(updated.id) } : d,
                    ),
                  }
                  : s,
              ),
            };
          }

          const existingDept = c.sites
            .find((s) => s.id === sourceSiteId)
            ?.departments.find((d) => d.id === deptId);

          return {
            ...c,
            sites: c.sites.map((s) => {
              if (s.id === sourceSiteId) {
                return { ...s, departments: s.departments.filter((d) => d.id !== deptId) };
              }
              if (s.id === targetSiteId) {
                const movedDept = {
                  ...(existingDept ?? { id: deptId }),
                  ...updated,
                  id: String(updated.id),
                };
                return { ...s, departments: [...s.departments, movedDept] };
              }
              return s;
            }),
          };
        });
        notify();
      }
    } catch (error) {
      console.error("Failed to update department:", error);
    }
  };

  const deleteDepartment = async (companyId: string, siteId: string, deptId: string) => {
    try {
      const response = await apiFetch(`/departments/${deptId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        globalCompanies = globalCompanies.map((c) =>
          c.id === companyId
            ? {
              ...c,
              sites: c.sites.map((s) =>
                s.id === siteId ? { ...s, departments: s.departments.filter((d) => d.id !== deptId) } : s
              ),
            }
            : c
        );
        notify();
      }
    } catch (error) {
      console.error("Failed to delete department:", error);
    }
  };

  return {
    companies: globalCompanies,
    addCompany,
    deleteCompany,
    addSite,
    updateSite,
    deleteSite,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    updateCompany,
    refetchCompanies: fetchCompaniesFromApi,
    isLoading: globalLoading,
    hasFetchedCompanies,
    getCompany: (id: string) => globalCompanies.find((c) => c.id === id),
  };
}
