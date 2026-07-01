import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import { collectAuditEvidenceMedia } from "@/lib/auditEvidenceCollection";
import type { ChecklistContent, ClauseChecklistContent, ProcessAuditContent } from "@/data/auditTemplates";
import type { ReportEvidenceSource } from "@/lib/reportEvidenceImages";

/** Sub-clauses 4.1, 4.2, 4.3 defer evidence to the parent clause section end. */
export function isDeferredSubClauseEvidence(clause: string): boolean {
    return /^\d+\.(1|2|3)(?:\.|$)/.test(String(clause || "").trim());
}

export function deferredEvidenceParentClause(clause: string): string | null {
    const match = String(clause || "")
        .trim()
        .match(/^(\d+)\.(1|2|3)(?:\.|$)/);
    return match ? match[1] : null;
}

export function mediaToReportSources(
    media: AuditEvidenceMedia[],
    context: string,
): ReportEvidenceSource[] {
    return media
        .filter((item) => item?.data)
        .map((item) => ({
            name: item.name || "file",
            data: item.data,
            type: item.type || "",
            context,
            description: item.description?.trim() || undefined,
        }));
}

export type ClauseEvidenceSegment = {
    clauseLabel: string;
    sources: ReportEvidenceSource[];
    deferred?: boolean;
};

export function mergeEvidenceSources(
    target: ReportEvidenceSource[],
    incoming: ReportEvidenceSource[],
): ReportEvidenceSource[] {
    const seen = new Set(
        target.map((item) => `${item.context}::${item.name}::${item.data.slice(0, 40)}`),
    );
    for (const item of incoming) {
        const sig = `${item.context}::${item.name}::${item.data.slice(0, 40)}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        target.push(item);
    }
    return target;
}

function collectMediaForChecklistIndex(
    clauseFiles: Record<string, AuditEvidenceMedia[]>,
    genericFiles: Record<string, AuditEvidenceMedia[]>,
    clauseKey: string,
    itemIndex: number,
): AuditEvidenceMedia[] {
    const fromLookup = collectAuditEvidenceMedia(clauseFiles, genericFiles, clauseKey, {
        checklistIndex: itemIndex,
    });
    const direct = genericFiles[`clause_checklist_${itemIndex}`] || [];
    const merged = [...fromLookup];
    for (const file of direct) {
        if (!merged.some((item) => item.data === file.data)) {
            merged.push(file);
        }
    }
    return merged;
}

function collectMediaForClauseId(
    clauseFiles: Record<string, AuditEvidenceMedia[]>,
    genericFiles: Record<string, AuditEvidenceMedia[]>,
    clauseId: string,
): AuditEvidenceMedia[] {
    const fromLookup = collectAuditEvidenceMedia(clauseFiles, genericFiles, clauseId);
    const direct = genericFiles[`clause_checklist_${clauseId}`] || [];
    const merged = [...fromLookup];
    for (const file of direct) {
        if (!merged.some((item) => item.data === file.data)) {
            merged.push(file);
        }
    }
    return merged;
}

export function buildChecklistEvidenceSegments(
    auditData: Record<string, unknown>,
    templateContent: ChecklistContent[] | undefined,
    clauseFiles: Record<string, AuditEvidenceMedia[]>,
    genericFiles: Record<string, AuditEvidenceMedia[]>,
): ClauseEvidenceSegment[] {
    const checklistData = auditData.checklistData as Record<string, { findings?: string }> | undefined;
    const editable = auditData.editableChecklist as ChecklistContent[] | undefined;
    const contentList =
        editable?.length ? editable : templateContent || [];

    if (!contentList.length) return [];

    const segments: ClauseEvidenceSegment[] = [];
    const deferredBuckets: Record<string, ReportEvidenceSource[]> = {};

    const flushDeferred = (parent: string) => {
        const sources = deferredBuckets[parent];
        if (!sources?.length) return;
        segments.push({
            clauseLabel: `Clause ${parent}`,
            sources: [...sources],
            deferred: true,
        });
        delete deferredBuckets[parent];
    };

    const activeIndices: number[] = [];
    for (let itemIndex = 0; itemIndex < contentList.length; itemIndex++) {
        const item = contentList[itemIndex];
        const clauseKey = item?.clause || String(itemIndex);
        const hasFinding = Boolean(checklistData?.[itemIndex]?.findings);
        const media = collectMediaForChecklistIndex(
            clauseFiles,
            genericFiles,
            clauseKey,
            itemIndex,
        );
        if (hasFinding || media.length > 0) {
            activeIndices.push(itemIndex);
        }
    }

    activeIndices.forEach((itemIndex, position) => {
        const item = contentList[itemIndex];
        if (!item) return;
        const clauseKey = item.clause || String(itemIndex);
        const media = collectMediaForChecklistIndex(
            clauseFiles,
            genericFiles,
            clauseKey,
            itemIndex,
        );
        const sources = mediaToReportSources(media, `Clause ${clauseKey}`);
        if (!sources.length) return;

        const parent = deferredEvidenceParentClause(clauseKey);
        const nextIndex = activeIndices[position + 1];
        const nextClause = nextIndex !== undefined ? contentList[nextIndex]?.clause || "" : "";
        const nextParent = deferredEvidenceParentClause(nextClause);

        if (parent) {
            mergeEvidenceSources((deferredBuckets[parent] ||= []), sources);
            if (nextParent !== parent) {
                flushDeferred(parent);
            }
        } else {
            segments.push({
                clauseLabel: `Clause ${clauseKey}`,
                sources,
            });
        }
    });

    Object.keys(deferredBuckets).forEach((parent) => flushDeferred(parent));
    return segments;
}

export function buildClauseChecklistEvidenceSegments(
    auditData: Record<string, unknown>,
    templateContent: ClauseChecklistContent[] | undefined,
    clauseFiles: Record<string, AuditEvidenceMedia[]>,
    genericFiles: Record<string, AuditEvidenceMedia[]>,
): ClauseEvidenceSegment[] {
    const clauseData = auditData.clauseData as Record<string, { findingType?: string }> | undefined;
    if (!templateContent?.length) return [];

    const segments: ClauseEvidenceSegment[] = [];
    for (const item of templateContent) {
        const hasFinding = Boolean(clauseData?.[item.clauseId]?.findingType);
        const media = collectMediaForClauseId(clauseFiles, genericFiles, item.clauseId);
        if (!hasFinding && media.length === 0) continue;
        const sources = mediaToReportSources(media, `Clause ${item.clauseId}`);
        if (sources.length > 0) {
            segments.push({
                clauseLabel: `Clause ${item.clauseId}`,
                sources,
            });
        }
    }
    return segments;
}

export function buildProcessAuditEvidenceSegments(
    auditData: Record<string, unknown>,
    genericFiles: Record<string, AuditEvidenceMedia[]>,
): ClauseEvidenceSegment[] {
    const processAudits = auditData.processAudits as ProcessAuditContent[] | undefined;
    if (!processAudits?.length) return [];

    const segments: ClauseEvidenceSegment[] = [];
    processAudits.forEach((audit, index) => {
        const media = genericFiles[`process_audit_${index}`] || [];
        if (!audit.findingType && media.length === 0) return;
        const sources = mediaToReportSources(
            media,
            `Process audit ${index + 1}${audit.processArea ? ` — ${audit.processArea}` : ""}`,
        );
        if (sources.length > 0) {
            segments.push({
                clauseLabel: `Process ${index + 1}${audit.processArea ? `: ${audit.processArea}` : ""}`,
                sources,
            });
        }
    });
    return segments;
}

export function collectShownEvidenceSignatures(
    segments: ClauseEvidenceSegment[],
): Set<string> {
    const sigs = new Set<string>();
    for (const segment of segments) {
        for (const source of segment.sources) {
            sigs.add(`${source.context}::${source.name}::${source.data.slice(0, 40)}`);
        }
    }
    return sigs;
}

export function filterUnshownEvidenceSources(
    allSources: ReportEvidenceSource[],
    shown: Set<string>,
): ReportEvidenceSource[] {
    return allSources.filter((source) => {
        const sig = `${source.context}::${source.name}::${source.data.slice(0, 40)}`;
        return !shown.has(sig);
    });
}
