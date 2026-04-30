import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import UserModal from "@/components/UserModal";
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

import { API_BASE_URL } from "@/config";

const API_URL = `${API_BASE_URL}/api`;

export default function Users() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showCreate, setShowCreate] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showOnboardingGuide, setShowOnboardingGuide] = useState(searchParams.get("onboarding") === "true");

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

    useEffect(() => {
        fetchUsers();
    }, []);

    // Sync onboarding guide state with URL parameter
    useEffect(() => {
        const onboarding = searchParams.get("onboarding") === "true";
        if (onboarding) {
            console.log("Onboarding mode detected in Users page");
            setShowOnboardingGuide(true);
        }
    }, [searchParams]);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const response = await fetch(`${API_URL}/users?creatorId=${user.id}`);
            if (response.ok) {
                const responseData = await response.json();
                const data = Array.isArray(responseData) ? responseData : [];

                // Add the currently logged in user to the list if they aren't already there
                if (user && user.id) {
                    const isCurrentUserInList = data.some((u: any) => u.id === user.id);
                    if (!isCurrentUserInList) {
                        data.unshift(user);
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
            const endpoint = modalMode === "create" ? `${API_URL}/users` : `${API_URL}/users/${selectedUser.id}`;
            const method = modalMode === "create" ? "POST" : "PUT";
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            const payload = modalMode === "create" ? { ...userData, creatorId: user.id } : userData;

            const response = await fetch(endpoint, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                if (modalMode === "create") {
                    setUsers([...users, updatedUser]);
                    toast.success("User created successfully!");
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
        try {
            const response = await fetch(`${API_URL}/users/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...user, isActive: !user.isActive }),
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

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            const response = await fetch(`${API_URL}/users/${userToDelete.id}`, {
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
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage system users, their roles and access status</p>
                    </div>

                    <div className={`relative ${showOnboardingGuide ? "z-[60]" : ""}`}>
                        {showOnboardingGuide && (
                            <div className="absolute inset-0 -m-2 rounded-2xl ring-[8px] ring-blue-500/50 animate-pulse z-[-1]" />
                        )}
                        <Button 
                            onClick={() => {
                                openModal("create");
                                setShowOnboardingGuide(false);
                            }} 
                            size="sm" 
                            className={`w-full sm:w-auto gap-1.5 shadow-sm bg-[#213847] hover:bg-[#213847]/90 text-white rounded-xl px-5 h-11 transition-all ${showOnboardingGuide ? "relative z-[60] ring-[6px] ring-blue-500 ring-offset-2 scale-105 shadow-2xl" : ""}`}
                        >
                            <UserPlus className="h-4 w-4" /> Create User
                        </Button>
                        {/* Step 3: Users Onboarding Guide */}
                        {showOnboardingGuide && (
                            <>
                                <div className="fixed inset-0 bg-slate-900/30 z-[50] animate-in fade-in duration-700" />
                                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:translate-y-0 md:absolute md:inset-auto md:top-14 md:right-0 z-[60] animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="bg-white border-0 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-5 md:p-6 w-full max-w-[720px] mx-auto md:ml-0 relative overflow-hidden group/modal">
                                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
                                        
                                        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
                                            <div className="flex items-center justify-between">
                                                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                                                    Step 3 of 6
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                                                    <UsersIcon className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <h4 className="font-black text-xl text-slate-900 tracking-tight whitespace-nowrap">Step 3: Add Users</h4>
                                            </div>

                                        <div className="space-y-4">
                                            <p className="text-sm font-medium text-slate-600 leading-relaxed px-1">
                                                Clicking here you can create new user like auditor auditee etc.
                                            </p>
                                        </div>

                                        <div className="flex justify-between pt-2 gap-3">
                                            <Button 
                                                variant="outline"
                                                size="sm"
                                                className="w-1/3 text-slate-600 font-bold rounded-xl h-12"
                                                onClick={() => {
                                                    setShowOnboardingGuide(false);
                                                    navigate("/");
                                                }}
                                            >
                                                Back
                                            </Button>
                                            <Button 
                                                size="sm"
                                                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 h-12 text-base"
                                                onClick={() => {
                                                    setShowOnboardingGuide(false);
                                                    // Transition to Step 4: Self Assessment
                                                    navigate("/self-assessment?onboarding=true");
                                                }}
                                            >
                                                Next <ArrowRight className="ml-2 w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6 px-4 sm:px-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
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
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mx-4 sm:mx-0">
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
                                                <Badge
                                                    variant={user.isActive ? "default" : "outline"}
                                                    className={user.isActive ? "bg-[#e6f7e9] hover:bg-[#d4f2da] text-[#22a04c] border-none px-4 py-1 rounded-full shadow-none font-medium" : "text-muted-foreground px-4 py-1 rounded-full font-medium"}
                                                >
                                                    {user.isActive ? "Active" : "Inactive"}
                                                </Badge>
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
                                                        <DropdownMenuItem onClick={() => openModal("edit", user)} className="cursor-pointer">
                                                            <Edit2 className="h-4 w-4 mr-2" /> Edit User
                                                        </DropdownMenuItem>
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
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => triggerDelete(user)}
                                                            className="text-destructive focus:text-destructive cursor-pointer"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete User
                                                        </DropdownMenuItem>
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
                onClose={() => {
                    setShowCreate(false);
                    setSelectedUser(null);
                }}
                onSubmit={handleAddUser}
                mode={modalMode}
                initialData={selectedUser}
            />

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
