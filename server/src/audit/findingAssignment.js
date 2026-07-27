/**
 * Persist assign-to email/name onto a finding row inside AuditPlan.auditData.
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

    if (source === 'clause' && key != null && String(key).trim()) {
        const clauseKey = String(key);
        data.clauseData = { ...(data.clauseData || {}) };
        data.clauseData[clauseKey] = { ...(data.clauseData[clauseKey] || {}), ...patch };
    } else if (source === 'checklist' && key != null && String(key).trim() !== '') {
        const checklistKey = String(key);
        data.checklistData = { ...(data.checklistData || {}) };
        data.checklistData[checklistKey] = {
            ...(data.checklistData[checklistKey] || {}),
            ...patch,
        };
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
 * Parse client finding id (e.g. checklist-12-3) into an assignment locator.
 */
export function assignmentFromFindingId(findingId, planId) {
    const targetId = String(findingId || '').trim();
    const pid = Number(planId);
    if (!targetId || !Number.isInteger(pid) || pid < 1) return null;

    const checklistMatch = targetId.match(new RegExp(`^checklist-${pid}-(.+)$`));
    if (checklistMatch) {
        return { source: 'checklist', key: checklistMatch[1] };
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
