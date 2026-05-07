import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Company } from "@/types/company";
import { Building2, Phone, MapPin, Info, Pencil } from "lucide-react";

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
  }) => void;
  initialData?: Partial<Company>;
  mode?: "create" | "edit";
  hideCancel?: boolean;
}

const INDUSTRIES = [
  "Construction",
  "Manufacturing",
  "Technology",
  "Healthcare",
  "Education",
  "Retail",
  "Finance",
  "Other",
];

const COUNTRIES = [
  "India",
  "United Arab Emirates",
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Kuwait",
  "Bahrain",
  "Singapore",
  "Malaysia",
  "Germany",
  "France",
];

const STATES = {
  "India": [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ],
  "United Arab Emirates": [
    "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"
  ],
  "United States": [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ]
};

export default function CompanyModal({ open, onClose, onSubmit, initialData, mode = "create", hideCancel = false }: Props) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | undefined>();
  const [industry, setIndustry] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [description, setDescription] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setName(initialData?.name || "");
      setLogo(initialData?.logo || undefined);
      setIndustry(initialData?.industry || "");
      setContactNumber(initialData?.contactNumber || "");
      setDescription(initialData?.description || "");
      setStreetAddress(initialData?.streetAddress || "");
      setCity(initialData?.city || "");
      setState(initialData?.state || "");
      setCountry(initialData?.country || "");
      setPostalCode(initialData?.postalCode || "");
      setError("");
      setFieldErrors({});
    }
  }, [open, initialData]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Allow up to 10MB
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
          setLogo(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedAddress = streetAddress.trim();
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = "Company name is required";
    if (!industry) errors.industry = "Industry is required";
    if (!contactNumber.trim()) errors.contactNumber = "Contact number is required";
    if (!trimmedAddress) errors.streetAddress = "Street address is required";
    if (!city.trim()) errors.city = "City is required";
    if (!state) errors.state = "State is required";
    if (!country) errors.country = "Country is required";
    if (!postalCode.trim()) errors.postalCode = "Postal code is required";

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fill in all required fields.");
      return;
    }

    onSubmit({
      name: trimmedName,
      logo,
      industry,
      contactNumber: contactNumber.trim(),
      description: description.trim(),
      streetAddress: trimmedAddress,
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      postalCode: postalCode.trim(),
      standards: initialData?.isoStandards || [],
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
                className={`h-11 bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#00875B] ${fieldErrors.name ? "border-red-500 focus:ring-red-500" : ""}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: "" }));
                  setError("");
                }}
              />
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
                  {INDUSTRIES.map((ind) => (
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
                  placeholder="+1 234 567 8900"
                  className={`pl-9 ${fieldErrors.contactNumber ? "border-red-500 focus:ring-red-500" : ""}`}
                  value={contactNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
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
            <Label htmlFor="company-desc" className="text-base text-sm">Description</Label>
            <Input
              id="company-desc"
              placeholder="Brief description of the company"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
              <Select value={country} onValueChange={(val) => {
                setCountry(val);
                setState(""); // Reset state when country changes
                if (fieldErrors.country) setFieldErrors(prev => ({ ...prev, country: "" }));
                setError("");
              }}>
                <SelectTrigger id="country" className={`${fieldErrors.country ? "border-red-500 focus:ring-red-500" : ""}`}>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.country && <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{fieldErrors.country}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm">State/Province *</Label>
              {STATES[country as keyof typeof STATES] ? (
                <Select value={state} onValueChange={(val) => {
                  setState(val);
                  if (fieldErrors.state) setFieldErrors(prev => ({ ...prev, state: "" }));
                  setError("");
                }}>
                  <SelectTrigger id="state" className={`${fieldErrors.state ? "border-red-500 focus:ring-red-500" : ""}`}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES[country as keyof typeof STATES].map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="state"
                  placeholder="State or Province"
                  className={`${fieldErrors.state ? "border-red-500 focus:ring-red-500" : ""}`}
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    if (fieldErrors.state) setFieldErrors(prev => ({ ...prev, state: "" }));
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
          <Button onClick={handleSubmit} className="px-8 shadow-sm bg-[#213847] hover:bg-[#213847]/90 text-white">
            {mode === "create" ? "Create Company" : "Save Changes"}
          </Button>
        </DialogFooter >
      </DialogContent >
    </Dialog >
  );
}
