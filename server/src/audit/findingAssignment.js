/**
 * Persist assign-to email/name onto a finding row inside AuditPlan.auditData.
 * Handles top-level checklistData and moduleDataByTemplateId (EOSH / multi-module).
 */
export function applyFindingAssignmentToAuditData(
    auditData,
    assignment,
    assignToEmail,
    assignToName,
    extraPatch = null,
) {
    let data = auditData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            data = {};
        }
    }
    if (!data || typeof data !== 'object') {
        data = {};
    } else {
        data = { ...data };
    }

    const email = String(assignToEmail || '').trim();
    const name = String(assignToName || '').trim();
    const patch = {
        ...(extraPatch && typeof extraPatch === 'object' ? extraPatch : {}),
        assignToEmail: email,
        assignToName: name,
        assignTo: name && email ? `${name} (${email})` : name || email,
    };

    const source = String(assignment?.source || '').trim();
    const key = assignment?.key;
    const templateId =
        assignment?.templateId != null && String(assignment.templateId).trim()
            ? String(assignment.templateId).trim()
            : '';

    if (source === 'clause' && key != null && String(key).trim()) {
        const clauseKey = String(key);
        data.clauseData = { ...(data.clauseData || {}) };
        data.clauseData[clauseKey] = { ...(data.clauseData[clauseKey] || {}), ...patch };
    } else if (source === 'checklist' && key != null && String(key).trim() !== '') {
        const checklistKey = String(key);

        // Keep top-level mirror in sync (legacy / active module).
        data.checklistData = { ...(data.checklistData || {}) };
        data.checklistData[checklistKey] = {
            ...(data.checklistData[checklistKey] || {}),
            ...patch,
        };

        // Module audits store answers under moduleDataByTemplateId[templateId].checklistData.
        let moduleStore = data.moduleDataByTemplateId;
        if (typeof moduleStore === 'string') {
            try {
                moduleStore = JSON.parse(moduleStore);
            } catch {
                moduleStore = null;
            }
        }
        if (moduleStore && typeof moduleStore === 'object') {
            data.moduleDataByTemplateId = { ...moduleStore };
            const targetIds = templateId
                ? [templateId]
                : Object.keys(data.moduleDataByTemplateId);

            for (const tid of targetIds) {
                const mod = data.moduleDataByTemplateId[tid];
                if (!mod || typeof mod !== 'object') {
                    if (templateId && tid === templateId) {
                        data.moduleDataByTemplateId[tid] = {
                            checklistData: { [checklistKey]: { ...patch } },
                        };
                    }
                    continue;
                }
                const prevChecklist =
                    mod.checklistData && typeof mod.checklistData === 'object'
                        ? mod.checklistData
                        : {};
                const hasRow =
                    Object.prototype.hasOwnProperty.call(prevChecklist, checklistKey) ||
                    Object.prototype.hasOwnProperty.call(prevChecklist, Number(checklistKey));
                // Patch when template is explicit, or when this module already has the row.
                if (!templateId && !hasRow) continue;
                const nextChecklist = { ...prevChecklist };
                const existing =
                    (prevChecklist[checklistKey] && typeof prevChecklist[checklistKey] === 'object'
                        ? prevChecklist[checklistKey]
                        : null) ||
                    (prevChecklist[Number(checklistKey)] &&
                    typeof prevChecklist[Number(checklistKey)] === 'object'
                        ? prevChecklist[Number(checklistKey)]
                        : null) ||
                    {};
                nextChecklist[checklistKey] = { ...existing, ...patch };
                data.moduleDataByTemplateId[tid] = {
                    ...mod,
                    checklistData: nextChecklist,
                };
            }
        }
    } else if (source === 'process' && key != null && String(key).trim() !== '') {
        const idx = Number.parseInt(String(key), 10);
        if (!Number.isNaN(idx) && Array.isArray(data.processAudits) && data.processAudits[idx]) {
            data.processAudits = [...data.processAudits];
            data.processAudits[idx] = { ...data.processAudits[idx], ...patch };
        }
    } else if (source === 'extra' && assignment?.clause != null && key != null) {
        const clause = String(assignment.clause);
        const idx = Number.parseInt(String(key), 10);
        data.extraChecklistItems = { ...(data.extraChecklistItems || {}) };
        const items = Array.isArray(data.extraChecklistItems[clause])
            ? [...data.extraChecklistItems[clause]]
            : [];
        if (!Number.isNaN(idx) && items[idx] && typeof items[idx] === 'object') {
            items[idx] = { ...items[idx], ...patch };
            data.extraChecklistItems[clause] = items;
        }
    }

    return data;
}

/**
 * Parse client finding id into an assignment locator.
 * Supports:
 * - checklist-{planId}-{idx}
 * - checklist-{planId}-{templateId}-{idx}
 * - clause-{planId}-{clauseId}
 * - process-{planId}-{idx}
 * - extra-{planId}-{clause}-{idx}
 */
export function assignmentFromFindingId(findingId, planId) {
    const targetId = String(findingId || '').trim();
    const pid = Number(planId);
    if (!targetId || !Number.isInteger(pid) || pid < 1) return null;

    const checklistLegacy = targetId.match(new RegExp(`^checklist-${pid}-(\\d+)$`));
    if (checklistLegacy) {
        return { source: 'checklist', key: checklistLegacy[1] };
    }

    const checklistModular = targetId.match(
        new RegExp(`^checklist-${pid}-(.+)-(\\d+)$`),
    );
    if (checklistModular) {
        return {
            source: 'checklist',
            templateId: checklistModular[1],
            key: checklistModular[2],
        };
    }

    const clauseMatch = targetId.match(new RegExp(`^clause-${pid}-(.+)$`));
    if (clauseMatch) {
        return { source: 'clause', key: clauseMatch[1] };
    }

    const processMatch = targetId.match(new RegExp(`^process-${pid}-(\\d+)$`));
    if (processMatch) {
        return { source: 'process', key: processMatch[1] };
    }

    const extraMatch = targetId.match(new RegExp(`^extra-${pid}-(.+)-(\\d+)$`));
    if (extraMatch) {
        return { source: 'extra', clause: extraMatch[1], key: extraMatch[2] };
    }

    return null;
}
