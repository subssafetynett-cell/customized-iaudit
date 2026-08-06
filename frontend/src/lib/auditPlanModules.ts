import {
    findAuditTemplate,
    findAuditTemplates,
    getAuditPlanTemplateLabel,
    parseAuditPlanTemplateIds,
    resolveAuditTemplateId,
    type AuditTemplate,
} from "@/data/auditTemplates";
import { isQfsKoreSectionHeader } from "@/lib/qfsKoreChecklistUi";
import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import {
    countFindingsReportFormAnswers,
    mergeFindingsReportFormPreferRicher,
    pickRichestFindingsReportForm,
} from "@/lib/findingsReportForm";

/** True when the audit plan has more than one assigned checklist/module. */
export function planHasMultipleModules(templateId?: string | null): boolean {
    return parseAuditPlanTemplateIds(templateId).length > 1;
}

/** Templates assigned to a plan (resolved, de-duplicated). */
export function getPlanModuleOptions(templateId?: string | null): AuditTemplate[] {
    return findAuditTemplates(templateId);
}

/** Evidence key for a checklist row — always namespaced by module when moduleId is known. */
export function checklistEvidenceStorageKey(
    moduleId: string | null | undefined,
    index: number | string,
): string {
    const mid = String(moduleId || "").trim();
    if (mid) return `clause_checklist_${mid}__${index}`;
    return `clause_checklist_${index}`;
}

export function sectionEvidenceStorageKey(
    moduleId: string | null | undefined,
    index: number | string,
): string {
    const mid = String(moduleId || "").trim();
    if (mid) return `section_${mid}__${index}`;
    return `section_${index}`;
}

/**
 * Parse checklist evidence keys.
 * Prefers module-scoped `clause_checklist_<moduleId>__<index>`; also accepts legacy `clause_checklist_<index>`.
 */
export function parseChecklistEvidenceStorageKey(
    key: string,
): { moduleId: string | null; index: number } | null {
    const scoped = /^clause_checklist_(.+)__(\d+)$/.exec(key);
    if (scoped) {
        return { moduleId: scoped[1], index: Number(scoped[2]) };
    }
    const legacy = /^clause_checklist_(\d+)$/.exec(key);
    if (legacy) {
        return { moduleId: null, index: Number(legacy[1]) };
    }
    return null;
}

export function parseSectionEvidenceStorageKey(
    key: string,
): { moduleId: string | null; index: number } | null {
    const scoped = /^section_(.+)__(\d+)$/.exec(key);
    if (scoped) {
        return { moduleId: scoped[1], index: Number(scoped[2]) };
    }
    const legacy = /^section_(\d+)$/.exec(key);
    if (legacy) {
        return { moduleId: null, index: Number(legacy[1]) };
    }
    return null;
}

/** Keep only evidence entries that belong to this module.
 * @param opts.includeLegacyUnscoped — when true, also claim unscoped
 *   `clause_checklist_N` / `section_N` keys (migration / last-active owner only).
 *   Default false so multi-module checklists never inherit another module's files.
 */
export function filterEvidenceMapForModule(
    files: Record<string, AuditEvidenceMedia[]> | null | undefined,
    moduleId: string,
    opts?: { includeLegacyUnscoped?: boolean },
): Record<string, AuditEvidenceMedia[]> {
    if (!files || typeof files !== "object") return {};
    const mid = String(moduleId || "").trim();
    const includeLegacy = Boolean(opts?.includeLegacyUnscoped);
    const out: Record<string, AuditEvidenceMedia[]> = {};
    for (const [key, list] of Object.entries(files)) {
        if (!Array.isArray(list) || list.length === 0) continue;
        const checklist = parseChecklistEvidenceStorageKey(key);
        if (checklist) {
            const isLegacy = checklist.moduleId == null;
            if (checklist.moduleId === mid || (includeLegacy && isLegacy)) {
                const nextKey =
                    isLegacy
                        ? checklistEvidenceStorageKey(mid, checklist.index)
                        : key;
                out[nextKey] = list;
            }
            continue;
        }
        const section = parseSectionEvidenceStorageKey(key);
        if (section) {
            const isLegacy = section.moduleId == null;
            if (section.moduleId === mid || (includeLegacy && isLegacy)) {
                const nextKey =
                    isLegacy
                        ? sectionEvidenceStorageKey(mid, section.index)
                        : key;
                out[nextKey] = list;
            }
            continue;
        }
        // Non-checklist keys (process_audit_*, etc.) stay global — copy as-is only when single-module callers pass through.
    }
    return out;
}

/** Strip module-scoped prefix so UI can still use local index keys while editing one module. */
export function toActiveModuleLocalEvidenceMap(
    files: Record<string, AuditEvidenceMedia[]> | null | undefined,
    moduleId: string,
    opts?: { includeLegacyUnscoped?: boolean },
): Record<string, AuditEvidenceMedia[]> {
    const filtered = filterEvidenceMapForModule(files, moduleId, opts);
    const mid = String(moduleId || "").trim();
    const includeLegacy = Boolean(opts?.includeLegacyUnscoped);
    const out: Record<string, AuditEvidenceMedia[]> = {};
    for (const [key, list] of Object.entries(filtered)) {
        const checklist = parseChecklistEvidenceStorageKey(key);
        if (
            checklist &&
            (checklist.moduleId === mid || (includeLegacy && checklist.moduleId == null))
        ) {
            out[`clause_checklist_${checklist.index}`] = list;
            continue;
        }
        const section = parseSectionEvidenceStorageKey(key);
        if (
            section &&
            (section.moduleId === mid || (includeLegacy && section.moduleId == null))
        ) {
            out[`section_${section.index}`] = list;
            continue;
        }
        out[key] = list;
    }
    return out;
}

/** Expand local index keys to module-scoped keys for persistence. */
export function toModuleScopedEvidenceMap(
    files: Record<string, AuditEvidenceMedia[]> | null | undefined,
    moduleId: string,
): Record<string, AuditEvidenceMedia[]> {
    if (!files || typeof files !== "object") return {};
    const mid = String(moduleId || "").trim();
    const out: Record<string, AuditEvidenceMedia[]> = {};
    for (const [key, list] of Object.entries(files)) {
        if (!Array.isArray(list) || list.length === 0) continue;
        const checklist = parseChecklistEvidenceStorageKey(key);
        if (checklist) {
            out[checklistEvidenceStorageKey(mid || checklist.moduleId, checklist.index)] = list;
            continue;
        }
        const section = parseSectionEvidenceStorageKey(key);
        if (section) {
            out[sectionEvidenceStorageKey(mid || section.moduleId, section.index)] = list;
            continue;
        }
        out[key] = list;
    }
    return out;
}

function parseAuditDataBlob(raw: unknown): Record<string, unknown> {
    if (raw == null) return {};
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : {};
        } catch {
            return {};
        }
    }
    if (typeof raw === "object" && !Array.isArray(raw)) {
        return { ...(raw as Record<string, unknown>) };
    }
    return {};
}

export type ModuleStoreEntry = {
    checklistData?: Record<string | number, { findings?: string } | null>;
    editableChecklist?: unknown[];
    extraChecklistItems?: unknown;
    sectionData?: Record<string | number, string | null | undefined>;
    /** Module-scoped evidence map (keys may be local or namespaced). */
    genericFiles?: Record<string, AuditEvidenceMedia[]>;
    /** Per-module findings report (includes auditee/auditor signatures). */
    findingsReportForm?: unknown;
    /** Per-module header fields (auditee name, audit done by, dept, etc.). */
    auditGlobalInfo?: Record<string, string>;
};

/** True when a module store entry has checklist / section / NC header answers. */
export function moduleStoreEntryHasAnswers(
    entry: ModuleStoreEntry | null | undefined,
): boolean {
    if (!entry) return false;
    const checklist = entry.checklistData;
    if (checklist && typeof checklist === "object") {
        for (const row of Object.values(checklist)) {
            if (row && typeof row === "object") {
                const findings = (row as { findings?: unknown }).findings;
                if (typeof findings === "string" && findings.trim()) return true;
                const details = (row as { details?: unknown }).details;
                if (typeof details === "string" && details.trim()) return true;
            }
        }
    }
    const sections = entry.sectionData;
    if (sections && typeof sections === "object") {
        if (Object.values(sections).some((v) => String(v ?? "").trim())) return true;
    }
    const info = entry.auditGlobalInfo;
    if (info && typeof info === "object") {
        if (
            ["auditeeName", "auditDoneBy", "auditeeDept"].some(
                (k) => String((info as Record<string, string>)[k] ?? "").trim(),
            )
        ) {
            return true;
        }
    }
    const files = entry.genericFiles;
    if (files && typeof files === "object" && Object.keys(files).length > 0) {
        return true;
    }
    return false;
}

function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.trim().length > 0;
}

// countFindingsReportFormAnswers is imported from findingsReportForm.ts

/** Count answered checklist findings in a module entry (for richer-data comparisons). */
export function countModuleStoreAnswers(
    entry: ModuleStoreEntry | null | undefined,
): number {
    if (!entry || typeof entry !== "object") return 0;
    let n = 0;
    if (entry.checklistData && typeof entry.checklistData === "object") {
        for (const row of Object.values(entry.checklistData)) {
            if (!row || typeof row !== "object") continue;
            const r = row as Record<string, unknown>;
            if (typeof r.findings === "string" && r.findings.trim()) n += 1;
            if (typeof r.details === "string" && r.details.trim()) n += 1;
            for (const k of [
                "ofi",
                "description",
                "correction",
                "rootCause",
                "correctiveAction",
            ] as const) {
                if (typeof r[k] === "string" && r[k].trim()) n += 1;
            }
        }
    }
    if (entry.sectionData && typeof entry.sectionData === "object") {
        for (const v of Object.values(entry.sectionData)) {
            if (String(v ?? "").trim()) n += 1;
        }
    }
    const info = entry.auditGlobalInfo;
    if (info && typeof info === "object") {
        for (const k of ["auditeeName", "auditDoneBy", "auditeeDept"] as const) {
            if (String(info[k] ?? "").trim()) n += 1;
        }
    }
    if (entry.genericFiles && typeof entry.genericFiles === "object") {
        for (const list of Object.values(entry.genericFiles)) {
            if (Array.isArray(list) && list.length > 0) n += 1;
        }
    }
    n += countFindingsReportFormAnswers(entry.findingsReportForm);
    return n;
}

/** Total answered items across a full auditData blob (all modules + top-level). */
export function countAuditDataAnswers(auditData: Record<string, unknown> | null | undefined): number {
    if (!auditData || typeof auditData !== "object") return 0;
    let n = 0;
    const store =
        auditData.moduleDataByTemplateId &&
        typeof auditData.moduleDataByTemplateId === "object"
            ? (auditData.moduleDataByTemplateId as Record<string, ModuleStoreEntry>)
            : {};
    const counted = new Set<string>();
    for (const [key, entry] of Object.entries(store)) {
        const resolved = resolveAuditTemplateId(key) || key;
        if (counted.has(resolved)) continue;
        counted.add(resolved);
        n += countModuleStoreAnswers(entry);
    }
    // Top-level checklist answers (legacy / active blob).
    n += countModuleStoreAnswers({
        checklistData: auditData.checklistData as ModuleStoreEntry["checklistData"],
        sectionData: auditData.sectionData as ModuleStoreEntry["sectionData"],
        auditGlobalInfo: auditData.auditGlobalInfo as ModuleStoreEntry["auditGlobalInfo"],
    });
    const clauseData = auditData.clauseData;
    if (clauseData && typeof clauseData === "object") {
        for (const row of Object.values(clauseData as Record<string, { findingType?: string }>)) {
            if (typeof row?.findingType === "string" && row.findingType.trim()) n += 1;
        }
    }
    return n;
}

/**
 * Merge two full auditData blobs, keeping every module's richest answers.
 * Used to prevent autosave/flush from wiping previously saved checklist work.
 */
export function mergeAuditDataPreferRicher(
    baseline: Record<string, unknown> | null | undefined,
    incoming: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
    if (!baseline || typeof baseline !== "object") return { ...(incoming || {}) };
    if (!incoming || typeof incoming !== "object") return { ...baseline };

    const baseStore =
        baseline.moduleDataByTemplateId &&
        typeof baseline.moduleDataByTemplateId === "object"
            ? (baseline.moduleDataByTemplateId as Record<string, ModuleStoreEntry>)
            : {};
    const inStore =
        incoming.moduleDataByTemplateId &&
        typeof incoming.moduleDataByTemplateId === "object"
            ? (incoming.moduleDataByTemplateId as Record<string, ModuleStoreEntry>)
            : {};

    const mergedStore: Record<string, ModuleStoreEntry> = { ...baseStore };
    for (const [key, entry] of Object.entries(inStore)) {
        const existing = lookupModuleStoreEntry(mergedStore, key);
        const resolved = resolveAuditTemplateId(key) || key;
        // Incoming module snapshot is authoritative for answer fields so one
        // checklist cannot keep leaking "richer" answers into another template id.
        const merged = mergeModuleStoreEntries(existing, entry);
        mergedStore[resolved] = {
            ...merged,
            checklistData:
                entry.checklistData !== undefined
                    ? entry.checklistData
                    : merged.checklistData,
            sectionData:
                entry.sectionData !== undefined
                    ? entry.sectionData
                    : merged.sectionData,
            extraChecklistItems:
                entry.extraChecklistItems !== undefined
                    ? entry.extraChecklistItems
                    : merged.extraChecklistItems,
            auditGlobalInfo:
                entry.auditGlobalInfo !== undefined
                    ? entry.auditGlobalInfo
                    : merged.auditGlobalInfo,
            genericFiles:
                entry.genericFiles !== undefined
                    ? entry.genericFiles
                    : merged.genericFiles,
            editableChecklist:
                entry.editableChecklist !== undefined
                    ? entry.editableChecklist
                    : merged.editableChecklist,
        };
        if (key !== resolved && mergedStore[key]) {
            mergedStore[key] = mergedStore[resolved];
        }
    }

    const incomingTop = countModuleStoreAnswers({
        checklistData: incoming.checklistData as ModuleStoreEntry["checklistData"],
        sectionData: incoming.sectionData as ModuleStoreEntry["sectionData"],
        auditGlobalInfo: incoming.auditGlobalInfo as ModuleStoreEntry["auditGlobalInfo"],
    });
    const baselineTop = countModuleStoreAnswers({
        checklistData: baseline.checklistData as ModuleStoreEntry["checklistData"],
        sectionData: baseline.sectionData as ModuleStoreEntry["sectionData"],
        auditGlobalInfo: baseline.auditGlobalInfo as ModuleStoreEntry["auditGlobalInfo"],
    });

    // Top-level checklist/section mirrors the *active* module only.
    // When activeModuleId changes, always take incoming top-level — never keep a
    // richer previous module's answers just because they have a higher count.
    const incomingActive =
        typeof incoming.activeModuleId === "string"
            ? resolveAuditTemplateId(incoming.activeModuleId) ||
              String(incoming.activeModuleId).trim()
            : "";
    const baselineActive =
        typeof baseline.activeModuleId === "string"
            ? resolveAuditTemplateId(baseline.activeModuleId) ||
              String(baseline.activeModuleId).trim()
            : "";
    const activeModuleChanged =
        Boolean(incomingActive) &&
        Boolean(baselineActive) &&
        incomingActive !== baselineActive;
    // On ties (same active module), keep baseline to avoid overwriting filled data with emptier objects.
    const useIncomingTop = activeModuleChanged || incomingTop > baselineTop;

    const mergeEvidenceMapsPreferNonEmpty = (
        a: Record<string, AuditEvidenceMedia[]> | undefined,
        b: Record<string, AuditEvidenceMedia[]> | undefined,
    ): Record<string, AuditEvidenceMedia[]> => {
        const out: Record<string, AuditEvidenceMedia[]> = {
            ...(a || {}),
        };
        if (!b || typeof b !== "object") return out;
        for (const [key, list] of Object.entries(b)) {
            if (Array.isArray(list) && list.length > 0) {
                out[key] = list;
            }
        }
        return out;
    };

    const mergeStringMapPreferNonEmpty = (
        a: Record<string, string> | undefined,
        b: Record<string, string> | undefined,
    ): Record<string, string> => {
        const out: Record<string, string> = { ...(a || {}) };
        if (!b || typeof b !== "object") return out;
        for (const [key, val] of Object.entries(b)) {
            if (isNonEmptyString(val)) out[key] = val;
        }
        return out;
    };

    const chosenFindingsReportForm = mergeFindingsReportFormPreferRicher(
        baseline.findingsReportForm,
        incoming.findingsReportForm,
    );

    // When switching active module, replace header fields absolutely (mirror of active module).
    const chosenAuditGlobalInfo = activeModuleChanged
        ? (incoming.auditGlobalInfo as Record<string, string> | undefined) ??
          ({} as Record<string, string>)
        : mergeStringMapPreferNonEmpty(
              baseline.auditGlobalInfo as Record<string, string> | undefined,
              incoming.auditGlobalInfo as Record<string, string> | undefined,
          );

    return {
        ...baseline,
        ...incoming,
        checklistData: useIncomingTop
            ? incoming.checklistData ?? (activeModuleChanged ? {} : baseline.checklistData)
            : baseline.checklistData ?? incoming.checklistData,
        sectionData: useIncomingTop
            ? incoming.sectionData ?? (activeModuleChanged ? {} : baseline.sectionData)
            : baseline.sectionData ?? incoming.sectionData,
        auditGlobalInfo: chosenAuditGlobalInfo,
        editableChecklist:
            Array.isArray(incoming.editableChecklist) &&
            (incoming.editableChecklist as unknown[]).length > 0
                ? incoming.editableChecklist
                : activeModuleChanged
                  ? incoming.editableChecklist ?? []
                  : baseline.editableChecklist ?? incoming.editableChecklist,
        findingsReportForm: chosenFindingsReportForm,
        clauseData: incoming.clauseData ?? baseline.clauseData,
        genericFiles: mergeEvidenceMapsPreferNonEmpty(
            baseline.genericFiles as Record<string, AuditEvidenceMedia[]> | undefined,
            incoming.genericFiles as Record<string, AuditEvidenceMedia[]> | undefined,
        ),
        clauseFiles: mergeEvidenceMapsPreferNonEmpty(
            baseline.clauseFiles as Record<string, AuditEvidenceMedia[]> | undefined,
            incoming.clauseFiles as Record<string, AuditEvidenceMedia[]> | undefined,
        ),
        moduleDataByTemplateId: mergedStore,
        activeModuleId: incoming.activeModuleId ?? baseline.activeModuleId,
    };
}

/**
 * Find a module's store entry even when keys used aliases vs canonical ids.
 */
export function lookupModuleStoreEntry(
    store: Record<string, ModuleStoreEntry> | null | undefined,
    moduleId: string,
): ModuleStoreEntry | null {
    if (!store || !moduleId) return null;
    if (store[moduleId]) return store[moduleId];
    const resolved = resolveAuditTemplateId(moduleId) || moduleId;
    if (store[resolved]) return store[resolved];
    for (const [key, entry] of Object.entries(store)) {
        if ((resolveAuditTemplateId(key) || key) === resolved) return entry;
    }
    return null;
}

/** Prefer non-empty fields when merging two module snapshots (never wipe answers with {}). */
export function mergeModuleStoreEntries(
    existing: ModuleStoreEntry | null | undefined,
    incoming: ModuleStoreEntry | null | undefined,
): ModuleStoreEntry {
    if (!existing) return { ...(incoming || {}) };
    if (!incoming) return { ...existing };
    const existingCount = countModuleStoreAnswers(existing);
    const incomingCount = countModuleStoreAnswers(incoming);
    const checklistData =
        incomingCount > existingCount
            ? incoming.checklistData ?? existing.checklistData
            : existing.checklistData ?? incoming.checklistData;

    const mergeEvidenceMapsPreferNonEmpty = (
        a: Record<string, AuditEvidenceMedia[]> | undefined,
        b: Record<string, AuditEvidenceMedia[]> | undefined,
    ): Record<string, AuditEvidenceMedia[]> => {
        const out: Record<string, AuditEvidenceMedia[]> = { ...(a || {}) };
        if (!b || typeof b !== "object") return out;
        for (const [key, list] of Object.entries(b)) {
            if (Array.isArray(list) && list.length > 0) out[key] = list;
        }
        return out;
    };

    const mergeStringMapPreferNonEmpty = (
        a: Record<string, string> | undefined,
        b: Record<string, string> | undefined,
    ): Record<string, string> => {
        const out: Record<string, string> = { ...(a || {}) };
        if (!b || typeof b !== "object") return out;
        for (const [key, val] of Object.entries(b)) {
            if (isNonEmptyString(val)) out[key] = val;
        }
        return out;
    };

    const chosenFindingsReportForm = mergeFindingsReportFormPreferRicher(
        existing.findingsReportForm,
        incoming.findingsReportForm,
    );

    const mergeSectionDataPreferNonEmpty = (
        a: Record<string | number, string | null | undefined> | undefined,
        b: Record<string | number, string | null | undefined> | undefined,
    ): Record<string | number, string | null | undefined> | undefined => {
        const out: Record<string | number, string | null | undefined> = { ...(a || {}) };
        if (!b || typeof b !== "object") return out;
        for (const [key, val] of Object.entries(b)) {
            if (isNonEmptyString(val)) {
                out[key] = val;
            }
        }
        return out;
    };

    const mergedSectionData = mergeSectionDataPreferNonEmpty(
        existing.sectionData,
        incoming.sectionData,
    );

    return {
        checklistData,
        editableChecklist:
            (Array.isArray(incoming.editableChecklist) &&
            incoming.editableChecklist.length > 0
                ? incoming.editableChecklist
                : existing.editableChecklist) ?? incoming.editableChecklist,
        extraChecklistItems:
            incoming.extraChecklistItems ?? existing.extraChecklistItems,
        sectionData: mergedSectionData ?? existing.sectionData ?? incoming.sectionData,
        genericFiles: mergeEvidenceMapsPreferNonEmpty(existing.genericFiles, incoming.genericFiles),
        findingsReportForm: chosenFindingsReportForm,
        auditGlobalInfo: mergeStringMapPreferNonEmpty(
            existing.auditGlobalInfo as Record<string, string> | undefined,
            incoming.auditGlobalInfo as Record<string, string> | undefined,
        ),
    };
}

/** Build a per-module store entry from top-level auditData fields. */
export function moduleStoreEntryFromTopLevel(
    auditData: Record<string, unknown>,
    moduleId: string,
): ModuleStoreEntry {
    const mid = String(moduleId || "").trim();
    const topFiles = auditData.genericFiles as
        | Record<string, AuditEvidenceMedia[]>
        | undefined;
    return {
        checklistData: auditData.checklistData as ModuleStoreEntry["checklistData"],
        editableChecklist: auditData.editableChecklist as unknown[],
        extraChecklistItems: auditData.extraChecklistItems,
        sectionData: auditData.sectionData as ModuleStoreEntry["sectionData"],
        genericFiles: mid
            ? toActiveModuleLocalEvidenceMap(
                  filterEvidenceMapForModule(topFiles, mid, {
                      includeLegacyUnscoped: true,
                  }),
                  mid,
                  { includeLegacyUnscoped: true },
              )
            : (topFiles as ModuleStoreEntry["genericFiles"]),
        findingsReportForm: auditData.findingsReportForm,
        auditGlobalInfo: auditData.auditGlobalInfo as Record<string, string> | undefined,
    };
}

/**
 * Ensure top-level answers (legacy / last-active blob) are copied into
 * moduleDataByTemplateId under activeModuleId so switching modules cannot wipe them.
 */
export function ensureModuleStorePreservesTopLevel(
    auditData: Record<string, unknown>,
    planTemplateIds: string[],
): Record<string, ModuleStoreEntry> {
    const storeRaw =
        auditData.moduleDataByTemplateId &&
        typeof auditData.moduleDataByTemplateId === "object"
            ? (auditData.moduleDataByTemplateId as Record<string, ModuleStoreEntry>)
            : {};
    const store: Record<string, ModuleStoreEntry> = { ...storeRaw };
    const multiModule = planTemplateIds.length > 1;
    if (!multiModule) return store;

    const previousActive =
        typeof auditData.activeModuleId === "string"
            ? auditData.activeModuleId.trim()
            : "";
    const previousResolved =
        (previousActive && (resolveAuditTemplateId(previousActive) || previousActive)) ||
        "";
    const ownerId =
        (previousResolved && planTemplateIds.includes(previousResolved)
            ? previousResolved
            : previousActive && planTemplateIds.includes(previousActive)
              ? previousActive
              : "") || "";

    const hasTopLevelBlob = Boolean(
        auditData.checklistData ||
            auditData.editableChecklist ||
            auditData.sectionData ||
            auditData.extraChecklistItems ||
            auditData.findingsReportForm ||
            auditData.auditGlobalInfo ||
            (auditData.genericFiles &&
                typeof auditData.genericFiles === "object" &&
                Object.keys(auditData.genericFiles as object).length > 0),
    );

    if (ownerId && hasTopLevelBlob) {
        const existing = store[ownerId];
        const existingEmpty =
            !existing ||
            (!existing.checklistData &&
                !existing.findingsReportForm &&
                !existing.auditGlobalInfo &&
                !existing.genericFiles &&
                !existing.sectionData);
        if (existingEmpty) {
            store[ownerId] = moduleStoreEntryFromTopLevel(auditData, ownerId);
        } else {
            // Fill gaps only — never wipe richer per-module data with empty top-level.
            store[ownerId] = {
                checklistData: existing.checklistData ?? (auditData.checklistData as ModuleStoreEntry["checklistData"]),
                editableChecklist:
                    existing.editableChecklist ??
                    (auditData.editableChecklist as unknown[]),
                extraChecklistItems:
                    existing.extraChecklistItems ?? auditData.extraChecklistItems,
                sectionData:
                    existing.sectionData ??
                    (auditData.sectionData as ModuleStoreEntry["sectionData"]),
                genericFiles:
                    existing.genericFiles ??
                    moduleStoreEntryFromTopLevel(auditData, ownerId).genericFiles,
                findingsReportForm:
                    existing.findingsReportForm ?? auditData.findingsReportForm,
                auditGlobalInfo:
                    existing.auditGlobalInfo ??
                    (auditData.auditGlobalInfo as Record<string, string> | undefined),
            };
        }
    }

    return store;
}

function getModuleStoreEntry(
    auditData: Record<string, unknown>,
    moduleId: string,
    multiModule: boolean,
): ModuleStoreEntry | null {
    const store =
        auditData.moduleDataByTemplateId &&
        typeof auditData.moduleDataByTemplateId === "object"
            ? (auditData.moduleDataByTemplateId as Record<string, ModuleStoreEntry>)
            : null;
    const fromStore = lookupModuleStoreEntry(store, moduleId);
    if (fromStore) return fromStore;
    const resolved = resolveAuditTemplateId(moduleId) || moduleId;
    const activeResolved =
        resolveAuditTemplateId(
            typeof auditData.activeModuleId === "string"
                ? auditData.activeModuleId
                : "",
        ) ||
        (typeof auditData.activeModuleId === "string"
            ? auditData.activeModuleId
            : "");
    // Legacy single-active blob: treat top-level answers as this module's data.
    if (activeResolved && activeResolved === resolved) {
        return {
            checklistData: auditData.checklistData as ModuleStoreEntry["checklistData"],
            editableChecklist: auditData.editableChecklist as unknown[],
            sectionData: auditData.sectionData as ModuleStoreEntry["sectionData"],
            genericFiles: auditData.genericFiles as ModuleStoreEntry["genericFiles"],
            extraChecklistItems: auditData.extraChecklistItems,
            findingsReportForm: auditData.findingsReportForm,
            auditGlobalInfo: auditData.auditGlobalInfo as Record<string, string> | undefined,
        };
    }
    if (store || multiModule) return null;
    // Single-module plans (or first load) may only have top-level checklistData.
    return {
        checklistData: auditData.checklistData as ModuleStoreEntry["checklistData"],
        editableChecklist: auditData.editableChecklist as unknown[],
        sectionData: auditData.sectionData as ModuleStoreEntry["sectionData"],
        genericFiles: auditData.genericFiles as ModuleStoreEntry["genericFiles"],
        extraChecklistItems: auditData.extraChecklistItems,
        findingsReportForm: auditData.findingsReportForm,
        auditGlobalInfo: auditData.auditGlobalInfo as Record<string, string> | undefined,
    };
}

/**
 * Completion % for one checklist module on a multi-module (or single) audit plan.
 * Based on answered findings / total assessable checklist rows.
 */
export function getModuleChecklistProgress(
    plan: { templateId?: string | null; auditData?: unknown } | null | undefined,
    moduleId: string,
): { percent: number; completed: number; total: number } {
    const template = findAuditTemplate(moduleId);
    if (!template) return { percent: 0, completed: 0, total: 0 };

    const auditData = parseAuditDataBlob(plan?.auditData);
    const multiModule = parseAuditPlanTemplateIds(plan?.templateId).length > 1;
    const mod = getModuleStoreEntry(auditData, moduleId, multiModule);
    const checklistData = (mod?.checklistData || {}) as Record<
        string | number,
        { findings?: string } | null | undefined
    >;
    const sectionData = (mod?.sectionData || {}) as Record<
        string | number,
        string | null | undefined
    >;

    if (template.type === "checklist" && Array.isArray(template.content)) {
        const activeIndexes: number[] = [];
        template.content.forEach((item: { clause?: string }, index: number) => {
            if (isQfsKoreSectionHeader(item?.clause)) return;
            activeIndexes.push(index);
        });
        const total = activeIndexes.length;
        const completed = activeIndexes.filter((index) => {
            const findings = checklistData[index]?.findings;
            return typeof findings === "string" && findings.trim() !== "";
        }).length;
        return {
            total,
            completed,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }

    if (template.type === "section" && Array.isArray(template.content)) {
        const total = template.content.length;
        const completed = Object.keys(sectionData).filter(
            (key) => String(sectionData[key] ?? "").trim() !== "",
        ).length;
        return {
            total,
            completed,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }

    if (template.type === "clause-checklist" && Array.isArray(template.content)) {
        const total = template.content.length;
        const clauseData =
            (auditData.clauseData as Record<string, { findingType?: string }> | undefined) || {};
        const completed = Object.values(clauseData).filter(
            (row) => typeof row?.findingType === "string" && row.findingType.trim() !== "",
        ).length;
        return {
            total,
            completed: Math.min(completed, total),
            percent: total > 0 ? Math.round((Math.min(completed, total) / total) * 100) : 0,
        };
    }

    const ids = parseAuditPlanTemplateIds(plan?.templateId);
    if (ids.length <= 1 || auditData.activeModuleId === moduleId) {
        const progress = Number(auditData.progress ?? 0);
        if (Number.isFinite(progress)) {
            const percent = Math.min(100, Math.max(0, Math.round(progress)));
            return { percent, completed: 0, total: 0 };
        }
    }

    return { percent: 0, completed: 0, total: 0 };
}

/** Map of moduleId → completion percent for picker UI. */
export function getPlanModulesProgressMap(
    plan: { templateId?: string | null; auditData?: unknown } | null | undefined,
): Record<string, number> {
    const modules = getPlanModuleOptions(plan?.templateId);
    const out: Record<string, number> = {};
    for (const mod of modules) {
        out[mod.id] = getModuleChecklistProgress(plan, mod.id).percent;
    }
    return out;
}

/**
 * Aggregate checklist progress across every selected module on the plan.
 * Used for lifecycle status: Planned (all 0%), Completed (all 100%), else In Progress.
 */
export function getPlanOverallChecklistProgress(
    plan: { templateId?: string | null; auditData?: unknown } | null | undefined,
): { percent: number; completed: number; total: number; byModuleId: Record<string, number> } {
    const modules = getPlanModuleOptions(plan?.templateId);
    const byModuleId: Record<string, number> = {};
    let completed = 0;
    let total = 0;

    for (const mod of modules) {
        const p = getModuleChecklistProgress(plan, mod.id);
        byModuleId[mod.id] = p.percent;
        completed += p.completed;
        total += p.total;
    }

    if (total > 0) {
        return {
            completed,
            total,
            percent: Math.min(100, Math.max(0, Math.round((completed / total) * 100))),
            byModuleId,
        };
    }

    // Fallback when totals are unknown: average of per-module percents.
    const vals = Object.values(byModuleId);
    if (vals.length === 0) {
        return { percent: 0, completed: 0, total: 0, byModuleId };
    }
    const percent = Math.min(
        100,
        Math.max(0, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)),
    );
    return { percent, completed: 0, total: 0, byModuleId };
}

/**
 * Lifecycle from selected-module percents:
 * - all 0% → Planned
 * - all 100% → Completed
 * - otherwise → In Progress
 */
export function lifecycleFromModulePercents(
    percents: number[],
): "Planned" | "In Progress" | "Completed" {
    if (percents.length === 0) return "Planned";
    const clamped = percents.map((p) => {
        const n = Number(p);
        if (!Number.isFinite(n)) return 0;
        return Math.min(100, Math.max(0, Math.round(n)));
    });
    if (clamped.every((p) => p <= 0)) return "Planned";
    if (clamped.every((p) => p >= 100)) return "Completed";
    return "In Progress";
}

/**
 * Scope a multi-module plan to a single checklist for Perform Audit / report download.
 * Pulls that module's answers from moduleDataByTemplateId when present.
 */
export function scopePlanToModule(
    plan: Record<string, any>,
    moduleId: string,
): Record<string, any> {
    const ids = parseAuditPlanTemplateIds(plan?.templateId);
    const resolvedId =
        ids.find((id) => id === moduleId) ||
        findAuditTemplate(moduleId)?.id ||
        moduleId;
    const template = findAuditTemplate(resolvedId);
    const label = template
        ? getAuditPlanTemplateLabel(template)
        : resolvedId;

    const auditData = parseAuditDataBlob(plan?.auditData);
    const multiModule = ids.length > 1;
    const store = ensureModuleStorePreservesTopLevel(auditData, ids);
    const mod =
        store[resolvedId] ||
        store[moduleId] ||
        getModuleStoreEntry(
            { ...auditData, moduleDataByTemplateId: store },
            resolvedId,
            multiModule,
        );

    const moduleGenericFiles =
        (mod?.genericFiles as Record<string, AuditEvidenceMedia[]> | undefined) ||
        (auditData.activeModuleId === resolvedId || !multiModule
            ? (auditData.genericFiles as Record<string, AuditEvidenceMedia[]> | undefined)
            : undefined);
    const topFiles = (auditData.genericFiles || {}) as Record<string, AuditEvidenceMedia[]>;
    const sharedFiles = Object.fromEntries(
        Object.entries(topFiles).filter(
            ([key]) =>
                !key.startsWith("clause_checklist_") && !key.startsWith("section_"),
        ),
    ) as Record<string, AuditEvidenceMedia[]>;
    const localGenericFiles = {
        ...sharedFiles,
        ...toActiveModuleLocalEvidenceMap(
            moduleGenericFiles ||
                filterEvidenceMapForModule(topFiles, resolvedId, {
                    includeLegacyUnscoped:
                        !multiModule ||
                        auditData.activeModuleId === resolvedId ||
                        auditData.activeModuleId === moduleId,
                }),
            resolvedId,
            {
                includeLegacyUnscoped:
                    !multiModule ||
                    auditData.activeModuleId === resolvedId ||
                    auditData.activeModuleId === moduleId,
            },
        ),
    };

    const scopedAuditData: Record<string, unknown> = {
        ...auditData,
        activeModuleId: resolvedId,
        checklistData:
            mod?.checklistData ??
            (auditData.activeModuleId === resolvedId || !multiModule
                ? auditData.checklistData
                : {}),
        editableChecklist:
            mod?.editableChecklist ??
            (auditData.activeModuleId === resolvedId || !multiModule
                ? auditData.editableChecklist
                : template?.content),
        extraChecklistItems:
            mod?.extraChecklistItems ??
            (auditData.activeModuleId === resolvedId || !multiModule
                ? auditData.extraChecklistItems
                : {}),
        sectionData:
            mod?.sectionData ??
            (auditData.activeModuleId === resolvedId || !multiModule
                ? auditData.sectionData
                : {}),
        genericFiles: localGenericFiles,
        findingsReportForm:
            pickRichestFindingsReportForm(auditData) ||
            mod?.findingsReportForm ||
            auditData.findingsReportForm,
        auditGlobalInfo:
            mod?.auditGlobalInfo ??
            (auditData.activeModuleId === resolvedId || !multiModule
                ? auditData.auditGlobalInfo
                : undefined),
        moduleDataByTemplateId: store,
    };

    const baseName = String(plan?.auditName || plan?.auditType || "Audit").trim();
    const alreadyTagged = baseName.includes(label);

    return {
        ...plan,
        templateId: resolvedId,
        auditData: scopedAuditData,
        auditName: alreadyTagged ? baseName : `${baseName} — ${label}`,
    };
}
