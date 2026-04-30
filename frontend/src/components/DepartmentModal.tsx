import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Info, Briefcase, Pencil, ShieldAlert } from "lucide-react";
import { Department } from "@/types/company";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Partial<Department>;
    mode?: "create" | "edit";
    siteName?: string;
}

const STATUSES = ["Active", "Inactive"];
const MANAGERS = ["Manager 1", "Manager 2", "Manager 3"]; // Example managers

export default function DepartmentModal({ open, onClose, onSubmit, initialData, mode = "create", siteName }: Props) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [status, setStatus] = useState("Active");
    const [manager, setManager] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setName(initialData?.name || "");
            setCode(initialData?.code || "");
            setStatus(initialData?.status || "Active");
            setManager(initialData?.manager || "");
            setDescription(initialData?.description || "");
            setError("");
        }
    }, [open, initialData]);

    const handleSubmit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Department name is required");
            return;
        }
        onSubmit({
            name: trimmedName,
            code: code.trim(),
            status,
            manager,
            description: description.trim(),
        });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        {mode === "create" ? (
                            <>
                                <Users className="h-5 w-5 text-primary" />
                                Create New Department
                            </>
                        ) : (
                            <>
                                <Pencil className="h-5 w-5 text-primary" />
                                Edit Department
                            </>
                        )}
                    </DialogTitle>
                    {siteName && (
                        <p className="text-sm text-muted-foreground mt-1">
                            For site: <span className="font-medium text-foreground">{siteName}</span>
                        </p>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 py-4 space-y-8">
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary mt-0.5" />
                        <p className="text-sm text-primary leading-relaxed font-medium">
                            Fill in the details to {mode === "create" ? "create a new" : "update the"} department
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dept-name">Department Name *</Label>
                                <Input
                                    id="dept-name"
                                    placeholder="e.g. Operations"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setError(""); }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dept-code">Department Code</Label>
                                <div className="space-y-1">
                                    <Input
                                        id="dept-code"
                                        placeholder="e.g. OPS-001"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                    />
                                    <p className="text-[11px] text-muted-foreground ml-1">Unique code</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dept-status">Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger id="dept-status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dept-manager">Department Manager</Label>
                                <Select value={manager} onValueChange={setManager}>
                                    <SelectTrigger id="dept-manager">
                                        <SelectValue placeholder="Select manager" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MANAGERS.map((m) => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dept-desc">Description</Label>
                            <Input
                                id="dept-desc"
                                placeholder="Brief description of the department"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm font-medium flex gap-2 items-center">
                            <ShieldAlert className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-4 border-t bg-muted/20 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="px-6 border-muted-foreground/30">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="px-8 shadow-sm">
                        {mode === "create" ? "Create Department" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
