import { useCallback, useEffect, useRef } from "react";
import { apiFetch, resolveApiUrl } from "@/lib/api";

type AutosavePayload = {
    planId: string | undefined;
    buildAuditData: () => Record<string, unknown>;
    enabled?: boolean;
    /** When any of these change, a debounced save is scheduled. */
    deps?: unknown[];
    /** Debounce idle time before autosave (ms). */
    debounceMs?: number;
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
 * - Saves ~1.5s after edits stop
 * - Re-saves if answers change during an in-flight PUT
 * - Flushes on tab hide, page unload, and React unmount (SPA navigation)
 */
export function useAuditExecutionAutosave({
    planId,
    buildAuditData,
    enabled = true,
    deps = [],
    debounceMs = 1500,
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
    const inFlightRef = useRef<Promise<boolean> | null>(null);
    const dirtyRef = useRef(false);
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;
    const planIdRef = useRef(planId);
    planIdRef.current = planId;

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

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
                const auditData = auditDataOverrides && attempt === 0
                    ? { ...buildRef.current(), ...auditDataOverrides }
                    : buildRef.current();
                const fingerprint = fingerprintAuditData(auditData);
                if (fingerprint === lastSavedFingerprintRef.current) {
                    dirtyRef.current = false;
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
                    const latest = fingerprintAuditData(buildRef.current());
                    if (latest !== lastSavedFingerprintRef.current || dirtyRef.current) {
                        continue;
                    }
                    return true;
                } catch (e) {
                    console.warn("Audit autosave error", e);
                    dirtyRef.current = true;
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
    }, []);

    const scheduleSave = useCallback(() => {
        if (!planIdRef.current || !enabledRef.current) return;
        dirtyRef.current = true;
        clearTimer();
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            void saveNow();
        }, Math.max(400, debounceMs));
    }, [debounceMs, saveNow]);

    /** Best-effort immediate persist (SPA leave / tab hide). */
    const flushSync = useCallback(() => {
        const id = planIdRef.current;
        if (!id || !enabledRef.current) return;
        clearTimer();
        const auditData = buildRef.current();
        const fingerprint = fingerprintAuditData(auditData);
        if (fingerprint === lastSavedFingerprintRef.current && !dirtyRef.current) return;
        dirtyRef.current = false;
        lastSavedFingerprintRef.current = fingerprint;
        putAuditDataKeepalive(id, auditData);
    }, []);

    // Debounce after edits.
    useEffect(() => {
        if (!planId || !enabled) return;
        scheduleSave();
        return clearTimer;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- deps provided by caller
    }, [planId, enabled, scheduleSave, ...deps]);

    // After hydrate / enable, treat current payload as already saved so we don't
    // immediately PUT identical data (and risk racing an empty pre-hydrate state).
    useEffect(() => {
        if (!planId || !enabled) {
            lastSavedFingerprintRef.current = "";
            dirtyRef.current = false;
            return;
        }
        lastSavedFingerprintRef.current = fingerprintAuditData(buildRef.current());
        dirtyRef.current = false;
    }, [planId, enabled]);

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
