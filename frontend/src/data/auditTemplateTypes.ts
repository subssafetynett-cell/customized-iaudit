export type AuditStandard = "ISO 9001" | "ISO 14001" | "ISO 45001" | "ISO 22000";
export type TemplateType = "section" | "checklist" | "clause-checklist" | "process-audit";

export interface SectionContent {
    title: string;
    placeholder: string;
}

export interface ChecklistContent {
    clause: string;
    question: string;
    /** Optional auditor guidance shown under the question (e.g. EOSH “Intent of the Question”). */
    intent?: string;
    findings: string;
    evidence: string;
    ofi: string;
    actionBy?: string;
    closeDate?: string;
    assignTo?: string;
    assignToName?: string;
    assignToEmail?: string;
    findingType?: "C" | "OFI" | "Min" | "Maj";
}

export interface ClauseChecklistContent {
    clauseId: string;
    title: string;
    subClauses: string[];
    findingType?: "C" | "OFI" | "Minor" | "Major";
    findingDetails?: string;
    findingImages?: string[];
    description?: string;
    correction?: string;
    rootCause?: string;
    correctiveAction?: string;
    actionBy?: string;
    closeDate?: string;
    assignTo?: string;
    assignToName?: string;
    assignToEmail?: string;
}

export interface ProcessAuditContent {
    id: string;
    refNo?: string;
    clauseNo?: string;
    department?: string;
    processArea?: string;
    auditees?: string;
    evidence?: string;
    conclusion?: string;
    findingType?: "C" | "OFI" | "Minor" | "Major";
    description?: string;
    correction?: string;
    rootCause?: string;
    correctiveAction?: string;
    actionBy?: string;
    closeDate?: string;
    assignTo?: string;
    assignToName?: string;
    assignToEmail?: string;
}

export interface AuditTemplate {
    id: string;
    title: string;
    standard: AuditStandard;
    type: TemplateType;
    description: string;
    isIntegrated?: boolean;
    isTripleMapping?: boolean;
    alwaysAvailableInPlan?: boolean;
    module?: string;
    content: SectionContent[] | ChecklistContent[] | ClauseChecklistContent[] | ProcessAuditContent[];
}
