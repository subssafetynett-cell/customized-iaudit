import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, MapPin, User, FileText, CheckCircle2, Plus, Trash2, ArrowLeft, Save, Clock, GripVertical, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { auditTemplates } from "@/data/auditTemplates";

interface ItineraryItem {
    id: string;
    startTime: string;
    endTime: string;
    activity: string;
    notes: string;
}

const AutoResizeTextarea = ({ value, onChange, className, placeholder }: any) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);

    return (
        <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
                const target = e.target;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
                if (onChange) onChange(e);
            }}
            className={className}
            placeholder={placeholder}
            rows={1}
            style={{ overflow: 'hidden' }}
        />
    );
};

const CreateAuditPlanPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { execution, program, site, plan } = location.state || {};
    const isEditMode = !!plan;

    // Form State
    const [auditName, setAuditName] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [auditDate, setAuditDate] = useState<Date | undefined>(undefined);
    const [auditLocation, setAuditLocation] = useState("");
    const [auditCriteria, setAuditCriteria] = useState("");
    const [auditScope, setAuditScope] = useState("");
    const [auditObjective, setAuditObjective] = useState("");

    // Preview State
    const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

    // Auditor Selection State
    const [users, setUsers] = useState<any[]>([]);
    const [leadAuditorId, setLeadAuditorId] = useState<string>("");
    const [selectedAuditorId, setSelectedAuditorId] = useState<string>(""); // For single select in this UI version
    const [isSaving, setIsSaving] = useState(false);

    // Itinerary State
    const [itinerary, setItinerary] = useState<ItineraryItem[]>([
        { id: "1", startTime: "09:00", endTime: "09:30", activity: "Opening Meeting", notes: "Introduction of the audit team, confirmation of scope and objectives, review of the audit plan." },
        { id: "2", startTime: "09:30", endTime: "10:30", activity: "Site Walkthrough", notes: "General inspection of the facility to observe operations and physical conditions." },
        { id: "3", startTime: "10:30", endTime: "12:00", activity: "Interviews with Key Personnel", notes: "Discussions with department managers regarding processes and compliance." },
        { id: "4", startTime: "12:00", endTime: "13:00", activity: "Lunch Break", notes: "" },
        { id: "5", startTime: "13:00", endTime: "14:30", activity: "Document Review", notes: "Examination of policies, procedures, records, and other relevant documentation." },
        { id: "6", startTime: "14:30", endTime: "15:30", activity: "Operational Controls Check", notes: "Verification of operational controls and their effectiveness in managing risks." },
        { id: "7", startTime: "15:30", endTime: "16:15", activity: "Gap Analysis Discussion", notes: "Review of identified gaps and observations with the auditee." },
        { id: "8", startTime: "16:15", endTime: "16:45", activity: "Report Preparation", notes: "Drafting the preliminary audit report and summarizing key findings." },
        { id: "9", startTime: "16:45", endTime: "17:00", activity: "Closing Meeting", notes: "Presentation of audit findings, conclusions, and next steps." },
    ]);

    // Fetch Users (Scope by creatorId)
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const response = await fetch(`${API_BASE_URL}/api/users?creatorId=${user.id}`);
                if (response.ok) {
                    const data = await response.json();
                    const usersList = Array.isArray(data) ? data : [];

                    // Add current user if not in list
                    if (user && user.id) {
                        const exists = usersList.some((u: any) => u.id === user.id);
                        if (!exists) {
                            usersList.unshift(user);
                        }
                    }
                    setUsers(usersList);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
                toast.error("Failed to load users list.");
                setUsers([]);
            }
        };
        fetchUsers();
    }, []);

    // Safety check for missing state — only redirect when there is no usable state at all
    useEffect(() => {
        if (!isEditMode && !execution && !plan) {
            toast.error("Missing required audit details. Redirecting...");
            navigate("/audit-program");
        }
    }, [execution, plan, isEditMode, navigate]);

    // Pre-populate data
    useEffect(() => {
        if (!isEditMode && !execution && !plan) return;

        const loadFullPlan = async (planId: number) => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/audit-plans/${planId}`);
                if (res.ok) {
                    const fullPlan = await res.json();
                    setAuditName(fullPlan.auditName || "");
                    setSelectedTemplateId(fullPlan.templateId || "");
                    if (fullPlan.date) setAuditDate(new Date(fullPlan.date));
                    setAuditLocation(fullPlan.location || "");
                    setAuditScope(fullPlan.scope || "");
                    setAuditObjective(fullPlan.objective || "");
                    setAuditCriteria(fullPlan.criteria || "");

                    if (fullPlan.leadAuditorId) setLeadAuditorId(fullPlan.leadAuditorId.toString());
                    if (fullPlan.auditors && fullPlan.auditors.length > 0) {
                        setSelectedAuditorId(fullPlan.auditors[0].id.toString());
                    }
                    if (fullPlan.itinerary) {
                        setItinerary(typeof fullPlan.itinerary === 'string' ? JSON.parse(fullPlan.itinerary) : fullPlan.itinerary);
                    }
                }
            } catch (e) {
                console.error("Failed to load full plan details", e);
            }
        };

        const existingPlan = location.state?.plan;

        if (existingPlan) {
            // Edit Mode - If scope/objective are missing, fetch fresh from backend
            if (!existingPlan.scope || !existingPlan.objective || !existingPlan.itinerary) {
                loadFullPlan(existingPlan.id);
            } else {
                setAuditName(existingPlan.auditName || "");
                setSelectedTemplateId(existingPlan.templateId || "");
                if (existingPlan.date) setAuditDate(new Date(existingPlan.date));
                setAuditLocation(existingPlan.location || "");
                setAuditScope(existingPlan.scope || "");
                setAuditObjective(existingPlan.objective || "");
                setAuditCriteria(existingPlan.criteria || "");

                if (existingPlan.leadAuditorId) setLeadAuditorId(existingPlan.leadAuditorId.toString());
                else if (existingPlan.leadAuditor?.id) setLeadAuditorId(existingPlan.leadAuditor.id.toString());

                if (existingPlan.auditors && existingPlan.auditors.length > 0) {
                    const firstAuditor = existingPlan.auditors[0];
                    setSelectedAuditorId(typeof firstAuditor === 'object' ? firstAuditor.id?.toString() : firstAuditor.toString());
                } else if (existingPlan.auditorIds && existingPlan.auditorIds.length > 0) {
                    setSelectedAuditorId(existingPlan.auditorIds[0].toString());
                }

                if (existingPlan.itinerary) {
                    setItinerary(typeof existingPlan.itinerary === 'string' ? JSON.parse(existingPlan.itinerary) : existingPlan.itinerary);
                }
            }
        } else if (execution) {
            // Create Mode Defaults
            const execLabel = execution.title || execution.name || 'New Audit';
            setAuditName(execLabel);

            // Try to extract date from the title if it formats like "Annual Quality Audit - JAN 26"
            const titleParts = execLabel.split(' - ');
            let initialDate = new Date();
            if (titleParts.length > 1) {
                const dateStr = titleParts[titleParts.length - 1]; // "JAN 2026" or "JAN 26"
                const [monthStr, yearStr] = dateStr.split(' ');
                if (monthStr && yearStr) {
                    const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
                    if (!isNaN(monthIndex)) {
                        let fullYear = parseInt(yearStr);
                        if (fullYear < 100) fullYear += 2000; // Handle 2-digit year "26" -> 2026
                        initialDate = new Date(fullYear, monthIndex, 1);
                    }
                }
            }
            setAuditDate(initialDate);

            // Set ISO Standard defaults
            const currentStandard = program?.isoStandard || "ISO 14001:2015";

            if (site) {
                // Formatting Location: site.name, site.city, site.country
                const parts = [site.name, site.city, site.country].filter(Boolean);
                setAuditLocation(parts.join(', '));
                setAuditScope(`Audit of ${site.name} against ${currentStandard} standards, focusing on key operational areas.`);
            } else {
                setAuditScope(`Audit against ${currentStandard} standards, focusing on key operational areas.`);
            }

            setAuditObjective(`To verify compliance with ${currentStandard} and internal procedures, and to identify areas for improvement.`);
            setAuditCriteria(`${currentStandard}, Internal Manual, Local Regulations`);

            if (program) {
                if (program.leadAuditor) {
                    setLeadAuditorId(program.leadAuditor.id.toString());
                } else if (program.leadAuditorId) {
                    setLeadAuditorId(program.leadAuditorId.toString());
                }

                if (program.auditors && program.auditors.length > 0) {
                    const firstAuditor = program.auditors[0];
                    setSelectedAuditorId(typeof firstAuditor === 'object' ? firstAuditor.id?.toString() : firstAuditor.toString());
                } else if (program.auditorIds && program.auditorIds.length > 0) {
                    setSelectedAuditorId(program.auditorIds[0].toString());
                }

                // Auto-select template based on ISO Standard
                if (program.isoStandard) {
                    const matchingTemplate = auditTemplates.find(t => program.isoStandard.includes(t.standard));
                    if (matchingTemplate) {
                        setSelectedTemplateId(matchingTemplate.id);
                    }
                }
            }
        }
    }, [execution, program, site, location.state, isEditMode, plan]);

    const handleItineraryChange = (id: string, field: keyof ItineraryItem, value: string) => {
        setItinerary(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const addItineraryItem = () => {
        const newItem: ItineraryItem = {
            id: Date.now().toString(),
            startTime: "",
            endTime: "",
            activity: "",
            notes: ""
        };
        setItinerary([...itinerary, newItem]);
    };

    const removeItineraryItem = (id: string) => {
        setItinerary(itinerary.filter(item => item.id !== id));
    };

    // Drag and Drop Handlers
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === index) return;
        const newItinerary = [...itinerary];
        const draggedItem = newItinerary[draggedItemIndex];
        newItinerary.splice(draggedItemIndex, 1);
        newItinerary.splice(index, 0, draggedItem);
        setItinerary(newItinerary);
        setDraggedItemIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedItemIndex(null);
    };

    const handleSave = async () => {
        if (!auditName || !selectedTemplateId || !auditDate || !auditLocation) {
            toast.error("Please fill in all required fields (Name, Template, Date, Location).");
            return;
        }

        setIsSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const payload = {
                auditProgramId: isEditMode ? plan.auditProgramId : (program?.id || execution?.programId),
                executionId: isEditMode ? plan.executionId : execution?.id,
                auditName,
                templateId: selectedTemplateId,
                date: auditDate,
                location: auditLocation,
                scope: auditScope,
                objective: auditObjective,
                criteria: auditCriteria,
                leadAuditorId,
                auditorIds: selectedAuditorId ? [selectedAuditorId] : [],
                itinerary,
                userId: user.id
            };

            const url = isEditMode ? `${API_BASE_URL}/api/audit-plans/${plan.id}` : `${API_BASE_URL}/api/audit-plans`;
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success(isEditMode ? "Audit Plan updated successfully!" : "Audit Plan saved successfully!");
                setTimeout(() => navigate("/audit"), 1000);
            } else {
                const data = await response.json().catch(() => ({}));
                toast.error(data.details || data.error || (isEditMode ? "Failed to update audit plan." : "Failed to save audit plan."));
            }
        } catch (error) {
            console.error("Save audit plan error", error);
            toast.error("Failed to connect to the server.");
        } finally {
            setIsSaving(false);
        }
    };

    const previewTemplate = auditTemplates.find(t => t.id === previewTemplateId);

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8 space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-[#F8FAFC]/90 backdrop-blur-sm z-50 py-4 -my-4 border-b border-slate-200/50 mb-4 px-1">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-slate-200">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{isEditMode ? "Edit Audit Plan" : "Create Audit Plan"}</h1>
                        <p className="text-slate-500 font-medium text-sm">Define the scope, criteria, and schedule for your upcoming audit.</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-100 rounded-xl gap-2">
                    <Save className="w-4 h-4" />
                    {isEditMode ? "Update Audit Plan" : "Save Audit Plan"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Core Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* General Information Card */}
                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-700">
                                <FileText className="w-4 h-4 text-emerald-500" />
                                General Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Audit Name</Label>
                                <Input
                                    value={auditName}
                                    onChange={e => setAuditName(e.target.value)}
                                    className="font-semibold bg-slate-50 border-slate-200 h-10"
                                    placeholder="e.g. Q1 2026 Internal Audit"
                                />
                            </div>


                            {/* ── Template Picker – highlighted ── */}
                            <div className="md:col-span-2 rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-black text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5" />
                                        Choose Audit Template
                                    </Label>
                                    <span className="bg-amber-400 text-amber-900 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">Required</span>
                                </div>
                                <div className="flex gap-2">
                                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                        <SelectTrigger className="font-semibold bg-white border-indigo-200 h-11 flex-1 focus:ring-indigo-400 shadow-sm">
                                            <SelectValue placeholder="Choose an audit template…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(() => {
                                                const determineStandards = () => {
                                                    const knownStandards = ["ISO 9001", "ISO 14001", "ISO 45001"];
                                                    // Derive primarily from what's physically in the auditCriteria field
                                                    const criteriaUpper = auditCriteria.toUpperCase();
                                                    const criteriaStandards = knownStandards.filter(std => criteriaUpper.includes(std));
                                                    
                                                    if (criteriaStandards.length > 0) return criteriaStandards;

                                                    // Fallback to program property if needed
                                                    if (program?.isoStandard) {
                                                        const progStandards = knownStandards.filter(std => program.isoStandard.toUpperCase().includes(std));
                                                        if (progStandards.length > 0) return progStandards;
                                                        return program.isoStandard.split(',').map((s: string) => s.trim());
                                                    }
                                                    
                                                    return [];
                                                };

                                                const standards = determineStandards();
                                                const isMultiStandard = standards.length > 1;

                                                const filtered = auditTemplates.filter(template => {
                                                    if (standards.length === 0) return true; // Show all if no constraints
                                                    return standards.some(s => {
                                                        const tStd = template.standard.toUpperCase();
                                                        const searchStd = s.toUpperCase();
                                                        return tStd.includes(searchStd) || searchStd.includes(tStd) || (template.isIntegrated && isMultiStandard);
                                                    });
                                                });

                                                if (isMultiStandard && filtered.some(t => t.isIntegrated)) {
                                                    // For multi-standard, we prioritize the integrated ones
                                                    const uniqueTypes = new Set();
                                                    return filtered
                                                        .filter(t => {
                                                            if (t.isIntegrated) return true;
                                                            if (uniqueTypes.has(t.type)) return false;
                                                            uniqueTypes.add(t.type);
                                                            return true;
                                                        })
                                                        .map(template => (
                                                            <SelectItem key={template.id} value={template.id}>
                                                                {template.title} <span className="text-slate-400 text-xs ml-2">({template.standard})</span>
                                                            </SelectItem>
                                                        ));
                                                }

                                                return filtered.map(template => (
                                                    <SelectItem key={template.id} value={template.id}>
                                                        {template.title} <span className="text-slate-400 text-xs ml-2">({template.standard})</span>
                                                    </SelectItem>
                                                ));
                                            })()}
                                        </SelectContent>
                                    </Select>
                                    {selectedTemplateId && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-11 w-11 shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                            onClick={() => setPreviewTemplateId(selectedTemplateId)}
                                            title="Preview Template"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                                {selectedTemplateId && (() => {
                                    const t = auditTemplates.find(t => t.id === selectedTemplateId);
                                    return t ? (
                                        <div className="flex items-center gap-3 p-3 bg-white border border-indigo-100 rounded-xl shadow-sm">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{t.title}</p>
                                                <p className="text-xs text-slate-500">{t.standard} · {t.content.length} {t.type === 'checklist' ? 'questions' : 'clauses'}</p>
                                            </div>
                                            <span className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">Selected ✓</span>
                                        </div>
                                    ) : null;
                                })()}
                            </div>


                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-semibold h-10 bg-slate-50 border-slate-200",
                                                !auditDate && "text-muted-foreground"
                                            )}
                                        >
                                            {auditDate ? (
                                                format(auditDate, "MMM dd, yyyy")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={auditDate}
                                            onSelect={setAuditDate}
                                            disabled={(date) =>
                                                date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Audit Criteria</Label>
                                <Input value={auditCriteria} onChange={e => setAuditCriteria(e.target.value)} className="font-semibold bg-slate-50 border-slate-200" placeholder="e.g. ISO 14001:2015" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Location & Address</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <Input value={auditLocation} onChange={e => setAuditLocation(e.target.value)} className="pl-9 font-semibold bg-slate-50 border-slate-200" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Scope & Objectives Card */}
                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-700">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Scope & Objectives
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Audit Scope</Label>
                                <Textarea value={auditScope} onChange={e => setAuditScope(e.target.value)} className="min-h-[80px] font-medium resize-none bg-slate-50 border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Audit Objective</Label>
                                <Textarea value={auditObjective} onChange={e => setAuditObjective(e.target.value)} className="min-h-[80px] font-medium resize-none bg-slate-50 border-slate-200" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Itinerary Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-emerald-500" />
                                Daily Itinerary
                                <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600">{itinerary.length}</Badge>
                            </h3>
                            <Button size="sm" onClick={addItineraryItem} className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold gap-2">
                                <Plus className="w-3 h-3" />
                                Add Activity
                            </Button>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
                            {/* Header Row */}
                            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 bg-slate-50/80 border-b border-slate-100 p-4 py-3">
                                <div className="w-36 flex items-center pl-8 text-sm font-semibold text-slate-500">Time</div>
                                <div className="text-sm font-semibold text-slate-500">Activity</div>
                                <div className="text-sm font-semibold text-slate-500">Objective</div>
                                <div className="w-8"></div>
                            </div>

                            {/* Rows */}
                            <div className="divide-y divide-dashed divide-slate-200">
                                {itinerary.map((item, index) => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={cn(
                                            "grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 items-start group transition-all hover:bg-slate-50/50 relative",
                                            draggedItemIndex === index ? "bg-emerald-50 opacity-50" : "opacity-100"
                                        )}
                                    >
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Drag to reorder">
                                            <GripVertical className="w-4 h-4" />
                                        </div>

                                        {/* Time Box */}
                                        <div className="w-36 pl-6 flex items-center">
                                            <Input
                                                value={item.startTime}
                                                onChange={e => handleItineraryChange(item.id, 'startTime', e.target.value)}
                                                className="w-[52px] h-8 text-sm font-bold text-slate-800 border-transparent bg-transparent hover:bg-slate-100 focus:bg-white focus:border-slate-200 p-1 shadow-none"
                                                placeholder="08:00"
                                            />
                                            <span className="text-slate-800 font-bold text-sm mx-1">:-</span>
                                            <Input
                                                value={item.endTime}
                                                onChange={e => handleItineraryChange(item.id, 'endTime', e.target.value)}
                                                className="w-[52px] h-8 text-sm font-bold text-slate-800 border-transparent bg-transparent hover:bg-slate-100 focus:bg-white focus:border-slate-200 p-1 shadow-none"
                                                placeholder="08:30"
                                            />
                                            <span className="text-slate-800 font-bold text-sm">:</span>
                                        </div>

                                        {/* Content Inputs */}
                                        <div className="mt-1">
                                            <AutoResizeTextarea
                                                value={item.activity}
                                                onChange={(e: any) => handleItineraryChange(item.id, 'activity', e.target.value)}
                                                className="w-full min-h-[32px] h-auto p-1 text-sm font-medium text-slate-700 border-transparent bg-transparent hover:bg-slate-50 focus:bg-white focus:border-slate-200 resize-none transition-colors"
                                                placeholder="Activity Description"
                                            />
                                        </div>
                                        <div className="mt-1">
                                            <AutoResizeTextarea
                                                value={item.notes}
                                                onChange={(e: any) => handleItineraryChange(item.id, 'notes', e.target.value)}
                                                className="w-full min-h-[32px] h-auto p-1 text-sm text-slate-500 border-transparent bg-transparent hover:bg-slate-50 focus:bg-white focus:border-slate-200 resize-none transition-colors"
                                                placeholder="Objective / Remarks"
                                            />
                                        </div>

                                        <div className="w-8 flex justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => removeItineraryItem(item.id)} className="w-8 h-8 flex-shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Key Personnel & Summary */}
                <div className="space-y-6">
                    {/* Audit Team Card */}
                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-24">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-700">
                                <User className="w-4 h-4 text-emerald-500" />
                                Audit Team
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Lead Auditor</Label>
                                <Select value={leadAuditorId} onValueChange={setLeadAuditorId}>
                                    <SelectTrigger className="font-semibold bg-slate-50 border-slate-200 h-10">
                                        <SelectValue placeholder="Select Lead Auditor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(u => (
                                            <SelectItem key={u.id} value={u.id.toString()}>
                                                {u.firstName} {u.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Auditor(s)</Label>
                                <Select value={selectedAuditorId} onValueChange={setSelectedAuditorId}>
                                    <SelectTrigger className="font-semibold bg-slate-50 border-slate-200 h-10">
                                        <SelectValue placeholder="Select Auditor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(u => (
                                            <SelectItem key={u.id} value={u.id.toString()}>
                                                {u.firstName} {u.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selected Clauses Summary (Moved under Audit Team) */}
                    {
                        execution?.clauses && (
                            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-6">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                    <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-700">
                                        <FileText className="w-4 h-4 text-emerald-500" />
                                        Selected Audit Schedule
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 bg-slate-50/30">
                                    <div className="grid gap-3 grid-cols-1">
                                        {(() => {
                                            const groups = new Map<string, any[]>();
                                            execution.clauses.forEach((clause: any) => {
                                                const lastDashIndex = clause.id.lastIndexOf('-');
                                                const baseId = lastDashIndex !== -1 ? clause.id.substring(0, lastDashIndex) : clause.id;
                                                if (!groups.has(baseId)) groups.set(baseId, []);
                                                groups.get(baseId)!.push(clause);
                                            });
                                            return Array.from(groups.values()).map((group, idx) => (
                                                <Card key={idx} className="border border-slate-200 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                                                    <div className="h-1 bg-emerald-500 w-0 group-hover:w-full transition-all duration-500" />
                                                    <CardContent className="p-3">
                                                        <div className="text-[12px] font-bold text-slate-800 leading-tight">
                                                            {group.map((clause: any) => {
                                                                const label = clause.standard || "";
                                                                return (
                                                                    <div key={clause.id} className="mb-2 pb-2 border-b border-slate-50 last:border-0 last:mb-0 last:pb-0 font-normal">
                                                                        {label && <span className="text-[9px] uppercase font-black text-emerald-600 mr-2 bg-emerald-50 px-1 py-0.5 rounded">{label}</span>}
                                                                        <span className="text-slate-700 font-semibold">{clause.name}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ));
                                        })()}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    }
                </div>
            </div>

            {/* Template Preview Modal */}
            <Dialog open={!!previewTemplateId && !!previewTemplate} onOpenChange={() => setPreviewTemplateId(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{previewTemplate?.title}</DialogTitle>
                        <DialogDescription>{previewTemplate?.description}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        {previewTemplate?.type === 'checklist' ? (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="w-[80px]">Clause</TableHead>
                                            <TableHead>Question</TableHead>
                                            <TableHead className="w-[100px]">Findings</TableHead>
                                            <TableHead className="w-[100px]">Evidence</TableHead>
                                            <TableHead className="w-[100px]">OFI</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(previewTemplate?.content || []).map((item: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium align-top">{item.clause}</TableCell>
                                                <TableCell className="align-top">{item.question}</TableCell>
                                                <TableCell className="align-top">
                                                    <div className="h-8 w-20 bg-slate-100 rounded border border-slate-200" />
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <div className="h-8 w-full bg-slate-50 rounded border border-slate-100" />
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <div className="h-8 w-full bg-slate-50 rounded border border-slate-100" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {(previewTemplate?.content || []).map((item: any, idx: number) => (
                                    <Card key={idx} className="overflow-hidden border border-slate-200">
                                        <CardHeader className="bg-slate-50 py-3 px-4 border-b border-slate-100">
                                            <CardTitle className="text-base font-medium text-slate-800">{item.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Textarea
                                                disabled
                                                className="min-h-[100px] border-0 focus-visible:ring-0 rounded-none resize-none p-4 text-sm bg-transparent"
                                                placeholder={item.placeholder}
                                            />
                                            <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center text-xs text-slate-400">
                                                Evidence / Records Upload Area
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default CreateAuditPlanPage;
