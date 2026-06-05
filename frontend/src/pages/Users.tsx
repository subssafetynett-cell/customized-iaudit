import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    UserPlus,
    Search,
    MoreHorizontal,
    User as UserIcon,
    Mail,
    Shield,
    Smartphone,
    Trash2,
    Edit2,
    Eye,
    ArrowUpRight,
    UserCheck,
    UserMinus,
    AlertTriangle,
    ArrowRight,
    Users as UsersIcon
} from "lucide-react";
import { TourStepPopover } from "@/components/TourStepPopover";
import { ONBOARDING_TOTAL_STEPS } from "@/lib/onboardingTour";
import UserModal from "@/components/UserModal";
import { canManageOrgUsers } from "@/lib/userRoles";
import { useStoredUser } from "@/hooks/useStoredUser";
import ReusablePagination from "@/components/ReusablePagination";
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

export default function Users() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showCreate, setShowCreate] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showOnboardingGuide, setShowOnboardingGuide] = useState(searchParams.get("onboarding") === "true");
    const [onboardingStep, setOnboardingStep] = useState<number | null>(null);

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
    const itemsPerPage = 8;

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, statusFilter]);

    // Edit/View States
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");

    // Deletion States
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [loggedInUserId, setLoggedInUserId] = useState<number | string | null>(null);
    const { user: storedUser } = useStoredUser();
    const isOrgAdmin = canManageOrgUsers(
        storedUser as { role?: string; creatorId?: number | null } | null,
    );

    const isSignedInUser = (rowUser: { id?: number | string }) => {
        if (loggedInUserId == null || rowUser?.id == null) return false;
        return String(rowUser.id) === String(loggedInUserId);
    };

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem("user") || "null");
            setLoggedInUserId(stored?.id ?? stored?._id ?? null);
        } catch {
            setLoggedInUserId(null);
        }
        fetchUsers();
    }, []);

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

    if (searchParams.get("inviteAuditee") === "true") {
        return <Navigate to="/invite-auditee" replace />;
    }

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const response = await apiFetch(`/users`);
            if (response.ok) {
                const responseData = await response.json();
                const data = Array.isArray(responseData) ? responseData : [];

                // Add the currently logged-in user to the list if they aren't already there
                let loggedInUser: { id?: number } | null = null;
                try {
                    loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
                } catch {
                    loggedInUser = null;
                }
                if (loggedInUser?.id != null) {
                    const isCurrentUserInList = data.some((u: any) => u.id === loggedInUser!.id);
                    if (!isCurrentUserInList) {
                        data.unshift(loggedInUser as any);
                    }
                }

                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
            toast.error("Failed to load users");
        } finally {
            setIsLoading(false);
        }
    };

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
                    setUsers([...users, updatedUser]);
                    if (updatedUser.emailVerificationPending) {
                        toast.success(
                            updatedUser.verificationEmailSent
                                ? updatedUser.welcomeEmailSent
                                    ? "User created. A welcome email with login credentials and verification code was sent — they must verify before signing in."
                                    : "User created. A verification code was sent to their email — they must verify before signing in."
                                : "User created but the onboarding email could not be sent. Use Resend verification from the user menu.",
                            { duration: 8000 },
                        );
                    } else {
                        toast.success("User created successfully!");
                    }
                } else {
                    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
                    if (updatedUser.id === user.id) {
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                    toast.success("User updated successfully!");
                }
            } else {
                const errorData = await response.json();
                console.error("Server error data:", errorData);
                const errorMsg = errorData.error || errorData.message || "Operation failed";
                toast.error(errorMsg);
                throw new Error(errorMsg); // Throw so UserModal can catch it
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
        if (!isOrgAdmin) {
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
                setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));

                // Also update local storage if it's the current user
                const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (loggedInUser.id === updatedUser.id) {
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }

                toast.success(`User set to ${updatedUser.isActive ? 'Active' : 'Inactive'}`);
            } else {
                toast.error("Failed to update status");
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
        if (!userToDelete) return;
        if (!isOrgAdmin) {
            toast.error("Only administrators can delete users.");
            return;
        }

        try {
            const response = await apiFetch(`/users/${userToDelete.id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setUsers(users.filter(u => u.id !== userToDelete.id));
                toast.success("User deleted successfully");
            } else {
                toast.error("Failed to delete user");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("An error occurred");
        } finally {
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    const triggerDelete = (user: any) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const openModal = (mode: "create" | "edit" | "view", user: any = null) => {
        setModalMode(mode);
        setSelectedUser(user);
        setShowCreate(true);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.firstName + " " + user.lastName + " " + user.email)
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === "all" || user.role === roleFilter;

        const userStatus = user.isActive ? "active" : "inactive";
        const matchesStatus = statusFilter === "all" || userStatus === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
    });

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="h-full bg-white">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 px-4 sm:px-0">
                    <div id="tour-step-users">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage system users, their roles and access status</p>
                    </div>

                    {isOrgAdmin && (
                        <div>
                            <Button
                                id="tour-step-create-user"
                                onClick={() => openModal("create")}
                                size="sm"
                                className="w-full sm:w-auto gap-1.5 shadow-sm bg-[#213847] hover:bg-[#213847]/90 text-white rounded-xl px-5 h-11 transition-all"
                            >
                                <UserPlus className="h-4 w-4" /> Create User
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
                                <SelectItem value="auditor" className="rounded-lg cursor-pointer">Auditor</SelectItem>
                                <SelectItem value="auditee" className="rounded-lg cursor-pointer">Auditee</SelectItem>
                                <SelectItem value="other" className="rounded-lg cursor-pointer">Other</SelectItem>
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
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center py-10">
                                                <UserIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                                <p className="text-sm text-muted-foreground">No users found</p>
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
                                                    {user.role === "other" ? user.customRoleName : user.role}
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
                                                        {(isOrgAdmin || isSignedInUser(user)) && (
                                                            <DropdownMenuItem onClick={() => openModal("edit", user)} className="cursor-pointer">
                                                                <Edit2 className="h-4 w-4 mr-2" /> Edit User
                                                            </DropdownMenuItem>
                                                        )}
                                                        {isOrgAdmin && !user.emailVerifiedAt && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleResendVerification(user)}
                                                                className="cursor-pointer font-medium"
                                                            >
                                                                <Mail className="h-4 w-4 mr-2" /> Resend verification
                                                            </DropdownMenuItem>
                                                        )}
                                                        {isOrgAdmin && (
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
                                                        {isOrgAdmin && !isSignedInUser(user) && (
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
                    totalItems={filteredUsers.length}
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
                }}
                onSubmit={async (userData) => {
                    await handleAddUser(userData);
                    if (showOnboardingGuide) {
                        goToTourStep(12);
                    } else {
                        setShowCreate(false);
                        setSelectedUser(null);
                    }
                }}
                mode={modalMode}
                initialData={selectedUser}
                canManageRoles={isOrgAdmin}
            />

            {/* Step 10: Create User button */}
            {showOnboardingGuide && onboardingStep === 10 && (
                <TourStepPopover
                    targetId="tour-step-create-user"
                    step={10}
                    totalSteps={ONBOARDING_TOTAL_STEPS}
                    title="Add User"
                    description="Click 'Create User' to start adding your team members."
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

            {/* Step 11: Create User modal */}
            {showOnboardingGuide && onboardingStep === 11 && showCreate && (
                <TourStepPopover
                    targetId="tour-step-user-modal"
                    step={11}
                    totalSteps={ONBOARDING_TOTAL_STEPS}
                    title="Add User Details"
                    description="Fill in the user details and assign a role, then click Create User, or press Next to continue."
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
                            onClick={handleDeleteUser}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
