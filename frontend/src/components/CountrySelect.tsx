import { useMemo, useState } from "react";
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
import { getWorldCountryByCode, WORLD_COUNTRIES } from "@/lib/worldCountries";

export interface CountrySelectProps {
    /** ISO 3166-1 alpha-2 code (e.g. IN, US). */
    value: string;
    onValueChange: (isoCode: string) => void;
    disabled?: boolean;
    error?: boolean;
    id?: string;
    placeholder?: string;
    className?: string;
}

export function CountrySelect({
    value,
    onValueChange,
    disabled = false,
    error = false,
    id,
    placeholder = "Select country",
    className,
}: CountrySelectProps) {
    const [open, setOpen] = useState(false);
    const selected = useMemo(() => getWorldCountryByCode(value), [value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Country"
                    disabled={disabled}
                    className={cn(
                        "h-10 w-full justify-between font-normal",
                        error && "border-red-500 focus:ring-red-500",
                        className,
                    )}
                >
                    {selected ? (
                        <span className="flex min-w-0 items-center gap-2 truncate">
                            <span className="text-base leading-none" aria-hidden>
                                {selected.flag}
                            </span>
                            <span className="truncate">{selected.name}</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start" sideOffset={4}>
                <Command shouldFilter>
                    <CommandInput placeholder="Search country..." />
                    <CommandList className="max-h-[280px]">
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                            {WORLD_COUNTRIES.map((country) => (
                                <CommandItem
                                    key={country.code}
                                    value={`${country.name} ${country.code}`}
                                    onSelect={() => {
                                        onValueChange(country.code);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                >
                                    <span className="mr-2 text-lg leading-none" aria-hidden>
                                        {country.flag}
                                    </span>
                                    <span className="flex-1 truncate">{country.name}</span>
                                    {value === country.code ? (
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
