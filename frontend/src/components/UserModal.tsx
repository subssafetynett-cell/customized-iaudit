import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, User, Mail, Phone, Lock, Shield, Eye, Edit2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    mode?: "create" | "edit" | "view";
    initialData?: any;
}

export default function UserModal({ open, onClose, onSubmit, mode = "create", initialData }: Props) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");
    const [role, setRole] = useState("auditor");
    const [customRoleName, setCustomRoleName] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isViewMode = mode === "view";
    const isEditMode = mode === "edit";

    useEffect(() => {
        if (open) {
            if ((isEditMode || isViewMode) && initialData) {
                setFirstName(initialData.firstName || "");
                setLastName(initialData.lastName || "");
                setEmail(initialData.email || "");
                setMobile(initialData.mobile || "");
                setRole(initialData.role || "auditor");
                setCustomRoleName(initialData.customRoleName || "");
                setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);
                setSendWelcomeEmail(false);
                setPassword("");
                setConfirmPassword("");
            } else {
                setFirstName("");
                setLastName("");
                setEmail("");
                setMobile("");
                setRole("auditor");
                setCustomRoleName("");
                setIsActive(true);
                setSendWelcomeEmail(true);
                setPassword("");
                setConfirmPassword("");
            }
            setError("");
        }
    }, [open, mode, initialData, isEditMode, isViewMode]);

    const handleSubmit = async () => {
        if (isViewMode) {
            onClose();
            return;
        }

        setError("");
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            setError("Please fill in all required fields");
            return;
        }

        // Password is required only in create mode
        if (mode === "create" && !password.trim()) {
            setError("Password is required for new users");
            return;
        }

        if (role === "other" && !customRoleName.trim()) {
            setError("Please specify the custom role name");
            return;
        }

        if (password && password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        const payload: any = {
            firstName,
            lastName,
            email,
            mobile,
            role,
            customRoleName: role === "other" ? customRoleName : undefined,
            isActive,
            sendWelcomeEmail,
        };

        if (password) {
            payload.password = password;
        }

        try {
            setIsSubmitting(true);
            await onSubmit(payload);
            onClose(); // Only close on success
        } catch (err: any) {
            console.error("Submission error in modal:", err);
            setError(err.message || "Failed to process request. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTitle = () => {
        if (isViewMode) return "User Details";
        if (isEditMode) return "Edit User";
        return "Create New User";
    };

    const getIcon = () => {
        if (isViewMode) return <Eye className="h-6 w-6 text-primary" />;
        if (isEditMode) return <Edit2 className="h-6 w-6 text-primary" />;
        return <UserPlus className="h-6 w-6 text-primary" />;
    };

    const getSubmitLabel = () => {
        if (isViewMode) return "Close";
        if (isEditMode) return "Update User";
        return "Create User";
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {getIcon()}
                        {getTitle()}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 py-4 space-y-6">
                    {(isEditMode || isViewMode) && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">User Status</Label>
                                <p className="text-xs text-muted-foreground">
                                    {isActive ? "User is active and can login" : "User is inactive and cannot access the system"}
                                </p>
                            </div>
                            <Switch
                                checked={isActive}
                                onCheckedChange={setIsActive}
                                disabled={isViewMode}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first-name">First Name *</Label>
                            <Input
                                id="first-name"
                                placeholder="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                disabled={isViewMode}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last-name">Last Name *</Label>
                            <Input
                                id="last-name"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                disabled={isViewMode}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="Email address"
                                className="pl-9"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isViewMode}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="mobile"
                                    placeholder="Mobile number"
                                    className="pl-9"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select value={role} onValueChange={setRole} disabled={isViewMode}>
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="auditor">Auditor</SelectItem>
                                    <SelectItem value="auditee">Auditee</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {role === "other" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label htmlFor="custom-role-name">Custom Role Name *</Label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="custom-role-name"
                                    placeholder="Enter custom role name"
                                    className="pl-9"
                                    value={customRoleName}
                                    onChange={(e) => setCustomRoleName(e.target.value)}
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>
                    )}

                    {!isViewMode && mode === "create" && (
                        <div className="flex items-center space-x-2 py-2">
                            <Checkbox
                                id="welcome-email"
                                checked={sendWelcomeEmail}
                                onCheckedChange={(checked) => setSendWelcomeEmail(!!checked)}
                            />
                            <Label htmlFor="welcome-email" className="text-sm cursor-pointer">
                                Send welcome email
                            </Label>
                        </div>
                    )}

                    {mode === "create" && (
                        <div className="grid grid-cols-2 gap-4 text-sm mt-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">
                                    Password *
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Password"
                                        className="pl-9"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">
                                    Confirm Password *
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="Confirm Password"
                                        className="pl-9"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm font-medium">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        {isViewMode ? "Dismiss" : "Cancel"}
                    </Button>
                    {!isViewMode && (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? "Processing..." : getSubmitLabel()}
                        </Button>
                    )}
                    {isViewMode && (
                        <Button onClick={() => onClose()}>
                            OK
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
