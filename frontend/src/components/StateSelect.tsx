import { useMemo, useState } from "react";
import { State } from "country-state-city";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface StateSelectProps {
    countryIso: string;
    value: string;
    onValueChange: (stateIso: string) => void;
    disabled?: boolean;
    error?: boolean;
    id?: string;
    placeholder?: string;
    className?: string;
}

export function StateSelect({
    countryIso,
    value,
    onValueChange,
    disabled = false,
    error = false,
    id,
    placeholder = "Select state",
    className,
}: StateSelectProps) {
    const [open, setOpen] = useState(false);
    const states = useMemo(
        () =>
            countryIso
                ? State.getStatesOfCountry(countryIso).sort((a, b) =>
                      a.name.localeCompare(b.name),
                  )
                : [],
        [countryIso],
    );
    const selected = useMemo(
        () => states.find((s) => s.isoCode === value),
        [states, value],
    );

    if (!countryIso || states.length === 0) {
        return null;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="State or province"
                    disabled={disabled}
                    className={cn(
                        "h-10 w-full justify-between font-normal",
                        error && "border-red-500 focus:ring-red-500",
                        className,
                    )}
                >
                    {selected ? (
                        <span className="truncate">{selected.name}</span>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start" sideOffset={4}>
                <Command shouldFilter>
                    <CommandInput placeholder="Search state..." />
                    <CommandList className="max-h-[280px]">
                        <CommandEmpty>No state found.</CommandEmpty>
                        <CommandGroup>
                            {states.map((state) => (
                                <CommandItem
                                    key={state.isoCode}
                                    value={`${state.name} ${state.isoCode}`}
                                    onSelect={() => {
                                        onValueChange(state.isoCode);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                >
                                    <span className="flex-1 truncate">{state.name}</span>
                                    {value === state.isoCode ? (
                                        <Check className="ml-2 h-4 w-4 shrink-0 text-[#00875B]" />
                                    ) : null}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
