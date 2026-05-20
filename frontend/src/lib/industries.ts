/** Options for company industry dropdowns across the app */
export const COMPANY_INDUSTRIES = [
  "Construction",
  "Manufacturing",
  "Technology",
  "Healthcare",
  "Education",
  "Retail",
  "Finance",
  "Consultancy",
  "Other",
] as const;

export type CompanyIndustry = (typeof COMPANY_INDUSTRIES)[number];
