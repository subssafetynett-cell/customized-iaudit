import React, { useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle2, AlertCircle, XCircle, Award, Download, Eye, FileText, ClipboardList, Search, Upload, X as XIcon, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyStore } from "@/hooks/useCompanyStore";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import ReusablePagination from "@/components/ReusablePagination";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { generatePDF, generateWord } from "../utils/gapAnalysisUtils";
import { Standard, AuditQuestion, SavedGapAnalysis, FindingType } from "../types/gapAnalysis";
import { getQuestionsForStandard } from "../data/gapAnalysisQuestions";
import { DeleteConfirmationDialog } from "../components/DeleteConfirmationDialog";

const GapAnalysis = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [step, setStep] = useState<"list" | "setup" | "analysis" | "results">("list");
    const [showOnboardingGuide, setShowOnboardingGuide] = useState(searchParams.get("onboarding") === "true");
    const { companies } = useCompanyStore();
    const userCompany = companies.length > 0 ? companies[0] : null;

    // Setup State
    const [companyName, setCompanyName] = useState("");
    const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
    const [standard, setStandard] = useState<Standard | "">("");
    const [location, setLocation] = useState("");
    const [representatives, setRepresentatives] = useState("");
    const [auditorName, setAuditorName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [scope, setScope] = useState("");
    const [auditCompany, setAuditCompany] = useState("");

    // Analysis State
    const [questions, setQuestions] = useState<AuditQuestion[]>([]);
    const [savedAnalyses, setSavedAnalyses] = useState<SavedGapAnalysis[]>([]);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Modal State
    const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
    const [newQuestionText, setNewQuestionText] = useState("");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

    // Refs for Charts (for PDF generation)
    const pieChartRef = useRef<HTMLDivElement>(null);
    const barChartRef = useRef<HTMLDivElement>(null);

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStandard, setFilterStandard] = useState<Standard | "all">("all");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;


    // Load saved analyses
    React.useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const saved = localStorage.getItem(`gapAnalyses_${user.id}`);
        if (saved) {
            try {
                setSavedAnalyses(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse gap analyses", e);
            }
        }
    }, []);

    const saveCurrentAnalysis = (status: "In Progress" | "Completed" = "In Progress") => {
        if (!companyName || !standard) {
            toast.error("Company Name and Standard are required to save.");
            return;
        }

        const newAnalysis: SavedGapAnalysis = {
            id: currentId || crypto.randomUUID(),
            companyName,
            auditDate,
            standard: standard as Standard,
            location,
            representatives,
            auditorName,
            contactEmail,
            scope,
            auditCompany,
            questions,
            status
        };

        const exists = savedAnalyses.some(a => a.id === newAnalysis.id);
        const updated = exists
            ? savedAnalyses.map(a => a.id === newAnalysis.id ? newAnalysis : a)
            : [newAnalysis, ...savedAnalyses];

        setSavedAnalyses(updated);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem(`gapAnalyses_${user.id}`, JSON.stringify(updated));

        if (!currentId) setCurrentId(newAnalysis.id);
        toast.success(`Analysis saved as ${status}`);
    };

    const deleteAnalysis = (id: string) => {
        const updated = savedAnalyses.filter(a => a.id !== id);
        setSavedAnalyses(updated);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem(`gapAnalyses_${user.id}`, JSON.stringify(updated));
        toast.success("Analysis deleted");
    };

    const resumeAnalysis = (analysis: SavedGapAnalysis) => {
        setCompanyName(analysis.companyName);
        setAuditDate(analysis.auditDate);
        setStandard(analysis.standard);
        setLocation(analysis.location);
        setRepresentatives(analysis.representatives);
        setAuditorName(analysis.auditorName);
        setContactEmail(analysis.contactEmail);
        setScope(analysis.scope);
        setAuditCompany(analysis.auditCompany || "");
        setQuestions(analysis.questions);
        setCurrentId(analysis.id);
        setStep(analysis.status === "Completed" ? "results" : "analysis");
    };

    const startAnalysis = () => {
        if (!companyName || !standard || !auditorName) {
            toast.error("Please fill in all required fields.");
            return;
        }

        const initialQuestions = getQuestionsForStandard(standard);

        if (initialQuestions.length === 0) {
            toast.error("Standard not yet supported or no questions found.");
            return;
        }

        setQuestions(initialQuestions);
        setCurrentId(crypto.randomUUID());
        setCurrentClauseIndex(0);
        setStep("analysis");
    };

    const [currentClauseIndex, setCurrentClauseIndex] = useState(0);
    const uniqueClauses = Array.from(new Set(questions.map(q => q.clause)));
    const currentClause = uniqueClauses[currentClauseIndex];
    // const currentQuestions = questions.filter(q => q.clause === currentClause); // Not used currently but logic exists

    const handleNextClause = () => {
        if (currentClauseIndex < uniqueClauses.length - 1) {
            setCurrentClauseIndex(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            saveCurrentAnalysis("Completed");
            setStep("results");
        }
    };

    const handlePrevClause = () => {
        if (currentClauseIndex > 0) {
            setCurrentClauseIndex(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleAnswerChange = (id: string, field: keyof AuditQuestion, value: any) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const handleAddQuestion = () => {
        setNewQuestionText("");
        setIsAddQuestionOpen(true);
    };

    const confirmAddQuestion = () => {
        if (!newQuestionText.trim()) return;

        const newQuestion: AuditQuestion = {
            id: crypto.randomUUID(),
            clause: currentClause,
            text: newQuestionText,
            finding: null,
            actionPlan: "",
            evidence: "",
            evidenceImage: ""
        };
        setQuestions(prev => [...prev, newQuestion]);
        toast.success("New question added");
        setIsAddQuestionOpen(false);
    };

    const handleEvidenceImageUpload = (id: string, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            handleAnswerChange(id, "evidenceImage", dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveEvidenceImage = (id: string) => {
        handleAnswerChange(id, "evidenceImage", "");
    };

    const promptDeleteQuestion = (id: string) => {
        setQuestionToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteQuestion = () => {
        if (!questionToDelete) return;
        setQuestions(prev => prev.filter(q => q.id !== questionToDelete));
        toast.success("Question deleted");
        setIsDeleteDialogOpen(false);
        setQuestionToDelete(null);
    };

    const handleQuestionTextChange = (id: string, text: string) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, text } : q));
    };

    // --- Results & PDF Logic ---
    const calculateResults = () => {
        const total = questions.length;
        const comply = questions.filter(q => q.finding === "Comply").length;
        const ofi = questions.filter(q => q.finding === "OFI").length;
        const nc = questions.filter(q => q.finding === "NC").length;
        const score = total > 0 ? Math.round((comply / total) * 100) : 0;

        // Clause-wise breakdown
        const clauseData = uniqueClauses.map(clause => {
            const qs = questions.filter(q => q.clause === clause);
            const c = qs.filter(q => q.finding === "Comply").length;
            const t = qs.length;
            return {
                name: clause,
                score: t > 0 ? Math.round((c / t) * 100) : 0,
                total: t,
                comply: c
            };
        });

        return { total, comply, ofi, nc, score, clauseData };
    };

    const results = calculateResults();

    const pieData = [
        { name: 'Comply', value: results.comply, color: '#10b981' }, // emerald-500
        { name: 'OFI', value: results.ofi, color: '#f59e0b' },       // amber-500
        { name: 'NC', value: results.nc, color: '#ef4444' },         // red-500
    ].filter(d => d.value > 0);

    const handleDownloadReport = async (format: 'pdf' | 'word') => {
        const data = {
            companyName,
            auditDate,
            standard,
            location,
            representatives,
            auditorName,
            contactEmail,
            scope,
            questions,
            scorePercentage: results.score
        };

        if (format === 'pdf') {
            toast.promise(generatePDF(data, pieChartRef.current, barChartRef.current, userCompany?.logo), {
                loading: 'Generating PDF Report...',
                success: 'PDF Report downloaded!',
                error: 'Failed to generate PDF.'
            });
        } else {
            toast.promise(generateWord(data, pieChartRef.current, barChartRef.current, userCompany?.logo), {
                loading: 'Generating Word Report...',
                success: 'Word Report downloaded!',
                error: 'Failed to generate Word doc.'
            });
        }
    };

    const filteredAnalyses = savedAnalyses.filter(analysis => {
        const matchesSearch = analysis.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            analysis.auditDate.includes(searchTerm);
        const matchesStandard = filterStandard === "all" || analysis.standard === filterStandard;
        return matchesSearch && matchesStandard;
    });

    const totalPages = Math.ceil(filteredAnalyses.length / itemsPerPage);
    const paginatedAnalyses = filteredAnalyses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page to 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStandard]);

    return (
        <div className="flex-1 p-8 pt-6 min-h-screen bg-white relative">
            {/* Background Overlay for Onboarding */}
            {showOnboardingGuide && step === "list" && (
                <div className="fixed inset-0 bg-slate-900/10 z-[40] transition-all duration-500" />
            )}

            <div className="w-full max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 px-4 sm:px-0">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Gap Analysis</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Conduct detailed compliance checks against ISO standards</p>
                    </div>
                    {/* Header Actions */}
                    {step === "list" && (
                        <div className={`flex w-full sm:w-auto relative ${showOnboardingGuide ? "z-[60]" : ""}`}>
                            {showOnboardingGuide && (
                                <div className="absolute inset-0 -m-1 rounded-2xl ring-[8px] ring-emerald-500/50 animate-pulse z-[-1]" />
                            )}
                            <Button 
                                onClick={() => {
                                    setStep("setup");
                                    setShowOnboardingGuide(false);
                                }} 
                                className={`w-full sm:w-auto bg-[#213847] hover:bg-[#213847]/90 text-white rounded-xl h-10 px-4 font-medium shadow-sm transition-all duration-300 ${showOnboardingGuide ? 'relative z-[60] ring-[6px] ring-emerald-500 ring-offset-2 scale-105 shadow-2xl' : ''}`}
                            >
                                <Plus className="w-4 h-4 mr-2" /> New Analysis
                            </Button>
                            
                            {/* Onboarding Guide Tooltip */}
                            {showOnboardingGuide && (
                                <>
                                     <div className="fixed inset-0 bg-slate-900/30 z-[50] animate-in fade-in duration-700" />
                                    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:translate-y-0 md:absolute md:inset-auto md:top-full md:mt-4 md:right-0 z-[60] animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="bg-white border-0 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-5 md:p-6 w-full max-w-[720px] mx-auto md:mr-0 relative overflow-hidden group/modal">
                                        <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
                                        
                                        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                                                        Step 5 of 6
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <ClipboardList className="w-6 h-6 text-emerald-600" />
                                                    </div>
                                                    <h4 className="font-black text-xl text-slate-900 tracking-tight whitespace-nowrap">Step 5: Gap Analysis</h4>
                                                </div>

                                            <div className="space-y-4">
                                                <p className="text-sm font-medium text-slate-600 leading-relaxed px-1">
                                                    Gap Analysis was created for companies that are new to ISO Standards or in transition from old to new ISO Standard. Use of the Gap Analysis is optional for ISO Certified companies.
                                                </p>
                                            </div>

                                            <div className="flex justify-between items-center pt-2">
                                                <Button 
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl px-4 flex items-center gap-2 font-bold transition-colors"
                                                    onClick={() => {
                                                        setShowOnboardingGuide(false);
                                                        navigate("/self-assessment?onboarding=true");
                                                    }}
                                                >
                                                    <ArrowLeft className="w-4 h-4" /> Back
                                                </Button>
                                                <Button 
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-8 shadow-lg shadow-emerald-200 transition-all active:scale-95 py-6 text-base"
                                                    onClick={() => {
                                                        setShowOnboardingGuide(false);
                                                        // Transition to Step 6: Audit Program
                                                        navigate("/audits?onboarding=true");
                                                    }}
                                                >
                                                    Next <ArrowRight className="ml-2 w-5 h-5" />
                                                </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                        </div>
                    )}
                </div>


                {step === "list" && (
                    <div className="space-y-6">
                        {/* Search and Filter */}
                        <div className="flex flex-col md:flex-row gap-4 px-4 sm:px-0">
                            <div className="relative flex-1 md:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search by company or date..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-10 rounded-xl border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full shadow-sm"
                                />
                            </div>
                            <div className="w-full md:w-64">
                                <Select value={filterStandard} onValueChange={(v: "all" | Standard) => setFilterStandard(v)}>
                                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white focus:ring-[#213847]/40 w-full text-slate-600 shadow-sm">
                                        <SelectValue placeholder="All Standards" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                        <SelectItem value="all" className="rounded-lg cursor-pointer">All Standards</SelectItem>
                                        <SelectItem value="ISO 9001:2015" className="rounded-lg cursor-pointer">ISO 9001:2015</SelectItem>
                                        <SelectItem value="ISO 14001:2015" className="rounded-lg cursor-pointer">ISO 14001:2015</SelectItem>
                                        <SelectItem value="ISO 45001:2018" className="rounded-lg cursor-pointer">ISO 45001:2018</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm overflow-hidden">
                            {filteredAnalyses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-4 bg-white">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                                        <ClipboardList className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">No analyses yet</h3>
                                    <p className="text-slate-500 text-center max-w-sm">No saved analyses found. Start a new one to begin your compliance check.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto bg-white">
                                    <Table>
                                        <TableHeader className="bg-[#213847]">
                                            <TableRow className="hover:bg-[#213847] border-0">
                                                <TableHead className="text-white font-medium h-12">Sl. No</TableHead>
                                                <TableHead className="text-white font-medium h-12">Company</TableHead>
                                                <TableHead className="text-white font-medium h-12">Standard</TableHead>
                                                <TableHead className="text-white font-medium h-12">Date</TableHead>
                                                <TableHead className="text-white font-medium h-12">Status</TableHead>
                                                <TableHead className="text-white font-medium h-12 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAnalyses.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                        No analyses found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedAnalyses.map((analysis, index) => (
                                                    <TableRow key={analysis.id}>
                                                        <TableCell className="pl-6">
                                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-900">{analysis.companyName}</TableCell>
                                                        <TableCell className="text-slate-600">{analysis.standard}</TableCell>
                                                        <TableCell className="text-slate-600">{analysis.auditDate}</TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={analysis.status === "Completed" ? "default" : "outline"}
                                                                className={cn(analysis.status === "Completed" ? "bg-[#10b981] hover:bg-[#059669] text-white" : "text-amber-600 border-amber-600")}
                                                            >
                                                                {analysis.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2 text-slate-400">
                                                                {analysis.status === "Completed" ? (
                                                                    <>
                                                                        <Button variant="ghost" size="sm" onClick={() => resumeAnalysis(analysis)} title="View Report" className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600">
                                                                            <Eye className="w-4 h-4" />
                                                                        </Button>

                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="sm" title="Download" className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600">
                                                                                    <Download className="w-4 h-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem onClick={() => { resumeAnalysis(analysis); toast.info("Opening report for PDF download..."); }}>
                                                                                    <FileText className="w-4 h-4 mr-2 text-slate-400" /> PDF Report
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => { resumeAnalysis(analysis); toast.info("Opening report for Word download..."); }}>
                                                                                    <FileText className="w-4 h-4 mr-2 text-slate-400" /> Word Report
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </>
                                                                ) : (
                                                                    <Button variant="ghost" size="sm" onClick={() => resumeAnalysis(analysis)} title="Resume Analysis" className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-600">
                                                                        <ArrowRight className="w-4 h-4" />
                                                                    </Button>
                                                                )}

                                                                <Button variant="ghost" size="sm" onClick={() => deleteAnalysis(analysis.id)} className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600" title="Delete">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                        <ReusablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredAnalyses.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            className="mt-4"
                        />
                    </div>
                )
                }

                {/* Step: Setup */}
                {
                    step === "setup" && (
                        <div className="space-y-6">
                            <Button variant="ghost" onClick={() => setStep("list")} className="pl-0 hover:bg-transparent text-emerald-600">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
                            </Button>

                            <Card className="border-slate-200 shadow-sm rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
                                <CardHeader className="bg-[#213847] text-white rounded-t-xl p-6 sm:p-8 border-b border-slate-100">
                                    <CardTitle className="text-xl sm:text-2xl text-white">Analysis Setup</CardTitle>
                                    <CardDescription className="text-slate-300">Enter validation details.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 p-6 sm:p-8 bg-white rounded-b-xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-700">Company Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={companyName}
                                                onChange={e => setCompanyName(e.target.value)}
                                                placeholder="Audited Company"
                                                className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-700">Audit Date <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="date"
                                                value={auditDate}
                                                onChange={e => setAuditDate(e.target.value)}
                                                className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-700">ISO Standard <span className="text-red-500">*</span></Label>
                                            <Select onValueChange={(v: Standard) => {
                                                setStandard(v);
                                                const defaultScopes: Record<string, string> = {
                                                    "ISO 9001:2015": "Assessment of Quality Management System conformance against ISO 9001:2015 requirements across all relevant processes, functions, and departments.",
                                                    "ISO 14001:2015": "Assessment of Environmental Management System conformance against ISO 14001:2015 requirements, covering environmental aspects, compliance obligations, and continual improvement.",
                                                    "ISO 45001:2018": "Assessment of Occupational Health & Safety Management System conformance against ISO 45001:2018 requirements, including hazard identification, risk assessment, and worker participation.",
                                                };
                                                setScope(defaultScopes[v] || "");
                                            }} value={standard}>
                                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:ring-[#213847]/40 w-full">
                                                    <SelectValue placeholder="Select Standard" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                                    <SelectItem value="ISO 9001:2015" className="rounded-lg cursor-pointer">ISO 9001:2015</SelectItem>
                                                    <SelectItem value="ISO 14001:2015" className="rounded-lg cursor-pointer">ISO 14001:2015</SelectItem>
                                                    <SelectItem value="ISO 45001:2018" className="rounded-lg cursor-pointer">ISO 45001:2018</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-700">Location</Label>
                                            <Input
                                                value={location}
                                                onChange={e => setLocation(e.target.value)}
                                                placeholder="Audit Location"
                                                className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-700">Representatives</Label>
                                            <Input
                                                value={representatives}
                                                onChange={e => setRepresentatives(e.target.value)}
                                                placeholder="Company Reps"
                                                className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-700">Auditor Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={auditorName}
                                                onChange={e => setAuditorName(e.target.value)}
                                                placeholder="Your Name"
                                                className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-700">Contact Email</Label>
                                            <Input
                                                value={contactEmail}
                                                onChange={e => setContactEmail(e.target.value)}
                                                placeholder="Email"
                                                className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        <Label className="text-sm font-semibold text-slate-700">Scope of Audit</Label>
                                        <Input
                                            value={scope}
                                            onChange={e => setScope(e.target.value)}
                                            placeholder="Audit Scope"
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-700">
                                            Company Being Audited <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                        </Label>
                                        <Input
                                            value={auditCompany}
                                            onChange={e => setAuditCompany(e.target.value)}
                                            placeholder="Enter company being audited"
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-6">
                                        <Button
                                            onClick={startAnalysis}
                                            size="lg"
                                            className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 px-8 h-12 rounded-xl text-base shadow-sm font-medium"
                                        >
                                            Start Gap Analysis <ArrowRight className="w-5 h-5 ml-2" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                }

                {/* Step: Analysis */}
                {
                    step === "analysis" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <Button variant="ghost" onClick={() => setStep("setup")} className="pl-0">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Setup
                                </Button>
                                <div className="text-right flex items-center gap-4">
                                    <div>
                                        <h2 className="font-bold text-lg">{companyName}</h2>
                                        <p className="text-sm text-slate-500">{standard}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tracker / Sticky Header */}
                            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-10">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                    <div className="flex-1">
                                        <h2 className="text-base sm:text-lg font-bold text-slate-800 flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                {standard}
                                            </Badge>
                                            <span className="hidden sm:inline text-slate-400">•</span>
                                            <span className="truncate max-w-[200px] sm:max-w-none">{companyName}</span>
                                        </h2>
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-slate-500 whitespace-nowrap">
                                        Clause {currentClauseIndex + 1} of {uniqueClauses.length}
                                    </span>
                                </div>
                                <Progress value={((currentClauseIndex + 1) / uniqueClauses.length) * 100} className="h-2 bg-slate-100" />
                                <div className="mt-4">
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{currentClause}</h3>
                                </div>
                            </div>

                            <div className="grid gap-6">
                                {questions.filter(q => q.clause === currentClause).map((q, idx) => (
                                    <Card key={q.id} className="overflow-hidden">
                                        <CardHeader className="bg-slate-50 border-b py-4">
                                            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                                                <div className="flex-1 w-full">
                                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">
                                                        Question {idx + 1}
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <Textarea
                                                            value={q.text}
                                                            onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                                                            className="font-semibold text-slate-900 border-none bg-transparent hover:bg-slate-50 focus:bg-white resize-none min-h-[60px] text-base leading-relaxed p-2 -ml-2 rounded-md transition-colors"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col lg:flex-row items-center gap-2 w-full lg:w-auto lg:min-w-[300px] justify-end">
                                                    {!q.finding ? (
                                                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse lg:mr-2">Select Finding:</span>
                                                    ) : (
                                                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider lg:mr-2">Finding:</span>
                                                    )}
                                                    <div className="flex w-full sm:w-auto bg-slate-100 p-1 rounded-lg">
                                                        <Button
                                                            size="sm"
                                                            variant={q.finding === "Comply" ? "default" : "ghost"}
                                                            className={cn(
                                                                "flex-1 px-2 sm:px-4 transition-all duration-200 h-8 sm:h-9",
                                                                q.finding === "Comply"
                                                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                                    : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            )}
                                                            onClick={() => handleAnswerChange(q.id, "finding", "Comply")}
                                                            title="Comply"
                                                        >
                                                            <CheckCircle2 className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5", q.finding === "Comply" ? "text-white" : "text-emerald-600")} />
                                                            <span className="font-medium text-[11px] sm:text-sm">Comply</span>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={q.finding === "OFI" ? "default" : "ghost"}
                                                            className={cn(
                                                                "flex-1 px-2 sm:px-4 transition-all duration-200 h-8 sm:h-9",
                                                                q.finding === "OFI"
                                                                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                                                                    : "text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                                                            )}
                                                            onClick={() => handleAnswerChange(q.id, "finding", "OFI")}
                                                            title="Opportunity for Improvement"
                                                        >
                                                            <AlertCircle className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5", q.finding === "OFI" ? "text-white" : "text-amber-500")} />
                                                            <span className="font-medium text-[11px] sm:text-sm">OFI</span>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={q.finding === "NC" ? "default" : "ghost"}
                                                            className={cn(
                                                                "flex-1 px-2 sm:px-4 transition-all duration-200 h-8 sm:h-9",
                                                                q.finding === "NC"
                                                                    ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                                                                    : "text-slate-600 hover:text-red-700 hover:bg-red-50"
                                                            )}
                                                            onClick={() => handleAnswerChange(q.id, "finding", "NC")}
                                                            title="Non-Conformity"
                                                        >
                                                            <XCircle className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5", q.finding === "NC" ? "text-white" : "text-red-600")} />
                                                            <span className="font-medium text-[11px] sm:text-sm">NC</span>
                                                        </Button>
                                                    </div>
                                                    <div className="mt-2 lg:mt-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => promptDeleteQuestion(q.id)}
                                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 ml-1 rounded-full w-8 h-8"
                                                            title="Delete Question"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 grid md:grid-cols-2 gap-6 bg-white">
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase tracking-wide text-slate-500 font-bold">Action Plan</Label>
                                                <Textarea
                                                    placeholder="Corrective action..."
                                                    value={q.actionPlan}
                                                    onChange={e => handleAnswerChange(q.id, "actionPlan", e.target.value)}
                                                    className="min-h-[80px]"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase tracking-wide text-slate-500 font-bold">Evidence / Comments</Label>
                                                <Textarea
                                                    placeholder="Evidence observed..."
                                                    value={q.evidence}
                                                    onChange={e => handleAnswerChange(q.id, "evidence", e.target.value)}
                                                    className="min-h-[80px]"
                                                />
                                            </div>

                                            {/* Evidence Image Upload – spans full width */}
                                            <div className="md:col-span-2 space-y-3">
                                                <Label className="text-xs uppercase tracking-wide text-slate-500 font-bold flex items-center gap-1.5">
                                                    <ImageIcon className="w-3.5 h-3.5" /> Upload Evidence Image
                                                </Label>

                                                {q.evidenceImage ? (
                                                    <div className="relative inline-block">
                                                        <img
                                                            src={q.evidenceImage}
                                                            alt="Evidence"
                                                            className="max-h-48 rounded-lg border border-slate-200 object-contain shadow-sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveEvidenceImage(q.id)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors shadow"
                                                            title="Remove image"
                                                        >
                                                            <XIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label
                                                        htmlFor={`evidence-image-${q.id}`}
                                                        className="flex items-center gap-2 w-fit cursor-pointer border border-dashed border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:border-[#213847] hover:text-[#213847] hover:bg-slate-50 transition-colors"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                        Choose image…
                                                        <input
                                                            id={`evidence-image-${q.id}`}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleEvidenceImageUpload(q.id, file);
                                                                e.target.value = ""; // reset so same file can be re-uploaded
                                                            }}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                <Button onClick={handleAddQuestion} variant="outline" className="w-full border-dashed border-2 py-8 text-slate-500 hover:text-emerald-600 hover:border-emerald-600 hover:bg-emerald-50">
                                    <Plus className="w-5 h-5 mr-2" /> Add Custom Question to {currentClause}
                                </Button>
                            </div>

                            <div className="flex justify-between pt-6">
                                <Button
                                    variant="outline"
                                    onClick={handlePrevClause}
                                    disabled={currentClauseIndex === 0}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous Clause
                                </Button>

                                <div className="text-sm text-slate-500 self-center">
                                    Clause {currentClauseIndex + 1} of {uniqueClauses.length}
                                </div>

                                <Button
                                    onClick={handleNextClause}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    disabled={questions.filter(q => q.clause === currentClause && !q.finding).length > 0}
                                >
                                    {currentClauseIndex < uniqueClauses.length - 1 ? (
                                        <>Next Clause <ArrowRight className="w-4 h-4 ml-2" /></>
                                    ) : (
                                        <>Finish Analysis <Award className="w-4 h-4 ml-2" /></>
                                    )}
                                </Button>
                            </div>

                            <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Question</DialogTitle>
                                        <DialogDescription>
                                            Add a custom question to <strong>{currentClause}</strong>.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Question Text</Label>
                                            <Input
                                                placeholder="Enter your question here..."
                                                value={newQuestionText}
                                                onChange={(e) => setNewQuestionText(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsAddQuestionOpen(false)}>Cancel</Button>
                                        <Button onClick={confirmAddQuestion} className="bg-emerald-600 hover:bg-emerald-700">Add Question</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <DeleteConfirmationDialog
                                open={isDeleteDialogOpen}
                                onOpenChange={setIsDeleteDialogOpen}
                                onConfirm={confirmDeleteQuestion}
                                title="Delete Question?"
                                description="Are you sure you want to delete this question? This action cannot be undone."
                            />
                        </div>
                    )
                }

                {/* Step: Results */}
                {
                    step === "results" && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <Button variant="ghost" onClick={() => setStep("list")} className="pl-0">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
                                </Button>
                                <div className="flex gap-3">
                                    <Button onClick={() => handleDownloadReport('word')} variant="outline" className="border-blue-200 hover:bg-blue-50 text-blue-700">
                                        <Download className="w-4 h-4 mr-2" /> Download Word
                                    </Button>
                                    <Button onClick={() => handleDownloadReport('pdf')} className="bg-blue-600 hover:bg-blue-700">
                                        <Download className="w-4 h-4 mr-2" /> Download PDF
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-col-1 md:grid-cols-2 gap-6">
                                {/* Summary Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Audit Summary</CardTitle>
                                        <CardDescription>Overall compliance status</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center justify-center p-6">
                                        <div className="text-center mb-6">
                                            <div className="text-5xl font-bold mb-2 text-slate-900">{results.score}%</div>
                                            <div className={cn("text-lg font-medium px-3 py-1 rounded-full inline-block", results.score >= 70 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                                {results.score >= 70 ? "Compliance Achieved" : "Requires Improvement"}
                                            </div>
                                        </div>

                                        <div ref={pieChartRef} className="w-full h-[300px] flex justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Breakdown Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Clause Breakdown</CardTitle>
                                        <CardDescription>Compliance by ISO clause</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div ref={barChartRef} className="w-full h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={results.clauseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                    <YAxis />
                                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                                    <Bar dataKey="score" name="Compliance %" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="mt-6 space-y-4">
                                            {results.clauseData.map((c, i) => (
                                                <div key={i} className="flex items-center gap-4 text-sm">
                                                    <span className="w-24 font-medium text-slate-600">{c.name}</span>
                                                    <Progress value={c.score} className="h-2" />
                                                    <span className="w-12 text-right font-bold">{c.score}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Findings Summary Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Detailed Findings Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <div className="text-3xl font-bold text-emerald-600">{results.comply}</div>
                                            <div className="text-sm text-emerald-800 font-medium">Compliant Items</div>
                                        </div>
                                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                                            <div className="text-3xl font-bold text-amber-600">{results.ofi}</div>
                                            <div className="text-sm text-amber-800 font-medium">Opportunities for Improvement</div>
                                        </div>
                                        <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                                            <div className="text-3xl font-bold text-red-600">{results.nc}</div>
                                            <div className="text-sm text-red-800 font-medium">Non-Conformities</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                }
            </div>
        </div >
    );
};

export default GapAnalysis;
