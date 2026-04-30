import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Building2 } from "lucide-react";

export default function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate("/");
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white overflow-hidden font-inter">
            {/* Left side - Informational Panel */}
            <div className="hidden lg:flex w-[500px] flex-col justify-center items-center px-16 text-center bg-gradient-to-br from-[#213847] to-[#1A2D39] relative overflow-hidden rounded-tr-[40px] rounded-br-[40px]">
                {/* Decorative elements - Half-circle and Diamond */}
                <div className="absolute -bottom-10 -left-10 h-64 w-64 bg-white/[0.08] rounded-full" />
                <div className="absolute top-20 right-20 h-6 w-6 bg-white/[0.1] rotate-45 rounded-sm" />

                <div className="relative z-10 flex flex-col items-center">
                    <h2 className="text-4xl font-extrabold text-white mb-5 tracking-tight">Welcome Back!</h2>
                    <p className="text-base text-white/90 font-medium leading-relaxed mb-10 max-w-[280px]">
                        To keep connected with us please login with your personal info
                    </p>

                    <Button
                        variant="outline"
                        onClick={() => navigate("/login")}
                        className="w-40 h-12 border-2 border-white bg-transparent text-white font-bold text-sm hover:bg-white hover:text-[#213847] rounded-full transition-all uppercase tracking-widest"
                    >
                        Sign In
                    </Button>
                </div>
            </div>

            {/* Right side - Signup Form */}
            <div className="flex-1 flex flex-col bg-white overflow-y-auto">
                <div className="flex-1 flex items-center justify-center px-6 lg:px-20 py-10">
                    <div className="w-full max-w-sm">
                        <div className="mb-8 text-center lg:text-left">
                            <h1 className="text-2xl font-bold text-[#111827] mb-1">Get started</h1>
                            <p className="text-sm text-[#6B7280]">Please enter your details to create an account.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* First / Last name row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-[#4B5563]">First Name</Label>
                                    <Input
                                        placeholder="John"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#213847]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-[#4B5563]">Last Name</Label>
                                    <Input
                                        placeholder="Doe"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#213847]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-[#4B5563]">Email Address</Label>
                                <Input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#213847]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-[#4B5563]">Phone Number</Label>
                                <Input
                                    type="tel"
                                    placeholder="+1 234 567 8900"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#213847]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-[#4B5563]">Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="8+ characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] pr-10 focus:ring-1 focus:ring-[#213847]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-[#4B5563]">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] pr-10 focus:ring-1 focus:ring-[#213847]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-bold bg-[#213847] text-white hover:bg-[#1A2D39] rounded-lg shadow-sm transition-all mt-4"
                            >
                                Create Account
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
