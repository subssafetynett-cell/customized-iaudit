import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Specific requirements: admin@iaudit.global / 123
        if (email === "admin@iaudit.global" && password === "123") {
            setTimeout(() => {
                localStorage.setItem("isSuperAdminAuthenticated", "true");
                toast.success("Super Admin authenticated successfully");
                navigate("/super-admin");
                setIsLoading(false);
            }, 800);
        } else {
            setTimeout(() => {
                setError("Invalid credentials. Please contact the system administrator.");
                setIsLoading(false);
            }, 500);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#213847] text-white shadow-xl mb-6">
                        <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">Super Admin</h1>
                    <p className="text-slate-500 mt-2">Secure access to global user management</p>
                </div>

                <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@iaudit.global"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-14 pl-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-2 focus:ring-[#213847]/20 border-none shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-14 pl-12 pr-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-2 focus:ring-[#213847]/20 border-none shadow-inner"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#213847] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-[#213847] hover:bg-[#1a2c38] text-white rounded-2xl font-bold text-lg shadow-lg shadow-[#213847]/20 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Verifying...</span>
                                </div>
                            ) : (
                                "Authenticate"
                            )}
                        </Button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate("/")}
                        className="text-slate-400 hover:text-[#213847] text-sm font-medium transition-colors inline-flex items-center gap-2"
                    >
                        Return to Main Application
                    </button>
                </div>
            </div>
        </div>
    );
}
