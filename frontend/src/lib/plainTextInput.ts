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
    /**
     * Collapse/trim whitespace (for persist). Default false so spacebar works while typing.
     */
    normalizeWhitespace?: boolean;
};

/** Normalize a single-line field when saving (not on each keystroke). */
function normalizeSavedLine(s: string): string {
    return s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
}

/** Normalize a multiline field when saving (not on each keystroke). */
function normalizeSavedMultiline(s: string): string {
    return s
        .split("\n")
        .map((line) => line.replace(/[^\S\r\n]+/g, " ").trimEnd())
        .join("\n")
        .trim();
}

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
        // While typing: keep line breaks, but normalize whitespace runs inside each line.
        // Do NOT trim line endings here (spacebar needs to work).
        s = s
            .split("\n")
            .map((line) => line.replace(/[^\S\r\n]+/g, " "))
            .join("\n");
        // Keep long blank sections reasonable even while typing.
        s = s.replace(/\n{4,}/g, "\n\n\n");
        if (opts.normalizeWhitespace) {
            // When saving/persisting: trim edge whitespace (including trailing spaces on lines).
            s = normalizeSavedMultiline(s);
        }
    } else {
        // Single-line inputs: block line breaks/tabs.
        // Preserve spaces while typing (spacebar UX), but collapse internal repeated spaces.
        s = s.replace(/[\r\n\t]+/g, " ");
        if (opts.normalizeWhitespace) {
            s = normalizeSavedLine(s);
        } else {
            // Collapses runs like "hello   world" -> "hello world",
            // but keeps trailing spaces at end-of-input so repeated space presses still change the value.
            s = s.replace(/ {2,}(?=\S)/g, " ");
        }
    }

    if (s.length > maxLen) {
        s = s.slice(0, maxLen);
    }
    return s;
}

export function sanitizeGapAnalysisMultiline(value: string, forSave = false): string {
    return sanitizePlainTextInput(value, {
        preserveNewlines: true,
        maxLen: GAP_ANALYSIS_MULTILINE_MAX,
        normalizeWhitespace: forSave,
    });
}

export function sanitizeGapAnalysisQuestionText(value: string, forSave = false): string {
    return sanitizePlainTextInput(value, {
        preserveNewlines: true,
        maxLen: GAP_ANALYSIS_QUESTION_MAX,
        normalizeWhitespace: forSave,
    });
}

export function sanitizeGapAnalysisShortField(value: string, forSave = false): string {
    return sanitizePlainTextInput(value, {
        maxLen: GAP_ANALYSIS_SHORT_MAX,
        normalizeWhitespace: forSave,
    });
}

export function sanitizeGapAnalysisField(value: string, forSave = false): string {
    return sanitizePlainTextInput(value, {
        maxLen: GAP_ANALYSIS_FIELD_MAX,
        normalizeWhitespace: forSave,
    });
}

export function sanitizeGapAnalysisLongField(value: string, forSave = false): string {
    return sanitizePlainTextInput(value, {
        maxLen: GAP_ANALYSIS_LONG_MAX,
        normalizeWhitespace: forSave,
    });
}

export function sanitizeAuditQuestion(q: AuditQuestion): AuditQuestion {
    return {
        ...q,
        text: sanitizeGapAnalysisQuestionText(q.text ?? "", true),
        actionPlan: sanitizeGapAnalysisMultiline(q.actionPlan ?? "", true),
        evidence: sanitizeGapAnalysisMultiline(q.evidence ?? "", true),
        evidenceImage: sanitizeEvidenceImageDataUrl(q.evidenceImage),
    };
}

export function sanitizeSavedGapAnalysis(analysis: SavedGapAnalysis): SavedGapAnalysis {
    return {
        ...analysis,
        companyName: sanitizeGapAnalysisShortField(analysis.companyName ?? "", true),
        location: sanitizeGapAnalysisShortField(analysis.location ?? "", true),
        representatives: sanitizeGapAnalysisLongField(analysis.representatives ?? "", true),
        auditorName: sanitizeGapAnalysisShortField(analysis.auditorName ?? "", true),
        contactEmail: sanitizeGapAnalysisField(analysis.contactEmail ?? "", true),
        scope: sanitizeGapAnalysisLongField(analysis.scope ?? "", true),
        auditCompany: sanitizeGapAnalysisField(analysis.auditCompany ?? "", true),
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
    maxLen: number = SELF_ASSESSMENT_NAME_MAX,
    forSave = false,
): string {
    let s = sanitizePlainTextInput(value, { maxLen, normalizeWhitespace: forSave });
    s = s.replace(/[`\\<>]/g, "");
    s = s.replace(/[^\p{L}\p{M}\p{N}\s\-'.,&()]/gu, "");
    if (forSave) {
        s = s.trim().replace(/\s+/g, " ");
    }
    return s;
}

/** Same rules as saved person names — use when matching drafts to org users. */
function normalizeSelfAssessmentPersonNameForMatchWithMax(value: string, maxLen: number): string {
    return sanitizeSelfAssessmentNameField(value, maxLen, true);
}

export function normalizeSelfAssessmentAuditorNameForMatch(value: string): string {
    return normalizeSelfAssessmentPersonNameForMatchWithMax(value, SELF_ASSESSMENT_NAME_MAX);
}

export function normalizeSelfAssessmentRepNameForMatch(value: string): string {
    return normalizeSelfAssessmentPersonNameForMatchWithMax(value, SELF_ASSESSMENT_REP_MAX);
}

export function sanitizeSelfAssessmentEmail(value: string): string {
    let s = sanitizePlainTextInput(value, { maxLen: SELF_ASSESSMENT_EMAIL_MAX });
    return s.replace(/[^\w.@+-]/g, "").toLowerCase();
}

export function sanitizeSelfAssessmentScope(value: string, forSave = false): string {
    let s = sanitizePlainTextInput(value, {
        preserveNewlines: true,
        maxLen: SELF_ASSESSMENT_SCOPE_MAX,
        normalizeWhitespace: forSave,
    });
    s = s.replace(/[^\p{L}\p{M}\p{N}\s\-'.,;:!?()/&%]/gu, "");
    return s;
}

export function sanitizeSelfAssessmentQuestionText(
    value: string,
    forSave = false,
    singleLine = false,
): string {
    let s = sanitizePlainTextInput(value, {
        preserveNewlines: !singleLine,
        maxLen: SELF_ASSESSMENT_QUESTION_MAX,
        normalizeWhitespace: forSave,
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
    /** Account that created this assessment (server-enforced). */
    createdByUserId?: number;
    userId?: number;
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
        clause: sanitizeSelfAssessmentNameField(q.clause ?? "", 120, true),
        text: sanitizeSelfAssessmentQuestionText(q.text ?? "", true),
    };
}

export function sanitizeSavedSelfAssessment(a: SelfAssessmentRecord): SelfAssessmentRecord {
    return {
        ...a,
        companyName: sanitizeSelfAssessmentNameField(a.companyName ?? "", SELF_ASSESSMENT_NAME_MAX, true),
        auditorName: sanitizeSelfAssessmentNameField(a.auditorName ?? "", SELF_ASSESSMENT_NAME_MAX, true),
        auditorPosition: sanitizeSelfAssessmentNameField(a.auditorPosition ?? "", SELF_ASSESSMENT_NAME_MAX, true),
        auditCompany: a.auditCompany
            ? sanitizeSelfAssessmentNameField(a.auditCompany, SELF_ASSESSMENT_NAME_MAX, true)
            : undefined,
        auditLocation: sanitizeSelfAssessmentNameField(a.auditLocation ?? "", SELF_ASSESSMENT_NAME_MAX, true),
        auditRepresentatives: sanitizeSelfAssessmentNameField(
            a.auditRepresentatives ?? "",
            SELF_ASSESSMENT_REP_MAX,
            true,
        ),
        contactEmail: sanitizeSelfAssessmentEmail(a.contactEmail ?? "").trim(),
        auditScope: sanitizeSelfAssessmentScope(a.auditScope ?? "", true),
        email: a.email ? sanitizeSelfAssessmentEmail(a.email).trim() : undefined,
        questions: (a.questions ?? []).map(sanitizeSelfAssessmentQuestion),
    };
}
