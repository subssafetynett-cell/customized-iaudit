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
import { FileText } from "lucide-react";

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
    /** Optional second step actions (e.g. download formats). */
    footerExtra?: React.ReactNode;
};

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
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold leading-snug">
                                            {getAuditPlanTemplateLabel(mod)}
                                        </p>
                                        {mod.module ? (
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {mod.module} checklist
                                            </p>
                                        ) : null}
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
