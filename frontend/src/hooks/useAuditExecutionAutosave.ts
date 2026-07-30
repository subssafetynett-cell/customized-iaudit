import { useCallback, useEffect, useRef } from "react";
import { apiFetch, resolveApiUrl } from "@/lib/api";

type AutosavePayload = {
    planId: string | undefined;
    buildAuditData: () => Record<string, unknown>;
    enabled?: boolean;
    /** When any of these change, a debounced save is scheduled. */
    deps?: unknown[];
};

/** Ignore volatile timestamps so unchanged answers don't re-PUT. */
function fingerprintAuditData(auditData: Record<string, unknown>): string {
    const { lastSaved: _ls, completedAt: _ca, ...rest } = auditData;
    return JSON.stringify(rest);
}

/**
 * Debounced PUT of auditData to the audit plan so progress survives refresh.
 */
export function useAuditExecutionAutosave({
    planId,
    buildAuditData,
    enabled = true,
    deps = [],
    onSaved,
}: AutosavePayload & {
    onSaved?: (result: {
        status?: string;
        progress?: number;
        auditCompleted?: boolean;
    }) => void;
}) {
    const buildRef = useRef(buildAuditData);
    buildRef.current = buildAuditData;
    const onSavedRef = useRef(onSaved);
    onSavedRef.current = onSaved;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastFingerprintRef = useRef<string>("");
    const inFlightRef = useRef<Promise<boolean> | null>(null);

    const saveNow = useCallback(async (
        auditDataOverrides?: Record<string, unknown>,
    ): Promise<boolean> => {
        if (!planId || !enabled) return false;

        // Coalesce overlapping saves (upload + typing).
        if (inFlightRef.current) {
            await inFlightRef.current;
        }

        const run = async (): Promise<boolean> => {
            const auditData = auditDataOverrides
                ? { ...buildRef.current(), ...auditDataOverrides }
                : buildRef.current();
            const fingerprint = fingerprintAuditData(auditData);
            if (fingerprint === lastFingerprintRef.current) return true;
            lastFingerprintRef.current = fingerprint;
            try {
                const res = await apiFetch(`/audit-plans/${planId}`, {
                    method: "PUT",
                    body: JSON.stringify({ auditData }),
                });
                if (!res.ok) {
                    console.warn("Audit autosave failed", await res.text());
                    lastFingerprintRef.current = "";
                    return false;
                }
                const body = await res.json().catch(() => ({}));
                if (body && typeof body === "object") {
                    onSavedRef.current?.({
                        status: typeof body.status === "string" ? body.status : undefined,
                        progress: typeof body.progress === "number" ? body.progress : undefined,
                        auditCompleted:
                            typeof body.auditCompleted === "boolean"
                                ? body.auditCompleted
                                : undefined,
                    });
                }
                return true;
            } catch (e) {
                console.warn("Audit autosave error", e);
                lastFingerprintRef.current = "";
                return false;
            }
        };

        const promise = run();
        inFlightRef.current = promise.finally(() => {
            if (inFlightRef.current === promise) inFlightRef.current = null;
        });
        return promise;
    }, [planId, enabled]);

    useEffect(() => {
        if (!planId || !enabled) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            void saveNow();
        }, 5000);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [planId, enabled, saveNow, ...deps]);

    useEffect(() => {
        if (!planId || !enabled) return;
        const onBeforeUnload = () => {
            const auditData = buildRef.current();
            const fingerprint = fingerprintAuditData(auditData);
            if (fingerprint === lastFingerprintRef.current) return;
            try {
                fetch(resolveApiUrl(`/audit-plans/${planId}`), {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ auditData }),
                    keepalive: true,
                });
            } catch {
                /* ignore */
            }
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [planId, enabled]);

    return { saveNow };
}
