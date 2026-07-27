import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { QFS_KORE_EXCEL_MODULE_META } from "@/data/qfsKoreExcelModuleTemplates";
import type { AuditTemplate } from "@/data/auditTemplateTypes";

/** Colors from QFS KORE Excel module headers (General Operating Requirements). */
export const QFS_KORE_CHECKLIST_COLORS = {
  no: "#A6A6A6",
  requirement: "#D9E2F3",
  compliance: "#92D050",
  meetExceptions: "#FFC000",
  nonCompliance: "#FF0000",
  finding: "#FFFFFF",
  evidence: "#FFFFFF",
  goldBar: "#C9A227",
  /** Excel grey subheading / section title rows */
  subheading: "#D9D9D9",
} as const;

/** Clause ids like GOR-SEC-1 / GMP-SEC-6 — Excel grey subheadings, not scoreable questions. */
export function isQfsKoreSectionHeader(clause?: string | null): boolean {
  return /^[A-Za-z0-9]+-SEC-\d+$/i.test(String(clause || "").trim());
}

export type QfsScoreMode =
  | "compliance-noncompliance"
  | "compliance-exception-noncompliance";

const QFS_META_BY_ID = Object.fromEntries(
  QFS_KORE_EXCEL_MODULE_META.map((m) => [m.id, m]),
) as Record<string, (typeof QFS_KORE_EXCEL_MODULE_META)[number]>;

/** Plans may store a shorthand id before per-module templates existed. */
const QFS_TEMPLATE_ID_ALIASES: Record<string, string> = {
  "qfs-kore-audit-checklist": "qfs-kore-general-operating-requirements-checklist",
  // Programme checklist kept the old id before programme suffix was added.
  "qfs-kore-environmental-monitoring-checklist":
    "qfs-kore-environmental-monitoring-programme-checklist",
};

function resolveQfsTemplateId(templateId?: string | null): string | undefined {
  if (!templateId) return undefined;
  return QFS_TEMPLATE_ID_ALIASES[templateId] ?? templateId;
}

export function isQfsKoreScoredChecklist(templateId?: string | null): boolean {
  const id = resolveQfsTemplateId(templateId);
  return Boolean(id && id in QFS_META_BY_ID);
}

export function usesQfsKoreScoredChecklistLayout(
  template?: Pick<AuditTemplate, "id" | "type"> | null,
): boolean {
  return template?.type === "checklist" && isQfsKoreScoredChecklist(template.id);
}

export function getQfsScoreMode(templateId?: string | null): QfsScoreMode {
  const id = resolveQfsTemplateId(templateId);
  const mode = id ? QFS_META_BY_ID[id]?.scoreMode : undefined;
  return mode === "compliance-exception-noncompliance"
    ? "compliance-exception-noncompliance"
    : "compliance-noncompliance";
}

export function getQfsKoreBannerCopy(templateId?: string | null) {
  const meta = (() => {
    const id = resolveQfsTemplateId(templateId);
    return id ? QFS_META_BY_ID[id] : undefined;
  })();
  return {
    formTitle: "KORE QFS Internal Audit Checklist",
    moduleLabel: meta?.moduleLabel ?? "MODULE: QFS KORE",
    sectionTitle: meta?.sectionTitle ?? "QFS KORE Checklist",
  };
}

export function qfsHeaderStyle(bg: string): CSSProperties {
  return {
    backgroundColor: bg,
    color: bg === QFS_KORE_CHECKLIST_COLORS.nonCompliance ? "#FFFFFF" : "#111827",
  };
}

export const qfsHeaderCellClass =
  "border border-slate-300 text-center align-middle text-[11px] font-bold leading-tight px-2 py-2 whitespace-normal";

export type QfsScore = "2" | "1" | "0" | "";

/** 2-col modules: Compliance=1 / Non Compliance=0. 3-col: Compliance=2 / Meet with Exceptions=1 / Non Compliance=0. */
export function qfsScoreFromFindings(
  findings: string | undefined | null,
  scoreMode: QfsScoreMode = "compliance-noncompliance",
): QfsScore {
  if (scoreMode === "compliance-exception-noncompliance") {
    if (findings === "2" || findings === "C") return "2";
    if (findings === "1") return "1";
    if (findings === "0" || findings === "Min" || findings === "Maj") return "0";
    return "";
  }
  if (findings === "1" || findings === "C") return "1";
  if (findings === "0" || findings === "Min" || findings === "Maj") return "0";
  // Treat EOSH-style "2" as compliance if somehow present on 2-col modules
  if (findings === "2") return "1";
  return "";
}

export function qfsScoreOptions(scoreMode: QfsScoreMode) {
  if (scoreMode === "compliance-exception-noncompliance") {
    return [
      { val: "2" as const, label: "Compliance (2)", headerBg: QFS_KORE_CHECKLIST_COLORS.compliance },
      {
        val: "1" as const,
        label: "Meet with Exceptions (1)",
        headerBg: QFS_KORE_CHECKLIST_COLORS.meetExceptions,
      },
      {
        val: "0" as const,
        label: "Non Compliance (0)",
        headerBg: QFS_KORE_CHECKLIST_COLORS.nonCompliance,
      },
    ];
  }
  return [
    { val: "1" as const, label: "Compliance", headerBg: QFS_KORE_CHECKLIST_COLORS.compliance },
    {
      val: "0" as const,
      label: "Non Compliance",
      headerBg: QFS_KORE_CHECKLIST_COLORS.nonCompliance,
    },
  ];
}

export function needsQfsExceptionFollowUp(
  score: QfsScore,
  scoreMode: QfsScoreMode = "compliance-noncompliance",
): boolean {
  if (scoreMode === "compliance-exception-noncompliance") {
    return score === "1" || score === "0";
  }
  return score === "0";
}

export function QfsKoreFormBanner({
  formTitle,
  moduleLabel,
  sectionTitle,
  className,
}: {
  formTitle: string;
  moduleLabel: string;
  sectionTitle: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-300 bg-white overflow-hidden text-sm text-slate-800",
        className,
      )}
    >
      <div className="px-4 py-3 border-b border-slate-300 space-y-1">
        <p className="text-base font-bold tracking-wide uppercase text-slate-900">
          {formTitle}
        </p>
        <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
          {moduleLabel}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/60">
        <p>
          <span className="font-bold">AUDITEE NAME:</span>{" "}
          <span className="text-slate-500">—</span>
        </p>
        <p>
          <span className="font-bold">AUDIT DONE BY:</span>{" "}
          <span className="text-slate-500">—</span>
        </p>
        <p>
          <span className="font-bold">AUDITEE DEPT:</span>{" "}
          <span className="text-slate-500">—</span>
        </p>
      </div>
      <div className="px-4 py-3 text-center">
        <p className="font-bold underline uppercase tracking-wide text-slate-900">
          {sectionTitle}
        </p>
      </div>
      <div
        className="h-2 w-full"
        style={{ backgroundColor: QFS_KORE_CHECKLIST_COLORS.goldBar }}
        aria-hidden
      />
    </div>
  );
}
