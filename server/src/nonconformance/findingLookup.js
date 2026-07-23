/**
 * Resolve a finding from AuditPlan.auditData / findingsData by findingId.
 * Mirrors the frontend id patterns used in auditFindings.ts.
 */

function safeParse(input) {
    if (typeof input === 'string') {
        try {
            return JSON.parse(input);
        } catch {
            return input;
        }
    }
    return input;
}

function mapSeverity(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const normalized = raw.trim().toLowerCase();
    if (
        normalized === 'c' ||
        normalized === 'compliant' ||
        normalized === 'compliance' ||
        normalized === ''
    ) {
        return null;
    }
    if (normalized.includes('ofi') || normalized.includes('opportunity')) return 'OFI';
    if (normalized === 'min' || normalized.includes('minor')) return 'Minor';
    if (normalized === 'maj' || normalized.includes('major')) return 'Major';
    if (
        normalized === 'nc' ||
        normalized.includes('non-conformance') ||
        normalized.includes('nonconformance')
    ) {
        return 'Minor';
    }
    return null;
}

function getFindingType(obj) {
    if (!obj || typeof obj !== 'object') return null;
    return (
        mapSeverity(obj.findings) ||
        mapSeverity(obj.findingType) ||
        mapSeverity(obj.category) ||
        mapSeverity(obj.type)
    );
}

function pickDescription(entry, fallback = '') {
    if (!entry || typeof entry !== 'object') return fallback;
    const value =
        entry.description ||
        entry.findingDetails ||
        entry.details ||
        entry.statement ||
        entry.opportunity ||
        entry.question ||
        fallback;
    return String(value ?? '').trim() || fallback || 'No description provided';
}

function pickTitle(entry, fallback) {
    if (!entry || typeof entry !== 'object') return fallback;
    const value = entry.title || entry.clauseRef || entry.refNo || entry.clauseNo || fallback;
    return String(value ?? '').trim() || fallback;
}

/**
 * @param {object} plan - AuditPlan row with auditData / findingsData / id / auditName
 * @param {string} findingId
 * @returns {{ id: string, title: string, description: string, severity: 'Minor'|'Major'|'OFI', clauseRef?: string } | null}
 */
export function findFindingOnPlan(plan, findingId) {
    const targetId = String(findingId || '').trim();
    if (!plan?.id || !targetId) return null;

    const planId = Number(plan.id);
    const auditName = plan.auditName || `Audit #${planId}`;
    const data = safeParse(plan.auditData);
    if (!data || typeof data !== 'object') return null;

    const overrides =
        plan.findingsData && typeof plan.findingsData === 'object'
            ? safeParse(plan.findingsData)
            : {};
    const override =
        overrides && typeof overrides === 'object' && overrides[targetId]
            ? overrides[targetId]
            : null;

    const applyOverride = (base) => {
        if (!base) return null;
        if (!override || typeof override !== 'object') return base;
        return {
            ...base,
            description: pickDescription(override, base.description),
            title: pickTitle(override, base.title),
        };
    };

    // clause-{planId}-{clauseId}
    const clauseMatch = targetId.match(new RegExp(`^clause-${planId}-(.+)$`));
    if (clauseMatch) {
        const clauseId = clauseMatch[1];
        const clauseData = safeParse(data.clauseData);
        const entry =
            clauseData && typeof clauseData === 'object' ? clauseData[clauseId] : null;
        const severity = getFindingType(entry);
        if (!severity) return null;
        return applyOverride({
            id: targetId,
            title: pickTitle(entry, `Clause ${clauseId}`),
            description: pickDescription(entry),
            severity,
            clauseRef: `Clause ${clauseId}`,
            auditName,
        });
    }

    // checklist-{planId}-{idx}
    const checklistMatch = targetId.match(new RegExp(`^checklist-${planId}-(.+)$`));
    if (checklistMatch) {
        const idx = checklistMatch[1];
        const checklistData = safeParse(data.checklistData);
        const entry =
            checklistData && typeof checklistData === 'object' ? checklistData[idx] : null;
        const severity = getFindingType(entry);
        if (!severity) return null;
        const clauseRef = entry?.clause
            ? `Clause ${entry.clause}`
            : `Item ${Number(idx) + 1}`;
        return applyOverride({
            id: targetId,
            title: pickTitle(entry, clauseRef),
            description: pickDescription(entry),
            severity,
            clauseRef,
            auditName,
        });
    }

    // extra-{planId}-{clause}-{idx}
    const extraMatch = targetId.match(new RegExp(`^extra-${planId}-(.+)-(\\d+)$`));
    if (extraMatch) {
        const clause = extraMatch[1];
        const idx = Number(extraMatch[2]);
        const extraItems = safeParse(data.extraChecklistItems);
        const items =
            extraItems && typeof extraItems === 'object' ? extraItems[clause] : null;
        const entry = Array.isArray(items) ? items[idx] : null;
        const severity = getFindingType(entry);
        if (!severity) return null;
        return applyOverride({
            id: targetId,
            title: pickTitle(entry, `Clause ${clause} (Custom)`),
            description: pickDescription(entry, entry?.question || ''),
            severity,
            clauseRef: `Clause ${clause} (Custom)`,
            auditName,
        });
    }

    // process-{planId}-{idx}
    const processMatch = targetId.match(new RegExp(`^process-${planId}-(\\d+)$`));
    if (processMatch) {
        const idx = Number(processMatch[1]);
        const processAudits = safeParse(data.processAudits);
        const entry = Array.isArray(processAudits) ? processAudits[idx] : null;
        const severity = getFindingType(entry);
        if (!severity) return null;
        const clauseRef =
            entry?.refNo || entry?.clauseNo || `Process #${idx + 1}`;
        return applyOverride({
            id: targetId,
            title: pickTitle(entry, String(clauseRef)),
            description: pickDescription(entry, entry?.processArea || ''),
            severity,
            clauseRef: String(clauseRef),
            auditName,
        });
    }

    // summary-ncr-{idx} — report-level NCR rows (Major/Minor inferred)
    const ncrMatch = targetId.match(/^summary-ncr-(\d+)$/);
    if (ncrMatch) {
        const idx = Number(ncrMatch[1]);
        const rows = safeParse(data.nonConformances);
        const entry = Array.isArray(rows) ? rows[idx] : null;
        if (!entry || typeof entry !== 'object') return null;
        const idHint = String(entry.id || '');
        const statement = String(entry.statement || '');
        const isMajor =
            /maj/i.test(idHint) || /major/i.test(statement);
        return applyOverride({
            id: targetId,
            title: pickTitle(entry, entry.standardClause || `NCR #${idx + 1}`),
            description: pickDescription(entry, statement),
            severity: isMajor ? 'Major' : 'Minor',
            clauseRef: String(entry.standardClause || `NCR #${idx + 1}`),
            auditName,
        });
    }

    return null;
}
