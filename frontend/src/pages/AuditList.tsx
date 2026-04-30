import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    LayoutList, MoreVertical, FileText, Trash2, Eye, Calendar, Clock, Search, Edit, Download, Sheet, FileDown, MapPin
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, ImageRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { auditTemplates, ChecklistContent } from "@/data/auditTemplates";
import ReusablePagination from "@/components/ReusablePagination";

const AuditList = () => {
    const [auditPlans, setAuditPlans] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedSite, setSelectedSite] = useState("all");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const res = await fetch(`${API_BASE_URL}/api/audit-plans?userId=${user.id}`);
                const data = await res.json();
                setAuditPlans(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch audit plans:", error);
                toast.error("Failed to load audit plans");
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

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

    const getAuditData = (plan: any) => {
        if (!plan.auditData) return {};
        return typeof plan.auditData === 'string' ? JSON.parse(plan.auditData) : plan.auditData;
    };

    const handleDownloadPDF = (plan: any) => {
        try {
            setLoading(true);
            const doc = new jsPDF();
            const darkColor = [33, 56, 71] as [number, number, number];
            
            doc.setFontSize(20);
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text("Audit Plan Summary", 14, 22);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

            const auditData = getAuditData(plan);
            
            autoTable(doc, {
                startY: 40,
                head: [['Field', 'Value']],
                body: [
                    ['Audit Name', plan.auditName || '—'],
                    ['Status', plan.status || 'In Progress'],
                    ['Location', plan.location || '—'],
                    ['Lead Auditor', plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : '—'],
                    ['Progress', `${plan.progress ?? 0}%`],
                    ['Audit Type', plan.auditType || '—'],
                    ['Criteria', plan.criteria || '—']
                ],
                theme: 'grid',
                headStyles: { fillColor: darkColor }
            });

            doc.save(`Audit_Plan_${plan.id}.pdf`);
            toast.success('PDF Downloaded');
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadDocx = async (planStub: any) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/audit-plans/${planStub.id}`);
            if (!res.ok) throw new Error("Failed to fetch full plan details");
            const plan = await res.json();

            const template = auditTemplates.find(t => t.id === plan.templateId);
            const auditData = getAuditData(plan);
            const fileName = `Audit_Plan_${plan.auditName?.replace(/[^a-z0-9]/gi, '_') || plan.id}`;

            // Fetch logo image for DOCX - improved transparency handling
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
                        ctx.clearRect(0, 0, width, height); // Clear for transparency
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob((compressedBlob) => {
                            if (compressedBlob) compressedBlob.arrayBuffer().then(resolve).catch(reject);
                            else reject(new Error("Canvas toBlob returned null"));
                        }, "image/png"); // Use PNG for transparency
                    };
                    img.onerror = reject;
                    img.src = URL.createObjectURL(blob);
                });
            } catch (e) {
                console.warn("Logo could not be loaded for DOCX", e);
            }

            const primaryColor = '213847';
            const children: any[] = [];
            const MARGIN_TWIPS = 1440; // 1 inch = 1440 twips (~25.4mm), for 20mm use ~1134

            if (logoBuffer) {
                children.push(new Paragraph({
                    children: [new ImageRun({ data: logoBuffer, transformation: { width: 80, height: 60 } })],
                    spacing: { after: 200 }
                }));
            }

            const heading = (text: string, color = primaryColor) => new Paragraph({
                children: [new TextRun({ text, bold: true, size: 28, color })],
                spacing: { before: 400, after: 200 }
            });

            const kv = (label: string, value: string) => new Paragraph({
                children: [
                    new TextRun({ text: `${label}: `, bold: true }),
                    new TextRun(value || 'N/A')
                ],
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
                kv('Audit Name', plan.auditName || plan.auditType),
                kv('Date', plan.date ? new Date(plan.date).toLocaleDateString() : 'TBD'),
                kv('Location', plan.location),
                kv('Lead Auditor', plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : '-'),
                kv('Execution ID', plan.executionId || 'Standalone'),
                kv('Criteria', plan.criteria),
                ...kvTwoLine('Scope', plan.scope),
                ...kvTwoLine('Objective', plan.objective),
            );

            // --- Audit Itinerary (New Table in Word) ---
            const itinerary = plan.itinerary ? (typeof plan.itinerary === 'string' ? JSON.parse(plan.itinerary) : plan.itinerary) : [];
            if (Array.isArray(itinerary) && itinerary.length > 0) {
                children.push(heading('Audit Itinerary'));
                const tableRows = [
                    new DocxTableRow({
                        children: [
                            new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Time', bold: true, color: 'ffffff' })] })], shading: { fill: primaryColor } }),
                            new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Activity', bold: true, color: 'ffffff' })] })], shading: { fill: primaryColor } }),
                            new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Auditee / Dept', bold: true, color: 'ffffff' })] })], shading: { fill: primaryColor } }),
                        ]
                    }),
                    ...itinerary.map((item: any) => new DocxTableRow({
                        children: [
                            new DocxTableCell({ children: [new Paragraph(`${item.startTime || ''} - ${item.endTime || ''}`)] }),
                            new DocxTableCell({ children: [new Paragraph(item.activity || '')] }),
                            new DocxTableCell({ children: [new Paragraph(item.auditee || '')] }),
                        ]
                    }))
                ];
                children.push(new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows,
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 2 },
                        bottom: { style: BorderStyle.SINGLE, size: 2 },
                        left: { style: BorderStyle.SINGLE, size: 2 },
                        right: { style: BorderStyle.SINGLE, size: 2 },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                    }
                }));
            }

            if (auditData.executiveSummary) {
                children.push(heading('Executive Summary'));
                children.push(new Paragraph({ text: auditData.executiveSummary, spacing: { after: 200 } }));
            }

            if (auditData.nonConformances?.some((nc: any) => nc.statement)) {
                children.push(heading('Non-Conformances', 'DC2626'));
                auditData.nonConformances.forEach((nc: any) => {
                    if (!nc.statement) return;
                    children.push(new Paragraph({
                        children: [
                            new TextRun({ text: `${nc.id} (${nc.standardClause || ''}): `, bold: true }),
                            new TextRun(nc.statement)
                        ],
                        bullet: { level: 0 },
                        spacing: { after: 100 }
                    }));
                });
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
            toast.success('Word Document Downloaded');
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate Word document");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadExcel = (plan: any) => {
        const template = auditTemplates.find(t => t.id === plan.templateId);
        const auditData = getAuditData(plan);
        const fileName = `Audit_Report_${plan.auditName?.replace(/[^a-z0-9]/gi, '_') || plan.id}`;
        const wb = XLSX.utils.book_new();

        // Sheet 1: Plan Summary
        const summaryData = [
            ['Field', 'Value'],
            ['Audit Name', plan.auditName || plan.auditType || 'N/A'],
            ['Template', template?.title || plan.templateId || 'N/A'],
            ['Date', plan.date ? new Date(plan.date).toLocaleDateString() : 'TBD'],
            ['Location', plan.location || 'N/A'],
            ['Lead Auditor', plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : '-'],
            ['Execution ID', plan.executionId || 'Standalone'],
            ['Scope', plan.scope || 'N/A'],
            ['Objective', plan.objective || 'N/A'],
            ['Saved Progress', `${auditData.progress ?? 0}%`],
            ['Last Saved', auditData.lastSaved ? new Date(auditData.lastSaved).toLocaleString() : 'Never'],
        ];
        if (auditData.executiveSummary) summaryData.push(['Executive Summary', auditData.executiveSummary]);
        if (auditData.summaryCounts) {
            summaryData.push(['Major NCs', auditData.summaryCounts.major || '0']);
            summaryData.push(['Minor NCs', auditData.summaryCounts.minor || '0']);
            summaryData.push(['OFIs', auditData.summaryCounts.ofi || '0']);
            summaryData.push(['Positive Aspects', auditData.summaryCounts.positive || '0']);
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

        // Sheet 2: Participants
        if (auditData.participants?.length) {
            const pData = [['Name', 'Position', 'Opening Meeting', 'Closing Meeting', 'Interviewed']];
            auditData.participants.forEach((p: any) => {
                const row: any[] = [p.name, p.position, p.opening ? 'Yes' : 'No', p.closing ? 'Yes' : 'No', p.interviewed || ''];
                pData.push(row);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pData), 'Participants');
        }

        // Sheet 3: Checklist Findings
        if (auditData.checklistData && Object.keys(auditData.checklistData).length > 0 && template?.content) {
            const cData = [['Clause', 'Question', 'Finding', 'Evidence', 'Description', 'Correction', 'Root Cause', 'Corrective Action']];
            Object.entries(auditData.checklistData).filter(([, v]: any) => v.findings).forEach(([idx, v]: any) => {
                const item = (template.content as ChecklistContent[])[Number(idx)];
                cData.push([item?.clause || idx, item?.question || '-', v.findings, v.evidence || '', v.description || '', v.correction || '', v.rootCause || '', v.correctiveAction || '']);
            });
            if (cData.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cData), 'Checklist');
        }

        // Sheet 4: Non-Conformances
        if (auditData.nonConformances?.some((nc: any) => nc.statement)) {
            const ncData = [['ID', 'Standard Clause', 'Area/Process', 'Statement', 'Due Date']];
            auditData.nonConformances.forEach((nc: any) => ncData.push([nc.id, nc.standardClause, nc.areaProcess, nc.statement, nc.dueDate || '']));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ncData), 'Non-Conformances');
        }

        // Sheet 5: OFIs
        if (auditData.opportunities?.some((o: any) => o.opportunity)) {
            const oData = [['ID', 'Standard Clause', 'Area/Process', 'Opportunity']];
            auditData.opportunities.forEach((o: any) => oData.push([o.id, o.standardClause, o.areaProcess, o.opportunity]));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(oData), 'OFIs');
        }

        // Sheet 6: Positive Aspects
        if (auditData.positiveAspects?.some((pa: any) => pa.aspect)) {
            const paData = [['ID', 'Standard Clause', 'Area/Process', 'Aspect']];
            auditData.positiveAspects.forEach((pa: any) => paData.push([pa.id, pa.standardClause, pa.areaProcess, pa.aspect]));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paData), 'Positive Aspects');
        }

        // Sheet 7: Process Audits
        if (auditData.processAudits?.some((pa: any) => pa.processArea)) {
            const prData = [['Process Area', 'Auditees', 'Evidence', 'Conclusion']];
            auditData.processAudits.forEach((pa: any) => prData.push([pa.processArea, pa.auditees, pa.evidence, pa.conclusion]));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prData), 'Process Audits');
        }

        XLSX.writeFile(wb, `${fileName}.xlsx`);
        toast.success('Excel Downloaded');
    };

    const filteredPlansBySearch = auditPlans.filter(plan =>
        (plan.auditName && plan.auditName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (plan.executionId && plan.executionId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (plan.location && plan.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getStatus = (plan: any) => {
        // Dummy logic for status, assuming available. 
        // In real app it comes from backend plan.status
        return plan.status || "In Progress";
    };

    const getProgress = (plan: any) => {
        // Use pre-calculated progress from backend for speed
        return plan.progress ?? 0;
    };

    const uniqueSites = React.useMemo(() => {
        const sites = auditPlans.map(plan => plan.auditProgram?.site?.name || plan.location).filter(Boolean);
        return ["all", ...Array.from(new Set(sites))];
    }, [auditPlans]);

    const filteredPlansBySite = filteredPlansBySearch.filter(plan => {
        if (selectedSite === "all") return true;
        const siteName = plan.auditProgram?.site?.name || plan.location;
        return siteName === selectedSite;
    });

    const filteredPlans = filteredPlansBySite.filter(plan => {
        if (statusFilter === "all") return true;
        return getStatus(plan).toLowerCase() === statusFilter.toLowerCase();
    });

    const counts = {
        all: filteredPlansBySite.length,
        draft: filteredPlansBySite.filter(p => getStatus(p) === "Draft").length,
        scheduled: filteredPlansBySite.filter(p => getStatus(p) === "Scheduled").length,
        inProgress: filteredPlansBySite.filter(p => getStatus(p) === "In Progress").length,
        completed: filteredPlansBySite.filter(p => getStatus(p) === "Completed").length,
        cancelled: filteredPlansBySite.filter(p => getStatus(p) === "Cancelled").length,
        postponed: filteredPlansBySite.filter(p => getStatus(p) === "Postponed").length,
    };

    const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
    const paginatedPlans = filteredPlans.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, selectedSite]);

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 min-h-screen bg-white">
            <div className="w-full max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                            Audit Active List
                        </h2>
                        <p className="text-sm text-[#64748B] font-medium">
                            View and manage all your verified audit plans.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search audits..."
                                className="pl-9 w-[250px] h-12 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {uniqueSites.length > 2 && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#213847]" />
                            <span className="text-sm font-bold text-[#213847]">Select Site</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {uniqueSites.map((site) => (
                                <button
                                    key={site}
                                    onClick={() => setSelectedSite(site)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${selectedSite === site
                                        ? "bg-[#213847] text-white border-[#213847] shadow-md"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-[#213847]/30 hover:bg-slate-50"
                                        }`}
                                >
                                    {site === "all" ? "All Sites" : site}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <Tabs defaultValue="all" onValueChange={setStatusFilter} className="w-full relative z-10 space-y-6">
                    <div className="bg-slate-50/50 rounded-xl p-1.5 inline-block border border-slate-100">
                        <TabsList className="bg-transparent h-auto p-0 space-x-2">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 data-[state=active]:text-[#213847] border-b-2 border-transparent data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                All <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.all}</span>
                            </TabsTrigger>
                            <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Draft <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.draft}</span>
                            </TabsTrigger>
                            <TabsTrigger value="scheduled" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Scheduled <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.scheduled}</span>
                            </TabsTrigger>
                            <TabsTrigger value="in progress" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                In Progress <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.inProgress}</span>
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Completed <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.completed}</span>
                            </TabsTrigger>
                            <TabsTrigger value="cancelled" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Cancelled <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.cancelled}</span>
                            </TabsTrigger>
                            <TabsTrigger value="postponed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Postponed <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.postponed}</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative z-10 w-full">
                        <Table>
                            <TableHeader className="bg-[#213847]">
                                <TableRow className="hover:bg-[#213847] border-none">
                                    <TableHead className="font-medium text-white h-12 py-3">Plan Name</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Audit</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Site</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Date & Time</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Lead Auditor</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Status</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Progress</TableHead>
                                    <TableHead className="text-right font-medium text-white h-12 py-3">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                                                <p className="text-sm font-medium text-slate-500">Loading audit plans...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredPlans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center text-slate-500 font-medium">
                                            No audit plans found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedPlans.map((plan) => {
                                        const status = getStatus(plan);
                                        let timeString = "-";
                                        try {
                                            if (plan.itinerary) {
                                                const parsedItin = typeof plan.itinerary === 'string' ? JSON.parse(plan.itinerary) : plan.itinerary;
                                                if (Array.isArray(parsedItin) && parsedItin.length > 0) {
                                                    timeString = `${parsedItin[0].startTime} - ${parsedItin[parsedItin.length - 1].endTime}`;
                                                }
                                            }
                                        } catch (e) {
                                            console.warn("Failed to parse itinerary", e);
                                        }

                                        return (
                                            <TableRow key={plan.id} className="cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 group">
                                                <TableCell className="font-bold text-slate-800 py-5">
                                                    {plan.auditName || "Unnamed Audit"}
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700">{plan.executionId || "Standalone"}</span>
                                                        <span className="text-xs text-slate-400 font-medium">ISO Standards</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-bold py-5">
                                                    {plan.auditProgram?.site?.name || plan.location?.split(',')[0] || "Head Office"}
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center text-slate-700 font-bold text-sm bg-slate-100 w-fit px-2 py-0.5 rounded-md gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                            {plan.date ? format(new Date(plan.date), "yyyy-MM-dd") : "TBD"}
                                                        </div>
                                                        <div className="flex items-center text-slate-500 text-xs font-semibold gap-1.5 px-2">
                                                            <Clock className="w-3.5 h-3.5 opacity-70" />
                                                            {timeString}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-600 py-5">
                                                    {plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : "-"}
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <Badge variant="outline" className={`border-0 uppercase tracking-wider text-[10px] font-black px-2.5 py-1 ${status === 'In Progress' ? 'bg-amber-100 text-amber-700' : status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-slate-500 min-w-[20px]">{getProgress(plan)}%</span>
                                                        <Progress value={getProgress(plan)} className={`w-16 h-1.5 bg-slate-100 ${getProgress(plan) === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-emerald-400"}`} />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-5">
                                                    <div className="flex justify-end items-center gap-2 pr-2">
                                                        <Button variant="ghost" size="icon" className="w-8 h-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-full" title="Perform Audit" onClick={() => navigate(`/audit/execute/${plan.id}`, { state: { plan } })}>
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:bg-slate-100 rounded-full">
                                                                    <Download className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-44">
                                                                <DropdownMenuItem onClick={() => handleDownloadPDF(plan)} className="gap-2 cursor-pointer">
                                                                    <FileText className="w-4 h-4 text-red-500" /> Download PDF
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDownloadDocx(plan)} className="gap-2 cursor-pointer">
                                                                    <FileText className="w-4 h-4 text-blue-500" /> Download Word
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDownloadExcel(plan)} className="gap-2 cursor-pointer">
                                                                    <FileText className="w-4 h-4 text-emerald-500" /> Download Excel
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <ReusablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredPlans.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        className="mt-6"
                    />
                </Tabs>
            </div>
        </div>
    );
};

export default AuditList;
