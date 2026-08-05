/**
 * Audit lifecycle status derived from checklist answer progress.
 * Distinct from auditData.auditCompleted (findings closed).
 */

export const AUDIT_LIFECYCLE = Object.freeze({
    PLANNED: 'PLANNED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
});

/**
 * @param {{ progress?: unknown, completedItems?: unknown, totalItems?: unknown }} counts
 * @returns {'PLANNED'|'IN_PROGRESS'|'COMPLETED'}
 */
export function deriveAuditLifecycleStatus(counts = {}) {
    const answered = Number(counts.completedItems);
    const total = Number(counts.totalItems);

    if (Number.isFinite(answered) && Number.isFinite(total) && total > 0) {
        if (answered <= 0) return AUDIT_LIFECYCLE.PLANNED;
        if (answered >= total) return AUDIT_LIFECYCLE.COMPLETED;
        return AUDIT_LIFECYCLE.IN_PROGRESS;
    }

    let pct = Number(counts.progress);
    if (!Number.isFinite(pct)) pct = 0;
    pct = Math.min(100, Math.max(0, Math.round(pct)));
    if (pct <= 0) return AUDIT_LIFECYCLE.PLANNED;
    if (pct >= 100) return AUDIT_LIFECYCLE.COMPLETED;
    return AUDIT_LIFECYCLE.IN_PROGRESS;
}

/**
 * Multi-module: every selected checklist percent must be considered.
 * all ≤0 → PLANNED; all ≥100 → COMPLETED; otherwise IN_PROGRESS.
 * @param {unknown} moduleProgressByTemplateId
 * @returns {'PLANNED'|'IN_PROGRESS'|'COMPLETED'|null}
 */
export function lifecycleFromModuleProgressMap(moduleProgressByTemplateId) {
    if (!moduleProgressByTemplateId || typeof moduleProgressByTemplateId !== 'object') {
        return null;
    }
    const vals = Object.values(moduleProgressByTemplateId)
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n))
        .map((n) => Math.min(100, Math.max(0, Math.round(n))));
    if (vals.length === 0) return null;
    if (vals.every((p) => p <= 0)) return AUDIT_LIFECYCLE.PLANNED;
    if (vals.every((p) => p >= 100)) return AUDIT_LIFECYCLE.COMPLETED;
    return AUDIT_LIFECYCLE.IN_PROGRESS;
}

/**
 * True when a checklist/clause row has been answered for lifecycle progress.
 * Counts finding selection (OK/NC/C/…) or comments / evidence text.
 */
function rowHasFindingAnswer(row) {
    if (!row || typeof row !== 'object') return false;
    if (String(row.findings ?? '').trim()) return true;
    if (String(row.findingType ?? '').trim()) return true;
    if (String(row.evidence ?? '').trim()) return true;
    if (String(row.comments ?? '').trim()) return true;
    if (String(row.comment ?? '').trim()) return true;
    return false;
}

/**
 * SQL CASE that derives PLANNED | IN_PROGRESS | COMPLETED from auditData (+ status fallback).
 * Safe for use inside Postgres queries on "AuditPlan".
 * Prefers moduleProgressByTemplateId when present (multi-module plans).
 */
export function lifecycleStatusSqlExpression() {
    return `
      CASE
        WHEN "auditData" IS NULL THEN COALESCE(NULLIF(BTRIM(COALESCE(status, '')), ''), 'PLANNED')
        WHEN jsonb_typeof("auditData"->'moduleProgressByTemplateId') = 'object'
          AND ("auditData"->'moduleProgressByTemplateId') <> '{}'::jsonb THEN
          CASE
            WHEN (
              SELECT bool_and((value)::numeric <= 0)
              FROM jsonb_each_text("auditData"->'moduleProgressByTemplateId')
            ) THEN 'PLANNED'
            WHEN (
              SELECT bool_and((value)::numeric >= 100)
              FROM jsonb_each_text("auditData"->'moduleProgressByTemplateId')
            ) THEN 'COMPLETED'
            ELSE 'IN_PROGRESS'
          END
        WHEN COALESCE(("auditData"->>'totalItems')::numeric, 0) > 0 THEN
          CASE
            WHEN COALESCE(("auditData"->>'completedItems')::numeric, 0) <= 0 THEN 'PLANNED'
            WHEN ("auditData"->>'completedItems')::numeric >= ("auditData"->>'totalItems')::numeric THEN 'COMPLETED'
            ELSE 'IN_PROGRESS'
          END
        WHEN COALESCE(("auditData"->>'progress')::numeric, 0) <= 0 THEN 'PLANNED'
        WHEN COALESCE(("auditData"->>'progress')::numeric, 0) >= 100 THEN 'COMPLETED'
        ELSE 'IN_PROGRESS'
      END
    `;
}

/**
 * Count answered checklist / clause rows from saved auditData (no template required).
 * Prefer client-provided totalItems/completedItems when present.
 */
export function countAnswersFromAuditData(auditData) {
    if (!auditData || typeof auditData !== 'object') {
        return { answered: 0, totalHint: 0 };
    }

    let answered = 0;
    let totalHint = 0;

    const checklist = auditData.checklistData;
    if (checklist && typeof checklist === 'object' && !Array.isArray(checklist)) {
        const values = Object.values(checklist);
        totalHint += values.length;
        for (const row of values) {
            if (rowHasFindingAnswer(row)) answered += 1;
        }
    }

    const clauses = auditData.clauseData;
    if (clauses && typeof clauses === 'object' && !Array.isArray(clauses)) {
        const values = Object.values(clauses);
        totalHint += values.length;
        for (const row of values) {
            if (rowHasFindingAnswer(row)) answered += 1;
        }
    }

    const modules = auditData.moduleDataByTemplateId;
    if (modules && typeof modules === 'object') {
        for (const mod of Object.values(modules)) {
            const modChecklist = mod?.checklistData;
            if (!modChecklist || typeof modChecklist !== 'object') continue;
            const values = Object.values(modChecklist);
            // Prefer module store over top-level duplicate when both exist.
            if (!checklist || Object.keys(checklist).length === 0) {
                totalHint += values.length;
                for (const row of values) {
                    if (rowHasFindingAnswer(row)) answered += 1;
                }
            }
        }
    }

    const sections = auditData.sectionData;
    if (sections && typeof sections === 'object' && !Array.isArray(sections)) {
        const values = Object.values(sections);
        totalHint += values.length;
        for (const row of values) {
            if (typeof row === 'string' && row.trim()) answered += 1;
            else if (row && typeof row === 'object' && String(row.value ?? row.text ?? '').trim()) {
                answered += 1;
            }
        }
    }

    return { answered, totalHint };
}

/**
 * Derive lifecycle status from a saved auditData blob.
 * @param {unknown} auditData
 */
export function lifecycleStatusFromAuditData(auditData) {
    if (auditData == null) return AUDIT_LIFECYCLE.PLANNED;

    let data = auditData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return AUDIT_LIFECYCLE.PLANNED;
        }
    }
    if (!data || typeof data !== 'object') return AUDIT_LIFECYCLE.PLANNED;

    const fromModules = lifecycleFromModuleProgressMap(data.moduleProgressByTemplateId);
    if (fromModules) return fromModules;

    const completedItems = Number(data.completedItems);
    const totalItems = Number(data.totalItems);
    const progress = Number(data.progress);

    if (Number.isFinite(completedItems) && Number.isFinite(totalItems) && totalItems > 0) {
        return deriveAuditLifecycleStatus({ completedItems, totalItems, progress });
    }

    // Fallback: count answered rows; use progress for total when totals omitted.
    const { answered, totalHint } = countAnswersFromAuditData(data);
    if (Number.isFinite(progress) && progress >= 0) {
        if (answered <= 0 && progress <= 0) return AUDIT_LIFECYCLE.PLANNED;
        return deriveAuditLifecycleStatus({
            completedItems: answered,
            totalItems:
                Number.isFinite(totalItems) && totalItems > 0
                    ? totalItems
                    : progress > 0 && answered > 0
                      ? Math.max(answered, Math.round((answered * 100) / Math.max(progress, 1)))
                      : totalHint || answered,
            progress,
        });
    }

    if (answered <= 0) return AUDIT_LIFECYCLE.PLANNED;
    if (totalHint > 0 && answered >= totalHint) return AUDIT_LIFECYCLE.COMPLETED;
    return AUDIT_LIFECYCLE.IN_PROGRESS;
}
