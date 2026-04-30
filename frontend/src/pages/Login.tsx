import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white overflow-hidden font-inter">
      {/* Left side - Login Form */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="flex-1 flex items-center justify-center px-6 lg:px-20 py-12">
          <div className="w-full max-w-sm">
            <div className="mb-10 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-[#111827] mb-2 tracking-tight">Sign In</h1>
              <p className="text-[#6B7280]">Please enter your details to sign in.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Email Address</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-[#F9FAFB] border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#213847]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Password</Label>
                  <button type="button" className="text-xs font-semibold text-[#213847] hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-[#F9FAFB] border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder:text-[#9CA3AF] pr-12 focus:ring-1 focus:ring-[#213847]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v === true)}
                  className="border-[#D1D5DB] data-[state=checked]:bg-[#213847] data-[state=checked]:border-[#213847]"
                />
                <label htmlFor="remember" className="text-sm text-[#6B7280] font-medium cursor-pointer">
                  Remember me
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold bg-[#213847] text-white hover:bg-[#1A2D39] rounded-xl shadow-lg shadow-[#213847]/10 transition-all duration-200 active:scale-[0.98]"
              >
                Sign In
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Right side - Informational Panel */}
      <div className="hidden lg:flex w-[500px] flex-col justify-center items-center px-16 text-center bg-gradient-to-br from-[#213847] to-[#1A2D39] relative overflow-hidden rounded-tl-[40px] rounded-bl-[40px]">
        {/* Decorative elements - Flipped from Signup */}
        <div className="absolute -bottom-10 -right-10 h-64 w-64 bg-white/[0.08] rounded-full" />
        <div className="absolute top-20 left-20 h-6 w-6 bg-white/[0.1] rotate-45 rounded-sm" />

        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-4xl font-extrabold text-white mb-5 tracking-tight">Hello, Friend!</h2>
          <p className="text-base text-white/90 font-medium leading-relaxed mb-10 max-w-[280px]">
            Enter your personal details and start your journey with us
          </p>

          <Button
            variant="outline"
            onClick={() => navigate("/signup")}
            className="w-40 h-12 border-2 border-white bg-transparent text-white font-bold text-sm hover:bg-white hover:text-[#213847] rounded-full transition-all uppercase tracking-widest"
          >
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
}
