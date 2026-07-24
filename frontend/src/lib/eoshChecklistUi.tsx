import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { EOSH_EXCEL_MODULE_META } from "@/data/eoshExcelModuleTemplates";

/** HSHEQPF 03.08 — EOSH spreadsheet header colours */
export const EOSH_CHECKLIST_COLORS = {
  goldBar: "#C9A227",
  no: "#A6A6A6",
  question: "#C5B0D5",
  intent: "#9DC3E6",
  compliance: "#70AD47",
  meetExceptions: "#FFC000",
  nonCompliance: "#FF5050",
  evidence: "#FFFFFF",
  comment: "#FFFFFF",
} as const;

const EOSH_META_BY_ID = Object.fromEntries(
  EOSH_EXCEL_MODULE_META.map((m) => [m.id, m]),
) as Record<
  string,
  (typeof EOSH_EXCEL_MODULE_META)[number]
>;

export const EOSH_CAPABILITY_TEMPLATE_ID = "eosh-capability-manufacturing-checklist";
export const EOSH_CAPABILITY_RTM_TEMPLATE_ID = "eosh-capability-rtm-checklist";
export const EOSH_CLIMATE_PROTECTION_TEMPLATE_ID = "eosh-climate-protection-checklist";
export const EOSH_COMPRESSED_GASES_TEMPLATE_ID = "eosh-compressed-gases-checklist";
export const EOSH_CONFINED_SPACE_TEMPLATE_ID = "eosh-confined-space-checklist";

export function isEoshCapabilityChecklist(templateId?: string | null): boolean {
  return templateId === EOSH_CAPABILITY_TEMPLATE_ID;
}

export function isEoshCapabilityRtmChecklist(templateId?: string | null): boolean {
  return templateId === EOSH_CAPABILITY_RTM_TEMPLATE_ID;
}

export function isEoshClimateProtectionChecklist(templateId?: string | null): boolean {
  return templateId === EOSH_CLIMATE_PROTECTION_TEMPLATE_ID;
}

export function isEoshCompressedGasesChecklist(templateId?: string | null): boolean {
  return templateId === EOSH_COMPRESSED_GASES_TEMPLATE_ID;
}

export function isEoshConfinedSpaceChecklist(templateId?: string | null): boolean {
  return templateId === EOSH_CONFINED_SPACE_TEMPLATE_ID;
}

/** Any EOSH scored checklist generated from the Excel workbook. */
export function isEoshScoredCapabilityChecklist(templateId?: string | null): boolean {
  return Boolean(templateId && templateId in EOSH_META_BY_ID);
}

/** Alias — same scored EOSH checklists. */
export const isEoshScoredChecklist = isEoshScoredCapabilityChecklist;

/** Intent column: Capability / CTA / LSR / SIFp / Leadership Manufacturing style sheets. */
export function eoshChecklistShowsIntentColumn(templateId?: string | null): boolean {
  if (!templateId) return false;
  return EOSH_META_BY_ID[templateId]?.layout === "intent";
}

/** Requirement-only sheets (no Intent column). */
export function isEoshRequirementOnlyChecklist(templateId?: string | null): boolean {
  return isEoshScoredChecklist(templateId) && !eoshChecklistShowsIntentColumn(templateId);
}

export function getEoshCapabilityBannerCopy(templateId?: string | null): {
  moduleLabel: string;
  sectionTitle: string;
  formRef?: string;
} {
  const meta = templateId ? EOSH_META_BY_ID[templateId] : undefined;
  if (meta) {
    return {
      moduleLabel: meta.moduleLabel,
      sectionTitle: meta.sectionTitle,
      formRef: "HSHEQPF 03.08",
    };
  }
  return {
    moduleLabel: "MODULE: EOSH",
    sectionTitle: "EOSH Checklist",
    formRef: "HSHEQPF 03.08",
  };
}

/** Colored EOSH spreadsheet header — only templates with `module: "EOSH"`. */
export function usesEoshColoredChecklistHeader(
  template?: { id?: string; module?: string } | null,
): boolean {
  return template?.module === "EOSH";
}

/** Full Compliance(2)/Exceptions(1)/Non-Compliance(0) table layout. */
export function usesEoshScoredChecklistLayout(
  template?: { id?: string; module?: string } | null,
): boolean {
  return isEoshScoredChecklist(template?.id);
}

/** Map stored finding codes to EOSH score columns (2 / 1 / 0). */
export function eoshScoreFromFindings(findings?: string | null): "2" | "1" | "0" | "" {
  if (findings === "2" || findings === "C") return "2";
  if (findings === "1" || findings === "OFI") return "1";
  if (findings === "0" || findings === "Min" || findings === "Maj") return "0";
  return "";
}

export const eoshHeaderCellClass =
  "border border-slate-400 px-2 py-2 text-center align-middle font-bold text-[11px] leading-tight text-slate-900 whitespace-normal";

export function eoshHeaderStyle(bg: string): CSSProperties {
  return { backgroundColor: bg };
}

const EOSH_MAX_POINTS_PER_QUESTION = 2;

/** Score totals for EOSH scored checklists (2 / 1 / 0 per question). */
export function computeEoshCapabilityScores(
  findingsByIndex: Record<number, { findings?: string } | undefined>,
  questionCount: number,
): {
  subtotal: number;
  grandTotal: number;
  maximumMarks: number;
  percentCompliance: number | null;
  scoredCount: number;
} {
  let subtotal = 0;
  let scoredCount = 0;
  for (let i = 0; i < questionCount; i++) {
    const score = eoshScoreFromFindings(findingsByIndex[i]?.findings);
    if (score === "") continue;
    subtotal += Number(score);
    scoredCount += 1;
  }
  const maximumMarks = Math.max(0, questionCount) * EOSH_MAX_POINTS_PER_QUESTION;
  const grandTotal = subtotal;
  const percentCompliance =
    maximumMarks > 0 ? Math.round((grandTotal / maximumMarks) * 1000) / 10 : null;
  return { subtotal, grandTotal, maximumMarks, percentCompliance, scoredCount };
}

export function EoshCapabilityScoreSummary({
  findingsByIndex,
  questionCount,
  className,
}: {
  findingsByIndex: Record<number, { findings?: string } | undefined>;
  questionCount: number;
  className?: string;
}) {
  const { subtotal, grandTotal, maximumMarks, percentCompliance } =
    computeEoshCapabilityScores(findingsByIndex, questionCount);

  const rows: { label: string; value: string; emphasize?: boolean }[] = [
    { label: "Subtotal", value: String(subtotal) },
    { label: "GRAND TOTAL", value: String(grandTotal), emphasize: true },
    { label: "MAXIMUM MARKS", value: String(maximumMarks), emphasize: true },
    {
      label: "% COMPLIANCE",
      value: percentCompliance == null ? "—" : `${percentCompliance}%`,
      emphasize: true,
    },
  ];

  return (
    <div className={cn("mt-4 flex justify-end", className)}>
      <table className="w-full max-w-sm border-collapse border border-slate-400 text-sm bg-white">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td
                className={cn(
                  "border border-slate-400 px-3 py-2 font-bold text-slate-900",
                  row.emphasize && "uppercase tracking-wide",
                )}
              >
                {row.label}
              </td>
              <td className="border border-slate-400 px-3 py-2 text-right font-semibold tabular-nums text-slate-900 w-28">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EoshCapabilityFormBanner({
  className,
  moduleLabel = "Module: Capability Manufacturing",
  sectionTitle = "Capability — Manufacturing",
}: {
  className?: string;
  moduleLabel?: string;
  sectionTitle?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-300 bg-white overflow-hidden text-sm text-slate-800",
        className,
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 border-b border-slate-300 px-4 py-3">
        <div>
          <p className="text-base font-bold tracking-wide uppercase text-slate-900">
            EOSH Internal Audit Checklist
          </p>
          <p className="mt-1 text-xs font-semibold uppercase text-slate-600">
            {moduleLabel}
          </p>
        </div>
        <div className="text-left sm:text-right text-xs font-semibold text-slate-700 space-y-0.5">
          <p>HSHEQPF 03.08</p>
          <p>REVISION 0</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/60">
        <p>
          <span className="font-bold">AUDITEE :</span>{" "}
          <span className="text-slate-500">—</span>
        </p>
        <p>
          <span className="font-bold">DATE :</span>{" "}
          <span className="text-slate-500">—</span>
        </p>
        <p>
          <span className="font-bold">AUDIT DONE BY:</span>{" "}
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
        style={{ backgroundColor: EOSH_CHECKLIST_COLORS.goldBar }}
        aria-hidden
      />
    </div>
  );
}
