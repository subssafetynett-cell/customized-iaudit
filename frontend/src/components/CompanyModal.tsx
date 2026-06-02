import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Company } from "@/types/company";
import { Building2, Phone, MapPin, Info, Pencil, Loader2, CheckCircle2, ImageIcon } from "lucide-react";
import {
  isTenDigitPhone,
  normalizePhone10Digits,
  PHONE_10_ERROR_MESSAGE,
  COMPANY_NAME_MAX,
  COMPANY_NAME_ERROR_MESSAGE,
  COMPANY_DESCRIPTION_MAX,
  COMPANY_DESCRIPTION_ERROR_MESSAGE,
  COMPANY_LOGO_MAX_CHARS,
  COMPANY_LOGO_MAX_MB,
  getCompanyLogoFileSizeError,
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

const NO_STATE_PROVINCE_LABEL = "No state / province";

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
  }) => void | Promise<void>;
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
  const [logoError, setLogoError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoPreviewBlobRef = useRef<string | null>(null);
  const logoUploadSeqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (logoPreviewBlobRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewBlobRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || "");
      setLogo(initialData?.logo || undefined);
      if (logoPreviewBlobRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewBlobRef.current);
      }
      logoPreviewBlobRef.current = null;
      setLogoPreviewUrl(null);
      setLogoUploaded(Boolean(initialData?.logo));
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
      setLogoError("");
      setFieldErrors({});
      setLogoUploading(false);
    }
  }, [open, initialData]);

  const displayLogo = logoPreviewUrl || logo;
  const statesForSelectedCountry = countryIso ? StateCity.getStatesOfCountry(countryIso) : [];
  const hasStatesForCountry = statesForSelectedCountry.length > 0;

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
    e.target.value = "";
    if (!file) return;

    const sizeError = getCompanyLogoFileSizeError(file.size);
    if (sizeError) {
      setLogoError(sizeError);
      setLogoUploaded(false);
      toast.error(sizeError);
      return;
    }

    const uploadSeq = ++logoUploadSeqRef.current;
    clearLogoPreview();
    const localPreview = URL.createObjectURL(file);
    logoPreviewBlobRef.current = localPreview;
    setLogoPreviewUrl(localPreview);
    setLogoUploaded(false);
    setLogoUploading(true);
    setLogoError("");
    try {
      const { url } = await uploadCompanyLogoFile(file);
      if (uploadSeq !== logoUploadSeqRef.current) return;
      releaseBlobPreview(localPreview, uploadSeq);
      setLogo(url);
      setLogoUploaded(true);
      setLogoError("");
      toast.success("Company logo uploaded successfully");
    } catch (err: unknown) {
      if (uploadSeq !== logoUploadSeqRef.current) return;
      const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
      if (code === "CLOUDINARY_NOT_CONFIGURED") {
        try {
          const dataUrl = await compressCompanyLogoFile(file);
          if (uploadSeq !== logoUploadSeqRef.current) return;
          releaseBlobPreview(localPreview, uploadSeq);
          setLogo(dataUrl);
          setLogoUploaded(true);
          setLogoError("");
          toast.success("Company logo ready");
          return;
        } catch (fallbackErr: unknown) {
          if (uploadSeq !== logoUploadSeqRef.current) return;
          releaseBlobPreview(localPreview, uploadSeq);
          setLogo(undefined);
          setLogoUploaded(false);
          const message = fallbackErr instanceof Error ? fallbackErr.message : "Failed to upload logo";
          setLogoError(message);
          toast.error(message);
          return;
        }
      }
      releaseBlobPreview(localPreview, uploadSeq);
      setLogo(undefined);
      setLogoUploaded(false);
      const message = err instanceof Error ? err.message : "Failed to upload logo";
      setLogoError(message);
      toast.error(message);
    } finally {
      if (uploadSeq === logoUploadSeqRef.current) {
        setLogoUploading(false);
      }
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
    if (logo && logo.startsWith("data:") && logo.length > COMPANY_LOGO_MAX_CHARS) {
      setLogoError("Logo is too large. Use a smaller image.");
      return;
    }
    if (!industry) errors.industry = "Industry is required";
    if (!contactNumber.trim()) errors.contactNumber = "Contact number is required";
    else if (!isTenDigitPhone(contactNumber)) errors.contactNumber = PHONE_10_ERROR_MESSAGE;
    if (!trimmedAddress) errors.streetAddress = "Street address is required";
    if (!city.trim()) errors.city = "City is required";
    const countryName = Country.getCountryByCode(countryIso)?.name || "";
    const hasStates = hasStatesForCountry;
    const stateName = hasStates
      ? StateCity.getStateByCodeAndCountry(stateIso, countryIso)?.name || ""
      : "";

    if (!countryIso) errors.country = "Country is required";
    if (hasStates && !stateIso) {
      errors.state = "State is required";
    }
    if (!postalCode.trim()) errors.postalCode = "Postal code is required";

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fill in all required fields.");
      return;
    }

    if (logoUploading) {
      setLogoError("Please wait for the logo to finish uploading.");
      return;
    }

    try {
      await Promise.resolve(
        onSubmit({
          name: trimmedName,
          logo: logo || undefined,
          industry,
          contactNumber: normalizePhone10Digits(contactNumber),
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
      if (/logo/i.test(message)) {
        setLogoError(message);
      } else {
        setError(message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
      onPointerDownOutside={hideCancel ? (e) => e.preventDefault() : undefined}
      onEscapeKeyDown={hideCancel ? (e) => e.preventDefault() : undefined}
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
        <div
          id="company-logo-section"
          className={`flex items-start gap-6 p-4 border rounded-xl transition-colors ${
            logoError
              ? "border-destructive/40 bg-destructive/5"
              : logoUploaded && displayLogo
                ? "border-emerald-300/80 bg-emerald-50/40"
                : "border-border bg-accent/5"
          }`}
        >
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className={`relative h-28 w-28 rounded-xl border-2 bg-white flex items-center justify-center overflow-hidden group ${
                logoUploaded && displayLogo && !logoUploading
                  ? "border-emerald-400 border-solid"
                  : "border-dashed border-muted-foreground/25"
              }`}
            >
              {displayLogo ? (
                <>
                  <img
                    src={displayLogo}
                    alt="Company logo preview"
                    className="h-full w-full object-contain p-2"
                    onError={() => {
                      setLogoError("Could not display the uploaded logo. Try uploading again.");
                      setLogoUploaded(false);
                    }}
                  />
                  {logoUploading && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-1.5">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      <span className="text-[10px] font-medium text-emerald-700">Uploading…</span>
                    </div>
                  )}
                  {!logoUploading && (
                    <button
                      type="button"
                      onClick={() => {
                        clearLogoPreview();
                        setLogo(undefined);
                        setLogoError("");
                        setLogoUploaded(false);
                      }}
                      className="absolute inset-0 bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </>
              ) : logoUploading ? (
                <div className="flex flex-col items-center justify-center gap-1.5 px-2">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="text-[10px] font-medium text-muted-foreground text-center">Uploading…</span>
                </div>
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
              )}
            </div>
            {logoUploaded && displayLogo && !logoUploading && !logoError && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Logo uploaded
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <h4 className="font-medium text-sm">Company Logo</h4>
            <p className="text-xs text-muted-foreground">
              Upload your company logo (PNG, JPG, or WebP — maximum {COMPANY_LOGO_MAX_MB} MB). A preview appears as soon as you choose a file.
            </p>
            <Label
              htmlFor="logo-upload"
              className={`relative inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer ${logoUploading ? "pointer-events-none opacity-50" : ""} ${logoError ? "border-red-500 text-red-700" : "border-input"}`}
            >
              {logoUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : displayLogo ? (
                "Change Logo"
              ) : (
                "Choose Logo"
              )}
              <Input
                id="logo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={handleLogoChange}
                disabled={logoUploading}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </Label>
            {logoUploaded && displayLogo && !logoUploading && !logoError && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium leading-relaxed"
                role="status"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>Your company logo is uploaded and ready. It will be saved when you create or update the company.</span>
              </div>
            )}
            {logoError && (
              <div
                className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium leading-relaxed"
                role="alert"
              >
                {logoError}
              </div>
            )}
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
                onChange={(e) => {
                  setName(e.target.value);
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
              <Select value={industry} onValueChange={(val) => {
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
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-contact"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit number"
                  className={`pl-9 ${fieldErrors.contactNumber ? "border-red-500 focus:ring-red-500" : ""}`}
                  value={contactNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
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
              onChange={(e) => {
                setDescription(e.target.value);
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
              className={`${fieldErrors.streetAddress ? "border-red-500 focus:ring-red-500" : ""}`}
              value={streetAddress}
              onChange={(e) => {
                setStreetAddress(e.target.value);
                if (fieldErrors.streetAddress) setFieldErrors(prev => ({ ...prev, streetAddress: "" }));
                setError("");
              }}
            />
            {fieldErrors.streetAddress && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.streetAddress}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm">Country *</Label>
              <CountrySelect
                id="country"
                value={countryIso}
                onValueChange={(val) => {
                  setCountryIso(val);
                  setStateIso("");
                  setState("");
                  const nextHasStates = val ? StateCity.getStatesOfCountry(val).length > 0 : false;
                  if (!nextHasStates) {
                    if (fieldErrors.state) setFieldErrors((prev) => ({ ...prev, state: "" }));
                  }
                  if (fieldErrors.country) setFieldErrors((prev) => ({ ...prev, country: "" }));
                  setError("");
                }}
                error={!!fieldErrors.country}
              />
              {fieldErrors.country && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.country}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm">
                State/Province{hasStatesForCountry && countryIso ? " *" : ""}
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
                    if (fieldErrors.state) setFieldErrors((prev) => ({ ...prev, state: "" }));
                    setError("");
                  }}
                  error={!!fieldErrors.state}
                />
              ) : (
                <Input
                  id="state"
                  readOnly
                  disabled
                  value={NO_STATE_PROVINCE_LABEL}
                  className="bg-muted text-muted-foreground cursor-not-allowed"
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
                onChange={(e) => {
                  setCity(e.target.value);
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
          <Button
            onClick={handleSubmit}
            disabled={logoUploading}
            className="px-8 shadow-sm bg-[#213847] hover:bg-[#213847]/90 text-white"
          >
            {mode === "create" ? "Create Company" : "Save Changes"}
          </Button>
        </DialogFooter >
      </DialogContent >
    </Dialog >
  );
}
