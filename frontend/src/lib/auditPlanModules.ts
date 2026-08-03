import {
    findAuditTemplate,
    findAuditTemplates,
    getAuditPlanTemplateLabel,
    parseAuditPlanTemplateIds,
    type AuditTemplate,
} from "@/data/auditTemplates";
import { isQfsKoreSectionHeader } from "@/lib/qfsKoreChecklistUi";
import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";

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

/** Keep only evidence entries that belong to this module (or legacy unscoped keys). */
export function filterEvidenceMapForModule(
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
            if (checklist.moduleId === mid || checklist.moduleId == null) {
                // Normalize legacy keys to scoped form when we know the module.
                const nextKey =
                    checklist.moduleId == null
                        ? checklistEvidenceStorageKey(mid, checklist.index)
                        : key;
                out[nextKey] = list;
            }
            continue;
        }
        const section = parseSectionEvidenceStorageKey(key);
        if (section) {
            if (section.moduleId === mid || section.moduleId == null) {
                const nextKey =
                    section.moduleId == null
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
): Record<string, AuditEvidenceMedia[]> {
    const filtered = filterEvidenceMapForModule(files, moduleId);
    const mid = String(moduleId || "").trim();
    const out: Record<string, AuditEvidenceMedia[]> = {};
    for (const [key, list] of Object.entries(filtered)) {
        const checklist = parseChecklistEvidenceStorageKey(key);
        if (checklist && (checklist.moduleId === mid || checklist.moduleId == null)) {
            out[`clause_checklist_${checklist.index}`] = list;
            continue;
        }
        const section = parseSectionEvidenceStorageKey(key);
        if (section && (section.moduleId === mid || section.moduleId == null)) {
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
};

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
                  filterEvidenceMapForModule(topFiles, mid),
                  mid,
              )
            : (topFiles as ModuleStoreEntry["genericFiles"]),
        findingsReportForm: auditData.findingsReportForm,
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
    const ownerId =
        (previousActive && planTemplateIds.includes(previousActive)
            ? previousActive
            : "") || "";

    const hasTopLevelBlob = Boolean(
        auditData.checklistData ||
            auditData.editableChecklist ||
            auditData.sectionData ||
            auditData.extraChecklistItems ||
            auditData.findingsReportForm ||
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
    if (store?.[moduleId]) return store[moduleId];
    // Legacy single-active blob: treat top-level answers as this module's data.
    if (auditData.activeModuleId === moduleId) {
        return {
            checklistData: auditData.checklistData as ModuleStoreEntry["checklistData"],
            editableChecklist: auditData.editableChecklist as unknown[],
            sectionData: auditData.sectionData as ModuleStoreEntry["sectionData"],
            genericFiles: auditData.genericFiles as ModuleStoreEntry["genericFiles"],
            extraChecklistItems: auditData.extraChecklistItems,
            findingsReportForm: auditData.findingsReportForm,
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
                filterEvidenceMapForModule(topFiles, resolvedId),
            resolvedId,
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
            mod?.findingsReportForm ??
            (auditData.activeModuleId === resolvedId || !multiModule
                ? auditData.findingsReportForm
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
