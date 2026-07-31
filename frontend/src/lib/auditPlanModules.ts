import {
    findAuditTemplate,
    findAuditTemplates,
    getAuditPlanTemplateLabel,
    parseAuditPlanTemplateIds,
    type AuditTemplate,
} from "@/data/auditTemplates";

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
