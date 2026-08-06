import * as React from "react";

import { DatePickerInput } from "@/components/DatePickerInput";
import { parseFlexibleDateValue } from "@/lib/dateInput";
import {
  mergeTitleCaseBlurHandler,
  mergeTitleCaseChangeHandler,
  shouldApplyTitleCaseToField,
} from "@/lib/titleCaseInput";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
  /** Set to false to disable automatic Title Case formatting. */
  titleCase?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, onChange, onBlur, titleCase, ...props }, ref) => {
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

    const applyTitleCase = shouldApplyTitleCaseToField({
      type,
      inputMode: props.inputMode,
      autoComplete: props.autoComplete,
      readOnly: props.readOnly,
      disabled: props.disabled,
      titleCase,
      className,
      name: props.name,
      id: props.id,
      maxLength: props.maxLength,
    });

    const handleChange = mergeTitleCaseChangeHandler(onChange, applyTitleCase, false);
    const handleBlur = mergeTitleCaseBlurHandler(onBlur, onChange, applyTitleCase, false);

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
