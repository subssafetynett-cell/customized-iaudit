import { EOSH_EXCEL_MODULE_META } from "@/data/eoshExcelModuleTemplates";
import { QFS_KORE_EXCEL_MODULE_META } from "@/data/qfsKoreExcelModuleTemplates";
import {
    findAuditTemplate,
    getAuditPlanTemplateLabel,
    parseAuditPlanTemplateIds,
} from "@/data/auditTemplates";
import { isModuleAuditPlan, resolveReportTemplate } from "@/lib/auditReportFindings";

export const MODULE_AUDIT_FACET_OPTIONS = [
    { value: "health_and_safety", label: "Health and Safety" },
    { value: "environmental", label: "Environmental" },
    { value: "quality", label: "Quality" },
] as const;

export type ModuleAuditFacetValue = (typeof MODULE_AUDIT_FACET_OPTIONS)[number]["value"];

/** EOSH module template id → requirement document number (user-provided catalog). */
export const EOSH_MODULE_DOCUMENT_NUMBERS: Record<string, string> = {
    "eosh-climate-protection-checklist": "200",
    "eosh-compressed-gases-checklist": "100",
    "eosh-confined-space-checklist": "105",
    "eosh-contractor-visitor-management-checklist": "110",
    "eosh-electrical-safety-checklist": "120",
    "eosh-energy-efficiency-checklist": "125",
    "eosh-emergency-action-checklist": "140",
    "eosh-ergonomics-and-manual-material-handling-checklist": "090",
    "eosh-fall-protection-and-prevention-checklist": "135",
    "eosh-managing-flammable-liquids-checklist": "150",
    "eosh-fleet-management-checklist": "155",
    "eosh-hazardous-energy-control-checklist": "160",
    "eosh-imcr-checklist": "005",
    "eosh-hot-work-checklist": "170",
    "eosh-hearing-conservation-checklist": "165",
    "eosh-lev-checklist": "180",
    "eosh-lift-trucks-checklist": "175",
    "eosh-lsr-checklist": "260",
    "eosh-materials-handling-equipment-checklist": "195",
    "eosh-ppe-checklist": "205",
    "eosh-records-management-checklist": "060",
    "eosh-respiratory-protection-checklist": "210",
    "eosh-spill-prevention-checklist": "192",
    "eosh-traffic-route-safety-checklist": "215",
    "eosh-transportation-of-dangerous-goods-checklist": "193",
    "eosh-water-resource-sustainability-checklist": "235",
    "eosh-waste-water-management-checklist": "225",
    "eosh-waste-management-checklist": "220",
    "eosh-machine-guarding-checklist": "185",
    "eosh-protection-from-extreme-temperatures-checklist": "240",
    "eosh-process-safety-checklist": "194",
};

/** QFS KORE module template id → requirement document number (user-provided catalog). */
export const QFS_MODULE_DOCUMENT_NUMBERS: Record<string, string> = {
    "qfs-kore-general-operating-requirements-checklist": "001",
    "qfs-kore-imcr-checklist": "005",
    "qfs-kore-gmp-facility-design-checklist": "010",
    "qfs-kore-security-checklist": "012",
    "qfs-kore-maintenance-program-checklist": "014",
    "qfs-kore-calibration-and-verification-checklist": "016",
    "qfs-kore-pest-control-checklist": "018",
    "qfs-kore-ppe-and-personnel-hygiene-checklist": "020",
    "qfs-kore-control-and-destruction-checklist": "030",
    "qfs-kore-retention-samples-checklist": "050",
    "qfs-kore-records-management-checklist": "060",
    "qfs-kore-consumer-engagement-checklist": "070",
    "qfs-kore-haccp-checklist": "080",
    "qfs-kore-labeling-coding-and-traceability-checklist": "090",
    "qfs-kore-incoming-receipt-and-handling-checklist": "100",
    "qfs-kore-water-for-product-manufacturing-checklist": "180",
    "qfs-kore-water-monitoring-requirements-checklist": "185",
    "qfs-kore-design-and-operation-of-water-checklist": "197",
    "qfs-kore-package-handling-and-preparation-checklist": "200",
    "qfs-kore-mixing-and-blending-checklist": "205",
    "qfs-kore-processing-and-filling-requirements-checklist": "300",
    "qfs-kore-carbonated-processing-checklist": "308",
    "qfs-kore-equipment-technology-and-process-checklist": "400",
    "qfs-kore-environmental-monitoring-program-checklist": "440",
    "qfs-kore-environmental-monitoring-programme-checklist": "440",
    "qfs-kore-immediate-consumption-equipment-checklist": "500",
    "qfs-kore-production-process-and-monitoring-checklist": "600",
    "qfs-kore-marketplace-monitoring-checklist": "605",
    "qfs-kore-sensory-testing-checklist": "650",
    "qfs-kore-cleaning-and-sanitation-checklist": "750",
    "qfs-kore-food-allergen-and-control-checklist": "760",
    "qfs-kore-warehouse-and-distribution-checklist": "900",
    "qfs-kore-packaging-specifications-checklist": "960",
};

export function facetLabelFromStoredValue(stored: string | undefined | null): string {
    const raw = String(stored || "").trim();
    if (!raw) return "";
    const match = MODULE_AUDIT_FACET_OPTIONS.find(
        (o) => o.value === raw || o.label.toLowerCase() === raw.toLowerCase(),
    );
    return match?.label || raw;
}

export function resolveModuleAuditFacetCategory(auditData: Record<string, unknown>): {
    facet: string;
    category: string;
} {
    const info = (auditData.auditGlobalInfo as Record<string, string>) || {};
    return {
        facet: facetLabelFromStoredValue(info.facet),
        category: String(info.category || "").trim(),
    };
}

export function facetReqPrefix(facetLabel: string): string {
    const f = facetLabel.toLowerCase();
    if (f.includes("environment")) return "ENV-REQ";
    if (f.includes("quality")) return "QFS-REQ";
    return "OHS-REQ";
}

function resolveModuleSectionTitle(templateId: string): string {
    const eosh = EOSH_EXCEL_MODULE_META.find((m) => m.id === templateId);
    if (eosh) return eosh.sectionTitle;
    const qfs = QFS_KORE_EXCEL_MODULE_META.find((m) => m.id === templateId);
    if (qfs) return qfs.sectionTitle;
    const template = findAuditTemplate(templateId);
    if (!template) return "Module";
    return getAuditPlanTemplateLabel(template)
        .replace(/^(EOSH|QFS KORE)\s*[—–-]\s*/i, "")
        .trim();
}

function resolveModuleDocumentNumber(templateId: string): string {
    const fromEosh = EOSH_MODULE_DOCUMENT_NUMBERS[templateId];
    if (fromEosh) return fromEosh;

    const fromQfs = QFS_MODULE_DOCUMENT_NUMBERS[templateId];
    if (fromQfs) return fromQfs;

    const qfs = QFS_KORE_EXCEL_MODULE_META.find((m) => m.id === templateId);
    if (!qfs) return "";

    const rqMatch = qfs.moduleLabel.match(/(?:PRP-RQ|QFS-RQ|QFS-SP)-(\d+)/i);
    if (rqMatch) return rqMatch[1].padStart(3, "0");

    return "";
}

function sanitizeFileNamePart(value: string): string {
    return value
        .trim()
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
}

/** Module audit download base name: OHS-REQ-200-Climate_Protection */
export function buildModuleAuditReportFileName(plan: Record<string, unknown>): string | null {
    const template = resolveReportTemplate(plan as { templateId?: string | null });
    if (!isModuleAuditPlan((plan as { templateId?: string }).templateId, template)) {
        return null;
    }

    const auditData =
        plan.auditData && typeof plan.auditData === "object" && !Array.isArray(plan.auditData)
            ? (plan.auditData as Record<string, unknown>)
            : {};
    const { facet } = resolveModuleAuditFacetCategory(auditData);
    const prefix = facetReqPrefix(facet);

    const templateId =
        parseAuditPlanTemplateIds((plan as { templateId?: string }).templateId)[0] ||
        template?.id ||
        "";
    const docNumber = resolveModuleDocumentNumber(templateId);
    const moduleName = sanitizeFileNamePart(resolveModuleSectionTitle(templateId));

    const parts = [prefix];
    if (docNumber) parts.push(docNumber);
    if (moduleName) parts.push(moduleName);
    return parts.filter(Boolean).join("-") || null;
}
