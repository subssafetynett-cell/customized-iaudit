import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, User, Mail, Lock, Shield, Eye, EyeOff, Edit2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PhoneInputWithCountryCode } from "@/components/PhoneInputWithCountryCode";
import { DEFAULT_PHONE_COUNTRY_CODE } from "@/lib/phoneCountries";
import { PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE, isTenDigitPhone, normalizePhone10Digits, PHONE_10_ERROR_MESSAGE } from "@/lib/validation";
import { formatUserRoleLabel, USERS_PAGE_ROLE_OPTIONS } from "@/lib/userRoles";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    mode?: "create" | "edit" | "view";
    initialData?: any;
    hideOverlay?: boolean;
    hideCancel?: boolean;
    /** Only org admins may assign roles or toggle account status. */
    canManageRoles?: boolean;
    /** Pre-select role when opening create mode (e.g. auditee invite flow). */
    defaultCreateRole?: string;
}

export default function UserModal({
    open,
    onClose,
    onSubmit,
    mode = "create",
    initialData,
    hideOverlay = false,
    hideCancel = false,
    canManageRoles = false,
    defaultCreateRole,
}: Props) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");
    const [mobileCountry, setMobileCountry] = useState(DEFAULT_PHONE_COUNTRY_CODE);
    const [role, setRole] = useState("auditor");
    const [customRoleName, setCustomRoleName] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [originalEmail, setOriginalEmail] = useState("");
    const [emailChangeOtp, setEmailChangeOtp] = useState("");
    const [otpSentToEmail, setOtpSentToEmail] = useState<string | null>(null);
    const [resendTimer, setResendTimer] = useState(0);
    const [otpSending, setOtpSending] = useState(false);

    const isViewMode = mode === "view";
    const isEditMode = mode === "edit";

    useEffect(() => {
        if (resendTimer <= 0) return undefined;
        const id = window.setTimeout(() => setResendTimer((s) => Math.max(0, s - 1)), 1000);
        return () => clearTimeout(id);
    }, [resendTimer]);

    useEffect(() => {
        if (open) {
            if ((isEditMode || isViewMode) && initialData) {
                setFirstName(initialData.firstName || "");
                setLastName(initialData.lastName || "");
                setEmail(initialData.email || "");
                setOriginalEmail(initialData.email || "");
                setMobile(initialData.mobile || "");
                setRole(initialData.role || "auditor");
                setCustomRoleName(initialData.customRoleName || "");
                setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);
                setSendWelcomeEmail(false);
                setPassword("");
                setConfirmPassword("");
                setShowPassword(false);
                setShowConfirmPassword(false);
            } else {
                setFirstName("");
                setLastName("");
                setEmail("");
                setOriginalEmail("");
                setMobile("");
                setRole(defaultCreateRole || "auditor");
                setCustomRoleName("");
                setIsActive(true);
                setSendWelcomeEmail(true);
                setPassword("");
                setConfirmPassword("");
                setShowPassword(false);
                setShowConfirmPassword(false);
            }
            setEmailChangeOtp("");
            setOtpSentToEmail(null);
            setResendTimer(0);
            setError("");
        }
    }, [open, mode, initialData, isEditMode, isViewMode, defaultCreateRole]);

    const emailChangedInEdit =
        isEditMode &&
        email.trim().toLowerCase() !== (originalEmail || "").trim().toLowerCase();

    const handleSendEmailOtp = async () => {
        const targetUserId = initialData?.id ?? initialData?._id;
        if (targetUserId == null || Number.isNaN(Number(targetUserId))) {
            setError("Missing user id. Close the dialog and open Edit again.");
            return;
        }
        if (!email.trim()) {
            setError("Enter the new email address first");
            return;
        }
        setError("");
        setOtpSending(true);
        try {
            const res = await apiFetch(`/users/${Number(targetUserId)}/email-change/send-otp`, {
                method: "POST",
                body: JSON.stringify({ newEmail: email.trim() }),
            });
            const raw = await res.text();
            let data: Record<string, unknown> = {};
            if (raw) {
                try {
                    data = JSON.parse(raw) as Record<string, unknown>;
                } catch {
                    data = { error: raw.slice(0, 280) };
                }
            }
            if (!res.ok) {
                if (res.status === 429 && typeof data.retryAfterSeconds === "number") {
                    setResendTimer(data.retryAfterSeconds);
                }
                const parts = [data.error, data.detail, data.hint].filter(Boolean) as string[];
                const fallback =
                    res.status === 403
                        ? "You are not allowed to change this user’s email."
                        : `Request failed (${res.status}). Check that the API is running.`;
                throw new Error(parts.length ? parts.join(" — ") : fallback);
            }
            setOtpSentToEmail(email.trim().toLowerCase());
            setResendTimer(60);
            toast.success("Verification code sent to the new email address");
        } catch (e: any) {
            const msg = e.message || "Failed to send verification code";
            setError(msg);
            toast.error(msg);
        } finally {
            setOtpSending(false);
        }
    };

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

        if (password) {
            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }
            if (!PASSWORD_REGEX.test(password)) {
                setError(PASSWORD_ERROR_MESSAGE);
                return;
            }
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        if (emailChangedInEdit) {
            if (!emailChangeOtp.trim()) {
                setError("Enter the verification code sent to the new email address");
                return;
            }
        }

        const mobileDigits = normalizePhone10Digits(mobile);
        if (mode === "create") {
            if (!isTenDigitPhone(mobile)) {
                setError(PHONE_10_ERROR_MESSAGE);
                return;
            }
        } else if (mobile.trim() !== "" && !isTenDigitPhone(mobile)) {
            setError(PHONE_10_ERROR_MESSAGE);
            return;
        }

        const payload: any = {
            firstName,
            lastName,
            email,
            mobile: mode === "create" ? mobileDigits : mobile.trim() === "" ? "" : mobileDigits,
            sendWelcomeEmail,
        };

        if (canManageRoles) {
            payload.role = role;
            payload.customRoleName = role === "other" ? customRoleName : undefined;
            payload.isActive = isActive;
        }

        if (password) {
            payload.password = password;
        }

        if (emailChangedInEdit) {
            payload.emailChangeOtp = emailChangeOtp.trim();
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

    const isAuditeeUser =
        String(initialData?.role ?? "").toLowerCase() === "auditee" ||
        defaultCreateRole === "auditee";

    const getTitle = () => {
        if (isViewMode) return isAuditeeUser ? "Auditee Details" : "User Details";
        if (isEditMode) return isAuditeeUser ? "Edit Auditee" : "Edit User";
        if (defaultCreateRole === "auditee") return "Invite Auditee";
        return "Create New User";
    };

    const getIcon = () => {
        if (isViewMode) return <Eye className="h-6 w-6 text-primary" />;
        if (isEditMode) return <Edit2 className="h-6 w-6 text-primary" />;
        return <UserPlus className="h-6 w-6 text-primary" />;
    };

    const getSubmitLabel = () => {
        if (isViewMode) return "Close";
        if (isEditMode) return isAuditeeUser ? "Save changes" : "Update User";
        if (defaultCreateRole === "auditee") return "Send Invite";
        return "Create User";
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogContent
                id="tour-step-user-modal"
                hideOverlay={hideOverlay}
                className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
                onPointerDownOutside={hideCancel ? (e) => e.preventDefault() : undefined}
                onEscapeKeyDown={hideCancel ? (e) => e.preventDefault() : undefined}
            >
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {getIcon()}
                        {getTitle()}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {isViewMode
                            ? "View user profile and account details."
                            : isEditMode
                              ? "Update this user’s profile and access settings."
                              : "Create a new user account for your organization."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 py-4 space-y-6">
                    {(isEditMode || isViewMode) && canManageRoles && (
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
                                id="modal-first-name"
                                placeholder="First Name"
                                value={firstName}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setFirstName(e.target.value);
                                }}
                                disabled={isViewMode}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last-name">Last Name *</Label>
                            <Input
                                id="modal-last-name"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setLastName(e.target.value);
                                }}
                                disabled={isViewMode}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="modal-email"
                                type="email"
                                placeholder="Email address"
                                className="pl-9"
                                value={email}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    const v = e.target.value;
                                    setEmail(v);
                                    const norm = v.trim().toLowerCase();
                                    if (otpSentToEmail && norm !== otpSentToEmail) {
                                        setOtpSentToEmail(null);
                                        setEmailChangeOtp("");
                                    }
                                }}
                                disabled={isViewMode}
                            />
                        </div>
                    </div>

                    {isEditMode && !isViewMode && emailChangedInEdit && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-3 text-sm">
                            <p className="text-amber-900 font-medium">Verify the new email</p>
                            <p className="text-amber-800/90 text-xs leading-relaxed">
                                Send a code to the new address, then enter it below. The email cannot be updated until the code is verified on save.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-amber-300 bg-white"
                                disabled={otpSending || resendTimer > 0 || isSubmitting}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void handleSendEmailOtp();
                                }}
                            >
                                {otpSending
                                    ? "Sending…"
                                    : resendTimer > 0
                                      ? `Resend code in ${resendTimer}s`
                                      : "Send verification code"}
                            </Button>
                            <div className="space-y-1.5">
                                <Label htmlFor="modal-email-otp">Verification code</Label>
                                <Input
                                    id="modal-email-otp"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={8}
                                    placeholder="Enter code from email"
                                    value={emailChangeOtp}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setEmailChangeOtp(e.target.value.replace(/\s/g, ""));
                                    }}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile</Label>
                            <PhoneInputWithCountryCode
                                id="modal-mobile"
                                countryCode={mobileCountry}
                                onCountryCodeChange={setMobileCountry}
                                value={mobile}
                                onChange={setMobile}
                                disabled={isViewMode}
                                inputClassName="bg-background border-input focus:ring-ring"
                                selectClassName="h-10 bg-background border-input focus:ring-ring"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            {canManageRoles ? (
                                <Select value={role} onValueChange={setRole} disabled={isViewMode}>
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {USERS_PAGE_ROLE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="role"
                                    value={formatUserRoleLabel(role, customRoleName)}
                                    disabled
                                    className="capitalize bg-muted"
                                />
                            )}
                        </div>
                    </div>

                    {canManageRoles && role === "other" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label htmlFor="custom-role-name">Custom Role Name *</Label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="modal-custom-role-name"
                                    placeholder="Enter custom role name"
                                    className="pl-9"
                                    value={customRoleName}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setCustomRoleName(e.target.value);
                                    }}
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
                                Send welcome email with login credentials and verification code
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
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="modal-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        className="pl-9 pr-10"
                                        value={password}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            setPassword(e.target.value);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowPassword((v) => !v);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">
                                    Confirm Password *
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="modal-confirm-password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm Password"
                                        className="pl-9 pr-10"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            setConfirmPassword(e.target.value);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowConfirmPassword((v) => !v);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
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
                    {!hideCancel && (
                        <Button variant="outline" onClick={onClose}>
                            {isViewMode ? "Dismiss" : "Cancel"}
                        </Button>
                    )}
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
