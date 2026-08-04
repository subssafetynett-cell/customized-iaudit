import { useCallback, useEffect, useRef } from "react";
import { apiFetch, resolveApiUrl } from "@/lib/api";
import {
    countAuditDataAnswers,
    mergeAuditDataPreferRicher,
} from "@/lib/auditPlanModules";
import {
    clearAuditExecuteDraft,
    saveAuditExecuteDraft,
} from "@/lib/auditExecuteDraft";

type AutosavePayload = {
    planId: string | undefined;
    buildAuditData: () => Record<string, unknown>;
    enabled?: boolean;
    /** When any of these change, a debounced save is scheduled. */
    deps?: unknown[];
    /** Debounce idle time before autosave (ms). */
    debounceMs?: number;
    /**
     * Known-good auditData from the server (hydrate). Autosave will never
     * persist a payload that drops answers below this baseline.
     */
    baselineAuditData?: Record<string, unknown> | null;
};

/** Ignore volatile timestamps so unchanged answers don't re-PUT. */
export function fingerprintAuditData(auditData: Record<string, unknown>): string {
    const { lastSaved: _ls, completedAt: _ca, ...rest } = auditData;
    return JSON.stringify(rest);
}

export type AuditAutosaveResult = {
    status?: string;
    progress?: number;
    auditCompleted?: boolean;
    updatedAt?: string;
    /** Exact payload that was persisted — callers must update React Query cache with this. */
    auditData: Record<string, unknown>;
};

function putAuditDataKeepalive(planId: string, auditData: Record<string, unknown>) {
    try {
        void fetch(resolveApiUrl(`/audit-plans/${planId}`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ auditData }),
            keepalive: true,
        });
    } catch {
        /* ignore — best-effort flush on leave */
    }
}

/**
 * Debounced PUT of auditData so perform-audit progress survives refresh / navigation.
 * - Saves ~0.8s after edits stop
 * - Writes a local draft on every dirty change (survives crash / failed network)
 * - Never overwrites richer saved answers with an emptier payload
 * - Re-saves if answers change during an in-flight PUT
 * - Flushes on tab hide, page unload, and React unmount (SPA navigation)
 */
export function useAuditExecutionAutosave({
    planId,
    buildAuditData,
    enabled = true,
    deps = [],
    debounceMs = 800,
    baselineAuditData = null,
    onSaved,
}: AutosavePayload & {
    onSaved?: (result: AuditAutosaveResult) => void;
}) {
    const buildRef = useRef(buildAuditData);
    buildRef.current = buildAuditData;
    const onSavedRef = useRef(onSaved);
    onSavedRef.current = onSaved;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Fingerprint of last successfully persisted payload. */
    const lastSavedFingerprintRef = useRef<string>("");
    /** Richest auditData we have seen (hydrate baseline ∪ last successful save). */
    const lastGoodAuditDataRef = useRef<Record<string, unknown> | null>(null);
    const inFlightRef = useRef<Promise<boolean> | null>(null);
    const dirtyRef = useRef(false);
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;
    const planIdRef = useRef(planId);
    planIdRef.current = planId;
    /** Skip the first schedule after enable — that would re-PUT hydrate data. */
    const skipNextScheduleRef = useRef(false);

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    /** Merge with last-good so we never drop checklist / module answers on save. */
    const protectPayload = useCallback((raw: Record<string, unknown>): Record<string, unknown> => {
        const baseline = lastGoodAuditDataRef.current;
        if (!baseline) return raw;
        const rawCount = countAuditDataAnswers(raw);
        const goodCount = countAuditDataAnswers(baseline);
        if (rawCount >= goodCount) {
            // Still merge module store so sibling modules are never dropped.
            return mergeAuditDataPreferRicher(baseline, raw);
        }
        // Incoming is emptier — keep richer answers from last good.
        console.warn(
            "[autosave] Refusing emptier auditData payload",
            { rawCount, goodCount },
        );
        return mergeAuditDataPreferRicher(baseline, raw);
    }, []);

    const persistLocalDraft = useCallback((auditData: Record<string, unknown>) => {
        const id = planIdRef.current;
        if (!id) return;
        saveAuditExecuteDraft(id, auditData);
    }, []);

    const saveNow = useCallback(async (
        auditDataOverrides?: Record<string, unknown>,
    ): Promise<boolean> => {
        const id = planIdRef.current;
        if (!id || !enabledRef.current) return false;

        // Coalesce overlapping saves (upload + typing).
        if (inFlightRef.current) {
            await inFlightRef.current;
        }

        const run = async (): Promise<boolean> => {
            let ok = true;
            // Loop so edits made during a PUT are not lost.
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const built = auditDataOverrides && attempt === 0
                    ? { ...buildRef.current(), ...auditDataOverrides }
                    : buildRef.current();
                const auditData = protectPayload(built);
                // Always keep a local draft before/while talking to the server.
                persistLocalDraft(auditData);
                const fingerprint = fingerprintAuditData(auditData);
                if (fingerprint === lastSavedFingerprintRef.current) {
                    dirtyRef.current = false;
                    clearAuditExecuteDraft(id);
                    return ok;
                }
                dirtyRef.current = false;
                try {
                    const res = await apiFetch(`/audit-plans/${id}`, {
                        method: "PUT",
                        body: JSON.stringify({ auditData }),
                    });
                    if (!res.ok) {
                        console.warn("Audit autosave failed", await res.text());
                        dirtyRef.current = true;
                        persistLocalDraft(auditData);
                        ok = false;
                        // One retry after a short pause on server/network errors.
                        if (attempt < 2) {
                            await new Promise((r) => setTimeout(r, 600));
                            continue;
                        }
                        return false;
                    }
                    const body = await res.json().catch(() => ({}));
                    lastSavedFingerprintRef.current = fingerprint;
                    lastGoodAuditDataRef.current = mergeAuditDataPreferRicher(
                        lastGoodAuditDataRef.current,
                        auditData,
                    );
                    clearAuditExecuteDraft(id);
                    if (body && typeof body === "object") {
                        onSavedRef.current?.({
                            status: typeof body.status === "string" ? body.status : undefined,
                            progress: typeof body.progress === "number" ? body.progress : undefined,
                            auditCompleted:
                                typeof body.auditCompleted === "boolean"
                                    ? body.auditCompleted
                                    : undefined,
                            updatedAt:
                                typeof body.updatedAt === "string"
                                    ? body.updatedAt
                                    : body.updatedAt != null
                                      ? String(body.updatedAt)
                                      : undefined,
                            auditData,
                        });
                    }
                    // If the user edited while this PUT was in flight, save again.
                    const latest = fingerprintAuditData(
                        protectPayload(buildRef.current()),
                    );
                    if (latest !== lastSavedFingerprintRef.current || dirtyRef.current) {
                        continue;
                    }
                    return true;
                } catch (e) {
                    console.warn("Audit autosave error", e);
                    dirtyRef.current = true;
                    persistLocalDraft(auditData);
                    ok = false;
                    if (attempt < 2) {
                        await new Promise((r) => setTimeout(r, 600));
                        continue;
                    }
                    return false;
                }
            }
            return ok;
        };

        const promise = run();
        inFlightRef.current = promise.finally(() => {
            if (inFlightRef.current === promise) inFlightRef.current = null;
        });
        return promise;
    }, [protectPayload, persistLocalDraft]);

    const scheduleSave = useCallback(() => {
        if (!planIdRef.current || !enabledRef.current) return;
        if (skipNextScheduleRef.current) {
            skipNextScheduleRef.current = false;
            return;
        }
        dirtyRef.current = true;
        // Snapshot immediately so a crash before debounce still has answers.
        try {
            persistLocalDraft(protectPayload(buildRef.current()));
        } catch {
            /* ignore */
        }
        clearTimer();
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            void saveNow();
        }, Math.max(400, debounceMs));
    }, [debounceMs, saveNow, persistLocalDraft, protectPayload]);

    /** Best-effort immediate persist (SPA leave / tab hide). */
    const flushSync = useCallback(() => {
        const id = planIdRef.current;
        if (!id || !enabledRef.current) return;
        clearTimer();
        const auditData = protectPayload(buildRef.current());
        const fingerprint = fingerprintAuditData(auditData);
        if (fingerprint === lastSavedFingerprintRef.current && !dirtyRef.current) return;
        // Always park a local draft — keepalive may not complete.
        persistLocalDraft(auditData);
        // Never flush an emptier blob than what we already know is good.
        if (
            lastGoodAuditDataRef.current &&
            countAuditDataAnswers(auditData) <
                countAuditDataAnswers(lastGoodAuditDataRef.current)
        ) {
            const protectedData = mergeAuditDataPreferRicher(
                lastGoodAuditDataRef.current,
                auditData,
            );
            persistLocalDraft(protectedData);
            // Keep dirty=true until a successful awaited save acknowledges —
            // only update last-good so the next mount can restore.
            lastGoodAuditDataRef.current = protectedData;
            putAuditDataKeepalive(id, protectedData);
            return;
        }
        lastGoodAuditDataRef.current = mergeAuditDataPreferRicher(
            lastGoodAuditDataRef.current,
            auditData,
        );
        // Do not clear dirty / fingerprint as "saved" — keepalive is unverified.
        // Local draft + server merge protect against loss; next session reconciles.
        putAuditDataKeepalive(id, auditData);
    }, [protectPayload, persistLocalDraft]);

    // Keep hydrate baseline as the floor for answer protection.
    useEffect(() => {
        if (!baselineAuditData || typeof baselineAuditData !== "object") return;
        lastGoodAuditDataRef.current = mergeAuditDataPreferRicher(
            lastGoodAuditDataRef.current,
            baselineAuditData,
        );
    }, [baselineAuditData]);

    // After hydrate / enable, treat current payload as already saved so we don't
    // immediately PUT identical data (and risk racing an empty pre-hydrate state).
    // MUST run before the schedule-save effect so the first tick is skipped.
    useEffect(() => {
        if (!planId || !enabled) {
            lastSavedFingerprintRef.current = "";
            dirtyRef.current = false;
            return;
        }
        const seeded = protectPayload(buildRef.current());
        lastSavedFingerprintRef.current = fingerprintAuditData(seeded);
        lastGoodAuditDataRef.current = mergeAuditDataPreferRicher(
            lastGoodAuditDataRef.current,
            seeded,
        );
        dirtyRef.current = false;
        // The enable+deps effects also fire — ignore that first schedule.
        skipNextScheduleRef.current = true;
    }, [planId, enabled, protectPayload]);

    // Debounce after edits (skip the immediate post-enable tick).
    useEffect(() => {
        if (!planId || !enabled) return;
        scheduleSave();
        return clearTimer;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- deps provided by caller
    }, [planId, enabled, scheduleSave, ...deps]);

    // Flush when leaving the page / switching tabs / SPA unmount.
    useEffect(() => {
        if (!planId || !enabled) return;

        const onHide = () => {
            if (document.visibilityState === "hidden") flushSync();
        };
        const onPageHide = () => flushSync();
        const onBeforeUnload = () => flushSync();

        document.addEventListener("visibilitychange", onHide);
        window.addEventListener("pagehide", onPageHide);
        window.addEventListener("beforeunload", onBeforeUnload);

        return () => {
            document.removeEventListener("visibilitychange", onHide);
            window.removeEventListener("pagehide", onPageHide);
            window.removeEventListener("beforeunload", onBeforeUnload);
            // React Router navigates away — persist pending answers.
            flushSync();
        };
    }, [planId, enabled, flushSync]);

    return { saveNow, flushSync };
}
