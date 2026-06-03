import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import {
    DEFAULT_PHONE_COUNTRY_CODE,
    getDialForCountryCode,
    getPhoneCountryByCode,
    getPhonePlaceholder,
    PHONE_COUNTRIES,
} from "@/lib/phoneCountries";
import { PHONE_DIGITS_LENGTH } from "@/lib/validation";

export interface PhoneInputWithCountryCodeProps {
    /** ISO-style country code (e.g. IN, US). */
    countryCode?: string;
    onCountryCodeChange?: (code: string) => void;
    value: string;
    onChange: (nationalDigits: string) => void;
    disabled?: boolean;
    error?: boolean;
    id?: string;
    className?: string;
    inputClassName?: string;
    selectClassName?: string;
}

export function PhoneInputWithCountryCode({
    countryCode = DEFAULT_PHONE_COUNTRY_CODE,
    onCountryCodeChange,
    value,
    onChange,
    disabled = false,
    error = false,
    id,
    className,
    inputClassName,
    selectClassName,
}: PhoneInputWithCountryCodeProps) {
    const [open, setOpen] = useState(false);
    const selected = useMemo(
        () => getPhoneCountryByCode(countryCode) ?? PHONE_COUNTRIES.find((c) => c.code === DEFAULT_PHONE_COUNTRY_CODE),
        [countryCode],
    );
    const dial = getDialForCountryCode(countryCode);
    const placeholder = getPhonePlaceholder(countryCode);

    return (
        <div className={cn("flex gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-label="Country code"
                        disabled={disabled}
                        className={cn(
                            "h-11 w-[7.5rem] shrink-0 justify-between gap-1 rounded-lg border-[#E5E7EB] bg-[#F9FAFB] px-2.5 text-sm font-medium text-[#111827] hover:bg-[#F3F4F6] focus:ring-1 focus:ring-[#00875B]",
                            error && "border-red-500 focus:ring-red-500",
                            selectClassName,
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-1.5 truncate">
                            <span className="text-base leading-none" aria-hidden>
                                {selected?.flag}
                            </span>
                            <span className="truncate">{dial}</span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[min(100vw-2rem,22rem)] p-0"
                    align="start"
                    sideOffset={4}
                >
                    <Command shouldFilter>
                        <CommandInput placeholder="Search country..." />
                        <CommandList className="max-h-[280px]">
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                                {PHONE_COUNTRIES.map((country) => (
                                    <CommandItem
                                        key={country.code}
                                        value={`${country.name} ${country.dial} ${country.code}`}
                                        onSelect={() => {
                                            onCountryCodeChange?.(country.code);
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <span className="mr-2 text-lg leading-none" aria-hidden>
                                            {country.flag}
                                        </span>
                                        <span className="flex-1 truncate">{country.name}</span>
                                        <span className="ml-2 shrink-0 text-muted-foreground">
                                            {country.dial}
                                        </span>
                                        {countryCode === country.code ? (
                                            <Check className="ml-2 h-4 w-4 shrink-0 text-[#00875B]" />
                                        ) : null}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <Input
                id={id}
                type="tel"
                inputMode="numeric"
                maxLength={PHONE_DIGITS_LENGTH}
                placeholder={placeholder}
                value={value}
                disabled={disabled}
                onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, PHONE_DIGITS_LENGTH);
                    onChange(digits);
                }}
                className={cn(
                    "h-11 min-w-0 flex-1 rounded-lg border-[#E5E7EB] bg-[#F9FAFB] text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#00875B]",
                    error && "border-red-500 focus:ring-red-500",
                    inputClassName,
                )}
            />
        </div>
    );
}