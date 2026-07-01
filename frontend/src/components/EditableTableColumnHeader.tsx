import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditableTableColumnHeaderProps {
  label: string;
  onLabelChange: (label: string) => void;
  onDelete?: () => void;
  className?: string;
}

export function EditableTableColumnHeader({
  label,
  onLabelChange,
  onDelete,
  className,
}: EditableTableColumnHeaderProps) {
  return (
    <div className={`flex items-start gap-1 min-w-0 ${className || ""}`}>
      <Input
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        className="h-7 min-w-0 flex-1 text-xs font-bold text-slate-700 border-dashed border-slate-300 bg-white px-2"
      />
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-600"
          onClick={onDelete}
          title="Remove column"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
