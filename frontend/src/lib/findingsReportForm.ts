import { format } from "date-fns";
import { auditTemplates } from "@/data/auditTemplates";

export interface KeyPersonnelRow {
  name: string;
  position: string;
  department: string;
}

export interface FindingsReportAcknowledgement {
  auditeeSignature: string;
  auditeeDate: string;
  auditorSignature: string;
  auditorDate: string;
}

export interface FindingsReportForm {
  issueDate: string;
  managementSystem: string;
  department: string;
  auditDate: string;
  auditors: string;
  auditees: string;
  auditScope: string;
  auditCriteriaAndMethod: string;
  generalComment: string;
  keyPersonnel: KeyPersonnelRow[];
  acknowledgement: FindingsReportAcknowledgement;
}

export function emptyKeyPersonnelRow(): KeyPersonnelRow {
  return { name: "", position: "", department: "" };
}

export function defaultFindingsReportForm(): FindingsReportForm {
  return {
    issueDate: format(new Date(), "dd/MM/yy"),
    managementSystem: "",
    department: "",
    auditDate: "",
    auditors: "",
    auditees: "",
    auditScope: "",
    auditCriteriaAndMethod: "",
    generalComment: "",
    keyPersonnel: [
      emptyKeyPersonnelRow(),
      emptyKeyPersonnelRow(),
      emptyKeyPersonnelRow(),
      emptyKeyPersonnelRow(),
    ],
    acknowledgement: {
      auditeeSignature: "",
      auditeeDate: "",
      auditorSignature: "",
      auditorDate: "",
    },
  };
}

function formatPlanDate(date: string | Date | undefined): string {
  if (!date) return "";
  try {
    return format(new Date(date), "dd/MM/yy");
  } catch {
    return String(date);
  }
}

function mergeFindingsReportForm(
  partial?: Partial<FindingsReportForm> | null,
): FindingsReportForm {
  const base = defaultFindingsReportForm();
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    keyPersonnel:
      partial.keyPersonnel?.length ? partial.keyPersonnel : base.keyPersonnel,
    acknowledgement: {
      ...base.acknowledgement,
      ...partial.acknowledgement,
    },
  };
}

export function buildFindingsReportDefaults(
  plan: Record<string, unknown>,
  auditData?: Record<string, unknown> | null,
): FindingsReportForm {
  const saved = auditData?.findingsReportForm as Partial<FindingsReportForm> | undefined;
  if (saved) return mergeFindingsReportForm(saved);

  const template = auditTemplates.find((t) => t.id === plan.templateId);
  const globalInfo = auditData?.auditGlobalInfo as Record<string, string> | undefined;
  const leadAuditor = plan.leadAuditor as
    | { firstName?: string; lastName?: string }
    | undefined;
  const leadAuditorName =
    leadAuditor
      ? `${leadAuditor.firstName || ""} ${leadAuditor.lastName || ""}`.trim()
      : String(plan.leadAuditorName || "");
  const auditProgram = plan.auditProgram as { site?: { name?: string } } | undefined;
  const auditDate = formatPlanDate(plan.date as string | Date | undefined);
  const auditeeList = Array.isArray(plan.auditees)
    ? (plan.auditees as { firstName?: string; lastName?: string }[])
        .map((a) => `${a.firstName || ""} ${a.lastName || ""}`.trim())
        .filter(Boolean)
        .join(", ")
    : "";

  return mergeFindingsReportForm({
    issueDate: auditDate || format(new Date(), "dd/MM/yy"),
    managementSystem:
      globalInfo?.clauseNo ||
      String(plan.criteria || "") ||
      String(template?.standard || ""),
    department:
      globalInfo?.department ||
      auditProgram?.site?.name ||
      String(plan.location || ""),
    auditDate,
    auditors: leadAuditorName,
    auditees: auditeeList || "—",
    auditScope: String(plan.scope || ""),
    auditCriteriaAndMethod: [plan.criteria, plan.objective]
      .filter(Boolean)
      .map(String)
      .join(" — "),
    generalComment: String(auditData?.executiveSummary || ""),
  });
}
