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
            : incomingCount < existingCount
              ? existing.checklistData ?? incoming.checklistData
              : incoming.checklistData ?? existing.checklistData;
    return {
        checklistData,
        editableChecklist:
            (Array.isArray(incoming.editableChecklist) && incoming.editableChecklist.length > 0
                ? incoming.editableChecklist
                : existing.editableChecklist) ?? incoming.editableChecklist,
        extraChecklistItems: incoming.extraChecklistItems ?? existing.extraChecklistItems,
        sectionData:
            incoming.sectionData && Object.keys(incoming.sectionData).length > 0
                ? incoming.sectionData
                : existing.sectionData ?? incoming.sectionData,
        genericFiles:
            countEvidenceKeys(incoming.genericFiles) >= countEvidenceKeys(existing.genericFiles)
                ? incoming.genericFiles ?? existing.genericFiles
                : existing.genericFiles ?? incoming.genericFiles,
        findingsReportForm: incoming.findingsReportForm ?? existing.findingsReportForm,
        auditGlobalInfo:
            incoming.auditGlobalInfo &&
            Object.values(incoming.auditGlobalInfo).some((v) => String(v || '').trim())
                ? incoming.auditGlobalInfo
                : existing.auditGlobalInfo ?? incoming.auditGlobalInfo,
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
    const useIncomingTop = incomingTop >= baselineTop;

    const baseFiles =
        baseline.genericFiles && typeof baseline.genericFiles === 'object'
            ? baseline.genericFiles
            : {};
    const inFiles =
        incoming.genericFiles && typeof incoming.genericFiles === 'object'
            ? incoming.genericFiles
            : {};

    return {
        ...baseline,
        ...incoming,
        checklistData: useIncomingTop
            ? incoming.checklistData ?? baseline.checklistData
            : baseline.checklistData ?? incoming.checklistData,
        sectionData: useIncomingTop
            ? incoming.sectionData ?? baseline.sectionData
            : baseline.sectionData ?? incoming.sectionData,
        auditGlobalInfo: useIncomingTop
            ? incoming.auditGlobalInfo ?? baseline.auditGlobalInfo
            : baseline.auditGlobalInfo ?? incoming.auditGlobalInfo,
        editableChecklist:
            Array.isArray(incoming.editableChecklist) && incoming.editableChecklist.length > 0
                ? incoming.editableChecklist
                : baseline.editableChecklist ?? incoming.editableChecklist,
        findingsReportForm: incoming.findingsReportForm ?? baseline.findingsReportForm,
        clauseData: incoming.clauseData ?? baseline.clauseData,
        genericFiles: { ...baseFiles, ...inFiles },
        moduleDataByTemplateId: mergedStore,
        activeModuleId: incoming.activeModuleId ?? baseline.activeModuleId,
    };
}
