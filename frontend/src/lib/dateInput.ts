import { format, isValid, parse } from "date-fns";

export type DatePickerValueFormat = "iso" | "display";

/** Parse stored date strings (`yyyy-MM-dd` or `dd/MM/yy`). */
export function parseFlexibleDateValue(
  value: string,
  valueFormat: DatePickerValueFormat = "iso",
): Date | undefined {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;

  const candidates =
    valueFormat === "iso"
      ? ["yyyy-MM-dd", "dd/MM/yy", "dd/MM/yyyy"]
      : ["dd/MM/yy", "dd/MM/yyyy", "yyyy-MM-dd"];

  for (const pattern of candidates) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed)) return parsed;
  }

  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : undefined;
}

export function formatDatePickerValue(
  date: Date,
  valueFormat: DatePickerValueFormat = "iso",
): string {
  return valueFormat === "iso"
    ? format(date, "yyyy-MM-dd")
    : format(date, "dd/MM/yy");
}

export function getDatePickerDisplayFormat(
  valueFormat: DatePickerValueFormat = "iso",
): string {
  return valueFormat === "iso" ? "MMM dd, yyyy" : "dd/MM/yy";
}
