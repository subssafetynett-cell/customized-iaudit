import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Info, Contact, Pencil, Globe, Navigation } from "lucide-react";
import { Site, SiteType } from "@/types/company";
import { Country, State as StateCity } from "country-state-city";
import { CountrySelect } from "@/components/CountrySelect";
import { StateSelect } from "@/components/StateSelect";
import { resolveCountryIsoFromName } from "@/lib/worldCountries";
import {
    isTenDigitPhone,
    isWithinMaxLength,
    normalizePhone10Digits,
    PHONE_10_ERROR_MESSAGE,
    SITE_NAME_ERROR_MESSAGE,
    SITE_NAME_MAX,
} from "@/lib/validation";

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
    const [stateText, setStateText] = useState("");
    const [countryIso, setCountryIso] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactPosition, setContactPosition] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const statesForSelectedCountry = countryIso ? StateCity.getStatesOfCountry(countryIso) : [];
    const hasStatesForCountry = statesForSelectedCountry.length > 0;

    useEffect(() => {
        if (open) {
            setName(initialData?.name || "");
            setDescription(initialData?.description || "");
            setSiteType(initialData?.siteType || "");
            setStatus(initialData?.status || "Active");
            setAddress(initialData?.address || "");
            setCity(initialData?.city || "");
            
            // Map names back to ISO codes for the dropdowns
            const initialCountryIso = resolveCountryIsoFromName(initialData?.country || "");
            setCountryIso(initialCountryIso);
            
            const statesForCountry = initialCountryIso
                ? StateCity.getStatesOfCountry(initialCountryIso)
                : [];
            if (initialCountryIso && initialData?.state && statesForCountry.length > 0) {
                const initialStateIso =
                    statesForCountry.find((s) => s.name === initialData.state)?.isoCode || "";
                setStateIso(initialStateIso);
                setStateText("");
            } else {
                setStateIso("");
                setStateText(initialData?.state || "");
            }

            setPostalCode(initialData?.postalCode || "");
            setContactName(initialData?.contactName || "");
            setContactPosition(initialData?.contactPosition || "");
            setContactNumber(initialData?.contactNumber || "");
            setEmail(initialData?.email || "");
            setError("");
            setFieldErrors({});
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
        const contactDigits = normalizePhone10Digits(trimmedContactNumber);
        const trimmedEmail = email.trim();

        const countryName = Country.getCountryByCode(countryIso)?.name || "";
        const hasStates = hasStatesForCountry;
        const stateName = hasStates
            ? StateCity.getStateByCodeAndCountry(stateIso, countryIso)?.name || ""
            : stateText.trim();

        // Per-field validation
        const errors: Record<string, string> = {};
        if (!trimmedName) {
            errors.name = "Site name is required";
        } else if (!isWithinMaxLength(trimmedName, SITE_NAME_MAX)) {
            errors.name = SITE_NAME_ERROR_MESSAGE;
        }
        if (!trimmedDescription) errors.description = "Description is required";
        if (!siteType) errors.siteType = "Site type is required";
        if (!status) errors.status = "Status is required";
        if (!trimmedAddress) errors.address = "Address is required";
        if (!trimmedCity) errors.city = "City is required";
        if (!countryIso) errors.country = "Country is required";
        if (hasStates) {
            if (!stateIso) errors.state = "State/Region is required";
        } else if (!stateText.trim()) {
            errors.state = "State/Region is required";
        }
        if (!trimmedPostalCode) errors.postalCode = "Postal code is required";
        if (!trimmedContactName) errors.contactName = "Contact name is required";
        if (!trimmedContactPosition) errors.contactPosition = "Position is required";
        if (!trimmedContactNumber) {
            errors.contactNumber = "Contact number is required";
        } else if (!isTenDigitPhone(trimmedContactNumber)) {
            errors.contactNumber = PHONE_10_ERROR_MESSAGE;
        }
        if (!trimmedEmail) {
            errors.email = "Email is required";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                errors.email = "Please enter a valid email address";
            }
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            setError("Please fill in all required fields correctly.");
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
            contactNumber: contactDigits,
            email: trimmedEmail,
        });
    };

    const clearFieldError = (field: string) => {
        if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: "" }));
        setError("");
    };

    const fieldErrorClass = (field: string) =>
        fieldErrors[field] ? "border-red-500 focus:ring-red-500" : "";

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
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
                                maxLength={SITE_NAME_MAX}
                                className={fieldErrorClass("name")}
                                value={name}
                                onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                            />
                            <p className="text-[11px] text-muted-foreground ml-1">
                                {name.length}/{SITE_NAME_MAX} characters
                            </p>
                            {fieldErrors.name && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="site-description">Description *</Label>
                            <Input
                                id="site-description"
                                placeholder="Brief description of the site"
                                className={fieldErrorClass("description")}
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); clearFieldError("description"); }}
                            />
                            {fieldErrors.description && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.description}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-type">Site Type *</Label>
                                <Select value={siteType} onValueChange={(val) => { setSiteType(val); clearFieldError("siteType"); }}>
                                    <SelectTrigger id="site-type" className={fieldErrorClass("siteType")}>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SITE_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {fieldErrors.siteType && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.siteType}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site-status">Status *</Label>
                                <Select value={status} onValueChange={(val) => { setStatus(val); clearFieldError("status"); }}>
                                    <SelectTrigger id="site-status" className={fieldErrorClass("status")}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {fieldErrors.status && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.status}</p>}
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
                                className={fieldErrorClass("address")}
                                value={address}
                                onChange={(e) => { setAddress(e.target.value); clearFieldError("address"); }}
                            />
                            {fieldErrors.address && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.address}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-city">City *</Label>
                                <Input
                                    id="site-city"
                                    placeholder="City"
                                    className={fieldErrorClass("city")}
                                    value={city}
                                    onChange={(e) => { setCity(e.target.value); clearFieldError("city"); }}
                                />
                                {fieldErrors.city && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.city}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site-country">Country *</Label>
                                <CountrySelect
                                    id="site-country"
                                    value={countryIso}
                                    onValueChange={(val) => {
                                        setCountryIso(val);
                                        setStateIso("");
                                        setStateText("");
                                        clearFieldError("state");
                                        clearFieldError("country");
                                    }}
                                    error={!!fieldErrors.country}
                                />
                                {fieldErrors.country && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.country}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site-state">
                                    State/Region{countryIso ? " *" : ""}
                                </Label>
                                {!countryIso ? (
                                    <Input
                                        id="site-state"
                                        disabled
                                        placeholder="Select country first"
                                        className="bg-muted text-muted-foreground"
                                    />
                                ) : hasStatesForCountry ? (
                                    <StateSelect
                                        id="site-state"
                                        countryIso={countryIso}
                                        value={stateIso}
                                        onValueChange={(val) => {
                                            setStateIso(val);
                                            clearFieldError("state");
                                        }}
                                        error={!!fieldErrors.state}
                                    />
                                ) : (
                                    <Input
                                        id="site-state"
                                        placeholder="State or region"
                                        className={fieldErrorClass("state")}
                                        value={stateText}
                                        onChange={(e) => {
                                            setStateText(e.target.value);
                                            clearFieldError("state");
                                        }}
                                    />
                                )}
                                {fieldErrors.state && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.state}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="site-postal">Postal Code *</Label>
                                <Input
                                    id="site-postal"
                                    placeholder="Postal/Zip code"
                                    className={fieldErrorClass("postalCode")}
                                    value={postalCode}
                                    onChange={(e) => { setPostalCode(e.target.value); clearFieldError("postalCode"); }}
                                />
                                {fieldErrors.postalCode && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.postalCode}</p>}
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
                                    className={fieldErrorClass("contactName")}
                                    value={contactName}
                                    onChange={(e) => { setContactName(e.target.value); clearFieldError("contactName"); }}
                                />
                                {fieldErrors.contactName && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.contactName}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-pos">Contact Position *</Label>
                                <Input
                                    id="contact-pos"
                                    placeholder="e.g. Site Manager"
                                    className={fieldErrorClass("contactPosition")}
                                    value={contactPosition}
                                    onChange={(e) => { setContactPosition(e.target.value); clearFieldError("contactPosition"); }}
                                />
                                {fieldErrors.contactPosition && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.contactPosition}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact-num">Contact Number *</Label>
                                <Input
                                    id="contact-num"
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    placeholder="10-digit number"
                                    className={fieldErrorClass("contactNumber")}
                                    value={contactNumber}
                                    onChange={(e) => {
                                        setContactNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                                        clearFieldError("contactNumber");
                                    }}
                                />
                                {fieldErrors.contactNumber && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.contactNumber}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-email">Email *</Label>
                                <Input
                                    id="contact-email"
                                    type="email"
                                    placeholder="email@example.com"
                                    className={fieldErrorClass("email")}
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                                />
                                {fieldErrors.email && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.email}</p>}
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
