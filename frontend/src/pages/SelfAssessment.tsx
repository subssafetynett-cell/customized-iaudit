import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import ReusablePagination from "@/components/ReusablePagination";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Plus, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, ClipboardList, RotateCcw, Award, Search, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Download, History, FileText, Minus } from "lucide-react";
import { format } from "date-fns";
import { useCompanyStore } from "@/hooks/useCompanyStore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Document, Packer, Paragraph, TextRun, ImageRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

// --- Types ---
type Standard = "ISO 14001" | "ISO 9001" | "ISO 45001";

interface Question {
    id: string;
    clause: string;
    text: string;
    answer: "yes" | "no" | null;
}

interface SavedAssessment {
    id: string;
    companyName: string; // Auditor's Company
    auditorName: string;
    auditCompany?: string; // Company being audited
    standard: Standard;
    score: number;
    date: string;
    email?: string;
    questions: Question[];
    // New Fields
    auditDate?: string;
    auditLocation?: string;
    auditRepresentatives?: string;
    contactEmail?: string;
    auditScope?: string;
    auditorPosition?: string;
}

// --- Data ---
const ISO_14001_QUESTIONS: Question[] = [
    // Clause 4
    { id: "q1", clause: "4. Context of the Organization", text: "Have internal and external issues that affect the EMS and its intended outcomes been identified and documented?", answer: null },
    { id: "q2", clause: "4. Context of the Organization", text: "Has the organization determined whether climate change is a relevant issue for its EMS (e.g. transition risk, physical risk, regulation)?", answer: null },
    { id: "q3", clause: "4. Context of the Organization", text: "Is there a defined method to review and update internal and external issues, including climate-related issues where relevant, at planned intervals?", answer: null },
    { id: "q4", clause: "4. Context of the Organization", text: "Have environmental-relevant interested parties (regulators, neighbours, customers, NGOs, owners, workers) and their needs and expectations been determined and reviewed?", answer: null },
    { id: "q5", clause: "4. Context of the Organization", text: "Where interested parties have climate-related environmental requirements (e.g. net-zero, disclosure, adaptation), are these identified and considered?", answer: null },
    { id: "q6", clause: "4. Context of the Organization", text: "Has the scope of the EMS been defined, including organizational boundaries, activities, products, and services?", answer: null },
    { id: "q7", clause: "4. Context of the Organization", text: "Have environmental aspects and associated impacts been identified for activities, products, and services within scope?", answer: null },
    { id: "q8", clause: "4. Context of the Organization", text: "Are significant environmental aspects determined using defined criteria and kept under review?", answer: null },

    // Clause 5
    { id: "q9", clause: "5. Leadership", text: "Does top management take accountability for the effectiveness of the EMS and for environmental performance?", answer: null },
    { id: "q10", clause: "5. Leadership", text: "Is an environmental policy established that includes commitments to protection of the environment, compliance obligations, pollution prevention, and continual improvement?", answer: null },
    { id: "q11", clause: "5. Leadership", text: "Is the environmental policy appropriate to the organization context and communicated within the organization and made available to interested parties?", answer: null },
    { id: "q12", clause: "5. Leadership", text: "Are roles, responsibilities, and authorities related to the EMS defined and communicated?", answer: null },
    { id: "q13", clause: "5. Leadership", text: "Is environmental performance considered in strategic decisions and business planning?", answer: null },
    { id: "q14", clause: "5. Leadership", text: "Does leadership promote continual improvement and resource provision for the EMS?", answer: null },
    { id: "q14_1", clause: "5. Leadership", text: "Are top management roles ensuring the integration of EMS requirements into business processes?", answer: null },
    { id: "q14_2", clause: "5. Leadership", text: "Is the environmental policy communicated, understood, and applied within the organization?", answer: null },

    // Clause 6
    { id: "q15", clause: "6. Planning", text: "Are environmental aspects, including those associated with new or modified activities, products, and services, determined and documented?", answer: null },
    { id: "q16", clause: "6. Planning", text: "Are potential environmental impacts (adverse and beneficial) associated with identified aspects evaluated and prioritized?", answer: null },
    { id: "q17", clause: "6. Planning", text: "Are compliance obligations (legal and other requirements) identified, accessed, and kept up to date?", answer: null },
    { id: "q18", clause: "6. Planning", text: "Are risks and opportunities related to environmental aspects, compliance obligations, and other issues determined and addressed?", answer: null },
    { id: "q19", clause: "6. Planning", text: "Are environmental objectives established at relevant functions and levels, consistent with the policy and measurable where practicable?", answer: null },
    { id: "q20", clause: "6. Planning", text: "Are plans in place for achieving environmental objectives, including responsibilities, resources, timeframes, and evaluation methods?", answer: null },
    { id: "q21", clause: "6. Planning", text: "Where climate change is relevant, are climate-related risks and opportunities integrated into environmental planning and objectives (e.g. emissions reduction, resilience, adaptation)?", answer: null },
    { id: "q22", clause: "6. Planning", text: "Are plans in place to address life-cycle environmental considerations where applicable (e.g. upstream/downstream impacts)?", answer: null },
    { id: "q23", clause: "6. Planning", text: "Are changes to the EMS planned and controlled to avoid unintended environmental impacts?", answer: null },

    // Clause 7
    { id: "q24", clause: "7. Support", text: "Are resources adequate for establishing, implementing, maintaining, and improving the EMS?", answer: null },
    { id: "q25", clause: "7. Support", text: "Is competence determined for persons doing work under the organization control that may cause significant environmental impacts, with training and evaluation as needed?", answer: null },
    { id: "q26", clause: "7. Support", text: "Are persons aware of the environmental policy, significant aspects, relevant objectives, and the implications of not conforming?", answer: null },
    { id: "q27", clause: "7. Support", text: "Are internal and external environmental communications (what, when, with whom, how, who communicates) determined and implemented?", answer: null },
    { id: "q28", clause: "7. Support", text: "Is documented information required by ISO 14001 and necessary for EMS effectiveness appropriately created, updated, and controlled?", answer: null },
    { id: "q29", clause: "7. Support", text: "Are systems in place to ensure access to up-to-date legal and other environmental requirements?", answer: null },
    { id: "q30", clause: "7. Support", text: "Are environmental records (monitoring data, waste records, permits, incident records) retained and retrievable as required?", answer: null },
    { id: "q31", clause: "7. Support", text: "Where climate change is relevant, is competence and awareness provided regarding climate-related environmental risks and obligations (e.g. emissions reporting, adaptation)?", answer: null },

    // Clause 8
    { id: "q32", clause: "8. Operation", text: "Are operational controls implemented to manage significant environmental aspects and compliance obligations (procedures, work instructions, engineering controls)?", answer: null },
    { id: "q33", clause: "8. Operation", text: "Are outsourced processes and contractors controlled to ensure environmental requirements are met?", answer: null },
    { id: "q33_1", clause: "8. Operation", text: "Are design and development processes controlling environmental aspects of products and services?", answer: null },
    { id: "q33_2", clause: "8. Operation", text: "Are environmental requirements communicated to external providers regarding goods and services?", answer: null },
    { id: "q33_3", clause: "8. Operation", text: "Is there a process for emergency preparedness and response?", answer: null },
    { id: "q33_4", clause: "8. Operation", text: "Are potential emergency situations identified and response plans tested?", answer: null },
    { id: "q33_5", clause: "8. Operation", text: "Is documented information maintained to have confidence that processes have been carried out as planned?", answer: null },
    { id: "q33_6", clause: "8. Operation", text: "Are processes to control purchased products and services defined?", answer: null },

    // Clause 9
    { id: "q34", clause: "9. Performance Evaluation", text: "Is environmental performance monitored, measured, analyzed, and evaluated?", answer: null },
    { id: "q35", clause: "9. Performance Evaluation", text: "Is the evaluation of compliance with legal and other requirements conducted?", answer: null },
    { id: "q36", clause: "9. Performance Evaluation", text: "Are internal audits conducted at planned intervals to provide information on the EMS?", answer: null },
    { id: "q37", clause: "9. Performance Evaluation", text: "Is the internal audit program implemented and maintained?", answer: null },
    { id: "q38", clause: "9. Performance Evaluation", text: "Does top management review the organization's EMS at planned intervals?", answer: null },
    { id: "q39", clause: "9. Performance Evaluation", text: "Are the results of monitoring and measurement analyzed and evaluated?", answer: null },
    { id: "q40", clause: "9. Performance Evaluation", text: "Are calibrated or verified monitoring and measurement equipment used and maintained?", answer: null },
    { id: "q41", clause: "9. Performance Evaluation", text: "Is the status of compliance with legal requirements communicated to relevant interested parties?", answer: null },

    // Clause 10
    { id: "q42", clause: "10. Improvement", text: "Are opportunities for improvement determined and actions selected?", answer: null },
    { id: "q43", clause: "10. Improvement", text: "Are nonconformities and corrective actions managed properly?", answer: null },
    { id: "q44", clause: "10. Improvement", text: "Is the root cause of nonconformities determined to prevent recurrence?", answer: null },
    { id: "q45", clause: "10. Improvement", text: "Is the effectiveness of corrective actions reviewed?", answer: null },
    { id: "q46", clause: "10. Improvement", text: "Is the EMS continually improved to enhance environmental performance?", answer: null },
    { id: "q47", clause: "10. Improvement", text: "Are documented information retained as evidence of the nature of nonconformities?", answer: null },
    { id: "q48", clause: "10. Improvement", text: "Are documented information retained as evidence of the results of corrective actions?", answer: null },
    { id: "q49", clause: "10. Improvement", text: "Are results of analysis and evaluation used to correct nonconformities?", answer: null },
];

const ISO_9001_QUESTIONS: Question[] = [
    // Clause 4
    { id: "q1", clause: "4. Context of the Organization", text: "Has the organization determined external and internal issues that are relevant to its purpose and strategic direction?", answer: null },
    { id: "q2", clause: "4. Context of the Organization", text: "Are the needs and expectations of interested parties determined?", answer: null },
    { id: "q4_3", clause: "4. Context of the Organization", text: "Who are the interested parties that are relevant to the QMS?", answer: null },
    { id: "q4_4", clause: "4. Context of the Organization", text: "Is the scope of the quality management system determined and documented?", answer: null },
    { id: "q4_5", clause: "4. Context of the Organization", text: "Are processes needed for the QMS and their application throughout the organization determined?", answer: null },
    { id: "q4_6", clause: "4. Context of the Organization", text: "Are the inputs required and the outputs expected from these processes determined?", answer: null },
    { id: "q4_7", clause: "4. Context of the Organization", text: "Are the risks and opportunities determined?", answer: null },
    { id: "q4_8", clause: "4. Context of the Organization", text: "Is the QMS established, implemented, maintained and continually improved?", answer: null },

    // Clause 5
    { id: "q3", clause: "5. Leadership", text: "Does top management demonstrate leadership and commitment with respect to the QMS?", answer: null },
    { id: "q4", clause: "5. Leadership", text: "Is the quality policy established and communicated?", answer: null },
    { id: "q5_3", clause: "5. Leadership", text: "Is the quality policy available and maintained as documented information?", answer: null },
    { id: "q5_4", clause: "5. Leadership", text: "Are roles, responsibilities and authorities assigned, communicated and understood?", answer: null },
    { id: "q5_5", clause: "5. Leadership", text: "Is customer focus promoted throughout the organization?", answer: null },
    { id: "q5_6", clause: "5. Leadership", text: "Are organizational roles, responsibilities and authorities assigned?", answer: null },
    { id: "q5_7", clause: "5. Leadership", text: "Does top management ensure that the requirements of the QMS are met?", answer: null },
    { id: "q5_8", clause: "5. Leadership", text: "Is the integrity of the QMS maintained when changes are planned and implemented?", answer: null },

    // Clause 6
    { id: "q5", clause: "6. Planning", text: "Are actions to address risks and opportunities planned?", answer: null },
    { id: "q6", clause: "6. Planning", text: "Are quality objectives established at relevant functions, levels and processes?", answer: null },
    { id: "q6_3", clause: "6. Planning", text: "Are the quality objectives measurable?", answer: null },
    { id: "q6_4", clause: "6. Planning", text: "Do the objectives take into account applicable requirements?", answer: null },
    { id: "q6_5", clause: "6. Planning", text: "Are the objectives relevant to conformity of products and services and to enhancement of customer satisfaction?", answer: null },
    { id: "q6_6", clause: "6. Planning", text: "Are the objectives monitored?", answer: null },
    { id: "q6_7", clause: "6. Planning", text: "Are the objectives communicated?", answer: null },
    { id: "q6_8", clause: "6. Planning", text: "Are changes to the QMS planned and carried out in a systematic manner?", answer: null },

    // Clause 7
    { id: "q7", clause: "7. Support", text: "Are resources determined and provided for the establishment, implementation, maintenance and continual improvement of the QMS?", answer: null },
    { id: "q8", clause: "7. Support", text: "Is documented information required by the QMS and International Standard controlled?", answer: null },
    { id: "q7_3", clause: "7. Support", text: "Are the necessary persons determined and provided for the effective implementation of the QMS?", answer: null },
    { id: "q7_4", clause: "7. Support", text: "Is the infrastructure necessary for the operation of processes determined, provided and maintained?", answer: null },
    { id: "q7_5", clause: "7. Support", text: "Is the environment for the operation of processes determined, provided and maintained?", answer: null },
    { id: "q7_6", clause: "7. Support", text: "Are resources for monitoring and measurement determined and provided?", answer: null },
    { id: "q7_7", clause: "7. Support", text: "Is the organizational knowledge necessary for the operation of processes determined and maintained?", answer: null },
    { id: "q7_8", clause: "7. Support", text: "Are persons doing work under the organization's control competent?", answer: null },

    // Clause 8
    { id: "q9", clause: "8. Operation", text: "Are processes for the provision of products and services planned, implemented and controlled?", answer: null },
    { id: "q10", clause: "8. Operation", text: "Are requirements for products and services determined?", answer: null },
    { id: "q8_3", clause: "8. Operation", text: "Is communication with customers established?", answer: null },
    { id: "q8_4", clause: "8. Operation", text: "Are design and development of products and services established and implemented?", answer: null },
    { id: "q8_5", clause: "8. Operation", text: "Are externally provided processes, products and services controlled?", answer: null },
    { id: "q8_6", clause: "8. Operation", text: "Is production and service provision controlled?", answer: null },
    { id: "q8_7", clause: "8. Operation", text: "Is release of products and services ensured?", answer: null },
    { id: "q8_8", clause: "8. Operation", text: "Is control of nonconforming outputs ensured?", answer: null },

    // Clause 9
    { id: "q11", clause: "9. Performance Evaluation", text: "Is customer satisfaction monitored?", answer: null },
    { id: "q12", clause: "9. Performance Evaluation", text: "Are internal audits conducted at planned intervals?", answer: null },
    { id: "q9_3", clause: "9. Performance Evaluation", text: "Is the performance and effectiveness of the QMS analyzed and evaluated?", answer: null },
    { id: "q9_4", clause: "9. Performance Evaluation", text: "Does top management review the organization's QMS?", answer: null },
    { id: "q9_5", clause: "9. Performance Evaluation", text: "Is management review conducted at planned intervals?", answer: null },
    { id: "q9_6", clause: "9. Performance Evaluation", text: "Are the inputs to management review planned and carried out?", answer: null },
    { id: "q9_7", clause: "9. Performance Evaluation", text: "Are the outputs of management review documented?", answer: null },
    { id: "q9_8", clause: "9. Performance Evaluation", text: "Are results of analysis used to evaluate conformity of products and services?", answer: null },

    // Clause 10
    { id: "q13", clause: "10. Improvement", text: "Does the organization determine and select opportunities for improvement?", answer: null },
    { id: "q14", clause: "10. Improvement", text: "Are nonconformities and corrective actions managed appropriately?", answer: null },
    { id: "q10_3", clause: "10. Improvement", text: "Are corrective actions taken to eliminate the causes of nonconformities?", answer: null },
    { id: "q10_4", clause: "10. Improvement", text: "Is the effectiveness of any corrective action taken reviewed?", answer: null },
    { id: "q10_5", clause: "10. Improvement", text: "Is the suitability, adequacy and effectiveness of the QMS continually improved?", answer: null },
    { id: "q10_6", clause: "10. Improvement", text: "Are risks and opportunities updated during corrective actions if necessary?", answer: null },
    { id: "q10_7", clause: "10. Improvement", text: "Are changes made to the QMS if necessary?", answer: null },
    { id: "q10_8", clause: "10. Improvement", text: "Is documented information retained as evidence of the results of corrective actions?", answer: null },
];

const ISO_45001_QUESTIONS: Question[] = [
    // Clause 4
    { id: "q1", clause: "4. Context of the Organization", text: "Has the organization determined external and internal issues relevant to its purpose and OH&S management system?", answer: null },
    { id: "q2", clause: "4. Context of the Organization", text: "Are the needs and expectations of workers and other interested parties determined?", answer: null },
    { id: "q4_3", clause: "4. Context of the Organization", text: "Is the scope of the OH&S management system determined?", answer: null },
    { id: "q4_4", clause: "4. Context of the Organization", text: "Is the OH&S management system established, implemented, maintained and continually improved?", answer: null },
    { id: "q4_5", clause: "4. Context of the Organization", text: "Are workers' needs and expectations considered in the OH&S management system?", answer: null },
    { id: "q4_6", clause: "4. Context of the Organization", text: "Are applicable legal requirements and other requirements determined?", answer: null },
    { id: "q4_7", clause: "4. Context of the Organization", text: "Are the boundaries and applicability of the OH&S management system determined?", answer: null },
    { id: "q4_8", clause: "4. Context of the Organization", text: "Are the processes needed for the OH&S management system determined?", answer: null },

    // Clause 5
    { id: "q3", clause: "5. Leadership", text: "Does top management demonstrate leadership and commitment with respect to the OH&S management system?", answer: null },
    { id: "q4", clause: "5. Leadership", text: "Is there a process for consultation and participation of workers?", answer: null },
    { id: "q5_3", clause: "5. Leadership", text: "Is the OH&S policy established, implemented and maintained?", answer: null },
    { id: "q5_4", clause: "5. Leadership", text: "Are organizational roles, responsibilities and authorities assigned and communicated?", answer: null },
    { id: "q5_5", clause: "5. Leadership", text: "Are workers protected from reprisals when reporting incidents?", answer: null },
    { id: "q5_6", clause: "5. Leadership", text: "Does top management ensure that the OH&S management system achieves its intended outcomes?", answer: null },
    { id: "q5_7", clause: "5. Leadership", text: "Are workers consulted on determining the needs and expectations of interested parties?", answer: null },
    { id: "q5_8", clause: "5. Leadership", text: "Is the OH&S policy communicated within the organization?", answer: null },

    // Clause 6
    { id: "q5", clause: "6. Planning", text: "Are hazards identified and risks and opportunities assessed?", answer: null },
    { id: "q6", clause: "6. Planning", text: "Are legal and other requirements determined?", answer: null },
    { id: "q6_3", clause: "6. Planning", text: "Are actions to address risks and opportunities planned?", answer: null },
    { id: "q6_4", clause: "6. Planning", text: "Are OH&S objectives established at relevant functions and levels?", answer: null },
    { id: "q6_5", clause: "6. Planning", text: "Are plans to achieve OH&S objectives maintained as documented information?", answer: null },
    { id: "q6_6", clause: "6. Planning", text: "Are assessment of OH&S risks and other risks to the OH&S management system conducted?", answer: null },
    { id: "q6_7", clause: "6. Planning", text: "Are assessment of OH&S opportunities and other opportunities conducted?", answer: null },
    { id: "q6_8", clause: "6. Planning", text: "Are hazard identification processes ongoing and proactive?", answer: null },

    // Clause 7
    { id: "q7", clause: "7. Support", text: "Are resources determined and provided for the OH&S management system?", answer: null },
    { id: "q8", clause: "7. Support", text: "Are workers competent on the basis of education, training or experience?", answer: null },
    { id: "q7_3", clause: "7. Support", text: "Is documented information required by the OH&S management system controlled?", answer: null },
    { id: "q7_4", clause: "7. Support", text: "Is awareness of the OH&S policy and objectives ensured?", answer: null },
    { id: "q7_5", clause: "7. Support", text: "Is internal and external communication relevant to the OH&S management system determined?", answer: null },
    { id: "q7_6", clause: "7. Support", text: "Is documented information of external origin identified and controlled?", answer: null },
    { id: "q7_7", clause: "7. Support", text: "Are workers made aware of incidents and the outcomes of evaluations?", answer: null },
    { id: "q7_8", clause: "7. Support", text: "Is documented information retained as evidence of competence?", answer: null },

    // Clause 8
    { id: "q9", clause: "8. Operation", text: "Are operational controls implemented to eliminate hazards and reduce OH&S risks?", answer: null },
    { id: "q10", clause: "8. Operation", text: "Is emergency preparedness and response planned?", answer: null },
    { id: "q8_3", clause: "8. Operation", text: "Are changes dealing with the OH&S management system managed?", answer: null },
    { id: "q8_4", clause: "8. Operation", text: "Are procurement processes controlled?", answer: null },
    { id: "q8_5", clause: "8. Operation", text: "Are contractors controlled to ensure compliance with the OH&S management system?", answer: null },
    { id: "q8_6", clause: "8. Operation", text: "Are outsourced functions and processes controlled?", answer: null },
    { id: "q8_7", clause: "8. Operation", text: "Are potential emergency situations responded to?", answer: null },
    { id: "q8_8", clause: "8. Operation", text: "Is documented information on the process and on the plans for responding to potential emergency situations maintained?", answer: null },

    // Clause 9
    { id: "q11", clause: "9. Performance Evaluation", text: "is OH&S performance monitored, measured, analyzed and evaluated?", answer: null },
    { id: "q12", clause: "9. Performance Evaluation", text: "Is the compliance with legal and other requirements evaluated?", answer: null },
    { id: "q9_3", clause: "9. Performance Evaluation", text: "Are internal audits conducted at planned intervals?", answer: null },
    { id: "q9_4", clause: "9. Performance Evaluation", text: "Is the internal audit program implemented and maintained?", answer: null },
    { id: "q9_5", clause: "9. Performance Evaluation", text: "Does top management review the OH&S management system?", answer: null },
    { id: "q9_6", clause: "9. Performance Evaluation", text: "Are the results of monitoring and measurement analyzed and evaluated?", answer: null },
    { id: "q9_7", clause: "9. Performance Evaluation", text: "Are instruments for monitoring and measurement calibrated or verified?", answer: null },
    { id: "q9_8", clause: "9. Performance Evaluation", text: "Are relevant outputs from management review communicated to workers?", answer: null },

    // Clause 10
    { id: "q13", clause: "10. Improvement", text: "Are incidents, nonconformities and corrective actions managed?", answer: null },
    { id: "q14", clause: "10. Improvement", text: "Is the OH&S management system continually improved?", answer: null },
    { id: "q10_3", clause: "10. Improvement", text: "Are opportunities for improvement determined?", answer: null },
    { id: "q10_4", clause: "10. Improvement", text: "Are incidents investigated?", answer: null },
    { id: "q10_5", clause: "10. Improvement", text: "Are corrective actions taken to eliminate the root cause of incidents or nonconformities?", answer: null },
    { id: "q10_6", clause: "10. Improvement", text: "Is the effectiveness of corrective actions reviewed?", answer: null },
    { id: "q10_7", clause: "10. Improvement", text: "Is documented information retained as evidence of the results of corrective actions?", answer: null },
    { id: "q10_8", clause: "10. Improvement", text: "Are the results of continual improvement communicated to workers?", answer: null },
];

const SelfAssessment = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [step, setStep] = useState<"list" | "setup" | "assessment" | "email-collection" | "result">("list");
    const [showOnboardingGuide, setShowOnboardingGuide] = useState(searchParams.get("onboarding") === "true");
    const [standard, setStandard] = useState<Standard | "">("");
    const [companyName, setCompanyName] = useState(""); // Auditor's Company
    const [auditorName, setAuditorName] = useState("");
    const [auditorPosition, setAuditorPosition] = useState("");
    const [auditCompany, setAuditCompany] = useState(""); // Company Being Audited
    const [questions, setQuestions] = useState<Question[]>([]);

    // Fetch user company for logo
    const { companies } = useCompanyStore();
    const userCompany = companies.length > 0 ? companies[0] : null;

    // New State Fields
    const [auditDate, setAuditDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [auditLocation, setAuditLocation] = useState("");
    const [auditRepresentatives, setAuditRepresentatives] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [auditScope, setAuditScope] = useState("");

    // New State for enhancements
    const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>([]);
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [email, setEmail] = useState("");
    const [marketingConsent, setMarketingConsent] = useState(false);

    // Load saved assessments on mount
    React.useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const saved = localStorage.getItem(`selfAssessments_${user.id}`);
        if (saved) {
            try {
                setSavedAssessments(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved assessments", e);
            }
        }
    }, []);

    const saveToHistory = (newAssessment: SavedAssessment) => {
        const updated = [newAssessment, ...savedAssessments];
        setSavedAssessments(updated);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem(`selfAssessments_${user.id}`, JSON.stringify(updated));
    };

    const deleteSavedAssessment = (id: string) => {
        const updated = savedAssessments.filter(a => a.id !== id);
        setSavedAssessments(updated);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem(`selfAssessments_${user.id}`, JSON.stringify(updated));
        toast.success("Assessment deleted from history");
    };

    const viewAssessment = (assessment: SavedAssessment) => {
        setStep("result");
        setStandard(assessment.standard);
        setCompanyName(assessment.companyName);
        setAuditorName(assessment.auditorName);
        setAuditorPosition(assessment.auditorPosition || "");
        setAuditCompany(assessment.auditCompany || "");
        setQuestions(assessment.questions);
        setEmail(assessment.email || "");
    };

    // Modal Interaction State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newQuestionClause, setNewQuestionClause] = useState("");
    const [newQuestionText, setNewQuestionText] = useState("");

    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

    const startAssessment = () => {
        if (!standard) {
            toast.error("Please select a standard.");
            return;
        }
        if (!companyName.trim()) {
            toast.error("Please enter the Auditor Company Name.");
            return;
        }
        if (!auditorName.trim()) {
            toast.error("Please enter the Auditor Name.");
            return;
        }
        if (!auditorPosition.trim()) {
            toast.error("Please enter the Auditor Position.");
            return;
        }
        if (!auditLocation.trim()) {
            toast.error("Please enter the Audit Location.");
            return;
        }
        if (!auditRepresentatives.trim()) {
            toast.error("Please enter Company Representatives.");
            return;
        }
        if (!contactEmail.trim()) {
            toast.error("Please enter Contact Email.");
            return;
        }
        if (!auditScope.trim()) {
            toast.error("Please enter Scope of Audit.");
            return;
        }

        // Reset validation state
        setShowValidationErrors(false);
        setEmail("");
        setMarketingConsent(false);

        let initialQuestions: Question[] = [];
        if (standard === "ISO 14001") initialQuestions = [...ISO_14001_QUESTIONS];
        else if (standard === "ISO 9001") initialQuestions = [...ISO_9001_QUESTIONS];
        else if (standard === "ISO 45001") initialQuestions = [...ISO_45001_QUESTIONS];

        // Deep copy to avoid reference issues if modifying
        setQuestions(JSON.parse(JSON.stringify(initialQuestions)));
        setCurrentClauseIndex(0); // Reset to first clause
        setStep("assessment");
    };

    const handleAnswer = (id: string, answer: "yes" | "no") => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, answer } : q));
    };

    const handleDeleteQuestion = (id: string) => {
        setQuestionToDelete(id);
        setDeleteConfirmationOpen(true);
    };

    const confirmDeleteQuestion = () => {
        if (questionToDelete) {
            setQuestions(prev => prev.filter(q => q.id !== questionToDelete));
            toast.success("Question deleted");
            setDeleteConfirmationOpen(false);
            setQuestionToDelete(null);
        }
    };

    const [currentClauseIndex, setCurrentClauseIndex] = useState(0);

    // Derived state for clause navigation
    const uniqueClauses = Array.from(new Set(questions.map(q => q.clause)));
    const currentClause = uniqueClauses[currentClauseIndex];
    const currentQuestions = questions.filter(q => q.clause === currentClause);

    const handleNextClause = () => {
        if (currentClauseIndex < uniqueClauses.length - 1) {
            setCurrentClauseIndex(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setStep("email-collection");
        }
    };

    const handlePrevClause = () => {
        if (currentClauseIndex > 0) {
            setCurrentClauseIndex(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleAddQuestion = (clause: string) => {
        setNewQuestionClause(clause);
        setNewQuestionText("");
        setIsAddModalOpen(true);
    };

    const confirmAddQuestion = () => {
        if (!newQuestionText.trim()) return;

        const newId = `custom-${Date.now()}`;
        const newQuestion: Question = { id: newId, clause: newQuestionClause, text: newQuestionText, answer: null };

        setQuestions(prev => {
            // Find last index manually to avoid lint error with findLastIndex
            let index = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].clause === newQuestionClause) {
                    index = i;
                    break;
                }
            }

            if (index !== -1) {
                const newQuestions = [...prev];
                newQuestions.splice(index + 1, 0, newQuestion);
                return newQuestions;
            } else {
                return [...prev, newQuestion];
            }
        });

        toast.success("Question added");
        setIsAddModalOpen(false);
    };

    const submitAssessment = () => {
        const unanswered = questions.filter(q => q.answer === null);
        if (unanswered.length > 0) {
            setShowValidationErrors(true);
            toast.error(`Please answer all questions. ${unanswered.length} remaining.`);
            // Scroll to first error? optionally
            return;
        }
        setStep("email-collection");
    };

    const handleEmailSubmit = () => {
        if (!email) {
            toast.error("Please enter your email address to see results.");
            return;
        }

        const score = calculateScore();
        const newDate = new Date().toISOString();

        // Save assessment
        const newAssessment: SavedAssessment = {
            id: Date.now().toString(),
            companyName,
            auditorName,
            auditorPosition,
            auditCompany,
            standard: standard as Standard,
            score,
            date: newDate,
            email,
            questions
        };

        saveToHistory(newAssessment);

        // Send report as PDF email if user ticked the checkbox
        if (marketingConsent) {
            generatePDF(newAssessment, true)
                .then(async (blob) => {
                    if (!blob) return;
                    // Convert blob to base64
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64 = (reader.result as string).split(',')[1];
                        try {
                            await fetch(`${API_BASE_URL}/api/send-assessment-report`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    to: email,
                                    companyName,
                                    auditorName,
                                    auditCompany,
                                    standard,
                                    score,
                                    date: newDate,
                                    questions,
                                    pdfBase64: base64
                                })
                            });
                            toast.success("Report PDF sent to your email!");
                        } catch {
                            toast.error("Could not send email, but your results are saved.");
                        }
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(() => toast.error("Could not send email, but your results are saved."));
        }

        setStep("result");
    };


    const calculateScore = () => {
        const total = questions.length;
        if (total === 0) return 0;
        const yesCount = questions.filter(q => q.answer === "yes").length;
        // Scale to 0-50
        return Math.round((yesCount / total) * 50);
    };

    const getGrade = (score: number) => {
        if (score >= 90) return "A";
        if (score >= 80) return "B";
        if (score >= 60) return "C";
        if (score >= 40) return "D";
        return "F";
    };

    const calculateClauseScores = () => {
        const groups = questions.reduce((acc, q) => {
            if (!acc[q.clause]) acc[q.clause] = [];
            acc[q.clause].push(q);
            return acc;
        }, {} as Record<string, Question[]>);

        return Object.entries(groups).map(([clause, qs]) => {
            const yes = qs.filter(q => q.answer === "yes").length;
            const total = qs.length;
            const score = total === 0 ? 0 : Math.round((yes / total) * 100);
            return {
                clause: clause.split(". ")[0], // Just the number
                fullClause: clause,
                grade: getGrade(score), // Keep grade for bar chart color logic
                score,
                yes,
                total
            };
        });
    };

    const getStage = (score: number) => {
        if (score >= 38) return "Mature Stage";
        if (score >= 25) return "Moderate Stage";
        return "Early Stage";
    };

    const getStageDetails = (score: number) => {
        if (score >= 38) return {
            description: "Your organization has a well-established, effective QMS and is likely ready for ISO 9001 certification.",
            actions: [
                "Schedule ISO 9001 certification audit with accredited certification body",
                "Complete any minor gap closure items identified in this assessment",
                "Implement staff development and advanced training on continual improvement and leadership",
                "Establish KPI dashboard for ongoing QMS monitoring and management review",
                "If climate is relevant: Ensure climate risks are actively monitored and reviewed in management review meetings",
                "Plan for continual improvement and recertification readiness"
            ],
            timeline: "2–4 months (dependent on certification body schedule)"
        };
        if (score >= 25) return {
            description: "Your organization has a basic QMS in place and is working toward maturity. Most requirements are addressed but need refinement.",
            actions: [
                "Engage BSI or certified gap assessment consultant to identify specific gaps",
                "Implement corrective actions from gap assessment findings",
                "Enhance internal audit capability and frequency",
                "Strengthen management review process with data-driven decisions",
                "Develop competence framework for QMS-critical roles",
                "If climate is relevant: Integrate climate risks into your QMS risk register and monitoring plans",
                "Enroll staff in auditor training (ISO 19011 principles)"
            ],
            timeline: "3–6 months with structured improvement"
        };
        return {
            description: "Your organization is at the foundation stage of QMS implementation. Quality processes are emerging but require development.",
            actions: [
                "Attend ISO 9001 foundation and awareness training courses",
                "Develop documented quality policy aligned with organizational strategy",
                "Map key QMS processes (planning, operation, monitoring, improvement)",
                "Identify QMS roles and responsibilities",
                "Begin establishing basic quality objectives and performance metrics",
                "If climate is relevant: Complete climate change impact assessment for your operations"
            ],
            timeline: "6–12 months with focused effort"
        };
    };

    const resetAssessment = () => {
        setStep("list");
        setStandard("");
        setCompanyName("");
        setAuditorName("");
        setAuditCompany("");
        setQuestions([]);
        setShowValidationErrors(false);
        setEmail("");
        // Reset new fields
        setAuditDate(format(new Date(), "yyyy-MM-dd"));
        setAuditLocation("");
        setAuditRepresentatives("");
        setContactEmail("");
        setAuditScope("");
        setAuditorPosition("");

    };

    const pieChartRef = React.useRef<HTMLDivElement>(null);
    const barChartRef = React.useRef<HTMLDivElement>(null);

    const generatePDF = async (assessmentData?: SavedAssessment, returnBlob = false): Promise<Blob | void> => {
        const doc = new jsPDF();

        // Data sources
        const cName = assessmentData?.companyName || companyName;
        const aName = assessmentData?.auditorName || auditorName;
        const auPos = assessmentData?.auditorPosition || auditorPosition;
        const audComp = assessmentData?.auditCompany || auditCompany;
        const std = assessmentData?.standard || standard;
        const qs = assessmentData?.questions || questions;
        const dateStr = assessmentData ? format(new Date(assessmentData.date), "PPP") : format(new Date(), "PPP");

        // State to track pages where logo/footer has explicitly been drawn
        // This prevents duplication when mixing manual drawing and autoTable's didDrawPage
        let lastLogoPage = 0;

        // Helper to add user logo to current page
        const logoY = 10;
        let headerBottom = 30; // default

        // Helper to add user logo to current page
        const addUserLogo = (doc: jsPDF, logoData: string, ratio: number) => {
            const maxWidth = 30;
            const maxHeight = 20;
            let logoWidth = maxWidth;
            let logoHeight = logoWidth * ratio;

            if (logoHeight > maxHeight) {
                logoHeight = maxHeight;
                logoWidth = logoHeight / ratio;
            }
            doc.addImage(logoData, 'PNG', 15, logoY, logoWidth, logoHeight);

            // Allow updating headerBottom if not set (though ideally we calculate once)
            // But since this is called on every page, we should calculate it outside or just ensure consistency.
            // Let's rely on the calculation done before main render if possible.
        };

        // Load iAudit Logo (for footer ONLY)
        let imgData: string | null = null;
        let logoRatio = 0.3; // Default

        try {
            const logoUrl = "/iAudit Global-01.png";
            const result = await new Promise<{ url: string, ratio: number }>((resolve, reject) => {
                const image = new Image();
                image.src = logoUrl;
                image.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(image, 0, 0);
                    resolve({
                        url: canvas.toDataURL("image/png"),
                        ratio: image.height / image.width
                    });
                };
                image.onerror = reject;
            });
            imgData = result.url;
            logoRatio = result.ratio;
            // NOTE: We do NOT draw this logo in the header anymore.
        } catch (error) {
            console.error("Failed to load logo", error);
        }





        // Load User Company Logo
        let userLogoData: string | null = null;
        let userLogoRatio = 0.3;

        if (userCompany?.logo) {
            try {
                const result = await new Promise<{ url: string, ratio: number }>((resolve, reject) => {
                    const image = new Image();
                    image.src = userCompany.logo!;
                    image.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = image.width;
                        canvas.height = image.height;
                        const ctx = canvas.getContext("2d");
                        ctx?.drawImage(image, 0, 0);
                        resolve({
                            url: canvas.toDataURL("image/png"),
                            ratio: image.height / image.width
                        });
                    };
                    image.onerror = reject;
                });
                userLogoData = result.url;
                userLogoRatio = result.ratio;
            } catch (error) {
                console.error("Failed to load user logo", error);
            }
        }


        // Calculate header height once
        if (userLogoData) {
            const maxWidth = 30;
            const maxHeight = 20;
            let h = maxWidth * userLogoRatio;
            if (h > maxHeight) h = maxHeight;
            headerBottom = logoY + h + 10;
        }

        // Calculate Scores & Stage
        const score = assessmentData?.score ?? calculateScore();
        const stage = getStage(score);
        const stageDetails = getStageDetails(score);
        const clauseScores = calculateClauseScores();

        // Extended Data
        const audDate = assessmentData?.auditDate || auditDate;
        const audLoc = assessmentData?.auditLocation || auditLocation;
        const audReps = assessmentData?.auditRepresentatives || auditRepresentatives;
        const auName = assessmentData?.auditorName || auditorName;
        const contact = assessmentData?.contactEmail || contactEmail;
        const scope = assessmentData?.auditScope || auditScope;

        // Header Title
        doc.setFontSize(22);
        doc.setTextColor(16, 185, 129); // Emerald-600
        // Adjust title position to be below the user logo standard space
        // Standard space for logo: ~40 units. Start text below that.
        doc.text("Self Assessment Report", 105, headerBottom + 10, { align: "center" });
        headerBottom += 20; // Increase header bottom for subsequent elements

        const addFooter = (doc: jsPDF) => {
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Line
            doc.setDrawColor(200, 200, 200);
            doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

            // Logo & Text
            if (imgData) {
                const footerLogoWidth = 40;
                const footerLogoHeight = footerLogoWidth * logoRatio;

                // Draw Logo (Bottom Right, Below Line)
                const logoX = pageWidth - 15 - footerLogoWidth;
                // Place top of logo at pageHeight - 30 (overlapping line area to reduce visual gap)
                doc.addImage(imgData, 'PNG', logoX, pageHeight - 30, footerLogoWidth, footerLogoHeight);

                // "Built with iAudit" Text
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0);
                // Align text vertically with logo center
                const textY = pageHeight - 30 + (footerLogoHeight / 2) + 1;
                doc.text("Built with ", logoX - 2, textY, { align: "right" });
            } else {
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text("Built with iAudit", pageWidth - 15, pageHeight - 12, { align: "right" });
            }
        };

        // Unified helper to safe-guard against double drawing
        const drawHeaderFooter = (doc: jsPDF) => {
            const currentPage = (doc.internal as any).getCurrentPageInfo().pageNumber;
            if (lastLogoPage !== currentPage) {
                if (userLogoData) addUserLogo(doc, userLogoData, userLogoRatio);
                addFooter(doc);
                lastLogoPage = currentPage;
            }
        };

        let yPos = headerBottom;

        // 1. Details Table — only include rows with values
        const detailsBody = [
            ["Name of Company", cName],
            ...(audComp ? [["Company Being Audited", audComp]] : []),
            ["Audit Date", audDate],
            ["ISO Standard", std],
            ...(audLoc ? [["Location of Audit", audLoc]] : []),
            ...(audReps ? [["Company Representatives", audReps]] : []),
            ...(auName ? [["Name of Auditor", auName]] : []),
            ...(auPos ? [["Auditor Position", auPos]] : []),
            ...(contact ? [["Contact email", contact]] : []),
            ...(scope ? [["Scope of Audit", scope]] : []),
        ];

        autoTable(doc, {
            startY: yPos,
            body: detailsBody,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 60, fillColor: [245, 245, 245] },
                1: { cellWidth: 'auto' }
            },
            didDrawPage: (data) => {
                drawHeaderFooter(data.doc);
            },
            margin: { bottom: 25, top: 40 }
        });

        // @ts-expect-error: jspdf autotable extension types are missing finalY
        yPos = doc.lastAutoTable.finalY + 15;



        // --- Native Chart Drawing Helpers ---

        const drawPieChart = (doc: jsPDF, centerX: number, centerY: number, radius: number, percentage: number) => {
            // Background Circle (Gray)
            doc.setFillColor(241, 245, 249); // slate-100
            doc.circle(centerX, centerY, radius, 'F');

            if (percentage > 0) {
                // Draw sector
                doc.setFillColor(251, 191, 36); // amber-400

                if (percentage === 50) {
                    doc.circle(centerX, centerY, radius, 'F');
                } else {
                    const startAngle = -90; // Top
                    const endAngle = startAngle + (percentage / 50) * 360;

                    // Convert degrees to radians
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;

                    const x1 = centerX + radius * Math.cos(startRad);
                    const y1 = centerY + radius * Math.sin(startRad);
                    const x2 = centerX + radius * Math.cos(endRad);
                    const y2 = centerY + radius * Math.sin(endRad);

                    // Large arc flag
                    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

                    // Manual path for sector
                    // Move to center
                    // Line to start
                    // Arc to end
                    // Line to center
                    // PDF path construction is complex in raw jsPDF without standard 'arc' command in some versions.
                    // Using triangles approximation for compatibility and robustness
                    const step = 2; // degree step
                    for (let a = startAngle; a < endAngle; a += step) {
                        const finalA = Math.min(a + step, endAngle);
                        const aRad = (a * Math.PI) / 180;
                        const fRad = (finalA * Math.PI) / 180;

                        doc.triangle(
                            centerX, centerY,
                            centerX + radius * Math.cos(aRad), centerY + radius * Math.sin(aRad),
                            centerX + radius * Math.cos(fRad), centerY + radius * Math.sin(fRad),
                            'F'
                        );
                    }
                }
            }

            // Inner Circle (White) -> Donut
            doc.setFillColor(255, 255, 255);
            doc.circle(centerX, centerY, radius * 0.7, 'F');

            // Text
            doc.setFontSize(22);
            doc.setTextColor(245, 158, 11); // amber-500
            doc.text(`${Math.round(percentage)} / 50`, centerX, centerY + 2.5, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(100);
            const countText = `${questions.filter(q => q.answer === "yes").length} / ${questions.length}`;
            doc.text(countText, centerX, centerY + 10, { align: 'center' });
        };

        const drawBarChart = (doc: jsPDF, x: number, y: number, width: number, height: number, data: { clause: string, score: number }[]) => {
            // Dimensions
            const barWidth = (width / data.length) * 0.6;
            const spacing = (width / data.length) * 0.4;
            const maxVal = 100;

            // Draw Y-axis grid lines (4 lines)
            doc.setDrawColor(240, 240, 240);
            doc.setLineWidth(0.1);
            for (let i = 1; i <= 4; i++) {
                const gy = y + height - (i * 25 / maxVal * height);
                doc.line(x, gy, x + width, gy);
            }

            // Draw Axis lines
            doc.setDrawColor(200);
            doc.setLineWidth(0.2);
            doc.line(x, y + height, x + width, y + height); // X-axis

            data.forEach((item, index) => {
                const barHeight = Math.max((item.score / maxVal) * height, 2); // Minimum height for visibility of rounded corners
                const bx = x + (index * (barWidth + spacing)) + (spacing / 2);
                const by = y + height - barHeight;

                // Color based on score (Matching requested palette)
                if (item.score >= 80) doc.setFillColor(52, 150, 124); // #34967C
                else if (item.score >= 50) doc.setFillColor(246, 173, 43); // #F6AD2B
                else doc.setFillColor(239, 68, 68); // #EF4444

                // Use roundedRect for bars (radius 2)
                doc.roundedRect(bx, by, barWidth, barHeight, 1.5, 1.5, 'F');

                // Label (Clause)
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(`Cl. ${item.clause}`, bx + barWidth / 2, y + height + 5, { align: 'center' });

                // Value
                doc.setFontSize(8);
                doc.setTextColor(50);
                doc.text(`${item.score}%`, bx + barWidth / 2, by - 2, { align: 'center' });
            });
        };

        // --- Layout Construction ---

        // 2. Pie Chart (Donut)
        // Center X = 105 (Page width 210 / 2)
        // Y Position needs to be safe
        if (yPos + 50 > 280) { doc.addPage(); drawHeaderFooter(doc); yPos = headerBottom; }

        drawPieChart(doc, 105, yPos + 35, 25, score);
        yPos += 75; // 35 (radius space) + space below

        // 3. Maturity Stage
        if (yPos + 40 > 280) {
            doc.addPage();
            drawHeaderFooter(doc);
            yPos = 40;
        }
        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(`Maturity Stage: ${stage}`, 15, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(50);
        const descLines = doc.splitTextToSize(stageDetails.description, 180);
        doc.text(descLines, 15, yPos);
        yPos += (descLines.length * 5) + 5;

        // 4. Clause Breakdown Table
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Score by Clause", 15, yPos);
        yPos += 5;

        const clauseBody: any[] = clauseScores.map(c => [
            c.fullClause,
            `${c.yes} / ${c.total}`,
            `${c.score}%`
        ]);

        // Add Total Row
        const totalYes = clauseScores.reduce((acc, c) => acc + c.yes, 0);
        const totalCount = clauseScores.reduce((acc, c) => acc + c.total, 0);
        clauseBody.push([
            { content: "Total Score", styles: { fontStyle: 'bold' } },
            { content: `${totalYes} / ${totalCount}`, styles: { fontStyle: 'bold' } },
            { content: `${score} / 50`, styles: { fontStyle: 'bold', textColor: [16, 185, 129] } }
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [["Clause", "Compliance", "Score"]],
            body: clauseBody,
            headStyles: { fillColor: [16, 185, 129] },
            theme: 'grid',
            didDrawPage: (data) => {
                drawHeaderFooter(data.doc);
            },
            margin: { bottom: 25, top: 40 }
        });

        // @ts-expect-error: jspdf autotable extension types are missing finalY
        yPos = doc.lastAutoTable.finalY + 15;

        // 5. Bar Graph (Native Drawing)
        if (yPos + 60 > 280) {
            doc.addPage();
            drawHeaderFooter(doc);
            yPos = 40;
        }

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Compliance Visualization", 15, yPos);
        yPos += 10;

        drawBarChart(doc, 15, yPos, 180, 50, clauseScores);
        yPos += 65;

        // 6. Detailed Questions Table
        if (yPos + 20 > 280) {
            doc.addPage();
            drawHeaderFooter(doc);
            yPos = 40;
        }
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Detailed Question Review", 15, yPos);
        yPos += 5;

        const tableBody: any[] = [];
        const groups = qs.reduce((acc, q) => {
            if (!acc[q.clause]) acc[q.clause] = [];
            acc[q.clause].push(q);
            return acc;
        }, {} as Record<string, Question[]>);

        Object.entries(groups).forEach(([clause, qList]) => {
            // Clause Header Row
            tableBody.push([{ content: clause, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: 0 } }]);

            // Questions
            qList.forEach(q => {
                tableBody.push([
                    q.text,
                    q.answer ? q.answer.charAt(0).toUpperCase() + q.answer.slice(1) : "Not Answered"
                ]);
            });

            // Add Clause Score Row Summary
            const cScore = clauseScores.find(c => c.fullClause === clause);
            if (cScore) {
                tableBody.push([{
                    content: `Clause Score: ${cScore.score}% (${cScore.yes}/${cScore.total} Compliant)`,
                    colSpan: 2,
                    styles: { fontStyle: 'bold', halign: 'right', textColor: [16, 185, 129], fillColor: [250, 255, 250] }
                }]);
            }
        });

        autoTable(doc, {
            startY: yPos,
            head: [["Question", "Answer"]],
            body: tableBody,
            headStyles: { fillColor: [16, 185, 129] },
            columnStyles: {
                0: { cellWidth: 140 },
                1: { cellWidth: 40, halign: "center" }
            },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            didDrawPage: (data) => {
                drawHeaderFooter(data.doc);
            },
            margin: { bottom: 25, top: 40 }
        });

        if (returnBlob) {
            return doc.output('blob');
        }
        doc.save(`Self_Assessment_${cName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    };

    const generateWord = async (assessmentData?: SavedAssessment) => {
        try {
            // Data sources
            const cName = assessmentData?.companyName || companyName;
            const aName = assessmentData?.auditorName || auditorName;
            const auPos = assessmentData?.auditorPosition || auditorPosition;
            const audComp = assessmentData?.auditCompany || auditCompany;
            const std = assessmentData?.standard || standard;
            const qs = assessmentData?.questions || questions;
            const finalScore = assessmentData?.score ?? calculateScore();
            const dateStr = assessmentData ? format(new Date(assessmentData.date), "PPP") : format(new Date(), "PPP");

            // Derived Data
            const stage = getStage(finalScore);
            const stageDetails = getStageDetails(finalScore);
            const clauseScores = calculateClauseScores();

            // Load Logo
            const logoUrl = "/iAudit Global-01.png";
            const imageResponse = await fetch(logoUrl);
            const imageBlob = await imageResponse.arrayBuffer();

            // Group questions locally
            const groups = qs.reduce((acc, q) => {
                if (!acc[q.clause]) acc[q.clause] = [];
                acc[q.clause].push(q);
                return acc;
            }, {} as Record<string, Question[]>);

            // Extended Data
            const audDate = assessmentData?.auditDate || auditDate;
            const audLoc = assessmentData?.auditLocation || auditLocation;
            const audReps = assessmentData?.auditRepresentatives || auditRepresentatives;
            const auName = assessmentData?.auditorName || auditorName;
            const contact = assessmentData?.contactEmail || contactEmail;
            const scope = assessmentData?.auditScope || auditScope;
            const auPosVal = assessmentData?.auditorPosition || auditorPosition;

            // Load User Logo if exists, else fallback to iAudit
            let logoBlob: ArrayBuffer | null = null;
            if (userCompany?.logo) {
                try {
                    const response = await fetch(userCompany.logo);
                    logoBlob = await response.arrayBuffer();
                } catch (e) {
                    console.error("Failed to load user logo for Word", e);
                }
            }

            if (!logoBlob) {
                const logoUrl = "/iAudit Global-01.png";
                const imageResponse = await fetch(logoUrl);
                logoBlob = await imageResponse.arrayBuffer();
            }

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: logoBlob,
                                    transformation: { width: 150, height: 60 }
                                })
                            ],
                            alignment: AlignmentType.LEFT
                        }),
                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({ text: "" }), // Extra Spacer

                        // Title
                        new Paragraph({
                            text: "Self Assessment Report",
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER
                        }),
                        new Paragraph({ text: "" }),

                        // Info Table
                        ...(() => {
                            const rows: [string, string][] = [
                                ["Name of Company", cName],
                                ...(audComp ? [["Company Being Audited", audComp] as [string, string]] : []),
                                ["Audit Date", audDate || ""],
                                ["ISO Standard", (std as string) || ""],
                                ...(audLoc ? [["Location of Audit", audLoc] as [string, string]] : []),
                                ...(audReps ? [["Company Representatives", audReps] as [string, string]] : []),
                                ...(auName ? [["Name of Auditor", auName] as [string, string]] : []),
                                ...(auPosVal ? [["Auditor Position", auPosVal] as [string, string]] : []),
                                ...(contact ? [["Contact email", contact] as [string, string]] : []),
                                ...(scope ? [["Scope of Audit", scope] as [string, string]] : []),
                            ];
                            return [new DocxTable({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                rows: rows.map(([label, value]) => new DocxTableRow({
                                    children: [
                                        new DocxTableCell({
                                            width: { size: 35, type: WidthType.PERCENTAGE },
                                            shading: { fill: "F0F4F8" },
                                            borders: {
                                                top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                                                bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                                                left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                                                right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                                            },
                                            children: [new Paragraph({
                                                children: [new TextRun({ text: label, bold: true, color: "213847", size: 20 })],
                                                spacing: { before: 60, after: 60 },
                                            })],
                                        }),
                                        new DocxTableCell({
                                            width: { size: 65, type: WidthType.PERCENTAGE },
                                            borders: {
                                                top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                                                bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                                                left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                                                right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                                            },
                                            children: [new Paragraph({
                                                children: [new TextRun({ text: value, size: 20 })],
                                                spacing: { before: 60, after: 60 },
                                            })],
                                        }),
                                    ],
                                }))
                            })];
                        })(),

                        // PAGE 2: RESULTS & RECOMMENDATIONS
                        new Paragraph({ text: "", pageBreakBefore: true }),
                        new Paragraph({
                            text: "Assessment Results",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Total Score: ", bold: true, size: 24 }),
                                new TextRun({ text: `${finalScore} / 50`, bold: true, size: 24, color: "10B981" })
                            ]
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Maturity Stage: ", bold: true }),
                                new TextRun({ text: stage, bold: true })
                            ]
                        }),
                        new Paragraph({ text: "" }),

                        new Paragraph({
                            text: "Recommendations & Actions",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 100 }
                        }),
                        new Paragraph({ text: stageDetails.description }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "Recommended Actions:", style: "Strong" }),
                        ...stageDetails.actions.map(action => new Paragraph({
                            text: action,
                            bullet: { level: 0 }
                        })),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Timeline: ", bold: true }),
                                new TextRun(stageDetails.timeline)
                            ]
                        }),

                        // PAGE 3: CLAUSE BREAKDOWN
                        new Paragraph({ text: "", pageBreakBefore: true }),
                        new Paragraph({
                            text: "Score by Clause Analysis",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 100 }
                        }),
                        new DocxTable({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new DocxTableRow({
                                    children: ["Clause", "Compliance", "Score"].map(header =>
                                        new DocxTableCell({
                                            children: [new Paragraph({ text: header, style: "strong" })],
                                            shading: { fill: "10B981", color: "FFFFFF" }
                                        })
                                    )
                                }),
                                ...clauseScores.map(c =>
                                    new DocxTableRow({
                                        children: [
                                            new DocxTableCell({ children: [new Paragraph(c.fullClause)] }),
                                            new DocxTableCell({ children: [new Paragraph(`${c.yes} / ${c.total}`)] }),
                                            new DocxTableCell({ children: [new Paragraph(`${c.score}%`)] }),
                                        ]
                                    })
                                ),
                                // Total Row
                                new DocxTableRow({
                                    children: [
                                        new DocxTableCell({ children: [new Paragraph({ text: "Total Score", style: "strong" })] }),
                                        new DocxTableCell({ children: [new Paragraph({ text: `${clauseScores.reduce((acc, c) => acc + c.yes, 0)} / ${clauseScores.reduce((acc, c) => acc + c.total, 0)}`, style: "strong" })] }),
                                        new DocxTableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({ text: `${finalScore} / 50`, bold: true, color: "10B981" })
                                                    ],
                                                    alignment: AlignmentType.RIGHT
                                                })
                                            ]
                                        }),
                                    ]
                                })
                            ]
                        }),

                        // PAGE 4+: DETAILED QUESTIONS
                        new Paragraph({ text: "", pageBreakBefore: true }),
                        new Paragraph({
                            text: "Detailed Question Review",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 100 }
                        }),
                        ...Object.entries(groups).flatMap(([clause, qList]) => {
                            const cScore = clauseScores.find(c => c.fullClause === clause);
                            return [
                                new Paragraph({ text: "" }),
                                new Paragraph({
                                    text: clause,
                                    heading: HeadingLevel.HEADING_3,
                                    spacing: { before: 200, after: 50 },
                                    shading: { fill: "F1F5F9" } // Light slate bg
                                }),
                                new DocxTable({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    rows: [
                                        new DocxTableRow({
                                            children: ["Question", "Answer"].map(header =>
                                                new DocxTableCell({
                                                    children: [new Paragraph({ text: header, style: "strong" })],
                                                    shading: { fill: "10B981", color: "FFFFFF" },
                                                    width: { size: header === "Question" ? 80 : 20, type: WidthType.PERCENTAGE }
                                                })
                                            )
                                        }),
                                        ...qList.map(q =>
                                            new DocxTableRow({
                                                children: [
                                                    new DocxTableCell({ children: [new Paragraph(q.text)] }),
                                                    new DocxTableCell({
                                                        children: [new Paragraph({
                                                            text: q.answer ? q.answer.charAt(0).toUpperCase() + q.answer.slice(1) : "-",
                                                            alignment: AlignmentType.CENTER
                                                        })]
                                                    })
                                                ]
                                            })
                                        )
                                    ]
                                }),
                                // Clause Score Display
                                ...(cScore ? [
                                    new Paragraph({ text: "" }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "Clause Score: ", bold: true }),
                                            new TextRun({ text: `${cScore.score}%`, bold: true, color: "10B981" })
                                        ],
                                        alignment: AlignmentType.RIGHT,
                                        spacing: { before: 100 }
                                    })
                                ] : [])
                            ];
                        })
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Self_Assessment_${cName}_${format(new Date(), "yyyy-MM-dd")}.docx`);
        } catch (e) {
            console.error("Failed to generate Word doc", e);
            toast.error("Failed to generate Word document");
        }
    };

    const groupedQuestions = questions.reduce((acc, q) => {
        if (!acc[q.clause]) acc[q.clause] = [];
        acc[q.clause].push(q);
        return acc;
    }, {} as Record<string, Question[]>);

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [standardFilter, setStandardFilter] = useState("all");

    // Filtering
    const filteredAssessments = savedAssessments.filter(assessment => {
        const matchesSearch = assessment.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (assessment.auditorName && assessment.auditorName.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStandard = standardFilter === "all" || assessment.standard === standardFilter;
        return matchesSearch && matchesStandard;
    });

    // Pagination state for assessments list
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
    const paginatedAssessments = filteredAssessments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, standardFilter]);

    return (
        <div className="flex-1 p-8 pt-6 min-h-screen bg-white relative">
            {/* Background Overlay for Onboarding */}
            {showOnboardingGuide && step === "list" && (
                <div className="fixed inset-0 bg-slate-900/10 z-[40] transition-all duration-500" />
            )}

            <div className="w-full max-w-[1800px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 px-4 sm:px-0">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Self Assessment</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Evaluate your organization's compliance with ISO standards</p>
                    </div>

                    {/* Header Actions - New Assessment Button */}
                    {step === "list" && (
                        <div className={`relative ${showOnboardingGuide ? "z-[60]" : ""}`}>
                            {showOnboardingGuide && (
                                <div className="absolute inset-0 -m-1 rounded-2xl ring-[8px] ring-emerald-500/50 animate-pulse z-[-1]" />
                            )}
                            <Button 
                                onClick={() => {
                                    setStep("setup");
                                    setShowOnboardingGuide(false);
                                }} 
                                size="sm" 
                                className={`gap-1.5 shadow-sm bg-[#213847] hover:bg-[#213847]/90 text-white rounded-xl px-5 h-11 transition-all ${showOnboardingGuide ? 'relative z-[60] ring-[6px] ring-emerald-500 ring-offset-2 scale-105 shadow-2xl' : ''}`}
                            >
                                <Plus className="h-4 w-4" /> New Assessment
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
                                                        Step 4 of 6
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <ClipboardCheck className="w-6 h-6 text-emerald-600" />
                                                    </div>
                                                    <h4 className="font-black text-xl text-slate-900 tracking-tight whitespace-nowrap">Step 4: Self Assessment</h4>
                                                </div>

                                            <div className="space-y-4">
                                                <p className="text-sm font-medium text-slate-600 leading-relaxed px-1">
                                                    Self Assessment was created for companies that are new to ISO Standards and not certified. If you are already ISO certified use of the Self Assessment tool is optional and can be skipped.
                                                </p>
                                            </div>

                                            <div className="flex justify-between items-center pt-2">
                                                <Button 
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl px-4 flex items-center gap-2 font-bold transition-colors"
                                                    onClick={() => {
                                                        setShowOnboardingGuide(false);
                                                        navigate("/users?onboarding=true");
                                                    }}
                                                >
                                                    <ArrowLeft className="w-4 h-4" /> Back
                                                </Button>
                                                <Button 
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-8 shadow-lg shadow-emerald-200 transition-all active:scale-95 py-6 text-base"
                                                    onClick={() => {
                                                        setShowOnboardingGuide(false);
                                                        // Transition to Step 5: Gap Analysis
                                                        navigate("/gap-analysis?onboarding=true");
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

                    {step === "assessment" && (
                        <div className="flex items-center gap-4">
                            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-end">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                                <span className="text-lg font-bold text-emerald-600">
                                    {questions.filter(q => q.answer !== null).length} / {questions.length}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 0: List View */}
                {step === "list" && (
                    <div className="animate-in fade-in duration-500">
                        {savedAssessments.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ClipboardList className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">No assessments yet</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">Start your first self-assessment to evaluate your organization's compliance.</p>
                                <Button onClick={() => setStep("setup")} className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 shadow-sm rounded-xl px-5 h-11">
                                    <Plus className="w-4 h-4" /> Start Assessment
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Filters Row */}
                                <div className="flex flex-col md:flex-row gap-4 mb-6">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by company or auditor..."
                                            className="pl-11 h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <Select value={standardFilter} onValueChange={setStandardFilter}>
                                            <SelectTrigger className="w-[200px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-[#213847]/40">
                                                <SelectValue placeholder="All Standards" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                                <SelectItem value="all" className="rounded-lg cursor-pointer">All Standards</SelectItem>
                                                <SelectItem value="ISO 14001" className="rounded-lg cursor-pointer">ISO 14001</SelectItem>
                                                <SelectItem value="ISO 9001" className="rounded-lg cursor-pointer">ISO 9001</SelectItem>
                                                <SelectItem value="ISO 45001" className="rounded-lg cursor-pointer">ISO 45001</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Assessment List Table */}
                                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">

                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-[#213847] hover:bg-[#213847] border-none">
                                                <TableHead className="w-[80px] text-white pl-6">Sl. No</TableHead>
                                                <TableHead className="text-white">Assessment Details</TableHead>
                                                <TableHead className="text-white">ISO Standard</TableHead>
                                                <TableHead className="text-white">Score</TableHead>
                                                <TableHead className="text-white">Date</TableHead>
                                                <TableHead className="text-right text-white">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedAssessments.map((assessment, index) => (
                                                <TableRow key={assessment.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-medium text-slate-500 pl-6">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-900">{assessment.companyName}</span>
                                                            {assessment.auditorName && (
                                                                <span className="text-xs text-slate-500">Auditor: {assessment.auditorName}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-[#e6f7e9] text-[#22a04c] border-none px-4 py-1 rounded-full shadow-none font-medium hover:bg-[#d4f2da]">
                                                            {assessment.standard}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className={cn(
                                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                            assessment.score >= 80 ? "bg-emerald-100 text-emerald-800" :
                                                                assessment.score >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                                                        )}>
                                                            {assessment.score} / 50
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-500">
                                                        {format(new Date(assessment.date), "PPP")}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => viewAssessment(assessment)}>
                                                                <Eye className="w-4 h-4 text-slate-500" />
                                                                <span className="sr-only">View</span>
                                                            </Button>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                        <Download className="w-4 h-4 text-slate-500" />
                                                                        <span className="sr-only">Download</span>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => generatePDF(assessment)} className="gap-2">
                                                                        <FileText className="w-4 h-4 text-emerald-600" /> PDF Report
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => generateWord(assessment)} className="gap-2">
                                                                        <FileText className="w-4 h-4 text-blue-600" /> Word Report
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>

                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600" onClick={() => deleteSavedAssessment(assessment.id)}>
                                                                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                                                                <span className="sr-only">Delete</span>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <ReusablePagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={filteredAssessments.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    className="mt-6"
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Step 1: Setup */}
                {step === "setup" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => setStep("list")} className="gap-2 pl-0 hover:bg-transparent hover:text-emerald-600">
                                <ArrowLeft className="w-4 h-4" /> Back to List
                            </Button>
                        </div>

                        <Card className="border-slate-200 shadow-sm rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
                            <CardHeader className="bg-[#213847] border-b border-slate-100 rounded-t-xl p-8">
                                <CardTitle className="text-2xl text-white">Start New Assessment</CardTitle>
                                <CardDescription className="text-slate-300">Configure your assessment details to begin.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6 bg-white rounded-b-xl">
                                {/* 1. Company Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="company" className="text-sm font-semibold text-slate-700">
                                        Name of the Company <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="company"
                                        placeholder="Enter your organization name"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                    />
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* 2. Audit Date */}
                                    <div className="space-y-2">
                                        <Label htmlFor="auditDate" className="text-sm font-semibold text-slate-700">Audit Date</Label>
                                        <Input
                                            id="auditDate"
                                            type="date"
                                            value={auditDate}
                                            onChange={(e) => setAuditDate(e.target.value)}
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                        />
                                    </div>

                                    {/* 3. ISO Standard */}
                                    <div className="space-y-2">
                                        <Label htmlFor="standard" className="text-sm font-semibold text-slate-700">ISO Standard <span className="text-red-500">*</span></Label>
                                        <Select onValueChange={(val: any) => {
                                            setStandard(val);
                                            const defaultScopes: Record<string, string> = {
                                                "ISO 9001": "Assessment of Quality Management System conformance against ISO 9001:2015 requirements across all relevant processes, functions, and departments.",
                                                "ISO 14001": "Assessment of Environmental Management System conformance against ISO 14001:2015 requirements, covering environmental aspects, compliance obligations, and continual improvement.",
                                                "ISO 45001": "Assessment of Occupational Health & Safety Management System conformance against ISO 45001:2018 requirements, including hazard identification, risk assessment, and worker participation.",
                                            };
                                            setAuditScope(defaultScopes[val] || "");
                                        }} value={standard}>
                                            <SelectTrigger id="standard" className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:ring-[#213847]/40 w-full">
                                                <SelectValue placeholder="Select ISO Standard" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                                <SelectItem value="ISO 9001" className="rounded-lg cursor-pointer">ISO 9001 - Quality Management</SelectItem>
                                                <SelectItem value="ISO 14001" className="rounded-lg cursor-pointer">ISO 14001 - Environmental Management</SelectItem>
                                                <SelectItem value="ISO 45001" className="rounded-lg cursor-pointer">ISO 45001 - Occupational Health & Safety</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* 4. Location of Audit */}
                                    <div className="space-y-2">
                                        <Label htmlFor="auditLocation" className="text-sm font-semibold text-slate-700">Location of Audit <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="auditLocation"
                                            placeholder="Enter audit location"
                                            value={auditLocation}
                                            onChange={(e) => setAuditLocation(e.target.value)}
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                        />
                                    </div>

                                    {/* 5. Company Representatives */}
                                    <div className="space-y-2">
                                        <Label htmlFor="auditRepresentatives" className="text-sm font-semibold text-slate-700">Company Representatives <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="auditRepresentatives"
                                            placeholder="Enter names of representatives"
                                            value={auditRepresentatives}
                                            onChange={(e) => setAuditRepresentatives(e.target.value)}
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* 6. Name of Auditor */}
                                    <div className="space-y-2">
                                        <Label htmlFor="auditor" className="text-sm font-semibold text-slate-700">
                                            Name of Auditor <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="auditor"
                                            placeholder="Enter auditor name"
                                            value={auditorName}
                                            onChange={(e) => setAuditorName(e.target.value)}
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                        />
                                    </div>

                                    {/* 6.1 Auditor Position */}
                                    <div className="space-y-2">
                                        <Label htmlFor="auditorPosition" className="text-sm font-semibold text-slate-700">
                                            Auditor Position <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="auditorPosition"
                                            placeholder="Enter auditor position"
                                            value={auditorPosition}
                                            onChange={(e) => setAuditorPosition(e.target.value)}
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                        />
                                    </div>

                                    {/* 7. Contact Email */}
                                    <div className="space-y-2">
                                        <Label htmlFor="contactEmail" className="text-sm font-semibold text-slate-700">Contact Email <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="contactEmail"
                                            type="email"
                                            placeholder="Enter contact email"
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                        />
                                    </div>
                                </div>

                                {/* 8. Scope of Audit */}
                                <div className="space-y-2">
                                    <Label htmlFor="auditScope" className="text-sm font-semibold text-slate-700">Scope of Audit <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="auditScope"
                                        placeholder="Enter scope of audit"
                                        value={auditScope}
                                        onChange={(e) => setAuditScope(e.target.value)}
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                    />
                                </div>

                                {/* 9. Company Being Audited (Optional) */}
                                <div className="space-y-2">
                                    <Label htmlFor="auditCompany" className="text-sm font-semibold text-slate-700">
                                        Company Being Audited <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                    </Label>
                                    <Input
                                        id="auditCompany"
                                        placeholder="Enter company being audited"
                                        value={auditCompany}
                                        onChange={(e) => setAuditCompany(e.target.value)}
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40 w-full"
                                    />
                                </div>


                                <div className="pt-6 flex justify-end">
                                    <Button
                                        size="lg"
                                        onClick={startAssessment}
                                        className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 px-8 h-12 rounded-xl text-base shadow-sm font-medium"
                                    >
                                        Start Assessment <ArrowRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 2: Assessment */}
                {/* Step 2: Assessment */}
                {step === "assessment" && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto">

                        {/* Progress Header */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-10">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                            {standard}
                                        </Badge>
                                        <span className="text-slate-400">•</span>
                                        {companyName}
                                    </h2>
                                </div>
                                <span className="text-sm font-medium text-slate-500">
                                    Clause {currentClauseIndex + 1} of {uniqueClauses.length}
                                </span>
                            </div>
                            <Progress value={((currentClauseIndex + 1) / uniqueClauses.length) * 100} className="h-2 bg-slate-100" />
                        </div>

                        {/* Clause Card */}
                        <Card className="border-none shadow-md overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl font-bold text-slate-900">{currentClause}</CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => handleAddQuestion(currentClause)} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1">
                                        <Plus className="w-4 h-4" /> Add Question
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                {currentQuestions.map((q, idx) => (
                                    <div key={q.id} className="space-y-3 animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <div className="flex justify-between items-start gap-4">
                                            <p className="text-base text-slate-800 font-medium leading-relaxed">
                                                <span className="font-bold text-slate-400 mr-2">Q{idx + 1}.</span>
                                                {q.text}
                                                {showValidationErrors && q.answer === null && (
                                                    <span className="text-red-500 text-xs ml-2 font-bold animate-pulse">* Required</span>
                                                )}
                                            </p>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                title="Delete Question"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Yes Option */}
                                            <label className={cn(
                                                "relative flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 group",
                                                q.answer === "yes"
                                                    ? "border-emerald-500 bg-emerald-50/50"
                                                    : "border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                                            )}>
                                                <input
                                                    type="radio"
                                                    name={q.id}
                                                    className="peer sr-only"
                                                    onChange={() => handleAnswer(q.id, "yes")}
                                                    checked={q.answer === "yes"}
                                                />
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border mr-3 flex items-center justify-center transition-colors",
                                                    q.answer === "yes" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 group-hover:border-emerald-400"
                                                )}>
                                                    {q.answer === "yes" && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className={cn(
                                                        "w-4 h-4",
                                                        q.answer === "yes" ? "text-emerald-600" : "text-slate-400 group-hover:text-emerald-500"
                                                    )} />
                                                    <span className={cn(
                                                        "font-medium text-sm",
                                                        q.answer === "yes" ? "text-emerald-900" : "text-slate-600"
                                                    )}>Yes</span>
                                                </div>
                                                {q.answer === "yes" && (
                                                    <div className="absolute inset-0 border border-emerald-500 rounded-lg pointer-events-none" />
                                                )}
                                            </label>

                                            {/* No Option */}
                                            <label className={cn(
                                                "relative flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 group",
                                                q.answer === "no"
                                                    ? "border-red-500 bg-red-50/50"
                                                    : "border-slate-200 hover:border-red-200 hover:bg-slate-50"
                                            )}>
                                                <input
                                                    type="radio"
                                                    name={q.id}
                                                    className="peer sr-only"
                                                    onChange={() => handleAnswer(q.id, "no")}
                                                    checked={q.answer === "no"}
                                                />
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border mr-3 flex items-center justify-center transition-colors",
                                                    q.answer === "no" ? "border-red-500 bg-red-500 text-white" : "border-slate-300 group-hover:border-red-400"
                                                )}>
                                                    {q.answer === "no" && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className={cn(
                                                        "w-4 h-4",
                                                        q.answer === "no" ? "text-red-600" : "text-slate-400 group-hover:text-red-500"
                                                    )} />
                                                    <span className={cn(
                                                        "font-medium text-sm",
                                                        q.answer === "no" ? "text-red-900" : "text-slate-600"
                                                    )}>No</span>
                                                </div>
                                                {q.answer === "no" && (
                                                    <div className="absolute inset-0 border border-red-500 rounded-lg pointer-events-none" />
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Navigation Footer */}
                        <div className="flex items-center justify-between pt-4">
                            <Button
                                variant="outline"
                                onClick={handlePrevClause}
                                disabled={currentClauseIndex === 0}
                                className="gap-2 h-12 px-6"
                            >
                                <ArrowLeft className="w-4 h-4" /> Previous
                            </Button>

                            <Button
                                onClick={handleNextClause}
                                disabled={currentQuestions.some(q => q.answer === null)}
                                className={cn(
                                    "gap-2 h-12 px-8 text-lg shadow-lg transition-all",
                                    currentQuestions.some(q => q.answer === null)
                                        ? "bg-slate-300 text-slate-500 cursor-not-allowed hover:bg-slate-300"
                                        : currentClauseIndex === uniqueClauses.length - 1
                                            ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-xl"
                                            : "bg-slate-900 hover:bg-slate-800 hover:shadow-xl"
                                )}
                            >
                                {currentClauseIndex === uniqueClauses.length - 1 ? (
                                    <>Complete Assessment <CheckCircle2 className="w-5 h-5" /></>
                                ) : (
                                    <>Next Clause <ArrowRight className="w-5 h-5" /></>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Email Collection */}
                {step === "email-collection" && (
                    <Card className="max-w-xl mx-auto border-none shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                        <CardHeader className="text-center pt-8">
                            <CardTitle className="text-2xl font-bold">Get Your Results</CardTitle>
                            <CardDescription>Enter your email to view your full assessment report.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4 pb-8 px-8">
                            <div className="space-y-2">
                                <Label htmlFor="email-input">Email Address <span className="text-red-500">*</span></Label>
                                <Input
                                    id="email-input"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12"
                                />
                            </div>

                            <div className="flex items-start space-x-2 pt-2">
                                <Checkbox
                                    id="marketing"
                                    checked={marketingConsent}
                                    onCheckedChange={(c) => setMarketingConsent(c as boolean)}
                                />
                                <Label htmlFor="marketing" className="text-sm font-normal text-slate-500 leading-snug">
                                    Send my full assessment report to this email address. You may also receive tips and insights from iAudit.
                                </Label>
                            </div>

                            <div className="pt-4">
                                <Button
                                    onClick={handleEmailSubmit}
                                    className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    See Results
                                </Button>
                            </div>

                            <div className="text-center">
                                <Button variant="ghost" size="sm" onClick={() => setStep("assessment")}>
                                    Back to Assessment
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Result */}
                {step === "result" && (
                    <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-500 w-full max-w-5xl mx-auto space-y-8">

                        {/* Top Right Download Buttons */}
                        <div className="w-full flex justify-end gap-3 px-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700 shadow-sm"
                                onClick={() => generatePDF()}
                            >
                                <Download className="w-4 h-4" /> Download PDF
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 border-blue-200 hover:bg-blue-50 text-blue-700 shadow-sm"
                                onClick={() => generateWord()}
                            >
                                <Download className="w-4 h-4" /> Download Word
                            </Button>
                        </div>

                        {/* Header Section */}
                        <div className="w-full bg-emerald-50 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between shadow-sm border border-emerald-100">
                            <div className="flex items-center gap-6">
                                <div className="bg-emerald-100 p-4 rounded-xl">
                                    <Award className="w-8 h-8 md:w-10 md:h-10 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Maturity Assessment Result</h2>
                                    <div className="flex gap-4 text-sm text-slate-500 mt-1 font-medium">
                                        <span className="font-bold text-slate-700">{standard}</span>
                                        <span>{companyName}</span>
                                        <span>{format(new Date(), "MMMM do, yyyy")}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center md:text-right mt-6 md:mt-0">
                                <div className="text-4xl md:text-5xl font-bold text-emerald-600">
                                    {questions.filter(q => q.answer === "yes").length}
                                    <span className="text-2xl text-emerald-400 font-medium"> / {questions.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Row: Donut Chart & Recommendations */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">

                            {/* Donut Chart Card */}
                            <Card className="shadow-lg border-slate-100 h-full flex flex-col" ref={pieChartRef}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                        <Award className="w-5 h-5 text-emerald-600" /> Total Score
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[300px] relative">
                                    <div className="w-[250px] h-[250px] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Compliant', value: questions.filter(q => q.answer === "yes").length, fill: '#f59e0b' },
                                                        { name: 'Non-Compliant', value: questions.filter(q => q.answer !== "yes").length, fill: '#f1f5f9' },
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={100}
                                                    startAngle={90}
                                                    endAngle={-270}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    <Cell key="cell-0" fill="#fbbf24" /> {/* Amber/Yellow for score */}
                                                    <Cell key="cell-1" fill="#f1f5f9" /> {/* Slate-100 for background */}
                                                </Pie>
                                                <Tooltip
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0];
                                                            return (
                                                                <div className="bg-white p-2 border border-slate-100 shadow-lg rounded text-xs font-bold text-slate-700">
                                                                    {data.name}: {data.value}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Center Text */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-4xl font-bold text-amber-500">{calculateScore()} / 50</span>
                                            <span className="text-sm font-medium text-slate-400">{questions.filter(q => q.answer === "yes").length} questions yes</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 px-4 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        {getStage(calculateScore())}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recommendations Card */}
                            <Card className="shadow-lg border-slate-100 h-full bg-slate-50/50">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-2 text-slate-800">
                                        <ArrowRight className="-ml-1 w-5 h-5 text-amber-500 rotate-[-45deg]" />
                                        Your Position: <span className="text-slate-900">{getStage(calculateScore())}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <p className="text-slate-600 leading-relaxed">
                                        {getStageDetails(calculateScore()).description}
                                    </p>

                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Recommended Actions:</h4>
                                        <ul className="space-y-2">
                                            {getStageDetails(calculateScore()).actions.map((action, i) => (
                                                <li key={i} className="flex gap-3 text-sm text-slate-700 items-start">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                                    <span className="flex-1">{action}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200">
                                        <p className="text-sm font-bold text-slate-800">
                                            Timeline: <span className="font-normal text-slate-600">{getStageDetails(calculateScore()).timeline}</span>
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Middle Row: Score Table */}
                        <Card className="shadow-lg border-slate-100 w-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Final Score Calculation
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[50%] text-slate-500">Clause</TableHead>
                                            <TableHead className="text-right text-slate-500">Subtotal</TableHead>
                                            <TableHead className="text-right text-slate-500">Max</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {calculateClauseScores().map((item) => (
                                            <TableRow key={item.clause} className="hover:bg-emerald-50/50">
                                                <TableCell className="font-medium text-slate-700">{item.fullClause}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-900">{item.yes}</TableCell>
                                                <TableCell className="text-right text-slate-500">{item.total}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-slate-50/80 hover:bg-slate-50 font-bold border-t-2 border-slate-100">
                                            <TableCell className="text-slate-800 uppercase tracking-wider">Total Score</TableCell>
                                            <TableCell className="text-right text-emerald-600 text-lg">{questions.filter(q => q.answer === "yes").length}</TableCell>
                                            <TableCell className="text-right text-slate-900 text-lg">{questions.length}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Bottom Row: Score by Clause Bar Chart */}
                        <Card className="shadow-lg border-slate-100 w-full" ref={barChartRef}>
                            <CardHeader>
                                <CardTitle className="text-lg text-slate-800">Score by Clause</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={calculateClauseScores()} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="clause"
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            tickLine={false}
                                            axisLine={{ stroke: '#cbd5e1' }}
                                            tickFormatter={(val) => `Cl. ${val}`}
                                        />
                                        <YAxis
                                            hide={false}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl text-xs">
                                                            <p className="font-bold mb-1">{data.fullClause}</p>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-slate-300">Score:</span>
                                                                <span className="font-bold text-emerald-400">{data.score}%</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-slate-300">Count:</span>
                                                                <span className="font-bold">{data.yes}/{data.total}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={50}>
                                            {calculateClauseScores().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={
                                                    entry.score >= 80 ? "#10b981" : // Emerald-500
                                                        entry.score >= 50 ? "#f59e0b" : // Amber-500
                                                            "#ef4444" // Red-500
                                                } />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full pt-8">
                            <Button onClick={resetAssessment} variant="outline" className="gap-2 h-12 flex-1">
                                <RotateCcw className="w-4 h-4" /> Start New
                            </Button>

                            <Button variant="outline" className="gap-2 h-12 flex-1 border-emerald-200 hover:bg-emerald-50 text-emerald-700" onClick={() => generatePDF()}>
                                <FileText className="w-4 h-4" /> Download PDF
                            </Button>

                            <Button variant="outline" className="gap-2 h-12 flex-1 border-blue-200 hover:bg-blue-50 text-blue-700" onClick={() => generateWord()}>
                                <FileText className="w-4 h-4" /> Download Word
                            </Button>
                        </div>
                        {Object.entries(groupedQuestions).length > 0 ? (
                            Object.entries(groupedQuestions).map(([clause, clauseQuestions]) => (
                                <Card key={clause} className="border-none shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
                                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6">
                                        <CardTitle className="text-lg font-bold text-slate-800">{clause}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-100">
                                            {clauseQuestions.map((q) => (
                                                <div key={q.id} className="p-6 flex gap-4 items-start hover:bg-slate-50 transition-colors">
                                                    <div className={cn(
                                                        "mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border",
                                                        q.answer === "yes" ? "bg-emerald-100 border-emerald-200 text-emerald-700" :
                                                            q.answer === "no" ? "bg-red-100 border-red-200 text-red-700" : "bg-slate-100 border-slate-200 text-slate-400"
                                                    )}>
                                                        {q.answer === "yes" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                                            q.answer === "no" ? <AlertCircle className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <div className="space-y-2 flex-1">
                                                        <p className="text-slate-800 font-medium">{q.text}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                                                                q.answer === "yes" ? "bg-emerald-50 text-emerald-700" :
                                                                    q.answer === "no" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"
                                                            )}>
                                                                {q.answer === "yes" ? "Compliant" : q.answer === "no" ? "Non-Compliant" : "Not Answered"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                No questions found.
                            </div>
                        )}

                        <div className="flex justify-center pt-8">
                            <Button variant="outline" onClick={() => setStep("list")} className="gap-2">
                                <ArrowLeft className="w-4 h-4" /> Back to List
                            </Button>
                        </div>
                    </div>
                )}


                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Question</DialogTitle>
                            <DialogDescription>
                                Add a custom question to <strong>{newQuestionClause}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="question-text" className="mb-2 block">Question Text</Label>
                            <Input
                                id="question-text"
                                value={newQuestionText}
                                onChange={(e) => setNewQuestionText(e.target.value)}
                                placeholder="Enter your question here..."
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button onClick={confirmAddQuestion} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Question</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <DeleteConfirmationDialog
                    open={deleteConfirmationOpen}
                    onOpenChange={setDeleteConfirmationOpen}
                    onConfirm={confirmDeleteQuestion}
                    title="Delete Question"
                    description="Are you sure you want to delete this question? This action cannot be undone."
                />

            </div>
        </div>
    );
};

export default SelfAssessment;
