import { format } from "date-fns";
import { auditTemplates } from "@/data/auditTemplates";

export type FindingsReportFieldKey =
  | "docNumber"
  | "reportTitle"
  | "revisionNo"
  | "issueDate"
  | "managementSystem"
  | "department"
  | "auditDate"
  | "auditors"
  | "auditees"
  | "auditScope"
  | "auditCriteriaAndMethod"
  | "generalComment";

export type FindingsReportCustomFieldSection = "document" | "management" | "content";

export interface FindingsReportCustomField {
  id: string;
  label: string;
  value: string;
  section: FindingsReportCustomFieldSection;
}

export interface FindingsReportSectionLabels {
  managementSystem?: string;
  auditScope?: string;
  auditCriteria?: string;
  auditSummary?: string;
  nonConformitiesSummary?: string;
  generalComment?: string;
  keyPersonnel?: string;
  acknowledgement?: string;
}

export const DEFAULT_FINDINGS_FIELD_LABELS: Record<FindingsReportFieldKey, string> = {
  docNumber: "Doc. Number",
  reportTitle: "Title",
  revisionNo: "Revision No.",
  issueDate: "Issue Date",
  managementSystem: "Management System",
  department: "Department",
  auditDate: "Date of Audit",
  auditors: "Auditors",
  auditees: "Auditees",
  auditScope: "Audit Scope",
  auditCriteriaAndMethod: "Audit Criteria and Method",
  generalComment: "General Comment",
};

export const DEFAULT_FINDINGS_SECTION_LABELS: Required<FindingsReportSectionLabels> = {
  managementSystem: "1. MANAGEMENT SYSTEM",
  auditScope: "2. AUDIT SCOPE",
  auditCriteria: "3. AUDIT CRITERIA AND METHOD",
  auditSummary: "4. AUDIT SUMMARY",
  nonConformitiesSummary: "4.1 Summary of Non-conformities",
  generalComment: "4.2 General comment on system implementation",
  keyPersonnel: "4.3 Key personnel interviewed",
  acknowledgement: "5. ACKNOWLEDGEMENT OF FINDINGS",
};

export function getFieldLabel(
  form: Pick<FindingsReportForm, "fieldLabels">,
  key: FindingsReportFieldKey,
): string {
  return form.fieldLabels?.[key]?.trim() || DEFAULT_FINDINGS_FIELD_LABELS[key];
}

export function isFieldVisible(
  form: Pick<FindingsReportForm, "hiddenFields">,
  key: FindingsReportFieldKey,
): boolean {
  return !(form.hiddenFields || []).includes(key);
}

export function getSectionLabel(
  form: Pick<FindingsReportForm, "sectionLabels">,
  key: keyof FindingsReportSectionLabels,
): string {
  return form.sectionLabels?.[key]?.trim() || DEFAULT_FINDINGS_SECTION_LABELS[key];
}

export function emptyCustomField(
  section: FindingsReportCustomFieldSection,
): FindingsReportCustomField {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: "New Field",
    value: "",
    section,
  };
}

export interface ExportMetadataRow {
  label: string;
  value: string;
}

export function buildManagementMetadataRows(
  form: FindingsReportForm,
  values: {
    managementSystem: string;
    department: string;
    selectedDepartments: string;
    auditDate: string;
    auditors: string;
    auditees: string;
  },
): ExportMetadataRow[] {
  const rows: ExportMetadataRow[] = [];
  const pushRow = (key: FindingsReportFieldKey, value: string) => {
    if (!isFieldVisible(form, key)) return;
    rows.push({
      label: getFieldLabel(form, key).toUpperCase(),
      value: value || "—",
    });
  };

  pushRow("managementSystem", values.managementSystem);
  if (values.selectedDepartments) {
    if (isFieldVisible(form, "department")) {
      rows.push({
        label: getFieldLabel(form, "department").toUpperCase(),
        value: values.selectedDepartments,
      });
    }
  } else {
    pushRow("department", values.department);
  }
  pushRow("auditDate", values.auditDate);
  pushRow("auditors", values.auditors);
  pushRow("auditees", values.auditees);

  for (const field of form.customFields || []) {
    if (field.section !== "management") continue;
    rows.push({
      label: (field.label || "Field").toUpperCase(),
      value: field.value || "—",
    });
  }

  return rows;
}

/** Rows shown inside the management metadata box (excludes the section title field). */
export function getManagementBoxRows(
  form: FindingsReportForm,
  rows: ExportMetadataRow[],
): ExportMetadataRow[] {
  const managementLabel = getFieldLabel(form, "managementSystem").toUpperCase();
  return rows.filter((row) => row.label !== managementLabel);
}

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
  docNumber: string;
  reportTitle: string;
  revisionNo: string;
  issueDate: string;
  managementSystem: string;
  department: string;
  auditDate: string;
  auditors: string;
  auditees: string;
  auditScope: string;
  auditCriteriaAndMethod: string;
  generalComment: string;
  fieldLabels: Partial<Record<FindingsReportFieldKey, string>>;
  hiddenFields: FindingsReportFieldKey[];
  customFields: FindingsReportCustomField[];
  sectionLabels: FindingsReportSectionLabels;
  keyPersonnel: KeyPersonnelRow[];
  acknowledgement: FindingsReportAcknowledgement;
}

export function emptyKeyPersonnelRow(): KeyPersonnelRow {
  return { name: "", position: "", department: "" };
}

export function defaultFindingsReportForm(): FindingsReportForm {
  return {
    docNumber: "SH-CP-FM-11",
    reportTitle: "Audit Findings Report",
    revisionNo: "03",
    issueDate: format(new Date(), "dd/MM/yy"),
    managementSystem: "",
    department: "",
    auditDate: "",
    auditors: "",
    auditees: "",
    auditScope: "",
    auditCriteriaAndMethod: "",
    generalComment: "",
    fieldLabels: {},
    hiddenFields: [],
    customFields: [],
    sectionLabels: {},
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
    fieldLabels: { ...base.fieldLabels, ...partial.fieldLabels },
    hiddenFields: partial.hiddenFields ?? base.hiddenFields,
    customFields: partial.customFields ?? base.customFields,
    sectionLabels: { ...base.sectionLabels, ...partial.sectionLabels },
    keyPersonnel:
      partial.keyPersonnel?.length ? partial.keyPersonnel : base.keyPersonnel,
    acknowledgement: {
      ...base.acknowledgement,
      ...partial.acknowledgement,
    },
  };
}

export function normalizeFindingsReportForm(
  partial?: Partial<FindingsReportForm> | null,
): FindingsReportForm {
  return mergeFindingsReportForm(partial);
}

export function getCustomFieldsBySection(
  form: FindingsReportForm,
  section: FindingsReportCustomFieldSection,
): FindingsReportCustomField[] {
  return (form.customFields || []).filter((field) => field.section === section);
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
