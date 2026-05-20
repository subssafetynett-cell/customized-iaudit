/** Plain-text input sanitization (no HTML/script). Mirrors server textSanitize.js behavior. */

import type { AuditQuestion, SavedGapAnalysis } from "@/types/gapAnalysis";
import { sanitizeEvidenceImageDataUrl } from "@/lib/evidenceImageUpload";

const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Block common script vectors after tag stripping. */
const DANGEROUS_PROTOCOL = /javascript\s*:/gi;
const DANGEROUS_EVENT = /\bon\w+\s*=/gi;

function stripMarkup(s: string): string {
    let out = s;
    let prev: string;
    do {
        prev = out;
        out = out.replace(/<[^>]*>/g, "");
    } while (out !== prev);
    return out.replace(/</g, "").replace(/>/g, "");
}

export type PlainTextOptions = {
    /** Keep line breaks (for textareas). Default false. */
    preserveNewlines?: boolean;
    maxLen?: number;
};

export const GAP_ANALYSIS_SHORT_MAX = 200;
export const GAP_ANALYSIS_FIELD_MAX = 500;
export const GAP_ANALYSIS_LONG_MAX = 2000;
export const GAP_ANALYSIS_MULTILINE_MAX = 20000;
export const GAP_ANALYSIS_QUESTION_MAX = 5000;

/**
 * Strips HTML/tags and control characters; returns plain text only.
 */
export function sanitizePlainTextInput(value: string, opts: PlainTextOptions = {}): string {
    const maxLen = opts.maxLen ?? GAP_ANALYSIS_FIELD_MAX;
    let s = String(value ?? "").replace(CTRL, "");
    s = stripMarkup(s);
    s = s.replace(DANGEROUS_PROTOCOL, "").replace(DANGEROUS_EVENT, "");

    if (opts.preserveNewlines) {
        s = s
            .split("\n")
            .map((line) => line.replace(/[^\S\r\n]+/g, " ").trimEnd())
            .join("\n");
        s = s.replace(/\n{4,}/g, "\n\n\n");
    } else {
        s = s.replace(/[\r\n\t]+/g, " ").trim().replace(/\s+/g, " ");
    }

    if (s.length > maxLen) {
        s = s.slice(0, maxLen);
    }
    return s;
}

export function sanitizeGapAnalysisMultiline(value: string): string {
    return sanitizePlainTextInput(value, {
        preserveNewlines: true,
        maxLen: GAP_ANALYSIS_MULTILINE_MAX,
    });
}

export function sanitizeGapAnalysisQuestionText(value: string): string {
    return sanitizePlainTextInput(value, {
        preserveNewlines: true,
        maxLen: GAP_ANALYSIS_QUESTION_MAX,
    });
}

export function sanitizeGapAnalysisShortField(value: string): string {
    return sanitizePlainTextInput(value, { maxLen: GAP_ANALYSIS_SHORT_MAX });
}

export function sanitizeGapAnalysisField(value: string): string {
    return sanitizePlainTextInput(value, { maxLen: GAP_ANALYSIS_FIELD_MAX });
}

export function sanitizeGapAnalysisLongField(value: string): string {
    return sanitizePlainTextInput(value, { maxLen: GAP_ANALYSIS_LONG_MAX });
}

export function sanitizeAuditQuestion(q: AuditQuestion): AuditQuestion {
    return {
        ...q,
        text: sanitizeGapAnalysisQuestionText(q.text ?? ""),
        actionPlan: sanitizeGapAnalysisMultiline(q.actionPlan ?? ""),
        evidence: sanitizeGapAnalysisMultiline(q.evidence ?? ""),
        evidenceImage: sanitizeEvidenceImageDataUrl(q.evidenceImage),
    };
}

export function sanitizeSavedGapAnalysis(analysis: SavedGapAnalysis): SavedGapAnalysis {
    return {
        ...analysis,
        companyName: sanitizeGapAnalysisShortField(analysis.companyName ?? ""),
        location: sanitizeGapAnalysisShortField(analysis.location ?? ""),
        representatives: sanitizeGapAnalysisLongField(analysis.representatives ?? ""),
        auditorName: sanitizeGapAnalysisShortField(analysis.auditorName ?? ""),
        contactEmail: sanitizeGapAnalysisField(analysis.contactEmail ?? ""),
        scope: sanitizeGapAnalysisLongField(analysis.scope ?? ""),
        auditCompany: sanitizeGapAnalysisField(analysis.auditCompany ?? ""),
        questions: (analysis.questions ?? []).map(sanitizeAuditQuestion),
    };
}

// --- Self Assessment ---

export const SELF_ASSESSMENT_NAME_MAX = 200;
export const SELF_ASSESSMENT_REP_MAX = 500;
export const SELF_ASSESSMENT_SCOPE_MAX = 2000;
export const SELF_ASSESSMENT_QUESTION_MAX = 5000;
export const SELF_ASSESSMENT_EMAIL_MAX = 254;

/** Company, person, location, position: letters/numbers and limited punctuation only. */
export function sanitizeSelfAssessmentNameField(
    value: string,
    maxLen: number = SELF_ASSESSMENT_NAME_MAX
): string {
    let s = sanitizePlainTextInput(value, { maxLen });
    s = s.replace(/[`\\<>]/g, "");
    s = s.replace(/[^\p{L}\p{M}\p{N}\s\-'.,&()]/gu, "");
    return s.trim().replace(/\s+/g, " ");
}

export function sanitizeSelfAssessmentEmail(value: string): string {
    let s = sanitizePlainTextInput(value, { maxLen: SELF_ASSESSMENT_EMAIL_MAX });
    return s.replace(/[^\w.@+-]/g, "").toLowerCase();
}

export function sanitizeSelfAssessmentScope(value: string): string {
    let s = sanitizePlainTextInput(value, {
        preserveNewlines: true,
        maxLen: SELF_ASSESSMENT_SCOPE_MAX,
    });
    s = s.replace(/[^\p{L}\p{M}\p{N}\s\-'.,;:!?()/&%]/gu, "");
    return s;
}

export function sanitizeSelfAssessmentQuestionText(value: string): string {
    let s = sanitizePlainTextInput(value, {
        preserveNewlines: true,
        maxLen: SELF_ASSESSMENT_QUESTION_MAX,
    });
    s = s.replace(/[^\p{L}\p{M}\p{N}\s\-'.,;:!?()/&%]/gu, "");
    return s;
}

export interface SelfAssessmentQuestion {
    id: string;
    clause: string;
    text: string;
    answer: "yes" | "no" | null;
}

export interface SelfAssessmentRecord {
    id: string;
    companyName: string;
    auditorName: string;
    auditCompany?: string;
    standard: string;
    score: number;
    date: string;
    email?: string;
    questions: SelfAssessmentQuestion[];
    auditDate?: string;
    auditLocation?: string;
    auditRepresentatives?: string;
    contactEmail?: string;
    auditScope?: string;
    auditorPosition?: string;
}

export function sanitizeSelfAssessmentQuestion(q: SelfAssessmentQuestion): SelfAssessmentQuestion {
    return {
        ...q,
        clause: sanitizeSelfAssessmentNameField(q.clause ?? "", 120),
        text: sanitizeSelfAssessmentQuestionText(q.text ?? ""),
    };
}

export function sanitizeSavedSelfAssessment(a: SelfAssessmentRecord): SelfAssessmentRecord {
    return {
        ...a,
        companyName: sanitizeSelfAssessmentNameField(a.companyName ?? ""),
        auditorName: sanitizeSelfAssessmentNameField(a.auditorName ?? ""),
        auditorPosition: sanitizeSelfAssessmentNameField(a.auditorPosition ?? ""),
        auditCompany: a.auditCompany
            ? sanitizeSelfAssessmentNameField(a.auditCompany)
            : undefined,
        auditLocation: sanitizeSelfAssessmentNameField(a.auditLocation ?? ""),
        auditRepresentatives: sanitizeSelfAssessmentNameField(
            a.auditRepresentatives ?? "",
            SELF_ASSESSMENT_REP_MAX
        ),
        contactEmail: sanitizeSelfAssessmentEmail(a.contactEmail ?? ""),
        auditScope: sanitizeSelfAssessmentScope(a.auditScope ?? ""),
        email: a.email ? sanitizeSelfAssessmentEmail(a.email) : undefined,
        questions: (a.questions ?? []).map(sanitizeSelfAssessmentQuestion),
    };
}
