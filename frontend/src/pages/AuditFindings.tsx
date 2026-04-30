import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, ArrowRight, RefreshCw, SearchX, Search, Edit2, Upload, FileText, Trash2, Download } from "lucide-react";
import { auditTemplates, ChecklistContent } from "@/data/auditTemplates";
import ReusablePagination from "@/components/ReusablePagination";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, BorderStyle } from "docx";
import { saveAs } from "file-saver";

// ─── Types ────────────────────────────────────────────────────────────────────

type FindingType = "OFI" | "Minor" | "Major";

interface Finding {
    id: string; // unique string for consistent matching
    auditId: number;
    auditName: string;
    clauseRef: string;
    type: FindingType;
    details: string;
    description: string;
    actionBy: string;
    closeDate: string;
    assignTo: string;
    isOverridden?: boolean;
    media?: { name: string, data: string, type: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
    FindingType,
    { label: string; bg: string; text: string; ring: string }
> = {
    OFI: {
        label: "OFI",
        bg: "bg-amber-100",
        text: "text-amber-800",
        ring: "ring-amber-300",
    },
    Minor: {
        label: "Minor N/C",
        bg: "bg-orange-100",
        text: "text-orange-800",
        ring: "ring-orange-300",
    },
    Major: {
        label: "Major N/C",
        bg: "bg-red-100",
        text: "text-red-800",
        ring: "ring-red-300",
    },
};

function extractFindings(plan: any): Finding[] {
    const results: Finding[] = [];
    const auditName: string = plan.auditName || `Audit #${plan.id}`;

    if (!plan.auditData) {
        console.log(`Plan #${plan.id} has no auditData.`);
        return results;
    }

    let data: any;
    try {
        data = typeof plan.auditData === "string" ? JSON.parse(plan.auditData) : plan.auditData;
    } catch (e) {
        console.error(`Failed to parse auditData for Plan #${plan.id}:`, e);
        return results;
    }

    if (!data || typeof data !== "object") {
        console.log(`Plan #${plan.id} auditData is not an object. Type: ${typeof data}`);
        return results;
    }

    const mapType = (raw: any): FindingType | null => {
        if (!raw || typeof raw !== 'string') return null;
        const normalized = raw.trim().toLowerCase();
        if (normalized === "c" || normalized === "compliant" || normalized === "compliance" || normalized === "") return null;
        if (normalized.includes("ofi") || normalized.includes("opportunity")) return "OFI";
        if (normalized === "min" || normalized.includes("minor")) return "Minor";
        if (normalized === "maj" || normalized.includes("major")) return "Major";
        if (normalized === "nc" || normalized.includes("non-conformance") || normalized.includes("nonconformance")) return "Minor";
        return null;
    };

    // Helper to extract finding type from any object
    const getFT = (obj: any): FindingType | null => {
        if (!obj) return null;
        return mapType(obj.findings) || mapType(obj.findingType) || mapType(obj.category) || mapType(obj.type);
    };

    // Helper to safely parse nested JSON strings
    const safeParse = (input: any) => {
        if (typeof input === 'string') {
            try { return JSON.parse(input); } catch (e) { return input; }
        }
        return input;
    };

    // ── clause-checklist (Integrated Checklist – clauseData) ──────────────────
    const clauseData = safeParse(data.clauseData);
    const editableChecklist = safeParse(data.editableChecklist);

    if (clauseData && typeof clauseData === "object") {
        const entries = Object.entries(clauseData);
        entries.forEach(([clauseId, entry]: any) => {
            const ft = getFT(entry);
            if (ft) {
                // Try to find modified title/subClauses from editableChecklist
                const modifiedClause = Array.isArray(editableChecklist) 
                    ? editableChecklist.find((c: any) => c.clauseId === clauseId)
                    : null;
                
                const requirementText = modifiedClause 
                    ? [modifiedClause.title, ...(modifiedClause.subClauses || [])].filter(Boolean).join("\n")
                    : entry.title || "";

                results.push({
                    id: `clause-${plan.id}-${clauseId}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef: `Clause ${clauseId}`,
                    type: ft,
                    details: [
                        entry.evidence,
                        entry.findingDetails,
                        entry.correction ? `Correction: ${entry.correction}` : null,
                        entry.rootCause ? `Root Cause: ${entry.rootCause}` : null,
                        entry.correctiveAction ? `Action: ${entry.correctiveAction}` : null
                    ].filter(Boolean).join("\n") || "",
                    description: entry.description || entry.descriptionText || requirementText || "No description provided",
                    actionBy: entry.actionBy || "",
                    closeDate: entry.closeDate || "",
                    assignTo: entry.assignTo || "",
                });
            }
        });
    }

    // ── checklist table (Standard Checklist – checklistData) ──────────────────
    const checklistData = safeParse(data.checklistData);
    if (checklistData && typeof checklistData === "object") {
        const entries = Object.entries(checklistData);
        console.log(`Plan #${plan.id}: Checking checklistData (${entries.length} entries)`);
        const templateContent = (() => {
            if (Array.isArray(editableChecklist)) return editableChecklist;
            const tmplId = plan.templateId;
            if (!tmplId) return null;
            const tmpl = auditTemplates.find((t) => t.id === tmplId);
            if (!tmpl) return null;
            return tmpl.content as ChecklistContent[];
        })();

        entries.forEach(([idx, entry]: any) => {
            const ft = getFT(entry);
            if (ft) {
                const itemIndex = Number(idx);
                const templateItem = Array.isArray(templateContent) ? templateContent[itemIndex] : null;
                const clauseRef = entry.clause
                    ? `Clause ${entry.clause}`
                    : templateItem?.clause
                        ? `Clause ${templateItem.clause}`
                        : `Item ${itemIndex + 1}`;

                results.push({
                    id: `checklist-${plan.id}-${idx}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef,
                    type: ft,
                    details: [
                        entry.evidence,
                        entry.findingDetails,
                        entry.correction ? `Correction: ${entry.correction}` : null,
                        entry.rootCause ? `Root Cause: ${entry.rootCause}` : null,
                        entry.correctiveAction ? `Action: ${entry.correctiveAction}` : null
                    ].filter(Boolean).join("\n") || "",
                    description: entry.description || templateItem?.question || "No description provided",
                    actionBy: entry.actionBy || "",
                    closeDate: entry.closeDate || "",
                    assignTo: entry.assignTo || "",
                });
            }
        });
    }

    // ── extraChecklistItems ──────────────────────────────────────────────────
    const extraItems = safeParse(data.extraChecklistItems);
    if (extraItems && typeof extraItems === "object") {
        console.log(`Plan #${plan.id}: Checking extraChecklistItems`);
        Object.entries(extraItems).forEach(([clause, items]: any) => {
            if (Array.isArray(items)) {
                items.forEach((item: any, idx: number) => {
                    const ft = getFT(item);
                    if (ft) {
                        results.push({
                            id: `extra-${plan.id}-${clause}-${idx}`,
                            auditId: plan.id,
                            auditName,
                            clauseRef: `Clause ${clause} (Custom)`,
                            type: ft,
                            details: item.evidence || item.findingDetails || "",
                            description: item.description || item.question || "",
                            actionBy: item.actionBy || "",
                            closeDate: item.closeDate || "",
                            assignTo: item.assignTo || "",
                        });
                    }
                });
            }
        });
    }

    // ── processAudits ────────────────────────────────────────────────────────
    const processAudits = safeParse(data.processAudits);
    if (processAudits && Array.isArray(processAudits)) {
        console.log(`Plan #${plan.id}: Checking processAudits (${processAudits.length} items)`);
        processAudits.forEach((audit: any, idx: number) => {
            const ft = getFT(audit);
            if (ft) {
                results.push({
                    id: `process-${plan.id}-${idx}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef: audit.refNo || audit.clauseNo || `Process #${idx + 1}`,
                    type: ft,
                    details: [
                        audit.evidence,
                        audit.conclusion,
                        audit.correction ? `Correction: ${audit.correction}` : null,
                        audit.rootCause ? `Root Cause: ${audit.rootCause}` : null,
                        audit.correctiveAction ? `Action: ${audit.correctiveAction}` : null
                    ].filter(Boolean).join("\n") || "",
                    description: audit.description || audit.processArea || "",
                    actionBy: audit.actionBy || "",
                    closeDate: audit.closeDate || "",
                    assignTo: audit.assignTo || "",
                });
            }
        });
    }

    // ── opportunities summary table ──────────────────────────────────────────
    if (data.opportunities && Array.isArray(data.opportunities)) {
        data.opportunities.forEach((opt: any, idx: number) => {
            if (opt.opportunity && opt.opportunity.trim() !== "") {
                results.push({
                    id: `summary-ofi-${idx}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef: opt.standardClause || "Summary OFI",
                    type: "OFI",
                    details: opt.areaProcess || "",
                    description: opt.opportunity,
                    actionBy: "",
                    closeDate: "",
                    assignTo: "",
                });
            }
        });
    }

    // ── nonConformances summary table ────────────────────────────────────────
    if (data.nonConformances && Array.isArray(data.nonConformances)) {
        data.nonConformances.forEach((ncr: any, idx: number) => {
            if (ncr.statement && ncr.statement.trim() !== "") {
                // Determine if Minor or Major if possible, default to Minor
                const isMajor = ncr.id?.includes("Maj") || (ncr.statement && typeof ncr.statement === 'string' && ncr.statement.toLowerCase().includes("major"));
                results.push({
                    id: `summary-ncr-${idx}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef: ncr.standardClause || "Summary NCR",
                    type: isMajor ? "Major" : "Minor",
                    details: ncr.areaProcess || "",
                    description: ncr.statement,
                    actionBy: ncr.actionBy || "",
                    closeDate: ncr.dueDate || "",
                    assignTo: "",
                });
            }
        });
    }

    // ── auditFindings tab (Custom auditFindings list) ────────────────────────
    if (data.auditFindings && Array.isArray(data.auditFindings)) {
        data.auditFindings.forEach((finding: any, idx: number) => {
            const ft = getFT(finding);
            if (ft && finding.details && finding.details.trim() !== "") {
                results.push({
                    id: `auditfindings-${idx}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef: finding.clauseNo || finding.refNo || "General Finding",
                    type: ft,
                    details: finding.refNo ? `Ref: ${finding.refNo}` : "",
                    description: finding.details,
                    actionBy: "",
                    closeDate: "",
                    assignTo: "",
                });
            }
        });
    }

    if (results.length > 0) {
        console.log(`Plan #${plan.id}: Successfully extracted ${results.length} findings.`);
    } else {
        console.log(`Plan #${plan.id}: No findings found in keys:`, Object.keys(data));
    }

    // Deduplicate and Prioritize Severity
    const SEVERITY: Record<FindingType, number> = { OFI: 1, Minor: 2, Major: 3 };
    const seen = new Map<string, Finding>();
    results.forEach((f) => {
        // We want to avoid listing the same exact finding source twice.
        // If a finding is both in a checklist AND a summary table, they will have different IDs,
        // so they both appear. This is actually what most auditors prefer to double check.
        const key = `${f.auditId}::${f.id}::${f.clauseRef}`;
        const existing = seen.get(key);
        if (!existing || SEVERITY[f.type] > SEVERITY[existing.type]) {
            seen.set(key, f);
        }
    });

    return Array.from(seen.values());
}

// ─── Component ────────────────────────────────────────────────────────────────

type FilterType = "All" | FindingType;

const FILTERS: FilterType[] = ["All", "OFI", "Minor", "Major"];

const FILTER_STYLE: Record<FilterType, string> = {
    All: "bg-slate-800 text-white hover:bg-slate-700",
    OFI: "bg-amber-500 text-white hover:bg-amber-600",
    Minor: "bg-orange-600 text-white hover:bg-orange-700",
    Major: "bg-red-600 text-white hover:bg-red-700",
};

const FILTER_INACTIVE = "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";

export default function AuditFindings() {
    const navigate = useNavigate();
    const [findings, setFindings] = useState<Finding[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const fetchFindings = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                setLoading(false);
                return;
            }
            const user = JSON.parse(userStr);
            console.log("Fetching findings for user:", user.email, "UID:", user.id || user._id);

            // If superadmin, fetch all plans (omit userId)
            const isSuperAdmin = user.role === 'superadmin';
            const url = isSuperAdmin
                ? `${API_BASE_URL}/api/audit-plans?includeData=true`
                : `${API_BASE_URL}/api/audit-plans?userId=${user.id || user._id}&includeData=true`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("API call failed");

            const plans: any[] = await res.json();
            console.log("Retrieved plans count:", plans.length);
            if (plans.length > 0) {
                console.log("SAMPLE PLAN 0 auditData:", plans[0].auditName, plans[0].auditData);
            }

            const all: Finding[] = [];

            if (Array.isArray(plans)) {
                plans.forEach((plan) => {
                    const baseFindings = extractFindings(plan);
                    if (baseFindings.length > 0) {
                        console.log(`Extracted ${baseFindings.length} findings from Plan #${plan.id} (${plan.auditName})`);
                    }
                    const overrides = plan.findingsData ? (typeof plan.findingsData === 'string' ? JSON.parse(plan.findingsData) : plan.findingsData) : {};

                    const merged = baseFindings.map(f => {
                        if (overrides[f.id]) {
                            return {
                                ...f,
                                ...overrides[f.id],
                                isOverridden: true
                            };
                        }
                        return f;
                    });

                    all.push(...merged);
                });
                setFindings(all);
            }
        } catch (error) {
            console.error("Fetch findings error:", error);
            setFindings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFindings();
    }, []);

    const searchedFindings = findings.filter(f => {
        const query = searchQuery.toLowerCase();
        return (
            f.auditName.toLowerCase().includes(query) ||
            f.details.toLowerCase().includes(query) ||
            f.description.toLowerCase().includes(query) ||
            f.clauseRef.toLowerCase().includes(query)
        );
    });

    const filtered = activeFilter === "All"
        ? searchedFindings
        : searchedFindings.filter((f) => f.type === activeFilter);

    const countOf = (type: FindingType) =>
        searchedFindings.filter((f) => f.type === type).length;

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedFindings = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeFilter]);

    const handleSaveFinding = async (updated: Finding) => {
        setIsSaving(true);
        try {
            // Fetch the specific plan to update its findingsData
            const resPlan = await fetch(`${API_BASE_URL}/api/audit-plans/${updated.auditId}`);
            if (!resPlan.ok) throw new Error("Plan not found");
            const plan = await resPlan.json();
            if (!plan) throw new Error("Plan not found");

            const currentOverrides = plan.findingsData ? (typeof plan.findingsData === 'string' ? JSON.parse(plan.findingsData) : plan.findingsData) : {};
            const newOverrides = {
                ...currentOverrides,
                [updated.id]: {
                    description: updated.description,
                    actionBy: updated.actionBy,
                    details: updated.details,
                    assignTo: updated.assignTo,
                    closeDate: updated.closeDate,
                    media: updated.media
                }
            };

            const resUpdate = await fetch(`${API_BASE_URL}/api/audit-plans/${updated.auditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ findingsData: newOverrides })
            });

            if (resUpdate.ok) {
                toast.success("Finding updated successfully");
                setEditingFinding(null);
                fetchFindings();
            } else {
                throw new Error("Failed to update");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = (files: FileList | null) => {
        if (!files || !editingFinding) return;

        const newFiles = Array.from(files);
        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setEditingFinding(prev => {
                    if (!prev) return prev;
                    const media = [...(prev.media || []), {
                        name: file.name,
                        data: base64String,
                        type: file.type
                    }];
                    return { ...prev, media };
                });
            };
            reader.readAsDataURL(file);
        });
    };

    const removeMedia = (index: number) => {
        setEditingFinding(prev => {
            if (!prev || !prev.media) return prev;
            return {
                ...prev,
                media: prev.media.filter((_, i) => i !== index)
            };
        });
    };

    const exportToPDF = async () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.setTextColor(33, 56, 71);
        doc.text("Audit Findings Report", 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

        const tableData = filtered.map((f, i) => [
            i + 1,
            f.auditName,
            f.clauseRef,
            f.type,
            f.details,
            f.description,
            f.actionBy
        ]);

        autoTable(doc, {
            startY: 35,
            head: [["#", "Audit Name", "Clause", "Type", "Finding Details", "Description", "Action By"]],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [33, 56, 71] },
        });

        // Add media if exists
        let currentY = (doc as any).lastAutoTable.finalY + 20;

        for (const finding of filtered) {
            if (finding.media && finding.media.length > 0) {
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.setFontSize(12);
                doc.setTextColor(33, 56, 71);
                doc.text(`Attachments for ${finding.clauseRef}:`, 14, currentY);
                currentY += 10;

                for (const m of finding.media) {
                    if (m.type.startsWith("image/")) {
                        try {
                            doc.addImage(m.data, m.type.split('/')[1].toUpperCase(), 14, currentY, 50, 40);
                            currentY += 45;
                        } catch (e) {
                            console.error("Failed to add image to PDF", e);
                        }
                    } else {
                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text(`- File: ${m.name} (${m.type})`, 20, currentY);
                        currentY += 7;
                    }

                    if (currentY > 250) {
                        doc.addPage();
                        currentY = 20;
                    }
                }
                currentY += 10;
            }
        }

        doc.save("Audit_Findings.pdf");
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filtered.map(f => ({
            "Audit Name": f.auditName,
            "Clause": f.clauseRef,
            "Type": f.type,
            "Finding Details": f.details,
            "Description": f.description,
            "Action By": f.actionBy,
            "Target Date": f.closeDate,
            "Assigned To": f.assignTo
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Findings");
        XLSX.writeFile(workbook, "Audit_Findings.xlsx");
    };

    const exportToWord = async () => {
        const tableRows = filtered.map(f => new DocxTableRow({
            children: [
                new DocxTableCell({ children: [new Paragraph(f.auditName)] }),
                new DocxTableCell({ children: [new Paragraph(f.clauseRef)] }),
                new DocxTableCell({ children: [new Paragraph(f.type)] }),
                new DocxTableCell({ children: [new Paragraph(f.details)] }),
                new DocxTableCell({ children: [new Paragraph(f.description)] }),
                new DocxTableCell({ children: [new Paragraph(f.actionBy || "—")] }),
            ]
        }));

        const mainContent: any[] = [
            new Paragraph({
                text: "Audit Findings Report",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: "" }),
            new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new DocxTableRow({
                        children: ["Audit Name", "Clause", "Type", "Details", "Description", "Action By"].map(h =>
                            new DocxTableCell({
                                children: [new Paragraph({
                                    children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })]
                                })],
                                shading: { fill: "213847" }
                            })
                        )
                    }),
                    ...tableRows
                ]
            }),
            new Paragraph({ text: "" })
        ];

        for (const f of filtered) {
            if (f.media && f.media.length > 0) {
                mainContent.push(new Paragraph({
                    text: `Attachments for ${f.clauseRef}:`,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400 }
                }));

                for (const m of f.media) {
                    if (m.type.startsWith("image/")) {
                        try {
                            const base64Data = m.data.split(',')[1];
                            const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                            mainContent.push(new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: buffer,
                                        transformation: { width: 300, height: 200 }
                                    })
                                ]
                            }));
                        } catch (e) {
                            console.error("Failed to add image to Word", e);
                        }
                    } else {
                        mainContent.push(new Paragraph({
                            children: [new TextRun({ text: `- File: ${m.name} (${m.type})`, italics: true })]
                        }));
                    }
                }
            }
        }

        const doc = new Document({
            sections: [{ children: mainContent }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, "Audit_Findings.docx");
    };

    return (
        <div className="flex-1 p-8 pt-6 bg-white min-h-screen">
            <div className="max-w-6xl mx-auto space-y-6 pb-16">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                            Audit Findings
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            All OFI, Minor N/C and Major N/C findings across every audit.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {(["OFI", "Minor", "Major"] as const).map((type) => {
                        const label = type === "OFI" ? "OFI" : type === "Minor" ? "Minor N/C" : "Major N/C";
                        const accent = type === "OFI" ? "amber" : type === "Minor" ? "orange" : "red";
                        return (
                            <button
                                key={type}
                                onClick={() => setActiveFilter(type)}
                                className={`rounded-xl border p-5 text-left transition-all shadow-sm cursor-pointer
                    ${activeFilter === type ? `border-${accent}-400 ring-2 ring-${accent}-200 bg-${accent}-50` : "border-slate-200 bg-white hover:bg-slate-50"}`}
                            >
                                <span className={`text-xs font-bold uppercase tracking-widest text-${accent}-600`}>{label}</span>
                                <div className={`text-4xl font-extrabold mt-1 text-${accent}-600`}>{countOf(type)}</div>
                                <div className="text-xs text-slate-500 mt-1">findings</div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-2 flex-wrap">
                        {FILTERS.map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm ${activeFilter === f ? FILTER_STYLE[f] : FILTER_INACTIVE}`}
                            >
                                {f === "All" ? `All (${searchedFindings.length})` :
                                    f === "Minor" ? `Minor N/C (${countOf(f)})` :
                                        f === "Major" ? `Major N/C (${countOf(f)})` :
                                            `OFI (${countOf(f)})`}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-[320px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search findings, audits, clauses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white border-slate-200 h-10 rounded-xl focus-visible:ring-amber-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" /> Loading findings…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                        <SearchX className="w-12 h-12 opacity-40" />
                        <p className="text-base font-semibold">No findings found</p>
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-[#213847]">
                                    <TableRow className="hover:bg-slate-800 divide-x divide-slate-600">
                                        <TableHead className="text-white font-bold w-12 text-center">#</TableHead>
                                        <TableHead className="text-white font-bold w-[20%]">Audit Name</TableHead>
                                        <TableHead className="text-white font-bold w-[12%]">Clause / Item</TableHead>
                                        <TableHead className="text-white font-bold w-[10%]">Type</TableHead>
                                        <TableHead className="text-white font-bold w-[22%]">Finding Details</TableHead>
                                        <TableHead className="text-white font-bold w-[22%]">Description</TableHead>
                                        <TableHead className="text-white font-bold w-[12%]">Action By</TableHead>
                                        <TableHead className="text-white font-bold w-20 text-center">View</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedFindings.map((finding, idx) => {
                                        const cfg = TYPE_CONFIG[finding.type];
                                        return (
                                            <TableRow key={`${finding.auditId}-${finding.clauseRef}-${idx}`} className="bg-white hover:bg-slate-50 transition-colors divide-x divide-slate-100">
                                                <TableCell className="text-center text-slate-500 font-medium text-sm">{(currentPage - 1) * itemsPerPage + idx + 1}</TableCell>
                                                <TableCell className="font-semibold text-slate-800 text-sm py-3">{finding.auditName}</TableCell>
                                                <TableCell className="text-slate-600 text-sm font-mono">
                                                    <div className="flex items-center gap-2">
                                                        {finding.clauseRef}
                                                        {finding.media && finding.media.length > 0 && (
                                                            <span title={`${finding.media.length} attachments`}>
                                                                <Upload className="w-3 h-3 text-amber-500" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>{cfg.label}</span>
                                                </TableCell>
                                                <TableCell className="text-slate-600 text-sm max-w-[220px]">
                                                    <p className="line-clamp-3 leading-snug">{finding.details || "—"}</p>
                                                </TableCell>
                                                <TableCell className="text-slate-600 text-sm max-w-[220px]">
                                                    <p className="line-clamp-3 leading-snug">{finding.description || "—"}</p>
                                                </TableCell>
                                                <TableCell className="text-slate-600 text-sm font-medium">{finding.actionBy || "—"}</TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/audit/execute/${finding.auditId}`, { state: { focusFindings: true } })} className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800">
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <ReusablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filtered.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            className="mt-6"
                        />
                    </>
                )}
            </div>

            <Dialog open={!!editingFinding} onOpenChange={(open) => !open && setEditingFinding(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-amber-500" /> Edit Finding Details
                        </DialogTitle>
                    </DialogHeader>

                    {editingFinding && (
                        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Audit</label>
                                    <Input value={editingFinding.auditName} disabled className="bg-slate-50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Clause</label>
                                    <Input value={editingFinding.clauseRef} disabled className="bg-slate-50" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Details (Evidence)</label>
                                <Textarea value={editingFinding.details} onChange={(e) => setEditingFinding({ ...editingFinding, details: e.target.value })} className="min-h-[80px]" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Description (Non-conformity statement)</label>
                                <Textarea value={editingFinding.description} onChange={(e) => setEditingFinding({ ...editingFinding, description: e.target.value })} className="min-h-[80px]" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Action By</label>
                                    <Input value={editingFinding.actionBy} onChange={(e) => setEditingFinding({ ...editingFinding, actionBy: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Target Date</label>
                                    <Input type="date" value={editingFinding.closeDate} onChange={(e) => setEditingFinding({ ...editingFinding, closeDate: e.target.value })} />
                                </div>
                            </div>

                            {/* Media Attachment Section */}
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-slate-400" /> Attached Media / Files
                                </label>

                                <div className="grid grid-cols-3 gap-3">
                                    {editingFinding.media?.map((m, idx) => (
                                        <div key={idx} className="relative group rounded-lg border border-slate-200 p-2 bg-slate-50 overflow-hidden">
                                            {m.type.startsWith("image/") ? (
                                                <img src={m.data} alt={m.name} className="w-full h-20 object-cover rounded shadow-sm" />
                                            ) : (
                                                <div className="w-full h-20 flex flex-col items-center justify-center text-slate-400">
                                                    <FileText className="w-8 h-8" />
                                                    <span className="text-[10px] mt-1 truncate w-full px-1 text-center">{m.name}</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => removeMedia(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}

                                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                        <Upload className="w-6 h-6 text-slate-300" />
                                        <span className="text-xs text-slate-400 mt-1">Upload</span>
                                        <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} accept="image/*,.pdf,.doc,.docx" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingFinding(null)} disabled={isSaving}>Cancel</Button>
                        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => editingFinding && handleSaveFinding(editingFinding)} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
