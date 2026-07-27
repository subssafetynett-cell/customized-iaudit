import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FindingCapaHistoryEntry } from "@/lib/auditFindings";
import { parseCapaForm, summarizeCapaForm } from "@/lib/findingCapaForm";
import { cn } from "@/lib/utils";

function formatWhen(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

export function ResponseVersionCard({
    title,
    submittedAt,
    rootCause,
    correction,
    correctiveAction,
    findingDetails,
    capaForm,
}: {
    title: string;
    submittedAt?: string;
    rootCause?: string;
    correction?: string;
    correctiveAction?: string;
    findingDetails?: string;
    capaForm?: Record<string, unknown>;
}) {
    const parsed = parseCapaForm(capaForm);
    const summary = parsed
        ? summarizeCapaForm(parsed)
        : {
              rootCause: rootCause || "",
              correction: correction || "",
              correctiveAction: correctiveAction || "",
              preventiveAction: "",
              findingDetails: findingDetails || "",
          };

    const rows = [
        { label: "Incident / 5W1H / observations", value: summary.findingDetails },
        { label: "Root cause(s)", value: summary.rootCause || rootCause },
        { label: "Correction(s)", value: summary.correction || correction },
        {
            label: "Corrective action(s)",
            value: summary.correctiveAction || correctiveAction,
        },
        parsed?.probableCauses?.trim()
            ? { label: "Probable causes", value: parsed.probableCauses }
            : null,
        parsed?.effectivenessCriteria?.trim()
            ? { label: "Effectiveness criteria", value: parsed.effectivenessCriteria }
            : null,
    ].filter(Boolean) as { label: string; value?: string }[];

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <p className="text-sm font-semibold text-[#213847]">{title}</p>
                {submittedAt ? (
                    <p className="text-xs text-slate-500">{formatWhen(submittedAt)}</p>
                ) : null}
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {rows.map((row) =>
                    row.value?.trim() ? (
                        <div key={row.label} className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {row.label}
                            </p>
                            <p className="text-sm text-slate-800 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                                {row.value.trim()}
                            </p>
                        </div>
                    ) : null,
                )}
                {parsed ? (
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {(
                            [
                                ["Method", parsed.fishbone.method],
                                ["Environment", parsed.fishbone.environment],
                                ["Materials", parsed.fishbone.materials],
                                ["Management", parsed.fishbone.management],
                                ["Machine", parsed.fishbone.machine],
                                ["Manpower", parsed.fishbone.manpower],
                            ] as const
                        )
                            .filter(([, v]) => v.trim())
                            .map(([label, value]) => (
                                <div key={label} className="space-y-1">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Fishbone · {label}
                                    </p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
                                        {value.trim()}
                                    </p>
                                </div>
                            ))}
                    </div>
                ) : null}
                {rows.every((r) => !r.value?.trim()) && !parsed ? (
                    <p className="md:col-span-2 text-sm text-muted-foreground">
                        No response details recorded for this version.
                    </p>
                ) : null}
            </div>
        </div>
    );
}

type Props = {
    /** Latest / current response content. */
    currentContent: ReactNode;
    previous: FindingCapaHistoryEntry[];
    /** Optional label overrides. */
    currentLabel?: string;
    previousLabel?: string;
    className?: string;
};

/**
 * When a finding has been responded to more than once, show Current + Previous Response tabs.
 * If there is no previous history, renders `currentContent` only.
 */
export function FindingResponseVersionTabs({
    currentContent,
    previous,
    currentLabel = "Current response",
    previousLabel = "Previous response",
    className,
}: Props) {
    if (previous.length === 0) {
        return <div className={className}>{currentContent}</div>;
    }

    return (
        <Tabs defaultValue="current" className={cn("w-full", className)}>
            <TabsList className="mb-4 h-auto w-full sm:w-auto flex flex-wrap justify-start gap-1 bg-slate-100 p-1">
                <TabsTrigger value="current" className="text-sm">
                    {currentLabel}
                </TabsTrigger>
                <TabsTrigger value="previous" className="text-sm">
                    {previousLabel}
                    {previous.length > 1 ? ` (${previous.length})` : ""}
                </TabsTrigger>
            </TabsList>
            <TabsContent value="current" className="mt-0 space-y-3">
                {currentContent}
            </TabsContent>
            <TabsContent value="previous" className="mt-0 space-y-3">
                {[...previous].reverse().map((entry, idx) => {
                    const versionNumber = previous.length - idx;
                    return (
                        <ResponseVersionCard
                            key={`prev-${entry.submittedAt}-${versionNumber}`}
                            title={
                                previous.length > 1
                                    ? `Previous response #${versionNumber}`
                                    : "Previous response"
                            }
                            submittedAt={entry.submittedAt}
                            rootCause={entry.rootCause}
                            correction={entry.correction}
                            correctiveAction={entry.correctiveAction}
                            findingDetails={entry.findingDetails}
                            capaForm={entry.capaForm}
                        />
                    );
                })}
            </TabsContent>
        </Tabs>
    );
}
