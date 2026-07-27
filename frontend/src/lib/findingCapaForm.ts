/** Structured CAPA / RCA response form filled by finding assignees. */

export type CapaActionRow = {
    nonConformance: string;
    proposedAction: string;
    responsibility: string;
    dueDate: string;
    closedBySignature: string;
};

export type CapaFiveWhyRow = {
    fishboneCause: string;
    why1: string;
    why2: string;
    why3: string;
    why4: string;
    why5: string;
    rootCause: string;
};

export type CapaOtherAreaRow = {
    department: string;
    yes: boolean;
    no: boolean;
    actionTaken: string;
    actionBy: string;
    date: string;
};

export type CapaFishbone = {
    method: string;
    environment: string;
    materials: string;
    management: string;
    machine: string;
    manpower: string;
};

export type FindingCapaForm = {
    // Section A
    date: string;
    areaLineProcessAudit: string;
    processOwner: string;
    capNo: string;
    rcaTeamMembers: string;
    whatHappened: string;
    whereHappened: string;
    whenHappened: string;
    whyProblem: string;
    whoInvolved: string;
    howBig: string;
    observedBefore: string;
    observedDuring: string;
    observedAfter: string;
    // Section B
    fishbone: CapaFishbone;
    probableCauses: string;
    fiveWhys: CapaFiveWhyRow[];
    rootCauses: string;
    // Section C
    correctionRows: CapaActionRow[];
    correctiveRows: CapaActionRow[];
    preventiveRows: CapaActionRow[];
    // Section D
    effectivenessCriteria: string;
    verifiedBy: string;
    verifiedDate: string;
    // Section E
    otherAreaRows: CapaOtherAreaRow[];
};

function emptyActionRow(): CapaActionRow {
    return {
        nonConformance: "",
        proposedAction: "",
        responsibility: "",
        dueDate: "",
        closedBySignature: "",
    };
}

function emptyFiveWhyRow(): CapaFiveWhyRow {
    return {
        fishboneCause: "",
        why1: "",
        why2: "",
        why3: "",
        why4: "",
        why5: "",
        rootCause: "",
    };
}

function emptyOtherAreaRow(): CapaOtherAreaRow {
    return {
        department: "",
        yes: false,
        no: false,
        actionTaken: "",
        actionBy: "",
        date: "",
    };
}

export function createEmptyCapaForm(seed?: {
    date?: string;
    areaLineProcessAudit?: string;
    nonConformanceSummary?: string;
}): FindingCapaForm {
    const nc = seed?.nonConformanceSummary?.trim() || "";
    return {
        date: seed?.date || new Date().toISOString().slice(0, 10),
        areaLineProcessAudit: seed?.areaLineProcessAudit || "",
        processOwner: "",
        capNo: "",
        rcaTeamMembers: "",
        whatHappened: "",
        whereHappened: "",
        whenHappened: "",
        whyProblem: "",
        whoInvolved: "",
        howBig: "",
        observedBefore: "",
        observedDuring: "",
        observedAfter: "",
        fishbone: {
            method: "",
            environment: "",
            materials: "",
            management: "",
            machine: "",
            manpower: "",
        },
        probableCauses: "",
        fiveWhys: [emptyFiveWhyRow(), emptyFiveWhyRow(), emptyFiveWhyRow()],
        rootCauses: "",
        correctionRows: [{ ...emptyActionRow(), nonConformance: nc }],
        correctiveRows: [{ ...emptyActionRow(), nonConformance: nc }],
        preventiveRows: [{ ...emptyActionRow(), nonConformance: nc }],
        effectivenessCriteria: "",
        verifiedBy: "",
        verifiedDate: "",
        otherAreaRows: [
            emptyOtherAreaRow(),
            emptyOtherAreaRow(),
            emptyOtherAreaRow(),
            emptyOtherAreaRow(),
        ],
    };
}

export function parseCapaForm(raw: unknown): FindingCapaForm | null {
    if (!raw) return null;
    if (typeof raw === "string") {
        try {
            return parseCapaForm(JSON.parse(raw));
        } catch {
            return null;
        }
    }
    if (typeof raw !== "object" || Array.isArray(raw)) return null;
    const o = raw as Partial<FindingCapaForm>;
    const base = createEmptyCapaForm();
    return {
        ...base,
        ...o,
        fishbone: { ...base.fishbone, ...(o.fishbone || {}) },
        fiveWhys:
            Array.isArray(o.fiveWhys) && o.fiveWhys.length > 0
                ? o.fiveWhys.map((r) => ({ ...emptyFiveWhyRow(), ...r }))
                : base.fiveWhys,
        correctionRows:
            Array.isArray(o.correctionRows) && o.correctionRows.length > 0
                ? o.correctionRows.map((r) => ({ ...emptyActionRow(), ...r }))
                : base.correctionRows,
        correctiveRows:
            Array.isArray(o.correctiveRows) && o.correctiveRows.length > 0
                ? o.correctiveRows.map((r) => ({ ...emptyActionRow(), ...r }))
                : base.correctiveRows,
        preventiveRows:
            Array.isArray(o.preventiveRows) && o.preventiveRows.length > 0
                ? o.preventiveRows.map((r) => ({ ...emptyActionRow(), ...r }))
                : base.preventiveRows,
        otherAreaRows:
            Array.isArray(o.otherAreaRows) && o.otherAreaRows.length > 0
                ? o.otherAreaRows.map((r) => ({ ...emptyOtherAreaRow(), ...r }))
                : base.otherAreaRows,
    };
}

/** Minimal required fields to send to reporter. */
export function getCapaFormMissingForSubmit(form: FindingCapaForm): string[] {
    const missing: string[] = [];
    if (!form.whatHappened.trim()) missing.push("What happened");
    if (!form.whereHappened.trim()) missing.push("Where it happened");
    if (!form.whenHappened.trim()) missing.push("When it happened");
    if (!form.whyProblem.trim()) missing.push("Why it was a problem");
    if (!form.rootCauses.trim() && !form.fiveWhys.some((r) => r.rootCause.trim())) {
        missing.push("Root cause(s)");
    }
    if (!form.correctionRows.some((r) => r.proposedAction.trim())) {
        missing.push("Correction action steps");
    }
    if (!form.correctiveRows.some((r) => r.proposedAction.trim())) {
        missing.push("Corrective action steps");
    }
    return missing;
}

export function summarizeCapaForm(form: FindingCapaForm): {
    rootCause: string;
    correction: string;
    correctiveAction: string;
    preventiveAction: string;
    findingDetails: string;
} {
    const rootCause =
        form.rootCauses.trim() ||
        form.fiveWhys
            .map((r) => r.rootCause.trim())
            .filter(Boolean)
            .join("\n") ||
        "";
    const correction = form.correctionRows
        .filter((r) => r.proposedAction.trim())
        .map(
            (r) =>
                `${r.proposedAction}${r.responsibility ? ` (${r.responsibility})` : ""}${r.dueDate ? ` — due ${r.dueDate}` : ""}`,
        )
        .join("\n");
    const correctiveAction = form.correctiveRows
        .filter((r) => r.proposedAction.trim())
        .map(
            (r) =>
                `${r.proposedAction}${r.responsibility ? ` (${r.responsibility})` : ""}${r.dueDate ? ` — due ${r.dueDate}` : ""}`,
        )
        .join("\n");
    const preventiveAction = form.preventiveRows
        .filter((r) => r.proposedAction.trim())
        .map(
            (r) =>
                `${r.proposedAction}${r.responsibility ? ` (${r.responsibility})` : ""}${r.dueDate ? ` — due ${r.dueDate}` : ""}`,
        )
        .join("\n");

    const findingDetails = [
        form.whatHappened.trim() ? `What: ${form.whatHappened.trim()}` : "",
        form.whereHappened.trim() ? `Where: ${form.whereHappened.trim()}` : "",
        form.whenHappened.trim() ? `When: ${form.whenHappened.trim()}` : "",
        form.whyProblem.trim() ? `Why: ${form.whyProblem.trim()}` : "",
        form.whoInvolved.trim() ? `Who: ${form.whoInvolved.trim()}` : "",
        form.howBig.trim() ? `How: ${form.howBig.trim()}` : "",
        form.observedBefore.trim() ? `Before: ${form.observedBefore.trim()}` : "",
        form.observedDuring.trim() ? `During: ${form.observedDuring.trim()}` : "",
        form.observedAfter.trim() ? `After: ${form.observedAfter.trim()}` : "",
    ]
        .filter(Boolean)
        .join("\n");

    return { rootCause, correction, correctiveAction, preventiveAction, findingDetails };
}
