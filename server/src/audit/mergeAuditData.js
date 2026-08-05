/**
 * Prefer-richer merge for auditData blobs so PUT never last-write-wins emptier state.
 * Mirrors frontend mergeAuditDataPreferRicher (simplified, no template-id alias resolve).
 */

function countChecklistRowAnswers(checklistData) {
    if (!checklistData || typeof checklistData !== 'object') return 0;
    let n = 0;
    for (const row of Object.values(checklistData)) {
        if (!row || typeof row !== 'object') continue;
        const findings = row.findings;
        if (typeof findings === 'string' && findings.trim()) n += 1;
        const details = row.details;
        if (typeof details === 'string' && details.trim()) n += 1;
        for (const k of ['ofi', 'description', 'correction', 'rootCause', 'correctiveAction']) {
            if (typeof row[k] === 'string' && row[k].trim()) n += 1;
        }
    }
    return n;
}

function countSectionAnswers(sectionData) {
    if (!sectionData || typeof sectionData !== 'object') return 0;
    let n = 0;
    for (const v of Object.values(sectionData)) {
        if (String(v ?? '').trim()) n += 1;
    }
    return n;
}

function countGlobalInfo(info) {
    if (!info || typeof info !== 'object') return 0;
    let n = 0;
    for (const k of ['auditeeName', 'auditDoneBy', 'auditeeDept']) {
        if (String(info[k] ?? '').trim()) n += 1;
    }
    return n;
}

function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
}

function isMeaningfulFormText(v) {
    if (typeof v !== 'string') return false;
    const t = v.trim();
    return t.length > 0 && t !== '—';
}

// Count only fields users actually enter (avoid defaults like docNumber/reportTitle/revisionNo).
function countFindingsReportFormAnswers(form) {
    if (!form || typeof form !== 'object') return 0;
    let n = 0;
    const keys = [
        'generalComment',
        'managementSystem',
        'department',
        'auditDate',
        'auditors',
        'auditees',
        'auditScope',
        'auditCriteriaAndMethod',
        'issueDate',
    ];
    for (const k of keys) {
        if (isMeaningfulFormText(form[k])) n += 1;
    }

    if (Array.isArray(form.keyPersonnel)) {
        for (const row of form.keyPersonnel) {
            if (!row || typeof row !== 'object') continue;
            if (isMeaningfulFormText(row.name)) n += 1;
            if (isMeaningfulFormText(row.position)) n += 1;
            if (isMeaningfulFormText(row.department)) n += 1;
        }
    }

    const ack = form.acknowledgement;
    if (ack && typeof ack === 'object') {
        if (isMeaningfulFormText(ack.auditeeSignature)) n += 1;
        if (isMeaningfulFormText(ack.auditeeDate)) n += 1;
        if (isMeaningfulFormText(ack.auditorSignature)) n += 1;
        if (isMeaningfulFormText(ack.auditorDate)) n += 1;
    }
    return n;
}

/**
 * Field-level merge so empty module defaults never wipe key personnel / signatures / comments.
 */
export function mergeFindingsReportFormPreferRicher(baseline, incoming) {
    if (!baseline || typeof baseline !== 'object') {
        return incoming && typeof incoming === 'object' ? { ...incoming } : baseline;
    }
    if (!incoming || typeof incoming !== 'object') {
        return { ...baseline };
    }

    const pickText = (left, right) => {
        if (isMeaningfulFormText(right)) return String(right).trim();
        if (isMeaningfulFormText(left)) return String(left).trim();
        if (typeof right === 'string' && right.trim()) return right;
        if (typeof left === 'string') return left;
        return '';
    };

    const baseKp = Array.isArray(baseline.keyPersonnel) ? baseline.keyPersonnel : [];
    const inKp = Array.isArray(incoming.keyPersonnel) ? incoming.keyPersonnel : [];
    const kpLen = Math.max(baseKp.length, inKp.length, 4);
    const keyPersonnel = [];
    for (let i = 0; i < kpLen; i += 1) {
        const left = baseKp[i] || {};
        const right = inKp[i] || {};
        keyPersonnel.push({
            name: pickText(left.name, right.name),
            position: pickText(left.position, right.position),
            department: pickText(left.department, right.department),
        });
    }
    while (
        keyPersonnel.length > 4 &&
        !String(keyPersonnel[keyPersonnel.length - 1].name || '').trim() &&
        !String(keyPersonnel[keyPersonnel.length - 1].position || '').trim() &&
        !String(keyPersonnel[keyPersonnel.length - 1].department || '').trim()
    ) {
        keyPersonnel.pop();
    }

    const baseAck = baseline.acknowledgement && typeof baseline.acknowledgement === 'object'
        ? baseline.acknowledgement
        : {};
    const inAck = incoming.acknowledgement && typeof incoming.acknowledgement === 'object'
        ? incoming.acknowledgement
        : {};

    return {
        ...baseline,
        ...incoming,
        docNumber: pickText(baseline.docNumber, incoming.docNumber) || baseline.docNumber || incoming.docNumber,
        reportTitle: pickText(baseline.reportTitle, incoming.reportTitle) || baseline.reportTitle || incoming.reportTitle,
        revisionNo: pickText(baseline.revisionNo, incoming.revisionNo) || baseline.revisionNo || incoming.revisionNo,
        issueDate: pickText(baseline.issueDate, incoming.issueDate),
        managementSystem: pickText(baseline.managementSystem, incoming.managementSystem),
        department: pickText(baseline.department, incoming.department),
        auditDate: pickText(baseline.auditDate, incoming.auditDate),
        auditors: pickText(baseline.auditors, incoming.auditors),
        auditees: pickText(baseline.auditees, incoming.auditees),
        auditScope: pickText(baseline.auditScope, incoming.auditScope),
        auditCriteriaAndMethod: pickText(baseline.auditCriteriaAndMethod, incoming.auditCriteriaAndMethod),
        generalComment: pickText(baseline.generalComment, incoming.generalComment),
        fieldLabels: { ...(baseline.fieldLabels || {}), ...(incoming.fieldLabels || {}) },
        hiddenFields: Array.isArray(incoming.hiddenFields) ? incoming.hiddenFields : baseline.hiddenFields,
        customFields:
            Array.isArray(incoming.customFields) && incoming.customFields.length > 0
                ? incoming.customFields
                : baseline.customFields,
        sectionLabels: { ...(baseline.sectionLabels || {}), ...(incoming.sectionLabels || {}) },
        keyPersonnel,
        acknowledgement: {
            auditeeSignature: pickText(baseAck.auditeeSignature, inAck.auditeeSignature),
            auditeeDate: pickText(baseAck.auditeeDate, inAck.auditeeDate),
            auditorSignature: pickText(baseAck.auditorSignature, inAck.auditorSignature),
            auditorDate: pickText(baseAck.auditorDate, inAck.auditorDate),
        },
    };
}

function countEvidenceKeys(genericFiles) {
    if (!genericFiles || typeof genericFiles !== 'object') return 0;
    // Performance: don't sum list lengths (each list may contain many photo objects).
    // We only care whether evidence exists for a key, not how many items.
    let keysWithEvidence = 0;
    for (const list of Object.values(genericFiles)) {
        if (Array.isArray(list) && list.length > 0) keysWithEvidence += 1;
    }
    return keysWithEvidence;
}

export function countModuleStoreAnswers(entry) {
    if (!entry || typeof entry !== 'object') return 0;
    // Cap the score so we can bail out early on huge payloads.
    // This keeps merge decisions fast and avoids gateway timeouts.
    const MAX_SCORE = 2500;
    let score = 0;
    score += countChecklistRowAnswers(entry.checklistData);
    if (score >= MAX_SCORE) return MAX_SCORE;
    score += countSectionAnswers(entry.sectionData);
    if (score >= MAX_SCORE) return MAX_SCORE;
    score += countGlobalInfo(entry.auditGlobalInfo);
    if (score >= MAX_SCORE) return MAX_SCORE;
    score += countEvidenceKeys(entry.genericFiles);
    if (score >= MAX_SCORE) return MAX_SCORE;
    score += countFindingsReportFormAnswers(entry.findingsReportForm);
    return score >= MAX_SCORE ? MAX_SCORE : score;
}

export function countAuditDataAnswers(auditData) {
    if (!auditData || typeof auditData !== 'object') return 0;
    let n = 0;
    const store =
        auditData.moduleDataByTemplateId && typeof auditData.moduleDataByTemplateId === 'object'
            ? auditData.moduleDataByTemplateId
            : {};
    const counted = new Set();
    for (const [key, entry] of Object.entries(store)) {
        if (counted.has(key)) continue;
        counted.add(key);
        n += countModuleStoreAnswers(entry);
    }
    n += countModuleStoreAnswers({
        checklistData: auditData.checklistData,
        sectionData: auditData.sectionData,
        auditGlobalInfo: auditData.auditGlobalInfo,
        genericFiles: auditData.genericFiles,
    });
    const clauseData = auditData.clauseData;
    if (clauseData && typeof clauseData === 'object') {
        for (const row of Object.values(clauseData)) {
            if (typeof row?.findingType === 'string' && row.findingType.trim()) n += 1;
        }
    }
    return n;
}

function mergeModuleStoreEntries(existing, incoming) {
    if (!existing) return { ...(incoming || {}) };
    if (!incoming) return { ...existing };
    const existingCount = countModuleStoreAnswers(existing);
    const incomingCount = countModuleStoreAnswers(incoming);
    const checklistData =
        incomingCount > existingCount
            ? incoming.checklistData ?? existing.checklistData
            : existing.checklistData ?? incoming.checklistData;

    const mergeEvidenceMapsPreferNonEmpty = (a, b) => {
        const out = { ...(a || {}) };
        if (!b || typeof b !== 'object') return out;
        for (const [key, list] of Object.entries(b)) {
            if (Array.isArray(list) && list.length > 0) out[key] = list;
        }
        return out;
    };

    const mergeStringMapPreferNonEmpty = (a, b) => {
        const out = { ...(a || {}) };
        if (!b || typeof b !== 'object') return out;
        for (const [k, v] of Object.entries(b)) {
            if (isNonEmptyString(v)) out[k] = v;
        }
        return out;
    };

    const mergeSectionDataPreferNonEmpty = (a, b) => {
        const out = { ...(a || {}) };
        if (!b || typeof b !== 'object') return out;
        for (const [k, v] of Object.entries(b)) {
            if (isNonEmptyString(v)) out[k] = v;
        }
        return out;
    };

    const findingsReportForm = mergeFindingsReportFormPreferRicher(
        existing.findingsReportForm,
        incoming.findingsReportForm,
    );

    const sectionData = mergeSectionDataPreferNonEmpty(existing.sectionData, incoming.sectionData);
    const genericFiles = mergeEvidenceMapsPreferNonEmpty(existing.genericFiles, incoming.genericFiles);
    const auditGlobalInfo = mergeStringMapPreferNonEmpty(existing.auditGlobalInfo, incoming.auditGlobalInfo);
    return {
        checklistData,
        editableChecklist:
            (Array.isArray(incoming.editableChecklist) && incoming.editableChecklist.length > 0
                ? incoming.editableChecklist
                : existing.editableChecklist) ?? incoming.editableChecklist,
        extraChecklistItems: incoming.extraChecklistItems ?? existing.extraChecklistItems,
        sectionData,
        genericFiles,
        findingsReportForm,
        auditGlobalInfo,
    };
}

/**
 * Merge two full auditData blobs, keeping every module's richest answers.
 */
export function mergeAuditDataPreferRicher(baseline, incoming) {
    if (!baseline || typeof baseline !== 'object') return { ...(incoming || {}) };
    if (!incoming || typeof incoming !== 'object') return { ...baseline };

    const baseStore =
        baseline.moduleDataByTemplateId && typeof baseline.moduleDataByTemplateId === 'object'
            ? baseline.moduleDataByTemplateId
            : {};
    const inStore =
        incoming.moduleDataByTemplateId && typeof incoming.moduleDataByTemplateId === 'object'
            ? incoming.moduleDataByTemplateId
            : {};

    const mergedStore = { ...baseStore };
    for (const [key, entry] of Object.entries(inStore)) {
        mergedStore[key] = mergeModuleStoreEntries(mergedStore[key], entry);
    }

    const incomingTop = countModuleStoreAnswers({
        checklistData: incoming.checklistData,
        sectionData: incoming.sectionData,
        auditGlobalInfo: incoming.auditGlobalInfo,
        genericFiles: incoming.genericFiles,
    });
    const baselineTop = countModuleStoreAnswers({
        checklistData: baseline.checklistData,
        sectionData: baseline.sectionData,
        auditGlobalInfo: baseline.auditGlobalInfo,
        genericFiles: baseline.genericFiles,
    });
    const useIncomingTop = incomingTop > baselineTop;

    const baseFiles =
        baseline.genericFiles && typeof baseline.genericFiles === 'object'
            ? baseline.genericFiles
            : {};
    const inFiles =
        incoming.genericFiles && typeof incoming.genericFiles === 'object'
            ? incoming.genericFiles
            : {};

    const mergeEvidenceMapsPreferNonEmpty = (a, b) => {
        const out = { ...(a || {}) };
        if (!b || typeof b !== 'object') return out;
        for (const [key, list] of Object.entries(b)) {
            if (Array.isArray(list) && list.length > 0) out[key] = list;
        }
        return out;
    };

    const mergeStringMapPreferNonEmpty = (a, b) => {
        const out = { ...(a || {}) };
        if (!b || typeof b !== 'object') return out;
        for (const [k, v] of Object.entries(b)) {
            if (isNonEmptyString(v)) out[k] = v;
        }
        return out;
    };

    const findingsReportForm = mergeFindingsReportFormPreferRicher(
        baseline.findingsReportForm,
        incoming.findingsReportForm,
    );

    const genericFiles = mergeEvidenceMapsPreferNonEmpty(baseFiles, inFiles);
    const clauseFiles = mergeEvidenceMapsPreferNonEmpty(
        baseline.clauseFiles && typeof baseline.clauseFiles === 'object' ? baseline.clauseFiles : undefined,
        incoming.clauseFiles && typeof incoming.clauseFiles === 'object' ? incoming.clauseFiles : undefined,
    );

    const countClauseDataAnswers = (clauseData) => {
        if (!clauseData || typeof clauseData !== 'object') return 0;
        let n = 0;
        for (const row of Object.values(clauseData)) {
            if (row && typeof row === 'object' && isNonEmptyString(row.findingType)) n += 1;
        }
        return n;
    };
    const baselineClauseCount = countClauseDataAnswers(baseline.clauseData);
    const incomingClauseCount = countClauseDataAnswers(incoming.clauseData);
    const clauseData =
        incomingClauseCount > baselineClauseCount
            ? incoming.clauseData ?? baseline.clauseData
            : baseline.clauseData ?? incoming.clauseData;

    const auditGlobalInfo = mergeStringMapPreferNonEmpty(baseline.auditGlobalInfo, incoming.auditGlobalInfo);

    return {
        ...baseline,
        ...incoming,
        checklistData: useIncomingTop
            ? incoming.checklistData ?? baseline.checklistData
            : baseline.checklistData ?? incoming.checklistData,
        sectionData: useIncomingTop
            ? incoming.sectionData ?? baseline.sectionData
            : baseline.sectionData ?? incoming.sectionData,
        auditGlobalInfo,
        editableChecklist:
            Array.isArray(incoming.editableChecklist) && incoming.editableChecklist.length > 0
                ? incoming.editableChecklist
                : baseline.editableChecklist ?? incoming.editableChecklist,
        findingsReportForm,
        clauseData,
        genericFiles,
        clauseFiles,
        moduleDataByTemplateId: mergedStore,
        activeModuleId: incoming.activeModuleId ?? baseline.activeModuleId,
    };
}
