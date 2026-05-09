import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Info, Contact, Pencil, Globe, Navigation } from "lucide-react";
import { Site, SiteType } from "@/types/company";
import { Country, State as StateCity } from "country-state-city";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Partial<Site>;
    mode?: "create" | "edit";
    hideCancel?: boolean;
    hideOverlay?: boolean;
}

const SITE_TYPES: SiteType[] = ["Warehouse", "Office", "Factory", "Retail", "Other"];
const STATUSES = ["Active", "Inactive", "Maintenance"];

export default function SiteModal({ open, onClose, onSubmit, initialData, mode = "create", hideCancel = false, hideOverlay = false }: Props) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [siteType, setSiteType] = useState<string>("");
    const [status, setStatus] = useState("Active");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [stateIso, setStateIso] = useState("");
    const [countryIso, setCountryIso] = useState("");
    const [postalCode, setPostalCode] = useState("");
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
            
            // Map names back to ISO codes for the dropdowns
            const initialCountryIso = Country.getAllCountries().find(c => c.name === initialData?.country)?.isoCode || "";
            setCountryIso(initialCountryIso);
            
            if (initialCountryIso && initialData?.state) {
                const initialStateIso = StateCity.getStatesOfCountry(initialCountryIso).find(s => s.name === initialData.state)?.isoCode || "";
                setStateIso(initialStateIso);
            } else {
                setStateIso("");
            }

            setPostalCode(initialData?.postalCode || "");
            setContactName(initialData?.contactName || "");
            setContactPosition(initialData?.contactPosition || "");
            setContactNumber(initialData?.contactNumber || "");
            setEmail(initialData?.email || "");
            setError("");
        }
    }, [open, initialData]);

    const handleSubmit = () => {
        const trimmedName = name.trim();
        const trimmedDescription = description.trim();
        const trimmedAddress = address.trim();
        const trimmedCity = city.trim();
        const trimmedPostalCode = postalCode.trim();
        const trimmedContactName = contactName.trim();
        const trimmedContactPosition = contactPosition.trim();
        const trimmedContactNumber = contactNumber.trim();
        const trimmedEmail = email.trim();

        const countryName = Country.getCountryByCode(countryIso)?.name || "";
        const stateName = StateCity.getStateByCodeAndCountry(stateIso, countryIso)?.name || "";

        const hasStates = StateCity.getStatesOfCountry(countryIso).length > 0;
        const isStateValid = !hasStates || (hasStates && stateIso);

        if (
            !trimmedName || !trimmedDescription || !siteType || !status || 
            !trimmedAddress || !trimmedCity || !isStateValid || !countryIso || 
            !trimmedPostalCode || !trimmedContactName || !trimmedContactPosition || 
            !trimmedContactNumber || !trimmedEmail
        ) {
            setError("All fields are required");
            return;
        }

        const phoneRegex = /^\+?[\d\s\-\(\)]{7,20}$/;
        if (!phoneRegex.test(trimmedContactNumber)) {
            setError("Please enter a valid phone number.");
            return;
        }

        // Optional: Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setError("Please enter a valid email address.");
            return;
        }

        onSubmit({
            name: trimmedName,
            description: trimmedDescription,
            siteType,
            status,
            address: trimmedAddress,
            city: trimmedCity,
            state: stateName,
            country: countryName,
            postalCode: trimmedPostalCode,
            contactName: trimmedContactName,
            contactPosition: trimmedContactPosition,
            contactNumber: trimmedContactNumber,
            email: trimmedEmail,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent id="tour-step-site-modal" hideOverlay={hideOverlay} className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none sm:rounded-[1.5rem]"
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
                    <DialogDescription className="sr-only">
                        Enter the details of the site you want to {mode === "create" ? "add" : "edit"}.
                    </DialogDescription>
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
                            <Label htmlFor="site-description">Description *</Label>
                            <Input
                                id="site-description"
                                placeholder="Brief description of the site"
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); setError(""); }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-type">Site Type *</Label>
                                <Select value={siteType} onValueChange={(val) => { setSiteType(val); setError(""); }}>
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
                                <Label htmlFor="site-status">Status *</Label>
                                <Select value={status} onValueChange={(val) => { setStatus(val); setError(""); }}>
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
                            <Label htmlFor="site-address">Address *</Label>
                            <Input
                                id="site-address"
                                placeholder="Street address"
                                value={address}
                                onChange={(e) => { setAddress(e.target.value); setError(""); }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-city">City *</Label>
                                <Input
                                    id="site-city"
                                    placeholder="City"
                                    value={city}
                                    onChange={(e) => { setCity(e.target.value); setError(""); }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site-country">Country *</Label>
                                <Select value={countryIso} onValueChange={(val) => { setCountryIso(val); setStateIso(""); setError(""); }}>
                                    <SelectTrigger id="site-country">
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Country.getAllCountries().map((c) => (
                                            <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site-state">State/Region *</Label>
                                <Select value={stateIso} onValueChange={(val) => { setStateIso(val); setError(""); }} disabled={!countryIso}>
                                    <SelectTrigger id="site-state">
                                        <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countryIso && StateCity.getStatesOfCountry(countryIso).map((s) => (
                                            <SelectItem key={s.isoCode} value={s.isoCode}>{s.name}</SelectItem>
                                        ))}
                                        {countryIso && StateCity.getStatesOfCountry(countryIso).length === 0 && (
                                            <SelectItem value="none">No states available</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-postal">Postal Code *</Label>
                                <Input
                                    id="site-postal"
                                    placeholder="Postal/Zip code"
                                    value={postalCode}
                                    onChange={(e) => { setPostalCode(e.target.value); setError(""); }}
                                />
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
                                <Label htmlFor="contact-name">Contact Name *</Label>
                                <Input
                                    id="contact-name"
                                    placeholder="Full name"
                                    value={contactName}
                                    onChange={(e) => { setContactName(e.target.value); setError(""); }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-pos">Contact Position *</Label>
                                <Input
                                    id="contact-pos"
                                    placeholder="e.g. Site Manager"
                                    value={contactPosition}
                                    onChange={(e) => { setContactPosition(e.target.value); setError(""); }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact-num">Contact Number *</Label>
                                <Input
                                    id="contact-num"
                                    placeholder="+1 234 567 8900"
                                    value={contactNumber}
                                    onChange={(e) => { setContactNumber(e.target.value); setError(""); }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-email">Email *</Label>
                                <Input
                                    id="contact-email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
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
                    <Button onClick={handleSubmit} className="px-8 shadow-sm" disabled={!name.trim() || !description.trim() || !siteType || !status || !address.trim() || !city.trim() || (!stateIso && StateCity.getStatesOfCountry(countryIso).length > 0) || !countryIso || !postalCode.trim() || !contactName.trim() || !contactPosition.trim() || !contactNumber.trim() || !email.trim()}>
                        {mode === "create" ? "Add Site" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
