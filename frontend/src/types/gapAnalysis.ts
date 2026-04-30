export type Standard = "ISO 9001:2015" | "ISO 14001:2015" | "ISO 45001:2018";

export type FindingType = "Comply" | "OFI" | "NC" | null;

export interface AuditQuestion {
    id: string;
    clause: string;
    text: string;
    finding: FindingType;
    actionPlan: string;
    evidence: string;
    evidenceImage?: string; // base64 data URL of uploaded image
}

export interface SavedGapAnalysis {
    id: string;
    companyName: string;
    auditDate: string;
    standard: Standard;
    location: string;
    representatives: string;
    auditorName: string;
    contactEmail: string;
    scope: string;
    auditCompany?: string;
    questions: AuditQuestion[];
    status: "In Progress" | "Completed";
}
