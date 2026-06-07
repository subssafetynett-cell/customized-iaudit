import { MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { InviteAuditeeSiteOption } from "@/components/InviteAuditeeModal";

interface AuditeeSiteMultiSelectProps {
    sites: InviteAuditeeSiteOption[];
    selectedSiteIds: string[];
    onChange: (siteIds: string[]) => void;
    disabledSiteIds?: ReadonlySet<string>;
    emptyMessage?: string;
}

export function AuditeeSiteMultiSelect({
    sites,
    selectedSiteIds,
    onChange,
    disabledSiteIds,
    emptyMessage = "No sites available",
}: AuditeeSiteMultiSelectProps) {
    const toggleSite = (siteId: string, checked: boolean) => {
        if (disabledSiteIds?.has(siteId)) return;
        if (checked) {
            onChange([...new Set([...selectedSiteIds, siteId])]);
            return;
        }
        onChange(selectedSiteIds.filter((id) => id !== siteId));
    };

    if (sites.length === 0) {
        return (
            <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
            {sites.map((site) => {
                const disabled = disabledSiteIds?.has(site.id) ?? false;
                const checked = selectedSiteIds.includes(site.id);
                return (
                    <label
                        key={site.id}
                        className={cn(
                            "flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50",
                            disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                        )}
                    >
                        <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(value) => toggleSite(site.id, value === true)}
                            className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {site.name}
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5">
                                {site.companyName}
                                {disabled ? " · assigned to another auditee" : ""}
                            </span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

export function AuditeeSiteSelectionSummary({
    count,
    label = "site",
}: {
    count: number;
    label?: string;
}) {
    if (count === 0) return null;
    return (
        <p className="text-xs text-slate-500">
            {count} {count === 1 ? label : `${label}s`} selected
        </p>
    );
}
