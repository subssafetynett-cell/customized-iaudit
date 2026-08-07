import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Company } from "@/types/company";
import { Building2, MapPin, Info, Pencil } from "lucide-react";
import { getDialForCountryCode, getPhonePlaceholder } from "@/lib/phoneCountries";
import {
  capitalizeFirstLetter,
  COMPANY_NAME_MAX,
  COMPANY_NAME_ERROR_MESSAGE,
  COMPANY_DESCRIPTION_MAX,
  COMPANY_DESCRIPTION_ERROR_MESSAGE,
  COMPANY_LOGO_MAX_CHARS,
  STREET_ADDRESS_ERROR_MESSAGE,
  STREET_ADDRESS_MAX,
  isWithinMaxLength,
} from "@/lib/validation";
import { COMPANY_INDUSTRIES } from "@/lib/industries";
import { compressCompanyLogoFile } from "@/utils/companyLogo";
import { uploadCompanyLogoFile } from "@/lib/uploadCompanyLogo";
import { toast } from "sonner";
import { Country, State as StateCity } from "country-state-city";
import { CountrySelect } from "@/components/CountrySelect";
import { StateSelect } from "@/components/StateSelect";
import { resolveCountryIsoFromName } from "@/lib/worldCountries";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    logo?: string;
    industry?: string;
    contactNumber?: string;
    description?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    standards: any[];
  }) => void | Promise<void | unknown>;
  initialData?: Partial<Company>;
  mode?: "create" | "edit";
  hideCancel?: boolean;
}

export default function CompanyModal({ open, onClose, onSubmit, initialData, mode = "create", hideCancel = false }: Props) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | undefined>();
  const [industry, setIndustry] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [description, setDescription] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [stateIso, setStateIso] = useState("");
  const [countryIso, setCountryIso] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoPreviewBlobRef = useRef<string | null>(null);
  const logoUploadSeqRef = useRef(0);
  const displayLogo = logoPreviewUrl || logo;

  useEffect(() => {
    return () => {
      if (logoPreviewBlobRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewBlobRef.current);
      }
    };
  }, []);

  const [searchParams] = useSearchParams();
  const companyTour = searchParams.get("companyTour") === "true";
  const companyStep = parseInt(searchParams.get("companyStep") || "0", 10);

  // Auto-fill simulation for tour step 4
  useEffect(() => {
    if (open && companyTour && companyStep === 4) {
      let isCancelled = false;
      
      const simulateTyping = async () => {
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
        
        await delay(500);
        if (isCancelled) return;
        
        // Type Name
        const nameTarget = "Schweppes Zimbabwe Limited";
        for (let i = 1; i <= nameTarget.length; i++) {
          if (isCancelled) return;
          setName(nameTarget.slice(0, i));
          await delay(30);
        }
        
        await delay(300);
        
        // Type Description
        const descTarget = "Globally recognized non-alcoholic carbonated mixer and soft drink brand.";
        for (let i = 1; i <= descTarget.length; i++) {
          if (isCancelled) return;
          setDescription(descTarget.slice(0, i));
          await delay(15);
        }
        
        await delay(300);
        
        // Pick Industry
        if (isCancelled) return;
        setIndustry("Manufacturing");
        
        await delay(300);
        
        // Fill Contact Number
        const contactTarget = "263242620231";
        for (let i = 1; i <= contactTarget.length; i++) {
          if (isCancelled) return;
          setContactNumber(contactTarget.slice(0, i));
          await delay(30);
        }
        
        await delay(300);
        
        // Fill Address
        const addrTarget = "Woolwich Road, Willowvale";
        for (let i = 1; i <= addrTarget.length; i++) {
          if (isCancelled) return;
          setStreetAddress(addrTarget.slice(0, i));
          await delay(20);
        }
        
        await delay(300);
        
        // Fill Location Details
        if (isCancelled) return;
        setCountryIso("ZW");
        await delay(200);
        setCity("Harare");
        setState("Harare Province");
        setPostalCode("0000");

        await delay(300);
        if (isCancelled) return;
        // Mock logo upload with a dummy data URL to represent the SZL logo
        setLogo("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmY2MwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzAwMCI+U1pMPC90ZXh0Pjwvc3ZnPg==");
      };

      simulateTyping();
      return () => { isCancelled = true; };
    }
  }, [open, companyTour, companyStep]);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || "");
      setLogo(initialData?.logo || undefined);
      setIndustry(initialData?.industry || "");
      setContactNumber(initialData?.contactNumber || "");
      setDescription(initialData?.description || "");
      setStreetAddress(initialData?.streetAddress || "");
      setCity(initialData?.city || "");
      const initialCountryIso = resolveCountryIsoFromName(initialData?.country || "");
      setCountryIso(initialCountryIso);
      if (initialCountryIso && initialData?.state) {
        const initialStateIso =
          StateCity.getStatesOfCountry(initialCountryIso).find(
            (s) => s.name === initialData.state,
          )?.isoCode || "";
        setStateIso(initialStateIso);
        setState(initialData.state);
      } else {
        setStateIso("");
        setState(initialData?.state || "");
      }
      setPostalCode(initialData?.postalCode || "");
      setError("");
      setFieldErrors({});
    }
  }, [open, initialData]);

  useEffect(() => {
    // Keep digits only; do not clamp by country max length in modals.
    setContactNumber((prev) => String(prev || "").replace(/\D/g, ""));
  }, [countryIso]);

  const statesForSelectedCountry = countryIso ? StateCity.getStatesOfCountry(countryIso) : [];
  const hasStatesForCountry = statesForSelectedCountry.length > 0;

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const revokeBlobPreview = (blobUrl: string | null | undefined) => {
    if (blobUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrl);
    }
  };

  const clearLogoPreview = () => {
    revokeBlobPreview(logoPreviewBlobRef.current);
    logoPreviewBlobRef.current = null;
    setLogoPreviewUrl(null);
  };

  /** Drop blob preview for this upload only; ignores stale handlers after a newer file pick. */
  const releaseBlobPreview = (blobUrl: string, uploadSeq: number) => {
    if (uploadSeq !== logoUploadSeqRef.current) return;
    revokeBlobPreview(blobUrl);
    if (logoPreviewBlobRef.current === blobUrl) {
      logoPreviewBlobRef.current = null;
      setLogoPreviewUrl(null);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Allow up to 10MB
      if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
        setError("Logo must be a PNG, JPEG, or WebP image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Logo must be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Auto-compress: resize to max 512x512 to keep storage manageable
          const MAX = 512;
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) {
              height = Math.round((height * MAX) / width);
              width = MAX;
            } else {
              width = Math.round((width * MAX) / height);
              height = MAX;
            }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          let quality = 0.85;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrl.length > COMPANY_LOGO_MAX_CHARS && quality > 0.4) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          if (dataUrl.length > COMPANY_LOGO_MAX_CHARS) {
            setError("Logo is too large after compression. Try a smaller image.");
            return;
          }
          setLogo(dataUrl);
          setError("");
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedAddress = streetAddress.trim();
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = "Company name is required";
    else if (!isWithinMaxLength(trimmedName, COMPANY_NAME_MAX)) errors.name = COMPANY_NAME_ERROR_MESSAGE;
    if (!isWithinMaxLength(description.trim(), COMPANY_DESCRIPTION_MAX)) {
      errors.description = COMPANY_DESCRIPTION_ERROR_MESSAGE;
    }
    if (logo && logo.length > COMPANY_LOGO_MAX_CHARS) {
      setError("Logo is too large. Use a smaller image.");
      return;
    }
    if (!industry) errors.industry = "Industry is required";
    const contactDigits = String(contactNumber || "").replace(/\D/g, "");
    if (!contactDigits) errors.contactNumber = "Contact number is required";
    if (!trimmedAddress) errors.streetAddress = "Street address is required";
    else if (!isWithinMaxLength(trimmedAddress, STREET_ADDRESS_MAX)) {
      errors.streetAddress = STREET_ADDRESS_ERROR_MESSAGE;
    }
    if (!city.trim()) errors.city = "City is required";
    const countryName = Country.getCountryByCode(countryIso)?.name || "";
    const hasStates = hasStatesForCountry;
    const stateName = hasStates
      ? StateCity.getStateByCodeAndCountry(stateIso, countryIso)?.name || ""
      : state.trim();

    if (!countryIso) errors.country = "Country is required";
    if (hasStates) {
      if (!stateIso) errors.state = "State is required";
    } else if (!state.trim()) {
      errors.state = "State/Province is required";
    }
    if (!postalCode.trim()) errors.postalCode = "Postal code is required";

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      if (companyTour) {
        // Prevent real submit, just pretend it succeeded
        onSubmit({
          name: trimmedName,
          logo,
          industry,
          contactNumber: contactDigits,
          description: description.trim(),
          streetAddress: trimmedAddress,
          city: city.trim(),
          state: stateName,
          country: countryName,
          postalCode: postalCode.trim(),
          standards: initialData?.isoStandards || [],
        });
        onClose();
        return;
      }

      await Promise.resolve(
        onSubmit({
          name: trimmedName,
          logo,
          industry,
          contactNumber: contactDigits,
          description: description.trim(),
          streetAddress: trimmedAddress,
          city: city.trim(),
          state: stateName,
          country: countryName,
          postalCode: postalCode.trim(),
          standards: initialData?.isoStandards || [],
        })
      );
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save company";
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        id="tour-step-company-form"
        className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
        onPointerDownOutside={hideCancel || companyTour ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={hideCancel || companyTour ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="p-6 pb-2">
        <DialogTitle className="flex items-center gap-2 text-xl">
          {mode === "create" ? (
            <>
              <Building2 className="h-6 w-6 text-primary" />
              Create New Company
            </>
          ) : (
            <>
              <Pencil className="h-6 w-6 text-primary" />
              Edit Company
            </>
          )}
        </DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto p-6 py-4 space-y-8">
        {/* One-company info banner — only shown in create mode */}
        {mode === "create" && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/60">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">You can create only one company.</span>{" "}
              Don't worry — you can always edit your company details later using the{" "}
              <Pencil className="inline h-3 w-3 text-amber-700 -mt-0.5" /> edit button on the Company page.
            </p>
          </div>
        )}
        {/* Logo Upload Section */}
        <div className="flex items-start gap-6 p-4 border rounded-xl bg-accent/5">
          <div className="flex flex-col items-center gap-3">
            <div className="h-24 w-24 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-background flex items-center justify-center overflow-hidden group relative">
              {logo ? (
                <>
                  <img src={logo} alt="Preview" className="h-full w-full object-contain p-2" />
                  <button
                    onClick={() => setLogo("")}
                    className="absolute inset-0 bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground/30" />
              )}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-medium text-sm">Company Logo</h4>
            <p className="text-xs text-muted-foreground">Upload your company logo (PNG, JPG, up to 10MB — auto-compressed for storage).</p>
            <Label
              htmlFor="logo-upload"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer"
            >
              Choose Logo
            </Label>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
        </div>

        {/* General Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-base">General Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-sm">Company Name *</Label>
              <Input
                id="company-name"
                placeholder="Enter company name"
                maxLength={COMPANY_NAME_MAX}
                className={`h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#00875B] ${fieldErrors.name ? "border-red-500 focus:ring-red-500" : ""}`}
                value={name}
                disabled={companyTour && companyStep === 4}
                onChange={(e) => {
                  setName(capitalizeFirstLetter(e.target.value));
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: "" }));
                  setError("");
                }}
              />
              <p className="text-[10px] text-muted-foreground pl-1">
                {name.length}/{COMPANY_NAME_MAX} characters
              </p>
              {fieldErrors.name && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-industry" className="text-sm">Industry *</Label>
              <Select value={industry} disabled={companyTour && companyStep === 4} onValueChange={(val) => {
                setIndustry(val);
                if (fieldErrors.industry) setFieldErrors(prev => ({ ...prev, industry: "" }));
                setError("");
              }}>
                <SelectTrigger id="company-industry" className={`${fieldErrors.industry ? "border-red-500 focus:ring-red-500" : ""}`}>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.industry && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.industry}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <Label htmlFor="company-contact" className="text-sm">Contact Number *</Label>
              <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[11px] font-medium text-muted-foreground">
                      {countryIso ? getDialForCountryCode(countryIso) : ""}
                    </span>
                <Input
                  id="company-contact"
                  type="tel"
                  inputMode="numeric"
                  placeholder={getPhonePlaceholder(countryIso)}
                      className={`pl-14 ${fieldErrors.contactNumber ? "border-red-500 focus:ring-red-500" : ""}`}
                  value={contactNumber}
                  disabled={companyTour && companyStep === 4}
                  onChange={(e) => {
                        const value = String(e.target.value || "").replace(/\D/g, "");
                    setContactNumber(value);
                    if (fieldErrors.contactNumber) setFieldErrors(prev => ({ ...prev, contactNumber: "" }));
                    setError("");
                  }}
                />
              </div>
              {fieldErrors.contactNumber && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.contactNumber}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-desc" className="text-sm">Description</Label>
            <Input
              id="company-desc"
              placeholder="Brief description of the company"
              maxLength={COMPANY_DESCRIPTION_MAX}
              value={description}
              disabled={companyTour && companyStep === 4}
              onChange={(e) => {
                setDescription(capitalizeFirstLetter(e.target.value));
                if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: "" }));
                setError("");
              }}
              className={fieldErrors.description ? "border-red-500 focus:ring-red-500" : ""}
            />
            <p className="text-[10px] text-muted-foreground pl-1">
              {description.length}/{COMPANY_DESCRIPTION_MAX} characters
            </p>
            {fieldErrors.description && (
              <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.description}</p>
            )}
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-base">Address Information</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="street-address" className="text-sm">Street Address *</Label>
            <Input
              id="street-address"
              placeholder="Street address"
              maxLength={STREET_ADDRESS_MAX}
              className={`${fieldErrors.streetAddress ? "border-red-500 focus:ring-red-500" : ""}`}
              value={streetAddress}
              disabled={companyTour && companyStep === 4}
              onChange={(e) => {
                setStreetAddress(capitalizeFirstLetter(e.target.value));
                if (fieldErrors.streetAddress) setFieldErrors(prev => ({ ...prev, streetAddress: "" }));
                setError("");
              }}
            />
            <p className="text-[11px] text-muted-foreground ml-1">
              {streetAddress.length}/{STREET_ADDRESS_MAX} characters
            </p>
            {fieldErrors.streetAddress && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.streetAddress}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm">Country *</Label>
              <CountrySelect
                id="country"
                value={countryIso}
                disabled={companyTour && companyStep === 4}
                onValueChange={(val) => {
                  setCountryIso(val);
                  setStateIso("");
                  setState("");
                  clearFieldError("state");
                  clearFieldError("country");
                  setError("");
                }}
                error={!!fieldErrors.country}
              />
              {fieldErrors.country && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.country}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm">
                State/Province{countryIso ? " *" : ""}
              </Label>
              {!countryIso ? (
                <Input
                  id="state"
                  disabled
                  placeholder="Select country first"
                  className="bg-muted text-muted-foreground"
                />
              ) : hasStatesForCountry ? (
                <StateSelect
                  id="state"
                  countryIso={countryIso}
                  value={stateIso}
                  onValueChange={(val) => {
                    setStateIso(val);
                    clearFieldError("state");
                    setError("");
                  }}
                  error={!!fieldErrors.state}
                />
              ) : (
                <Input
                  id="state"
                  placeholder="State or Province"
                  className={`${fieldErrors.state ? "border-red-500 focus:ring-red-500" : ""}`}
                  value={state}
                  onChange={(e) => {
                    setState(capitalizeFirstLetter(e.target.value));
                    clearFieldError("state");
                    setError("");
                  }}
                />
              )}
              {fieldErrors.state && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.state}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm">City *</Label>
              <Input
                id="city"
                placeholder="City"
                className={`${fieldErrors.city ? "border-red-500 focus:ring-red-500" : ""}`}
                value={city}
                disabled={companyTour && companyStep === 4}
                onChange={(e) => {
                  setCity(capitalizeFirstLetter(e.target.value));
                  if (fieldErrors.city) setFieldErrors(prev => ({ ...prev, city: "" }));
                  setError("");
                }}
              />
              {fieldErrors.city && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.city}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal-code" className="text-sm">Postal Code *</Label>
              <Input
                id="postal-code"
                placeholder="Postal/Zip code"
                className={`${fieldErrors.postalCode ? "border-red-500 focus:ring-red-500" : ""}`}
                value={postalCode}
                disabled={companyTour && companyStep === 4}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  if (fieldErrors.postalCode) setFieldErrors(prev => ({ ...prev, postalCode: "" }));
                  setError("");
                }}
              />
              {fieldErrors.postalCode && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.postalCode}</p>}
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
          <Button id="tour-step-company-submit" onClick={handleSubmit} className="px-8 shadow-sm bg-[#213847] hover:bg-[#213847]/90 text-white">
            {mode === "create" ? "Create Company" : "Save Changes"}
          </Button>
        </DialogFooter >
      </DialogContent >
    </Dialog >
  );
}
