import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
    UserPlus,
    Users,
    MoreHorizontal,
    Trash2,
    UserMinus,
    UserCheck,
    AlertTriangle,
    Edit2,
    MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    InviteAuditeeModal,
    type InviteAuditeeSiteOption,
} from "@/components/InviteAuditeeModal";
import { AssignAuditeeSiteModal } from "@/components/AssignAuditeeSiteModal";
import UserModal from "@/components/UserModal";
import { useCompanyStore } from "@/hooks/useCompanyStore";
import { apiFetch } from "@/lib/api";
import { sitesFromCompanies } from "@/lib/orgSites";

type AuditeeRow = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    mobile?: string | null;
    isActive: boolean;
    emailVerifiedAt?: string | null;
    createdAt: string;
    siteLabel: string;
    siteId: string | null;
    role: string;
};

function auditeeStatus(user: AuditeeRow) {
    if (!user.emailVerifiedAt) {
        return { label: "Pending verification", className: "text-amber-700 border-amber-300 bg-amber-50" };
    }
    if (user.isActive) {
        return { label: "Active", className: "bg-[#e6f7e9] text-[#22a04c] border-none" };
    }
    return { label: "Inactive", className: "text-muted-foreground" };
}

export default function InviteAuditee() {
    const { companies, isLoading: companiesLoading, refetchCompanies } = useCompanyStore();
    const [accessLoading, setAccessLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [auditeesLoading, setAuditeesLoading] = useState(true);
    const [auditees, setAuditees] = useState<AuditeeRow[]>([]);
    const [auditeeToDelete, setAuditeeToDelete] = useState<AuditeeRow | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [actionUserId, setActionUserId] = useState<number | null>(null);
    const [editAuditee, setEditAuditee] = useState<AuditeeRow | null>(null);
    const [assignSiteAuditee, setAssignSiteAuditee] = useState<AuditeeRow | null>(null);

    const validatedSites = useMemo(() => sitesFromCompanies(companies), [companies]);

    const allSites = useMemo<InviteAuditeeSiteOption[]>(
        () =>
            validatedSites.map((site) => ({
                id: String(site.id),
                name: site.name,
                companyName: site.company.name,
            })),
        [validatedSites],
    );

    // Invite flow: only sites without an assigned auditee (one site per auditee).
    const inviteSites = useMemo<InviteAuditeeSiteOption[]>(
        () =>
            validatedSites
                .filter((site) => (site as { userId?: number | null }).userId == null)
                .map((site) => ({
                    id: String(site.id),
                    name: site.name,
                    companyName: site.company.name,
                })),
        [validatedSites],
    );

    const siteInfoByUserId = useMemo(() => {
        const map = new Map<number, { siteId: string; siteLabel: string }>();
        for (const site of validatedSites) {
            const uid = Number((site as { userId?: number }).userId);
            if (!Number.isFinite(uid) || uid < 1) continue;
            map.set(uid, {
                siteId: String(site.id),
                siteLabel: `${site.name} (${site.company.name})`,
            });
        }
        return map;
    }, [validatedSites]);

    const fetchAuditees = useCallback(async () => {
        setAuditeesLoading(true);
        try {
            const res = await apiFetch("/users");
            if (!res.ok) {
                setAuditees([]);
                return;
            }
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            const rows: AuditeeRow[] = list
                .filter((u: { role?: string }) => String(u.role ?? "").toLowerCase() === "auditee")
                .map((u: {
                    id: number;
                    firstName: string;
                    lastName: string;
                    email: string;
                    mobile?: string | null;
                    isActive: boolean;
                    emailVerifiedAt?: string | null;
                    createdAt: string;
                    role?: string;
                }) => {
                    const siteInfo = siteInfoByUserId.get(u.id);
                    return {
                        id: u.id,
                        firstName: u.firstName,
                        lastName: u.lastName,
                        email: u.email,
                        mobile: u.mobile,
                        isActive: u.isActive,
                        emailVerifiedAt: u.emailVerifiedAt,
                        createdAt: u.createdAt,
                        role: u.role ?? "auditee",
                        siteId: siteInfo?.siteId ?? null,
                        siteLabel: siteInfo?.siteLabel ?? "—",
                    };
                });
            setAuditees(rows);
        } catch {
            setAuditees([]);
        } finally {
            setAuditeesLoading(false);
        }
    }, [siteInfoByUserId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch("/users/invite-auditee/access");
                if (!res.ok) {
                    if (!cancelled) setAllowed(false);
                    return;
                }
                const data = await res.json();
                if (!cancelled) setAllowed(data.allowed === true);
            } catch {
                if (!cancelled) setAllowed(false);
            } finally {
                if (!cancelled) setAccessLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!allowed || companiesLoading) return;
        void fetchAuditees();
    }, [allowed, companiesLoading, fetchAuditees]);

    const handleToggleActive = async (user: AuditeeRow) => {
        setActionUserId(user.id);
        try {
            const res = await apiFetch(`/users/${user.id}`, {
                method: "PUT",
                body: JSON.stringify({ isActive: !user.isActive }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.error || data.message || "Failed to update status");
                return;
            }
            setAuditees((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, isActive: data.isActive } : u)),
            );
            toast.success(data.isActive ? "Auditee activated" : "Auditee deactivated");
        } catch {
            toast.error("An error occurred");
        } finally {
            setActionUserId(null);
        }
    };

    const handleEditAuditee = async (userData: {
        firstName: string;
        lastName: string;
        email: string;
        mobile: string;
        emailChangeOtp?: string;
    }) => {
        if (!editAuditee) return;
        const response = await apiFetch(`/users/${editAuditee.id}`, {
            method: "PUT",
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg =
                errorData.error || errorData.message || "Failed to update auditee";
            toast.error(errorMsg);
            throw new Error(errorMsg);
        }
        const updatedUser = await response.json();
        const siteInfo = siteInfoByUserId.get(updatedUser.id);
        setAuditees((prev) =>
            prev.map((u) =>
                u.id === updatedUser.id
                    ? {
                          ...u,
                          firstName: updatedUser.firstName,
                          lastName: updatedUser.lastName,
                          email: updatedUser.email,
                          mobile: updatedUser.mobile,
                          siteLabel: siteInfo?.siteLabel ?? u.siteLabel,
                      }
                    : u,
            ),
        );
        toast.success("Auditee updated");
    };

    const handleDeleteAuditee = async () => {
        if (!auditeeToDelete) return;
        setActionUserId(auditeeToDelete.id);
        try {
            const res = await apiFetch(`/users/${auditeeToDelete.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || data.message || "Failed to delete auditee");
                return;
            }
            setAuditees((prev) => prev.filter((u) => u.id !== auditeeToDelete.id));
            await refetchCompanies();
            toast.success("Auditee deleted");
        } catch {
            toast.error("An error occurred");
        } finally {
            setActionUserId(null);
            setDeleteDialogOpen(false);
            setAuditeeToDelete(null);
        }
    };

    if (accessLoading) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center text-slate-500 text-sm">
                Loading…
            </div>
        );
    }

    if (!allowed) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Invite Auditee</h1>
                    <p className="text-sm text-[#6B7280] mt-1 max-w-2xl">
                        Invite someone in the auditee role so they can access their assigned site.
                    </p>
                </div>
                <Button
                    id="tour-step-invite-auditee-action"
                    className="bg-[#1e855e] hover:bg-[#166534] shrink-0"
                    onClick={() => setModalOpen(true)}
                    disabled={companiesLoading || inviteSites.length === 0}
                >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite auditee
                </Button>
            </div>

            {!companiesLoading && validatedSites.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 -mt-4">
                    Add at least one company and site under Companies before inviting an auditee.
                </p>
            ) : !companiesLoading && inviteSites.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 -mt-4">
                    All sites already have an auditee assigned. Unassign a site or add a new site before inviting.
                </p>
            ) : null}

            <Card className="border-none shadow-sm rounded-xl overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-[#1e855e]" />
                        Invited auditees
                    </CardTitle>
                    <CardDescription>
                        Auditee accounts in your organization and their assigned sites.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 pb-2">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#213847] hover:bg-[#213847] border-none">
                                    <TableHead className="text-white pl-6">Name</TableHead>
                                    <TableHead className="text-white">Email</TableHead>
                                    <TableHead className="text-white">Phone</TableHead>
                                    <TableHead className="text-white">Site</TableHead>
                                    <TableHead className="text-white">Status</TableHead>
                                    <TableHead className="text-white">Invited</TableHead>
                                    <TableHead className="text-white text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {auditeesLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Loading auditees…
                                        </TableCell>
                                    </TableRow>
                                ) : auditees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                                                <Users className="h-10 w-10 opacity-30 mb-2" />
                                                <p className="text-sm">No auditees invited yet</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    auditees.map((user) => {
                                        const status = auditeeStatus(user);
                                        return (
                                            <TableRow key={user.id} className="hover:bg-muted/50">
                                                <TableCell className="pl-6 font-semibold text-sm text-[#213847]">
                                                    {user.firstName} {user.lastName}
                                                </TableCell>
                                                <TableCell className="text-sm text-[#6B7280]">
                                                    {user.email}
                                                </TableCell>
                                                <TableCell className="text-sm text-[#6B7280]">
                                                    {user.mobile || "—"}
                                                </TableCell>
                                                <TableCell className="text-sm text-[#6B7280] max-w-[200px]">
                                                    <span className="line-clamp-2">{user.siteLabel}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={status.className}>
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                type="button"
                                                                disabled={actionUserId === user.id}
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Open menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[200px]">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setEditAuditee(user)}
                                                                className="cursor-pointer"
                                                                disabled={actionUserId === user.id}
                                                            >
                                                                <Edit2 className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => setAssignSiteAuditee(user)}
                                                                className="cursor-pointer"
                                                                disabled={actionUserId === user.id || allSites.length === 0}
                                                            >
                                                                <MapPin className="h-4 w-4 mr-2" />
                                                                Select site
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleToggleActive(user)}
                                                                className="cursor-pointer font-medium"
                                                                disabled={actionUserId === user.id}
                                                            >
                                                                {user.isActive ? (
                                                                    <>
                                                                        <UserMinus className="h-4 w-4 mr-2 text-orange-500" />
                                                                        <span className="text-orange-500">Deactivate</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck className="h-4 w-4 mr-2 text-emerald-500" />
                                                                        <span className="text-emerald-500">Activate</span>
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setAuditeeToDelete(user);
                                                                    setDeleteDialogOpen(true);
                                                                }}
                                                                className="text-destructive focus:text-destructive cursor-pointer"
                                                                disabled={actionUserId === user.id}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <InviteAuditeeModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                sites={inviteSites}
                onSuccess={async () => {
                    await refetchCompanies();
                    await fetchAuditees();
                }}
            />

            <UserModal
                open={editAuditee != null}
                mode="edit"
                initialData={editAuditee ?? undefined}
                canManageRoles={false}
                onClose={() => setEditAuditee(null)}
                onSubmit={handleEditAuditee}
            />

            <AssignAuditeeSiteModal
                open={assignSiteAuditee != null}
                auditee={assignSiteAuditee}
                sites={allSites}
                onClose={() => setAssignSiteAuditee(null)}
                onSuccess={async () => {
                    await refetchCompanies();
                    await fetchAuditees();
                }}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[400px]">
                    <AlertDialogHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                        <AlertDialogTitle className="text-center text-xl">Delete auditee?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-foreground">
                                {auditeeToDelete?.firstName} {auditeeToDelete?.lastName}
                            </span>
                            ? This removes their account and unlinks them from the site. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
                        <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAuditee}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
