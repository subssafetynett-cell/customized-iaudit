import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MessageSquare, User, Mail, Upload, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config";

interface FeedbackFormData {
    name: string;
    email: string;
    feedback: string;
}

const Feedback = () => {
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<FeedbackFormData>();

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size should be less than 5MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImage(null);
    };

    const onSubmit = async (data: FeedbackFormData) => {
        setLoading(true);
        try {
            const payload = {
                ...data,
                image: image // base64 string
            };

            const response = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to send feedback");
            }

            toast.success("Thank you! Your feedback has been sent.");
            reset();
            removeImage();
        } catch (error) {
            console.error("Feedback error:", error);
            toast.error("Failed to send feedback. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feedback</h1>
                    <p className="text-slate-500">We value your thoughts to improve our services</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <Card className="md:col-span-12 overflow-hidden border-none shadow-xl bg-white/70 backdrop-blur-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 pointer-events-none" />
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-emerald-600" />
                                Share your thoughts
                            </CardTitle>
                            <CardDescription>
                                Fill out the form below to send us your suggestions, bugs, or experiences.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="name"
                                                placeholder="John Doe"
                                                className={cn("pl-10 bg-white/50 border-slate-200 focus:border-emerald-500 transition-all", errors.name && "border-red-500")}
                                                {...register("name", { required: "Name is required" })}
                                            />
                                        </div>
                                        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="john@example.com"
                                                className={cn("pl-10 bg-white/50 border-slate-200 focus:border-emerald-500 transition-all", errors.email && "border-red-500")}
                                                {...register("email", {
                                                    required: "Email is required",
                                                    pattern: {
                                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                        message: "Invalid email address"
                                                    }
                                                })}
                                            />
                                        </div>
                                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="feedback" className="text-sm font-medium">Your Feedback</Label>
                                    <Textarea
                                        id="feedback"
                                        placeholder="Share your thoughts, suggestions, or experiences here..."
                                        rows={5}
                                        className={cn("bg-white/50 border-slate-200 focus:border-emerald-500 transition-all resize-none", errors.feedback && "border-red-500")}
                                        {...register("feedback", { required: "Feedback is required" })}
                                    />
                                    {errors.feedback && <p className="text-xs text-red-500">{errors.feedback.message}</p>}
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Attach an Image (Optional)</Label>
                                    {!image ? (
                                        <label
                                            htmlFor="image-upload"
                                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer group"
                                        >
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <Upload className="h-8 w-8 text-slate-400 group-hover:text-emerald-500 transition-colors mb-2" />
                                                <p className="text-sm text-slate-500 group-hover:text-emerald-600 transition-colors">
                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                </p>
                                                <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">PNG, JPG or PDF (MAX. 5MB)</p>
                                            </div>
                                            <input
                                                id="image-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageChange}
                                            />
                                        </label>
                                    ) : (
                                        <div className="relative w-full aspect-video md:aspect-[21/9] rounded-xl overflow-hidden border border-slate-200 group">
                                            <img
                                                src={image}
                                                alt="Feedback attachment"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={removeImage}
                                                >
                                                    <X className="h-4 w-4" />
                                                    Remove Image
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4" />
                                                Submit Feedback
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Feedback;
