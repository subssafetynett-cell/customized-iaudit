import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { formatUserDisplayName } from "@/lib/userRoles";
import { cn } from "@/lib/utils";

export type EoshExceptionFollowUpValues = {
  raisedBy?: string;
  raisedByEmail?: string;
  raisedByName?: string;
  assignTo?: string;
  assignToEmail?: string;
  assignToName?: string;
  targetDate?: string;
  escalationTo?: string;
  escalationToEmail?: string;
  escalationToName?: string;
  escalationDate?: string;
  /** Required free-text details when raising an exception / NC. */
  details?: string;
};

export type EoshOrgUserOption = {
  id: number;
  label: string;
  email: string;
};

export type EoshExceptionFollowUpField =
  | "raisedBy"
  | "assignTo"
  | "targetDate"
  | "details"
  | "escalationDate";

const REQUIRED_FIELD_LABELS: Record<EoshExceptionFollowUpField, string> = {
  raisedBy: "Raised by",
  assignTo: "Assign to",
  targetDate: "Target date",
  details: "Enter details",
  escalationDate: "Escalation date",
};

/** Local calendar date as `YYYY-MM-DD` (for `<input type="date" min>`). */
export function localTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when a `YYYY-MM-DD` value is strictly before today (local). */
export function isIsoDateBeforeToday(value: string | null | undefined): boolean {
  const v = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return v < localTodayIsoDate();
}

export function getEoshExceptionFollowUpMissing(
  values: EoshExceptionFollowUpValues | null | undefined,
): EoshExceptionFollowUpField[] {
  const v = values || {};
  const missing: EoshExceptionFollowUpField[] = [];
  if (!String(v.raisedByEmail || "").trim()) missing.push("raisedBy");
  if (!String(v.assignToEmail || "").trim()) missing.push("assignTo");
  const targetDate = String(v.targetDate || "").trim();
  if (!targetDate || isIsoDateBeforeToday(targetDate)) missing.push("targetDate");
  if (!String(v.details || "").trim()) missing.push("details");
  const escalationDate = String(v.escalationDate || "").trim();
  if (escalationDate && isIsoDateBeforeToday(escalationDate)) {
    missing.push("escalationDate");
  }
  return missing;
}

export function isEoshExceptionFollowUpComplete(
  values: EoshExceptionFollowUpValues | null | undefined,
): boolean {
  return getEoshExceptionFollowUpMissing(values).length === 0;
}

export function formatEoshExceptionFollowUpMissing(
  values: EoshExceptionFollowUpValues | null | undefined,
): string {
  const v = values || {};
  return getEoshExceptionFollowUpMissing(values)
    .map((key) => {
      if (key === "targetDate" && isIsoDateBeforeToday(v.targetDate)) {
        return "Target date (cannot be in the past)";
      }
      if (key === "escalationDate") {
        return "Escalation date (cannot be in the past)";
      }
      return REQUIRED_FIELD_LABELS[key];
    })
    .join(", ");
}

export function useEoshOrgUsers(): EoshOrgUserOption[] {
  const [users, setUsers] = useState<EoshOrgUserOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/users");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const options = list
          .map(
            (u: {
              id?: number | string;
              firstName?: string;
              lastName?: string;
              email?: string;
            }) => {
              const id = Number(u.id);
              const email = String(u.email || "").trim();
              const label =
                formatUserDisplayName(u) || email || `User #${id}`;
              return { id, label, email };
            },
          )
          .filter((o) => Number.isFinite(o.id) && o.id >= 1);
        if (!cancelled) setUsers(options);
      } catch {
        if (!cancelled) setUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return users;
}

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <Label className="text-xs font-bold text-slate-700">
      {children}
      <span className="text-red-600 ml-0.5" aria-hidden>
        *
      </span>
    </Label>
  );
}

function OptionalLabel({ children }: { children: ReactNode }) {
  return <Label className="text-xs font-bold text-slate-700">{children}</Label>;
}

function FieldError({ show, message = "Required" }: { show: boolean; message?: string }) {
  if (!show) return null;
  return <p className="text-[11px] font-medium text-red-600">{message}</p>;
}

function UserSelect({
  label,
  valueEmail,
  users,
  disabled,
  placeholder,
  invalid,
  required = true,
  onSelect,
}: {
  label: string;
  valueEmail?: string;
  users: EoshOrgUserOption[];
  disabled?: boolean;
  placeholder: string;
  invalid?: boolean;
  required?: boolean;
  onSelect: (user: EoshOrgUserOption | null) => void;
}) {
  const currentEmail = (valueEmail || "").trim().toLowerCase();
  const selected = users.find((u) => u.email.toLowerCase() === currentEmail);
  const selectValue = selected ? String(selected.id) : "";

  return (
    <div className="space-y-1.5">
      {required ? <RequiredLabel>{label}</RequiredLabel> : <OptionalLabel>{label}</OptionalLabel>}
      <Select
        value={selectValue || undefined}
        disabled={disabled}
        onValueChange={(val) => {
          const user = users.find((u) => String(u.id) === val) ?? null;
          onSelect(user);
        }}
      >
        <SelectTrigger
          className={cn(
            "h-9 bg-white border-slate-300 text-sm",
            invalid && "border-red-500 focus:ring-red-500",
          )}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {users.map((u) => (
            <SelectItem key={u.id} value={String(u.id)}>
              {u.label}
              {u.email ? ` (${u.email})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError show={Boolean(invalid)} />
    </div>
  );
}

/** Extra fields when Meet with Exceptions (1) or Non Compliance (0) is selected. */
export function EoshExceptionFollowUp({
  values,
  users,
  disabled,
  className,
  onChange,
  onAssignToSelect,
  showErrors = false,
}: {
  values: EoshExceptionFollowUpValues;
  users: EoshOrgUserOption[];
  disabled?: boolean;
  className?: string;
  onChange: (field: string, value: string) => void;
  /** Fired when Assign to user is chosen (or cleared). */
  onAssignToSelect?: (user: EoshOrgUserOption | null) => void;
  /** When true, highlight empty required fields. */
  showErrors?: boolean;
}) {
  const missing = new Set(getEoshExceptionFollowUpMissing(values));
  const minDate = localTodayIsoDate();
  const targetDatePast = isIsoDateBeforeToday(values.targetDate);
  const escalationDatePast = isIsoDateBeforeToday(values.escalationDate);
  const targetDateInvalid =
    targetDatePast || (showErrors && missing.has("targetDate"));
  const escalationDateInvalid = escalationDatePast;

  const setDateField = (field: "targetDate" | "escalationDate", raw: string) => {
    const next = String(raw || "").trim();
    // Block past dates from being stored (picker min + typed values).
    if (next && isIsoDateBeforeToday(next)) return;
    onChange(field, next);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4",
        showErrors && missing.size > 0 && "border-red-300",
        className,
      )}
    >
      <p className="text-[11px] text-slate-600">
        All fields marked <span className="text-red-600 font-bold">*</span> are required.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UserSelect
          label="Raised by"
          valueEmail={values.raisedByEmail}
          users={users}
          disabled={disabled}
          placeholder="Select who raised this…"
          invalid={showErrors && missing.has("raisedBy")}
          onSelect={(user) => {
            onChange("raisedBy", user?.label || "");
            onChange("raisedByName", user?.label || "");
            onChange("raisedByEmail", user?.email || "");
          }}
        />
        <UserSelect
          label="Assign to"
          valueEmail={values.assignToEmail}
          users={users}
          disabled={disabled}
          placeholder="Select assignee…"
          invalid={showErrors && missing.has("assignTo")}
          onSelect={(user) => {
            onChange("assignTo", user?.label || "");
            onChange("assignToName", user?.label || "");
            onChange("assignToEmail", user?.email || "");
            onAssignToSelect?.(user);
          }}
        />
        <div className="space-y-1.5">
          <RequiredLabel>Target date</RequiredLabel>
          <Input
            type="date"
            disabled={disabled}
            required
            min={minDate}
            aria-required
            aria-invalid={targetDateInvalid ? true : undefined}
            className={cn(
              "h-9 bg-white border-slate-300",
              targetDateInvalid && "border-red-500 focus-visible:ring-red-500",
            )}
            value={values.targetDate || ""}
            onChange={(e) => setDateField("targetDate", e.target.value)}
          />
          <FieldError
            show={Boolean(targetDateInvalid)}
            message={
              targetDatePast
                ? "Cannot be earlier than today"
                : "Required"
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <RequiredLabel>Enter details</RequiredLabel>
        <Textarea
          disabled={disabled}
          required
          aria-required
          aria-invalid={showErrors && missing.has("details") ? true : undefined}
          className={cn(
            "min-h-[96px] bg-white border-slate-300 text-sm resize-y",
            showErrors &&
              missing.has("details") &&
              "border-red-500 focus-visible:ring-red-500",
          )}
          placeholder="Describe the nonconformance / exception details…"
          value={values.details || ""}
          onChange={(e) => onChange("details", e.target.value)}
        />
        <FieldError show={showErrors && missing.has("details")} />
      </div>

      <div className="pt-2 border-t border-amber-200/80 space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-800">
          Escalation
        </h4>
        <p className="text-[11px] text-slate-500 -mt-1">Optional — fill if escalation is needed.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UserSelect
            label="Escalation to"
            valueEmail={values.escalationToEmail}
            users={users}
            disabled={disabled}
            required={false}
            placeholder="Select escalation contact…"
            onSelect={(user) => {
              onChange("escalationTo", user?.label || "");
              onChange("escalationToName", user?.label || "");
              onChange("escalationToEmail", user?.email || "");
            }}
          />
          <div className="space-y-1.5">
            <OptionalLabel>Escalation date</OptionalLabel>
            <Input
              type="date"
              disabled={disabled}
              min={minDate}
              aria-invalid={escalationDateInvalid ? true : undefined}
              className={cn(
                "h-9 bg-white border-slate-300",
                escalationDateInvalid && "border-red-500 focus-visible:ring-red-500",
              )}
              value={values.escalationDate || ""}
              onChange={(e) => setDateField("escalationDate", e.target.value)}
            />
            <FieldError
              show={Boolean(escalationDateInvalid)}
              message="Cannot be earlier than today"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function needsEoshExceptionFollowUp(score: "2" | "1" | "0" | ""): boolean {
  return score === "1" || score === "0";
}
