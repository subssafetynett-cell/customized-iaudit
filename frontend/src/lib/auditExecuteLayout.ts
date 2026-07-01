export type AuditExecuteTableId =
  | "detailsOfChanges"
  | "participants"
  | "positiveAspects"
  | "opportunities"
  | "nonConformances";

export interface DetailsOfChangeRow {
  item: string;
  actionRequired: boolean;
  notes: string;
}

export interface AuditExecuteLayout {
  sectionLabels: Partial<{
    previousFindings: string;
    previousFindingsClosure: string;
    detailsOfChanges: string;
    auditParticipants: string;
    nationalFindingsLog: string;
    positiveAspects: string;
    opportunities: string;
    opportunitiesSubtitle: string;
    nonConformances: string;
    nonConformancesSubtitle: string;
  }>;
  columnLabels: Partial<Record<AuditExecuteTableId, Partial<Record<string, string>>>>;
  hiddenColumns: Partial<Record<AuditExecuteTableId, string[]>>;
  hiddenSections: string[];
}

export const DEFAULT_SECTION_LABELS: Required<AuditExecuteLayout["sectionLabels"]> = {
  previousFindings: "Previous Audit Findings",
  previousFindingsClosure: "Closure of Findings from Previous Audit",
  detailsOfChanges: "Details of Changes",
  auditParticipants: "Audit Participants",
  nationalFindingsLog: "National Findings Log",
  positiveAspects: "Positive Aspects",
  opportunities: "Opportunities for Improvement (OFI)",
  opportunitiesSubtitle: "Recommendations to ensure continuous improvement.",
  nonConformances: "Non-conformances (NCR)",
  nonConformancesSubtitle: "Incomplete compliance requiring corrective action.",
};

export const DEFAULT_COLUMN_LABELS: Record<AuditExecuteTableId, Record<string, string>> = {
  detailsOfChanges: {
    item: "Change Management monitoring in relation to:",
    actionRequired: "Action Required",
    notes: "Notes",
  },
  participants: {
    name: "Name",
    position: "Position",
    opening: "Opening meeting",
    closing: "Closing meeting",
    interviewed: "Interviewed (processes)",
  },
  positiveAspects: {
    no: "No.",
    standardClause: "Standard & Clause No.",
    areaProcess: "Area / Process",
    aspect: "Positive Aspect",
  },
  opportunities: {
    no: "No.",
    standardClause: "Standard Clause",
    areaProcess: "Area / Process",
    opportunity: "Opportunity for Improvement",
  },
  nonConformances: {
    no: "No.",
    standardClause: "Standard & Clause No.",
    areaProcess: "Area / Process",
    statement: "Statement of Non-conformance",
    dueDate: "Due Date",
    actionBy: "Action By",
  },
};

export const DEFAULT_DETAILS_OF_CHANGES_ROWS: DetailsOfChangeRow[] = [
  { item: "Scope", actionRequired: false, notes: "" },
  { item: "Boundary", actionRequired: false, notes: "" },
  { item: "Key IMS documented information", actionRequired: false, notes: "" },
  { item: "Organisational structure", actionRequired: false, notes: "" },
  { item: "Compliance Obligations", actionRequired: false, notes: "" },
  { item: "Other noteworthy changes", actionRequired: false, notes: "" },
];

export function defaultAuditExecuteLayout(): AuditExecuteLayout {
  return {
    sectionLabels: {},
    columnLabels: {},
    hiddenColumns: {},
    hiddenSections: ["auditParticipants"],
  };
}

export function mergeAuditExecuteLayout(
  partial?: Partial<AuditExecuteLayout> | null,
): AuditExecuteLayout {
  const base = defaultAuditExecuteLayout();
  if (!partial) return base;
  return {
    sectionLabels: { ...base.sectionLabels, ...partial.sectionLabels },
    columnLabels: {
      ...base.columnLabels,
      ...Object.fromEntries(
        Object.entries(partial.columnLabels || {}).map(([tableId, labels]) => [
          tableId,
          { ...base.columnLabels[tableId as AuditExecuteTableId], ...labels },
        ]),
      ),
    },
    hiddenColumns: partial.hiddenColumns ?? base.hiddenColumns,
    hiddenSections: partial.hiddenSections ?? base.hiddenSections,
  };
}

export function getSectionLabel(
  layout: AuditExecuteLayout,
  key: keyof typeof DEFAULT_SECTION_LABELS,
): string {
  return layout.sectionLabels?.[key]?.trim() || DEFAULT_SECTION_LABELS[key];
}

export function isSectionVisible(layout: AuditExecuteLayout, key: string): boolean {
  return !(layout.hiddenSections || []).includes(key);
}

export function getColumnLabel(
  layout: AuditExecuteLayout,
  tableId: AuditExecuteTableId,
  columnKey: string,
): string {
  return (
    layout.columnLabels?.[tableId]?.[columnKey]?.trim() ||
    DEFAULT_COLUMN_LABELS[tableId][columnKey] ||
    columnKey
  );
}

export function isColumnVisible(
  layout: AuditExecuteLayout,
  tableId: AuditExecuteTableId,
  columnKey: string,
): boolean {
  return !(layout.hiddenColumns?.[tableId] || []).includes(columnKey);
}

export function visibleColumnKeys(
  layout: AuditExecuteLayout,
  tableId: AuditExecuteTableId,
): string[] {
  return Object.keys(DEFAULT_COLUMN_LABELS[tableId]).filter((key) =>
    isColumnVisible(layout, tableId, key),
  );
}
