import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { InviteAuditeeSiteOption } from "@/components/InviteAuditeeModal";

type AuditeeSummary = {
    id: number;
    firstName: string;
    lastName: string;
    siteId?: string | null;
};

interface AssignAuditeeSiteModalProps {
    open: boolean;
    onClose: () => void;
    auditee: AuditeeSummary | null;
    sites: InviteAuditeeSiteOption[];
    onSuccess?: () => void;
}

export function AssignAuditeeSiteModal({
    open,
    onClose,
    auditee,
    sites,
    onSuccess,
}: AssignAuditeeSiteModalProps) {
    const [siteId, setSiteId] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open && auditee) {
            setSiteId(auditee.siteId ?? "");
            setError("");
        }
    }, [open, auditee]);

    const handleClose = () => {
        setSiteId("");
        setError("");
        onClose();
    };

    const handleSubmit = async () => {
        if (!auditee) return;
        if (!siteId) {
            setError("Please select a site.");
            return;
        }
        setError("");
        try {
            setIsSubmitting(true);
            const res = await apiFetch(`/users/${auditee.id}/auditee-site`, {
                method: "PATCH",
                body: JSON.stringify({ siteId: Number(siteId) }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(
                    (typeof data.error === "string" && data.error) ||
                        (typeof data.message === "string" && data.message) ||
                        "Failed to update site",
                );
            }
            toast.success("Site assignment updated");
            onSuccess?.();
            handleClose();
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to update site. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayName = auditee
        ? `${auditee.firstName} ${auditee.lastName}`.trim()
        : "";

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <MapPin className="h-6 w-6 text-primary" />
                        Select site
                    </DialogTitle>
                    <DialogDescription>
                        Choose which site {displayName || "this auditee"} is associated with.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Site *</Label>
                        <Select value={siteId} onValueChange={setSiteId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a site" />
                            </SelectTrigger>
                            <SelectContent>
                                {sites.length === 0 ? (
                                    <SelectItem value="__none" disabled>
                                        No sites available
                                    </SelectItem>
                                ) : (
                                    sites.map((site) => (
                                        <SelectItem key={site.id} value={site.id}>
                                            <span className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                {site.name}
                                                <span className="text-slate-400 text-xs">
                                                    ({site.companyName})
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    {error ? (
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    ) : null}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={isSubmitting || sites.length === 0}
                        className="bg-[#1e855e] hover:bg-[#166534]"
                    >
                        {isSubmitting ? "Saving…" : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
