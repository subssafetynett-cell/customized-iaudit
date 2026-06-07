import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ASSIGNEE_NOT_FOUND_MESSAGE =
    "User does not exist. Please create the user.";

export function isValidAssigneeEmail(email: string) {
    return EMAIL_RE.test(email.trim());
}

type LookupResult = {
    found: boolean;
    name?: string;
    email?: string;
};

type NotifyPayload = {
    assignToEmail: string;
    assignToName: string;
    findingRef: string;
    findingType?: string;
    assignment?: {
        source: "clause" | "checklist" | "process";
        key: string;
    };
};

export function useAssigneeEmailLookup(planId?: string | number) {
    const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
    const notifiedRef = useRef<Set<string>>(new Set());
    const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const clearFieldError = useCallback((fieldKey: string) => {
        setEmailErrors((prev) => {
            if (!prev[fieldKey]) return prev;
            const next = { ...prev };
            delete next[fieldKey];
            return next;
        });
    }, []);

    const lookupUserByEmail = useCallback(async (email: string): Promise<LookupResult | null> => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) return { found: false };
        if (!isValidAssigneeEmail(trimmed)) return null;

        const res = await apiFetch(
            `/users/lookup-by-email?email=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok) return null;
        return res.json();
    }, []);

    const notifyAssignment = useCallback(
        async (fieldKey: string, payload: NotifyPayload) => {
            if (!planId) return;
            const email = payload.assignToEmail.trim().toLowerCase();
            if (!email || !isValidAssigneeEmail(email)) return;

            const notifyKey = `${fieldKey}::${email}`;
            if (notifiedRef.current.has(notifyKey)) return;

            try {
                const res = await apiFetch(`/audit-plans/${planId}/notify-finding-assignment`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                if (!res.ok) return;
                notifiedRef.current.add(notifyKey);
                toast.success(
                    `Finding assigned to ${payload.assignToName || email}. They can complete it from Findings.`,
                );
            } catch {
                // Non-blocking — assignment still saved locally
            }
        },
        [planId],
    );

    const handleAssigneeEmailChange = useCallback(
        (
            fieldKey: string,
            rawEmail: string,
            onEmailChange: (email: string) => void,
            onNameChange: (name: string) => void,
            notifyMeta?: Omit<NotifyPayload, "assignToEmail" | "assignToName">,
        ) => {
            onEmailChange(rawEmail);
            const trimmed = rawEmail.trim();

            if (debounceTimers.current[fieldKey]) {
                clearTimeout(debounceTimers.current[fieldKey]);
            }

            if (!trimmed) {
                clearFieldError(fieldKey);
                onNameChange("");
                return;
            }

            if (!isValidAssigneeEmail(trimmed)) {
                setEmailErrors((prev) => ({
                    ...prev,
                    [fieldKey]: "Please enter a valid email address",
                }));
                onNameChange("");
                return;
            }

            debounceTimers.current[fieldKey] = setTimeout(async () => {
                try {
                    const result = await lookupUserByEmail(trimmed);
                    if (!result) {
                        setEmailErrors((prev) => ({
                            ...prev,
                            [fieldKey]: "Could not verify user. Try again.",
                        }));
                        onNameChange("");
                        return;
                    }

                    if (!result.found) {
                        setEmailErrors((prev) => ({
                            ...prev,
                            [fieldKey]: ASSIGNEE_NOT_FOUND_MESSAGE,
                        }));
                        onNameChange("");
                        return;
                    }

                    clearFieldError(fieldKey);
                    onNameChange(result.name || "");
                    onEmailChange(result.email || trimmed);

                    if (notifyMeta) {
                        await notifyAssignment(fieldKey, {
                            assignToEmail: result.email || trimmed,
                            assignToName: result.name || "",
                            ...notifyMeta,
                        });
                    }
                } catch {
                    setEmailErrors((prev) => ({
                        ...prev,
                        [fieldKey]: "Could not verify user. Try again.",
                    }));
                    onNameChange("");
                }
            }, 450);
        },
        [clearFieldError, lookupUserByEmail, notifyAssignment],
    );

    const getFieldError = useCallback(
        (fieldKey: string) => emailErrors[fieldKey] || "",
        [emailErrors],
    );

    const hasFieldError = useCallback(
        (fieldKey: string) => Boolean(emailErrors[fieldKey]),
        [emailErrors],
    );

    return {
        handleAssigneeEmailChange,
        getFieldError,
        hasFieldError,
        isValidAssigneeEmail,
    };
}
