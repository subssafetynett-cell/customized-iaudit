import { apiFetch } from "@/lib/api";
import { parsePaginatedResponse, type PaginatedResult } from "@/lib/pagination";

export type NonconformanceStatus =
    | "ASSIGNED"
    | "RESPONSE_SUBMITTED"
    | "CHANGES_REQUESTED"
    | "CLOSED";

export type NonconformanceSeverity = "Minor" | "Major";

export type NonconformanceUserSummary = {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string | null;
    name?: string | null;
};

export type NonconformanceSummary = {
    id: number;
    ncNumber: string;
    auditPlanId: number;
    findingId: string;
    findingTitle: string;
    findingDescription: string;
    severity: NonconformanceSeverity | string;
    assigneeId: number;
    reviewerId: number;
    dueDate: string | null;
    status: NonconformanceStatus | string;
    closedAt?: string | null;
    createdById?: number;
    createdAt: string;
    updatedAt?: string;
    assignee?: NonconformanceUserSummary | null;
    reviewer?: NonconformanceUserSummary | null;
    createdBy?: NonconformanceUserSummary | null;
    auditPlan?: {
        id: number;
        auditName?: string | null;
        executionId?: string | null;
        auditProgramId?: number | null;
    } | null;
    responses?: NonconformanceResponse[];
    reviews?: NonconformanceReview[];
    reviewHistory?: NonconformanceReview[];
    reviewerComments?: NonconformanceReviewerComment[];
    activities?: NonconformanceActivity[];
    activityHistory?: NonconformanceActivity[];
};

export type NonconformanceResponse = {
    id: number;
    nonconformanceId: number;
    version: number;
    rootCause: string;
    immediateCorrection?: string | null;
    correctiveAction: string;
    preventiveAction?: string | null;
    proposedCompletionDate?: string | null;
    additionalComments?: string | null;
    evidenceFilenames?: string[];
    submittedById: number;
    submittedAt: string;
    submittedBy?: NonconformanceUserSummary | null;
};

export type NonconformanceReviewDecision = "APPROVE" | "REQUEST_CHANGES";

export type NonconformanceReview = {
    id: number;
    nonconformanceId: number;
    decision: NonconformanceReviewDecision | string;
    comment?: string | null;
    reviewedById: number;
    reviewedAt: string;
    reviewedBy?: NonconformanceUserSummary | null;
};

export type NonconformanceReviewerComment = {
    id: number;
    decision: NonconformanceReviewDecision | string;
    comment: string;
    reviewedAt: string;
    reviewedBy?: NonconformanceUserSummary | null;
};

export type NonconformanceActivity = {
    id: number;
    nonconformanceId: number;
    type: string;
    message: string;
    comment?: string | null;
    actorId?: number | null;
    createdAt: string;
    actor?: NonconformanceUserSummary | null;
};

export type RaiseNonconformancePayload = {
    auditPlanId: number;
    findingId: string;
    assigneeId: number;
    dueDate: string;
    findingTitle?: string;
    findingDescription?: string;
    reviewerId?: number;
};

export type SubmitNonconformanceResponsePayload = {
    rootCause: string;
    immediateCorrection?: string;
    correctiveAction: string;
    preventiveAction?: string;
    proposedCompletionDate?: string;
    additionalComments?: string;
    evidenceFilenames?: string[];
};

export type SubmitNonconformanceReviewPayload = {
    decision: NonconformanceReviewDecision;
    comment?: string;
};

export const NC_STATUS_OPTIONS: NonconformanceStatus[] = [
    "ASSIGNED",
    "RESPONSE_SUBMITTED",
    "CHANGES_REQUESTED",
    "CLOSED",
];

export const NC_SEVERITY_OPTIONS: NonconformanceSeverity[] = ["Minor", "Major"];

export function formatNcUserLabel(
    user: NonconformanceUserSummary | null | undefined,
): string {
    if (!user) return "—";
    if (user.name?.trim()) return user.name.trim();
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    if (name) return name;
    return user.email?.trim() || "—";
}

export function formatNcDate(value: string | null | undefined): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
}

export function formatNcStatusLabel(status: string | undefined | null): string {
    const raw = String(status ?? "").trim().toUpperCase();
    if (!raw) return "—";
    const labels: Record<string, string> = {
        ASSIGNED: "Opened",
        RESPONSE_SUBMITTED: "Pending Review",
        CHANGES_REQUESTED: "Changes Requested",
        CLOSED: "Closed",
    };
    if (labels[raw]) return labels[raw];
    return raw
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ");
}

export async function listNonconformances(params?: {
    auditPlanId?: number;
    status?: string;
    assigneeId?: number;
    page?: number;
    limit?: number;
}): Promise<NonconformanceSummary[]> {
    const result = await listNonconformancesPaged(params);
    return result.items;
}

export async function listNonconformancesPaged(params?: {
    auditPlanId?: number;
    status?: string;
    assigneeId?: number;
    page?: number;
    limit?: number;
}): Promise<PaginatedResult<NonconformanceSummary>> {
    const query = new URLSearchParams();
    if (params?.auditPlanId != null) query.set("auditPlanId", String(params.auditPlanId));
    if (params?.status) query.set("status", params.status);
    if (params?.assigneeId != null) query.set("assigneeId", String(params.assigneeId));
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.limit != null) query.set("limit", String(params.limit));
    const qs = query.toString();
    const res = await apiFetch(`/nonconformances${qs ? `?${qs}` : ""}`);
    const data = await res.json().catch(() => []);
    if (!res.ok) {
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                "Failed to load nonconformances",
        );
    }
    return parsePaginatedResponse<NonconformanceSummary>(
        data,
        params?.page ?? 1,
        params?.limit ?? 10,
    );
}

export async function listNonconformancesForPlan(
    auditPlanId: number,
): Promise<NonconformanceSummary[]> {
    return listNonconformances({ auditPlanId });
}

export async function findNonconformanceForFinding(
    auditPlanId: number,
    findingId: string,
): Promise<NonconformanceSummary | null> {
    const target = String(findingId || "").trim();
    const planId = Number(auditPlanId);

    const checklistIndex = (id: string): string | null => {
        const modular = id.match(new RegExp(`^checklist-${planId}-(.+)-(\\d+)$`));
        if (modular) return modular[2];
        const legacy = id.match(new RegExp(`^checklist-${planId}-(\\d+)$`));
        if (legacy) return legacy[1];
        return null;
    };

    const matchesFindingId = (rowFindingId: string): boolean => {
        const fid = String(rowFindingId || "").trim();
        if (!fid || !target) return false;
        if (fid === target) return true;
        // Raise NC often uses checklist-{plan}-{idx} while findings list uses
        // checklist-{plan}-{templateId}-{idx} (and vice versa).
        const a = checklistIndex(fid);
        const b = checklistIndex(target);
        return Boolean(a && b && a === b);
    };

    const pick = (rows: NonconformanceSummary[]): NonconformanceSummary | null => {
        const exact =
            rows.find((row) => String(row.findingId || "").trim() === target) ?? null;
        if (exact) return exact;
        return rows.find((row) => matchesFindingId(String(row.findingId || ""))) ?? null;
    };

    let hit: NonconformanceSummary | null = null;
    try {
        hit = pick(await listNonconformancesForPlan(auditPlanId));
    } catch {
        // Auditees may not list by plan in some access edge cases; fall through.
    }
    if (!hit) {
        try {
            const mine = await listNonconformances();
            hit =
                pick(
                    mine.filter((row) => Number(row.auditPlanId) === planId),
                ) ?? null;
        } catch {
            return null;
        }
    }
    if (!hit?.id) return hit;
    // Prefer detail payload so assignee email is present for respond checks.
    try {
        return await getNonconformanceById(hit.id);
    } catch {
        return hit;
    }
}

export function canUserRespondToNc(
    nc: Pick<NonconformanceSummary, "assigneeId" | "status" | "assignee"> | null | undefined,
    user: { id?: number | string; email?: string | null } | null | undefined,
): boolean {
    if (!nc || !user) return false;
    const status = String(nc.status ?? "").trim().toUpperCase();
    if (
        status !== "ASSIGNED" &&
        status !== "CHANGES_REQUESTED" &&
        status !== "RESPONSE_SUBMITTED"
    ) {
        return false;
    }
    if (user.id != null && Number(nc.assigneeId) === Number(user.id)) return true;
    const assigneeEmail = nc.assignee?.email?.toLowerCase().trim();
    const userEmail = String(user.email ?? "").toLowerCase().trim();
    return Boolean(assigneeEmail && userEmail && assigneeEmail === userEmail);
}

export async function getNonconformanceById(
    id: number | string,
): Promise<NonconformanceSummary> {
    const res = await apiFetch(`/nonconformances/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                "Failed to load nonconformance",
        );
    }
    return data as NonconformanceSummary;
}

export async function raiseNonconformance(
    payload: RaiseNonconformancePayload,
): Promise<NonconformanceSummary> {
    const res = await apiFetch("/nonconformances", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(
            (typeof data.error === "string" && data.error) ||
                (typeof data.message === "string" && data.message) ||
                "Failed to raise nonconformance",
        ) as Error & {
            status?: number;
            existingId?: number;
            existingNcNumber?: string;
        };
        err.status = res.status;
        if (data.existingId != null) err.existingId = Number(data.existingId);
        if (typeof data.existingNcNumber === "string") {
            err.existingNcNumber = data.existingNcNumber;
        }
        throw err;
    }
    return data as NonconformanceSummary;
}

export async function submitNonconformanceResponse(
    nonconformanceId: number | string,
    payload: SubmitNonconformanceResponsePayload,
): Promise<NonconformanceSummary> {
    const res = await apiFetch(`/nonconformances/${nonconformanceId}/responses`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                (typeof data.message === "string" && data.message) ||
                "Failed to submit response",
        );
    }
    return data as NonconformanceSummary;
}

export function canAuditeeSubmitNcResponse(
    nc:
        | Pick<NonconformanceSummary, "assigneeId" | "status" | "assignee">
        | null
        | undefined,
    user:
        | number
        | string
        | { id?: number | string; email?: string | null }
        | null
        | undefined,
): boolean {
    // Prefer full user object (id + email). Numeric args remain supported.
    if (user != null && typeof user === "object") {
        return canUserRespondToNc(nc, user);
    }
    if (!nc || user == null) return false;
    if (Number(nc.assigneeId) !== Number(user)) return false;
    const status = String(nc.status ?? "").trim().toUpperCase();
    return (
        status === "ASSIGNED" ||
        status === "CHANGES_REQUESTED" ||
        status === "RESPONSE_SUBMITTED"
    );
}

export async function submitNonconformanceReview(
    nonconformanceId: number | string,
    payload: SubmitNonconformanceReviewPayload,
): Promise<NonconformanceSummary> {
    const res = await apiFetch(`/nonconformances/${nonconformanceId}/review`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                (typeof data.message === "string" && data.message) ||
                "Failed to submit review",
        );
    }
    return data as NonconformanceSummary;
}

function normalizeRoleKey(role: string | undefined | null): string {
    return String(role ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

export type NcReviewPlanContext = {
    leadAuditorId?: number | null;
    auditorIds?: Array<number | string | null | undefined>;
};

/**
 * Review UI: Lead Auditor, Auditor, Reviewer, or NC Creator.
 * Never for Auditees. Visible for RESPONSE_SUBMITTED or CHANGES_REQUESTED.
 */
export function canShowNcReviewSection(
    nc: Pick<NonconformanceSummary, "reviewerId" | "createdById" | "status"> | null | undefined,
    user: { id?: number | string | null; role?: string | null } | null | undefined,
    plan?: NcReviewPlanContext | null,
): boolean {
    if (!nc || !user?.id) return false;
    if (normalizeRoleKey(user.role) === "auditee") return false;

    const status = String(nc.status ?? "").trim().toUpperCase();
    if (status !== "RESPONSE_SUBMITTED" && status !== "CHANGES_REQUESTED") return false;

    const uid = Number(user.id);
    if (!Number.isFinite(uid)) return false;

    if (Number(nc.reviewerId) === uid) return true;
    if (nc.createdById != null && Number(nc.createdById) === uid) return true;
    if (plan?.leadAuditorId != null && Number(plan.leadAuditorId) === uid) return true;
    if (
        Array.isArray(plan?.auditorIds) &&
        plan.auditorIds.some((id) => id != null && Number(id) === uid)
    ) {
        return true;
    }

    const role = normalizeRoleKey(user.role);
    return role === "lead_auditor" || role === "auditor";
}

/** Action buttons only when API accepts review (RESPONSE_SUBMITTED). */
export function canSubmitNcReview(
    nc: Pick<NonconformanceSummary, "status"> | null | undefined,
): boolean {
    return String(nc?.status ?? "").trim().toUpperCase() === "RESPONSE_SUBMITTED";
}

export function isNcEligibleSeverity(type: string | undefined | null): boolean {
    const t = String(type ?? "").trim().toLowerCase();
    return (
        t === "minor" ||
        t === "min" ||
        t === "major" ||
        t === "maj" ||
        t === "nc" ||
        t === "not ok" ||
        t === "notok"
    );
}

export function normalizeNcSeverity(
    type: string | undefined | null,
): NonconformanceSeverity | null {
    const t = String(type ?? "").trim().toLowerCase();
    if (t === "minor" || t === "min") return "Minor";
    if (t === "major" || t === "maj") return "Major";
    // ISO OK/Not OK → NC defaults to Minor for formal raise.
    if (t === "nc" || t === "not ok" || t === "notok") return "Minor";
    return null;
}

export function clauseFromFindingId(findingId: string | undefined | null): string {
    const id = String(findingId ?? "").trim();
    if (!id) return "—";
    const clause = id.match(/^clause-\d+-(.+)$/);
    if (clause) return `Clause ${clause[1]}`;
    const checklist = id.match(/^checklist-\d+-(.+)$/);
    if (checklist) return `Item ${Number(checklist[1]) + 1}`;
    const process = id.match(/^process-\d+-(\d+)$/);
    if (process) return `Process #${Number(process[1]) + 1}`;
    const extra = id.match(/^extra-\d+-(.+)-(\d+)$/);
    if (extra) return `Clause ${extra[1]} (Custom)`;
    return "—";
}
