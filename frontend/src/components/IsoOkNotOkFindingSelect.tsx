import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { normalizeOkNotOkFindingValue } from "@/data/auditTemplates";
import { cn } from "@/lib/utils";

type Props = {
    value?: string | null;
    onChange: (value: "OK" | "NC") => void;
    disabled?: boolean;
    className?: string;
    /** Compact trigger for dense table cells */
    compact?: boolean;
};

/**
 * ISO checklist finding control: OK / Not OK.
 * Not OK is persisted as NC so findings inbox / CAPA treat it as a nonconformance.
 */
export function IsoOkNotOkFindingSelect({
    value,
    onChange,
    disabled,
    className,
    compact,
}: Props) {
    const selectValue = normalizeOkNotOkFindingValue(value);

    return (
        <Select
            value={selectValue || undefined}
            onValueChange={(v) => onChange(v as "OK" | "NC")}
            disabled={disabled}
        >
            <SelectTrigger
                className={cn(
                    compact
                        ? "h-9 w-full min-w-[118px] max-w-[160px] mx-auto text-xs font-semibold"
                        : "h-10 w-full min-w-[140px] text-sm font-semibold",
                    selectValue === "OK" &&
                        "border-emerald-300 bg-emerald-50 text-emerald-800",
                    selectValue === "NC" &&
                        "border-red-300 bg-red-50 text-red-800",
                    className,
                )}
                aria-label="Finding: OK or Not OK"
            >
                <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="OK" className="font-semibold text-emerald-700">
                    OK
                </SelectItem>
                <SelectItem value="NC" className="font-semibold text-red-700">
                    Not OK
                </SelectItem>
            </SelectContent>
        </Select>
    );
}
