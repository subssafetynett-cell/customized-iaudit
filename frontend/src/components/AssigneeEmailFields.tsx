import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

    const emailField = (
        <div className={showLabels ? "space-y-2 min-w-0" : "min-w-0"}>
            {showLabels ? (
                <Label className="text-sm font-bold text-slate-700">Assign To (Email)</Label>
            ) : null}
            <Input
                type="email"
                placeholder="Enter email..."
                value={email}
                onChange={(e) =>
                    onEmailInput(fieldKey, e.target.value, onEmailChange, onNameChange, notifyMeta)
                }
                className={cn(
                    layout === "table-cell"
                        ? "border-0 focus-visible:ring-0 rounded-none bg-transparent h-12 px-4 shadow-none text-sm"
                        : layout === "inline"
                          ? "bg-white border-slate-200 text-slate-900"
                          : "bg-white border-slate-200 text-slate-900",
                    error ? "border-red-500 focus-visible:ring-red-500 text-red-600 bg-red-50/40" : "",
                )}
            />
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
