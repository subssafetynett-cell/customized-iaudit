import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config";
import {
  ArrowLeft,
  Edit,
  Save,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  Clock,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  ArrowDown,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  auditTemplates,
  ChecklistContent,
  SectionContent,
  ClauseChecklistContent,
  ProcessAuditContent,
} from "@/data/auditTemplates";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  ImageRun
} from "docx";
import { saveAs } from "file-saver";

import { CLAUSE_MATRIX, ClauseMatrixRow } from "@/data/clauseMapping";

const calculatePeriods = (frequency: string, duration: number) => {
  const count =
    frequency === "Monthly"
      ? duration * 12
      : frequency === "Quarterly"
        ? duration * 4
        : frequency === "Bi-annually"
          ? duration * 2
          : duration;
  const result = [];
  const currentDate = new Date(2026, 0, 1); // Start in January 2026
  for (let i = 0; i < count; i++) {
    const monthLabel = currentDate
      .toLocaleString("default", { month: "short" })
      .toUpperCase();
    const yearLabel = currentDate.getFullYear().toString();
    result.push(`${monthLabel} ${yearLabel}`);
    if (frequency === "Monthly")
      currentDate.setMonth(currentDate.getMonth() + 1);
    else if (frequency === "Quarterly")
      currentDate.setMonth(currentDate.getMonth() + 3);
    else if (frequency === "Bi-annually")
      currentDate.setMonth(currentDate.getMonth() + 6);
    else currentDate.setFullYear(currentDate.getFullYear() + 1);
  }
  return result;
};

const AuditExecute = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // State for the loaded plan
  const [currentPlan, setCurrentPlan] = useState<any>(location.state?.plan);
  const plan = currentPlan;

  // State to filter for findings only
  const [focusFindings, setFocusFindings] = useState<boolean>(
    location.state?.focusFindings === true
  );

  // Use the template attached to the plan, or fallback
  const templateId = plan?.templateId;
  const template = (auditTemplates || []).find((t) => t.id === templateId);

  // --- Pre-calculate Schedule Data ---
  let colIndex = -1;
  let activeScheduleData: Record<string, boolean> | undefined;
  const explicitlySelectedClauses: ClauseMatrixRow[] = [];

  if (plan?.auditProgram && plan?.executionId) {
    const parts = plan.executionId.split(" - ");
    const periodLabel =
      parts.length > 1 ? parts.slice(1).join(" - ") : parts[0];
    activeScheduleData = plan.auditProgram.scheduleData as Record<
      string,
      boolean
    >;
    const programPeriods = calculatePeriods(
      plan.auditProgram.frequency,
      plan.auditProgram.duration,
    );
    colIndex = programPeriods.indexOf(periodLabel);

    if (activeScheduleData && colIndex !== -1) {
      CLAUSE_MATRIX.forEach((clause, rowIndex) => {
        if (activeScheduleData![`${rowIndex}-${colIndex}`] === true) {
          explicitlySelectedClauses.push(clause);
        }
      });
    }
  }

  const isClauseSelected = (clauseStr: string) => {
    if (!activeScheduleData || Object.keys(activeScheduleData).length === 0)
      return true;
    if (colIndex === -1) return true;

    const match = clauseStr.match(/^(\d+(?:\.\d+)*)/);
    if (!match) return false;

    const cleanId = match[1];

    return explicitlySelectedClauses.some(
      (c) =>
        c.id === cleanId ||
        c.id.startsWith(cleanId + ".") ||
        cleanId.startsWith(c.id + "."),
    );
  };

  const [checklistData, setChecklistData] = useState<
    Record<
      number,
      {
        findings: string;
        evidence: string;
        ofi: string;
        description?: string;
        correction?: string;
        rootCause?: string;
        correctiveAction?: string;
        actionBy?: string;
        closeDate?: string;
        assignTo?: string;
        clause?: string;
      }
    >
  >({});

  // Extra questions added per clause during the audit (not in original template)
  const [extraChecklistItems, setExtraChecklistItems] = useState<
    Record<string, { question: string; findings: string; evidence: string; description?: string; correction?: string; rootCause?: string; correctiveAction?: string }[]>
  >({});

  // Editable checklist state for modifying original template questions
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableChecklist, setEditableChecklist] = useState<any[]>([]);

  const activeStandards = {
    iso9001: plan?.criteria?.includes("9001") || plan?.standard?.includes("9001") || plan?.criteria?.toLowerCase().includes("quality") || plan?.criteria?.toLowerCase().includes("9001"),
    iso14001: plan?.criteria?.includes("14001") || plan?.standard?.includes("14001") || plan?.criteria?.toLowerCase().includes("environment") || plan?.criteria?.toLowerCase().includes("14001"),
    iso45001: plan?.criteria?.includes("45001") || plan?.standard?.includes("45001") || plan?.criteria?.toLowerCase().includes("health") || plan?.criteria?.toLowerCase().includes("safety") || plan?.criteria?.toLowerCase().includes("ohs") || plan?.criteria?.toLowerCase().includes("45001"),
  };

  // If no standards match, and it's triple mapping, show all as fallback
  const anyStandardMatched = activeStandards.iso9001 || activeStandards.iso14001 || activeStandards.iso45001;
  const showISO9001 = activeStandards.iso9001 || !anyStandardMatched;
  const showISO14001 = activeStandards.iso14001 || !anyStandardMatched;
  const showISO45001 = activeStandards.iso45001 || !anyStandardMatched;

  const activeCount = [showISO9001, showISO14001, showISO45001].filter(Boolean).length;


  const addExtraChecklistQuestion = (clause: string) => {
    setExtraChecklistItems(prev => ({
      ...prev,
      [clause]: [...(prev[clause] || []), { question: '', findings: '', evidence: '' }]
    }));
  };

  const removeExtraChecklistQuestion = (clause: string, idx: number) => {
    setExtraChecklistItems(prev => ({
      ...prev,
      [clause]: (prev[clause] || []).filter((_, i) => i !== idx)
    }));
  };

  const handleExtraChecklistChange = (clause: string, idx: number, field: string, value: string) => {
    setExtraChecklistItems(prev => ({
      ...prev,
      [clause]: (prev[clause] || []).map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }));
  };

  const handleEditQuestion = (index: number, newValue: string) => {
    const newList = [...editableChecklist];
    if (template?.type === 'clause-checklist') {
      // Actually handled by handleEditClauseSubClause if we use that
      return;
    }
    newList[index] = { ...newList[index], question: newValue };
    setEditableChecklist(newList);
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

    // Shift checklistData down
    const newData: Record<number, any> = {};
    Object.keys(checklistData).forEach(key => {
      const k = parseInt(key);
      if (k > insertAfterIndex) newData[k + 1] = checklistData[k];
      else newData[k] = checklistData[k];
    });
    setChecklistData(newData);
  };

  const handleRemoveQuestion = (indexToRemove: number) => {
    if (editableChecklist.length <= 1) return;
    const newList = editableChecklist.filter((_, idx) => idx !== indexToRemove);
    setEditableChecklist(newList);

    // Shift checklistData up
    const newData: Record<number, any> = {};
    Object.keys(checklistData).forEach(key => {
      const k = parseInt(key);
      if (k < indexToRemove) newData[k] = checklistData[k];
      else if (k > indexToRemove) newData[k - 1] = checklistData[k];
    });
    setChecklistData(newData);
  };




  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load saved progress
  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!id) return;
      setIsRefreshing(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/audit-plans/${id}`);
        if (!res.ok) throw new Error("Plan not found");
        const found = await res.json();
        if (found) {
          setCurrentPlan(found);
          if (found.auditData) {
            const data = typeof found.auditData === 'string' ? JSON.parse(found.auditData) : found.auditData;
            if (data.checklistData) setChecklistData(data.checklistData);
            if (data.sectionData) setSectionData(data.sectionData);
            if (data.clauseData) setClauseData(data.clauseData);
            if (data.previousFindings) setPreviousFindings(data.previousFindings);
            if (data.detailsOfChanges) setDetailsOfChanges(data.detailsOfChanges);
            if (data.participants) setParticipants(data.participants);
            if (data.positiveAspects) setPositiveAspects(data.positiveAspects);
            if (data.opportunities) setOpportunities(data.opportunities);
            if (data.nonConformances) setNonConformances(data.nonConformances);
            if (data.executiveSummary) setExecutiveSummary(data.executiveSummary);
            if (data.summaryCounts) setSummaryCounts(data.summaryCounts);
            if (data.auditFindings) setAuditFindings(data.auditFindings);
            if (data.auditGlobalInfo) setAuditGlobalInfo(data.auditGlobalInfo);
            if (data.processAudits) setProcessAudits(data.processAudits);
            if (data.extraChecklistItems) setExtraChecklistItems(data.extraChecklistItems);
            if (data.showExecutiveSummary !== undefined) setShowExecutiveSummary(data.showExecutiveSummary);
            if (data.showAuditParticipants !== undefined) setShowAuditParticipants(data.showAuditParticipants);
            if (data.showAuditFindings !== undefined) setShowAuditFindings(data.showAuditFindings);
            if (data.clauseFiles) setClauseFiles(data.clauseFiles);
            if (data.genericFiles) setGenericFiles(data.genericFiles);
            const currentTemplate = found.templateId ? auditTemplates.find(t => t.id === found.templateId) : null;

            if (data.editableChecklist && data.editableChecklist.length > 0) {
              setEditableChecklist(data.editableChecklist);
            } else if (currentTemplate?.content) {
              setEditableChecklist(currentTemplate.content);
            }
          } else {
            const currentTemplate = found.templateId ? auditTemplates.find(t => t.id === found.templateId) : null;
            if (currentTemplate?.content) {
              setEditableChecklist(currentTemplate.content);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch plan details:", error);
      } finally {
        setIsRefreshing(false);
      }
    };
    fetchPlanDetails();
  }, [id]);
  const [sectionData, setSectionData] = useState<Record<number, string>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [clauseFiles, setClauseFiles] = useState<Record<string, { name: string; data: string; type: string }[]>>({});
  const [genericFiles, setGenericFiles] = useState<Record<string, { name: string; data: string; type: string }[]>>({});

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------
  const [clauseData, setClauseData] = useState<
    Record<string, ClauseChecklistContent>
  >({});

  const getClausesToRender = () => {
    if (!template || template.type !== "clause-checklist") return [];
    if (explicitlySelectedClauses.length > 0) {
      // Map to generic struct for table render containing array of available titles
      // We now allow headings if they were specifically selected in the schedule
      return explicitlySelectedClauses;
    }
    const all: ClauseMatrixRow[] = [];
    (template.content as ClauseChecklistContent[]).forEach((c) => {
      // Fallback for full list if no specific clauses selected
      const matchRow = CLAUSE_MATRIX.find(m => m.id === c.clauseId);
      if (matchRow) all.push(matchRow);
    });
    return all.filter(c => !c.isHeading);
  };
  const clausesToRender = getClausesToRender();

  // Extended Sections State
  const [previousFindings, setPreviousFindings] = useState("");
  const [detailsOfChanges, setDetailsOfChanges] = useState([
    { item: "Scope", actionRequired: false, notes: "" },
    { item: "Boundary", actionRequired: false, notes: "" },
    {
      item: "Key IMS documented information",
      actionRequired: false,
      notes: "",
    },
    { item: "Organisational structure", actionRequired: false, notes: "" },
    { item: "Compliance Obligations", actionRequired: false, notes: "" },
    { item: "Other noteworthy changes", actionRequired: false, notes: "" },
  ]);
  const [participants, setParticipants] = useState([
    { name: "", position: "", opening: false, closing: false, interviewed: "" },
  ]);
  const [positiveAspects, setPositiveAspects] = useState([
    { id: "PA-01", standardClause: "", areaProcess: "", aspect: "" },
  ]);
  const [opportunities, setOpportunities] = useState([
    { id: "OFI-01", standardClause: "", areaProcess: "", opportunity: "" },
  ]);
  const [nonConformances, setNonConformances] = useState([
    {
      id: "NCR-01",
      standardClause: "",
      areaProcess: "",
      statement: "",
      dueDate: "",
      actionBy: "",
    },
  ]);


  // Process Audit states
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [summaryCounts, setSummaryCounts] = useState({
    major: "",
    minor: "",
    ofi: "",
    compliant: "",
    positive: "",
  });
  const [auditFindings, setAuditFindings] = useState([
    { refNo: "", clauseNo: "", details: "", category: "" },
  ]);

  const [auditGlobalInfo, setAuditGlobalInfo] = useState({
    refNo: "",
    clauseNo: "",
    department: "",
  });

  const [processAudits, setProcessAudits] = useState<ProcessAuditContent[]>([
    {
      id: "1",
      processArea: "",
      auditees: "",
      evidence: "",
      conclusion: "",
    },
  ]);

  const addProcessAudit = () =>
    setProcessAudits([
      ...processAudits,
      {
        id: Date.now().toString(),
        processArea: "",
        auditees: "",
        evidence: "",
        conclusion: "",
      },
    ]);
  const updateProcessAudit = (
    index: number,
    field: keyof ProcessAuditContent,
    value: any,
  ) => {
    const newAudits = [...processAudits];
    newAudits[index] = { ...newAudits[index], [field]: value };
    setProcessAudits(newAudits);
  };
  const removeProcessAudit = (index: number) =>
    setProcessAudits(processAudits.filter((_, i) => i !== index));
  const addAuditFinding = () =>
    setAuditFindings([
      ...auditFindings,
      { refNo: "", clauseNo: "", details: "", category: "" },
    ]);
  const removeAuditFinding = (index: number) =>
    setAuditFindings(auditFindings.filter((_, i) => i !== index));

  // Visibility toggles for the Process Audit top sections
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(true);
  const [showAuditParticipants, setShowAuditParticipants] = useState(true);
  const [showAuditFindings, setShowAuditFindings] = useState(true);

  // Derived Progress logic
  const calculateProgress = () => {
    if (!template)
      return {
        percentage: 0,
        totalItems: 0,
        completedItems: 0,
        pendingItems: 0,
      };

    let totalItems = 0;
    let completedItems = 0;

    if (template.type === "checklist" && Array.isArray(template.content)) {
      const activeItems = (template.content as ChecklistContent[]).filter(
        (item) => isClauseSelected(item.clause),
      );
      totalItems = activeItems.length;
      completedItems = Object.keys(checklistData).filter((key) => {
        const itemIndex = Number(key);
        const item = template.content[itemIndex] as ChecklistContent;
        return activeItems.includes(item) && checklistData[itemIndex]?.findings;
      }).length;
    } else if (template.type === "clause-checklist") {
      totalItems = clausesToRender.length;
      completedItems = clausesToRender.filter(
        (clause) => !!clauseData[clause.id]?.findingType,
      ).length;
    } else if (template.type === "section" && Array.isArray(template.content)) {
      totalItems = template.content.length;
      completedItems = Object.keys(sectionData).filter(
        (key) => sectionData[Number(key)]?.trim() !== "",
      ).length;
    } else if (template.type === "process-audit") {
      totalItems = processAudits.length;
      completedItems = processAudits.filter(
        (pa) => pa.processArea?.trim() !== "" && pa.auditees?.trim() !== "",
      ).length;
    }

    return {
      percentage:
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      totalItems,
      completedItems,
      pendingItems: totalItems - completedItems,
    };
  };

  const {
    percentage: progressValue,
    totalItems,
    completedItems,
    pendingItems,
  } = calculateProgress();

  const collectFindings = () => {
    const findings: {
      source: "clause" | "checklist" | "process";
      id: string;
      ref: string;
      type: string;
      description: string;
      actionBy: string;
      closeDate: string;
      assignTo: string;
    }[] = [];

    if (template?.type === "clause-checklist") {
      Object.entries(clauseData).forEach(([id, data]) => {
        if (data.findingType && data.findingType !== "C") {
          findings.push({
            source: "clause",
            id,
            ref: `Clause ${id}`,
            type: data.findingType,
            description: data.description || "",
            actionBy: data.actionBy || "",
            closeDate: data.closeDate || "",
            assignTo: data.assignTo || "",
          });
        }
      });
    }

    if (template?.type === "checklist") {
      Object.entries(checklistData).forEach(([idx, data]) => {
        const type = data.findings;
        if (type && type !== "C" && type !== "") {
          const item = (template?.content as ChecklistContent[])?.[Number(idx)];
          findings.push({
            source: "checklist",
            id: idx,
            ref: item?.clause
              ? `Clause ${item.clause}`
              : `Item ${Number(idx) + 1}`,
            type: type === "Min" ? "Minor" : type === "Maj" ? "Major" : type,
            description: data.description || "",
            actionBy: data.actionBy || "",
            closeDate: data.closeDate || "",
            assignTo: data.assignTo || "",
          });
        }
      });
    }

    if (template?.type === "process-audit") {
      processAudits.forEach((audit, idx) => {
        if (audit.findingType && audit.findingType !== "C") {
          findings.push({
            source: "process",
            id: idx.toString(),
            ref: `Process #${idx + 1}`,
            type: audit.findingType,
            description: audit.description || "",
            actionBy: audit.actionBy || "",
            closeDate: audit.closeDate || "",
            assignTo: audit.assignTo || "",
          });
        }
      });
    }

    return findings;
  };

  const findingsList = collectFindings();

  if (!plan || !template) {
    return (
      <div className="flex-1 p-8 pt-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">
            Plan or Template not found
          </h2>
          <Button className="mt-4" onClick={() => navigate("/audit")}>
            Return to Audit List
          </Button>
        </div>
      </div>
    );
  }

  const addParticipant = () =>
    setParticipants([
      ...participants,
      {
        name: "",
        position: "",
        opening: false,
        closing: false,
        interviewed: "",
      },
    ]);
  const addPositiveAspect = () =>
    setPositiveAspects([
      ...positiveAspects,
      {
        id: `PA-${String(positiveAspects.length + 1).padStart(2, "0")}`,
        standardClause: "",
        areaProcess: "",
        aspect: "",
      },
    ]);
  const addOpportunity = () =>
    setOpportunities([
      ...opportunities,
      {
        id: `OFI-${String(opportunities.length + 1).padStart(2, "0")}`,
        standardClause: "",
        areaProcess: "",
        opportunity: "",
      },
    ]);
  const addNonConformance = () =>
    setNonConformances([
      ...nonConformances,
      {
        id: `NCR-${String(nonConformances.length + 1).padStart(2, "0")}`,
        standardClause: "",
        areaProcess: "",
        statement: "",
        dueDate: "",
        actionBy: "",
      },
    ]);


  const removeParticipant = (index: number) =>
    setParticipants(participants.filter((_, i) => i !== index));
  const removePositiveAspect = (index: number) =>
    setPositiveAspects(positiveAspects.filter((_, i) => i !== index));
  const removeOpportunity = (index: number) =>
    setOpportunities(opportunities.filter((_, i) => i !== index));
  const removeNonConformance = (index: number) =>
    setNonConformances(nonConformances.filter((_, i) => i !== index));

  const handleChecklistChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    setChecklistData((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value },
    }));
  };

  const handleClauseFileUpload = async (clause: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newMedia: { name: string; data: string; type: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newMedia.push({ name: file.name, data: base64, type: file.type });
    }

    setClauseFiles(prev => ({
      ...prev,
      [clause]: [...(prev[clause] || []), ...newMedia]
    }));
    toast.success(`${newMedia.length} file(s) attached for Clause ${clause}`);
  };

  const removeClauseFile = (clause: string, indexToRemove: number) => {
    setClauseFiles(prev => ({
      ...prev,
      [clause]: prev[clause].filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleGenericFileUpload = async (key: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newMedia: { name: string; data: string; type: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newMedia.push({ name: file.name, data: base64, type: file.type });
    }

    setGenericFiles(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), ...newMedia]
    }));
    toast.success(`${newMedia.length} file(s) attached`);
  };

  const removeGenericFile = (key: string, indexToRemove: number) => {
    setGenericFiles(prev => ({
      ...prev,
      [key]: prev[key].filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSectionChange = (index: number, value: string) => {
    setSectionData((prev) => ({ ...prev, [index]: value }));
  };

  const handleClauseChange = (
    clauseId: string,
    field: keyof ClauseChecklistContent,
    value: any,
  ) => {
    setClauseData((prev) => ({
      ...prev,
      [clauseId]: { ...prev[clauseId], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    try {
      const auditData = {
        checklistData,
        sectionData,
        clauseData,
        previousFindings,
        detailsOfChanges,
        participants,
        positiveAspects,
        opportunities,
        nonConformances,
        executiveSummary,
        summaryCounts,
        auditFindings,
        auditGlobalInfo,
        processAudits,
        extraChecklistItems,
        showExecutiveSummary,
        showAuditParticipants,
        showAuditFindings,
        lastSaved: new Date().toISOString(),
        progress: progressValue,
        clauseFiles,
        genericFiles,
        editableChecklist
      };

      const res = await fetch(`${API_BASE_URL}/api/audit-plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Preserve existing plan fields if needed, or just send auditData
          auditData: auditData
        })
      });

      if (res.ok) {
        toast.success("Audit execution saved successfully!");
        navigate("/audit");
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save audit progress");
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const darkColor: [number, number, number] = [33, 56, 71];
    const greenColor: [number, number, number] = [16, 185, 129];
    const amberColor: [number, number, number] = [245, 158, 11];
    const redColor: [number, number, number] = [239, 68, 68];

    // ---------- helpers ----------
    const section = (title: string, y: number): number => {
      if (y > pageH - 40) { doc.addPage(); y = margin; }
      doc.setFillColor(...darkColor);
      doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 3, y + 5.5);
      doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
      return y + 12;
    };

    const checkPage = (y: number, need = 20): number => {
      if (y + need > pageH - 25) { doc.addPage(); return margin; }
      return y;
    };

    // ---- Try to load logo - compressed via canvas to prevent huge file sizes ----
    let logoDataUrl: string | null = null;
    let logoRatio = 0.3;
    try {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.src = '/iAudit Global-01.png';
        img.onload = () => {
          const MAX = 120;
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else { width = Math.round(width * MAX / height); height = MAX; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          logoDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          logoRatio = height / width;
          resolve();
        };
        img.onerror = () => resolve();
      });
    } catch { }

    // ---- PAGE 1: COVER ----
    let y = margin;
    if (logoDataUrl) {
      const lw = 50; const lh = lw * logoRatio;
      doc.addImage(logoDataUrl, 'PNG', pageW / 2 - lw / 2, y, lw, lh);
      y += lh + 8;
    } else {
      y += 10;
    }
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(...darkColor);
    doc.text('Audit Report', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(13); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
    doc.text(plan.auditName || '', pageW / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(9); doc.setTextColor(130, 130, 130);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageW / 2, y, { align: 'center' });
    y += 14;

    // ---- 1. Audit Information ----
    y = section('1. AUDIT INFORMATION', y);
    const leadName = plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : (plan.leadAuditorName || '—');
    const auditeeStr = Array.isArray(plan.auditees)
      ? plan.auditees.map((a: any) => typeof a === 'string' ? a : `${a.firstName || ''} ${a.lastName || ''}`.trim()).join(', ')
      : (plan.auditees || '—');
    autoTable(doc, {
      startY: y,
      body: [
        ['Audit Name', plan.auditName || '—'],
        ['Template', template.title || '—'],
        ['Site / Location', plan.site?.name || plan.location || '—'],
        ['Date', plan.date ? format(new Date(plan.date), 'PPP') : '—'],
        ['Lead Auditor', leadName],
        ['Auditees', auditeeStr],
        ['Standard / Criteria', plan.criteria || plan.standard || '—'],
        ['Objective', plan.objective || '—'],
        ['Scope', plan.scope || '—'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 243, 246], cellWidth: 52 } }
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ---- 2. Previous Findings ----
    y = section('2. PREVIOUS FINDINGS', y);
    if (previousFindings?.trim()) {
      doc.setFontSize(9); doc.setTextColor(40, 40, 40);
      const pfLines = doc.splitTextToSize(previousFindings, pageW - margin * 2);
      pfLines.forEach((line: string) => { y = checkPage(y, 6); doc.text(line, margin, y); y += 5; });
    } else {
      doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text('No previous findings recorded.', margin, y); y += 6;
    }
    y += 6;

    // ---- 3. Details of Changes ----
    y = section('3. DETAILS OF CHANGES', y);
    autoTable(doc, {
      startY: y,
      head: [['Item', 'Action Required', 'Notes']],
      body: detailsOfChanges.map(d => [d.item, d.actionRequired ? 'Yes' : 'No', d.notes || '—']),
      theme: 'grid', styles: { fontSize: 9 }, headStyles: { fillColor: darkColor },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1 && data.cell.raw === 'Yes')
          data.cell.styles.textColor = [239, 68, 68];
      }
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ---- 4. Audit Participants ----
    y = section('4. AUDIT PARTICIPANTS', y);
    const filledParticipants = participants.filter(p => p.name?.trim());
    if (filledParticipants.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Name', 'Position', 'Opening', 'Closing', 'Interviewed']],
        body: filledParticipants.map(p => [p.name || '—', p.position || '—', p.opening ? '✓' : '', p.closing ? '✓' : '', p.interviewed || '—']),
        theme: 'grid', styles: { fontSize: 9 }, headStyles: { fillColor: darkColor }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text('No participants recorded.', margin, y); y += 12;
    }

    // ---- 5. Global Findings / Summary ----
    y = section('5. GLOBAL FINDINGS SUMMARY', y);
    autoTable(doc, {
      startY: y,
      head: [['Compliant', 'OFI', 'Minor NCR', 'Major NCR', 'Positive Aspects']],
      body: [[summaryCounts.compliant || '0', summaryCounts.ofi || '0', summaryCounts.minor || '0', summaryCounts.major || '0', summaryCounts.positive || '0']],
      theme: 'grid', styles: { fontSize: 10, halign: 'center' },
      headStyles: { fillColor: greenColor }
    });
    y = (doc as any).lastAutoTable.finalY + 8;
    // Findings log
    const filledAF = auditFindings.filter(f => f.details?.trim());
    if (filledAF.length > 0) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...darkColor);
      doc.text('Audit Findings Log', margin, y); y += 5; doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
      autoTable(doc, {
        startY: y,
        head: [['Ref No', 'Clause No', 'Category', 'Details']],
        body: filledAF.map(f => [f.refNo || '—', f.clauseNo || '—', f.category || '—', f.details || '—']),
        theme: 'grid', styles: { fontSize: 9 }, headStyles: { fillColor: darkColor }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    } else { y += 6; }

    // ---- 6. Opportunities for Improvement (OFI) ----
    y = section('6. OPPORTUNITIES FOR IMPROVEMENT (OFI)', y);
    const ofiItems = opportunities.filter(o => o.opportunity?.trim());
    if (ofiItems.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Ref', 'Standard Clause', 'Area / Process', 'Opportunity']],
        body: ofiItems.map(o => [o.id, o.standardClause || '—', o.areaProcess || '—', o.opportunity || '—']),
        theme: 'grid', styles: { fontSize: 9 }, headStyles: { fillColor: amberColor }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text('No OFIs recorded.', margin, y); y += 12;
    }

    // ---- 7. Non-Conformances (NCR) ----
    y = section('7. NON-CONFORMANCES (NCR)', y);
    const ncrItems = nonConformances.filter(n => n.statement?.trim());
    if (ncrItems.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Ref', 'Standard Clause', 'Area / Process', 'NC Statement', 'Due Date', 'Action By']],
        body: ncrItems.map(n => [n.id, n.standardClause || '—', n.areaProcess || '—', n.statement || '—', n.dueDate || '—', n.actionBy || '—']),
        theme: 'grid', styles: { fontSize: 8, overflow: 'linebreak' }, headStyles: { fillColor: redColor }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text('No non-conformances recorded.', margin, y); y += 12;
    }

    // ---- 8. Template Fields (filled rows only, NC details inline) ----
    if (template.type === 'checklist') {
      y = section('8. AUDIT CHECKLIST FINDINGS', y);
      // lblStyle: blue label cell style
      const lblStyle = { fillColor: darkColor as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, fontSize: 8, cellPadding: 3 };
      const bodyRows: any[] = [];
      const imgRowMap = new Map<number, string>(); // rowIndex -> image data URL

      (editableChecklist as ChecklistContent[]).forEach((item, idx) => {
        const d = (checklistData[idx] || {}) as any;
        if (!d.findings) return; // skip unfilled
        // Main finding row
        bodyRows.push([item.clause, item.question, d.findings]);
        // Evidence sub-row
        if (d.evidence?.trim()) {
          bodyRows.push([{ content: 'Evidence', styles: lblStyle }, { content: d.evidence, colSpan: 2, styles: { fontSize: 8, cellPadding: 3 } }]);
        }
        // NC detail sub-rows (only when non-compliant)
        if (d.findings !== 'C') {
          if (d.description?.trim()) bodyRows.push([{ content: 'Details', styles: lblStyle }, { content: d.description, colSpan: 2, styles: { fontSize: 8, cellPadding: 3 } }]);
          if (d.correction?.trim()) bodyRows.push([{ content: 'Correction', styles: lblStyle }, { content: d.correction, colSpan: 2, styles: { fontSize: 8, cellPadding: 3 } }]);
          if (d.rootCause?.trim()) bodyRows.push([{ content: 'Root Cause', styles: lblStyle }, { content: d.rootCause, colSpan: 2, styles: { fontSize: 8, cellPadding: 3 } }]);
          if (d.correctiveAction?.trim()) bodyRows.push([{ content: 'Corrective Action', styles: lblStyle }, { content: d.correctiveAction, colSpan: 2, styles: { fontSize: 8, cellPadding: 3 } }]);
        }
        // Image sub-row
        const clauseImgs = (clauseFiles[item.clause] || []).filter((m) => m.type.startsWith('image/'));
        if (clauseImgs.length > 0) {
          imgRowMap.set(bodyRows.length, clauseImgs[0].data);
          bodyRows.push([{ content: '', colSpan: 3, styles: { minCellHeight: 55, cellPadding: 2 } }]);
        }
      });

      // Also append extra questions added during the audit
      Object.entries(extraChecklistItems).forEach(([clause, extras]) => {
        extras.forEach((eq) => {
          if (!eq.question?.trim() && !eq.findings) return;
          bodyRows.push([clause, eq.question || '(no question text)', eq.findings || '—']);
          if (eq.evidence?.trim()) bodyRows.push([{ content: 'Evidence', styles: lblStyle }, { content: eq.evidence, colSpan: 2, styles: { fontSize: 8, cellPadding: 3 } }]);
          if (eq.findings !== 'C') {
            if (eq.correction?.trim()) bodyRows.push([{ content: 'Correction', styles: lblStyle }, { content: eq.correction, colSpan: 2, styles: { fontSize: 8, cellPadding: 3 } }]);
            if (eq.rootCause?.trim()) bodyRows.push([{ content: 'Root Cause', styles: lblStyle }, { content: eq.rootCause, colSpan: 2, styles: { fontSize: 8, cellPadding: 3 } }]);
            if (eq.correctiveAction?.trim()) bodyRows.push([{ content: 'Corrective Action', styles: lblStyle }, { content: eq.correctiveAction, colSpan: 2, styles: { fontSize: 8, cellPadding: 3 } }]);
          }
        });
      });

      if (bodyRows.length === 0) {
        doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        doc.text('No findings recorded yet.', margin, y); y += 12;
      } else {
        autoTable(doc, {
          startY: y,
          head: [['Clause', 'Question', 'Finding']],
          body: bodyRows, theme: 'grid',
          styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
          columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 22 } },
          headStyles: { fillColor: darkColor },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2 && !imgRowMap.has(data.row.index)) {
              const f = String(data.cell.raw || '');
              if (f === 'C') data.cell.styles.textColor = [16, 185, 129];
              else if (f === 'OFI') data.cell.styles.textColor = [245, 158, 11];
              else if (f === 'Min' || f === 'Maj') data.cell.styles.textColor = [239, 68, 68];
            }
          },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0 && imgRowMap.has(data.row.index)) {
              const imgData = imgRowMap.get(data.row.index)!;
              try {
                const fmt = imgData.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
                // full-width image across all 3 cols, positioned at the row's cell
                const tblW = pageW - margin * 2;
                doc.addImage(imgData, fmt, data.cell.x + 2, data.cell.y + 2, tblW - 4, 50);
              } catch (e) { console.error('clause img row failed', e); }
            }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (template.type === 'clause-checklist') {
      y = section('8. CLAUSE CHECKLIST', y);
      const checklistToUse = (editableChecklist as ClauseChecklistContent[]).length > 0
        ? (editableChecklist as ClauseChecklistContent[])
        : (template.content as ClauseChecklistContent[]);

      const filledClauses = checklistToUse.filter(c => (clauseData[c.clauseId] || {} as any).findingType);
      if (filledClauses.length === 0) {
        doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        doc.text('No findings recorded yet.', margin, y); y += 12;
      } else {
        const bodyRows: any[] = [];
        const lblStyle = { fillColor: darkColor as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, fontSize: 8, cellPadding: 3 };
        
        filledClauses.forEach(c => {
          const d = (clauseData[c.clauseId] || {}) as any;
          const requirement = [c.title, ...(c.subClauses || [])].filter(Boolean).join('\n');
          bodyRows.push([c.clauseId, requirement, d.findingType || '—', d.evidence || '—']);
          
          if (d.findingType && d.findingType !== 'C') {
            if (d.description?.trim()) bodyRows.push([{ content: 'Description of Finding', styles: lblStyle }, { content: d.description, colSpan: 3, styles: { fontSize: 8, cellPadding: 3 } }]);
            if (d.correction?.trim()) bodyRows.push([{ content: 'Correction Done', styles: lblStyle }, { content: d.correction, colSpan: 3, styles: { fontSize: 8, cellPadding: 3 } }]);
            if (d.rootCause?.trim()) bodyRows.push([{ content: 'Root Cause', styles: lblStyle }, { content: d.rootCause, colSpan: 3, styles: { fontSize: 8, cellPadding: 3 } }]);
            if (d.correctiveAction?.trim()) bodyRows.push([{ content: 'Corrective Action', styles: lblStyle }, { content: d.correctiveAction, colSpan: 3, styles: { fontSize: 8, cellPadding: 3 } }]);
          }
        });

        autoTable(doc, {
          startY: y, head: [['Clause', 'Requirement', 'Status', 'Evidence']],
          body: bodyRows,
          theme: 'grid', styles: { fontSize: 8, overflow: 'linebreak' },
          columnStyles: { 0: { cellWidth: 18 }, 2: { cellWidth: 18 } }, headStyles: { fillColor: darkColor },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const f = String(data.cell.raw || '');
              if (f === 'C') data.cell.styles.textColor = [16, 185, 129];
              else if (f === 'OFI') data.cell.styles.textColor = [245, 158, 11];
              else if (f !== '—' && f !== '') data.cell.styles.textColor = [239, 68, 68];
            }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (template.type === 'section') {
      y = section('8. SECTION RESPONSES', y);
      const filledSections = (template.content as SectionContent[]).filter((_, idx) => sectionData[idx]?.trim());
      if (filledSections.length === 0) {
        doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        doc.text('No responses recorded yet.', margin, y); y += 12;
      } else {
        const rows = (template.content as SectionContent[]).reduce<string[][]>((acc, sec, idx) => {
          if (sectionData[idx]?.trim()) acc.push([sec.title || `Section ${idx + 1}`, sectionData[idx]]);
          return acc;
        }, []);
        autoTable(doc, { startY: y, head: [['Section', 'Response']], body: rows, theme: 'grid', styles: { fontSize: 9 }, headStyles: { fillColor: darkColor } });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (template.type === 'process-audit') {
      y = section('8. PROCESS AUDIT', y);
      const filledPA = processAudits.filter(pa => pa.processArea?.trim() || pa.evidence?.trim());
      if (filledPA.length === 0) {
        doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        doc.text('No process audits recorded yet.', margin, y); y += 12;
      } else {
        autoTable(doc, {
          startY: y, head: [['Process Area', 'Auditees', 'Evidence', 'Conclusion', 'Finding']],
          body: filledPA.map(pa => [pa.processArea || '—', pa.auditees || '—', pa.evidence || '—', pa.conclusion || '—', (pa as any).findingType || '—']),
          theme: 'grid', styles: { fontSize: 8, overflow: 'linebreak' }, headStyles: { fillColor: darkColor }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (template.isTripleMapping) {
      y = section(`8. INTEGRATED AUDIT MAPPING (${[showISO9001 && 'ISO 9001', showISO14001 && 'ISO 14001', showISO45001 && 'ISO 45001'].filter(Boolean).join(', ')})`, y);
      const rows: any[] = [];
      const lblStyle = { fillColor: darkColor as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, fontSize: 8, cellPadding: 3 };

      CLAUSE_MATRIX.forEach((row, idx) => {
        if (!isClauseSelected(row.id)) return;
        
        // Use editableChecklist if available to match UI
        const questions = (editableChecklist as ChecklistContent[]).filter(q => q.clause === row.id);
        
        if (row.isHeading) {
          const headingParts = [
            showISO45001 && row.iso45001, 
            showISO14001 && row.iso14001, 
            showISO9001 && row.iso9001
          ].filter(Boolean);
          rows.push([{ content: headingParts.join(' / '), colSpan: activeCount + 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
          return;
        }

        questions.forEach(q => {
          const dIdx = editableChecklist.indexOf(q);
          const d = (checklistData[dIdx] || {}) as any;
          if (!d.findings) return;

          const rowData = [
            showISO45001 && row.iso45001,
            showISO14001 && row.iso14001,
            showISO9001 && row.iso9001,
            d.findings,
            d.evidence || '—'
          ].filter(val => val !== false);

          rows.push(rowData);

          if (d.findings !== 'C') {
            if (d.description?.trim()) rows.push([{ content: 'Details', styles: lblStyle }, { content: d.description, colSpan: activeCount + 1, styles: { fontSize: 8, cellPadding: 3 } }]);
            if (d.correction?.trim()) rows.push([{ content: 'Correction', styles: lblStyle }, { content: d.correction, colSpan: activeCount + 1, styles: { fontSize: 8, cellPadding: 3 } }]);
            if (d.rootCause?.trim()) rows.push([{ content: 'Root Cause', styles: lblStyle }, { content: d.rootCause, colSpan: activeCount + 1, styles: { fontSize: 8, cellPadding: 3 } }]);
            if (d.correctiveAction?.trim()) rows.push([{ content: 'Corrective Action', styles: lblStyle }, { content: d.correctiveAction, colSpan: activeCount + 1, styles: { fontSize: 8, cellPadding: 3 } }]);
          }
        });
      });

      if (rows.length === 0) {
        doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        doc.text('No findings recorded yet.', margin, y); y += 12;
      } else {
        const head = [
          showISO45001 && 'ISO 45001',
          showISO14001 && 'ISO 14001',
          showISO9001 && 'ISO 9001',
          'Finding',
          'Evidence'
        ].filter(Boolean) as string[];

        autoTable(doc, {
          startY: y,
          head: [head],
          body: rows,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
          columnStyles: { 
            0: { cellWidth: activeCount === 1 ? 105 : activeCount === 2 ? 52 : 35 },
            1: { cellWidth: activeCount === 2 ? 52 : 35 },
            2: { cellWidth: 35 },
            [activeCount]: { cellWidth: 15 },
            [activeCount + 1]: { cellWidth: 'auto' } 
          },
          headStyles: { fillColor: darkColor },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === activeCount) {
              const f = String(data.cell.raw || '');
              if (f === 'C') data.cell.styles.textColor = [16, 185, 129];
              else if (f === 'OFI') data.cell.styles.textColor = [245, 158, 11];
              else if (f === 'Min' || f === 'Maj') data.cell.styles.textColor = [239, 68, 68];
            }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // ---- 9. Evidence & Images ----
    const allMedia = [...Object.values(clauseFiles).flat(), ...Object.values(genericFiles).flat()];
    if (allMedia.length > 0) {
      y = section('9. EVIDENCE & IMAGES', y);
      for (const m of allMedia) {
        y = checkPage(y, 60);
        if (m.type.startsWith('image/')) {
          try {
            doc.addImage(m.data, m.type.split('/')[1].toUpperCase(), margin, y, 80, 60);
            doc.setFontSize(8); doc.setTextColor(100, 100, 100);
            doc.text(m.name, margin, y + 63);
            y += 70;
          } catch (e) { console.error('PDF image embed failed', e); }
        } else {
          doc.setFontSize(9); doc.setTextColor(60, 60, 60);
          doc.text(`• ${m.name} (${m.type})`, margin, y); y += 7;
        }
      }
    }

    // ---- Footer on every page ----
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
      doc.text(`${plan.auditName || 'Audit'} Report`, margin, pageH - 7);
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' });
    }

    doc.save(`${(plan.auditName || 'Audit').replace(/\s+/g, '_')}_Report.pdf`);
  };

  const exportToExcel = () => {
    const rows: any[] = [];

    if (template.type === "checklist") {
      (editableChecklist as ChecklistContent[]).forEach((item, idx) => {
        const data = (checklistData[idx] || {}) as any;
        rows.push({
          "Clause": item.clause,
          "Question": item.question,
          "Finding": data.findings,
          "Evidence": data.evidence
        });
      });
    } else if (template.isTripleMapping) {
      CLAUSE_MATRIX.forEach((row, idx) => {
        if (!isClauseSelected(row.id)) return;
        if (row.isHeading) return;
        
        const questionsForClause = (editableChecklist as ChecklistContent[]).filter(q => q.clause === row.id);
        
        questionsForClause.forEach(q => {
          const dIdx = editableChecklist.indexOf(q);
          const data = (checklistData[dIdx] || {}) as any;
          if (!data.findings) return;
          
          const rowData: any = {};
          if (showISO45001) rowData["ISO 45001"] = row.iso45001;
          if (showISO14001) rowData["ISO 14001"] = row.iso14001;
          if (showISO9001) rowData["ISO 9001"] = row.iso9001;
          rowData["Question"] = q.question;
          rowData["Finding"] = data.findings;
          rowData["Evidence"] = data.evidence;
          rows.push(rowData);
        });
      });
    } else if (template.type === 'clause-checklist') {
      (editableChecklist as ClauseChecklistContent[]).forEach(c => {
        const data = (clauseData[c.clauseId] || {}) as any;
        const requirement = [c.title, ...(c.subClauses || [])].filter(Boolean).join('\n');
        rows.push({
          "Clause": c.clauseId,
          "Requirement": requirement,
          "Status": data.findingType,
          "Evidence": data.evidence
        });
      });
    } else {
      clausesToRender.forEach(c => {
        const data = (clauseData[c.id] || {}) as any;
        rows.push({
          "Clause": c.id,
          "Requirement": c.iso9001 || c.iso14001 || c.iso45001,
          "Status": data.findingType,
          "Evidence": data.evidence
        });
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Report");
    XLSX.writeFile(workbook, `${plan.auditName || 'Audit'}_Report.xlsx`);
  };

  const exportToWord = async () => {
    const darkFill = '213847';
    const greenFill = '10B981';
    const amberFill = 'F59E0B';
    const redFill = 'EF4444';

    const makeHeader = (text: string) =>
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 24 })],
        shading: { fill: darkFill },
        spacing: { before: 300, after: 100 },
      });

    const makeRow = (cells: string[], headerFill?: string) =>
      new DocxTableRow({
        children: cells.map((c, i) =>
          new DocxTableCell({
            shading: headerFill ? { fill: headerFill } : undefined,
            children: [new Paragraph({
              children: [new TextRun({ text: c || '—', bold: !!headerFill, color: headerFill ? 'FFFFFF' : '000000', size: 18 })]
            })]
          })
        )
      });

    const tbl = (head: string[], body: string[][], fill = darkFill) =>
      new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [makeRow(head, fill), ...body.map(r => makeRow(r))]
      });

    const spacer = () => new Paragraph({ text: '' });

    const leadName = plan.leadAuditor
      ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}`
      : (plan.leadAuditorName || '—');

    const auditees = Array.isArray(plan.auditees)
      ? plan.auditees.map((a: any) => typeof a === 'string' ? a : `${a.firstName || ''} ${a.lastName || ''}`.trim()).join(', ')
      : (plan.auditees || '—');

    // --- Logo - compressed via canvas to prevent huge file sizes ---
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
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((compressedBlob) => {
            if (compressedBlob) compressedBlob.arrayBuffer().then(resolve).catch(reject);
            else reject(new Error("Canvas toBlob returned null"));
          }, "image/jpeg", 0.6);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
    } catch (e) {
      console.warn("Logo could not be loaded for DOCX", e);
    }

    const sectionGreen = '0EA572';
    const content: any[] = [
      // Cover
      ...(logoBuffer ? [
        new Paragraph({
          children: [new ImageRun({ data: logoBuffer, transformation: { width: 80, height: 60 } })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      ] : []),
      new Paragraph({ text: 'Audit Report', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: plan.auditName || '', alignment: AlignmentType.CENTER }),
      new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),

      // 1. Audit Information
      makeHeader('1. AUDIT INFORMATION'),
      tbl(['Field', 'Value'], [
        ['Audit Name', plan.auditName || '—'],
        ['Template', template.title || '—'],
        ['Site / Location', plan.site?.name || plan.location || '—'],
        ['Date', plan.date ? format(new Date(plan.date), 'PPP') : '—'],
        ['Lead Auditor', leadName],
        ['Auditees', auditees],
        ['Standard / Criteria', plan.criteria || plan.standard || '—'],
        ['Objective', plan.objective || '—'],
        ['Scope', plan.scope || '—'],
      ]),
      spacer(),
    ];

    // 2. Previous Findings
    content.push(makeHeader('2. PREVIOUS FINDINGS'));
    content.push(new Paragraph({ children: [new TextRun({ text: previousFindings?.trim() ? previousFindings : 'No previous findings recorded.', size: 20, color: previousFindings?.trim() ? '000000' : '888888' })] }));
    content.push(spacer());

    // 3. Details of Changes
    content.push(makeHeader('3. DETAILS OF CHANGES'));
    content.push(tbl(
      ['Item', 'Action Required', 'Notes'],
      detailsOfChanges.map(d => [d.item, d.actionRequired ? 'Yes' : 'No', d.notes || '—'])
    ));
    content.push(spacer());

    // 4. Audit Participants
    content.push(makeHeader('4. AUDIT PARTICIPANTS'));
    const filledPW = participants.filter(p => p.name?.trim());
    if (filledPW.length > 0) {
      content.push(tbl(
        ['Name', 'Position', 'Opening', 'Closing', 'Interviewed'],
        filledPW.map(p => [p.name || '—', p.position || '—', p.opening ? '✓' : '', p.closing ? '✓' : '', p.interviewed || '—'])
      ));
    } else {
      content.push(new Paragraph({ children: [new TextRun({ text: 'No participants recorded.', size: 20, color: '888888' })] }));
    }
    content.push(spacer());

    // 5. Global Findings Summary
    content.push(makeHeader('5. GLOBAL FINDINGS SUMMARY'));
    content.push(tbl(
      ['Compliant', 'OFI', 'Minor NCR', 'Major NCR', 'Positive Aspects'],
      [[summaryCounts.compliant || '0', summaryCounts.ofi || '0', summaryCounts.minor || '0', summaryCounts.major || '0', summaryCounts.positive || '0']],
      greenFill
    ));
    const flAFW = auditFindings.filter(f => f.details?.trim());
    if (flAFW.length > 0) {
      content.push(new Paragraph({ text: 'Audit Findings Log', heading: HeadingLevel.HEADING_3 }));
      content.push(tbl(['Ref No', 'Clause No', 'Category', 'Details'], flAFW.map(f => [f.refNo || '—', f.clauseNo || '—', f.category || '—', f.details || '—'])));
    }
    content.push(spacer());

    // 6. OFI
    content.push(makeHeader('6. OPPORTUNITIES FOR IMPROVEMENT (OFI)'));
    const ofiRowsW = opportunities.filter(o => o.opportunity?.trim());
    if (ofiRowsW.length > 0) {
      content.push(tbl(['Ref', 'Standard Clause', 'Area / Process', 'Opportunity'], ofiRowsW.map(o => [o.id, o.standardClause || '—', o.areaProcess || '—', o.opportunity || '—']), amberFill));
    } else {
      content.push(new Paragraph({ children: [new TextRun({ text: 'No OFIs recorded.', size: 20, color: '888888' })] }));
    }
    content.push(spacer());

    // 7. NCR
    content.push(makeHeader('7. NON-CONFORMANCES (NCR)'));
    const ncrRowsW = nonConformances.filter(n => n.statement?.trim());
    if (ncrRowsW.length > 0) {
      content.push(tbl(['Ref', 'Standard Clause', 'Area / Process', 'NC Statement', 'Due Date', 'Action By'], ncrRowsW.map(n => [n.id, n.standardClause || '—', n.areaProcess || '—', n.statement || '—', n.dueDate || '—', n.actionBy || '—']), redFill));
    } else {
      content.push(new Paragraph({ children: [new TextRun({ text: 'No non-conformances recorded.', size: 20, color: '888888' })] }));
    }
    content.push(spacer());

    // 8. Template Fields (filled only, NC details inline)
    if (template.type === 'checklist' || template.isTripleMapping) {
      content.push(makeHeader('8. AUDIT CHECKLIST FINDINGS'));
      const filledChecklist = (editableChecklist as ChecklistContent[])
        .map((item, idx) => ({ item, d: (checklistData[idx] || {}) as any }))
        .filter(({ d }) => d.findings);
      if (filledChecklist.length === 0) {
        content.push(new Paragraph({ children: [new TextRun({ text: 'No findings recorded yet.', size: 20, color: '888888' })] }));
      } else {
        const makeBlueLabel = (label: string, value: string) =>
          new DocxTableRow({
            children: [
              new DocxTableCell({ shading: { fill: darkFill }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: 'FFFFFF', size: 18 })] })] }),
              new DocxTableCell({ columnSpan: 2, children: [new Paragraph({ children: [new TextRun({ text: value, size: 18 })] })] }),
            ]
          });
        const tableRows: DocxTableRow[] = [makeRow(['Clause', 'Question', 'Finding'], darkFill)];
        for (const { item, d } of filledChecklist) {
          tableRows.push(makeRow([item.clause, item.question, d.findings || '—']));
          if (d.evidence?.trim()) tableRows.push(makeBlueLabel('Evidence', d.evidence));
          if (d.findings !== 'C') {
            if (d.description?.trim()) tableRows.push(makeBlueLabel('Details', d.description));
            if (d.correction?.trim()) tableRows.push(makeBlueLabel('Correction', d.correction));
            if (d.rootCause?.trim()) tableRows.push(makeBlueLabel('Root Cause', d.rootCause));
            if (d.correctiveAction?.trim()) tableRows.push(makeBlueLabel('Corrective Action', d.correctiveAction));
          }
          // Inline image
          const clauseImgsW = (clauseFiles[item.clause] || []).filter((m) => m.type.startsWith('image/'));
          if (clauseImgsW.length > 0) {
            try {
              const base64Data = clauseImgsW[0].data.split(',')[1];
              const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              tableRows.push(new DocxTableRow({
                children: [new DocxTableCell({
                  columnSpan: 3,
                  children: [new Paragraph({ children: [new ImageRun({ data: buffer, transformation: { width: 400, height: 280 } })] })]
                })]
              }));
            } catch (e) { console.error('Word clause img failed', e); }
          }
        }
        // Extra questions added during the audit
        Object.entries(extraChecklistItems).forEach(([clause, extras]) => {
          extras.forEach((eq) => {
            if (!eq.question?.trim() && !eq.findings) return;
            tableRows.push(makeRow([clause, eq.question || '(no question text)', eq.findings || '—']));
            if (eq.evidence?.trim()) tableRows.push(makeBlueLabel('Evidence', eq.evidence));
            if (eq.findings !== 'C') {
              if (eq.correction?.trim()) tableRows.push(makeBlueLabel('Correction', eq.correction));
              if (eq.rootCause?.trim()) tableRows.push(makeBlueLabel('Root Cause', eq.rootCause!));
              if (eq.correctiveAction?.trim()) tableRows.push(makeBlueLabel('Corrective Action', eq.correctiveAction!));
            }
          });
        });
        content.push(new DocxTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }));
      }
    } else if (template.type === 'clause-checklist') {
      content.push(makeHeader('8. CLAUSE CHECKLIST'));
      const checklistToUse = (editableChecklist as ClauseChecklistContent[]).length > 0
        ? (editableChecklist as ClauseChecklistContent[])
        : (template.content as ClauseChecklistContent[]);

      const filledClauses = checklistToUse.filter(c => (clauseData[c.clauseId] || {} as any).findingType);
      if (filledClauses.length === 0) {
        content.push(new Paragraph({ children: [new TextRun({ text: 'No findings recorded yet.', size: 20, color: '888888' })] }));
      } else {
        const makeBlueLabel = (label: string, value: string) =>
          new DocxTableRow({
            children: [
              new DocxTableCell({ shading: { fill: darkFill }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: 'FFFFFF', size: 18 })] })] }),
              new DocxTableCell({ columnSpan: 3, children: [new Paragraph({ children: [new TextRun({ text: value, size: 18 })] })] }),
            ]
          });
          
        const tableRows: DocxTableRow[] = [makeRow(['Clause', 'Requirement', 'Status', 'Evidence'], darkFill)];
        for (const c of filledClauses) {
          const d = (clauseData[c.clauseId] || {}) as any; 
          const requirement = [c.title, ...(c.subClauses || [])].filter(Boolean).join('\n');
          tableRows.push(makeRow([c.clauseId, requirement, d.findingType || '—', d.evidence || '—']));
          
          if (d.findingType && d.findingType !== 'C') {
             if (d.description?.trim()) tableRows.push(makeBlueLabel('Description of Finding', d.description));
             if (d.correction?.trim()) tableRows.push(makeBlueLabel('Correction Done', d.correction));
             if (d.rootCause?.trim()) tableRows.push(makeBlueLabel('Root Cause', d.rootCause));
             if (d.correctiveAction?.trim()) tableRows.push(makeBlueLabel('Corrective Action', d.correctiveAction));
          }
        }
        content.push(new DocxTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }));
      }
    } else if (template.type === 'section') {
      content.push(makeHeader('8. SECTION RESPONSES'));
      const filledSecs = (template.content as SectionContent[])
        .map((sec, idx) => [sec.title || `Section ${idx + 1}`, sectionData[idx] || '']).filter(r => r[1].trim());
      if (filledSecs.length === 0) {
        content.push(new Paragraph({ children: [new TextRun({ text: 'No responses recorded yet.', size: 20, color: '888888' })] }));
      } else {
        content.push(tbl(['Section', 'Response'], filledSecs));
      }
    } else if (template.type === 'process-audit') {
      content.push(makeHeader('8. PROCESS AUDIT'));
      const filledPA = processAudits.filter(pa => pa.processArea?.trim() || pa.evidence?.trim());
      if (filledPA.length === 0) {
        content.push(new Paragraph({ children: [new TextRun({ text: 'No process audits recorded yet.', size: 20, color: '888888' })] }));
      } else {
        content.push(tbl(['Process Area', 'Auditees', 'Evidence', 'Conclusion', 'Finding'], filledPA.map(pa => [pa.processArea || '—', pa.auditees || '—', pa.evidence || '—', pa.conclusion || '—', (pa as any).findingType || '—'])));
      }
    } else if (template.isTripleMapping) {
      content.push(makeHeader('8. INTEGRATED AUDIT MAPPING (ISO 9001, 14001, 45001)'));
      const filledRows = CLAUSE_MATRIX
        .map((row, idx) => ({ row, idx, d: (checklistData[idx] || {}) as any }))
        .filter(({ row, d }) => isClauseSelected(row.id) && (d.findings || row.isHeading));

      if (filledRows.length === 0) {
        content.push(new Paragraph({ children: [new TextRun({ text: 'No findings recorded yet.', size: 20, color: '888888' })] }));
      } else {
        const makeBlueLabel = (label: string, value: string) =>
          new DocxTableRow({
            children: [
              new DocxTableCell({ shading: { fill: darkFill }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: 'FFFFFF', size: 18 })] })] }),
              new DocxTableCell({ columnSpan: 4, children: [new Paragraph({ children: [new TextRun({ text: value, size: 18 })] })] }),
            ]
          });

        const tableRows: DocxTableRow[] = [makeRow(['ISO 45001', 'ISO 14001', 'ISO 9001', 'Finding', 'Evidence'], darkFill)];
        for (const { row, d } of filledRows) {
          if (row.isHeading) {
            tableRows.push(new DocxTableRow({
              children: [new DocxTableCell({
                columnSpan: 5,
                shading: { fill: 'F3F4F6' },
                children: [new Paragraph({ children: [new TextRun({ text: `${row.iso45001} / ${row.iso14001} / ${row.iso9001}`, bold: true, size: 18 })] })]
              })]
            }));
            continue;
          }
          if (!d.findings) continue;

          tableRows.push(makeRow([row.iso45001, row.iso14001, row.iso9001, d.findings || '—', d.evidence || '—']));
          if (d.findings !== 'C') {
            if (d.description?.trim()) tableRows.push(makeBlueLabel('Details', d.description));
            if (d.correction?.trim()) tableRows.push(makeBlueLabel('Correction', d.correction));
            if (d.rootCause?.trim()) tableRows.push(makeBlueLabel('Root Cause', d.rootCause));
            if (d.correctiveAction?.trim()) tableRows.push(makeBlueLabel('Corrective Action', d.correctiveAction));
          }
        }
        content.push(new DocxTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }));
      }
    }
    content.push(spacer());

    // 9. Evidence & Images
    const allMediaW = [...Object.values(clauseFiles).flat(), ...Object.values(genericFiles).flat()];
    if (allMediaW.length > 0) {
      content.push(makeHeader('9. EVIDENCE & IMAGES'));
      for (const m of allMediaW) {
        if (m.type.startsWith('image/')) {
          try {
            const base64Data = m.data.split(',')[1];
            const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            content.push(new Paragraph({ children: [new ImageRun({ data: buffer, transformation: { width: 400, height: 300 } })] }));
            content.push(new Paragraph({ children: [new TextRun({ text: m.name, italics: true, size: 16 })] }));
          } catch (e) { console.error('Word image failed', e); }
        } else {
          content.push(new Paragraph({ children: [new TextRun({ text: `• ${m.name} (${m.type})`, size: 18 })] }));
        }
      }
    }

    const docx = new Document({ sections: [{ children: content }] });
    const blob = await Packer.toBlob(docx);
    saveAs(blob, `${(plan.auditName || 'Audit').replace(/\s+/g, '_')}_Report.docx`);
  };

  return (
    <div className="flex-1 p-8 pt-6 bg-transparent min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6 pb-24">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/audit")}
              className="gap-2 pl-0 hover:bg-transparent hover:text-slate-600"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Audit List
            </Button>
          </div>
        </div>

        {/* --- TOP OVERVIEW CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Plan Overview & Audit Details */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            {/* Plan Overview Card */}
            <Card className="shadow-sm border-slate-100 p-6 flex flex-col pt-5 h-fit">
              <div className="flex justify-between items-center bg-white mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Plan Overview
                </h2>
              </div>

              <div className="space-y-4 mb-2">
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <span className="text-sm font-medium text-slate-500">
                    Plan Name
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {plan.auditName}
                  </span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <span className="text-sm font-medium text-slate-500">
                    Site
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {plan.site?.name || plan.location || "N/A"}
                  </span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <span className="text-sm font-medium text-slate-500">
                    Date
                  </span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">
                      {plan.date
                        ? format(new Date(plan.date), "yyyy-MM-dd")
                        : "-"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <span className="text-sm font-medium text-slate-500">
                    Time
                  </span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">8:00 - 17:00</span>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <span className="text-sm font-medium text-slate-500">
                    Lead Auditor
                  </span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">
                      {plan.leadAuditor
                        ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}`
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Audit Details Card */}
            <Card className="shadow-sm border-slate-100 p-6 flex flex-col gap-5 bg-white">
              <div className="flex items-center gap-2">
                <div className="bg-slate-500 p-1.5 rounded-md">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Audit Details
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Objective
                  </span>
                  <p className="text-sm text-slate-800">
                    {plan.objective || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Scope
                  </span>
                  <p className="text-sm text-slate-800">
                    {plan.scope || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Audit Criteria
                  </span>
                  <p className="text-sm text-slate-800">
                    {plan.criteria || "N/A"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Progress & Downloads */}
          <div className="col-span-1 flex flex-col gap-6 h-fit">
            {/* Progress Card */}
            <Card className="shadow-sm border-slate-100 p-6 flex flex-col gap-6">
              <h2 className="text-lg font-bold text-slate-900 bg-white">
                Progress
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-medium text-slate-500">
                    Completion
                  </span>
                  <span className="text-3xl font-bold text-emerald-500 leading-none">
                    {progressValue}%
                  </span>
                </div>
                <Progress
                  value={progressValue}
                  className="h-2 bg-slate-100 [&>div]:bg-emerald-500 rounded-full"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">
                    Total Items
                  </span>
                  <span className="font-bold text-slate-800">{totalItems}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">Completed</span>
                  <span className="font-bold text-emerald-500">
                    {completedItems}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">Pending</span>
                  <span className="font-bold text-amber-500">
                    {pendingItems}
                  </span>
                </div>
              </div>
            </Card>

            {/* Download Options Card */}
            <Card className="shadow-sm border-slate-100 p-6 flex flex-col gap-4 bg-white">
              <h2 className="text-sm font-bold text-slate-900 mb-2">
                Export Report
              </h2>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-10 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                onClick={exportToExcel}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-600"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16h16V8l-6-6Z" />
                  <path d="M14 2v6h6" />
                  <path d="m8 12 4 4" />
                  <path d="m8 16 4-4" />
                </svg>
                Download Excel
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-10 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                onClick={exportToPDF}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-500"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M9 15v-4" />
                  <path d="M10.1 12H9v4" />
                  <path d="M15 11v4h2" />
                  <path d="M12 11v4" />
                  <path d="M12 13h1" />
                </svg>
                Download PDF
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-10 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                onClick={exportToWord}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M8 11.5l2 4 1-2 1 2 2-4" />
                </svg>
                Download Word
              </Button>
            </Card>
          </div>
        </div>

        {/* --- EXTENDED SECTIONS --- */}
        {(template.type === "clause-checklist" ||
          template.type === "checklist") && !focusFindings && (
            <div className="space-y-8 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              {/* Previous Audit Findings */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Previous Audit Findings
                </h3>
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-50 text-slate-700 font-bold p-3 text-sm border-b border-slate-200">
                    Closure of Findings from Previous Audit
                  </div>
                  <Textarea
                    className="min-h-[120px] border-0 rounded-none focus-visible:ring-0 resize-y p-4 bg-white"
                    placeholder="Enter details of previous findings closure..."
                    value={previousFindings}
                    onChange={(e) => setPreviousFindings(e.target.value)}
                  />
                </div>
              </div>

              {/* Details of Changes */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Details of Changes
                </h3>
                <div className="border border-slate-200 rounded-md overflow-hidden overflow-x-auto shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-slate-50">
                        <TableHead className="font-bold text-slate-700 w-[40%]">
                          Change Management monitoring in relation to:
                        </TableHead>
                        <TableHead className="font-bold text-slate-700 w-[12%]">
                          Action Required
                        </TableHead>
                        <TableHead className="font-bold text-slate-700">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailsOfChanges.map((change, idx) => (
                        <TableRow
                          key={idx}
                          className="divide-x divide-slate-100 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <TableCell className="font-medium text-slate-700 py-3">
                            {change.item}
                          </TableCell>
                          <TableCell className="text-center align-middle py-3">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                              checked={change.actionRequired}
                              onChange={(e) => {
                                const newChanges = [...detailsOfChanges];
                                newChanges[idx].actionRequired = e.target.checked;
                                setDetailsOfChanges(newChanges);
                              }}
                            />
                          </TableCell>
                          <TableCell className="p-0">
                            <Input
                              className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-full min-h-[44px] px-4"
                              value={change.notes}
                              placeholder="Add notes..."
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
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Audit Participants
                </h3>
                <div className="border border-slate-200 rounded-md overflow-hidden overflow-x-auto shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-slate-50">
                        <TableHead className="font-bold text-slate-700 w-[25%]">
                          Name
                        </TableHead>
                        <TableHead className="font-bold text-slate-700 w-[25%]">
                          Position
                        </TableHead>
                        <TableHead className="font-bold text-slate-700 w-[10%] text-center leading-tight">
                          Opening
                          <br />
                          meeting
                        </TableHead>
                        <TableHead className="font-bold text-slate-700 w-[10%] text-center leading-tight">
                          Closing
                          <br />
                          meeting
                        </TableHead>
                        <TableHead className="font-bold text-slate-700 w-[25%] leading-tight">
                          Interviewed
                          <br />
                          (processes)
                        </TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((p, idx) => (
                        <TableRow
                          key={idx}
                          className="divide-x divide-slate-100 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <TableCell className="p-0">
                            <Input
                              placeholder="Name..."
                              className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
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
                              placeholder="Position..."
                              className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                              value={p.position}
                              onChange={(e) => {
                                const n = [...participants];
                                n[idx].position = e.target.value;
                                setParticipants(n);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            <input
                              type="checkbox"
                              className="w-4 h-4 cursor-pointer text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                              checked={p.opening}
                              onChange={(e) => {
                                const n = [...participants];
                                n[idx].opening = e.target.checked;
                                setParticipants(n);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            <input
                              type="checkbox"
                              className="w-4 h-4 cursor-pointer text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                              checked={p.closing}
                              onChange={(e) => {
                                const n = [...participants];
                                n[idx].closing = e.target.checked;
                                setParticipants(n);
                              }}
                            />
                          </TableCell>
                          <TableCell className="p-0">
                            <Input
                              placeholder="Processes..."
                              className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                              value={p.interviewed}
                              onChange={(e) => {
                                const n = [...participants];
                                n[idx].interviewed = e.target.value;
                                setParticipants(n);
                              }}
                            />
                          </TableCell>
                          <TableCell className="p-2 text-center">
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
                  <div className="bg-white p-3 border-t border-slate-200 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addParticipant}
                      className="gap-2 text-slate-600 border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-900 w-full max-w-xs"
                    >
                      <Plus className="w-4 h-4" /> Add Participant
                    </Button>
                  </div>
                </div>
              </div>

              {/* Audit Findings Summary */}
              <div className="space-y-6 pt-6 border-t border-slate-100 mt-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Global Findings Log
                  </h3>

                  {/* Positive Aspects */}
                  <div className="space-y-3 mb-8">
                    <h4 className="font-semibold text-base text-slate-800">
                      Positive Aspects
                    </h4>
                    <div className="border border-slate-200 rounded-md overflow-hidden overflow-x-auto shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="hover:bg-slate-50">
                            <TableHead className="font-bold text-slate-700 w-[8%]">
                              No.
                            </TableHead>
                            <TableHead className="font-bold text-slate-700 w-[20%]">
                              Standard &<br />
                              Clause No.
                            </TableHead>
                            <TableHead className="font-bold text-slate-700 w-[25%]">
                              Area / Process
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Positive Aspect
                            </TableHead>
                            <TableHead className="w-[5%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {positiveAspects.map((pa, idx) => (
                            <TableRow
                              key={idx}
                              className="divide-x divide-slate-100 bg-white hover:bg-slate-50 transition-colors"
                            >
                              <TableCell className="font-bold text-slate-500 bg-slate-50/50 text-center">
                                {pa.id}
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  placeholder="e.g. 7.1"
                                  value={pa.standardClause}
                                  onChange={(e) => {
                                    const n = [...positiveAspects];
                                    n[idx].standardClause = e.target.value;
                                    setPositiveAspects(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  placeholder="e.g. HR"
                                  value={pa.areaProcess}
                                  onChange={(e) => {
                                    const n = [...positiveAspects];
                                    n[idx].areaProcess = e.target.value;
                                    setPositiveAspects(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  placeholder="Detail..."
                                  value={pa.aspect}
                                  onChange={(e) => {
                                    const n = [...positiveAspects];
                                    n[idx].aspect = e.target.value;
                                    setPositiveAspects(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-2 text-center">
                                {positiveAspects.length > 1 && (
                                  <Trash2
                                    className="w-4 h-4 text-slate-400 cursor-pointer hover:text-red-500 mx-auto transition-colors"
                                    onClick={() => removePositiveAspect(idx)}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="bg-white p-3 border-t border-slate-200 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addPositiveAspect}
                          className="gap-2 text-slate-600 border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-900 w-full max-w-xs"
                        >
                          <Plus className="w-4 h-4" /> Add Row
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Opportunities for Improvement */}
                  <div className="space-y-3 mb-8">
                    <div>
                      <h4 className="font-semibold text-base text-slate-800">
                        Opportunities for Improvement (OFI)
                      </h4>
                      <p className="text-sm text-slate-500 mt-1">
                        Recommendations to ensure continuous improvement.
                      </p>
                    </div>
                    <div className="border border-slate-200 rounded-md overflow-hidden overflow-x-auto shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="hover:bg-slate-50">
                            <TableHead className="font-bold text-slate-700 w-[8%]">
                              No.
                            </TableHead>
                            <TableHead className="font-bold text-slate-700 w-[20%]">
                              Standard
                              <br />
                              Clause
                            </TableHead>
                            <TableHead className="font-bold text-slate-700 w-[25%]">
                              Area / Process
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Opportunity for Improvement
                            </TableHead>
                            <TableHead className="w-[5%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {opportunities.map((ofi, idx) => (
                            <TableRow
                              key={idx}
                              className="divide-x divide-slate-100 bg-white hover:bg-slate-50 transition-colors"
                            >
                              <TableCell className="font-bold text-amber-600 bg-slate-50/50 text-center">
                                {ofi.id}
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  placeholder="e.g. 8.2"
                                  value={ofi.standardClause}
                                  onChange={(e) => {
                                    const n = [...opportunities];
                                    n[idx].standardClause = e.target.value;
                                    setOpportunities(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  placeholder="e.g. Production"
                                  value={ofi.areaProcess}
                                  onChange={(e) => {
                                    const n = [...opportunities];
                                    n[idx].areaProcess = e.target.value;
                                    setOpportunities(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  placeholder="Detail..."
                                  value={ofi.opportunity}
                                  onChange={(e) => {
                                    const n = [...opportunities];
                                    n[idx].opportunity = e.target.value;
                                    setOpportunities(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-2 text-center">
                                {opportunities.length > 1 && (
                                  <Trash2
                                    className="w-4 h-4 text-slate-400 cursor-pointer hover:text-red-500 mx-auto transition-colors"
                                    onClick={() => removeOpportunity(idx)}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="bg-white p-3 border-t border-slate-200 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addOpportunity}
                          className="gap-2 text-slate-600 border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-900 w-full max-w-xs"
                        >
                          <Plus className="w-4 h-4" /> Add Row
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Non-conformance */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-base text-slate-800">
                        Non-conformances (NCR)
                      </h4>
                      <p className="text-sm text-slate-500 mt-1">
                        Incomplete compliance requiring corrective action.
                      </p>
                    </div>
                    <div className="border border-slate-200 rounded-md overflow-hidden overflow-x-auto shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="hover:bg-slate-50">
                            <TableHead className="font-bold text-slate-700 w-[8%]">
                              No.
                            </TableHead>
                            <TableHead className="font-bold text-slate-700 w-[18%]">
                              Standard &<br />
                              Clause No.
                            </TableHead>
                            <TableHead className="font-bold text-slate-700 w-[20%]">
                              Area / Process
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Statement of Non-conformance
                            </TableHead>
                            <TableHead className="font-bold text-slate-700 w-[15%]">
                              Due Date
                            </TableHead>
                            <TableHead className="font-bold text-slate-700 w-[13%]">
                              Action By
                            </TableHead>
                            <TableHead className="w-[5%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nonConformances.map((ncr, idx) => (
                            <TableRow
                              key={idx}
                              className="divide-x divide-slate-100 bg-white hover:bg-slate-50 transition-colors"
                            >
                              <TableCell className="font-bold text-red-600 bg-slate-50/50 text-center">
                                {ncr.id}
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  placeholder="e.g. 9.1"
                                  value={ncr.standardClause}
                                  onChange={(e) => {
                                    const n = [...nonConformances];
                                    n[idx].standardClause = e.target.value;
                                    setNonConformances(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  placeholder="e.g. QA"
                                  value={ncr.areaProcess}
                                  onChange={(e) => {
                                    const n = [...nonConformances];
                                    n[idx].areaProcess = e.target.value;
                                    setNonConformances(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-0">
                                <Textarea
                                  className="min-h-[44px] border-0 focus-visible:ring-0 rounded-none bg-transparent resize-y p-3"
                                  placeholder="Detail..."
                                  value={ncr.statement}
                                  onChange={(e) => {
                                    const n = [...nonConformances];
                                    n[idx].statement = e.target.value;
                                    setNonConformances(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  type="date"
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  value={ncr.dueDate}
                                  onChange={(e) => {
                                    const n = [...nonConformances];
                                    n[idx].dueDate = e.target.value;
                                    setNonConformances(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-0">
                                <Input
                                  className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[44px] px-4"
                                  placeholder="Responsible person..."
                                  value={ncr.actionBy || ""}
                                  onChange={(e) => {
                                    const n = [...nonConformances];
                                    n[idx].actionBy = e.target.value;
                                    setNonConformances(n);
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-2 text-center">
                                {nonConformances.length > 1 && (
                                  <Trash2
                                    className="w-4 h-4 text-slate-400 cursor-pointer hover:text-red-500 mx-auto transition-colors"
                                    onClick={() => removeNonConformance(idx)}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="bg-white p-3 border-t border-slate-200 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addNonConformance}
                          className="gap-2 text-slate-600 border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-900 w-full max-w-xs"
                        >
                          <Plus className="w-4 h-4" /> Add Row
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


        {/* Findings Summary Table */}
        {focusFindings && findingsList.length > 0 && (
          <Card className="overflow-hidden border border-slate-200 shadow-md mb-8">
            <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
              <h3 className="text-white font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Audit Findings Summary
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="divide-x divide-slate-200">
                    <TableHead className="w-12 text-center font-bold text-slate-700">#</TableHead>
                    <TableHead className="w-[15%] font-bold text-slate-700">Clause / Ref</TableHead>
                    <TableHead className="w-[10%] font-bold text-slate-700">Type</TableHead>
                    <TableHead className="w-[45%] font-bold text-slate-700">
                      <div className="grid grid-cols-3 gap-4">
                        <span>Action By</span>
                        <span>Close Date</span>
                        <span>Assign To</span>
                      </div>
                    </TableHead>
                    <TableHead className="w-12 text-center font-bold text-slate-700">Go</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findingsList.map((f, idx) => (
                    <TableRow key={`${f.source}-${f.id}`} className="divide-x divide-slate-100 hover:bg-slate-50 transition-colors">
                      <TableCell className="text-center font-medium text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-slate-900">{f.ref}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white ${f.type === 'OFI' ? 'bg-amber-500' : f.type === 'C' ? 'bg-emerald-500' : f.type === 'Minor' ? 'bg-orange-600' : 'bg-red-600'
                          }`}>
                          {f.type}
                        </span>
                      </TableCell>
                      <TableCell className="p-0">
                        <div className="grid grid-cols-3 divide-x divide-slate-100">
                          <Input
                            className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-12 px-4 shadow-none text-sm"
                            placeholder="Action By..."
                            value={f.actionBy}
                            onChange={(e) => {
                              if (f.source === 'clause') handleClauseChange(f.id, 'actionBy', e.target.value);
                              else if (f.source === 'checklist') handleChecklistChange(Number(f.id), 'actionBy', e.target.value);
                              else if (f.source === 'process') updateProcessAudit(Number(f.id), 'actionBy', e.target.value);
                            }}
                          />
                          <Input
                            type="date"
                            className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-12 px-4 shadow-none text-sm"
                            value={f.closeDate}
                            onChange={(e) => {
                              if (f.source === 'clause') handleClauseChange(f.id, 'closeDate', e.target.value);
                              else if (f.source === 'checklist') handleChecklistChange(Number(f.id), 'closeDate', e.target.value);
                              else if (f.source === 'process') updateProcessAudit(Number(f.id), 'closeDate', e.target.value);
                            }}
                          />
                          <Input
                            className="border-0 focus-visible:ring-0 rounded-none bg-transparent h-12 px-4 shadow-none text-sm"
                            placeholder="Assign To..."
                            value={f.assignTo}
                            onChange={(e) => {
                              if (f.source === 'clause') handleClauseChange(f.id, 'assignTo', e.target.value);
                              else if (f.source === 'checklist') handleChecklistChange(Number(f.id), 'assignTo', e.target.value);
                              else if (f.source === 'process') updateProcessAudit(Number(f.id), 'assignTo', e.target.value);
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600"
                          onClick={() => {
                            const el = document.getElementById(`finding-${f.source}-${f.id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-slate-200"></div>
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">
            Audit Checklist
          </span>
          <div className="h-0.5 flex-1 bg-slate-200"></div>
        </div>

        {/* --- TEMPLATE DYNAMIC CHECKLIST --- */}
        {template.type === "clause-checklist" ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                Audit Checklist Details
              </h3>
              <Button 
                variant={isEditMode ? "default" : "outline"}
                onClick={() => setIsEditMode(!isEditMode)}
                className={isEditMode ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-amber-600 border-amber-200 hover:bg-amber-50"}
              >
                <Edit className="w-4 h-4 mr-2" />
                {isEditMode ? "Done Editing" : "Edit Questions"}
              </Button>
            </div>
            {(editableChecklist as ClauseChecklistContent[]).map((clauseContent, index) => {
              // 1. Filter sub-clauses individually based on the schedule
              const explicitlyHasClauses = explicitlySelectedClauses.length > 0;
              const filteredSubClauses = clauseContent.subClauses?.filter((sub) => {
                if (!explicitlyHasClauses) return true;
                return isClauseSelected(sub);
              }) || [];

              // If schedule is active but no sub-clauses matched, completely hide this major clause box
              if (explicitlyHasClauses && filteredSubClauses.length === 0) {
                return null;
              }

              // 2. Filter by standard relevance if it's an integrated/multi-standard context
              const clauseInMatrix = CLAUSE_MATRIX.find(m => m.id === clauseContent.clauseId);
              if (clauseInMatrix) {
                const isRelevantToActiveStandards = 
                  (showISO9001 && clauseInMatrix.iso9001 && !clauseInMatrix.iso9001.toLowerCase().includes('does not exist')) ||
                  (showISO14001 && clauseInMatrix.iso14001 && !clauseInMatrix.iso14001.toLowerCase().includes('does not exist')) ||
                  (showISO45001 && clauseInMatrix.iso45001 && !clauseInMatrix.iso45001.toLowerCase().includes('does not exist'));

                if (!isRelevantToActiveStandards) return null;
              }

              const clause = clauseInMatrix || {
                id: clauseContent.clauseId,
                iso9001: clauseContent.title,
                iso14001: clauseContent.title,
                iso45001: clauseContent.title
              } as any;
              const currentData =
                clauseData[clause.id] || ({} as ClauseChecklistContent);
              const type = currentData.findingType;

              if (focusFindings && !['OFI', 'Minor', 'Major'].includes(type as string)) {
                return null;
              }

              const showExtended =
                type === "Minor" || type === "Major" || type === "OFI";

              return (
                <Card
                  key={clause.id}
                  className="overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="bg-slate-800 text-white p-4">
                    <h3 className="text-xl font-bold flex items-center gap-4">
                      <span className="bg-white/20 px-2 py-0.5 rounded text-sm shrink-0">
                        Clause {clause.id}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex gap-2 mb-1.5">
                          {plan?.auditProgram?.isoStandard?.includes("9001") && clause.iso9001 && clause.iso9001 !== "Corresponding Clause does not exist" && (
                            <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-100 px-2 py-0.5 rounded border border-emerald-500/30 shadow-sm">ISO 9001</span>
                          )}
                          {plan?.auditProgram?.isoStandard?.includes("14001") && clause.iso14001 && clause.iso14001 !== "Corresponding Clause does not exist" && (
                            <span className="text-[10px] font-black bg-blue-500/20 text-blue-100 px-2 py-0.5 rounded border border-blue-500/30 shadow-sm">ISO 14001</span>
                          )}
                          {plan?.auditProgram?.isoStandard?.includes("45001") && clause.iso45001 && clause.iso45001 !== "Corresponding Clause does not exist" && (
                            <span className="text-[10px] font-black bg-orange-500/20 text-orange-100 px-2 py-0.5 rounded border border-orange-500/30 shadow-sm">ISO 45001</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {plan?.auditProgram?.isoStandard?.includes("9001") && clause.iso9001 && clause.iso9001 !== "Corresponding Clause does not exist" && (
                            <span className="text-sm font-medium text-slate-300 italic">
                              {clause.iso9001}
                            </span>
                          )}
                          {plan?.auditProgram?.isoStandard?.includes("14001") && clause.iso14001 && clause.iso14001 !== "Corresponding Clause does not exist" && (
                            <span className="text-sm font-medium text-slate-300 italic">
                              {clause.iso14001}
                            </span>
                          )}
                          {plan?.auditProgram?.isoStandard?.includes("45001") && clause.iso45001 && clause.iso45001 !== "Corresponding Clause does not exist" && (
                            <span className="text-sm font-medium text-slate-300 italic">
                              {clause.iso45001}
                            </span>
                          )}
                          {/* Fallback if no specific standard is mapped */}
                          {(!plan?.auditProgram?.isoStandard || (!clause.iso9001 && !clause.iso14001 && !clause.iso45001)) && (
                            <span className="text-lg leading-tight truncate">
                              {clause.iso9001 || clause.iso14001 || clause.iso45001}
                            </span>
                          )}
                        </div>
                      </div>
                    </h3>
                  </div>

                  <CardContent className="p-5 bg-white text-slate-900 flex flex-col gap-6">
                    {/* Sub-clauses / Questions */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                          Questions / Requirements:
                        </span>
                        {isEditMode && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-slate-500 hover:text-slate-700 h-8 px-2"
                            onClick={() => handleAddSubClause(index)}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add Question
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {filteredSubClauses.map((sub, i) => (
                          <div key={i} className="flex items-start gap-3 group">
                            {isEditMode ? (
                              <div className="flex-1 flex gap-2">
                                <Textarea 
                                  value={sub}
                                  onChange={(e) => handleEditClauseSubClause(index, i, e.target.value)}
                                  className="bg-white border-slate-200 text-slate-900 min-h-[60px] p-2 text-sm focus:ring-1 ring-amber-200"
                                />
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 text-slate-300 hover:text-red-500 p-0"
                                  onClick={() => handleRemoveSubClause(index, i)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                                <span className="text-slate-700 leading-relaxed text-sm">{sub}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Finding Type Selector */}
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Finding Type:
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          {
                            label: "Compliant (C)",
                            value: "C",
                            color: "bg-emerald-500",
                          },
                          { label: "OFI", value: "OFI", color: "bg-amber-500" },
                          {
                            label: "Minor N/C",
                            value: "Minor",
                            color: "bg-orange-600",
                          },
                          {
                            label: "Major N/C",
                            value: "Major",
                            color: "bg-red-600",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              handleClauseChange(
                                clause.id,
                                "findingType",
                                opt.value,
                              )
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border shadow-sm ${type === opt.value
                              ? `${opt.color} text-white border-transparent scale-[1.02] shadow-md ring-2 ring-slate-200 ring-offset-1`
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
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
                        <Label className="text-sm font-bold text-slate-700">
                          Finding Details
                        </Label>
                        <Textarea
                          className="bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 min-h-[100px] resize-y p-4 text-base focus:bg-white transition-colors"
                          placeholder="Enter initial audit evidence / findings..."
                          value={currentData.findingDetails || ""}
                          onChange={(e) =>
                            handleClauseChange(
                              clause.id,
                              "findingDetails",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    )}

                    {/* Extended Fields for Non-Compliance/OFI */}
                    {showExtended && (
                      <div className="space-y-5 pt-5 border-t border-slate-100 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`px-2 py-0.5 rounded text-xs font-bold text-white uppercase tracking-wider
                                                    ${type === "OFI" ? "bg-amber-500" : type === "Minor" ? "bg-orange-600" : "bg-red-600"}`}
                          >
                            {type} Details
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                              Description of Finding{" "}
                              {type !== "OFI" && (
                                <span className="text-red-500">*</span>
                              )}
                            </Label>
                            <Textarea
                              className="bg-white border-slate-200 text-slate-900 min-h-[120px] resize-y p-3 focus:ring-slate-400"
                              value={currentData.description || ""}
                              onChange={(e) =>
                                handleClauseChange(
                                  clause.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                              Correction Done{" "}
                              {type !== "OFI" && (
                                <span className="text-red-500">*</span>
                              )}
                            </Label>
                            <Textarea
                              className="bg-white border-slate-200 text-slate-900 min-h-[120px] resize-y p-3 focus:ring-slate-400"
                              placeholder="Immediate action taken..."
                              value={currentData.correction || ""}
                              onChange={(e) =>
                                handleClauseChange(
                                  clause.id,
                                  "correction",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                              Root Cause{" "}
                              {type !== "OFI" && (
                                <span className="text-red-500">*</span>
                              )}
                            </Label>
                            <Textarea
                              className="bg-white border-slate-200 text-slate-900 min-h-[120px] resize-y p-3 focus:ring-slate-400"
                              placeholder="Why did this occur?"
                              value={currentData.rootCause || ""}
                              onChange={(e) =>
                                handleClauseChange(
                                  clause.id,
                                  "rootCause",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                              Corrective Action{" "}
                              {type !== "OFI" && (
                                <span className="text-red-500">*</span>
                              )}
                            </Label>
                            <Textarea
                              className="bg-white border-slate-200 text-slate-900 min-h-[120px] resize-y p-3 focus:ring-slate-400"
                              placeholder="Action to prevent recurrence..."
                              value={currentData.correctiveAction || ""}
                              onChange={(e) =>
                                handleClauseChange(
                                  clause.id,
                                  "correctiveAction",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Action By / Close Date / Assign To row for Clause Checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700">
                              Action By
                            </Label>
                            <Input
                              className="bg-white border-slate-200 text-slate-900"
                              placeholder="Who is responsible..."
                              value={currentData.actionBy || ""}
                              onChange={(e) =>
                                handleClauseChange(clause.id, "actionBy", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700">
                              Close Date
                            </Label>
                            <Input
                              type="date"
                              className="bg-white border-slate-200 text-slate-900"
                              value={currentData.closeDate || ""}
                              onChange={(e) =>
                                handleClauseChange(clause.id, "closeDate", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700">
                              Assign To
                            </Label>
                            <Input
                              className="bg-white border-slate-200 text-slate-900"
                              placeholder="Department or Person..."
                              value={currentData.assignTo || ""}
                              onChange={(e) =>
                                handleClauseChange(clause.id, "assignTo", e.target.value)
                              }
                            />
                          </div>
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
                          onChange={(e) => handleGenericFileUpload(`clause_checklist_${clause.id}`, e.target.files)}
                        />
                        <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-700">
                          <Upload className="w-4 h-4" />
                          <span>Add / Upload / Insert record or picture</span>
                        </div>
                      </label>

                      {genericFiles[`clause_checklist_${clause.id}`] && genericFiles[`clause_checklist_${clause.id}`].length > 0 && (
                        <div className="w-full flex flex-col gap-2 p-2">
                          <span className="text-xs font-bold text-slate-500 uppercase">Attached Files</span>
                          <div className="flex flex-wrap gap-2">
                            {genericFiles[`clause_checklist_${clause.id}`].map((file, fileIdx) => (
                              <div key={fileIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs shadow-sm">
                                <FileText className="w-4 h-4 text-emerald-600" />
                                <span className="max-w-[150px] truncate" title={file.name}>{file.name}</span>
                                <Trash2
                                  className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 cursor-pointer ml-1 transition-colors"
                                  onClick={() => removeGenericFile(`clause_checklist_${clause.id}`, fileIdx)}
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
        ) : template.type === "section" ? (
          <div className="space-y-6">
            {(template.content as SectionContent[]).map((section, index) => (
              <Card
                key={index}
                className="overflow-hidden border border-slate-200 shadow-sm"
              >
                <CardHeader className="bg-slate-800 text-white py-4 px-5">
                  <CardTitle className="text-xl font-bold">
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                  <Textarea
                    className="min-h-[150px] text-sm resize-y p-5 text-base border-0 focus-visible:ring-0 rounded-none"
                    placeholder={`Enter findings for ${section.title}...`}
                    value={sectionData[index] || ""}
                    onChange={(e) => handleSectionChange(index, e.target.value)}
                  />

                  <div className="border-t border-slate-100 bg-slate-50 mt-4 flex flex-col items-center justify-center rounded-b-lg -mx-4 -mb-4">
                    <label className="w-full p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 text-sm">
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
        ) : template.type === "process-audit" ? (
          <div className="space-y-8">
            {/* Process Audit Configuration Header */}
            {!focusFindings && (
              <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Process Audit Report Options
                  </h3>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-500 rounded border-slate-600 focus:ring-emerald-500 cursor-pointer"
                        checked={showExecutiveSummary}
                        onChange={(e) => setShowExecutiveSummary(e.target.checked)}
                      />
                      <span className="text-sm font-bold text-slate-200">
                        Executive Summary
                      </span>
                    </label>
                    <label className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-500 rounded border-slate-600 focus:ring-emerald-500 cursor-pointer"
                        checked={showAuditParticipants}
                        onChange={(e) => setShowAuditParticipants(e.target.checked)}
                      />
                      <span className="text-sm font-bold text-slate-200">
                        Audit Participants
                      </span>
                    </label>
                    <label className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-500 rounded border-slate-600 focus:ring-emerald-500 cursor-pointer"
                        checked={showAuditFindings}
                        onChange={(e) => setShowAuditFindings(e.target.checked)}
                      />
                      <span className="text-sm font-bold text-slate-200">
                        Audit Findings
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Executive Summary & Findings Overview */}
            {!focusFindings && (showExecutiveSummary ||
              showAuditParticipants ||
              showAuditFindings) && (
                <div className="space-y-8 bg-white rounded-xl p-6 shadow-sm border border-slate-200 mt-6">
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
                              <TableHead className="font-bold text-white border-none px-4 py-3 text-center text-xs">Compliant NCs</TableHead>
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
                              <TableHead className="font-bold text-white w-[25%] px-4 py-3">
                                Name
                              </TableHead>
                              <TableHead className="font-bold text-white w-[25%] px-4 py-3">
                                Position
                              </TableHead>
                              <TableHead className="font-bold text-white w-[12%] text-center px-2 py-3 leading-tight">
                                Opening meeting
                              </TableHead>
                              <TableHead className="font-bold text-white w-[12%] text-center px-2 py-3 leading-tight">
                                Closing meeting
                              </TableHead>
                              <TableHead className="font-bold text-white w-[26%] px-4 py-3 leading-tight">
                                Interviewed (processes)
                              </TableHead>
                              <TableHead className="w-[50px] bg-slate-800"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {participants.map((p, idx) => (
                              <TableRow
                                key={idx}
                                className="bg-white hover:bg-slate-50 transition-colors divide-x divide-slate-200"
                              >
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
                              <TableHead className="font-bold text-white w-[15%] px-4 py-3">
                                Ref No.
                              </TableHead>
                              <TableHead className="font-bold text-white w-[15%] px-4 py-3">
                                Clause No.
                              </TableHead>
                              <TableHead className="font-bold text-white w-[50%] px-4 py-3">
                                Details of finding[s] raised
                              </TableHead>
                              <TableHead className="font-bold text-white w-[20%] text-center px-4 py-3">
                                Category of Finding
                              </TableHead>
                              <TableHead className="w-[50px] bg-slate-800"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {auditFindings.map((finding, idx) => (
                              <TableRow
                                key={idx}
                                className="bg-white hover:bg-slate-50 transition-colors divide-x divide-slate-200"
                              >
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
              <div className="h-0.5 flex-1 bg-slate-200"></div>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">
                Audit Reports
              </span>
              <div className="h-0.5 flex-1 bg-slate-200"></div>
            </div>

            {processAudits.map((audit, index) => {
              const type = audit.findingType;

              if (focusFindings && !['OFI', 'Minor', 'Major'].includes(type as string)) {
                return null;
              }

              const showExtended =
                type === "Minor" ||
                type === "Major" ||
                type === "OFI" ||
                type === "C";

              return (
                <Card
                  key={audit.id}
                  className="overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between bg-slate-800 text-white p-4">
                    <h3 className="text-xl font-bold flex items-center gap-3">
                      <span className="bg-white/20 px-2 py-0.5 rounded text-sm shrink-0">
                        #{index + 1}
                      </span>
                      Audit Report
                    </h3>
                    {processAudits.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-red-500/20 hover:text-red-400"
                        onClick={() => removeProcessAudit(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardContent className="p-0 bg-white text-slate-900 flex flex-col">
                    <Table>
                      <TableBody>
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableCell className="w-[30%] font-bold text-slate-700 bg-slate-50 border-r align-top py-4">
                            Auditee[s]
                          </TableCell>
                          <TableCell className="p-0 align-top">
                            <Input
                              className="border-0 focus-visible:ring-0 rounded-none bg-transparent min-h-[50px] px-4 shadow-none"
                              value={audit.auditees}
                              onChange={(e) =>
                                updateProcessAudit(
                                  index,
                                  "auditees",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableCell
                            colSpan={2}
                            className="font-bold text-slate-700 bg-slate-50 p-4 border-b"
                          >
                            Evidence to support the audit conclusion
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableCell colSpan={2} className="p-0">
                            <Textarea
                              className="w-full min-h-[120px] border-0 focus-visible:ring-0 rounded-none bg-transparent resize-y p-5 shadow-none"
                              value={audit.evidence}
                              onChange={(e) =>
                                updateProcessAudit(
                                  index,
                                  "evidence",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableCell
                            colSpan={2}
                            className="font-bold text-slate-700 bg-slate-50 p-4 border-b"
                          >
                            Conclusion of the overall effectiveness of the
                            process
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableCell colSpan={2} className="p-0">
                            <Textarea
                              className="w-full min-h-[120px] border-0 focus-visible:ring-0 rounded-none bg-transparent resize-y p-5 shadow-none"
                              value={audit.conclusion}
                              onChange={(e) =>
                                updateProcessAudit(
                                  index,
                                  "conclusion",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {/* Finding and details section inside the process report */}
                    <div className="p-5 border-t border-slate-100 flex flex-col gap-6 bg-slate-50/30">
                      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-sm font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                          Category of Finding:
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            {
                              label: "Compliant (C)",
                              value: "C",
                              color: "bg-emerald-500",
                            },
                            {
                              label: "OFI",
                              value: "OFI",
                              color: "bg-amber-500",
                            },
                            {
                              label: "Minor N/C",
                              value: "Minor",
                              color: "bg-orange-600",
                            },
                            {
                              label: "Major N/C",
                              value: "Major",
                              color: "bg-red-600",
                            },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() =>
                                updateProcessAudit(
                                  index,
                                  "findingType",
                                  type === opt.value
                                    ? undefined
                                    : (opt.value as any),
                                )
                              }
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border shadow-sm ${type === opt.value
                                ? `${opt.color} text-white border-transparent scale-[1.02] shadow-md ring-2 ring-slate-200 ring-offset-1`
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {showExtended && (
                        <div className="space-y-6 bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 p-6 animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                Description of Finding
                              </Label>
                              <Textarea
                                className="bg-slate-50 border-slate-200 text-slate-900 min-h-[100px] resize-y p-3 focus:bg-white"
                                value={audit.description || ""}
                                onChange={(e) =>
                                  updateProcessAudit(
                                    index,
                                    "description",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                Correction Done
                              </Label>
                              <Textarea
                                className="bg-slate-50 border-slate-200 text-slate-900 min-h-[100px] resize-y p-3 focus:bg-white"
                                value={audit.correction || ""}
                                onChange={(e) =>
                                  updateProcessAudit(
                                    index,
                                    "correction",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                Root Cause
                              </Label>
                              <Textarea
                                className="bg-slate-50 border-slate-200 text-slate-900 min-h-[100px] resize-y p-3 focus:bg-white"
                                value={audit.rootCause || ""}
                                onChange={(e) =>
                                  updateProcessAudit(
                                    index,
                                    "rootCause",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                Corrective Action
                              </Label>
                              <Textarea
                                className="bg-slate-50 border-slate-200 text-slate-900 min-h-[100px] resize-y p-3 focus:bg-white"
                                value={audit.correctiveAction || ""}
                                onChange={(e) =>
                                  updateProcessAudit(
                                    index,
                                    "correctiveAction",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>

                          {/* Action By / Close Date / Assign To row for Process Audit */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 pb-6 px-6 bg-white rounded-b-xl border-t border-slate-100">
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-slate-700">
                                Action By
                              </Label>
                              <Input
                                className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white"
                                placeholder="Who is responsible..."
                                value={audit.actionBy || ""}
                                onChange={(e) =>
                                  updateProcessAudit(index, "actionBy", e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-slate-700">
                                Close Date
                              </Label>
                              <Input
                                type="date"
                                className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white"
                                value={audit.closeDate || ""}
                                onChange={(e) =>
                                  updateProcessAudit(index, "closeDate", e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-slate-700">
                                Assign To
                              </Label>
                              <Input
                                className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white"
                                placeholder="Department or Person..."
                                value={audit.assignTo || ""}
                                onChange={(e) =>
                                  updateProcessAudit(index, "assignTo", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col items-center justify-center p-4 border-t border-slate-100 bg-slate-50/50">
                        <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-200 bg-white rounded-xl hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all group">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleGenericFileUpload(`process_audit_${index}`, e.target.files)}
                          />
                          <div className="flex items-center gap-3 text-slate-500 group-hover:text-slate-800 font-medium">
                            <div className="bg-slate-100 p-2 rounded-full group-hover:bg-slate-200 transition-colors">
                              <Upload className="w-4 h-4" />
                            </div>
                            <span>Add / Upload / Insert record or picture</span>
                          </div>
                        </label>
                        {genericFiles[`process_audit_${index}`] && genericFiles[`process_audit_${index}`].length > 0 && (
                          <div className="w-full mt-4 flex flex-col gap-2">
                            <span className="text-sm font-bold text-slate-500 uppercase px-1">Attached Files</span>
                            <div className="flex flex-wrap gap-2">
                              {genericFiles[`process_audit_${index}`].map((file, fileIdx) => (
                                <div key={fileIdx} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-sm shadow-sm">
                                  <FileText className="w-4 h-4 text-emerald-600" />
                                  <span className="max-w-[150px] truncate" title={file.name}>{file.name}</span>
                                  <Trash2
                                    className="w-4 h-4 text-slate-400 hover:text-red-500 cursor-pointer ml-1 transition-colors"
                                    onClick={() => removeGenericFile(`process_audit_${index}`, fileIdx)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
        ) : template.isTripleMapping ? (
          <Card className="overflow-hidden border border-slate-200 shadow-sm bg-white rounded-xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800 hover:bg-slate-800 border-none">
                    {showISO45001 && (
                      <TableHead className={`${activeCount === 1 ? 'w-[54%]' : activeCount === 2 ? 'w-[27%]' : 'w-[18%]'} font-bold text-white border-r border-slate-700 text-xs uppercase tracking-wider`}>
                        ISO 45001:2018
                      </TableHead>
                    )}
                    {showISO14001 && (
                      <TableHead className={`${activeCount === 1 ? 'w-[54%]' : activeCount === 2 ? 'w-[27%]' : 'w-[18%]'} font-bold text-white border-r border-slate-700 text-xs uppercase tracking-wider`}>
                        ISO 14001:2015
                      </TableHead>
                    )}
                    {showISO9001 && (
                      <TableHead className={`${activeCount === 1 ? 'w-[54%]' : activeCount === 2 ? 'w-[27%]' : 'w-[18%]'} font-bold text-white border-r border-slate-700 text-xs uppercase tracking-wider`}>
                        ISO 9001:2015
                      </TableHead>
                    )}
                    {!isEditMode && (
                      <>
                        <TableHead className="w-[16%] font-bold text-white text-center border-r border-slate-700 text-xs uppercase tracking-wider">
                          Finding
                        </TableHead>
                        <TableHead className="w-[30%] font-bold text-white text-center text-xs uppercase tracking-wider">
                          Audit Evidence
                        </TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {CLAUSE_MATRIX.map((row, index) => {
                    // Filter based on schedule if needed
                    if (!isClauseSelected(row.id)) return null;

                    const type = checklistData[index]?.findings;
                    if (focusFindings && !['OFI', 'Min', 'Maj', 'C'].includes(type as string)) {
                      return null;
                    }

                    if (row.isHeading) {
                      // Only show heading if at least one active standard has content for it
                      const hasActiveContent = 
                        (showISO9001 && row.iso9001 && !row.iso9001.toLowerCase().includes('does not exist')) ||
                        (showISO14001 && row.iso14001 && !row.iso14001.toLowerCase().includes('does not exist')) ||
                        (showISO45001 && row.iso45001 && !row.iso45001.toLowerCase().includes('does not exist'));
                      
                      if (!hasActiveContent) return null;

                      return (
                        <TableRow key={row.id} className="bg-[#213847] hover:bg-[#213847] border-none">
                          {showISO45001 && (
                            <TableCell className="font-bold text-white text-[10px] py-3 border-r border-slate-700">
                              {row.iso45001} {row.iso45001 && !row.iso45001.includes('does not exist') && '(45001)'}
                            </TableCell>
                          )}
                          {showISO14001 && (
                            <TableCell className="font-bold text-white text-[10px] py-3 border-r border-slate-700">
                              {row.iso14001} {row.iso14001 && !row.iso14001.includes('does not exist') && '(14001)'}
                            </TableCell>
                          )}
                          {showISO9001 && (
                            <TableCell className="font-bold text-white text-[10px] py-3 border-r border-slate-700">
                              {row.iso9001} {row.iso9001 && !row.iso9001.includes('does not exist') && '(9001)'}
                            </TableCell>
                          )}
                          {!isEditMode && <TableCell colSpan={2} className="bg-[#213847]"></TableCell>}
                        </TableRow>
                      );
                    }

                    // For non-heading rows:
                    const isRelevantToActiveStandards = 
                      (showISO9001 && row.iso9001 && !row.iso9001.toLowerCase().includes('does not exist')) ||
                      (showISO14001 && row.iso14001 && !row.iso14001.toLowerCase().includes('does not exist')) ||
                      (showISO45001 && row.iso45001 && !row.iso45001.toLowerCase().includes('does not exist'));

                    if (!isRelevantToActiveStandards) return null;

                    // Find questions for this clause from editable checklist
                    const questions = (editableChecklist as ChecklistContent[]).filter(q => q.clause === row.id);

                    // If no questions found for this relevant clause, provide a default one so it's not empty
                    if (questions.length === 0) {
                      const defaultQuestionText = [
                        showISO9001 && row.iso9001,
                        showISO14001 && row.iso14001,
                        showISO45001 && row.iso45001
                      ].filter(q => q && !q.toLowerCase().includes('does not exist')).join(' / ') || `Clause ${row.id} requirements`;
                      
                      // Note: Handle adding this to editableChecklist if the user wants to audit it
                      // For now, we show a button to add it, or just show it as a placeholder.
                      // Let's at least show a placeholder row in Edit Mode to allow adding.
                      if (!isEditMode) return null; // Or show it? Auditor might want to audit it.
                      
                      return (
                        <TableRow key={row.id} className="bg-slate-50/50">
                          <TableCell colSpan={activeCount} className="p-4 text-center">
                            <span className="text-[11px] text-slate-400 italic mr-3">No questions defined for Clause {row.id}</span>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] border-slate-200"
                              onClick={() => handleAddQuestion(row.id, editableChecklist.length)}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add Question
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return questions.map((item, qIndex) => {
                      const dataIndex = (editableChecklist as any[]).findIndex(q => q === item);
                      const type = checklistData[dataIndex]?.findings;

                      return (
                        <React.Fragment key={`${row.id}-${qIndex}`}>
                          <TableRow className="divide-x divide-slate-100 bg-white hover:bg-slate-50/50 transition-colors">
                            <TableCell colSpan={isEditMode ? activeCount : activeCount} className="text-[12px] leading-relaxed py-4 px-4 align-top text-slate-800 font-medium whitespace-pre-wrap">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Clause {item.clause} Question:</span>
                                  {isEditMode && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleRemoveQuestion(dataIndex)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                                {isEditMode ? (
                                  <Textarea
                                    className="min-h-[80px] text-[12px] mt-1 border-amber-200 bg-amber-50/20 focus:bg-white"
                                    value={item.question}
                                    onChange={(e) => handleEditQuestion(dataIndex, e.target.value)}
                                  />
                                ) : (
                                  item.question
                                )}
                              </div>
                            </TableCell>

                            {!isEditMode && (
                              <>
                                {/* Findings */}
                                <TableCell className="p-3 align-top">
                                  <div className="flex flex-wrap gap-1.5 justify-center">
                                    {[
                                      { val: "C", color: "bg-emerald-500" },
                                      { val: "OFI", color: "bg-amber-500" },
                                      { val: "Min", color: "bg-orange-600" },
                                      { val: "Maj", color: "bg-red-600" },
                                    ].map((opt) => (
                                      <div
                                        key={opt.val}
                                        className={`
                                          w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black cursor-pointer border transition-all shadow-sm
                                          ${type === opt.val
                                            ? `${opt.color} text-white border-transparent scale-105 shadow-md ring-2 ring-slate-200`
                                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                          }
                                        `}
                                        onClick={() => {
                                          handleChecklistChange(dataIndex, "findings", opt.val);
                                          handleChecklistChange(dataIndex, "clause", row.id);
                                        }}
                                      >
                                        {opt.val}
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>

                                {/* Evidence */}
                                <TableCell className="p-2 align-top">
                                  {!["OFI", "Min", "Maj"].includes(type) && (
                                    <Textarea
                                      className="min-h-[80px] text-[11px] resize-y border-slate-200 bg-slate-50/50 focus:bg-white shadow-none p-2"
                                      placeholder="Evidence..."
                                      value={checklistData[dataIndex]?.evidence || ""}
                                      onChange={(e) => handleChecklistChange(dataIndex, "evidence", e.target.value)}
                                    />
                                  )}
                                </TableCell>
                              </>
                            )}
                          </TableRow>

                          {isEditMode && qIndex === questions.length - 1 && (
                            <TableRow className="bg-amber-50/30">
                              <TableCell colSpan={activeCount} className="p-2 text-center border-b border-amber-100">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-amber-700 hover:bg-amber-100/50 h-8 gap-2 text-[10px] font-bold uppercase tracking-wider"
                                  onClick={() => handleAddQuestion(row.id, dataIndex)}
                                >
                                  <Plus className="w-3 h-3" /> Add Question to Clause {row.id}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )}


                          {/* Extended findings for Mapping rows */}
                          {["OFI", "Min", "Maj"].includes(type) && (
                            <TableRow className="bg-slate-50 border-b-4 border-slate-200 text-sm">
                              <TableCell colSpan={5} className="p-0">
                                <div className="p-5 m-3 border bg-white rounded-xl shadow-sm border-slate-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <Label className="text-[11px] font-bold text-slate-700">Description</Label>
                                      <Textarea
                                        className="min-h-[80px] text-[11px] bg-slate-50 border-slate-200 p-2"
                                        value={checklistData[dataIndex]?.description || ""}
                                        onChange={(e) => handleChecklistChange(dataIndex, "description", e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-[11px] font-bold text-slate-700">Correction</Label>
                                      <Textarea
                                        className="min-h-[80px] text-[11px] bg-slate-50 border-slate-200 p-2"
                                        value={checklistData[dataIndex]?.correction || ""}
                                        onChange={(e) => handleChecklistChange(dataIndex, "correction", e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-[11px] font-bold text-slate-700">Root Cause</Label>
                                      <Textarea
                                        className="min-h-[80px] text-[11px] bg-slate-50 border-slate-200 p-2"
                                        value={checklistData[dataIndex]?.rootCause || ""}
                                        onChange={(e) => handleChecklistChange(dataIndex, "rootCause", e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-[11px] font-bold text-slate-700">Corrective Action</Label>
                                      <Textarea
                                        className="min-h-[80px] text-[11px] bg-slate-50 border-slate-200 p-2"
                                        value={checklistData[dataIndex]?.correctiveAction || ""}
                                        onChange={(e) => handleChecklistChange(dataIndex, "correctiveAction", e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Action By</Label>
                                      <Input
                                        className="h-8 text-[11px] bg-slate-50 border-slate-200"
                                        value={checklistData[dataIndex]?.actionBy || ""}
                                        onChange={(e) => handleChecklistChange(dataIndex, "actionBy", e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Close Date</Label>
                                      <Input
                                        type="date"
                                        className="h-8 text-[11px] bg-slate-50 border-slate-200"
                                        value={checklistData[dataIndex]?.closeDate || ""}
                                        onChange={(e) => handleChecklistChange(dataIndex, "closeDate", e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Assign To</Label>
                                      <Input
                                        className="h-8 text-[11px] bg-slate-50 border-slate-200"
                                        value={checklistData[dataIndex]?.assignTo || ""}
                                        onChange={(e) => handleChecklistChange(dataIndex, "assignTo", e.target.value)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    });
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 shadow-sm bg-white rounded-xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800 hover:bg-slate-800 border-none">
                    <TableHead className="w-[80px] font-bold text-white border-r border-slate-700">
                      Clause
                    </TableHead>
                    <TableHead className="w-[35%] font-bold text-white border-r border-slate-700">
                      Audit Question
                    </TableHead>
                    <TableHead className="w-[20%] font-bold text-white text-center border-r border-slate-700">
                      Finding
                    </TableHead>
                    <TableHead className="w-[35%] font-bold text-white text-center">
                      Audit Evidence
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(editableChecklist as ChecklistContent[]).map(
                    (item, index, array) => {
                      // 1. Filter by schedule selection
                      if (!isClauseSelected(item.clause)) {
                        return null;
                      }

                      // 2. Filter by standard relevance if mapped in CLAUSE_MATRIX
                      const clauseInMatrix = CLAUSE_MATRIX.find(m => m.id === item.clause);
                      if (clauseInMatrix) {
                        const isRelevantToActiveStandards = 
                          (showISO9001 && clauseInMatrix.iso9001 && !clauseInMatrix.iso9001.toLowerCase().includes('does not exist')) ||
                          (showISO14001 && clauseInMatrix.iso14001 && !clauseInMatrix.iso14001.toLowerCase().includes('does not exist')) ||
                          (showISO45001 && clauseInMatrix.iso45001 && !clauseInMatrix.iso45001.toLowerCase().includes('does not exist'));

                        if (!isRelevantToActiveStandards) return null;
                      }

                      const type = checklistData[index]?.findings;

                      if (focusFindings && !['OFI', 'Min', 'Maj', 'C'].includes(type as string)) {
                        return null;
                      }

                      const showClause = index === 0 || array[index - 1].clause !== item.clause;
                      const isLastInGroup = index === array.length - 1 || array[index + 1].clause !== item.clause;

                      return (
                        <React.Fragment key={index}>
                          <TableRow className={`divide-x divide-slate-100 bg-white hover:bg-slate-50/50 transition-colors ${!isLastInGroup ? 'border-b-0' : ''}`}>
                            <TableCell className={`font-bold text-slate-600 align-top ${showClause ? 'bg-slate-50/30' : 'bg-transparent text-transparent select-none border-t-0'}`}>
                              {showClause ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-slate-900 border-b border-slate-200 pb-1 mb-1 block">Clause {item.clause}</span>
                                  {(() => {
                                    const match = CLAUSE_MATRIX.find(m => m.id === item.clause);
                                    if (!match) return <span className="text-[10px] text-slate-400">Custom Clause</span>;

                                    return (
                                      <div className="flex flex-col gap-1">
                                        {plan?.auditProgram?.isoStandard?.includes("9001") && match.iso9001 && !match.iso9001.includes('does not exist') && (
                                          <div className="text-[10px] text-blue-600 font-bold leading-tight flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-blue-500 shrink-0"></div>
                                            {match.iso9001} (9001)
                                          </div>
                                        )}
                                        {plan?.auditProgram?.isoStandard?.includes("14001") && match.iso14001 && !match.iso14001.includes('does not exist') && (
                                          <div className="text-[10px] text-emerald-600 font-bold leading-tight flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0"></div>
                                            {match.iso14001} (14001)
                                          </div>
                                        )}
                                        {plan?.auditProgram?.isoStandard?.includes("45001") && match.iso45001 && !match.iso45001.includes('does not exist') && (
                                          <div className="text-[10px] text-orange-600 font-bold leading-tight flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-orange-500 shrink-0"></div>
                                            {match.iso45001} (45001)
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : ''}
                            </TableCell>
                            <TableCell className="align-top font-medium text-slate-800 py-4">
                              {isEditMode ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Question Text:</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleRemoveQuestion(index)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <Textarea
                                    className="min-h-[100px] text-sm border-amber-200 bg-amber-50/20 focus:bg-white p-3"
                                    value={item.question}
                                    onChange={(e) => handleEditQuestion(index, e.target.value)}
                                  />
                                </div>
                              ) : (
                                item.question
                              )}
                            </TableCell>

                            {!isEditMode && (
                              <>
                                {/* Findings Selection */}
                                <TableCell className="p-4 align-top">
                                  <div className="flex flex-wrap gap-2 justify-center">
                                    {[
                                      { val: "C", color: "bg-emerald-500" },
                                      { val: "OFI", color: "bg-amber-500" },
                                      { val: "Min", color: "bg-orange-600" },
                                      { val: "Maj", color: "bg-red-600" },
                                    ].map((opt) => (
                                      <div
                                        key={opt.val}
                                        className={`
                                                                        w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black cursor-pointer border transition-all shadow-sm
                                                                        ${type ===
                                            opt.val
                                            ? `${opt.color} text-white border-transparent scale-105 shadow-md ring-2 ring-slate-200 ring-offset-1`
                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                          }
                                                                    `}
                                        onClick={() => {
                                          handleChecklistChange(index, "findings", opt.val);
                                          // Also persist clause so AuditFindings can group correctly
                                          handleChecklistChange(index, "clause", item.clause);
                                        }}

                                      >
                                        {opt.val}
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>

                                {/* Evidence */}
                                <TableCell className="p-3 align-top">
                                  <div className="flex flex-col h-full">
                                    {!["OFI", "Min", "Maj"].includes(type) && (
                                      <Textarea
                                        className="min-h-[100px] text-sm resize-y border-slate-200 bg-slate-50/50 focus:bg-white shadow-sm transition-colors placeholder:text-slate-400 p-3"
                                        placeholder="Documented info / records checked..."
                                        value={checklistData[index]?.evidence || ""}
                                        onChange={(e) =>
                                          handleChecklistChange(
                                            index,
                                            "evidence",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    )}
                                  </div>
                                </TableCell>
                              </>
                            )}
                          </TableRow>

                          {/* Extended findings conditionally */}
                          {["OFI", "Min", "Maj"].includes(type) && (
                            <TableRow className="bg-slate-50 border-b-4 border-slate-200 text-sm">
                              <TableCell colSpan={4} className="p-0">
                                <div className="p-6 ml-6 mr-6 my-4 border bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border-slate-200">
                                  <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
                                    <div
                                      className={`px-2.5 py-1 rounded-md text-xs font-black text-white uppercase tracking-wider
                                                                    ${type === "OFI" ? "bg-amber-500" : type === "Min" ? "bg-orange-600" : "bg-red-600"}`}
                                    >
                                      {type === "Min"
                                        ? "Minor N/C"
                                        : type === "Maj"
                                          ? "Major N/C"
                                          : "OFI"}{" "}
                                      Details
                                    </div>
                                    <span className="text-slate-400 text-xs font-medium">
                                      Fill in the findings form below.
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                      <Label className="font-bold text-slate-700 flex items-center gap-1">
                                        Details{" "}
                                        {type !== "OFI" && (
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        )}
                                      </Label>
                                      <Textarea
                                        placeholder="Detailed description..."
                                        className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white resize-y p-3"
                                        value={
                                          checklistData[index]?.description ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          handleChecklistChange(
                                            index,
                                            "description",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold text-slate-700 flex items-center gap-1">
                                        Correction{" "}
                                        {type !== "OFI" && (
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        )}
                                      </Label>
                                      <Textarea
                                        placeholder="Immediate action..."
                                        className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white resize-y p-3"
                                        value={
                                          checklistData[index]?.correction || ""
                                        }
                                        onChange={(e) =>
                                          handleChecklistChange(
                                            index,
                                            "correction",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold text-slate-700 flex items-center gap-1">
                                        Root Cause{" "}
                                        {type !== "OFI" && (
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        )}
                                      </Label>
                                      <Textarea
                                        placeholder="Why did this happen?"
                                        className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white resize-y p-3"
                                        value={
                                          checklistData[index]?.rootCause || ""
                                        }
                                        onChange={(e) =>
                                          handleChecklistChange(
                                            index,
                                            "rootCause",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold text-slate-700 flex items-center gap-1">
                                        Corrective Action{" "}
                                        {type !== "OFI" && (
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        )}
                                      </Label>
                                      <Textarea
                                        placeholder="Preventative measures..."
                                        className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white resize-y p-3"
                                        value={
                                          checklistData[index]
                                            ?.correctiveAction || ""
                                        }
                                        onChange={(e) =>
                                          handleChecklistChange(
                                            index,
                                            "correctiveAction",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                  </div>

                                  {/* Action By / Close Date / Assign To row for Checklist */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 mt-4">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-slate-700">
                                        Action By
                                      </Label>
                                      <Input
                                        className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white"
                                        placeholder="Who is responsible..."
                                        value={checklistData[index]?.actionBy || ""}
                                        onChange={(e) =>
                                          handleChecklistChange(index, "actionBy", e.target.value)
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-slate-700">
                                        Close Date
                                      </Label>
                                      <Input
                                        type="date"
                                        className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white"
                                        value={checklistData[index]?.closeDate || ""}
                                        onChange={(e) =>
                                          handleChecklistChange(index, "closeDate", e.target.value)
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-bold text-slate-700">
                                        Assign To
                                      </Label>
                                      <Input
                                        className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white"
                                        placeholder="Department or Person..."
                                        value={checklistData[index]?.assignTo || ""}
                                        onChange={(e) =>
                                          handleChecklistChange(index, "assignTo", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}

                          {/* Upload Evidence per Clause Group */}
                          {isLastInGroup && (
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
                                      <span className="text-xs font-semibold">
                                        Upload evidence (images, docs, pdfs) for Clause {item.clause}
                                      </span>
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
                              {/* Extra custom questions added for this clause */}
                              {(extraChecklistItems[item.clause] || []).map((eq, eqIdx) => {
                                const eqType = eq.findings;
                                return (
                                  <React.Fragment key={`eq-${item.clause}-${eqIdx}`}>
                                    <TableRow className="divide-x divide-slate-100 bg-blue-50/30 hover:bg-blue-50/40 transition-colors border-l-2 border-l-blue-400">
                                      <TableCell className="font-bold text-blue-400 align-top text-xs italic pt-4">+Q</TableCell>
                                      <TableCell className="align-top py-3 pr-2">
                                        <div className="flex items-start gap-2">
                                          <textarea
                                            className="w-full min-h-[70px] text-sm resize-y border border-blue-200 rounded-md bg-white p-2 focus:outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-slate-400"
                                            placeholder="Enter additional question for this clause..."
                                            value={eq.question}
                                            onChange={(e) => handleExtraChecklistChange(item.clause, eqIdx, 'question', e.target.value)}
                                          />
                                          <button
                                            className="mt-1 w-6 h-6 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors font-bold"
                                            onClick={() => removeExtraChecklistQuestion(item.clause, eqIdx)}
                                            title="Remove this question"
                                          >×</button>
                                        </div>
                                      </TableCell>
                                      <TableCell className="p-4 align-top">
                                        <div className="flex flex-wrap gap-2 justify-center">
                                          {[{ val: "C", color: "bg-emerald-500" }, { val: "OFI", color: "bg-amber-500" }, { val: "Min", color: "bg-orange-600" }, { val: "Maj", color: "bg-red-600" }].map((opt) => (
                                            <div
                                              key={opt.val}
                                              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black cursor-pointer border transition-all shadow-sm ${eqType === opt.val ? `${opt.color} text-white border-transparent scale-105 shadow-md` : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
                                              onClick={() => handleExtraChecklistChange(item.clause, eqIdx, 'findings', opt.val)}
                                            >{opt.val}</div>
                                          ))}
                                        </div>
                                      </TableCell>
                                      <TableCell className="p-3 align-top">
                                        <textarea
                                          className="w-full min-h-[80px] text-sm resize-y border border-slate-200 rounded-md bg-slate-50/50 p-2 focus:outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-slate-400"
                                          placeholder="Evidence..."
                                          value={eq.evidence}
                                          onChange={(e) => handleExtraChecklistChange(item.clause, eqIdx, 'evidence', e.target.value)}
                                        />
                                      </TableCell>
                                    </TableRow>
                                    {["OFI", "Min", "Maj", "C"].includes(eqType) && (
                                      <TableRow className="bg-slate-50 border-b-2 border-slate-200 text-sm">
                                        <TableCell colSpan={4} className="p-0">
                                          <div className="p-4 ml-4 mr-4 my-3 border bg-white rounded-xl border-slate-200 grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                              <label className="text-xs font-bold text-slate-600">Correction</label>
                                              <textarea className="w-full min-h-[70px] text-sm border border-slate-200 rounded bg-slate-50 p-2 resize-y" placeholder="Correction..." value={eq.correction || ''} onChange={(e) => handleExtraChecklistChange(item.clause, eqIdx, 'correction', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-xs font-bold text-slate-600">Root Cause</label>
                                              <textarea className="w-full min-h-[70px] text-sm border border-slate-200 rounded bg-slate-50 p-2 resize-y" placeholder="Root cause..." value={eq.rootCause || ''} onChange={(e) => handleExtraChecklistChange(item.clause, eqIdx, 'rootCause', e.target.value)} />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                              <label className="text-xs font-bold text-slate-600">Corrective Action</label>
                                              <textarea className="w-full min-h-[70px] text-sm border border-slate-200 rounded bg-slate-50 p-2 resize-y" placeholder="Corrective action..." value={eq.correctiveAction || ''} onChange={(e) => handleExtraChecklistChange(item.clause, eqIdx, 'correctiveAction', e.target.value)} />
                                            </div>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                              {/* Add Question button – appears at bottom of every clause group */}
                              <TableRow className="bg-white hover:bg-slate-50 border-b-4 border-slate-200">
                                <TableCell colSpan={4} className="py-2 px-4">
                                  <button
                                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 hover:border-blue-400 transition-all"
                                    onClick={() => addExtraChecklistQuestion(item.clause)}
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add Question for Clause {item.clause}
                                  </button>
                                </TableCell>
                              </TableRow>
                            </>
                          )}

                        </React.Fragment>
                      );
                    },
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Submit Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg flex justify-end gap-4 z-50">
          <Button
            variant="outline"
            size="lg"
            className="bg-white"
            onClick={() => navigate("/audit")}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {(template.type === 'checklist' || template.isTripleMapping || template.type === 'clause-checklist') && (
              <Button
                variant={isEditMode ? "secondary" : "outline"}
                className={`flex items-center gap-2 ${isEditMode ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : ''}`}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Edit className="w-4 h-4" />
                {isEditMode ? "Done Editing" : "Edit Questions"}
              </Button>
            )}
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 shadow-sm"
              onClick={handleSubmit}
            >
              <Save className="w-5 h-5" /> Save Audit Progress
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditExecute;
