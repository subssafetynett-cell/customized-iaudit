import { useState } from "react";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, UserPlus, MapPin } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PhoneInputWithCountryCode } from "@/components/PhoneInputWithCountryCode";
import { DEFAULT_PHONE_COUNTRY_CODE } from "@/lib/phoneCountries";
import {
    PASSWORD_REGEX,
    PASSWORD_ERROR_MESSAGE,
    isTenDigitPhone,
    normalizePhone10Digits,
    PHONE_10_ERROR_MESSAGE,
} from "@/lib/validation";
import { apiFetch } from "@/lib/api";

export type InviteAuditeeSiteOption = {
    id: string;
    name: string;
    companyName: string;
};

interface InviteAuditeeModalProps {
    open: boolean;
    onClose: () => void;
    sites: InviteAuditeeSiteOption[];
    onSuccess?: () => void;
}

export function InviteAuditeeModal({
    open,
    onClose,
    sites,
    onSuccess,
}: InviteAuditeeModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [mobile, setMobile] = useState("");
    const [mobileCountry, setMobileCountry] = useState(DEFAULT_PHONE_COUNTRY_CODE);
    const [siteId, setSiteId] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setMobile("");
        setMobileCountry(DEFAULT_PHONE_COUNTRY_CODE);
        setSiteId("");
        setError("");
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        setError("");
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !password.trim() || !siteId) {
            setError("Email, password, and site are required.");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setError("Please enter a valid email address.");
            return;
        }
        if (!isTenDigitPhone(mobile)) {
            setError(PHONE_10_ERROR_MESSAGE);
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (!PASSWORD_REGEX.test(password)) {
            setError(PASSWORD_ERROR_MESSAGE);
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await apiFetch("/users/invite-auditee", {
                method: "POST",
                body: JSON.stringify({
                    email: trimmedEmail,
                    password,
                    mobile: normalizePhone10Digits(mobile),
                    siteId: Number(siteId),
                    sendWelcomeEmail: true,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    (typeof data.error === "string" && data.error) ||
                        (typeof data.message === "string" && data.message) ||
                        "Failed to send invite",
                );
            }

            if (data.verificationEmailSent) {
                toast.success(
                    "Invite sent. The auditee will receive login credentials and a verification code by email.",
                    { duration: 8000 },
                );
            } else {
                toast.success(
                    "Auditee account created, but the invite email could not be sent. Ask your administrator to resend verification.",
                    { duration: 8000 },
                );
            }
            resetForm();
            onSuccess?.();
            onClose();
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to invite auditee. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <UserPlus className="h-6 w-6 text-primary" />
                        Invite Auditee
                    </DialogTitle>
                    <DialogDescription>
                        Create an auditee account, assign them to a site, and email their login details.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="invite-email">Email *</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="invite-email"
                                type="email"
                                className="pl-10"
                                placeholder="auditee@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Phone number *</Label>
                        <PhoneInputWithCountryCode
                            countryCode={mobileCountry}
                            onCountryCodeChange={setMobileCountry}
                            value={mobile}
                            onChange={setMobile}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="invite-password">Password *</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="invite-password"
                                type={showPassword ? "text" : "password"}
                                className="pl-10 pr-10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="invite-confirm-password">Confirm password *</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="invite-confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                className="pl-10 pr-10"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Site *</Label>
                        <Select value={siteId} onValueChange={setSiteId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a site" />
                            </SelectTrigger>
                            <SelectContent>
                                {sites.length === 0 ? (
                                    <SelectItem value="__none" disabled>
                                        No sites available — add a site under Companies first
                                    </SelectItem>
                                ) : (
                                    sites.map((site) => (
                                        <SelectItem key={site.id} value={site.id}>
                                            <span className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                {site.name}
                                                <span className="text-slate-400 text-xs">
                                                    ({site.companyName})
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {error ? (
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    ) : null}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={isSubmitting || sites.length === 0}
                        className="bg-[#1e855e] hover:bg-[#166534]"
                    >
                        {isSubmitting ? "Sending…" : "Send invite email"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
