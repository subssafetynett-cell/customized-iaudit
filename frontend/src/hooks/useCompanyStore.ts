import { useState, useCallback, useEffect } from "react";
import { Company, Site, Department, ISOStandard } from "@/types/company";
import { API_BASE_URL } from "@/config";

const API_URL = `${API_BASE_URL}/api`;

let globalCompanies: Company[] = [];
let listeners: Array<() => void> = [];
let isInitialized = false;
let globalLoading = true;
let initializedUserId: string | null = null;

function notify() {
  listeners.forEach((l) => l());
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
    }

    if (!isInitialized && currentUserId) {
      isInitialized = true;
      initializedUserId = String(currentUserId);
      fetchCompanies();
    }

    return () => {
      listeners = listeners.filter((l) => l !== rerender);
    };
  }, [rerender]);

  const fetchCompanies = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;

      const user = JSON.parse(storedUser);
      if (!user.id) return;

      const response = await fetch(`${API_URL}/companies?userId=${user.id}&_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        globalCompanies = data.map((c: any) => ({
          ...c,
          id: String(c.id),
          isoStandards: c.isoStandards || [],
          sites: c.sites || [],
          createdAt: new Date(c.createdAt),
        }));
        globalLoading = false;
        notify();
      } else {
        globalLoading = false;
        notify();
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      globalLoading = false;
      notify();
    }
  };

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
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${API_URL}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, userId: user.id }),
      });
      if (response.ok) {
        const newCompany = await response.json();
        const company: Company = {
          ...newCompany,
          id: String(newCompany.id),
          isoStandards: data.standards,
          sites: [],
          createdAt: new Date(newCompany.createdAt),
        };
        globalCompanies = [...globalCompanies, company];
        notify();
        return company;
      }
    } catch (error) {
      console.error("Failed to add company:", error);
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/companies/${id}`, {
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
      const response = await fetch(`${API_URL}/companies/${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      }
    } catch (error) {
      console.error("Failed to update company:", error);
    }
  };

  // Sites
  const addSite = async (companyId: string, data: any) => {
    console.log(`[useCompanyStore] Initiating addSite for company ${companyId}`, data);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${API_URL}/companies/${companyId}/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, userId: user.id }),
      });
      
      if (response.ok) {
        const newSite = await response.json();
        console.log(`[useCompanyStore] addSite success:`, newSite);
        const site: Site = {
          ...newSite,
          id: String(newSite.id),
          departments: [],
        };
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
      const response = await fetch(`${API_URL}/sites/${siteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const updated = await response.json();
        globalCompanies = globalCompanies.map((c) =>
          c.id === companyId
            ? {
              ...c,
              sites: c.sites.map((s) => s.id === siteId ? { ...s, ...updated, id: String(updated.id) } : s)
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
      const response = await fetch(`${API_URL}/sites/${siteId}`, {
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
      const response = await fetch(`${API_URL}/sites/${siteId}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch(`${API_URL}/departments/${deptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
                  ? {
                    ...s,
                    departments: s.departments.map((d) => d.id === deptId ? { ...d, ...updated, id: String(updated.id) } : d)
                  }
                  : s
              ),
            }
            : c
        );
        notify();
      }
    } catch (error) {
      console.error("Failed to update department:", error);
    }
  };

  const deleteDepartment = async (companyId: string, siteId: string, deptId: string) => {
    try {
      const response = await fetch(`${API_URL}/departments/${deptId}`, {
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
    isLoading: globalLoading,
    getCompany: (id: string) => globalCompanies.find((c) => c.id === id),
  };
}
