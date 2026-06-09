import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Search, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditTemplates, AuditStandard } from "@/data/auditTemplates";
import { TourStepPopover } from "@/components/TourStepPopover";
import {
    AUDIT_TEMPLATES_LIST_MAX_STEP,
    AUDIT_TEMPLATES_TOUR_TEMPLATE_ID,
    AUDIT_TEMPLATES_TOUR_TEMPLATE_FALLBACK_ID,
    AUDIT_TEMPLATES_TOUR_TOTAL_STEPS,
    getAuditTemplatesTourStepConfig,
} from "@/lib/auditTemplatesOnboardingTour";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AuditTemplates = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const auditTemplatesTourActive = searchParams.get("auditTemplatesTour") === "true";
    const auditTemplatesTourStep = Math.min(
        AUDIT_TEMPLATES_TOUR_TOTAL_STEPS,
        Math.max(1, parseInt(searchParams.get("auditTemplatesStep") || "1", 10)),
    );
    const auditTemplatesTourStepConfig =
        getAuditTemplatesTourStepConfig(auditTemplatesTourStep);

    const setAuditTemplatesTourStep = (step: number) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("auditTemplatesTour", "true");
                next.set("auditTemplatesStep", String(step));
                return next;
            },
            { replace: true },
        );
    };

    const exitAuditTemplatesTour = () => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("auditTemplatesTour");
                next.delete("auditTemplatesStep");
                return next;
            },
            { replace: true },
        );
    };

    const tourTemplatesHighlight = (step: number) =>
        auditTemplatesTourActive && auditTemplatesTourStep === step
            ? "relative z-[60] ring-[4px] ring-emerald-500/80 ring-offset-2 rounded-xl"
            : "";

    const handleAuditTemplatesTourNext = () => {
        if (auditTemplatesTourStep === AUDIT_TEMPLATES_LIST_MAX_STEP) {
            if (!tourFeaturedTemplate?.id) {
                toast.error("No templates available to preview.");
                return;
            }
            navigate(
                `/audit-templates/${tourFeaturedTemplate.id}/execute?auditTemplatesTour=true&auditTemplatesStep=6&preview=true`,
            );
            return;
        }
        if (auditTemplatesTourStep >= AUDIT_TEMPLATES_TOUR_TOTAL_STEPS) {
            exitAuditTemplatesTour();
            navigate("/getting-started");
            toast.success("Audit workflow tour complete!");
            return;
        }
        setAuditTemplatesTourStep(auditTemplatesTourStep + 1);
    };

    const handleAuditTemplatesTourBack = () => {
        if (auditTemplatesTourStep <= 1) {
            exitAuditTemplatesTour();
            navigate("/getting-started");
            return;
        }
        setAuditTemplatesTourStep(auditTemplatesTourStep - 1);
    };

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStandard, setSelectedStandard] = useState<AuditStandard | "All">("All");

    const filteredTemplates = auditTemplates.filter(template => {
        const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStandard = selectedStandard === "All" || template.standard === selectedStandard;
        return matchesSearch && matchesStandard;
    });

    const tourFeaturedTemplate =
        auditTemplates.find((t) => t.id === AUDIT_TEMPLATES_TOUR_TEMPLATE_ID) ??
        auditTemplates.find((t) => t.id === AUDIT_TEMPLATES_TOUR_TEMPLATE_FALLBACK_ID) ??
        filteredTemplates[0] ??
        auditTemplates[0] ??
        null;

    return (
        <div className="flex-1 p-8 pt-6 bg-white min-h-screen relative">
            {auditTemplatesTourActive && (
                <div className="fixed inset-0 bg-slate-900/10 z-[40] pointer-events-none" />
            )}
            <div className="max-w-[1600px] mx-auto space-y-8">

                <div
                    id="tour-step-audit-templates-header"
                    className={cn(
                        "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                        tourTemplatesHighlight(2),
                    )}
                >
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Audit Templates</h2>
                        <p className="text-slate-500">Browse templates in view-only mode before starting an audit from Audit Programs.</p>
                    </div>
                </div>

                <div
                    id="tour-step-audit-templates-filters"
                    className={cn(
                        "flex flex-col md:flex-row gap-4 mb-6",
                        tourTemplatesHighlight(3),
                    )}
                >
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by template name or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full text-sm"
                        />
                    </div>
                    <div className="flex gap-4">
                        <Select value={selectedStandard} onValueChange={(val) => setSelectedStandard(val as AuditStandard | "All")}>
                            <SelectTrigger className="w-[180px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-[#213847]/40 text-sm">
                                <SelectValue placeholder="All Standards" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                <SelectItem value="All" className="rounded-lg cursor-pointer">All Standards</SelectItem>
                                <SelectItem value="ISO 9001" className="rounded-lg cursor-pointer">ISO 9001</SelectItem>
                                <SelectItem value="ISO 14001" className="rounded-lg cursor-pointer">ISO 14001</SelectItem>
                                <SelectItem value="ISO 45001" className="rounded-lg cursor-pointer">ISO 45001</SelectItem>
                                <SelectItem value="ISO 22000" className="rounded-lg cursor-pointer">ISO 22000</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div
                    id="tour-step-audit-templates-grid"
                    className={cn(
                        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
                        tourTemplatesHighlight(4),
                    )}
                >
                    {filteredTemplates.map((template) => {
                        const isTourFeatured =
                            tourFeaturedTemplate?.id === template.id;
                        return (
                            <Card
                                key={template.id}
                                className={cn(
                                    "hover:shadow-lg transition-shadow border-slate-200 flex flex-col rounded-2xl",
                                    auditTemplatesTourActive &&
                                        auditTemplatesTourStep === 4 &&
                                        isTourFeatured &&
                                        "ring-[4px] ring-emerald-500/80 ring-offset-2 z-[60] relative",
                                )}
                            >
                                <CardHeader>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-emerald-100 rounded-lg">
                                            <FileText className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                                            {template.standard}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl text-slate-900 line-clamp-1" title={template.title}>{template.title}</CardTitle>
                                    <CardDescription className="line-clamp-2 min-h-[40px]">{template.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {template.type === 'checklist' ? 'Checklist Based' : 'Section Based'}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {template.content.length} {template.type === 'checklist' ? 'Questions' : 'Sections'}
                                        </Badge>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-4 border-t border-slate-100">
                                    <Button
                                        id={
                                            isTourFeatured
                                                ? "tour-step-audit-templates-view"
                                                : undefined
                                        }
                                        className={cn(
                                            "w-full bg-slate-900 hover:bg-slate-800 text-white gap-2",
                                            isTourFeatured && tourTemplatesHighlight(5),
                                        )}
                                        onClick={() => {
                                            const path = auditTemplatesTourActive
                                                ? `/audit-templates/${template.id}/execute?auditTemplatesTour=true&auditTemplatesStep=6&preview=true`
                                                : `/audit-templates/${template.id}/execute?preview=true`;
                                            navigate(path);
                                        }}
                                    >
                                        <Eye className="w-4 h-4" /> View
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}

                    {filteredTemplates.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No templates found</h3>
                            <p className="text-slate-500 mt-2">Try adjusting your filters or search terms.</p>
                        </div>
                    )}
                </div>
            </div>

            {auditTemplatesTourActive &&
                auditTemplatesTourStep <= AUDIT_TEMPLATES_LIST_MAX_STEP &&
                auditTemplatesTourStepConfig && (
                <TourStepPopover
                    key={auditTemplatesTourStep}
                    targetId={auditTemplatesTourStepConfig.targetId}
                    step={auditTemplatesTourStep}
                    totalSteps={AUDIT_TEMPLATES_TOUR_TOTAL_STEPS}
                    title={auditTemplatesTourStepConfig.title}
                    description={auditTemplatesTourStepConfig.description}
                    position={auditTemplatesTourStepConfig.position}
                    onNext={handleAuditTemplatesTourNext}
                    onBack={handleAuditTemplatesTourBack}
                    onClose={() => {
                        exitAuditTemplatesTour();
                        navigate("/getting-started");
                    }}
                />
            )}
        </div>
    );
};

export default AuditTemplates;
