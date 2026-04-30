import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle2, Image as ImageIcon, Upload, Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auditTemplates, ChecklistContent, SectionContent, ClauseChecklistContent, ProcessAuditContent } from "@/data/auditTemplates";
import { toast } from "sonner";

const ExecuteAuditTemplate = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const template = auditTemplates.find(t => t.id === id);

    const [checklistData, setChecklistData] = useState<Record<number, { findings: string, evidence: string, ofi: string, description?: string, correction?: string, rootCause?: string, correctiveAction?: string }>>({});
    const [sectionData, setSectionData] = useState<Record<number, string>>({});
    const [clauseData, setClauseData] = useState<Record<number, ClauseChecklistContent>>({});
    const [processAudits, setProcessAudits] = useState<ProcessAuditContent[]>([]);
    
    // Editable checklist state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editableChecklist, setEditableChecklist] = useState<any[]>([]);

    const [clauseFiles, setClauseFiles] = useState<Record<string, File[]>>({});
    const [genericFiles, setGenericFiles] = useState<Record<string, File[]>>({});

    // Initialize state
    React.useEffect(() => {
        if (template?.type === 'process-audit' && processAudits.length === 0) {
            setProcessAudits([{ id: Date.now().toString(), findingType: "C" }]);
        }
        
        // Initialize editable checklist if it's a checklist template
        if ((template?.type === 'checklist' || template?.type === 'clause-checklist') && editableChecklist.length === 0) {
            // we only do this for standard checklists currently based on the type check below, but init it here safely
            setEditableChecklist((template.content as ChecklistContent[]) || []);
        }
    }, [template]);
    // Process Audit specific states
    const [auditGlobalInfo, setAuditGlobalInfo] = useState({
        refNo: "",
        clauseNo: "",
        department: "",
    });
    const [showExecutiveSummary, setShowExecutiveSummary] = useState(true);
    const [showAuditParticipants, setShowAuditParticipants] = useState(true);
    const [showAuditFindings, setShowAuditFindings] = useState(true);
    const [executiveSummary, setExecutiveSummary] = useState("");
    const [summaryCounts, setSummaryCounts] = useState({
        major: "0",
        minor: "0",
        ofi: "0",
        compliant: "0",
        positive: "0",
    });
    const [auditFindings, setAuditFindings] = useState([
        { refNo: "", clauseNo: "", details: "", category: "" }
    ]);

    // New State for Clause Checklist Extended Sections
    const [previousFindings, setPreviousFindings] = useState("");
    const [detailsOfChanges, setDetailsOfChanges] = useState([
        { item: "Scope", actionRequired: false, notes: "" },
        { item: "Boundary", actionRequired: false, notes: "" },
        { item: "Key IMS documented information", actionRequired: false, notes: "" },
        { item: "Organisational structure", actionRequired: false, notes: "" },
        { item: "Compliance Obligations", actionRequired: false, notes: "" },
        { item: "Other noteworthy changes", actionRequired: false, notes: "" }
    ]);
    const [participants, setParticipants] = useState([
        { name: "", position: "", opening: false, closing: false, interviewed: "" }
    ]);
    const [positiveAspects, setPositiveAspects] = useState([
        { id: "PA-01", standardClause: "", areaProcess: "", aspect: "" }
    ]);
    const [opportunities, setOpportunities] = useState([
        { id: "OFI-01", standardClause: "", areaProcess: "", opportunity: "" }
    ]);
    const [nonConformances, setNonConformances] = useState([
        { id: "NCR-01", standardClause: "", areaProcess: "", statement: "", dueDate: "", actionBy: "" }
    ]);


    const addParticipant = () => setParticipants([...participants, { name: "", position: "", opening: false, closing: false, interviewed: "" }]);
    const addPositiveAspect = () => setPositiveAspects([...positiveAspects, { id: `PA-${String(positiveAspects.length + 1).padStart(2, '0')}`, standardClause: "", areaProcess: "", aspect: "" }]);
    const addOpportunity = () => setOpportunities([...opportunities, { id: `OFI-${String(opportunities.length + 1).padStart(2, '0')}`, standardClause: "", areaProcess: "", opportunity: "" }]);
    const addNonConformance = () => setNonConformances([...nonConformances, { id: `NCR-${String(nonConformances.length + 1).padStart(2, '0')}`, standardClause: "", areaProcess: "", statement: "", dueDate: "", actionBy: "" }]);


    const removeParticipant = (index: number) => setParticipants(participants.filter((_, i) => i !== index));
    const removePositiveAspect = (index: number) => setPositiveAspects(positiveAspects.filter((_, i) => i !== index));
    const removeOpportunity = (index: number) => setOpportunities(opportunities.filter((_, i) => i !== index));
    const removeNonConformance = (index: number) => setNonConformances(nonConformances.filter((_, i) => i !== index));

    if (!template) {
        return <div className="p-8">Template not found</div>;
    }

    const handleChecklistChange = (index: number, field: string, value: string) => {
        const newData = { ...checklistData };
        if (!newData[index]) {
            newData[index] = { findings: "", evidence: "", ofi: "" };
        }
        newData[index] = { ...newData[index], [field]: value };
        setChecklistData(newData);
    };

    const handleClauseFileUpload = (clause: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const newFiles = Array.from(files);
        setClauseFiles(prev => ({
            ...prev,
            [clause]: [...(prev[clause] || []), ...newFiles]
        }));
        toast.success(`${newFiles.length} file(s) attached for Clause ${clause}`);
    };

    const removeClauseFile = (clause: string, indexToRemove: number) => {
        setClauseFiles(prev => ({
            ...prev,
            [clause]: prev[clause].filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleGenericFileUpload = (key: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const newFiles = Array.from(files);
        setGenericFiles(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), ...newFiles]
        }));
        toast.success(`${newFiles.length} file(s) attached`);
    };

    const removeGenericFile = (key: string, indexToRemove: number) => {
        setGenericFiles(prev => ({
            ...prev,
            [key]: prev[key].filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleSectionChange = (index: number, value: string) => {
        setSectionData(prev => ({
            ...prev,
            [index]: value
        }));
    };

    // --- Editable Checklist Handlers ---
    const handleEditQuestion = (index: number, newQuestion: string) => {
        const newList = [...editableChecklist];
        newList[index] = { ...newList[index], question: newQuestion };
        setEditableChecklist(newList);
    };

    const handleAddQuestion = (clause: string, insertAfterIndex: number) => {
        const newList = [...editableChecklist];
        const newQuestion: ChecklistContent = {
            clause,
            question: "",
            findings: "",
            evidence: "",
            ofi: ""
        };
        newList.splice(insertAfterIndex + 1, 0, newQuestion);
        setEditableChecklist(newList);
        
        // Adjust checklistData entries if needed, shift them down
        const newData: Record<number, any> = {};
        Object.keys(checklistData).forEach(key => {
            const k = parseInt(key);
            if (k > insertAfterIndex) {
                 newData[k + 1] = checklistData[k];
            } else {
                 newData[k] = checklistData[k];
            }
        });
        setChecklistData(newData);
    };

    const handleRemoveQuestion = (indexToRemove: number) => {
        if (editableChecklist.length <= 1) return; // Prevent deleting the last item entirely if needed, or just let them
        const newList = editableChecklist.filter((_, idx) => idx !== indexToRemove);
        setEditableChecklist(newList);
        
        // Adjust checklistData entries
        const newData: Record<number, any> = {};
        Object.keys(checklistData).forEach(key => {
            const k = parseInt(key);
            if (k < indexToRemove) {
                 newData[k] = checklistData[k];
            } else if (k > indexToRemove) {
                 newData[k - 1] = checklistData[k];
            }
        });
        setChecklistData(newData);
    };
    // -----------------------------------

    const handleClauseChange = (index: number, field: string, value: any) => {
        setClauseData(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                [field]: value
            }
        }));
    };

    const handleEditClauseSubClause = (clauseIndex: number, subIndex: number, newValue: string) => {
        const newList = [...editableChecklist];
        const clause = { ...newList[clauseIndex] };
        const newSubClauses = [...clause.subClauses];
        newSubClauses[subIndex] = newValue;
        clause.subClauses = newSubClauses;
        newList[clauseIndex] = clause;
        setEditableChecklist(newList);
    };

    const handleAddSubClause = (clauseIndex: number) => {
        const newList = [...editableChecklist];
        const clause = { ...newList[clauseIndex] };
        const newSubClauses = [...(clause.subClauses || []), ""];
        clause.subClauses = newSubClauses;
        newList[clauseIndex] = clause;
        setEditableChecklist(newList);
    };

    const handleRemoveSubClause = (clauseIndex: number, subIndex: number) => {
        const newList = [...editableChecklist];
        const clause = { ...newList[clauseIndex] };
        const newSubClauses = clause.subClauses.filter((_: any, i: number) => i !== subIndex);
        clause.subClauses = newSubClauses;
        newList[clauseIndex] = clause;
        setEditableChecklist(newList);
    };

    const addAuditFinding = () => setAuditFindings([...auditFindings, { refNo: "", clauseNo: "", details: "", category: "" }]);
    const removeAuditFinding = (index: number) => setAuditFindings(auditFindings.filter((_, i) => i !== index));

    const addProcessAudit = () => {
        setProcessAudits([
            ...processAudits,
            {
                id: Date.now().toString(),
                auditees: "",
                evidence: "",
                conclusion: "",
                findingType: undefined,
                description: "",
                correction: "",
                rootCause: "",
                correctiveAction: "",
            },
        ]);
    };

    const removeProcessAudit = (index: number) => {
        const newAudits = [...processAudits];
        newAudits.splice(index, 1);
        setProcessAudits(newAudits);
    };

    const updateProcessAudit = (index: number, field: string, value: any) => {
        const newAudits = [...processAudits];
        (newAudits[index] as any)[field] = value;
        setProcessAudits(newAudits);
    };

    const handleSubmit = () => {
        // Here you would typically save to backend
        console.log("Submitting Audit:", {
            templateId: template?.id,
            data: template?.type === 'checklist' ? { checklistData, editableChecklist } : template?.type === 'clause-checklist' ? clauseData : sectionData
        });
        toast.success("Audit submitted successfully!");
        navigate("/audit-templates");
    };

    return (
        <div className="flex-1 p-8 pt-6 bg-white min-h-screen">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header Navigation */}
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => navigate("/audit-templates")} className="gap-2 pl-0 hover:bg-transparent hover:text-slate-600">
                        <ArrowLeft className="w-4 h-4" /> Back to Templates
                    </Button>
                </div>

                {/* Template Info Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{template.title}</h1>
                        <p className="text-slate-500 mt-1">{template.description}</p>
                    </div>
                    <Badge className="bg-slate-600">{template.standard}</Badge>
                </div>

                {/* --- NEW EXTENDED SECTIONS --- */}
                {(template.type === 'clause-checklist' || template.type === 'checklist') && (
                    <div className="space-y-8 mb-8 bg-white rounded-lg p-6 shadow-sm border border-slate-200">

                        {/* Previous Audit Findings */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Previous Audit Findings</h3>
                            <div className="border border-slate-800 rounded-md overflow-hidden">
                                <div className="bg-slate-800 text-white font-bold p-2 text-sm">
                                    Closure of Findings from Previous Audit
                                </div>
                                <Textarea
                                    className="min-h-[150px] border-0 rounded-none focus-visible:ring-0 resize-y p-3"
                                    placeholder="Enter details of previous findings closure..."
                                    value={previousFindings}
                                    onChange={(e) => setPreviousFindings(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Details of Changes */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Details of Changes</h3>
                            <div className="border border-slate-800 rounded-md overflow-hidden overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-800">
                                        <TableRow className="hover:bg-slate-800">
                                            <TableHead className="text-white font-bold w-[40%]">Change Management monitoring in relation to:</TableHead>
                                            <TableHead className="text-white font-bold w-[15%] text-center">Action Required</TableHead>
                                            <TableHead className="text-white font-bold">Notes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detailsOfChanges.map((change, idx) => (
                                            <TableRow key={idx} className="divide-x divide-slate-200 bg-white">
                                                <TableCell className="font-medium">{change.item}</TableCell>
                                                <TableCell className="text-center align-middle">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-slate-600 rounded focus:ring-slate-500 cursor-pointer"
                                                        checked={change.actionRequired}
                                                        onChange={(e) => {
                                                            const newChanges = [...detailsOfChanges];
                                                            newChanges[idx].actionRequired = e.target.checked;
                                                            setDetailsOfChanges(newChanges);
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        className="border-0 focus-visible:ring-0 rounded-none bg-transparent"
                                                        value={change.notes}
                                                        onChange={(e) => {
                                                            const newChanges = [...detailsOfChanges];
                                                            newChanges[idx].notes = e.target.value;
                                                            setDetailsOfChanges(newChanges);
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Audit Participants */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Audit Participants</h3>
                            <div className="border border-slate-800 rounded-md overflow-hidden overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-800">
                                        <TableRow className="hover:bg-slate-800">
                                            <TableHead className="text-white font-bold w-[25%]">Name</TableHead>
                                            <TableHead className="text-white font-bold w-[25%]">Position</TableHead>
                                            <TableHead className="text-white font-bold w-[10%] text-center leading-tight">Opening<br />meeting</TableHead>
                                            <TableHead className="text-white font-bold w-[10%] text-center leading-tight">Closing<br />meeting</TableHead>
                                            <TableHead className="text-white font-bold w-[25%] leading-tight">Interviewed<br />(processes)</TableHead>
                                            <TableHead className="w-[5%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {participants.map((p, idx) => (
                                            <TableRow key={idx} className="divide-x divide-slate-200 bg-white">
                                                <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={p.name} onChange={(e) => { const n = [...participants]; n[idx].name = e.target.value; setParticipants(n) }} /></TableCell>
                                                <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={p.position} onChange={(e) => { const n = [...participants]; n[idx].position = e.target.value; setParticipants(n) }} /></TableCell>
                                                <TableCell className="text-center align-middle"><input type="checkbox" className="w-4 h-4 cursor-pointer" checked={p.opening} onChange={(e) => { const n = [...participants]; n[idx].opening = e.target.checked; setParticipants(n) }} /></TableCell>
                                                <TableCell className="text-center align-middle"><input type="checkbox" className="w-4 h-4 cursor-pointer" checked={p.closing} onChange={(e) => { const n = [...participants]; n[idx].closing = e.target.checked; setParticipants(n) }} /></TableCell>
                                                <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={p.interviewed} onChange={(e) => { const n = [...participants]; n[idx].interviewed = e.target.value; setParticipants(n) }} /></TableCell>
                                                <TableCell className="p-2 text-center">
                                                    {participants.length > 1 && (
                                                        <Trash2 className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-700 mx-auto" onClick={() => removeParticipant(idx)} />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="bg-slate-50 p-2 border-t border-slate-200">
                                    <Button variant="outline" size="sm" onClick={addParticipant} className="gap-2 text-slate-700 border-slate-200 hover:bg-slate-50">
                                        <Plus className="w-4 h-4" /> Add Participant
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Audit Findings Summary */}
                        <div className="space-y-6 pt-6 border-t border-slate-200">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">Audit Findings</h3>

                                {/* Positive Aspects */}
                                <div className="space-y-3 mb-8">
                                    <h4 className="font-bold text-lg text-slate-800">Positive Aspects</h4>
                                    <div className="border border-slate-800 rounded-md overflow-hidden overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-800">
                                                <TableRow className="hover:bg-slate-800">
                                                    <TableHead className="text-white font-bold w-[8%]">No.</TableHead>
                                                    <TableHead className="text-white font-bold w-[20%]">Standard &<br />Clause No.</TableHead>
                                                    <TableHead className="text-white font-bold w-[25%]">Area / Process</TableHead>
                                                    <TableHead className="text-white font-bold">Positive Aspect</TableHead>
                                                    <TableHead className="w-[5%]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {positiveAspects.map((pa, idx) => (
                                                    <TableRow key={idx} className="divide-x divide-slate-200 bg-white">
                                                        <TableCell className="font-medium bg-slate-50">{pa.id}</TableCell>
                                                        <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={pa.standardClause} onChange={(e) => { const n = [...positiveAspects]; n[idx].standardClause = e.target.value; setPositiveAspects(n) }} /></TableCell>
                                                        <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={pa.areaProcess} onChange={(e) => { const n = [...positiveAspects]; n[idx].areaProcess = e.target.value; setPositiveAspects(n) }} /></TableCell>
                                                        <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={pa.aspect} onChange={(e) => { const n = [...positiveAspects]; n[idx].aspect = e.target.value; setPositiveAspects(n) }} /></TableCell>
                                                        <TableCell className="p-2 text-center">
                                                            {positiveAspects.length > 1 && (
                                                                <Trash2 className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-700 mx-auto" onClick={() => removePositiveAspect(idx)} />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <div className="bg-slate-50 p-2 border-t border-slate-200">
                                            <Button variant="outline" size="sm" onClick={addPositiveAspect} className="gap-2 text-slate-700 border-slate-200 hover:bg-slate-50">
                                                <Plus className="w-4 h-4" /> Add Row
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Opportunities for Improvement */}
                                <div className="space-y-3 mb-8">
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800">Opportunities identified during the audit:</h4>
                                        <p className="text-sm text-slate-600">The following recommendations and advice of the auditors will help to ensure the continuous improvement of the management system. Implementation by the company is suggested.</p>
                                    </div>
                                    <div className="border border-slate-800 rounded-md overflow-hidden overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-800">
                                                <TableRow className="hover:bg-slate-800">
                                                    <TableHead className="text-white font-bold w-[8%]">No.</TableHead>
                                                    <TableHead className="text-white font-bold w-[20%]">Standard<br />Clause Number</TableHead>
                                                    <TableHead className="text-white font-bold w-[25%]">Area / Process</TableHead>
                                                    <TableHead className="text-white font-bold">Opportunity for Improvement</TableHead>
                                                    <TableHead className="w-[5%]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {opportunities.map((ofi, idx) => (
                                                    <TableRow key={idx} className="divide-x divide-slate-200 bg-white">
                                                        <TableCell className="font-medium bg-slate-50">{ofi.id}</TableCell>
                                                        <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={ofi.standardClause} onChange={(e) => { const n = [...opportunities]; n[idx].standardClause = e.target.value; setOpportunities(n) }} /></TableCell>
                                                        <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={ofi.areaProcess} onChange={(e) => { const n = [...opportunities]; n[idx].areaProcess = e.target.value; setOpportunities(n) }} /></TableCell>
                                                        <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={ofi.opportunity} onChange={(e) => { const n = [...opportunities]; n[idx].opportunity = e.target.value; setOpportunities(n) }} /></TableCell>
                                                        <TableCell className="p-2 text-center">
                                                            {opportunities.length > 1 && (
                                                                <Trash2 className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-700 mx-auto" onClick={() => removeOpportunity(idx)} />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <div className="bg-slate-50 p-2 border-t border-slate-200">
                                            <Button variant="outline" size="sm" onClick={addOpportunity} className="gap-2 text-slate-700 border-slate-200 hover:bg-slate-50">
                                                <Plus className="w-4 h-4" /> Add Row
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Non-conformance */}
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800">Non-conformance</h4>
                                        <p className="text-sm text-slate-600">In part incomplete compliance with the standard requirements, but effectiveness of audited management system element (chapter in the standard) not put into question. Implementation of the recommended actions will be verified during the next audit.</p>
                                    </div>
                                    <div className="border border-slate-800 rounded-md overflow-hidden overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-800">
                                                <TableRow className="hover:bg-slate-800">
                                                    <TableHead className="text-white font-bold w-[8%]">No.</TableHead>
                                                    <TableHead className="text-white font-bold w-[18%]">Standard &<br />Clause No.</TableHead>
                                                    <TableHead className="text-white font-bold w-[20%]">Area / Process</TableHead>
                                                    <TableHead className="text-white font-bold">Statement of Non-conformance</TableHead>
                                                    <TableHead className="text-white font-bold w-[12%]">Due Date</TableHead>
                                                    <TableHead className="text-white font-bold w-[13%]">Action By</TableHead>
                                                    <TableHead className="w-[5%]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {nonConformances.map((ncr, idx) => (
                                                    <TableRow key={idx} className="divide-x divide-slate-200 bg-white">
                                                        <TableCell className="font-medium bg-slate-50">{ncr.id}</TableCell>
                                                        <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={ncr.standardClause} onChange={(e) => { const n = [...nonConformances]; n[idx].standardClause = e.target.value; setNonConformances(n) }} /></TableCell>
                                                        <TableCell className="p-1"><Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={ncr.areaProcess} onChange={(e) => { const n = [...nonConformances]; n[idx].areaProcess = e.target.value; setNonConformances(n) }} /></TableCell>
                                                        <TableCell className="p-1"><Textarea className="min-h-[60px] border-0 focus-visible:ring-0 rounded-none bg-transparent resize-y" value={ncr.statement} onChange={(e) => { const n = [...nonConformances]; n[idx].statement = e.target.value; setNonConformances(n) }} /></TableCell>
                                                        <TableCell className="p-1"><Input type="date" className="border-0 focus-visible:ring-0 rounded-none bg-transparent" value={ncr.dueDate} onChange={(e) => { const n = [...nonConformances]; n[idx].dueDate = e.target.value; setNonConformances(n) }} /></TableCell>
                                                        <TableCell className="p-2 text-center">
                                                            {nonConformances.length > 1 && (
                                                                <Trash2 className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-700 mx-auto" onClick={() => removeNonConformance(idx)} />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <div className="bg-slate-50 p-2 border-t border-slate-200">
                                            <Button variant="outline" size="sm" onClick={addNonConformance} className="gap-2 text-slate-700 border-slate-200 hover:bg-slate-50">
                                                <Plus className="w-4 h-4" /> Add Row
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {/* Process Audit Report Options */}
                {template.type === 'process-audit' && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                <FileText className="w-5 h-5 text-emerald-600" />
                                Process Audit Report Options
                            </h3>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                        checked={showExecutiveSummary}
                                        onChange={(e) => setShowExecutiveSummary(e.target.checked)}
                                    />
                                    <span className="text-sm font-bold text-slate-700">
                                        Executive Summary
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                        checked={showAuditParticipants}
                                        onChange={(e) => setShowAuditParticipants(e.target.checked)}
                                    />
                                    <span className="text-sm font-bold text-slate-700">
                                        Audit Participants
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                        checked={showAuditFindings}
                                        onChange={(e) => setShowAuditFindings(e.target.checked)}
                                    />
                                    <span className="text-sm font-bold text-slate-700">
                                        Audit Findings
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Metadata Table (The requested 3 columns) */}
                        <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
                            <Table>
                                <TableHeader className="bg-slate-800">
                                    <TableRow className="hover:bg-slate-800 divide-x divide-slate-600">
                                        <TableHead className="font-bold text-white px-4 py-3">Reference No.</TableHead>
                                        <TableHead className="font-bold text-white px-4 py-3">ISO Standard / Clause No.</TableHead>
                                        <TableHead className="font-bold text-white px-4 py-3">Department / Area</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-white divide-x divide-slate-200">
                                        <TableCell className="p-0">
                                            <Input
                                                className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-12 px-4 shadow-none"
                                                placeholder="Enter Reference No..."
                                                value={auditGlobalInfo.refNo}
                                                onChange={(e) => setAuditGlobalInfo({ ...auditGlobalInfo, refNo: e.target.value })}
                                            />
                                        </TableCell>
                                        <TableCell className="p-0">
                                            <Input
                                                className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-12 px-4 shadow-none"
                                                placeholder="Enter Standard or Clause..."
                                                value={auditGlobalInfo.clauseNo}
                                                onChange={(e) => setAuditGlobalInfo({ ...auditGlobalInfo, clauseNo: e.target.value })}
                                            />
                                        </TableCell>
                                        <TableCell className="p-0">
                                            <Input
                                                className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-12 px-4 shadow-none"
                                                placeholder="Enter Department or Area..."
                                                value={auditGlobalInfo.department}
                                                onChange={(e) => setAuditGlobalInfo({ ...auditGlobalInfo, department: e.target.value })}
                                            />
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Executive Summary & Findings Overview */}
                        {(showExecutiveSummary || showAuditParticipants || showAuditFindings) && (
                            <div className="space-y-8 bg-white rounded-xl p-6 shadow-sm border border-slate-200 mt-6">
                                {showExecutiveSummary && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
                                            Executive Summary
                                        </h3>
                                        <div className="border-2 border-slate-800 rounded-lg overflow-hidden shadow-sm bg-white">
                                            <Textarea
                                                className="min-h-[200px] border-0 border-b border-slate-800 rounded-none focus-visible:ring-0 resize-y p-6 text-base bg-white placeholder:text-slate-300"
                                                placeholder="Type your overall audit summary here..."
                                                value={executiveSummary}
                                                onChange={(e) => setExecutiveSummary(e.target.value)}
                                            />
                                            {/* Refined Executive Summary Table - Single row with 8 cells */}
                                            <Table>
                                                <TableHeader className="bg-slate-800">
                                                    <TableRow className="hover:bg-slate-800 border-b-0 divide-x divide-slate-600">
                                                        <TableHead className="font-bold text-white border-none px-4 py-3 text-center text-xs">Major NCs</TableHead>
                                                        <TableHead className="bg-white p-0 w-16"></TableHead>
                                                        <TableHead className="font-bold text-white border-none px-4 py-3 text-center text-xs">Minor NCs</TableHead>
                                                        <TableHead className="bg-white p-0 w-16"></TableHead>
                                                        <TableHead className="font-bold text-white border-none px-4 py-3 text-center text-xs">OFIs</TableHead>
                                                        <TableHead className="bg-white p-0 w-16"></TableHead>
                                                        <TableHead className="font-bold text-white border-none px-4 py-3 text-center text-xs">Compliant</TableHead>
                                                        <TableHead className="bg-white p-0 w-16"></TableHead>
                                                        <TableHead className="font-bold text-white border-none px-4 py-3 text-center text-xs whitespace-nowrap">Positive Aspect</TableHead>
                                                        <TableHead className="bg-white p-0 w-16"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow className="bg-white hover:bg-slate-50 transition-colors border-0 divide-x divide-slate-200">
                                                        <TableCell className="p-0 bg-slate-800"></TableCell>
                                                        <TableCell className="p-0">
                                                            <Input
                                                                className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-10 px-2 shadow-none text-center font-bold"
                                                                value={summaryCounts.major}
                                                                onChange={(e) => setSummaryCounts({ ...summaryCounts, major: e.target.value })}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-0 bg-slate-800"></TableCell>
                                                        <TableCell className="p-0">
                                                            <Input
                                                                className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-10 px-2 shadow-none text-center font-bold"
                                                                value={summaryCounts.minor}
                                                                onChange={(e) => setSummaryCounts({ ...summaryCounts, minor: e.target.value })}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-0">
                                                            <Input
                                                                className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-10 px-2 shadow-none text-center font-bold"
                                                                value={summaryCounts.ofi}
                                                                onChange={(e) => setSummaryCounts({ ...summaryCounts, ofi: e.target.value })}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-0 bg-slate-800"></TableCell>
                                                        <TableCell className="p-0">
                                                            <Input
                                                                className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-10 px-2 shadow-none text-center font-bold"
                                                                value={summaryCounts.compliant}
                                                                onChange={(e) => setSummaryCounts({ ...summaryCounts, compliant: e.target.value })}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-0 bg-slate-800"></TableCell>
                                                        <TableCell className="p-0">
                                                            <Input
                                                                className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-10 px-2 shadow-none text-center font-bold"
                                                                value={summaryCounts.positive}
                                                                onChange={(e) => setSummaryCounts({ ...summaryCounts, positive: e.target.value })}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}

                                {showAuditParticipants && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
                                            Audit Participants
                                        </h3>
                                        <div className="border-2 border-slate-800 rounded-lg overflow-hidden overflow-x-auto shadow-sm">
                                            <Table>
                                                <TableHeader className="bg-slate-800">
                                                    <TableRow className="hover:bg-slate-800 divide-x divide-slate-600">
                                                        <TableHead className="font-bold text-white w-[25%] px-4 py-3">Name</TableHead>
                                                        <TableHead className="font-bold text-white w-[25%] px-4 py-3">Position</TableHead>
                                                        <TableHead className="font-bold text-white w-[12%] text-center px-2 py-3 leading-tight">Opening meeting</TableHead>
                                                        <TableHead className="font-bold text-white w-[12%] text-center px-2 py-3 leading-tight">Closing meeting</TableHead>
                                                        <TableHead className="font-bold text-white w-[26%] px-4 py-3 leading-tight">Interviewed (processes)</TableHead>
                                                        <TableHead className="w-[50px] bg-slate-800"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {participants.map((p, idx) => (
                                                        <TableRow key={idx} className="bg-white hover:bg-slate-50 transition-colors divide-x divide-slate-200">
                                                            <TableCell className="p-0">
                                                                <Input
                                                                    placeholder="Enter Name..."
                                                                    className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[48px] px-4 shadow-none"
                                                                    value={p.name}
                                                                    onChange={(e) => {
                                                                        const n = [...participants];
                                                                        n[idx].name = e.target.value;
                                                                        setParticipants(n);
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="p-0">
                                                                <Input
                                                                    placeholder="Enter Position..."
                                                                    className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[48px] px-4 shadow-none"
                                                                    value={p.position}
                                                                    onChange={(e) => {
                                                                        const n = [...participants];
                                                                        n[idx].position = e.target.value;
                                                                        setParticipants(n);
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="p-0 text-center align-middle">
                                                                <div className="flex justify-center items-center h-full min-h-[48px]">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4 cursor-pointer accent-emerald-600"
                                                                        checked={p.opening}
                                                                        onChange={(e) => {
                                                                            const n = [...participants];
                                                                            n[idx].opening = e.target.checked;
                                                                            setParticipants(n);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="p-0 text-center align-middle">
                                                                <div className="flex justify-center items-center h-full min-h-[48px]">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4 cursor-pointer accent-emerald-600"
                                                                        checked={p.closing}
                                                                        onChange={(e) => {
                                                                            const n = [...participants];
                                                                            n[idx].closing = e.target.checked;
                                                                            setParticipants(n);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="p-0">
                                                                <Input
                                                                    placeholder="Enter processes interviewed..."
                                                                    className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[48px] px-4 shadow-none"
                                                                    value={p.interviewed}
                                                                    onChange={(e) => {
                                                                        const n = [...participants];
                                                                        n[idx].interviewed = e.target.value;
                                                                        setParticipants(n);
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="p-0 text-center align-middle">
                                                                {participants.length > 1 && (
                                                                    <Trash2
                                                                        className="w-4 h-4 text-slate-400 cursor-pointer hover:text-red-500 mx-auto transition-colors"
                                                                        onClick={() => removeParticipant(idx)}
                                                                    />
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <div className="bg-slate-50 p-2 border-t border-slate-200 flex justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={addParticipant}
                                                    className="text-emerald-700 font-bold hover:bg-emerald-50 hover:text-emerald-800 gap-2 px-6"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Another Participant
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showAuditFindings && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
                                            Audit Findings
                                        </h3>
                                        <div className="border-2 border-slate-800 rounded-lg overflow-hidden overflow-x-auto shadow-sm">
                                            <Table>
                                                <TableHeader className="bg-slate-800">
                                                    <TableRow className="hover:bg-slate-800 divide-x divide-slate-600">
                                                        <TableHead className="font-bold text-white w-[15%] px-4 py-3">Ref No.</TableHead>
                                                        <TableHead className="font-bold text-white w-[15%] px-4 py-3">Clause No.</TableHead>
                                                        <TableHead className="font-bold text-white w-[50%] px-4 py-3">Details of finding[s] raised</TableHead>
                                                        <TableHead className="font-bold text-white w-[20%] text-center px-4 py-3">Category of Finding</TableHead>
                                                        <TableHead className="w-[50px] bg-slate-800"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {auditFindings.map((finding, idx) => (
                                                        <TableRow key={idx} className="bg-white hover:bg-slate-50 transition-colors divide-x divide-slate-200">
                                                            <TableCell className="p-0">
                                                                <Input
                                                                    className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[48px] px-4 shadow-none"
                                                                    placeholder="Ref..."
                                                                    value={finding.refNo}
                                                                    onChange={(e) => {
                                                                        const n = [...auditFindings];
                                                                        n[idx].refNo = e.target.value;
                                                                        setAuditFindings(n);
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="p-0">
                                                                <Input
                                                                    className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[48px] px-4 shadow-none"
                                                                    placeholder="Clause..."
                                                                    value={finding.clauseNo}
                                                                    onChange={(e) => {
                                                                        const n = [...auditFindings];
                                                                        n[idx].clauseNo = e.target.value;
                                                                        setAuditFindings(n);
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="p-0">
                                                                <Input
                                                                    className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[48px] px-4 shadow-none"
                                                                    placeholder="Enter finding details..."
                                                                    value={finding.details}
                                                                    onChange={(e) => {
                                                                        const n = [...auditFindings];
                                                                        n[idx].details = e.target.value;
                                                                        setAuditFindings(n);
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="p-0">
                                                                <Input
                                                                    className="border-0 focus-visible:ring-0 text-center rounded-none bg-transparent min-h-[48px] px-4 shadow-none"
                                                                    placeholder="Category..."
                                                                    value={finding.category}
                                                                    onChange={(e) => {
                                                                        const n = [...auditFindings];
                                                                        n[idx].category = e.target.value;
                                                                        setAuditFindings(n);
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="p-0 text-center align-middle">
                                                                {auditFindings.length > 1 && (
                                                                    <Trash2
                                                                        className="w-4 h-4 text-slate-400 cursor-pointer hover:text-red-500 mx-auto transition-colors"
                                                                        onClick={() => removeAuditFinding(idx)}
                                                                    />
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <div className="bg-slate-50 p-2 border-t border-slate-200 flex justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={addAuditFinding}
                                                    className="text-emerald-700 font-bold hover:bg-emerald-50 hover:text-emerald-800 gap-2 px-6"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Another Finding
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Repeatable Audits */}
                        <div className="flex items-center gap-3 py-2 mt-8">
                            <div className="h-0.5 flex-1 bg-slate-700"></div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">
                                Audit Reports
                            </span>
                            <div className="h-0.5 flex-1 bg-slate-700"></div>
                        </div>

                        {processAudits.map((audit, index) => {
                            const type = audit.findingType;
                            const showExtended = type === "Minor" || type === "Major" || type === "OFI" || type === "C";

                            return (
                                <Card key={audit.id} className="overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between bg-slate-800 text-white p-4">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <span className="bg-white/20 px-2 py-0.5 rounded text-sm shrink-0">#{index + 1}</span>
                                            Audit Report
                                        </h3>
                                        {processAudits.length > 1 && (
                                            <Button variant="ghost" size="sm" className="text-white hover:bg-red-500/20 hover:text-red-400" onClick={() => removeProcessAudit(index)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <CardContent className="p-0 bg-white text-slate-900 flex flex-col">
                                        <Table>
                                            <TableBody>
                                                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                                                    <TableCell className="w-[30%] font-bold text-slate-700 bg-slate-50 border-r align-top py-4">Auditee[s]</TableCell>
                                                    <TableCell className="p-0 align-top">
                                                        <Input className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[50px] px-4 shadow-none" value={audit.auditees} onChange={(e) => updateProcessAudit(index, "auditees", e.target.value)} />
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                                                    <TableCell colSpan={2} className="font-bold text-slate-700 bg-slate-50 p-4 border-b">Evidence to support the audit conclusion</TableCell>
                                                </TableRow>
                                                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                                                    <TableCell colSpan={2} className="p-0">
                                                        <Textarea className="w-full min-h-[120px] border-0 focus-visible:ring-0 rounded-none bg-transparent resize-y p-5 shadow-none" value={audit.evidence} onChange={(e) => updateProcessAudit(index, "evidence", e.target.value)} />
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                                                    <TableCell colSpan={2} className="font-bold text-slate-700 bg-slate-50 p-4 border-b">Conclusion of the overall effectiveness of the process</TableCell>
                                                </TableRow>
                                                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                                                    <TableCell colSpan={2} className="p-0">
                                                        <Textarea className="w-full min-h-[120px] border-0 focus-visible:ring-0 rounded-none bg-transparent resize-y p-5 shadow-none" value={audit.conclusion} onChange={(e) => updateProcessAudit(index, "conclusion", e.target.value)} />
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>

                                        <div className="p-5 border-t border-slate-100 flex flex-col gap-6 bg-slate-50/30">
                                            <div className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                <span className="text-sm font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Category of Finding:</span>
                                                <div className="flex gap-2 flex-wrap">
                                                    {[
                                                        { label: "Compliant (C)", value: "C" as const, color: "bg-emerald-500" },
                                                        { label: "OFI", value: "OFI" as const, color: "bg-amber-500" },
                                                        { label: "Minor N/C", value: "Minor" as const, color: "bg-orange-600" },
                                                        { label: "Major N/C", value: "Major" as const, color: "bg-red-600" },
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => updateProcessAudit(index, "findingType", type === opt.value ? undefined : opt.value)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border shadow-sm ${type === opt.value ? `${opt.color} text-white border-transparent scale-[1.02] shadow-md ring-2 ring-slate-200 ring-offset-1` : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {showExtended && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border-slate-200 animate-in fade-in slide-in-from-top-2">
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">Description of Finding</Label>
                                                        <Textarea className="bg-slate-50 border-slate-200 text-slate-900 min-h-[100px] resize-y p-3 focus:bg-white" value={audit.description || ""} onChange={(e) => updateProcessAudit(index, "description", e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">Correction Done</Label>
                                                        <Textarea className="bg-slate-50 border-slate-200 text-slate-900 min-h-[100px] resize-y p-3 focus:bg-white" value={audit.correction || ""} onChange={(e) => updateProcessAudit(index, "correction", e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">Root Cause</Label>
                                                        <Textarea className="bg-slate-50 border-slate-200 text-slate-900 min-h-[100px] resize-y p-3 focus:bg-white" value={audit.rootCause || ""} onChange={(e) => updateProcessAudit(index, "rootCause", e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">Corrective Action</Label>
                                                        <Textarea className="bg-slate-50 border-slate-200 text-slate-900 min-h-[100px] resize-y p-3 focus:bg-white" value={audit.correctiveAction || ""} onChange={(e) => updateProcessAudit(index, "correctiveAction", e.target.value)} />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-center p-4 border-2 border-dashed border-slate-200 bg-white rounded-xl hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all group">
                                                <div className="flex items-center gap-3 text-slate-500 group-hover:text-slate-800 font-medium">
                                                    <div className="bg-slate-100 p-2 rounded-full group-hover:bg-slate-200 transition-colors">
                                                        <Upload className="w-4 h-4" />
                                                    </div>
                                                    <span>Add / Upload / Insert record or picture</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        <Button
                            variant="outline"
                            className="w-full py-8 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 font-bold hover:text-emerald-800 hover:border-emerald-400 transition-all gap-2"
                            onClick={addProcessAudit}
                        >
                            <Plus className="w-5 h-5" /> Add Another Audit Report Section
                        </Button>
                    </div>
                )}

                {/* Dynamic Content Based on Type */}
                {template.type === 'clause-checklist' ? (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800">Clause Checklist Details</h3>
                            <Button 
                                variant={isEditMode ? "default" : "outline"} 
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={isEditMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-amber-700 border-amber-200 hover:bg-amber-50"}
                            >
                                {isEditMode ? "Done Editing" : "Edit Clauses"}
                            </Button>
                        </div>
                        {(editableChecklist as ClauseChecklistContent[]).map((clause, index) => {
                            const currentData = clauseData[index] || {} as ClauseChecklistContent;
                            const type = currentData.findingType;
                            const showExtended = type === 'Minor' || type === 'Major' || type === 'OFI';
                            const isCompliance = type === 'C';

                            return (
                                <Card key={index} className="overflow-hidden border border-slate-200 shadow-sm">
                                    {/* Green Header */}
                                    <div className="bg-slate-900 text-white p-4">
                                        <h3 className="text-xl font-bold">Clause {clause.clauseId} {clause.title}</h3>
                                        <div className="mt-2 text-sm text-slate-100/90 space-y-2 italic">
                                            {clause.subClauses.map((sub, i) => (
                                                <div key={i} className="flex items-center gap-2 group">
                                                    {isEditMode ? (
                                                        <>
                                                            <Input 
                                                                value={sub}
                                                                onChange={(e) => handleEditClauseSubClause(index, i, e.target.value)}
                                                                className="bg-white/10 border-white/20 text-white h-8 text-sm focus:bg-white/20"
                                                            />
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 w-8 text-red-300 hover:text-red-100 p-0"
                                                                onClick={() => handleRemoveSubClause(index, i)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <div>{sub}</div>
                                                    )}
                                                </div>
                                            ))}
                                            {isEditMode && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-white/70 hover:text-white h-8 px-2"
                                                    onClick={() => handleAddSubClause(index)}
                                                >
                                                    <Plus className="w-4 h-4 mr-1" /> Add Question/Sub-clause
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <CardContent className="p-4 bg-white text-slate-900 min-h-[100px] flex flex-col gap-4">
                                        {/* Finding Type Selector */}
                                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                            <span className="text-sm font-medium text-slate-700">Finding Type:</span>
                                            <div className="flex gap-2">
                                                {[
                                                    { label: 'Compliant (C)', value: 'C', color: 'bg-emerald-500 hover:bg-emerald-600' },
                                                    { label: 'OFI', value: 'OFI', color: 'bg-yellow-600 hover:bg-yellow-700' },
                                                    { label: 'Minor', value: 'Minor', color: 'bg-orange-600 hover:bg-orange-700' },
                                                    { label: 'Major', value: 'Major', color: 'bg-red-600 hover:bg-red-700' }
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => handleClauseChange(index, 'findingType', opt.value)}
                                                        className={`px-4 py-1.5 rounded text-xs font-bold transition-all border ${type === opt.value
                                                            ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-500/50 scale-105'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Initial Finding Input */}
                                        {!showExtended && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <Label className="text-slate-700">Finding Details</Label>
                                                <Textarea
                                                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                                                    placeholder="Enter initial findings..."
                                                    value={currentData.findingDetails || ""}
                                                    onChange={(e) => handleClauseChange(index, 'findingDetails', e.target.value)}
                                                />
                                            </div>
                                        )}

                                        {/* Extended Fields for Non-Compliance/OFI */}
                                        {showExtended && (
                                            <div className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">Description of Finding {type === 'OFI' ? '(Optional)' : '*'}</Label>
                                                    <Textarea
                                                        className="bg-white border-slate-200 text-slate-900"
                                                        value={currentData.description || ""}
                                                        onChange={(e) => handleClauseChange(index, 'description', e.target.value)}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">Correction Done {type === 'OFI' ? '(Optional)' : '*'}</Label>
                                                    <Textarea
                                                        className="bg-white border-slate-200 text-slate-900"
                                                        placeholder="What immediate action was taken?"
                                                        value={currentData.correction || ""}
                                                        onChange={(e) => handleClauseChange(index, 'correction', e.target.value)}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">Root Cause {type === 'OFI' ? '(Optional)' : '*'}</Label>
                                                    <Textarea
                                                        className="bg-white border-slate-200 text-slate-900"
                                                        placeholder="Why did this happen?"
                                                        value={currentData.rootCause || ""}
                                                        onChange={(e) => handleClauseChange(index, 'rootCause', e.target.value)}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">Corrective Action {type === 'OFI' ? '(Optional)' : '*'}</Label>
                                                    <Textarea
                                                        className="bg-white border-slate-200 text-slate-900"
                                                        placeholder="Action to prevent recurrence"
                                                        value={currentData.correctiveAction || ""}
                                                        onChange={(e) => handleClauseChange(index, 'correctiveAction', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Footer / Upload */}
                                        <div className="border-t border-slate-200 pt-3 mt-2 flex flex-col gap-3">
                                            <label className="flex items-center justify-center p-4 border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 bg-slate-50/50 cursor-pointer transition-colors group">
                                                <input
                                                    type="file"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => handleGenericFileUpload(`clause_checklist_${index}`, e.target.files)}
                                                />
                                                <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-700">
                                                    <Upload className="w-4 h-4" />
                                                    <span>Add / Upload / Insert record or picture</span>
                                                </div>
                                            </label>

                                            {genericFiles[`clause_checklist_${index}`] && genericFiles[`clause_checklist_${index}`].length > 0 && (
                                                <div className="w-full flex flex-col gap-2 p-2">
                                                    <span className="text-xs font-bold text-slate-500 uppercase">Attached Files</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {genericFiles[`clause_checklist_${index}`].map((file, fileIdx) => (
                                                            <div key={fileIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs shadow-sm">
                                                                <FileText className="w-4 h-4 text-emerald-600" />
                                                                <span className="max-w-[150px] truncate" title={file.name}>{file.name}</span>
                                                                <Trash2
                                                                    className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 cursor-pointer ml-1 transition-colors"
                                                                    onClick={() => removeGenericFile(`clause_checklist_${index}`, fileIdx)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                    </div>
                ) : template.type === 'section' ? (
                    <div className="space-y-6">
                        {(template.content as SectionContent[]).map((section, index) => (
                            <Card key={index} className="overflow-hidden border-2 border-slate-200">
                                <CardHeader className="bg-amber-700/90 text-white py-3 px-4">
                                    <CardTitle className="text-lg font-medium">{section.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Textarea
                                        className="min-h-[150px] border-0 focus-visible:ring-0 rounded-none resize-y p-4 text-base"
                                        placeholder={section.placeholder}
                                        value={sectionData[index] || ""}
                                        onChange={e => handleSectionChange(index, e.target.value)}
                                    />
                                    <div className="border-t border-slate-100 bg-slate-50 flex flex-col items-center justify-center">
                                        <label className="w-full p-2 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 text-sm">
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => handleGenericFileUpload(`section_${index}`, e.target.files)}
                                            />
                                            <Upload className="w-4 h-4" />
                                            <span>Add / Upload / Insert record or picture</span>
                                        </label>

                                        {genericFiles[`section_${index}`] && genericFiles[`section_${index}`].length > 0 && (
                                            <div className="w-full p-3 border-t border-slate-200 bg-white flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase px-1">Attached Files</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {genericFiles[`section_${index}`].map((file, fileIdx) => (
                                                        <div key={fileIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs shadow-sm">
                                                            <FileText className="w-4 h-4 text-emerald-600" />
                                                            <span className="max-w-[150px] truncate" title={file.name}>{file.name}</span>
                                                            <Trash2
                                                                className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 cursor-pointer ml-1 transition-colors"
                                                                onClick={() => removeGenericFile(`section_${index}`, fileIdx)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : template.type === 'process-audit' ? (
                    null
                ) : (template.type === 'checklist') && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800">Checklist Questions</h3>
                            <Button 
                                variant={isEditMode ? "default" : "outline"} 
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={isEditMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-amber-700 border-amber-200 hover:bg-amber-50"}
                            >
                                {isEditMode ? (
                                    <>Done Editing</>
                                ) : (
                                    <><span className="mr-2">✏️</span> Edit Questions</>
                                )}
                            </Button>
                        </div>
                        <Card className="overflow-hidden border border-slate-200 shadow-sm">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                                            <TableHead className="w-[80px] font-bold text-slate-900 border-r border-slate-200">Clause</TableHead>
                                            <TableHead className={`${isEditMode ? 'w-[75%]' : 'w-[35%]'} font-bold text-slate-900 border-r border-slate-200`}>Audit Question</TableHead>
                                            {!isEditMode && (
                                                <>
                                                    <TableHead className="w-[25%] font-bold text-slate-900 text-center border-r border-slate-200 bg-slate-50/50">Audit Findings</TableHead>
                                                    <TableHead className="w-[35%] font-bold text-slate-900 text-center">Audit Evidence</TableHead>
                                                </>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                <TableBody>
                                    {editableChecklist.map((item, index, array) => {
                                        const showClause = index === 0 || array[index - 1].clause !== item.clause;
                                        const isLastInGroup = index === array.length - 1 || array[index + 1].clause !== item.clause;

                                        return (
                                            <React.Fragment key={`${index}-${item.clause}`}>
                                                <TableRow className={`divide-x divide-slate-100 ${!isLastInGroup && !isEditMode ? 'border-b-0' : ''}`}>
                                                    <TableCell className={`font-medium align-top ${showClause ? 'bg-slate-50/50' : 'bg-transparent text-transparent select-none border-t-0'}`}>
                                                        {showClause ? item.clause : ''}
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        {isEditMode ? (
                                                            <div className="flex items-start gap-2">
                                                                <Textarea 
                                                                    value={item.question}
                                                                    onChange={(e) => handleEditQuestion(index, e.target.value)}
                                                                    className="min-h-[80px] resize-y"
                                                                    placeholder="Enter question text..."
                                                                />
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                                                    onClick={() => handleRemoveQuestion(index)}
                                                                    title="Delete Question"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            item.question
                                                        )}
                                                    </TableCell>

                                                    {/* Findings & Evidence - Hidden in Edit Mode */}
                                                    {!isEditMode && (
                                                        <>
                                                            <TableCell className="p-2 align-top bg-slate-50/10">
                                                                <div className="flex flex-wrap gap-1 mb-2 justify-center">
                                                                    {[{ val: 'C', label: 'Compliant (C)', color: 'bg-emerald-500' }, { val: 'OFI', label: 'Opportunity for Improvement', color: 'bg-amber-500' }, { val: 'Min', label: 'Minor Non-Conformity', color: 'bg-orange-600' }, { val: 'Maj', label: 'Major Non-Conformity', color: 'bg-red-600' }].map(opt => (
                                                                        <button
                                                                            key={opt.val}
                                                                            onClick={() => handleChecklistChange(index, 'findings', opt.val)}
                                                                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                                                                            ${checklistData[index]?.findings === opt.val
                                                                                    ? `${opt.color} text-white shadow-md scale-105`
                                                                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                                                                }`}
                                                                            title={opt.label}
                                                                        >
                                                                            {opt.val}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </TableCell>

                                                            {/* Evidence */}
                                                            <TableCell className="p-2 align-top bg-slate-50/30">
                                                                <div className="flex flex-col h-full space-y-1">
                                                                    {!['OFI', 'Min', 'Maj'].includes(checklistData[index]?.findings) && (
                                                                        <>
                                                                            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Audit Evidence</Label>
                                                                            <Textarea
                                                                                className="min-h-[80px] text-xs resize-y border border-slate-300 bg-white shadow-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all placeholder:text-slate-400"
                                                                                placeholder="State documented info/records checked..."
                                                                                value={checklistData[index]?.evidence || ""}
                                                                                onChange={e => handleChecklistChange(index, 'evidence', e.target.value)}
                                                                            />
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>

                                                {/* Conditionally rendered extended fields for OFI, Min, Maj */}
                                                {!isEditMode && ['OFI', 'Min', 'Maj'].includes(checklistData[index]?.findings) && (
                                                    <TableRow className="bg-slate-50/80 border-b-2 border-slate-200">
                                                        <TableCell colSpan={4} className="p-0">
                                                            <div className="p-6 ml-6 mr-4 my-2 border-l-4 border-slate-300 bg-white rounded-r-lg shadow-sm">

                                                                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                                                    <div className={`px-2 py-0.5 rounded text-xs font-bold text-white
                                                                    ${checklistData[index]?.findings === 'OFI' ? 'bg-yellow-500'
                                                                            : checklistData[index]?.findings === 'Min' ? 'bg-orange-500'
                                                                                : 'bg-red-500'}`}>
                                                                        {checklistData[index]?.findings}
                                                                    </div>
                                                                    <h4 className="text-sm font-semibold text-slate-700">Finding Details</h4>
                                                                    {['Min', 'Maj'].includes(checklistData[index]?.findings) && (
                                                                        <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                                                                            <span className="text-red-500">*</span> Indicates required field
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                                            Description {['Min', 'Maj'].includes(checklistData[index]?.findings) && <span className="text-red-500">*</span>}
                                                                        </Label>
                                                                        <Textarea
                                                                            placeholder="Describe the finding in detail..."
                                                                            className="min-h-[100px] text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-y"
                                                                            value={checklistData[index]?.description || ""}
                                                                            onChange={e => handleChecklistChange(index, 'description', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                                            Correction Taken {['Min', 'Maj'].includes(checklistData[index]?.findings) && <span className="text-red-500">*</span>}
                                                                        </Label>
                                                                        <Textarea
                                                                            placeholder="What correction has been done to eliminate the non-conformity?"
                                                                            className="min-h-[100px] text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-y"
                                                                            value={checklistData[index]?.correction || ""}
                                                                            onChange={e => handleChecklistChange(index, 'correction', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                                            Root Cause {['Min', 'Maj'].includes(checklistData[index]?.findings) && <span className="text-red-500">*</span>}
                                                                        </Label>
                                                                        <Textarea
                                                                            placeholder="What is the identified root cause?"
                                                                            className="min-h-[100px] text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-y"
                                                                            value={checklistData[index]?.rootCause || ""}
                                                                            onChange={e => handleChecklistChange(index, 'rootCause', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                                            Corrective Action {['Min', 'Maj'].includes(checklistData[index]?.findings) && <span className="text-red-500">*</span>}
                                                                        </Label>
                                                                        <Textarea
                                                                            placeholder="What corrective action has been taken to eliminate the root cause?"
                                                                            className="min-h-[100px] text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-y"
                                                                            value={checklistData[index]?.correctiveAction || ""}
                                                                            onChange={e => handleChecklistChange(index, 'correctiveAction', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}

                                                {/* Upload Evidence / Add Question per Clause Group */}
                                                {isLastInGroup && (
                                                    <>
                                                        {!isEditMode ? (
                                                            <>
                                                                <TableRow className="bg-slate-50 border-b-4 border-slate-200">
                                                                    <TableCell colSpan={4} className="p-0">
                                                                        <label className="flex items-center justify-center p-3 bg-slate-50 border-t border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors group">
                                                                            <input
                                                                                type="file"
                                                                                multiple
                                                                                className="hidden"
                                                                                onChange={(e) => handleClauseFileUpload(item.clause, e.target.files)}
                                                                            />
                                                                            <div className="flex flex-col items-center gap-1 text-slate-500 group-hover:text-slate-700">
                                                                                <div className="bg-white p-2 text-slate-400 group-hover:text-amber-600 rounded-full shadow-sm border border-slate-200 group-hover:border-amber-200 transition-all">
                                                                                    <Upload className="w-4 h-4" />
                                                                                </div>
                                                                                <span className="text-xs font-semibold">Upload evidence (images, docs, pdfs) for Clause {item.clause}</span>
                                                                            </div>
                                                                        </label>
                                                                    </TableCell>
                                                                </TableRow>
                                                                {clauseFiles[item.clause] && clauseFiles[item.clause].length > 0 && (
                                                                    <TableRow className="bg-white border-b-2 border-slate-100">
                                                                        <TableCell colSpan={4} className="py-3 px-6">
                                                                            <div className="flex flex-col gap-2">
                                                                                <span className="text-xs font-bold text-slate-500 uppercase">Attached Files</span>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {clauseFiles[item.clause].map((file, fileIdx) => (
                                                                                        <div key={fileIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs shadow-sm">
                                                                                            <FileText className="w-4 h-4 text-emerald-600" />
                                                                                            <span className="max-w-[150px] truncate" title={file.name}>{file.name}</span>
                                                                                            <Trash2
                                                                                                className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 cursor-pointer ml-1 transition-colors"
                                                                                                onClick={() => removeClauseFile(item.clause, fileIdx)}
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <TableRow className="bg-slate-50/50 border-b-4 border-slate-200">
                                                                <TableCell colSpan={2} className="p-4 text-center">
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm" 
                                                                        className="text-amber-700 border-amber-300 hover:bg-amber-50 gap-2"
                                                                        onClick={() => handleAddQuestion(item.clause, index)}
                                                                    >
                                                                        <Plus className="w-4 h-4" /> Add Question to Clause {item.clause}
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        </Card>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex justify-end pt-4 pb-8">
                    <Button size="lg" className="bg-slate-600 hover:bg-slate-700 text-white gap-2" onClick={handleSubmit}>
                        <CheckCircle2 className="w-5 h-5" /> Submit Audit
                    </Button>
                </div>

            </div >
        </div >
    );
};

export default ExecuteAuditTemplate;
