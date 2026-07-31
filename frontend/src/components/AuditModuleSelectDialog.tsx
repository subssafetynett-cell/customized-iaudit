import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    getAuditPlanTemplateLabel,
    type AuditTemplate,
} from "@/data/auditTemplates";
import { FileText, Loader2 } from "lucide-react";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    modules: AuditTemplate[];
    selectedModuleId: string | null;
    onSelectModule: (moduleId: string) => void;
    confirmLabel: string;
    onConfirm: () => void;
    /** moduleId → 0–100 completion. */
    progressByModuleId?: Record<string, number>;
    /** True while full plan/auditData is loading for accurate %. */
    progressLoading?: boolean;
    /** Optional second step actions (e.g. download formats). */
    footerExtra?: React.ReactNode;
};

function progressTone(percent: number): string {
    if (percent >= 100) return "text-emerald-700 bg-emerald-100 border-emerald-200";
    if (percent > 0) return "text-amber-800 bg-amber-50 border-amber-200";
    return "text-slate-600 bg-slate-100 border-slate-200";
}

/**
 * Shared picker when an audit plan has multiple assigned checklists/modules.
 */
export function AuditModuleSelectDialog({
    open,
    onOpenChange,
    title,
    description,
    modules,
    selectedModuleId,
    onSelectModule,
    confirmLabel,
    onConfirm,
    progressByModuleId = {},
    progressLoading = false,
    footerExtra,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-2xl border-slate-200 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-800">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto py-1">
                    {modules.map((mod) => {
                        const selected = selectedModuleId === mod.id;
                        const percentRaw = progressByModuleId[mod.id];
                        const percent =
                            typeof percentRaw === "number" && Number.isFinite(percentRaw)
                                ? Math.min(100, Math.max(0, Math.round(percentRaw)))
                                : 0;
                        return (
                            <button
                                key={mod.id}
                                type="button"
                                onClick={() => onSelectModule(mod.id)}
                                className={cn(
                                    "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                                    selected
                                        ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm ring-1 ring-emerald-200"
                                        : "border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40",
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <FileText
                                        className={cn(
                                            "mt-0.5 h-4 w-4 shrink-0",
                                            selected ? "text-emerald-600" : "text-slate-400",
                                        )}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-bold leading-snug">
                                                {getAuditPlanTemplateLabel(mod)}
                                            </p>
                                            <span
                                                className={cn(
                                                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums",
                                                    progressLoading
                                                        ? "text-slate-500 bg-slate-50 border-slate-200"
                                                        : progressTone(percent),
                                                )}
                                            >
                                                {progressLoading ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        …
                                                    </span>
                                                ) : (
                                                    `${percent}%`
                                                )}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {mod.module ? `${mod.module} checklist` : "Checklist"}
                                            {!progressLoading
                                                ? percent >= 100
                                                    ? " · Completed"
                                                    : percent > 0
                                                      ? " · In progress"
                                                      : " · Not started"
                                                : ""}
                                        </p>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    percent >= 100
                                                        ? "bg-emerald-500"
                                                        : percent > 0
                                                          ? "bg-amber-500"
                                                          : "bg-slate-300",
                                                )}
                                                style={{
                                                    width: progressLoading
                                                        ? "0%"
                                                        : `${percent}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
                    {footerExtra}
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl font-semibold"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={!selectedModuleId}
                        className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
