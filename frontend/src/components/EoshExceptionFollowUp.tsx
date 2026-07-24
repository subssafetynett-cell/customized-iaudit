import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export type EoshOrgUserOption = {
  id: number;
  label: string;
  email: string;
};

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
};

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

function UserSelect({
  label,
  valueEmail,
  users,
  disabled,
  placeholder,
  onSelect,
}: {
  label: string;
  valueEmail?: string;
  users: EoshOrgUserOption[];
  disabled?: boolean;
  placeholder: string;
  onSelect: (user: EoshOrgUserOption | null) => void;
}) {
  const currentEmail = (valueEmail || "").trim().toLowerCase();
  const selected = users.find((u) => u.email.toLowerCase() === currentEmail);
  const selectValue = selected ? String(selected.id) : "__none__";

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-slate-700">{label}</Label>
      <Select
        value={selectValue}
        disabled={disabled}
        onValueChange={(val) => {
          if (val === "__none__") {
            onSelect(null);
            return;
          }
          const user = users.find((u) => String(u.id) === val) ?? null;
          onSelect(user);
        }}
      >
        <SelectTrigger className="h-9 bg-white border-slate-300 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          <SelectItem value="__none__">— Select user —</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={String(u.id)}>
              {u.label}
              {u.email ? ` (${u.email})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
}: {
  values: EoshExceptionFollowUpValues;
  users: EoshOrgUserOption[];
  disabled?: boolean;
  className?: string;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4",
        className,
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UserSelect
          label="Raised by"
          valueEmail={values.raisedByEmail}
          users={users}
          disabled={disabled}
          placeholder="Select who raised this…"
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
          onSelect={(user) => {
            onChange("assignTo", user?.label || "");
            onChange("assignToName", user?.label || "");
            onChange("assignToEmail", user?.email || "");
          }}
        />
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">Target date</Label>
          <Input
            type="date"
            disabled={disabled}
            className="h-9 bg-white border-slate-300"
            value={values.targetDate || ""}
            onChange={(e) => onChange("targetDate", e.target.value)}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-amber-200/80 space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-800">
          Escalation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UserSelect
            label="Escalation to"
            valueEmail={values.escalationToEmail}
            users={users}
            disabled={disabled}
            placeholder="Select escalation contact…"
            onSelect={(user) => {
              onChange("escalationTo", user?.label || "");
              onChange("escalationToName", user?.label || "");
              onChange("escalationToEmail", user?.email || "");
            }}
          />
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Escalation date
            </Label>
            <Input
              type="date"
              disabled={disabled}
              className="h-9 bg-white border-slate-300"
              value={values.escalationDate || ""}
              onChange={(e) => onChange("escalationDate", e.target.value)}
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
