import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Loader2, Pencil, X, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config";

export default function ProfileSettings() {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        mobile: ""
    });

    useEffect(() => {
        // Load user from local storage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setFormData({
                    firstName: parsedUser.firstName || "",
                    lastName: parsedUser.lastName || "",
                    email: parsedUser.email || "",
                    mobile: parsedUser.mobile || ""
                });
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

    const handleCancel = () => {
        // Reset form to current user details
        setFormData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            mobile: user.mobile || ""
        });
        setIsEditing(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

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

            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    mobile: formData.mobile,
                    role: user.role, // Preserve existing role
                    isActive: user.isActive // Preserve existing status
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            // Update local storage
            const updatedUser = { ...user, ...data };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setIsEditing(false);

            toast({
                title: "Success",
                description: "Profile updated successfully.",
            });

            window.dispatchEvent(new Event('user-profile-updated'));

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

    if (!user) {
        return (
            <div className="flex-1 p-8 bg-white flex items-center justify-center min-h-[calc(100vh-5rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-[#213847]" />
            </div>
        );
    }

    const initials = `${formData.firstName?.charAt(0) || ""}${formData.lastName?.charAt(0) || ""}`.toUpperCase();

    return (
        <div className="h-full bg-white">
            <div className="max-w-7xl px-6 lg:px-8 py-8">
                <div className="max-w-3xl">

                    {/* Header Section Matches Users Page Style */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-[#213847]">Profile Settings</h1>
                            <p className="text-sm text-[#475467] mt-1">Manage your account details and personal information</p>
                        </div>
                        {!isEditing && (
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="bg-[#213847] hover:bg-[#1a2d39] text-white shadow-sm rounded-lg"
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Profile
                            </Button>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Top Banner section (Dark Blue like table headers or primary cards) */}
                        <div className="bg-[#213847] px-8 py-10 flex flex-col items-center relative">
                            <div className="h-28 w-28 rounded-full bg-white/10 flex items-center justify-center border-4 border-white shadow-lg mb-4 text-white">
                                <span className="text-4xl font-bold tracking-wider">{initials}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white">{formData.firstName} {formData.lastName}</h2>
                            <p className="text-sm text-slate-300 mt-1">{user.role || "User"}</p>
                        </div>

                        {/* Details Section */}
                        <form onSubmit={handleSave} className="p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[#213847]">Personal Information</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

                                <div className="space-y-2">
                                    <Label htmlFor="firstName" className="text-sm font-semibold text-[#475467] flex items-center gap-2">
                                        <User className="w-4 h-4 text-[#98A2B3]" />
                                        First Name
                                    </Label>
                                    {isEditing ? (
                                        <Input
                                            id="firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            required
                                            className="h-11 bg-white border-slate-200 focus:border-[#213847] focus:ring-[#213847] text-[#101828]"
                                        />
                                    ) : (
                                        <p className="text-[#101828] font-medium h-11 flex items-center px-3 bg-slate-50 border border-transparent rounded-md">{formData.firstName}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="lastName" className="text-sm font-semibold text-[#475467] flex items-center gap-2">
                                        <User className="w-4 h-4 text-[#98A2B3]" />
                                        Last Name
                                    </Label>
                                    {isEditing ? (
                                        <Input
                                            id="lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            required
                                            className="h-11 bg-white border-slate-200 focus:border-[#213847] focus:ring-[#213847] text-[#101828]"
                                        />
                                    ) : (
                                        <p className="text-[#101828] font-medium h-11 flex items-center px-3 bg-slate-50 border border-transparent rounded-md">{formData.lastName}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-semibold text-[#475467] flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-[#98A2B3]" />
                                        Email Address
                                    </Label>
                                    {isEditing ? (
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            disabled
                                            title="Email address cannot be changed"
                                            className="h-11 bg-slate-50 border-slate-200 text-[#475467] cursor-not-allowed opacity-70"
                                        />
                                    ) : (
                                        <p className="text-[#101828] font-medium h-11 flex items-center px-3 bg-slate-50 border border-transparent rounded-md">{formData.email}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mobile" className="text-sm font-semibold text-[#475467] flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-[#98A2B3]" />
                                        Phone Number
                                    </Label>
                                    {isEditing ? (
                                        <Input
                                            id="mobile"
                                            name="mobile"
                                            value={formData.mobile}
                                            onChange={handleInputChange}
                                            placeholder="+1 (555) 000-0000"
                                            className="h-11 bg-white border-slate-200 focus:border-[#213847] focus:ring-[#213847] text-[#101828]"
                                        />
                                    ) : (
                                        <p className="text-[#101828] font-medium h-11 flex items-center px-3 bg-slate-50 border border-transparent rounded-md">{formData.mobile || "Not provided"}</p>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex justify-end gap-3 pt-8 mt-6 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={isLoading}
                                        className="h-11 px-6 rounded-lg font-medium"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
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
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
