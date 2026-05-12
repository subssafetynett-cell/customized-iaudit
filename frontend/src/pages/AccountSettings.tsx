import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Check, CreditCard, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE } from "@/lib/validation";

export default function AccountSettings() {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: ""
    });

    useEffect(() => {
        // Load user from local storage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user from local storage");
            }
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            toast({
                title: "Error",
                description: "Passwords do not match.",
                variant: "destructive",
            });
            return;
        }

        if (!PASSWORD_REGEX.test(formData.newPassword)) {
            toast({
                title: "Error",
                description: PASSWORD_ERROR_MESSAGE,
                variant: "destructive",
            });
            return;
        }

        if (!user || (!user.id && !user._id)) {
            toast({
                title: "Error",
                description: "Cannot update profile: User ID is missing.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const userId = user.id || user._id;

            const response = await apiFetch(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    mobile: user.mobile,
                    role: user.role,
                    isActive: user.isActive,
                    password: formData.newPassword // Include new password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update account');
            }

            setFormData({
                newPassword: "",
                confirmPassword: ""
            });

            toast({
                title: "Success",
                description: "Password updated successfully.",
            });

        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBillingPortal = async () => {
        if (!user || (!user.id && !user._id)) return;
        setIsLoading(true);
        try {
            const response = await apiFetch(`/payments/portal`, {
                method: 'POST',
                body: JSON.stringify({ userId: user.id || user._id }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to open billing portal');
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: "You don't have an active subscription or Stripe account yet.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    if (!user) {
        return (
            <div className="flex-1 p-8 bg-white flex items-center justify-center min-h-[calc(100vh-5rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-[#213847]" />
            </div>
        );
    }

    return (
        <div className="h-full bg-white">
            <div className="max-w-7xl px-6 lg:px-8 py-8">
                <div className="max-w-3xl">

                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-[#213847]">Account Settings</h1>
                            <p className="text-sm text-[#475467] mt-1">Manage your account security and password</p>
                        </div>
                    </div>

                    {/* Password Form */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                        <form onSubmit={handleSave} className="p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[#213847]">Change Password</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword" className="text-sm font-semibold text-[#475467] flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-[#98A2B3]" />
                                        New Password
                                    </Label>
                                    <Input
                                        id="newPassword"
                                        name="newPassword"
                                        type="password"
                                        value={formData.newPassword}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter new password"
                                        className="h-11 bg-white border-slate-200 focus:border-[#213847] focus:ring-[#213847] text-[#101828]"
                                    />
                                </div>
                                <div className="mt-2 space-y-1 pl-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-1 w-1 rounded-full ${formData.newPassword.length >= 8 ? "bg-green-500" : "bg-slate-300"}`} />
                                        <p className={`text-[10px] ${formData.newPassword.length >= 8 ? "text-green-600 font-medium" : "text-slate-500"}`}>At least 8 characters</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-1 w-1 rounded-full ${/[A-Z]/.test(formData.newPassword) ? "bg-green-500" : "bg-slate-300"}`} />
                                        <p className={`text-[10px] ${/[A-Z]/.test(formData.newPassword) ? "text-green-600 font-medium" : "text-slate-500"}`}>One uppercase letter</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-1 w-1 rounded-full ${/\d/.test(formData.newPassword) ? "bg-green-500" : "bg-slate-300"}`} />
                                        <p className={`text-[10px] ${/\d/.test(formData.newPassword) ? "text-green-600 font-medium" : "text-slate-500"}`}>One number</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-1 w-1 rounded-full ${/[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\\/~^]/.test(formData.newPassword) ? "bg-green-500" : "bg-slate-300"}`} />
                                        <p className={`text-[10px] ${/[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\\/~^]/.test(formData.newPassword) ? "text-green-600 font-medium" : "text-slate-500"}`}>One special character</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-[#475467] flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-[#98A2B3]" />
                                        Confirm New Password
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Confirm new password"
                                        className="h-11 bg-white border-slate-200 focus:border-[#213847] focus:ring-[#213847] text-[#101828]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-8 mt-6 border-t border-slate-100">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="h-11 px-8 rounded-lg bg-[#213847] hover:bg-[#1a2d39] text-white font-medium shadow-sm transition-all"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    Save Password
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Subscription Section */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                        <div className="p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[#213847]">Subscription & Billing</h3>
                            </div>
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600">
                                    Manage your subscription plan, update payment methods, and download your invoices through our secure Stripe billing portal.
                                </p>
                                <Button
                                    onClick={handleBillingPortal}
                                    disabled={isLoading}
                                    variant="outline"
                                    className="h-11 px-6 rounded-lg border-[#213847] text-[#213847] hover:bg-slate-50 font-medium transition-all"
                                >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Manage Subscription
                                    <ExternalLink className="w-3 h-3 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
