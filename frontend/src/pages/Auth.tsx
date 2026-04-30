import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "@/config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import gsap from "gsap";

export default function Auth() {
    const navigate = useNavigate();
    const location = useLocation();

    // Default to SignUp mode if the route is /signup, otherwise false (SignIn)
    const [isSignUp, setIsSignUp] = useState(location.pathname === "/signup");

    // Login States
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginRememberMe, setLoginRememberMe] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Signup States
    const [signupFirstName, setSignupFirstName] = useState("");
    const [signupLastName, setSignupLastName] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPhone, setSignupPhone] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

    // OTP Verification States
    const [showOtpStep, setShowOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [resendTimer, setResendTimer] = useState(0);
    const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const overlayContentRef = useRef<HTMLDivElement>(null);
    const signupPaneRef = useRef<HTMLDivElement>(null);
    const signinPaneRef = useRef<HTMLDivElement>(null);

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setShowOtpStep(false);
        setErrorMessage("");
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setTimeout(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearTimeout(interval);
    }, [resendTimer]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { duration: 1.0, ease: "power3.inOut" } });

            if (isSignUp) {
                // Sign Up Mode: Overlay moves LEFT -> RIGHT
                tl.to(overlayRef.current, { xPercent: 150 });
                // Form Crossing: Sign Up Form slides from the RIGHT towards the left
                tl.fromTo(signupPaneRef.current,
                    { xPercent: 100, opacity: 0 },
                    { xPercent: 0, opacity: 1, pointerEvents: "auto" }, 0
                );
                // Sign In Form slides out to the LEFT
                tl.to(signinPaneRef.current, { xPercent: -100, opacity: 0, pointerEvents: "none" }, 0);
            } else {
                // Sign In Mode: Overlay moves RIGHT -> LEFT
                tl.to(overlayRef.current, { xPercent: 0 });
                // Form Crossing: Sign In Form slides from the LEFT towards the right
                tl.fromTo(signinPaneRef.current,
                    { xPercent: -100, opacity: 0 },
                    { xPercent: 0, opacity: 1, pointerEvents: "auto" }, 0
                );
                // Sign Up Form slides out to the RIGHT
                tl.to(signupPaneRef.current, { xPercent: 100, opacity: 0, pointerEvents: "none" }, 0);
            }
        }, containerRef);

        return () => ctx.revert();
    }, [isSignUp]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!loginEmail || !loginPassword) {
            setErrorMessage("Please enter both email and password.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, password: loginPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Success! Save user to local storage and navigate to dashboard
            localStorage.setItem('user', JSON.stringify(data));
            navigate("/");

        } catch (error: any) {
            console.error('Login error:', error);
            setErrorMessage(error.message || "Login failed. Please check your credentials and connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Comprehensive field-level validation
        const errors: Record<string, string> = {};
        if (!signupFirstName.trim()) errors.firstName = "First name is required";
        if (!signupLastName.trim()) errors.lastName = "Last name is required";
        if (!signupEmail.trim()) {
            errors.email = "Email address is required";
        } else if (!/\S+@\S+\.\S+/.test(signupEmail)) {
            errors.email = "Please enter a valid email";
        }
        if (!signupPhone.trim()) errors.phone = "Phone number is required";
        if (!signupPassword) {
            errors.password = "Password is required";
        } else if (signupPassword.length < 8) {
            errors.password = "Password must be at least 8 characters";
        }
        if (!signupConfirmPassword) {
            errors.confirmPassword = "Please confirm your password";
        } else if (signupPassword !== signupConfirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        setSignupErrors(errors);

        // Stop if there are any validation errors
        if (Object.keys(errors).length > 0) {
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: signupEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                // If backend returns a 400 with 'Email already registered', this will be caught
                throw new Error(data.error || 'Failed to send OTP');
            }

            // Success! Show OTP step
            setShowOtpStep(true);
            setResendTimer(60);
        } catch (error: any) {
            console.error('Signup error:', error);
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                setErrorMessage("Unable to connect to the server. Please ensure the backend is running and accessible.");
            } else {
                setErrorMessage(error.message || "Failed to send OTP. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendOtp = async () => {
        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: signupEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend OTP');
            }

            setResendTimer(60);
        } catch (error: any) {
            console.error('Resend OTP error:', error);
            setErrorMessage(error.message || "Failed to resend OTP. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step 2: Verify OTP & Create Account
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp-and-signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: signupEmail,
                    otp: otpCode,
                    firstName: signupFirstName,
                    lastName: signupLastName,
                    mobile: signupPhone,
                    password: signupPassword,
                    role: 'auditor', // Default role
                    isActive: true
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to verify OTP');
            }

            // Success! Save user to local storage and navigate to dashboard
            localStorage.setItem('user', JSON.stringify(data));
            navigate("/");

        } catch (error: any) {
            console.error('OTP Verification error:', error);
            setErrorMessage(error.message || "Verification failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex font-inter">
            <div
                ref={containerRef}
                className="relative w-full h-screen overflow-hidden"
            >
                {/* BACKGROUND PANE: Sign Up Form (Revealed in Sign Up Mode, width 60%) */}
                <div
                    ref={signupPaneRef}
                    className="absolute top-0 left-0 w-full lg:w-[60%] h-full flex flex-col bg-white overflow-y-auto z-10"
                >
                    <div className="flex-1 flex items-center justify-center px-6 lg:px-20 py-10">
                        <div className="w-full max-w-sm">
                            <div className="mb-8 text-center lg:text-left">
                                <h1 className="text-2xl font-bold text-[#111827] mb-1 tracking-tight">Get started</h1>
                                <p className="text-sm text-[#6B7280]">
                                    {showOtpStep
                                        ? "Enter the 6-digit verification code sent to your email."
                                        : "Please enter your details to create an account."}
                                </p>
                            </div>

                            {errorMessage && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                                    {errorMessage}
                                </div>
                            )}

                            {!showOtpStep ? (
                                <form onSubmit={handleSignupSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-[#4B5563]">First Name</Label>
                                            <Input
                                                placeholder="John"
                                                value={signupFirstName}
                                                onChange={(e) => {
                                                    setSignupFirstName(e.target.value);
                                                    if (signupErrors.firstName) setSignupErrors(prev => ({ ...prev, firstName: "" }));
                                                }}
                                                className={`h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#00875B] ${signupErrors.firstName ? "border-red-500 focus:ring-red-500" : ""}`}
                                            />
                                            {signupErrors.firstName && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{signupErrors.firstName}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-[#4B5563]">Last Name</Label>
                                            <Input
                                                placeholder="Doe"
                                                value={signupLastName}
                                                onChange={(e) => {
                                                    setSignupLastName(e.target.value);
                                                    if (signupErrors.lastName) setSignupErrors(prev => ({ ...prev, lastName: "" }));
                                                }}
                                                className={`h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#00875B] ${signupErrors.lastName ? "border-red-500 focus:ring-red-500" : ""}`}
                                            />
                                            {signupErrors.lastName && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{signupErrors.lastName}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-[#4B5563]">Email Address</Label>
                                        <Input
                                            type="email"
                                            placeholder="john@example.com"
                                            value={signupEmail}
                                            onChange={(e) => {
                                                setSignupEmail(e.target.value);
                                                if (signupErrors.email) setSignupErrors(prev => ({ ...prev, email: "" }));
                                            }}
                                            className={`h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#00875B] ${signupErrors.email ? "border-red-500 focus:ring-red-500" : ""}`}
                                        />
                                        {signupErrors.email && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{signupErrors.email}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-[#4B5563]">Phone Number</Label>
                                        <Input
                                            type="tel"
                                            placeholder="+1 234 567 8900"
                                            value={signupPhone}
                                            onChange={(e) => {
                                                setSignupPhone(e.target.value);
                                                if (signupErrors.phone) setSignupErrors(prev => ({ ...prev, phone: "" }));
                                            }}
                                            className={`h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#00875B] ${signupErrors.phone ? "border-red-500 focus:ring-red-500" : ""}`}
                                        />
                                        {signupErrors.phone && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{signupErrors.phone}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-[#4B5563]">Password</Label>
                                        <div className="relative">
                                            <Input
                                                type={showSignupPassword ? "text" : "password"}
                                                placeholder="8+ characters"
                                                value={signupPassword}
                                                onChange={(e) => {
                                                    setSignupPassword(e.target.value);
                                                    if (signupErrors.password) setSignupErrors(prev => ({ ...prev, password: "" }));
                                                }}
                                                className={`h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] pr-10 focus:ring-1 focus:ring-[#00875B] ${signupErrors.password ? "border-red-500 focus:ring-red-500" : ""}`}
                                            />
                                            <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]">
                                                {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {signupErrors.password && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{signupErrors.password}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-[#4B5563]">Confirm Password</Label>
                                        <div className="relative">
                                            <Input
                                                type={showSignupConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm password"
                                                value={signupConfirmPassword}
                                                onChange={(e) => {
                                                    setSignupConfirmPassword(e.target.value);
                                                    if (signupErrors.confirmPassword) setSignupErrors(prev => ({ ...prev, confirmPassword: "" }));
                                                }}
                                                className={`h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] pr-10 focus:ring-1 focus:ring-[#00875B] ${signupErrors.confirmPassword ? "border-red-500 focus:ring-red-500" : ""}`}
                                            />
                                            <button type="button" onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]">
                                                {showSignupConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {signupErrors.confirmPassword && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{signupErrors.confirmPassword}</p>}
                                    </div>

                                    <Button disabled={isSubmitting} type="submit" className="w-full h-12 text-base font-bold bg-[#00875B] text-white hover:bg-[#006E4A] rounded-lg shadow-sm transition-all mt-4">
                                        {isSubmitting ? "Sending OTP..." : "Create Account"}
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-[#4B5563]">Verification Code</Label>
                                        <Input
                                            required
                                            type="text"
                                            maxLength={6}
                                            placeholder="123456"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                            className="h-14 text-center text-2xl tracking-[0.5em] font-mono bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#00875B]"
                                        />
                                        <p className="text-xs text-[#6B7280] mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
                                            <strong className="text-yellow-700">Note:</strong> If you don't see the email, please check your <strong className="text-yellow-700">junk or spam folder</strong>.
                                        </p>
                                    </div>

                                    <Button disabled={isSubmitting} type="submit" className="w-full h-12 text-base font-bold bg-[#00875B] text-white hover:bg-[#006E4A] rounded-lg shadow-sm transition-all mt-4">
                                        {isSubmitting ? "Verifying..." : "Verify & Create Account"}
                                    </Button>

                                    <div className="flex flex-col items-center gap-3 mt-4">
                                        <button
                                            type="button"
                                            disabled={resendTimer > 0 || isSubmitting}
                                            onClick={handleResendOtp}
                                            className="text-sm font-bold text-[#00875B] hover:text-[#006E4A] disabled:text-[#9CA3AF] disabled:hover:text-[#9CA3AF] transition-colors"
                                        >
                                            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowOtpStep(false)}
                                            className="text-sm text-[#6B7280] hover:text-[#00875B] underline"
                                        >
                                            Go back to edit details
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="mt-8 text-center">
                                <p className="text-sm text-[#6B7280]">Already have an account? <button onClick={toggleMode} className="text-[#00875B] font-bold hover:underline">Sign In</button></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACKGROUND PANE: Sign In Form (Revealed in Sign In Mode, width 60%) */}
                <div
                    ref={signinPaneRef}
                    className="absolute top-0 right-0 w-full lg:w-[60%] h-full flex flex-col bg-white overflow-y-auto z-10"
                >
                    <div className="flex-1 flex items-center justify-center px-6 lg:px-20 py-12">
                        <div className="w-full max-w-sm">
                            <div className="mb-10 text-center lg:text-left">
                                <h1 className="text-3xl font-bold text-[#111827] mb-2 tracking-tight">Sign In</h1>
                                <p className="text-[#6B7280]">Please enter your details to sign in.</p>
                            </div>

                            {errorMessage && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                                    {errorMessage}
                                </div>
                            )}

                            <form onSubmit={handleLoginSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Email Address</Label>
                                    <Input
                                        required
                                        type="email"
                                        placeholder="john@example.com"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        disabled={isSubmitting}
                                        className="h-12 bg-[#F9FAFB] border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#00875B]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Password</Label>
                                        <button type="button" className="text-xs font-semibold text-[#00875B] hover:underline">Forgot password?</button>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            required
                                            type={showLoginPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            disabled={isSubmitting}
                                            className="h-12 bg-[#F9FAFB] border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder:text-[#9CA3AF] pr-12 focus:ring-1 focus:ring-[#00875B]"
                                        />
                                        <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]">
                                            {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="remember-auth"
                                        checked={loginRememberMe}
                                        onCheckedChange={(v) => setLoginRememberMe(v === true)}
                                        disabled={isSubmitting}
                                        className="border-[#D1D5DB] data-[state=checked]:bg-[#00875B] data-[state=checked]:border-[#00875B]"
                                    />
                                    <label htmlFor="remember-auth" className="text-sm text-[#6B7280] font-medium cursor-pointer">Remember me</label>
                                </div>

                                <Button disabled={isSubmitting} type="submit" className="w-full h-12 text-base font-bold bg-[#00875B] text-white hover:bg-[#006E4A] rounded-xl shadow-lg shadow-[#00875B]/10 transition-all duration-200 active:scale-[0.98]">
                                    {isSubmitting ? "Signing In..." : "Sign In"}
                                </Button>
                            </form>

                            <div className="mt-8 text-center">
                                <p className="text-sm text-[#6B7280]">Don't have an account? <button onClick={toggleMode} className="text-[#00875B] font-bold hover:underline">Sign Up</button></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOREGROUND LAYER: Sliding Overlay */}
                <div
                    ref={overlayRef}
                    className="hidden lg:flex absolute top-0 left-0 w-[40%] h-full bg-gradient-to-br from-[#00875b] to-[#006E4A] z-[100] items-center justify-center text-white"
                    style={{
                        borderRadius: isSignUp ? "60px 0 0 60px" : "0 60px 60px 0",
                        transition: "border-radius 1s ease-in-out"
                    }}
                >
                    <div
                        ref={overlayContentRef}
                        className="w-full h-full flex flex-col items-center justify-center px-8 text-center relative overflow-hidden"
                    >
                        {/* Overlay Content Sign In Mode (Shows Sign Up button) */}
                        <div
                            className={`absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-500 ease-in-out ${!isSignUp ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full pointer-events-none'}`}
                        >
                            <h2 className="text-4xl font-extrabold mb-5 tracking-tight">Hello, Friend!</h2>
                            <p className="text-base text-white/90 font-medium leading-relaxed mb-10 max-w-[280px]">
                                Enter your personal details and start your journey with us
                            </p>
                            <Button
                                variant="outline"
                                onClick={toggleMode}
                                className="w-40 h-12 border-2 border-white bg-transparent text-white font-bold text-sm hover:bg-white hover:text-[#00875b] rounded-full transition-all uppercase tracking-widest"
                            >
                                Sign Up
                            </Button>
                        </div>

                        {/* Overlay Content Sign Up Mode (Shows Sign In button) */}
                        <div
                            className={`absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-500 ease-in-out ${isSignUp ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}
                        >
                            <h2 className="text-4xl font-extrabold mb-5 tracking-tight">Welcome Back!</h2>
                            <p className="text-base text-white/90 font-medium leading-relaxed mb-10 max-w-[280px]">
                                To keep connected with us please login with your personal info
                            </p>
                            <Button
                                variant="outline"
                                onClick={toggleMode}
                                className="w-40 h-12 border-2 border-white bg-transparent text-white font-bold text-sm hover:bg-white hover:text-[#00875b] rounded-full transition-all uppercase tracking-widest"
                            >
                                Sign In
                            </Button>
                        </div>

                        {/* Decorative Objects */}
                        <div className="absolute bottom-0 -left-1/4 h-32 w-1/2 bg-white/[0.1] rounded-t-full pointer-events-none" />
                        <div className="absolute top-10 right-10 h-6 w-6 bg-white/[0.1] rotate-45 rounded-sm pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
}
