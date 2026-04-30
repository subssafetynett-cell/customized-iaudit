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
    if (!trimmedName) {
      setError("Company name is required");
      return;
    }

    const trimmedAddress = streetAddress.trim();
    if (!trimmedAddress) {
      setError("Street address is required");
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
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-industry" className="text-sm">Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger id="company-industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <Label htmlFor="company-contact" className="text-sm">Contact Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-contact"
                  placeholder="+1 234 567 8900"
                  className="pl-9"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>
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
              value={streetAddress}
              onChange={(e) => {
                setStreetAddress(e.target.value);
                setError("");
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm">City</Label>
              <Input
                id="city"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm">State/Province</Label>
              <Input
                id="state"
                placeholder="State or Province"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm">Country</Label>
              <Input
                id="country"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal-code" className="text-sm">Postal Code</Label>
              <Input
                id="postal-code"
                placeholder="Postal/Zip code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
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
          <Button onClick={handleSubmit} className="px-8 shadow-sm bg-[#213847] hover:bg-[#213847]/90 text-white">
            {mode === "create" ? "Create Company" : "Save Changes"}
          </Button>
        </DialogFooter >
      </DialogContent >
    </Dialog >
  );
}
