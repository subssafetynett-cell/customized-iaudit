import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    useOrgAssigneeSuggestions,
    type OrgAssigneeSuggestion,
} from "@/hooks/useOrgAssigneeSuggestions";

type AssigneeEmailFieldsProps = {
    fieldKey: string;
    email: string;
    name: string;
    onEmailChange: (email: string) => void;
    onNameChange: (name: string) => void;
    onEmailInput: (
        fieldKey: string,
        email: string,
        onEmailChange: (email: string) => void,
        onNameChange: (name: string) => void,
        notifyMeta?: {
            findingRef: string;
            findingType?: string;
            assignment?: {
                source: "clause" | "checklist" | "process";
                key: string;
            };
        },
    ) => void;
    error?: string;
    layout?: "stacked" | "inline" | "table-cell";
    emailFirst?: boolean;
    findingRef?: string;
    findingType?: string;
    assignmentSource?: "clause" | "checklist" | "process";
    assignmentKey?: string;
};

export function AssigneeEmailFields({
    fieldKey,
    email,
    name,
    onEmailChange,
    onNameChange,
    onEmailInput,
    error,
    layout = "stacked",
    emailFirst = true,
    findingRef,
    findingType,
    assignmentSource,
    assignmentKey,
}: AssigneeEmailFieldsProps) {
    const listId = useId();
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const { suggestions, loading, ensureLoaded, search } = useOrgAssigneeSuggestions();

    const notifyMeta =
        findingRef != null
            ? {
                  findingRef,
                  findingType,
                  assignment:
                      assignmentSource && assignmentKey
                          ? { source: assignmentSource, key: assignmentKey }
                          : undefined,
              }
            : undefined;

    const showLabels = layout === "stacked" || layout === "inline";

    useEffect(() => {
        const onDocMouseDown = (e: MouseEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, []);

    const applySuggestion = (user: OrgAssigneeSuggestion) => {
        setOpen(false);
        // Prefill name immediately from the Users list; lookup still validates/notifies.
        onNameChange(user.name);
        onEmailInput(fieldKey, user.email, onEmailChange, onNameChange, notifyMeta);
    };

    const emailField = (
        <div
            ref={wrapRef}
            className={cn(showLabels ? "space-y-2 min-w-0" : "min-w-0", "relative")}
        >
            {showLabels ? (
                <Label className="text-sm font-bold text-slate-700">Assign To (Email)</Label>
            ) : null}
            <Input
                type="text"
                inputMode="email"
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                placeholder="Search name or email..."
                value={email}
                onFocus={() => {
                    ensureLoaded();
                    search(email);
                    setOpen(true);
                }}
                onChange={(e) => {
                    const next = e.target.value;
                    setOpen(true);
                    search(next);
                    onEmailInput(fieldKey, next, onEmailChange, onNameChange, notifyMeta);
                }}
                className={cn(
                    layout === "table-cell"
                        ? "border-0 focus-visible:ring-0 rounded-none bg-transparent h-12 px-4 shadow-none text-sm"
                        : layout === "inline"
                          ? "bg-white border-slate-200 text-slate-900"
                          : "bg-white border-slate-200 text-slate-900",
                    error ? "border-red-500 focus-visible:ring-red-500 text-red-600 bg-red-50/40" : "",
                )}
            />
            {open ? (
                <div
                    id={listId}
                    role="listbox"
                    className={cn(
                        "absolute left-0 right-0 z-[80] mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg",
                        layout === "table-cell" ? "min-w-[260px]" : "",
                    )}
                >
                    {loading && suggestions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-500">Loading users…</p>
                    ) : suggestions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-500">
                            No matching users. Type a full email or invite them on Users.
                        </p>
                    ) : (
                        <ul className="py-1">
                            {suggestions.map((user) => (
                                <li key={user.id}>
                                    <button
                                        type="button"
                                        role="option"
                                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => applySuggestion(user)}
                                    >
                                        <span className="block text-sm font-semibold text-slate-900 truncate">
                                            {user.name}
                                        </span>
                                        <span className="block text-xs text-slate-500 truncate">
                                            {user.email}
                                            {user.role ? ` · ${user.role}` : ""}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
            {error && layout !== "table-cell" ? (
                <p className="text-[10px] text-red-500 font-bold mt-1">{error}</p>
            ) : null}
        </div>
    );

    const nameField = (
        <div className={showLabels ? "space-y-2 min-w-0" : "min-w-0"}>
            {showLabels ? (
                <Label className="text-sm font-bold text-slate-700">Assign To (Name)</Label>
            ) : null}
            <Input
                readOnly
                placeholder="Auto-filled from email"
                value={name}
                className={cn(
                    layout === "table-cell"
                        ? "border-0 focus-visible:ring-0 rounded-none bg-slate-50/80 h-12 px-4 shadow-none text-sm text-slate-700"
                        : "bg-slate-50 border-slate-200 text-slate-700 cursor-default",
                )}
            />
        </div>
    );

    if (layout === "table-cell") {
        return (
            <>
                {emailFirst ? emailField : nameField}
                {emailFirst ? nameField : emailField}
            </>
        );
    }

    if (layout === "inline") {
        return (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {emailFirst ? emailField : nameField}
                {emailFirst ? nameField : emailField}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {emailFirst ? emailField : nameField}
            {emailFirst ? nameField : emailField}
        </div>
    );
}
