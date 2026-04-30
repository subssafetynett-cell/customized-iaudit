import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Search,
    MoreHorizontal,
    User as UserIcon,
    Mail,
    Shield,
    Trash2,
    Eye,
    UserCheck,
    UserMinus,
    Building2,
    CheckCircle2,
    XCircle,
    LogOut
} from "lucide-react";
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
import UserModal from "@/components/UserModal";
import ReusablePagination from "@/components/ReusablePagination";

const API_URL = `${API_BASE_URL}/api`;

export default function SuperAdmin() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Reset page to 1 when filters or page size change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, statusFilter, itemsPerPage]);

    // Modal States
    const [showUserModal, setShowUserModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("view");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const isAuth = localStorage.getItem("isSuperAdminAuthenticated") === "true";
        if (!isAuth) {
            navigate("/super-admin-login");
            return;
        }
        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [usersRes, companiesRes] = await Promise.all([
                fetch(`${API_URL}/users`),
                fetch(`${API_URL}/companies?admin=true`)
            ]);

            if (usersRes.ok && companiesRes.ok) {
                const usersData = await usersRes.json();
                const companiesData = await companiesRes.json();
                setUsers(usersData);
                setCompanies(companiesData);
            } else {
                toast.error("Failed to load data");
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
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
                toast.success(`User ${updatedUser.firstName} is now ${updatedUser.isActive ? 'Active' : 'Inactive'}`);
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error("An error occurred");
        }
    };

    const handleAddUser = async (userData: any) => {
        try {
            const endpoint = modalMode === "create" ? `${API_URL}/users` : `${API_URL}/users/${selectedUser.id}`;
            const method = modalMode === "create" ? "POST" : "PUT";
            
            const response = await fetch(endpoint, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                if (modalMode === "create") {
                    setUsers([...users, updatedUser]);
                    toast.success("User created successfully!");
                } else {
                    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
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
            const genericMsg = "An error occurred while creating/updating user.";
            toast.error(genericMsg);
            throw new Error(genericMsg);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            setIsDeleting(true);
            const response = await fetch(`${API_URL}/users/${selectedUser.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setUsers(users.filter(u => u.id !== selectedUser.id));
                toast.success(`User ${selectedUser.firstName} deleted successfully`);
                setShowDeleteDialog(false);
            } else {
                toast.error("Failed to delete user");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("An error occurred while deleting the user");
        } finally {
            setIsDeleting(false);
            setSelectedUser(null);
        }
    };

    const getUserCompany = (userId: any) => {
        return companies.find(c => String(c.userId) === String(userId));
    };

    const filteredUsers = users.filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const userCompany = getUserCompany(user.id);
        const companyName = userCompany?.name?.toLowerCase() || "";

        const matchesSearch =
            fullName.includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            companyName.includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        const userStatus = user.isActive ? "active" : "inactive";
        const matchesStatus = statusFilter === "all" || userStatus === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
    });

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const openUserModal = (mode: "create" | "edit" | "view", user: any = null) => {
        setModalMode(mode);
        setSelectedUser(user);
        setShowUserModal(true);
    };

    return (
        <div className="h-full bg-white">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Super Admin Console</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Global user management and company associations</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => {
                            localStorage.removeItem("isSuperAdminAuthenticated");
                            navigate("/");
                            toast.success("Super Admin session ended");
                        }}
                        className="rounded-xl border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 gap-2 font-medium"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email or company..."
                            className="pl-11 h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4">
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-[180px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-[#213847]/40">
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
                            <SelectTrigger className="w-[180px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-[#213847]/40">
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

                {/* Main Content Card */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[#213847] hover:bg-[#213847] border-none">
                                <TableHead className="w-[80px] text-white pl-6">SL No.</TableHead>
                                <TableHead className="text-white">User Details</TableHead>
                                <TableHead className="text-white">Role</TableHead>
                                <TableHead className="text-white">Company Created</TableHead>
                                <TableHead className="text-white">Status</TableHead>
                                <TableHead className="text-right text-white pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center py-10">
                                            <UserIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                            <p className="text-sm text-muted-foreground">No users found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsers.map((user, index) => {
                                    const company = getUserCompany(user.id);
                                    return (
                                        <TableRow key={user.id} className="group hover:bg-muted/50 transition-colors">
                                            <TableCell className="pl-6 font-medium text-muted-foreground/60">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-[#213847]">{user.firstName} {user.lastName}</span>
                                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Mail className="h-3 w-3" /> {user.email}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-medium capitalize py-0 px-2 h-6 flex w-fit items-center gap-1 border-slate-200">
                                                    <Shield className="h-3 w-3 text-slate-500" />
                                                    {user.role === "other" ? user.customRoleName : user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {company ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100">
                                                            <Building2 className="h-3.5 w-3.5 text-blue-600" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-700">{company.name}</span>
                                                            <span className="text-[10px] text-slate-400">{company.industry || "General"}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">No company created</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={user.isActive ? "default" : "outline"}
                                                    className={user.isActive
                                                        ? "bg-[#e6f7e9] hover:bg-[#d4f2da] text-[#22a04c] border-none px-4 py-1 rounded-full shadow-none font-semibold text-[11px]"
                                                        : "bg-slate-50 text-slate-400 px-4 py-1 rounded-full font-medium text-[11px] border-slate-200"}
                                                >
                                                    {user.isActive ? "ACTIVE" : "INACTIVE"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[180px] rounded-xl shadow-lg border-slate-200">
                                                        <DropdownMenuLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openUserModal("view", user)} className="cursor-pointer gap-2 rounded-lg m-1">
                                                            <Eye className="h-4 w-4 text-slate-500" /> View Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(user)}
                                                            className={cn(
                                                                "cursor-pointer gap-2 rounded-lg m-1 font-medium",
                                                                user.isActive ? "text-orange-600 hover:text-orange-700" : "text-emerald-600 hover:text-emerald-700"
                                                            )}
                                                        >
                                                            {user.isActive ? (
                                                                <>
                                                                    <UserMinus className="h-4 w-4" /> Deactivate Account
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UserCheck className="h-4 w-4" /> Activate Account
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setShowDeleteDialog(true);
                                                            }}
                                                            className="cursor-pointer gap-2 rounded-lg m-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" /> Delete User
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

                {/* Pagination */}
                {!isLoading && (
                    <ReusablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredUsers.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            <UserModal
                open={showUserModal}
                onClose={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                }}
                onSubmit={handleAddUser}
                mode={modalMode}
                initialData={selectedUser}
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="rounded-[2rem] border-slate-100 shadow-2xl p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold text-[#1e293b]">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 text-base mt-2">
                            This action cannot be undone. This will permanently delete the user account for
                            <span className="font-bold text-[#213847] ml-1">
                                {selectedUser?.firstName} {selectedUser?.lastName}
                            </span> and remove their data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-3">
                        <AlertDialogCancel className="rounded-2xl h-12 px-6 font-semibold border-slate-200 text-slate-600 hover:bg-slate-50">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteUser();
                            }}
                            disabled={isDeleting}
                            className="rounded-2xl h-12 px-6 font-semibold bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-200"
                        >
                            {isDeleting ? "Deleting..." : "Delete Permanently"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Utility function for conditional classes (if not already globally available)
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
