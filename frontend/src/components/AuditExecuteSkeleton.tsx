import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
            aria-hidden
        />
    );
}

/** Instant shell for Perform Audit while plan/auditData loads. Matches page layout structure. */
export function AuditExecuteSkeleton() {
    return (
        <div className="flex-1 p-8 pt-6 bg-transparent min-h-screen relative">
            <div className="max-w-6xl mx-auto space-y-6 pb-24">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            disabled
                            className="gap-2 pl-0 hover:bg-transparent text-slate-400"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Audit List
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <Card className="shadow-sm border-slate-100 p-6">
                            <Bone className="h-5 w-40 mb-5" />
                            <div className="space-y-4">
                                <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                                    <Bone className="h-4 w-20" />
                                    <Bone className="h-4 w-2/3" />
                                </div>
                                <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                                    <Bone className="h-4 w-16" />
                                    <Bone className="h-4 w-1/2" />
                                </div>
                                <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                                    <Bone className="h-4 w-24" />
                                    <Bone className="h-4 w-40" />
                                </div>
                            </div>
                        </Card>
                    </div>
                    <Card className="shadow-sm border-slate-100 p-6 h-fit">
                        <Bone className="h-5 w-28 mb-4" />
                        <Bone className="h-3 w-full mb-2" />
                        <Bone className="h-3 w-full mb-4" />
                        <Bone className="h-8 w-full rounded-full" />
                        <div className="mt-4 space-y-2">
                            <Bone className="h-4 w-full" />
                            <Bone className="h-4 w-5/6" />
                            <Bone className="h-4 w-2/3" />
                        </div>
                    </Card>
                </div>

                <Card className="shadow-sm border-slate-100 p-4">
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Bone key={i} className="h-9 w-28 rounded-full" />
                        ))}
                    </div>
                </Card>

                <Card className="shadow-sm border-slate-100 overflow-hidden">
                    <div className="bg-slate-800 px-4 py-3 flex gap-4">
                        <Bone className="h-4 w-12 bg-slate-600" />
                        <Bone className="h-4 w-40 bg-slate-600" />
                        <Bone className="h-4 w-24 bg-slate-600" />
                        <Bone className="h-4 w-28 bg-slate-600" />
                    </div>
                    <div className="divide-y divide-slate-100">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="p-4 grid grid-cols-12 gap-3 items-start">
                                <Bone className="col-span-1 h-4 w-6" />
                                <div className="col-span-5 space-y-2">
                                    <Bone className="h-4 w-full" />
                                    <Bone className="h-3 w-4/5" />
                                </div>
                                <Bone className="col-span-2 h-8 w-full" />
                                <Bone className="col-span-2 h-16 w-full" />
                                <Bone className="col-span-2 h-8 w-full" />
                            </div>
                        ))}
                    </div>
                </Card>

                <div className="flex justify-end gap-3 sticky bottom-4">
                    <Bone className="h-11 w-36 rounded-xl" />
                    <Bone className="h-11 w-44 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
