import { useCallback, useEffect, useRef } from "react";
import { apiFetch, resolveApiUrl } from "@/lib/api";

type AutosavePayload = {
    planId: string | undefined;
    buildAuditData: () => Record<string, unknown>;
    enabled?: boolean;
    /** When any of these change, a debounced save is scheduled. */
    deps?: unknown[];
};

/**
 * Debounced PUT of auditData to the audit plan so progress survives refresh.
 */
export function useAuditExecutionAutosave({
    planId,
    buildAuditData,
    enabled = true,
    deps = [],
}: AutosavePayload) {
    const buildRef = useRef(buildAuditData);
    buildRef.current = buildAuditData;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastJsonRef = useRef<string>("");

    const saveNow = useCallback(async (): Promise<boolean> => {
        if (!planId || !enabled) return false;
        const auditData = buildRef.current();
        const json = JSON.stringify(auditData);
        if (json === lastJsonRef.current) return true;
        lastJsonRef.current = json;
        try {
            const res = await apiFetch(`/audit-plans/${planId}`, {
                method: "PUT",
                body: JSON.stringify({ auditData }),
            });
            if (!res.ok) {
                console.warn("Audit autosave failed", await res.text());
                lastJsonRef.current = "";
                return false;
            }
            return true;
        } catch (e) {
            console.warn("Audit autosave error", e);
            lastJsonRef.current = "";
            return false;
        }
    }, [planId, enabled]);

    useEffect(() => {
        if (!planId || !enabled) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            void saveNow();
        }, 2000);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [planId, enabled, saveNow, ...deps]);

    useEffect(() => {
        if (!planId || !enabled) return;
        const onBeforeUnload = () => {
            const auditData = buildRef.current();
            const json = JSON.stringify(auditData);
            if (json === lastJsonRef.current) return;
            const token = localStorage.getItem("token");
            try {
                fetch(resolveApiUrl(`/audit-plans/${planId}`), {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
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
