import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { API_BASE_URL } from "@/config";
import { TopNav } from "@/components/TopNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Calendar, ClipboardCheck, Sparkles, ArrowRight, LayoutDashboard,
    Globe, LayoutGrid, List, MoreVertical, FileText, Trash2, Download, Eye, Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, ImageRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import logoImg from "@/assets/logo.png";
import { auditTemplates } from "@/data/auditTemplates";
import { CLAUSE_MATRIX, ClauseMatrixRow } from "@/data/clauseMapping";

interface Clause {
    id: string;
    name: string;
    isHeading?: boolean;
    standard?: string;
}

// CLAUSES array removed in favor of imported CLAUSE_MATRIX

const AuditProgramPage = () => {
    const [sites, setSites] = useState<any[]>([]);
    const [auditPrograms, setAuditPrograms] = useState<any[]>([]);
    const [auditPlans, setAuditPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false); // Added for download state
    const [viewMode, setViewMode] = useState<"card" | "list">("card");
    const [activeSiteId, setActiveSiteId] = useState<string>("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [showOnboardingGuide, setShowOnboardingGuide] = useState(searchParams.get("onboarding") === "true");
    const [isFinishing, setIsFinishing] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const [sitesRes, programsRes, plansRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/sites?userId=${user.id}`),
                    fetch(`${API_BASE_URL}/api/audit-programs?userId=${user.id}&full=true`),
                    fetch(`${API_BASE_URL}/api/audit-plans?userId=${user.id}`)
                ]);
                const sitesData = await sitesRes.json();
                const programsData = await programsRes.json();
                const plansData = await plansRes.json();

                const validSites = Array.isArray(sitesData) ? sitesData : [];
                const validPrograms = Array.isArray(programsData) ? programsData : [];
                const validPlans = Array.isArray(plansData) ? plansData : [];

                setSites(validSites);
                setAuditPrograms(validPrograms);
                setAuditPlans(validPlans);

                // Set first site as default if activeSiteId is not set
                if (validSites.length > 0) {
                    setActiveSiteId(validSites[0].id.toString());
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const calculatePeriods = (frequency: string, duration: number) => {
        const count = frequency === "Monthly" ? duration * 12 :
            frequency === "Quarterly" ? duration * 4 :
                frequency === "Bi-annually" ? duration * 2 :
                    duration;

        const result = [];
        const currentDate = new Date(2026, 0, 1); // Start in January 2026

        for (let i = 0; i < count; i++) {
            const monthLabel = currentDate.toLocaleString('default', { month: 'short' }).toUpperCase();
            const yearLabel = currentDate.getFullYear().toString();
            result.push(`${monthLabel} ${yearLabel}`);

            if (frequency === "Monthly") currentDate.setMonth(currentDate.getMonth() + 1);
            else if (frequency === "Quarterly") currentDate.setMonth(currentDate.getMonth() + 3);
            else if (frequency === "Bi-annually") currentDate.setMonth(currentDate.getMonth() + 6);
            else currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
        return result;
    };

    const getAuditExecutions = (program: any) => {
        const programPeriods = calculatePeriods(program.frequency, program.duration);
        const executions: any[] = [];
        const isoStandard = program.isoStandard || "";
        const is9001 = isoStandard.includes("9001");
        const is14001 = isoStandard.includes("14001");
        const is45001 = isoStandard.includes("45001");

        programPeriods.forEach((periodLabel, colIndex) => {
            const selectedClauses: Clause[] = [];
            CLAUSE_MATRIX.forEach((matrixRow, rowIndex) => {
                if (program.scheduleData?.[`${rowIndex}-${colIndex}`]) {
                    // Check each potential standard column
                    const stds = [
                        { key: 'iso9001', label: '9001', active: is9001 },
                        { key: 'iso14001', label: '14001', active: is14001 },
                        { key: 'iso45001', label: '45001', active: is45001 }
                    ];

                    stds.forEach(std => {
                        if (std.active) {
                            const clauseName = (matrixRow as any)[std.key];
                            if (clauseName && clauseName !== "Corresponding Clause does not exist") {
                                selectedClauses.push({
                                    id: `${matrixRow.id}-${std.label}`,
                                    name: clauseName,
                                    isHeading: matrixRow.isHeading,
                                    standard: std.label
                                });
                            }
                        }
                    });
                }
            });

            // If clauses were selected, add them
            if (selectedClauses.length > 0) {
                const executionId = `${program.name} - ${periodLabel}`;
                executions.push({
                    id: executionId,
                    programId: program.id,
                    title: executionId,
                    period: periodLabel,
                    clauseCount: selectedClauses.length,
                    clauses: selectedClauses,
                    site: sites.find(s => s.id === program.siteId)
                });
            } else {
                // FALLBACK: If no clauses selected for this SPECIFIC period but it exists in the cycle,
                // we still create a card for it so the user sees every month.
                // We leave the clauses empty instead of populating it with all clauses.
                const executionId = `${program.name} - ${periodLabel}`;
                executions.push({
                    id: executionId,
                    programId: program.id,
                    title: executionId,
                    period: periodLabel,
                    clauseCount: 0,
                    clauses: [],
                    site: sites.find(s => s.id === program.siteId)
                });
            }
        });

        return executions;
    };

    const hasPlan = (programId: number, executionId: string) => {
        return (auditPlans || []).some(p => p.auditProgramId === programId && p.executionId === executionId);
    };

    const handleDeletePlan = async (planId: number) => {
        if (!confirm("Are you sure you want to delete this audit plan?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/audit-plans/${planId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setAuditPlans(prev => prev.filter(p => p.id !== planId));
                toast.success("Audit plan deleted successfully");
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete audit plan");
        }
    };

    const handleDownloadPDF = async (planStub: any, executionTitle: string, programStub?: any) => {
        setDownloading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/audit-plans/${planStub.id}`);
            if (!res.ok) throw new Error("Failed to fetch full plan details");
            const plan = await res.json();

            const doc = new jsPDF();
            const template = (auditTemplates || []).find(t => t.id === plan.templateId);
            const fileName = `Audit_Plan_${executionTitle.replace(/[^a-z0-9]/gi, '_')}`;
            const MARGIN = 20;
            const CONTENT_WIDTH = 210 - (2 * MARGIN);

            // --- Logo - improved transparency handling ---
            try {
                const response = await fetch("/iAudit Global-01.png");
                const blob = await response.blob();
                const base64Compressed = await new Promise<string>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const MAX = 120;
                        const canvas = document.createElement("canvas");
                        let { width, height } = img;
                        if (width > MAX || height > MAX) {
                            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
                            else { width = Math.round(width * MAX / height); height = MAX; }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d")!;
                        ctx.clearRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL("image/png"));
                    };
                    img.onerror = reject;
                    img.src = URL.createObjectURL(blob);
                });
                doc.addImage(base64Compressed, 'PNG', MARGIN, 10, 25, 25, undefined, 'FAST');
            } catch (e) {
                console.warn("Logo could not be loaded for PDF", e);
            }

            // --- Header banner ---
            doc.setFillColor(33, 56, 71);
            doc.rect(0, 40, 210, 15, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('AUDIT PLAN REPORT', MARGIN, 50);
            doc.setFont('helvetica', 'normal');

            // --- Meta Info ---
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            let y = 65;
            const addRow = (label: string, value: string) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label + ':', MARGIN, y);
                doc.setFont('helvetica', 'normal');
                const splitVal = doc.splitTextToSize(value || 'N/A', CONTENT_WIDTH - 55);
                doc.text(splitVal, MARGIN + 55, y);
                y += (splitVal.length * 6);
            };

            const addTwoLineField = (label: string, value: string) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label + ':', MARGIN, y);
                y += 6;
                doc.setFont('helvetica', 'normal');
                const lines = doc.splitTextToSize(value || 'N/A', CONTENT_WIDTH);
                doc.text(lines, MARGIN, y);
                y += (lines.length * 5) + 4;
            };

            const standardsRaw = programStub?.isoStandard || plan.isoStandard || "";
            const standardsText = standardsRaw ? standardsRaw.split(", ").join("  |  ") : "N/A";

            addRow('Execution', executionTitle);
            addRow('Audit Name', plan.auditName || plan.auditType);
            addRow('Template', template?.title || plan.templateId);
            addRow('ISO Standards', standardsText);
            addRow('Date', plan.date ? new Date(plan.date).toLocaleDateString() : 'TBD');
            addRow('Location', plan.location);
            addRow('Lead Auditor', plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : '-');
            addRow('Criteria', plan.criteria);

            y += 4;
            addTwoLineField('Scope', plan.scope);
            addTwoLineField('Objective', plan.objective);

            y += 4;

            // --- Itinerary ---
            const itinerary = plan.itinerary ? (typeof plan.itinerary === 'string' ? JSON.parse(plan.itinerary) : plan.itinerary) : [];
            if (Array.isArray(itinerary) && itinerary.length > 0) {
                if (y > 250) { doc.addPage(); y = MARGIN; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(33, 56, 71);
                doc.text('Audit Itinerary', MARGIN, y); y += 6;
                autoTable(doc, {
                    startY: y,
                    head: [['Time', 'Activity', 'Auditee / Dept']],
                    body: itinerary.map((item: any) => [`${item.startTime || ''} - ${item.endTime || ''}`, item.activity || '', item.notes || item.auditee || ' ']),
                    headStyles: { fillColor: [33, 56, 71], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    margin: { left: MARGIN, right: MARGIN },
                    theme: 'grid'
                });
                y = (doc as any).lastAutoTable.finalY + 10;
            }

            // --- Scheduled Clauses ---
            const execClauses = getAuditExecutions(programStub || plan.auditProgram).find(e => e.id === executionTitle)?.clauses || [];
            if (execClauses.length > 0) {
                if (y > 250) { doc.addPage(); y = MARGIN; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(33, 56, 71);
                doc.text('Scheduled Clauses', MARGIN, y); y += 6;
                execClauses.forEach((clause: any) => {
                    if (y > 280) { doc.addPage(); y = MARGIN; }
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
                    const clauseText = clause.standard ? `[${clause.standard}] ${clause.name}` : clause.name;
                    const splitClause = doc.splitTextToSize(`• ${clauseText}`, CONTENT_WIDTH);
                    doc.text(splitClause, MARGIN, y);
                    y += splitClause.length * 5 + 2;
                });
            }

            doc.save(`${fileName}.pdf`);
            toast.success("PDF Downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadDocx = async (planStub: any, executionTitle: string, programStub?: any) => {
        setDownloading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/audit-plans/${planStub.id}`);
            if (!res.ok) throw new Error("Failed to fetch full plan details");
            const plan = await res.json();

            const template = (auditTemplates || []).find(t => t.id === plan.templateId);
            const fileName = `Audit_Plan_${executionTitle.replace(/[^a-z0-9]/gi, '_')}`;

            // Fetch logo for DOCX
            let logoBuffer: ArrayBuffer | null = null;
            try {
                const response = await fetch('/iAudit Global-01.png');
                const blob = await response.blob();
                logoBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const MAX = 120;
                        const canvas = document.createElement("canvas");
                        let { width, height } = img;
                        if (width > MAX || height > MAX) {
                            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
                            else { width = Math.round(width * MAX / height); height = MAX; }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d")!;
                        ctx.clearRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob((cb) => {
                            if (cb) cb.arrayBuffer().then(resolve).catch(reject);
                            else reject(new Error("Canvas toBlob failed"));
                        }, "image/png");
                    };
                    img.onerror = reject;
                    img.src = URL.createObjectURL(blob);
                });
            } catch (e) {
                console.warn("Logo failed for DOCX", e);
            }

            const primaryColor = '213847';
            const children: any[] = [];
            const MARGIN_TWIPS = 1440; // 1 inch

            if (logoBuffer) {
                children.push(new Paragraph({
                    children: [new ImageRun({ data: logoBuffer, transformation: { width: 80, height: 60 } })],
                    spacing: { after: 200 }
                }));
            }

            const heading = (text: string) => new Paragraph({
                children: [new TextRun({ text, bold: true, size: 28, color: primaryColor })],
                spacing: { before: 400, after: 200 }
            });

            const kv = (label: string, value: string) => new Paragraph({
                children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value || 'N/A')],
                spacing: { after: 120 }
            });

            const kvTwoLine = (label: string, value: string) => [
                new Paragraph({
                    children: [new TextRun({ text: `${label}:`, bold: true })],
                    spacing: { before: 200 }
                }),
                new Paragraph({
                    children: [new TextRun(value || 'N/A')],
                    spacing: { after: 200 }
                })
            ];

            children.push(
                new Paragraph({
                    children: [new TextRun({ text: 'AUDIT PLAN REPORT', bold: true, size: 40, color: primaryColor })],
                    spacing: { after: 400 }
                }),
                kv('Execution', executionTitle),
                kv('Audit Name', plan.auditName || plan.auditType),
                kv('Date', plan.date ? new Date(plan.date).toLocaleDateString() : 'TBD'),
                kv('Location', plan.location),
                kv('Lead Auditor', plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : '-'),
                ...kvTwoLine('Scope', plan.scope),
                ...kvTwoLine('Objective', plan.objective),
                kv('Criteria', plan.criteria),
            );

            // Itinerary
            const itinerary = plan.itinerary ? (typeof plan.itinerary === 'string' ? JSON.parse(plan.itinerary) : plan.itinerary) : [];
            if (Array.isArray(itinerary) && itinerary.length > 0) {
                children.push(heading('Audit Itinerary'));
                children.push(new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            children: ['Time', 'Activity', 'Auditee / Dept'].map(h => new DocxTableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'ffffff' })] })],
                                shading: { fill: primaryColor }
                            }))
                        }),
                        ...itinerary.map((item: any) => new DocxTableRow({
                            children: [`${item.startTime || ''} - ${item.endTime || ''}`, item.activity || '', item.notes || item.auditee || ''].map(v => new DocxTableCell({
                                children: [new Paragraph(v)]
                            }))
                        }))
                    ],
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                    }
                }));
            }

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            margin: {
                                top: MARGIN_TWIPS,
                                right: MARGIN_TWIPS,
                                bottom: MARGIN_TWIPS,
                                left: MARGIN_TWIPS,
                            },
                        },
                    },
                    children
                }]
            });
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${fileName}.docx`);
            toast.success("Word Document Downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate Word document");
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse text-sm">Synchronizing audit data...</p>
            </div>
        </div>
    );

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 min-h-screen bg-white">
            <div className="w-full max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Onboarding Guide Step 6 */}
                {showOnboardingGuide && (
                    <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Sparkles className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">6</div>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Final Step</Badge>
                            </div>
                            <h2 className="text-3xl font-bold mb-4 tracking-tight">Generate Your Multi-Year Audit Program</h2>
                            <p className="text-slate-400 text-lg mb-8 max-w-2xl leading-relaxed">
                                You've set up your company, sites, and users. Now, view your automated multi-year audit schedule. 
                                Click "Finish Onboarding" to unlock your dashboard and start your trial.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Button 
                                    onClick={handleFinishOnboarding}
                                    disabled={isFinishing}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 h-12 text-lg font-bold shadow-lg shadow-emerald-900/20 group"
                                >
                                    {isFinishing ? "Processing..." : "Finish Onboarding"}
                                    {!isFinishing && <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setShowOnboardingGuide(false)}
                                    className="text-slate-400 hover:text-white hover:bg-white/5"
                                >
                                    Dismiss Guide
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                            Audit Plans
                        </h2>
                        <p className="text-sm text-[#64748B] font-medium">
                            View and manage your audit plans and executions.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-[#F1F5F9] p-1 rounded-2xl border border-slate-100 shadow-sm">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "w-12 h-12 rounded-xl transition-all duration-300",
                                    viewMode === "list" ? "bg-[#34967C] text-white shadow-md hover:bg-[#34967C]/90" : "text-[#1E293B] hover:bg-slate-200/50"
                                )}
                            >
                                <List className="w-6 h-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewMode("card")}
                                className={cn(
                                    "w-12 h-12 rounded-xl transition-all duration-300",
                                    viewMode === "card" ? "bg-[#34967C] text-white shadow-md hover:bg-[#34967C]/90" : "text-[#1E293B] hover:bg-slate-200/50"
                                )}
                            >
                                <LayoutGrid className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </div>

                {sites.length > 0 && (
                    <Tabs value={activeSiteId} onValueChange={setActiveSiteId} className="w-full">
                        <TabsList className="bg-transparent h-auto p-0 flex gap-8 border-b border-slate-200 w-full justify-start rounded-none">

                            {sites.map(site => (
                                <TabsTrigger
                                    key={site.id}
                                    value={site.id.toString()}
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#34967C] data-[state=active]:bg-transparent data-[state=active]:text-[#34967C] px-0 pb-2 text-base font-semibold text-slate-500 hover:text-slate-700 transition-all shadow-none"
                                >
                                    {site.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                )}

                {sites.length > 0 ? (
                    <div className="space-y-8 relative z-10">
                        {(() => {
                            const allExecutions = (auditPrograms || [])
                                .filter(p => p.siteId.toString() === activeSiteId)
                                .flatMap(p => {
                                    const site = (sites || []).find(s => s.id === p.siteId);
                                    const executions = getAuditExecutions(p) || [];
                                    return executions.map(exec => ({
                                        ...exec,
                                        siteName: site?.name || "N/A",
                                        site: site // passing full site object for state navigation
                                    }));
                                });

                            if (!allExecutions || allExecutions.length === 0) {
                                return (
                                    <div className="h-[300px] flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 gap-4 transition-all hover:bg-white/60 focus:bg-white/60">
                                        <ClipboardCheck className="w-12 h-12 opacity-20" />
                                        <div className="text-center space-y-1">
                                            <p className="text-lg font-bold text-slate-600">No Audit Plans</p>
                                            <p className="text-sm text-slate-400 font-medium">No active audit executions mapped across your sites.</p>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div className={cn(
                                    "animate-in fade-in slide-in-from-bottom-4 duration-700",
                                    viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"
                                )}>
                                    {(allExecutions || []).map((exec, idx) => {
                                        const siteProgram = (auditPrograms || []).find(p => p.id === exec.programId);
                                        const plan = (auditPlans || []).find(p => p.auditProgramId === exec.programId && p.executionId === exec.id);
                                        const planExists = !!plan;

                                        return viewMode === "card" ? (
                                            <Card key={idx} className="group relative border border-white/50 bg-white shadow-sm hover:shadow-md transition-all duration-500 rounded-2xl p-6 flex flex-col gap-6 border-slate-200/50">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "p-2 rounded-lg transition-all duration-300",
                                                                planExists ? "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-50 group-hover:text-white" : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
                                                            )}>
                                                                <ClipboardCheck className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                                                                    Audit #{idx + 1}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <Globe className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">{exec.siteName}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <h3 className="text-lg font-black text-[#0F172A] leading-tight group-hover:text-emerald-600 transition-colors duration-300 uppercase line-clamp-2 mt-2">
                                                            {exec.title.split(' - ')[0]}
                                                            <span className="text-slate-400 font-medium normal-case block text-sm mt-1">
                                                                {planExists ? format(new Date(plan.date), 'MMM dd, yyyy') : exec.title.split(' - ')[1]}
                                                            </span>
                                                        </h3>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] font-bold px-2 py-1 border-slate-100 text-slate-500 bg-slate-50 rounded-lg whitespace-nowrap">
                                                            {exec.clauseCount} SECTIONS
                                                        </Badge>
                                                        {planExists && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <DropdownMenuItem onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}>
                                                                        <Edit className="mr-2 h-4 w-4" /> Edit Plan
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}>
                                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDownloadPDF(plan, exec.title, siteProgram)}>
                                                                        <FileText className="mr-2 h-4 w-4" /> Download PDF
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDownloadDocx(plan, exec.title, siteProgram)}>
                                                                        <FileText className="mr-2 h-4 w-4" /> Download DOCX
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDeletePlan(plan.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Plan
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex flex-col gap-2">
                                                        {(() => {
                                                            const groups = new Map<string, Clause[]>();
                                                            exec.clauses.forEach((clause: Clause) => {
                                                                const lastDashIndex = clause.id.lastIndexOf('-');
                                                                const baseId = lastDashIndex !== -1 ? clause.id.substring(0, lastDashIndex) : clause.id;
                                                                if (!groups.has(baseId)) groups.set(baseId, []);
                                                                groups.get(baseId)!.push(clause);
                                                            });
                                                            const groupArray = Array.from(groups.values());
                                                            return (
                                                                <>
                                                                    {groupArray.slice(0, 3).map((group, gIdx) => (
                                                                        <div key={gIdx} className="w-full text-[10px] font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex flex-col gap-1.5">
                                                                            {group.map((clause) => (
                                                                                <div key={clause.id} className="flex items-center gap-2 truncate max-w-full">
                                                                                    {clause.standard && (
                                                                                        <span className="text-[8px] uppercase font-black text-emerald-600 bg-emerald-50 px-1 rounded-sm shrink-0">
                                                                                            {clause.standard}
                                                                                        </span>
                                                                                    )}
                                                                                    <span className={cn("truncate", clause.isHeading && "font-black text-slate-800")}>{clause.name}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ))}
                                                                    {groupArray.length > 3 && (
                                                                        <span className="text-[10px] font-bold text-slate-400 px-2 truncate mt-1">+{groupArray.length - 3} more</span>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                <Button
                                                    size="lg"
                                                    className={cn(
                                                        "w-full font-bold rounded-2xl h-12 shadow-md transition-all duration-300 group/btn text-sm relative overflow-hidden",
                                                        planExists ? "bg-white text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200" : "bg-slate-900 hover:bg-emerald-600 text-white"
                                                    )}
                                                    onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}
                                                >
                                                    <div className="relative z-10 flex items-center justify-center gap-2">
                                                        {planExists ? <LayoutDashboard className="w-4 h-4" /> : <Calendar className="w-4 h-4 transition-transform duration-500 group-hover/btn:rotate-12" />}
                                                        {planExists ? "VIEW / EDIT PLAN" : "CREATE PLAN"}
                                                        {!planExists && <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />}
                                                    </div>
                                                </Button>
                                            </Card>
                                        ) : (
                                            <div key={idx} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 gap-4">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={cn("text-lg font-bold tracking-tight", planExists ? "text-indigo-600" : "text-emerald-600")}>
                                                            {planExists
                                                                ? `${exec.title.split(' - ')[0]} - ${format(new Date(plan.date), 'MMM dd, yyyy')}`
                                                                : exec.title
                                                            }
                                                        </h3>
                                                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-100 text-emerald-600 bg-emerald-50 rounded-lg">
                                                            {exec.siteName}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {(() => {
                                                            const groups = new Map<string, Clause[]>();
                                                            exec.clauses.forEach((clause: Clause) => {
                                                                const lastDashIndex = clause.id.lastIndexOf('-');
                                                                const baseId = lastDashIndex !== -1 ? clause.id.substring(0, lastDashIndex) : clause.id;
                                                                if (!groups.has(baseId)) groups.set(baseId, []);
                                                                groups.get(baseId)!.push(clause);
                                                            });
                                                            return Array.from(groups.values()).map((group, gIdx) => (
                                                                <div key={gIdx} className="text-sm font-medium text-slate-500 bg-slate-50 px-3 py-2 rounded-lg flex flex-col gap-1.5 border border-slate-100 w-full md:w-fit">
                                                                    {group.map(clause => (
                                                                        <div key={clause.id} className="flex items-center gap-2">
                                                                            {clause.standard && (
                                                                                <span className="text-[10px] uppercase font-black text-emerald-600 bg-emerald-50 px-1 rounded-sm shrink-0">
                                                                                    {clause.standard}
                                                                                </span>
                                                                            )}
                                                                            <span>{clause.name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 self-start sm:self-center mt-2 sm:mt-0">
                                                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm whitespace-nowrap">
                                                        {exec.clauseCount} Sections
                                                    </div>
                                                    <Button
                                                        className={cn(
                                                            "font-bold rounded-xl h-10 px-6 shadow-md transition-all duration-300 hover:scale-105 active:scale-95 group/btn relative overflow-hidden",
                                                            planExists ? "bg-white text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-50" : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100"
                                                        )}
                                                        onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}
                                                    >
                                                        <div className="relative z-10 flex items-center justify-center gap-2">
                                                            {planExists ? <LayoutDashboard className="w-4 h-4" /> : <Calendar className="w-4 h-4 transition-transform duration-500 group-hover/btn:rotate-12" />}
                                                            {planExists ? "View / Edit" : "Create Plan"}
                                                            {!planExists && <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />}
                                                        </div>
                                                    </Button>
                                                    {planExists && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-300">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuItem onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Edit Plan
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}>
                                                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDownloadPDF(plan, exec.title, siteProgram)}>
                                                                    <FileText className="mr-2 h-4 w-4" /> Download PDF
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDownloadDocx(plan, exec.title, siteProgram)}>
                                                                    <FileText className="mr-2 h-4 w-4" /> Download DOCX
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDeletePlan(plan.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Plan
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                ) : ((
                    <div className="flex flex-col items-center justify-center p-24 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-6 animate-in zoom-in-95 duration-1000">
                        <Globe className="w-16 h-16 text-slate-200" />
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-800">Operational Sites Missing</h3>
                            <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">
                                To visualize your global audit program, please first define at least one operational site.
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AuditProgramPage;
