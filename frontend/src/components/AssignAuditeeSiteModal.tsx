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
    AuditeeSiteMultiSelect,
    AuditeeSiteSelectionSummary,
} from "@/components/AuditeeSiteMultiSelect";
import { apiFetch } from "@/lib/api";
import type { InviteAuditeeSiteOption } from "@/components/InviteAuditeeModal";

type AuditeeSummary = {
    id: number;
    firstName: string;
    lastName: string;
    siteIds?: string[];
};

interface AssignAuditeeSiteModalProps {
    open: boolean;
    onClose: () => void;
    auditee: AuditeeSummary | null;
    sites: InviteAuditeeSiteOption[];
    disabledSiteIds?: ReadonlySet<string>;
    onSuccess?: () => void;
}

export function AssignAuditeeSiteModal({
    open,
    onClose,
    auditee,
    sites,
    disabledSiteIds,
    onSuccess,
}: AssignAuditeeSiteModalProps) {
    const [siteIds, setSiteIds] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open && auditee) {
            setSiteIds(auditee.siteIds ?? []);
            setError("");
        }
    }, [open, auditee]);

    const handleClose = () => {
        setSiteIds([]);
        setError("");
        onClose();
    };

    const handleSubmit = async () => {
        if (!auditee) return;
        if (siteIds.length === 0) {
            setError("Please select at least one site.");
            return;
        }
        setError("");
        try {
            setIsSubmitting(true);
            const res = await apiFetch(`/users/${auditee.id}/auditee-site`, {
                method: "PATCH",
                body: JSON.stringify({ siteIds: siteIds.map((id) => Number(id)) }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(
                    (typeof data.error === "string" && data.error) ||
                        (typeof data.message === "string" && data.message) ||
                        "Failed to update sites",
                );
            }
            toast.success("Site assignments updated");
            onSuccess?.();
            handleClose();
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to update sites. Please try again.";
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
                        Select sites
                    </DialogTitle>
                    <DialogDescription>
                        Choose which sites {displayName || "this auditee"} can access.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Sites *</Label>
                        <AuditeeSiteMultiSelect
                            sites={sites}
                            selectedSiteIds={siteIds}
                            onChange={setSiteIds}
                            disabledSiteIds={disabledSiteIds}
                        />
                        <AuditeeSiteSelectionSummary count={siteIds.length} />
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
