import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Info, Contact, Pencil, Globe, Navigation } from "lucide-react";
import { Site, SiteType } from "@/types/company";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Partial<Site>;
    mode?: "create" | "edit";
    hideCancel?: boolean;
}

const SITE_TYPES: SiteType[] = ["Warehouse", "Office", "Factory", "Retail", "Other"];
const STATUSES = ["Active", "Inactive", "Maintenance"];

export default function SiteModal({ open, onClose, onSubmit, initialData, mode = "create", hideCancel = false }: Props) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [siteType, setSiteType] = useState<string>("");
    const [status, setStatus] = useState("Active");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [country, setCountry] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactPosition, setContactPosition] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setName(initialData?.name || "");
            setDescription(initialData?.description || "");
            setSiteType(initialData?.siteType || "");
            setStatus(initialData?.status || "Active");
            setAddress(initialData?.address || "");
            setCity(initialData?.city || "");
            setState(initialData?.state || "");
            setCountry(initialData?.country || "");
            setPostalCode(initialData?.postalCode || "");
            setLatitude(initialData?.latitude?.toString() || "");
            setLongitude(initialData?.longitude?.toString() || "");
            setContactName(initialData?.contactName || "");
            setContactPosition(initialData?.contactPosition || "");
            setContactNumber(initialData?.contactNumber || "");
            setEmail(initialData?.email || "");
            setError("");
        }
    }, [open, initialData]);

    const handleSubmit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Site name is required");
            return;
        }
        onSubmit({
            name: trimmedName,
            description: description.trim(),
            siteType,
            status,
            address: address.trim(),
            city: city.trim(),
            state: state.trim(),
            country: country.trim(),
            postalCode: postalCode.trim(),
            latitude: latitude && latitude.trim() !== '' ? parseFloat(latitude.trim()) : undefined,
            longitude: longitude && longitude.trim() !== '' ? parseFloat(longitude.trim()) : undefined,
            contactName: contactName.trim(),
            contactPosition: contactPosition.trim(),
            contactNumber: contactNumber.trim(),
            email: email.trim(),
        });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
                onPointerDownOutside={hideCancel ? (e) => e.preventDefault() : undefined}
                onEscapeKeyDown={hideCancel ? (e) => e.preventDefault() : undefined}
            >
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        {mode === "create" ? (
                            <>
                                <MapPin className="h-5 w-5 text-primary" />
                                Add New Site
                            </>
                        ) : (
                            <>
                                <Pencil className="h-5 w-5 text-primary" />
                                Edit Site
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 py-4 space-y-8">
                    {/* General Information */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-1 border-b">
                            <Info className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">General Information</h3>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="site-name">Site Name *</Label>
                            <Input
                                id="site-name"
                                placeholder="e.g. Head Office"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setError(""); }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="site-description">Description</Label>
                            <Input
                                id="site-description"
                                placeholder="Brief description of the site"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-type">Site Type</Label>
                                <Select value={siteType} onValueChange={setSiteType}>
                                    <SelectTrigger id="site-type">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SITE_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site-status">Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger id="site-status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-1 border-b">
                            <Globe className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">Address Information</h3>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="site-address">Address</Label>
                            <Input
                                id="site-address"
                                placeholder="Street address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-city">City</Label>
                                <Input
                                    id="site-city"
                                    placeholder="City"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site-state">State/Region</Label>
                                <Input
                                    id="site-state"
                                    placeholder="State or Region"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-country">Country</Label>
                                <Input
                                    id="site-country"
                                    placeholder="Country"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site-postal">Postal Code</Label>
                                <Input
                                    id="site-postal"
                                    placeholder="Postal/Zip code"
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-lat">Latitude</Label>
                                <div className="relative">
                                    <Navigation className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="site-lat"
                                        type="number"
                                        step="any"
                                        placeholder="0.0000"
                                        className="pl-9"
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site-lng">Longitude</Label>
                                <div className="relative">
                                    <Navigation className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="site-lng"
                                        type="number"
                                        step="any"
                                        placeholder="0.0000"
                                        className="pl-9"
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-1 border-b">
                            <Contact className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">Contact Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact-name">Contact Name</Label>
                                <Input
                                    id="contact-name"
                                    placeholder="Full name"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-pos">Contact Position</Label>
                                <Input
                                    id="contact-pos"
                                    placeholder="e.g. Site Manager"
                                    value={contactPosition}
                                    onChange={(e) => setContactPosition(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact-num">Contact Number</Label>
                                <Input
                                    id="contact-num"
                                    placeholder="+1 234 567 8900"
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-email">Email</Label>
                                <Input
                                    id="contact-email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm font-medium">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-4 border-t bg-muted/20 gap-2">
                    {!hideCancel && (
                        <Button variant="outline" onClick={onClose} className="px-6">
                            Cancel
                        </Button>
                    )}
                    <Button onClick={handleSubmit} className="px-8 shadow-sm">
                        {mode === "create" ? "Add Site" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
