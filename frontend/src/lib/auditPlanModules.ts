import {
    findAuditTemplate,
    findAuditTemplates,
    getAuditPlanTemplateLabel,
    parseAuditPlanTemplateIds,
    type AuditTemplate,
} from "@/data/auditTemplates";
import { isQfsKoreSectionHeader } from "@/lib/qfsKoreChecklistUi";

/** True when the audit plan has more than one assigned checklist/module. */
export function planHasMultipleModules(templateId?: string | null): boolean {
    return parseAuditPlanTemplateIds(templateId).length > 1;
}

/** Templates assigned to a plan (resolved, de-duplicated). */
export function getPlanModuleOptions(templateId?: string | null): AuditTemplate[] {
    return findAuditTemplates(templateId);
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

type ModuleStoreEntry = {
    checklistData?: Record<string | number, { findings?: string } | null>;
    editableChecklist?: unknown[];
    extraChecklistItems?: unknown;
    sectionData?: Record<string | number, string | null | undefined>;
};

function getModuleStoreEntry(
    auditData: Record<string, unknown>,
    moduleId: string,
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
        };
    }
    if (store) return null;
    // Single-module plans (or first load) may only have top-level checklistData.
    return {
        checklistData: auditData.checklistData as ModuleStoreEntry["checklistData"],
        editableChecklist: auditData.editableChecklist as unknown[],
        sectionData: auditData.sectionData as ModuleStoreEntry["sectionData"],
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
    const mod = getModuleStoreEntry(auditData, moduleId);
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
    const store =
        auditData.moduleDataByTemplateId &&
        typeof auditData.moduleDataByTemplateId === "object"
            ? (auditData.moduleDataByTemplateId as Record<
                  string,
                  {
                      checklistData?: unknown;
                      editableChecklist?: unknown;
                      extraChecklistItems?: unknown;
                      sectionData?: unknown;
                  }
              >)
            : {};
    const mod = store[resolvedId] || store[moduleId];

    const scopedAuditData: Record<string, unknown> = {
        ...auditData,
        activeModuleId: resolvedId,
        checklistData:
            mod?.checklistData ??
            (auditData.activeModuleId === resolvedId || ids.length <= 1
                ? auditData.checklistData
                : {}),
        editableChecklist:
            mod?.editableChecklist ??
            (auditData.activeModuleId === resolvedId || ids.length <= 1
                ? auditData.editableChecklist
                : template?.content),
        extraChecklistItems:
            mod?.extraChecklistItems ??
            (auditData.activeModuleId === resolvedId || ids.length <= 1
                ? auditData.extraChecklistItems
                : {}),
        sectionData:
            mod?.sectionData ??
            (auditData.activeModuleId === resolvedId || ids.length <= 1
                ? auditData.sectionData
                : {}),
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
