import { useState, useCallback, useEffect } from "react";
import { Company, Site, Department, ISOStandard } from "@/types/company";
import { apiFetch } from "@/lib/api";
import { parsePaginatedResponse } from "@/lib/pagination";
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

function idsEqual(a: unknown, b: unknown): boolean {
  return String(a) === String(b);
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

function unwrapListPayload(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as any[];
    if (Array.isArray(obj.items)) return obj.items as any[];
  }
  return [];
}

function countDepartments(sites: Site[] | undefined): number {
  return (sites ?? []).reduce((acc, site) => acc + (site.departments?.length ?? 0), 0);
}

/**
 * Prefer the longer site list; only when lengths tie, prefer more departments.
 * Never replace a longer site list with a shorter one for department count alone.
 */
function pickRicherSites(existing: Site[] | undefined, hydrated: Site[]): Site[] {
  const existingSites = existing ?? [];
  if (hydrated.length > existingSites.length) return hydrated;
  if (existingSites.length > hydrated.length) return existingSites;
  if (countDepartments(hydrated) > countDepartments(existingSites)) return hydrated;
  return existingSites.length > 0 ? existingSites : hydrated;
}

/** Merge GET /sites (+ departments) into companies when nested include was empty. */
function mergeSitesIntoCompanies(companies: Company[], sitesPayload: unknown): Company[] {
  const siteRows = unwrapListPayload(sitesPayload);
  if (siteRows.length === 0) return companies;

  const byCompany = new Map<string, Site[]>();
  for (const raw of siteRows) {
    const companyId = String(raw.companyId ?? raw.company?.id ?? "");
    if (!companyId) continue;
    const site = normalizeSite(raw);
    const list = byCompany.get(companyId) ?? [];
    list.push(site);
    byCompany.set(companyId, list);
  }

  return companies.map((company) => {
    const hydrated = byCompany.get(String(company.id));
    if (!hydrated?.length) return company;
    const sites = pickRicherSites(company.sites, hydrated);
    return sites === company.sites ? company : { ...company, sites };
  });
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

    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const allRows: any[] = [];
    do {
      const response = await apiFetch(
        `/companies?page=${page}&pageSize=${pageSize}&_t=${Date.now()}`,
      );
      if (!response.ok) break;
      const data = await response.json();
      const parsed = parsePaginatedResponse<any>(data, page, pageSize);
      const rows =
        parsed.items.length > 0 ? parsed.items : unwrapListPayload(data);
      allRows.push(...rows);
      totalPages = Math.max(1, Number(parsed.totalPages) || 1);
      page += 1;
    } while (page <= totalPages && page <= 50);

    let companies = allRows.map(normalizeCompany);

    // Always hydrate sites so nested company.sites stays complete after save/refresh.
    if (companies.length > 0) {
      try {
        const sitePageSize = 200;
        let sitePage = 1;
        let siteTotalPages = 1;
        const allSites: any[] = [];
        do {
          const sitesRes = await apiFetch(
            `/sites?page=${sitePage}&pageSize=${sitePageSize}&_t=${Date.now()}`,
          );
          if (!sitesRes.ok) break;
          const sitesData = await sitesRes.json();
          const parsedSites = parsePaginatedResponse<any>(sitesData, sitePage, sitePageSize);
          const siteRows =
            parsedSites.items.length > 0
              ? parsedSites.items
              : unwrapListPayload(sitesData);
          allSites.push(...siteRows);
          siteTotalPages = Math.max(1, Number(parsedSites.totalPages) || 1);
          sitePage += 1;
        } while (sitePage <= siteTotalPages && sitePage <= 50);
        companies = mergeSitesIntoCompanies(companies, allSites);
      } catch (hydrateErr) {
        console.warn("Failed to hydrate company sites:", hydrateErr);
      }
    }

    globalCompanies = companies;
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
    const companyKey = String(companyId);
    try {
      const response = await apiFetch(`/companies/${companyKey}/sites`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newSite = await response.json();
        const site: Site = normalizeSite({ ...newSite, departments: newSite.departments || [] });
        globalCompanies = globalCompanies.map((c) =>
          idsEqual(c.id, companyKey)
            ? {
                ...c,
                sites: [...(c.sites || []).filter((s) => !idsEqual(s.id, site.id)), site],
              }
            : c,
        );
        notify();
        toast.success("Site added successfully");
        return { success: true as const, site };
      }

      const errorData = await response.json().catch(() => ({}));
      const message =
        (typeof errorData.error === "string" && errorData.error) ||
        (typeof errorData.message === "string" && errorData.message) ||
        `Failed to create site (Status: ${response.status})`;
      toast.error(message);
      return { success: false as const, error: message };
    } catch (error) {
      console.error("[useCompanyStore] addSite network error:", error);
      toast.error("Network error occurred while creating site");
      return { success: false as const, error: "Network error occurred while creating site" };
    }
  };

  const updateSite = async (companyId: string, siteId: string, data: any) => {
    const companyKey = String(companyId);
    const siteKey = String(siteId);
    try {
      const response = await apiFetch(`/sites/${siteKey}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const updated = await response.json();
        globalCompanies = globalCompanies.map((c) =>
          idsEqual(c.id, companyKey)
            ? {
                ...c,
                sites: c.sites.map((s) =>
                  idsEqual(s.id, siteKey)
                    ? normalizeSite({ ...s, ...updated, departments: s.departments ?? [] })
                    : s,
                ),
              }
            : c,
        );
        notify();
        toast.success("Site updated successfully");
        return { success: true as const };
      }
      const errBody = await response.json().catch(() => ({}));
      const message =
        (typeof errBody.error === "string" && errBody.error) ||
        "Failed to update site";
      toast.error(message);
      return { success: false as const, error: message };
    } catch (error) {
      console.error("Failed to update site:", error);
      toast.error("Network error while updating site");
      return { success: false as const, error: "Network error while updating site" };
    }
  };

  const deleteSite = async (companyId: string, siteId: string) => {
    const companyKey = String(companyId);
    const siteKey = String(siteId);
    const previous = globalCompanies;

    // Optimistic remove — UI updates immediately; restore if API fails.
    globalCompanies = globalCompanies.map((c) =>
      idsEqual(c.id, companyKey)
        ? {
            ...c,
            sites: c.sites.filter((s) => !idsEqual(s.id, siteKey)),
          }
        : c,
    );
    notify();

    try {
      const response = await apiFetch(`/sites/${siteKey}`, {
        method: "DELETE",
      });
      if (response.ok || response.status === 204) {
        toast.success("Site deleted successfully");
        return { success: true as const };
      }
      globalCompanies = previous;
      notify();
      let message = `Failed to delete site (Status: ${response.status})`;
      try {
        const errBody = await response.json();
        if (errBody?.error) message = String(errBody.error);
      } catch {
        /* ignore */
      }
      toast.error(message);
      return { success: false as const, error: message };
    } catch (error) {
      globalCompanies = previous;
      notify();
      console.error("Failed to delete site:", error);
      toast.error("Network error while deleting site");
      return { success: false as const, error: "Network error while deleting site" };
    }
    globalCompanies = globalCompanies.map((c) =>
      c.id === companyId ? { ...c, sites: c.sites.filter((s) => s.id !== siteId) } : c
    );
    notify();
  };

  // Departments
  const addDepartment = async (companyId: string, siteId: string, name: string, data: any) => {
    const companyKey = String(companyId);
    const siteKey = String(data?.siteId ?? siteId);
    try {
      const payload: Record<string, unknown> = {
        name,
        code: data?.code,
        status: data?.status,
        manager: data?.manager,
        description: data?.description,
      };
      if (data?.siteId != null && String(data.siteId).trim() !== "") {
        payload.siteId = data.siteId;
      }
      const response = await apiFetch(`/sites/${siteKey}/departments`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const newDept = await response.json();
        const dept: Department = normalizeDepartment(newDept);
        const resolvedSiteId = String(newDept.siteId ?? siteKey);
        globalCompanies = globalCompanies.map((c) =>
          idsEqual(c.id, companyKey)
            ? {
                ...c,
                sites: c.sites.map((s) =>
                  idsEqual(s.id, resolvedSiteId)
                    ? {
                        ...s,
                        departments: [
                          ...(s.departments || []).filter((d) => !idsEqual(d.id, dept.id)),
                          dept,
                        ],
                      }
                    : s,
                ),
              }
            : c,
        );
        notify();
        toast.success("Department added successfully");
        return { success: true as const, department: dept };
      }
      const errorData = await response.json().catch(() => ({}));
      const message =
        (typeof errorData.error === "string" && errorData.error) ||
        (typeof errorData.message === "string" && errorData.message) ||
        `Failed to create department (Status: ${response.status})`;
      toast.error(message);
      return { success: false as const, error: message };
    } catch (error) {
      console.error("Failed to add department:", error);
      toast.error("Network error while creating department");
      return { success: false as const, error: "Network error while creating department" };
    }
  };

  const updateDepartment = async (companyId: string, siteId: string, deptId: string, data: any) => {
    const companyKey = String(companyId);
    const sourceSiteId = String(siteId);
    const deptKey = String(deptId);
    try {
      const response = await apiFetch(`/departments/${deptKey}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const updated = await response.json();
        const targetSiteId = String(updated.siteId ?? data.siteId ?? sourceSiteId);

        globalCompanies = globalCompanies.map((c) => {
          if (!idsEqual(c.id, companyKey)) return c;

          if (idsEqual(targetSiteId, sourceSiteId)) {
            return {
              ...c,
              sites: c.sites.map((s) =>
                idsEqual(s.id, sourceSiteId)
                  ? {
                      ...s,
                      departments: s.departments.map((d) =>
                        idsEqual(d.id, deptKey)
                          ? { ...d, ...updated, id: String(updated.id) }
                          : d,
                      ),
                    }
                  : s,
              ),
            };
          }

          const existingDept = c.sites
            .find((s) => idsEqual(s.id, sourceSiteId))
            ?.departments.find((d) => idsEqual(d.id, deptKey));

          return {
            ...c,
            sites: c.sites.map((s) => {
              if (idsEqual(s.id, sourceSiteId)) {
                return {
                  ...s,
                  departments: s.departments.filter((d) => !idsEqual(d.id, deptKey)),
                };
              }
              if (idsEqual(s.id, targetSiteId)) {
                const movedDept = {
                  ...(existingDept ?? { id: deptKey }),
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
        toast.success("Department updated successfully");
        return { success: true as const };
      }
      const errBody = await response.json().catch(() => ({}));
      const message =
        (typeof errBody.error === "string" && errBody.error) ||
        "Failed to update department";
      toast.error(message);
      return { success: false as const, error: message };
    } catch (error) {
      console.error("Failed to update department:", error);
      toast.error("Network error while updating department");
      return { success: false as const, error: "Network error while updating department" };
    }
  };

  const deleteDepartment = async (companyId: string, siteId: string, deptId: string) => {
    const companyKey = String(companyId);
    const siteKey = String(siteId);
    const deptKey = String(deptId);
    const previous = globalCompanies;

    globalCompanies = globalCompanies.map((c) =>
      idsEqual(c.id, companyKey)
        ? {
            ...c,
            sites: c.sites.map((s) =>
              idsEqual(s.id, siteKey)
                ? {
                    ...s,
                    departments: s.departments.filter((d) => !idsEqual(d.id, deptKey)),
                  }
                : s,
            ),
          }
        : c,
    );
    notify();

    try {
      const response = await apiFetch(`/departments/${deptKey}`, {
        method: "DELETE",
      });
      if (response.ok || response.status === 204) {
        toast.success("Department deleted successfully");
        return { success: true as const };
      }
      globalCompanies = previous;
      notify();
      let message = `Failed to delete department (Status: ${response.status})`;
      try {
        const errBody = await response.json();
        if (errBody?.error) message = String(errBody.error);
      } catch {
        /* ignore */
      }
      toast.error(message);
      return { success: false as const, error: message };
    } catch (error) {
      globalCompanies = previous;
      notify();
      console.error("Failed to delete department:", error);
      toast.error("Network error while deleting department");
      return { success: false as const, error: "Network error while deleting department" };
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
