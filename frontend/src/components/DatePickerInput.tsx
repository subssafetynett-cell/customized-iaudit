import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DatePickerValueFormat,
  formatDatePickerValue,
  getDatePickerDisplayFormat,
  parseFlexibleDateValue,
} from "@/lib/dateInput";
import { cn } from "@/lib/utils";

export interface DatePickerInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  valueFormat?: DatePickerValueFormat;
  minDate?: Date;
  maxDate?: Date;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
}

export function DatePickerInput({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  valueFormat = "iso",
  minDate,
  maxDate,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const selected = parseFlexibleDateValue(value, valueFormat);
  const displayFormat = getDatePickerDisplayFormat(valueFormat);

  const stripTime = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const min = minDate ? stripTime(minDate) : undefined;
  const max = maxDate ? stripTime(maxDate) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
          className={cn(
            "w-full justify-start gap-2 text-left font-normal h-10 px-3",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex-1 truncate">
            {selected ? format(selected, displayFormat) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(formatDatePickerValue(date, valueFormat));
            setOpen(false);
          }}
          disabled={(date) => {
            const day = stripTime(date);
            if (min && day < min) return true;
            if (max && day > max) return true;
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
