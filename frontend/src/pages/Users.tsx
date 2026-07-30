import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    UserPlus,
    Search,
    MoreHorizontal,
    Mail,
    Shield,
    Trash2,
    Edit2,
    Eye,
    UserCheck,
    UserMinus,
    AlertTriangle,
    Users as UsersIcon,
    MapPin,
    Loader2,
} from "lucide-react";
import { TourStepPopover } from "@/components/TourStepPopover";
import { ONBOARDING_TOTAL_STEPS } from "@/lib/onboardingTour";
import UserModal from "@/components/UserModal";
import { AssignAuditeeSiteModal } from "@/components/AssignAuditeeSiteModal";
import { canManageOrgUsers, formatUserRoleLabel, isAuditeeRole, USERS_PAGE_ROLE_OPTIONS } from "@/lib/userRoles";
import { useStoredUser } from "@/hooks/useStoredUser";
import { useCompanyStore } from "@/hooks/useCompanyStore";
import {
    siteAvailableForAuditeeInvite,
    siteHasAssignedAuditee,
    sitesFromCompanies,
    type AuditeeSiteOption,
} from "@/lib/orgSites";
import ReusablePagination from "@/components/ReusablePagination";
import { buildPageQuery, parsePaginatedResponse } from "@/lib/pagination";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { apiFetch } from "@/lib/api";

type UsersAccessResponse = {
    allowed?: boolean;
    canInviteUsers?: boolean;
    canManageUsers?: boolean;
    canInviteAuditee?: boolean;
};

export default function Users() {
    return <UsersPage />;
}

function UsersPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showCreate, setShowCreate] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showOnboardingGuide, setShowOnboardingGuide] = useState(searchParams.get("onboarding") === "true");
    const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
    const { companies, refetchCompanies } = useCompanyStore();

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

    const goToTourStep = (step: number) => setTourStep(step);

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 8;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / itemsPerPage);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, statusFilter]);

    // Debounced search for server requests (≤200ms perceived search)
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 150);
        return () => window.clearTimeout(t);
    }, [searchQuery]);

    // Edit/View States
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
    const [assignSiteUser, setAssignSiteUser] = useState<any>(null);
    const [defaultCreateRole, setDefaultCreateRole] = useState<string | undefined>(undefined);

    // Deletion States
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loggedInUserId, setLoggedInUserId] = useState<number | string | null>(null);
    const { user: storedUser, setUser: setStoredUser } = useStoredUser();
    const clientCanManageUsers = canManageOrgUsers(
        storedUser as { role?: string; creatorId?: number | null } | null,
    );
    const clientCanInviteUsers = !isAuditeeRole((storedUser as { role?: string } | null)?.role);
    const [canManageUsers, setCanManageUsers] = useState(clientCanManageUsers);
    const [canInviteUsers, setCanInviteUsers] = useState(clientCanInviteUsers);
    const [canInviteAuditee, setCanInviteAuditee] = useState(false);

    useEffect(() => {
        const nextCanManageUsers = canManageOrgUsers(
            storedUser as { role?: string; creatorId?: number | null } | null,
        );
        const nextCanInviteUsers = !isAuditeeRole((storedUser as { role?: string } | null)?.role);
        setCanManageUsers(nextCanManageUsers);
        setCanInviteUsers(nextCanInviteUsers);
    }, [storedUser]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch("/users/manage-access");
                if (cancelled || !res.ok) return;
                const data = (await res.json()) as UsersAccessResponse;
                if (!cancelled) {
                    setCanManageUsers(data.canManageUsers === true);
                    setCanInviteUsers(data.canInviteUsers === true || data.allowed === true);
                    setCanInviteAuditee(data.canInviteAuditee === true);
                }
            } catch {
                if (!cancelled) {
                    setCanManageUsers(clientCanManageUsers);
                    setCanInviteUsers(clientCanInviteUsers);
                    setCanInviteAuditee(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [clientCanManageUsers, clientCanInviteUsers]);

    // Legacy deep-link: open create modal with Auditee preselected.
    useEffect(() => {
        if (searchParams.get("inviteAuditee") !== "true") return;
        setDefaultCreateRole("auditee");
        setModalMode("create");
        setSelectedUser(null);
        setShowCreate(true);
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("inviteAuditee");
                return next;
            },
            { replace: true },
        );
    }, [searchParams, setSearchParams]);

    const isSignedInUser = (rowUser: { id?: number | string }) => {
        if (loggedInUserId == null || rowUser?.id == null) return false;
        return String(rowUser.id) === String(loggedInUserId);
    };

    const canEditUserRow = (rowUser: { id?: number | string; role?: string }) => {
        if (canManageUsers || isSignedInUser(rowUser)) return true;
        return canInviteAuditee && isAuditeeRole(rowUser.role);
    };

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem("user") || "null");
            setLoggedInUserId(stored?.id ?? stored?._id ?? null);
        } catch {
            setLoggedInUserId(null);
        }
        // useCompanyStore already loads companies on mount — do not force a cache-busting refetch here.
    }, []);

    const hasLoadedUsersRef = useRef(false);

    const fetchUsers = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = Boolean(opts?.silent);
        try {
            if (!silent) setIsLoading(true);
            const qs = buildPageQuery({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch || undefined,
                role: roleFilter !== "all" ? roleFilter : undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
            });
            const response = await apiFetch(`/users${qs}`);
            if (response.ok) {
                const responseData = await response.json();
                const parsed = parsePaginatedResponse<any>(
                    responseData,
                    currentPage,
                    itemsPerPage,
                );
                const data = [...parsed.items];
                setTotalItems(parsed.total);

                // Add the currently logged-in user to the list if they aren't already there
                let loggedInUser: { id?: number } | null = null;
                try {
                    loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
                } catch {
                    loggedInUser = null;
                }
                if (loggedInUser?.id != null) {
                    const selfFromApi = data.find(
                        (u: any) => String(u.id) === String(loggedInUser!.id),
                    );
                    if (selfFromApi) {
                        setStoredUser({ ...loggedInUser, ...selfFromApi });
                    } else if (currentPage === 1 && !debouncedSearch && roleFilter === "all" && statusFilter === "all") {
                        data.unshift(loggedInUser as any);
                    }
                }

                setUsers(data);
                hasLoadedUsersRef.current = true;
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
            toast.error("Failed to load users");
        } finally {
            setIsLoading(false);
        }
    }, [
        currentPage,
        debouncedSearch,
        roleFilter,
        statusFilter,
        setStoredUser,
    ]);

    useEffect(() => {
        void fetchUsers({ silent: hasLoadedUsersRef.current });
    }, [fetchUsers]);

    const auditeeUserIds = useMemo(() => {
        const ids = new Set<number>();
        for (const site of sitesFromCompanies(companies)) {
            const id = Number.parseInt(String(site.userId ?? ""), 10);
            if (Number.isFinite(id) && id >= 1) ids.add(id);
        }
        for (const user of users) {
            if (!isAuditeeRole(user.role)) continue;
            const id = Number(user.id);
            if (Number.isFinite(id) && id >= 1) ids.add(id);
        }
        return ids;
    }, [companies, users]);

    const validatedSites = useMemo(() => sitesFromCompanies(companies), [companies]);

    const createAuditeeSites = useMemo<AuditeeSiteOption[]>(
        () =>
            validatedSites
                .filter((site) => siteAvailableForAuditeeInvite(site, auditeeUserIds))
                .map((site) => ({
                    id: String(site.id),
                    name: site.name,
                    companyName: site.company.name,
                })),
        [validatedSites, auditeeUserIds],
    );

    const allAuditeeSites = useMemo<AuditeeSiteOption[]>(
        () =>
            validatedSites.map((site) => ({
                id: String(site.id),
                name: site.name,
                companyName: site.company.name,
            })),
        [validatedSites],
    );

    const disabledSiteIdsForSelectedUser = useMemo(() => {
        const selectedId = selectedUser?.id != null ? Number(selectedUser.id) : null;
        const blocked = new Set<string>();
        for (const site of validatedSites) {
            const uid = Number.parseInt(String(site.userId ?? ""), 10);
            if (siteHasAssignedAuditee(site, auditeeUserIds) && uid !== selectedId) {
                blocked.add(String(site.id));
            }
        }
        return blocked;
    }, [selectedUser, validatedSites, auditeeUserIds]);

    const disabledSiteIdsForAssign = useMemo(() => {
        const assignId = assignSiteUser?.id != null ? Number(assignSiteUser.id) : null;
        const blocked = new Set<string>();
        for (const site of validatedSites) {
            const uid = Number.parseInt(String(site.userId ?? ""), 10);
            if (siteHasAssignedAuditee(site, auditeeUserIds) && uid !== assignId) {
                blocked.add(String(site.id));
            }
        }
        return blocked;
    }, [assignSiteUser, validatedSites, auditeeUserIds]);

    const modalAuditeeSites =
        modalMode === "create" ? createAuditeeSites : allAuditeeSites;

    // Sync onboarding guide state with URL parameter
    useEffect(() => {
        const onboarding = searchParams.get("onboarding") === "true";
        if (!onboarding) {
            setShowOnboardingGuide(false);
            return;
        }

        const step = parseInt(searchParams.get("step") || "10", 10);
        if (!Number.isFinite(step)) return;

        setShowOnboardingGuide(true);
        setOnboardingStep(step);

        if (step === 11) {
            setModalMode("create");
            setSelectedUser(null);
            setShowCreate(true);
        } else {
            setShowCreate(false);
            setSelectedUser(null);
        }
    }, [searchParams]);

    const handleAddUser = async (userData: any) => {
        try {
            const endpoint = modalMode === "create" ? `/users` : `/users/${selectedUser.id}`;
            const method = modalMode === "create" ? "POST" : "PUT";
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            const payload = modalMode === "create" ? { ...userData, creatorId: user.id } : userData;

            const response = await apiFetch(endpoint, {
                method: method,
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                if (modalMode === "create") {
                    // Optimistic insert — avoid full list reload.
                    setUsers((prev) => {
                        if (prev.some((u) => String(u.id) === String(updatedUser.id))) {
                            return prev.map((u) =>
                                String(u.id) === String(updatedUser.id) ? { ...u, ...updatedUser } : u,
                            );
                        }
                        return [updatedUser, ...prev].slice(0, itemsPerPage);
                    });
                    setTotalItems((n) => n + 1);
                    if (
                        isAuditeeRole(updatedUser.role) ||
                        Array.isArray(updatedUser.siteIds)
                    ) {
                        void refetchCompanies();
                    }
                    if (updatedUser.emailVerificationPending) {
                        toast.success(
                            updatedUser.verificationEmailSent || updatedUser.emailQueued
                                ? updatedUser.welcomeEmailSent || updatedUser.emailQueued
                                    ? "User created. A welcome email with login credentials and verification code is being sent — they must verify before signing in."
                                    : "User created. A verification code is being sent to their email — they must verify before signing in."
                                : "User created but the onboarding email could not be sent. Use Resend verification from the user menu.",
                            { duration: 8000 },
                        );
                    } else {
                        toast.success("User created successfully!");
                    }
                } else {
                    setUsers((prev) =>
                        prev.map((u) =>
                            u.id === updatedUser.id ? { ...u, ...updatedUser } : u,
                        ),
                    );
                    if (
                        isAuditeeRole(updatedUser.role) ||
                        Array.isArray(updatedUser.siteIds) ||
                        userData?.siteIds != null ||
                        userData?.siteId != null
                    ) {
                        void refetchCompanies();
                    }
                    if (updatedUser.id === user.id) {
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                    toast.success("User updated successfully!");
                }
            } else {
                const errorData = await response.json();
                console.error("Server error data:", errorData);
                const errorMsg =
                    errorData.error ||
                    errorData.message ||
                    errorData.details ||
                    "Operation failed";
                const detail =
                    errorData.details && errorData.details !== errorMsg
                        ? ` (${errorData.details})`
                        : "";
                toast.error(`${errorMsg}${detail}`);
                throw new Error(`${errorMsg}${detail}`); // Throw so UserModal can catch it
            }
        } catch (error: any) {
            console.error("Error processing user:", error);
            if (error.message && error.message !== "Operation failed") {
                throw error; // Re-throw specific errors for the modal
            }
            const genericMsg = "An error occurred. Check console for details.";
            toast.error(genericMsg);
            throw new Error(genericMsg);
        }
    };

    const handleToggleStatus = async (user: any) => {
        const mayToggle =
            canManageUsers || (canInviteAuditee && isAuditeeRole(user.role));
        if (!mayToggle) {
            toast.error("Only administrators can change user status.");
            return;
        }
        try {
            const response = await apiFetch(`/users/${user.id}`, {
                method: "PUT",
                body: JSON.stringify({ isActive: !user.isActive }),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === updatedUser.id ? { ...u, ...updatedUser } : u,
                    ),
                );

                // Also update local storage if it's the current user
                const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (loggedInUser.id === updatedUser.id) {
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }

                toast.success(`User set to ${updatedUser.isActive ? 'Active' : 'Inactive'}`);
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || "Failed to update status");
            }
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error("An error occurred");
        }
    };

    const handleResendVerification = async (user: { id: number }) => {
        try {
            const response = await apiFetch(`/users/${user.id}/resend-verification`, {
                method: "POST",
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                toast.success(data.message || "Verification code sent.");
            } else {
                toast.error(data.error || "Failed to send verification code");
            }
        } catch {
            toast.error("Failed to send verification code");
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete || isDeleting) return;
        if (!canManageUsers) {
            toast.error("Only administrators can delete users.");
            return;
        }

        const deleted = userToDelete;
        const deletedId = deleted.id;

        setIsDeleting(true);

        // Remove from the list immediately — don't wait on the network / full refetch.
        setUsers((prev) => prev.filter((u) => String(u.id) !== String(deletedId)));
        setTotalItems((n) => Math.max(0, n - 1));
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        toast.success("User deleted successfully");

        try {
            const response = await apiFetch(`/users/${deletedId}`, {
                method: "DELETE",
            });
            if (!response.ok && response.status !== 204) {
                const err = await response.json().catch(() => ({}));
                // Roll back optimistic remove
                setUsers((prev) => {
                    if (prev.some((u) => String(u.id) === String(deletedId))) return prev;
                    return [...prev, deleted];
                });
                setTotalItems((n) => n + 1);
                toast.error(
                    typeof err.error === "string" ? err.error : "Failed to delete user",
                );
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            setUsers((prev) => {
                if (prev.some((u) => String(u.id) === String(deletedId))) return prev;
                return [...prev, deleted];
            });
            setTotalItems((n) => n + 1);
            toast.error("An error occurred while deleting the user");
        } finally {
            setIsDeleting(false);
        }
    };

    const triggerDelete = (user: any) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const openModal = (mode: "create" | "edit" | "view", user: any = null) => {
        setModalMode(mode);
        setSelectedUser(user);
        if (mode === "create") setDefaultCreateRole(undefined);
        setShowCreate(true);
    };

    const paginatedUsers = users;

    return (
        <div className="h-full bg-white">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 px-4 sm:px-0">
                    <div id="tour-step-users">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage system users, their roles and access status</p>
                    </div>

                    {canInviteUsers && (
                        <div>
                            <Button
                                id="tour-step-create-user"
                                onClick={() => openModal("create")}
                                size="sm"
                                className="w-full sm:w-auto gap-1.5 shadow-sm bg-[#213847] hover:bg-[#213847]/90 text-white rounded-xl px-5 h-11 transition-all"
                            >
                                <UserPlus className="h-4 w-4" /> Invite User
                            </Button>
                        </div>
                    )}
                </div>

                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6 px-4 sm:px-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="users-page-search"
                            name="users-page-search"
                            placeholder="Search by name or email..."
                            className="pl-11 h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-[#213847]/40">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                <SelectItem value="all" className="rounded-lg cursor-pointer">All Roles</SelectItem>
                                {USERS_PAGE_ROLE_OPTIONS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className="rounded-lg cursor-pointer"
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-[#213847]/40">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                <SelectItem value="all" className="rounded-lg cursor-pointer">All Status</SelectItem>
                                <SelectItem value="active" className="rounded-lg cursor-pointer">Active</SelectItem>
                                <SelectItem value="inactive" className="rounded-lg cursor-pointer">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* User List Table */}
                <div id="tour-step-users-list" className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mx-4 sm:mx-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#213847] hover:bg-[#213847] border-none">
                                    <TableHead className="w-[80px] text-white pl-6">SL No.</TableHead>
                                    <TableHead className="text-white">Name</TableHead>
                                    <TableHead className="text-white">Email</TableHead>
                                    <TableHead className="text-white">Role</TableHead>
                                    <TableHead className="text-white">Status</TableHead>
                                    <TableHead className="text-white">Created At</TableHead>
                                    <TableHead className="text-right text-white">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            Loading users...
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center py-10">
                                                <UsersIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                                <p className="text-sm text-muted-foreground mb-4">No users found</p>
                                                {canInviteUsers && (
                                                    <Button
                                                        onClick={() => openModal("create")}
                                                        size="sm"
                                                        className="gap-1.5 bg-[#213847] hover:bg-[#213847]/90 text-white rounded-xl"
                                                    >
                                                        <UserPlus className="h-4 w-4" /> Invite User
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map((user, index) => (
                                        <TableRow key={user.id} className="group hover:bg-muted/50 transition-colors">
                                            <TableCell className="pl-6 font-medium text-muted-foreground">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <span className="font-bold text-sm text-[#213847]">{user.firstName} {user.lastName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-[#213847]/80 flex items-center gap-1 font-medium">
                                                    <Mail className="h-3 w-3" /> {user.email}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-medium capitalize py-0 px-2 h-6 flex w-fit items-center gap-1">
                                                    <Shield className="h-3 w-3" />
                                                    {formatUserRoleLabel(user.role, user.customRoleName)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {!user.emailVerifiedAt ? (
                                                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 px-3 py-1 rounded-full font-medium">
                                                        Pending verification
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant={user.isActive ? "default" : "outline"}
                                                        className={user.isActive ? "bg-[#e6f7e9] hover:bg-[#d4f2da] text-[#22a04c] border-none px-4 py-1 rounded-full shadow-none font-medium" : "text-muted-foreground px-4 py-1 rounded-full font-medium"}
                                                    >
                                                        {user.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" type="button">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Open menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[180px]">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openModal("view", user)} className="cursor-pointer">
                                                            <Eye className="h-4 w-4 mr-2" /> View Details
                                                        </DropdownMenuItem>
                                                        {canEditUserRow(user) && (
                                                            <DropdownMenuItem onClick={() => openModal("edit", user)} className="cursor-pointer">
                                                                <Edit2 className="h-4 w-4 mr-2" /> Edit User
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canInviteAuditee && isAuditeeRole(user.role) && (
                                                            <DropdownMenuItem
                                                                onClick={() => setAssignSiteUser(user)}
                                                                className="cursor-pointer"
                                                            >
                                                                <MapPin className="h-4 w-4 mr-2" /> Assign Sites
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canManageUsers && !user.emailVerifiedAt && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleResendVerification(user)}
                                                                className="cursor-pointer font-medium"
                                                            >
                                                                <Mail className="h-4 w-4 mr-2" /> Resend verification
                                                            </DropdownMenuItem>
                                                        )}
                                                        {(canManageUsers ||
                                                            (canInviteAuditee && isAuditeeRole(user.role))) && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleToggleStatus(user)}
                                                                className="cursor-pointer font-medium"
                                                            >
                                                                {user.isActive ? (
                                                                    <>
                                                                        <UserMinus className="h-4 w-4 mr-2 text-orange-500" />
                                                                        <span className="text-orange-500">Make Inactive</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck className="h-4 w-4 mr-2 text-emerald-500" />
                                                                        <span className="text-emerald-500">Make Active</span>
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canManageUsers && !isSignedInUser(user) && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => triggerDelete(user)}
                                                                    className="text-destructive focus:text-destructive cursor-pointer"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete User
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Pagination */}
                <ReusablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <UserModal
                open={showCreate}
                hideOverlay={showOnboardingGuide && onboardingStep === 11}
                hideCancel={showOnboardingGuide && onboardingStep === 11}
                onClose={() => {
                    if (showOnboardingGuide && onboardingStep === 11) return;
                    setShowCreate(false);
                    setSelectedUser(null);
                    setDefaultCreateRole(undefined);
                }}
                onSubmit={async (userData) => {
                    await handleAddUser(userData);
                    if (showOnboardingGuide) {
                        goToTourStep(12);
                    } else {
                        setShowCreate(false);
                        setSelectedUser(null);
                        setDefaultCreateRole(undefined);
                    }
                }}
                mode={modalMode}
                initialData={selectedUser}
                canManageRoles={canManageUsers}
                canInviteAuditee={canInviteAuditee}
                auditeeSites={modalAuditeeSites}
                disabledAuditeeSiteIds={
                    modalMode === "create" ? undefined : disabledSiteIdsForSelectedUser
                }
                defaultCreateRole={defaultCreateRole}
            />

            <AssignAuditeeSiteModal
                open={assignSiteUser != null}
                onClose={() => setAssignSiteUser(null)}
                auditee={
                    assignSiteUser
                        ? {
                              id: Number(assignSiteUser.id),
                              firstName: assignSiteUser.firstName,
                              lastName: assignSiteUser.lastName,
                              siteIds: Array.isArray(assignSiteUser.siteIds)
                                  ? assignSiteUser.siteIds.map((id: string | number) => String(id))
                                  : assignSiteUser.siteId != null
                                    ? [String(assignSiteUser.siteId)]
                                    : [],
                          }
                        : null
                }
                sites={allAuditeeSites}
                disabledSiteIds={disabledSiteIdsForAssign}
                onSuccess={() => {
                    void fetchUsers();
                    void refetchCompanies();
                }}
            />

            {/* Step 10: Invite User button */}
            {showOnboardingGuide && onboardingStep === 10 && (
                <TourStepPopover
                    targetId="tour-step-create-user"
                    step={10}
                    totalSteps={ONBOARDING_TOTAL_STEPS}
                    title="Invite User"
                    description="Click 'Invite User' to start adding your team members."
                    onNext={() => goToTourStep(11)}
                    onBack={() => navigate("/companies?onboarding=true&step=9")}
                    onClose={() => {
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
                    }}
                    position="left"
                    disableShadow={false}
                />
            )}

            {/* Step 11: Invite User modal */}
            {showOnboardingGuide && onboardingStep === 11 && showCreate && (
                <TourStepPopover
                    targetId="tour-step-user-modal"
                    step={11}
                    totalSteps={ONBOARDING_TOTAL_STEPS}
                    title="Invite User Details"
                    description="Fill in the user details and assign a role, then click Invite User, or press Next to continue."
                    onNext={() => goToTourStep(12)}
                    onBack={() => goToTourStep(10)}
                    onClose={() => {
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
                        setShowCreate(false);
                    }}
                    position="right"
                    disableShadow={true}
                />
            )}

            {/* Step 12: View Users list */}
            {showOnboardingGuide && onboardingStep === 12 && !showCreate && (
                <TourStepPopover
                    targetId="tour-step-users-list"
                    step={12}
                    totalSteps={ONBOARDING_TOTAL_STEPS}
                    title="View Your Team"
                    description="Here you can see the users list and also by clicking the three dots you can view, edit, change status, and delete users."
                    onNext={() => goToTourStep(13)}
                    onBack={() => goToTourStep(11)}
                    onClose={() => {
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
                    }}
                    position="top"
                    disableShadow={false}
                />
            )}

            {/* Step 13: Move to Self Assessment sidebar */}
            {showOnboardingGuide && onboardingStep === 13 && (
                <TourStepPopover
                    targetId="tour-step-self-assessment"
                    step={13}
                    totalSteps={ONBOARDING_TOTAL_STEPS}
                    title="Self Assessment"
                    description="Self Assessment helps companies new to ISO evaluate compliance. If you're already certified, this tool is optional and can be skipped."
                    onNext={() => navigate("/self-assessment?onboarding=true&step=14")}
                    onBack={() => setTourStep(12)}
                    onClose={() => setShowOnboardingGuide(false)}
                    position="right"
                    disableShadow={false}
                />
            )}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[400px]">
                    <AlertDialogHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                        <AlertDialogTitle className="text-center text-xl">Delete User?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Are you sure you want to delete <span className="font-semibold text-foreground">{userToDelete?.firstName} {userToDelete?.lastName}</span>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
                        <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void handleDeleteUser();
                            }}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                "Delete User"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
