export interface Company {
  id: string;
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
  location?: string;
  contactDetails?: string;
  isoStandards: ISOStandard[];
  sites: Site[];
  createdAt: Date;
}

export interface Site {
  id: string;
  name: string;
  description?: string;
  siteType?: string;
  status?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPosition?: string;
  contactNumber?: string;
  email?: string;
  departments: Department[];
}

export type SiteType = "Warehouse" | "Office" | "Factory" | "Retail" | "Other";

export interface Department {
  id: string;
  name: string;
  code?: string;
  status?: string;
  manager?: string;
  description?: string;
}

export type ISOStandard = "ISO 9001" | "ISO 45001" | "ISO 20000";

export const ISO_STANDARDS: { value: ISOStandard; label: string; description: string }[] = [
  { value: "ISO 9001", label: "ISO 9001", description: "Quality Management Systems" },
  { value: "ISO 45001", label: "ISO 45001", description: "Occupational Health & Safety" },
  { value: "ISO 20000", label: "ISO 20000", description: "IT Service Management" },
];
