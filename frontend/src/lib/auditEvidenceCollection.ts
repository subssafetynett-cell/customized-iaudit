import { sanitizeAuditEvidenceMediaMap, type AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import {
    checklistEvidenceStorageKey,
    parseChecklistEvidenceStorageKey,
    parseSectionEvidenceStorageKey,
    sectionEvidenceStorageKey,
    toActiveModuleLocalEvidenceMap,
} from "@/lib/auditPlanModules";

export type AuditEvidenceLookupOptions = {
    checklistIndex?: number;
    processAuditIndex?: number;
    /** When set, only match evidence for this checklist module (multi-module plans). */
    moduleId?: string;
};

function buildEvidenceStorageKeys(
    clauseKey: string,
    options?: AuditEvidenceLookupOptions,
): Set<string> {
    const keys = new Set<string>();
    const bare = clauseKey.replace(/^Clause\s+/i, "").trim();
    keys.add(clauseKey);
    if (bare) {
        keys.add(bare);
        keys.add(`Clause ${bare}`);
        keys.add(`clause_checklist_${bare}`);
    }

    const checklistIndex = options?.checklistIndex;
    const moduleId = options?.moduleId?.trim();
    if (checklistIndex !== undefined && Number.isFinite(checklistIndex)) {
        keys.add(String(checklistIndex));
        keys.add(`clause_checklist_${checklistIndex}`);
        keys.add(`section_${checklistIndex}`);
        if (moduleId) {
            keys.add(checklistEvidenceStorageKey(moduleId, checklistIndex));
            keys.add(sectionEvidenceStorageKey(moduleId, checklistIndex));
        }
    } else if (/^\d+$/.test(String(clauseKey))) {
        const n = Number(clauseKey);
        keys.add(`clause_checklist_${n}`);
        keys.add(`section_${n}`);
        if (moduleId) {
            keys.add(checklistEvidenceStorageKey(moduleId, n));
            keys.add(sectionEvidenceStorageKey(moduleId, n));
        }
    }

    const processAuditIndex = options?.processAuditIndex;
    if (processAuditIndex !== undefined && Number.isFinite(processAuditIndex)) {
        keys.add(`process_audit_${processAuditIndex}`);
    }

    return keys;
}

function matchesEvidenceStorageKey(
    storageKey: string,
    clauseKey: string,
    options?: AuditEvidenceLookupOptions,
): boolean {
    const keys = buildEvidenceStorageKeys(clauseKey, options);
    if (keys.has(storageKey)) return true;

    const moduleId = options?.moduleId?.trim() || null;
    const checklistIndex = options?.checklistIndex;
    if (checklistIndex !== undefined && Number.isFinite(checklistIndex)) {
        const checklist = parseChecklistEvidenceStorageKey(storageKey);
        if (checklist && checklist.index === checklistIndex) {
            if (!moduleId) return checklist.moduleId == null;
            return checklist.moduleId == null || checklist.moduleId === moduleId;
        }
        const section = parseSectionEvidenceStorageKey(storageKey);
        if (section && section.index === checklistIndex) {
            if (!moduleId) return section.moduleId == null;
            return section.moduleId == null || section.moduleId === moduleId;
        }
    }

    const processAuditIndex = options?.processAuditIndex;
    if (
        processAuditIndex !== undefined &&
        Number.isFinite(processAuditIndex) &&
        storageKey === `process_audit_${processAuditIndex}`
    ) {
        return true;
    }

    return false;
}

/**
 * Collect evidence files for a clause/checklist/process row using the same storage-key
 * rules as Audit Findings (clause id, checklist index, section_*, process_audit_*, etc.).
 */
export function collectAuditEvidenceMedia(
    clauseFiles: Record<string, AuditEvidenceMedia[]> | null | undefined,
    genericFiles: Record<string, AuditEvidenceMedia[]> | null | undefined,
    clauseKey: string,
    options?: AuditEvidenceLookupOptions,
): AuditEvidenceMedia[] {
    const media: AuditEvidenceMedia[] = [];
    const seen = new Set<string>();

    for (const list of [clauseFiles, genericFiles]) {
        if (!list || typeof list !== "object") continue;
        for (const [storageKey, files] of Object.entries(list)) {
            if (!matchesEvidenceStorageKey(storageKey, clauseKey, options) || !Array.isArray(files)) {
                continue;
            }
            for (const m of files) {
                if (!m?.data || typeof m.data !== "string") continue;
                const sig = `${m.name}::${m.data.slice(0, 40)}`;
                if (seen.has(sig)) continue;
                seen.add(sig);
                media.push({
                    name: m.name || "file",
                    data: m.data,
                    type: m.type || "",
                    description: m.description,
                });
            }
        }
    }

    return media;
}

function parseMaybeJson<T>(input: unknown): T | null {
    if (input == null) return null;
    if (typeof input === "string") {
        try {
            return JSON.parse(input) as T;
        } catch {
            return null;
        }
    }
    return input as T;
}

/** Collect evidence from raw audit execution payload (handles JSON-string fields). */
export function collectAuditEvidenceFromData(
    data: Record<string, unknown>,
    clauseKey: string,
    options?: AuditEvidenceLookupOptions,
): AuditEvidenceMedia[] {
    const clauseFiles = sanitizeAuditEvidenceMediaMap(
        parseMaybeJson<Record<string, AuditEvidenceMedia[]>>(data.clauseFiles) ?? undefined,
    );
    let genericFiles = sanitizeAuditEvidenceMediaMap(
        parseMaybeJson<Record<string, AuditEvidenceMedia[]>>(data.genericFiles) ?? undefined,
    );

    const moduleId = options?.moduleId?.trim();
    if (moduleId) {
        const storeRaw = parseMaybeJson<Record<string, { genericFiles?: unknown }>>(
            data.moduleDataByTemplateId,
        );
        const modFiles = sanitizeAuditEvidenceMediaMap(
            parseMaybeJson<Record<string, AuditEvidenceMedia[]>>(
                storeRaw?.[moduleId]?.genericFiles,
            ) ?? undefined,
        );
        // Prefer per-module store, then filter top-level to this module only.
        genericFiles = {
            ...toActiveModuleLocalEvidenceMap(genericFiles, moduleId),
            ...toActiveModuleLocalEvidenceMap(modFiles, moduleId),
        };
    }

    return collectAuditEvidenceMedia(clauseFiles, genericFiles, clauseKey, options);
}
