import * as React from "react";

import { DatePickerInput } from "@/components/DatePickerInput";
import { parseFlexibleDateValue } from "@/lib/dateInput";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, value, onChange, ...props }, ref) => {
    if (type === "date") {
      const minDate =
        props.min != null && String(props.min).trim() !== ""
          ? parseFlexibleDateValue(String(props.min), "iso")
          : undefined;
      const maxDate =
        props.max != null && String(props.max).trim() !== ""
          ? parseFlexibleDateValue(String(props.max), "iso")
          : undefined;

      return (
        <DatePickerInput
          id={props.id}
          value={String(value ?? "")}
          onChange={(next) => {
            onChange?.({
              target: { value: next },
              currentTarget: { value: next },
            } as React.ChangeEvent<HTMLInputElement>);
          }}
          placeholder={props.placeholder ?? "Pick a date"}
          className={className}
          disabled={props.disabled || props.readOnly}
          minDate={minDate}
          maxDate={maxDate}
          aria-invalid={props["aria-invalid"]}
          aria-required={props["aria-required"]}
        />
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={value}
        onChange={onChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
