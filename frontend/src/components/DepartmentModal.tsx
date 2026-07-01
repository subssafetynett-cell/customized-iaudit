import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Info, Pencil, ShieldAlert } from "lucide-react";
import { Department } from "@/types/company";
import { DEPT_NAME_MAX, DEPT_NAME_ERROR_MESSAGE, isWithinMaxLength } from "@/lib/validation";
import { apiFetch } from "@/lib/api";
import {
    formatUserDisplayName,
    formatUserRoleLabel,
    usersEligibleAsAuditors,
} from "@/lib/userRoles";

type SiteOption = { id: string; name: string };

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Partial<Department>;
    mode?: "create" | "edit";
    siteName?: string;
    sites?: SiteOption[];
    initialSiteId?: string;
    hideOverlay?: boolean;
    hideCancel?: boolean;
}

type OrgUser = {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string;
    customRoleName?: string | null;
    isActive?: boolean;
};

const STATUSES = ["Active", "Inactive"];

function normalizeDepartmentStatus(status?: string | null): string {
    if (!status?.trim()) return "Active";
    const match = STATUSES.find(
        (option) => option.toLowerCase() === status.trim().toLowerCase(),
    );
    return match ?? "Active";
}

function departmentFormDefaults(initialData?: Partial<Department>) {
    return {
        name: initialData?.name ?? "",
        code: initialData?.code ?? "",
        status: normalizeDepartmentStatus(initialData?.status),
        manager: initialData?.manager ?? "",
        description: initialData?.description ?? "",
    };
}

export default function DepartmentModal({
    open,
    onClose,
    onSubmit,
    initialData,
    mode = "create",
    siteName,
    sites = [],
    initialSiteId,
    hideOverlay = false,
    hideCancel = false,
}: Props) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [status, setStatus] = useState("Active");
    const [manager, setManager] = useState("");
    const [description, setDescription] = useState("");
    const [siteId, setSiteId] = useState("");
    const [error, setError] = useState("");
    const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        (async () => {
            setUsersLoading(true);
            try {
                const response = await apiFetch("/users");
                if (!response.ok) throw new Error("Failed to load users");
                const data = await response.json();
                let list = Array.isArray(data) ? data : [];

                try {
                    const loggedInUser = JSON.parse(localStorage.getItem("user") || "null") as OrgUser | null;
                    if (loggedInUser?.id != null) {
                        const inList = list.some((u: OrgUser) => String(u.id) === String(loggedInUser.id));
                        if (!inList) list = [loggedInUser, ...list];
                    }
                } catch {
                    /* ignore */
                }

                const eligible = usersEligibleAsAuditors(list as OrgUser[]).filter(
                    (user) => user.isActive !== false,
                );
                eligible.sort((a, b) =>
                    formatUserDisplayName(a).localeCompare(formatUserDisplayName(b)),
                );
                if (!cancelled) setOrgUsers(eligible);
            } catch {
                if (!cancelled) setOrgUsers([]);
            } finally {
                if (!cancelled) setUsersLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    const managerOptions = useMemo(() => {
        const options = orgUsers.map((user) => {
            const name = formatUserDisplayName(user);
            const role = formatUserRoleLabel(user.role, user.customRoleName);
            return {
                value: name,
                label: role ? `${name} (${role})` : name,
            };
        });

        const selected = manager.trim();
        if (selected && !options.some((option) => option.value === selected)) {
            options.unshift({ value: selected, label: selected });
        }

        return options;
    }, [orgUsers, manager]);

    useEffect(() => {
        if (!open) return;

        const defaults = departmentFormDefaults(initialData);
        setName(defaults.name);
        setCode(defaults.code);
        setStatus(defaults.status);
        setManager(defaults.manager);
        setDescription(defaults.description);
        setError("");
    }, [open, initialData]);

    const siteOptionsKey = useMemo(
        () => sites.map((site) => `${site.id}:${site.name}`).join("|"),
        [sites],
    );

    useEffect(() => {
        if (!open) {
            setSiteId("");
            return;
        }
        if (mode !== "create" || sites.length === 0) {
            setSiteId("");
            return;
        }

        const defaultId =
            initialSiteId && sites.some((site) => site.id === initialSiteId)
                ? initialSiteId
                : sites[0].id;
        setSiteId(defaultId);
    }, [open, mode, initialSiteId, siteOptionsKey, sites]);

    const handleSubmit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Department name is required");
            return;
        }
        if (!isWithinMaxLength(trimmedName, DEPT_NAME_MAX)) {
            setError(DEPT_NAME_ERROR_MESSAGE);
            return;
        }
        if (mode === "create" && sites.length > 0 && !siteId) {
            setError("Please select a site");
            return;
        }
        onSubmit({
            name: trimmedName,
            code: code.trim(),
            status,
            manager,
            description: description.trim(),
            ...(mode === "create" && siteId ? { siteId } : {}),
        });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogContent
                id="tour-step-dept-modal"
                hideOverlay={hideOverlay}
                className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
                onPointerDownOutside={hideCancel ? (e) => e.preventDefault() : undefined}
                onEscapeKeyDown={hideCancel ? (e) => e.preventDefault() : undefined}
            >
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        {mode === "create" ? (
                            <>
                                <Users className="h-5 w-5 text-primary" />
                                Create New Department
                            </>
                        ) : (
                            <>
                                <Pencil className="h-5 w-5 text-primary" />
                                Edit Department
                            </>
                        )}
                    </DialogTitle>
                    {mode === "edit" && siteName && (
                        <p className="text-sm text-muted-foreground mt-1">
                            For site: <span className="font-medium text-foreground">{siteName}</span>
                        </p>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 py-4 space-y-8">
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary mt-0.5" />
                        <p className="text-sm text-primary leading-relaxed font-medium">
                            Fill in the details to {mode === "create" ? "create a new" : "update the"} department
                        </p>
                    </div>

                    <div className="space-y-4">
                        {mode === "create" && sites.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="dept-site">Site *</Label>
                                <Select value={siteId} onValueChange={(value) => { setSiteId(value); setError(""); }}>
                                    <SelectTrigger id="dept-site">
                                        <SelectValue placeholder="Select site" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sites.map((site) => (
                                            <SelectItem key={site.id} value={site.id}>
                                                {site.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dept-name">Department Name *</Label>
                                <Input
                                    id="dept-name"
                                    placeholder="e.g. Operations"
                                    maxLength={DEPT_NAME_MAX}
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setError(""); }}
                                />
                                <p className="text-[11px] text-muted-foreground ml-1">
                                    {name.length}/{DEPT_NAME_MAX} characters
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dept-code">Department Code</Label>
                                <div className="space-y-1">
                                    <Input
                                        id="dept-code"
                                        placeholder="e.g. OPS-001"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                    />
                                    <p className="text-[11px] text-muted-foreground ml-1">Unique code</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dept-status">Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger id="dept-status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dept-manager">Department Manager</Label>
                                <Select
                                    value={manager || undefined}
                                    onValueChange={setManager}
                                    disabled={usersLoading}
                                >
                                    <SelectTrigger id="dept-manager">
                                        <SelectValue
                                            placeholder={
                                                usersLoading ? "Loading users…" : "Select manager"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {managerOptions.length === 0 && !usersLoading ? (
                                            <SelectItem value="__no_users__" disabled>
                                                No users available — add users on the Users page
                                            </SelectItem>
                                        ) : (
                                            managerOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dept-desc">Description</Label>
                            <Input
                                id="dept-desc"
                                placeholder="Brief description of the department"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm font-medium flex gap-2 items-center">
                            <ShieldAlert className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-4 border-t bg-muted/20 gap-2 sm:gap-0">
                    {!hideCancel && (
                        <Button variant="outline" onClick={onClose} className="px-6 border-muted-foreground/30">
                            Cancel
                        </Button>
                    )}
                    <Button onClick={handleSubmit} className="px-8 shadow-sm">
                        {mode === "create" ? "Create Department" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
