import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditableFindingsFieldProps {
  inputId: string;
  label: string;
  value: string;
  onLabelChange: (label: string) => void;
  onValueChange: (value: string) => void;
  onDelete: () => void;
  placeholder?: string;
  multiline?: boolean;
}

export function EditableFindingsField({
  inputId,
  label,
  value,
  onLabelChange,
  onValueChange,
  onDelete,
  placeholder,
  multiline = false,
}: EditableFindingsFieldProps) {
  return (
    <div className="flex gap-2 items-start group rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50/60 p-2 -mx-2 transition-colors">
      <div className="flex-1 space-y-2 min-w-0">
        <Input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          aria-label={`Label for ${inputId}`}
          className="h-8 text-xs font-semibold uppercase tracking-wide text-slate-600 border-dashed border-slate-300 bg-white"
        />
        {multiline ? (
          <Textarea
            id={inputId}
            rows={4}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onValueChange(e.target.value)}
            className="resize-none"
          />
        ) : (
          <Input
            id={inputId}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onValueChange(e.target.value)}
          />
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-600 mt-1"
        onClick={onDelete}
        title="Remove field"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
