import { EOSH_EXCEL_MODULE_TEMPLATES } from "./eoshExcelModuleTemplates";
import { QFS_KORE_EXCEL_MODULE_TEMPLATES } from "./qfsKoreExcelModuleTemplates";
import { ISO_14001_MANAGEMENT_SYSTEM_CHECKLIST } from "./iso14001ManagementSystemChecklist";

export type {
    AuditStandard,
    TemplateType,
    SectionContent,
    ChecklistContent,
    ClauseChecklistContent,
    ProcessAuditContent,
    AuditTemplate,
} from "./auditTemplateTypes";

import type { AuditTemplate, TemplateType } from "./auditTemplateTypes";

/**
 * Legacy / shorthand template ids saved on audit plans → canonical template ids.
 * Plan #4 references `qfs-kore-audit-checklist` for the first QFS module.
 */
export const AUDIT_TEMPLATE_ID_ALIASES: Record<string, string> = {
    "qfs-kore-audit-checklist": "qfs-kore-general-operating-requirements-checklist",
};

export function resolveAuditTemplateId(
    templateId?: string | null,
): string | undefined {
    if (!templateId) return undefined;
    // Multi-module plans store comma-separated ids — resolve the first for single-id APIs.
    const first = String(templateId).split(",")[0]?.trim();
    if (!first) return undefined;
    return AUDIT_TEMPLATE_ID_ALIASES[first] ?? first;
}

/** Parse one or more template ids stored on an audit plan (`id` or `id1,id2`). */
export function parseAuditPlanTemplateIds(
    templateId?: string | null,
): string[] {
    if (!templateId) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of String(templateId).split(",")) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const id = AUDIT_TEMPLATE_ID_ALIASES[trimmed] ?? trimmed;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

export function serializeAuditPlanTemplateIds(ids: string[]): string {
    return parseAuditPlanTemplateIds(ids.join(",")).join(",");
}

export function findAuditTemplate(
    templateId?: string | null,
): AuditTemplate | undefined {
    const id = resolveAuditTemplateId(templateId);
    if (!id) return undefined;
    return auditTemplates.find((t) => t.id === id);
}

export function findAuditTemplates(
    templateId?: string | null,
): AuditTemplate[] {
    return parseAuditPlanTemplateIds(templateId)
        .map((id) => auditTemplates.find((t) => t.id === id))
        .filter((t): t is AuditTemplate => Boolean(t));
}

/**
 * When the audit program uses EOSH/QFS modules, lock the plan to the modules
 * scheduled for this execution (month). Returns null for ISO programs (free picker).
 */
export function getLockedPlanTemplatesFromExecution(
    execution?: { clauses?: Array<{ id?: string; standard?: string }> | null } | null,
    program?: {
        isoStandard?: string | null;
        scheduleData?: { criteriaType?: string; moduleFamily?: string } | null;
    } | null,
): AuditTemplate[] | null {
    const scheduleData = program?.scheduleData;
    const iso = String(program?.isoStandard || "");
    const isModuleProgram =
        scheduleData?.criteriaType === "module" ||
        iso.includes("EOSH Module:") ||
        iso.includes("QFS KORE Module:");
    if (!isModuleProgram) return null;

    const clauses = Array.isArray(execution?.clauses) ? execution!.clauses! : [];
    const templates: AuditTemplate[] = [];
    const seen = new Set<string>();
    for (const clause of clauses) {
        const id = String(clause?.id || "").trim();
        if (!id || seen.has(id)) continue;
        const template = findAuditTemplate(id);
        if (!template) continue;
        if (template.module !== "EOSH" && template.module !== "QFS KORE") continue;
        seen.add(id);
        templates.push(template);
    }
    return templates.length > 0 ? templates : null;
}

/** Short label for audit plan template picker. */
export function getAuditPlanTemplateLabel(
    template: Pick<AuditTemplate, "type" | "isIntegrated" | "title" | "module">,
    isMultiStandard = false,
): string {
    // Named Excel modules (EOSH / QFS) — show the module name, not a generic IMS label.
    if (template.module === "QFS KORE") {
        const name = template.title
            .replace(/^KORE QFS Internal Audit Checklist\s*[—–-]\s*/i, "")
            .trim();
        return name ? `QFS KORE — ${name}` : template.title;
    }
    if (template.module === "EOSH") {
        const name = template.title
            .replace(/^EOSH Internal Audit Checklist\s*[—–-]\s*/i, "")
            .replace(/^Management System:\s*/i, "")
            .trim();
        return name ? `EOSH — ${name}` : template.title;
    }

    if (isMultiStandard) {
        if (template.isIntegrated || template.type === "checklist") {
            return "IMS Checklist";
        }
        switch (template.type) {
            case "clause-checklist":
                return "IMS Clause Audit";
            case "process-audit":
                return "IMS Process";
            case "section":
                return "IMS Section";
            default:
                return "IMS Audit";
        }
    }
    switch (template.type) {
        case "clause-checklist":
            return "Clause Template";
        case "checklist":
            return "Checklist Template";
        case "process-audit":
            return "Process Template";
        case "section":
            return "Section Template";
        default:
            return "Audit Template";
    }
}

export function isAuditPlanMultiStandard(
    auditCriteria: string,
    programIsoStandard?: string,
): boolean {
    return resolveAuditPlanStandards(auditCriteria, programIsoStandard).length > 1;
}

export function getAuditPlanTemplateSubtitle(
    template: Pick<AuditTemplate, "standard" | "type" | "content" | "isIntegrated" | "module" | "title">,
    isMultiStandard: boolean,
): string {
    const countLabel = template.type === "checklist" ? "questions" : "clauses";
    if (template.module === "QFS KORE" || template.module === "EOSH") {
        return `${template.module} · ${template.content.length} ${countLabel}`;
    }
    if (isMultiStandard) {
        return `${getAuditPlanTemplateLabel(template, true)} · ${template.content.length} ${countLabel}`;
    }
    return `${template.standard} · ${template.content.length} ${countLabel}`;
}

const AUDIT_PLAN_KNOWN_STANDARDS = ["ISO 9001", "ISO 14001", "ISO 45001", "ISO 22000"] as const;

/** Resolve ISO standards from audit criteria / program for template filtering. */
export function resolveAuditPlanStandards(
    auditCriteria: string,
    programIsoStandard?: string,
): string[] {
    const criteriaUpper = auditCriteria.toUpperCase();
    const fromCriteria = AUDIT_PLAN_KNOWN_STANDARDS.filter((std) => criteriaUpper.includes(std));
    if (fromCriteria.length > 0) return [...fromCriteria];

    if (programIsoStandard) {
        const progUpper = programIsoStandard.toUpperCase();
        const fromProgram = AUDIT_PLAN_KNOWN_STANDARDS.filter((std) => progUpper.includes(std));
        if (fromProgram.length > 0) return [...fromProgram];
        if (progUpper.includes("22000")) return ["ISO 22000"];
        return programIsoStandard.split(",").map((s) => s.trim()).filter(Boolean);
    }

    return [];
}

/** Templates offered in the audit plan picker for the active ISO standard(s). */
export function getAuditPlanTemplateOptions(
    auditCriteria: string,
    programIsoStandard?: string,
): AuditTemplate[] {
    const standards = resolveAuditPlanStandards(auditCriteria, programIsoStandard);
    const isMultiStandard = standards.length > 1;

    const filtered = auditTemplates.filter((template) => {
        if (template.alwaysAvailableInPlan) return true;
        if (standards.length === 0) return true;
        return standards.some((s) => {
            const tStd = template.standard.toUpperCase();
            const searchStd = s.toUpperCase();
            return (
                tStd.includes(searchStd) ||
                searchStd.includes(tStd) ||
                (template.isIntegrated && isMultiStandard)
            );
        });
    });

    if (isMultiStandard) {
        const integratedChecklist = filtered.find((t) => t.isIntegrated);
        const uniqueTypes = new Set<TemplateType>();
        return filtered.filter((t) => {
            if (t.alwaysAvailableInPlan) return true;
            if (t.type === "checklist") {
                if (integratedChecklist) return t.id === integratedChecklist.id;
                if (uniqueTypes.has("checklist")) return false;
                uniqueTypes.add("checklist");
                return true;
            }
            if (uniqueTypes.has(t.type)) return false;
            uniqueTypes.add(t.type);
            return true;
        });
    }

    return filtered;
}

/** Section divider / heading copy on the audit execution page — varies by template type. */
export function getAuditExecuteSectionLabels(
    template: Pick<AuditTemplate, "type" | "isTripleMapping">,
): { divider: string; detailsTitle: string | null } {
    if (template.isTripleMapping) {
        return {
            divider: "Integrated Audit Checklist",
            detailsTitle: "Integrated Audit Checklist",
        };
    }
    switch (template.type) {
        case "checklist":
            return { divider: "Audit Checklist", detailsTitle: null };
        case "clause-checklist":
            return { divider: "Clause Audit", detailsTitle: "Clause Audit Details" };
        case "process-audit":
            return { divider: "Process Audit", detailsTitle: null };
        case "section":
            return { divider: "Audit Sections", detailsTitle: null };
        default:
            return { divider: "Audit Execution", detailsTitle: null };
    }
}

export const auditTemplates: AuditTemplate[] = [
    ISO_14001_MANAGEMENT_SYSTEM_CHECKLIST,
    {
        id: "iso-45001-management-system-checklist",
        title: "Management System: ISO 45001:2018 Audit Checklist",
        standard: "ISO 45001",
        type: "checklist",
        alwaysAvailableInPlan: true,
        description:
            "ISO 45001:2018 OH&S management system audit checklist (REQUIREMENT / QUESTION / OK / NOT OK / COMMENT). Covers clauses 4.4, 5.1–5.3, 6.1–6.2, 7.1–7.5, 8.1–8.2, 9.1.1, and 10.1–10.2.",
        content: [
            {
                clause: "4.4",
                question:
                    "OH&S Management System — Have you implemented and have the system in place to maintain and continually improve your OH&S management system, including the processes needed and their interactions, in accordance with the requirements of ISO 45001?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "5.1",
                question:
                    "Leadership and commitment — How does Top Management demonstrate leadership and commitment with respect to the OH&S management system:\n" +
                    "a) taking overall responsibility and accountability for the prevention of work related injury and ill health, as well as the provision of safe and healthy workplaces and activities?\n" +
                    "b) ensuring that the OH&S policy and related OH&S objectives are established for the OH&S management system and are compatible with the strategic direction of the organization?\n" +
                    "c) ensuring the integration of the OH&S management system requirements into the organisation's business processes?\n" +
                    "d) ensuring that the resources needed for the OH&S management system are available?\n" +
                    "e) communicating the importance of effective OH&S management and of conforming to the OH&S management system requirements?\n" +
                    "f) ensuring that the OH&S management system achieves its intended outcomes?\n" +
                    "g) directing and supporting workers to contribute to the effectiveness of the OH&S management system?\n" +
                    "h) ensuring and promoting continual improvement?\n" +
                    "i) supporting other relevant management roles to demonstrate their leadership as it applies to their areas of responsibility?\n" +
                    "j) developing, leading and promoting a culture in the organisation that supports the intended outcomes of the OH&S management system?\n" +
                    "k) protecting workers from reprisals when reporting incidents, hazards, risks and opportunities?\n" +
                    "l) ensuring the organisation establishes and implements a process(es) for consultation and participation of workers?\n" +
                    "m) supporting the establishment and functioning of health and safety committee?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "5.2",
                question:
                    "OH&S Policy — Have top management established, implemented and maintained a OH&S policy that:\n" +
                    "a) includes a commitment to provide safe and healthy working conditions for the prevention of work related injury and ill health and is appropriate to the purpose, size and context of the organisation and to the specific nature of its OH&S risks and opportunities?\n" +
                    "b) provides a framework for setting OH&S objectives?\n" +
                    "c) includes a commitment to fulfil legal requirements and other requirements?\n" +
                    "d) includes a commitment to eliminate hazards and reduce OH&S risks?\n" +
                    "e) includes commitment to continual improvement of the OH&S management system?\n" +
                    "f) includes a commitment to consultation and participation of workers, and, where they exist, workers' representatives?\n\n" +
                    "Is the OH&S policy:\n" +
                    "• available as documented information?\n" +
                    "• communicated within the organisation?\n" +
                    "• available to interested parties?\n" +
                    "• relevant and appropriate?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "5.3",
                question:
                    "Organizational roles, responsibilities and authorities — Does top management ensure that the responsibilities and authorities for relevant roles within the OH&S management system are assigned, available as documented information, communicated and understood at all levels within the organization?\n\n" +
                    "Do workers assume responsibility for those aspects of the OH&S management system for which they have control?\n\n" +
                    "Has top management assigned the responsibility and authority for:\n" +
                    "a) ensuring that the OH&S management system conforms to the requirements of ISO 45001?\n" +
                    "b) reporting on the performance of the OH&S management system to top management?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "6.1.1",
                question:
                    "Actions to address risks and opportunities — When planning for the OH&S management system, have you considered the issues referred to in 4.1 and the requirements referred to in 4.2 and 4.3 and determined the risks and opportunities that need to be addressed to:\n" +
                    "a) give assurance that the OH&S management system can achieve its intended outcomes?\n" +
                    "b) prevent, or reduce, undesired effects?\n" +
                    "c) achieve continual improvement?\n\n" +
                    "When determining the risks and opportunities for the OH&S management system and its intended outcomes, has the organisation taken into account:\n" +
                    "• hazards?\n" +
                    "• OH&S risks and other risks?\n" +
                    "• OH&S opportunities and other opportunities?\n" +
                    "• legal and other requirements?\n\n" +
                    "Has your organization in its planning process determined and assessed the risks and opportunities relevant to the intended outcomes of the OH&S system associated with planned changes (permanent or temporary) before the change is implemented?\n\n" +
                    "Does your organization maintain documented information on:\n" +
                    "• risks and opportunities?\n" +
                    "• the process and actions needed to determine and address its risks and opportunities to the extent necessary to have confidence that they are carried out as planned?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "6.1.2.1",
                question:
                    "Hazard identification — Has the organisation established, implemented and maintained a process(es) for hazard identification that is ongoing and proactive? Do the processes take into account, but not be limited to:\n" +
                    "a) how work is organised, social factors (including workload, work hours, victimization, harassment and bullying), leadership and the culture of the organisation?\n" +
                    "b) routine and non-routine activities and situations, including hazards arising from:\n" +
                    "   1. infrastructure, equipment, materials, substances and the physical conditions of the workplace?\n" +
                    "   2. product and service design, research, development, testing, production, assembly, construction, service delivery, maintenance and disposal?\n" +
                    "   3. human factors?\n" +
                    "   4. how work is performed?\n" +
                    "c) past relevant incidents, internal or external to the organisation, including emergencies, and their causes?\n" +
                    "d) potential emergency situations?\n" +
                    "e) people, including consideration of:\n" +
                    "   1. those with access to the workplace and their activities, including workers, contractors, visitors and other persons?\n" +
                    "   2. those in the vicinity of the workplace who can be affected by the activities of the organisation?\n" +
                    "   3. workers at a location not under the direct control of the organisation?\n" +
                    "f) other issues, including consideration of:\n" +
                    "   1. the design of work areas, processes, installations, machinery/equipment, operating procedures and work organisation, including their adaptation to the needs and capabilities of the workers involved?\n" +
                    "   2. situations occurring in the vicinity of the workplace caused by work-related activities under the control of the organisation?\n" +
                    "   3. situations not controlled by the organisation and occurring in the vicinity of the workplace that can cause injury and ill health to persons in the workplace?\n" +
                    "g) actual or proposed changes in organisation, operations, processes, activities and the OH&S management system?\n" +
                    "h) changes in knowledge of, and information about, hazards?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "6.1.2.2",
                question:
                    "Assessment of OH&S risks and other risks to the OH&S management system — Has the organisation established, implemented and maintained a process to:\n" +
                    "a) assess OH&S risks from the identified hazards, while taking into account the effectiveness of existing controls?\n" +
                    "b) determine and assess the other risks related to the establishment, implementation, operation and maintenance of the OH&S management system?\n\n" +
                    "Has the organisation's methodologies and criteria for the assessment of OH&S risks been defined with respect to the scope, nature and timing to ensure they are proactive rather than reactive and are used in a systematic way?\n\n" +
                    "Does the organisation maintain and retain documented information on the methodologies and criteria?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "6.1.2.3",
                question:
                    "Assessment of OH&S opportunities and other opportunities for the OH&S management system — Have the organisation established, implemented and maintained processes to assess:\n" +
                    "a) OH&S opportunities to enhance OH&S performance, while taking into account planned changes to the organisation, its policies, its processes and its activities and:\n" +
                    "   1. opportunities to adapt work, work organisation and work environment to workers?\n" +
                    "   2. opportunities to eliminate hazards and reduce OH&S risks?\n" +
                    "b) other opportunities for improving the OH&S management system?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "6.1.3",
                question:
                    "Determination of legal requirements and other requirements — Has the organisation established, implemented and maintained processes to:\n" +
                    "a) determine and have access to up-to-date legal requirements and other requirements that are applicable to the hazards, OH&S risks and OH&S management system?\n" +
                    "b) determine how these legal requirements and other requirements apply to the organisation and what needs to be communicated?\n" +
                    "c) take legal and other requirements into account when establishing, implementing, maintaining and continually improving its OH&S management system?\n\n" +
                    "Does the organisation maintain and retain information on its legal and other requirements?\n\n" +
                    "How does the organisation ensure its legal requirements are up to date and reflect any changes?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "6.1.4",
                question:
                    "Planning action — Does the organisation's plan include:\n" +
                    "a) actions to address these risks and opportunities, address legal and other requirements and prepare for and respond to emergency situations?\n" +
                    "b) how to integrate and implement the actions into its OH&S management system processes or other business processes?\n\n" +
                    "Has the organisation taken into account the hierarchy of controls and outputs from the OH&S management system when planning to take action?\n\n" +
                    "Does the organisation take into account best practice, technological options and financial, operational and business requirements when planning its actions?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "6.2",
                question:
                    "OH&S objectives and planning to achieve them — Has your organization established OH&S objectives at relevant functions and levels that are needed to maintain and continually improve the OH&S management system?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "6.2.1",
                question:
                    "OH&S objectives — Are the OH&S objectives:\n" +
                    "a) consistent with the OH&S policy?\n" +
                    "b) measurable (if practicable) or capable of performance evaluation?\n" +
                    "c) taking into account applicable requirements, the results of the assessment of risks and opportunities, and the results of consultation with workers and, where they exist, workers' representatives?\n" +
                    "d) monitored?\n" +
                    "e) communicated?\n" +
                    "f) updated as appropriate?\n\n" +
                    "Do you maintain and retain documented information on the OH&S objectives?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "6.2.2",
                question:
                    "Planning to achieve OH&S objectives — When planning how to achieve your OH&S objectives, has your organization determined:\n" +
                    "a) what will be done?\n" +
                    "b) what resources will be required?\n" +
                    "c) who will be responsible?\n" +
                    "d) when it will be completed?\n" +
                    "e) how the results will be evaluated, including indicators for monitoring?\n" +
                    "f) how the actions to achieve OH&S objectives will be integrated into the organisation's business processes?\n\n" +
                    "Do you maintain and retain documented information on the OH&S plans?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "7.1",
                question:
                    "Resources — Has your organization determined and provided the resources needed for the establishment, implementation, maintenance and continual improvement of the OH&S management system?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "7.2",
                question:
                    "Competence — Has your organization:\n" +
                    "a) determined the necessary competence of workers that affects or can affect its OH&S performance?\n" +
                    "b) ensured that these workers are competent (including the ability to identify hazards) on the basis of appropriate education, training or experience?\n" +
                    "c) where applicable, taken actions to acquire and maintain the necessary competence, and evaluated the effectiveness of the actions taken?\n" +
                    "d) retained appropriate documented information as evidence of competence?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "7.3",
                question:
                    "Awareness — How does the organization ensure that workers are aware of:\n" +
                    "a) the OH&S policy and OH&S objectives?\n" +
                    "b) their contribution to the effectiveness of the OH&S management system, including the benefits of improved OH&S performance?\n" +
                    "c) the implications and potential consequences of not conforming to the OH&S management system requirements?\n" +
                    "d) incidents and the outcomes of investigations that are relevant to them?\n" +
                    "e) hazards, OH&S risks and actions determined that are relevant to them?\n" +
                    "f) the ability to remove themselves from work situations that they consider present an imminent and serious danger to their life or health, as well as the arrangements for protecting them from undue consequences for doing so?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "7.4.1",
                question:
                    "Communication — General — How have you determined the internal and external communications relevant to the OH&S management system, including:\n" +
                    "a) on what it will communicate?\n" +
                    "b) when to communicate?\n" +
                    "c) with whom to communicate:\n" +
                    "   1. internally among the various levels and functions of the organisation?\n" +
                    "   2. among contractors and visitors to the workplace?\n" +
                    "   3. among other interested parties?\n" +
                    "d) how to communicate?\n\n" +
                    "How does the organisation take into account diversity aspects (gender, language, culture, literacy, disability) when considering its communication needs?\n\n" +
                    "How are the views of external interested parties considered in establishing its communication process(es)?\n\n" +
                    "When establishing its communication process(es), has the organisation taken into account its legal requirements and other requirements, and ensured that information to be communicated is consistent with information generated within the OH&S management system and is reliable?\n\n" +
                    "Who responds to relevant communications on its OH&S management system?\n\n" +
                    "In what form is documented information retained as evidence of its communications, as appropriate?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "7.4.2",
                question:
                    "Internal communication — Has the organisation ensured that:\n" +
                    "a) internally communicated information relevant to the OH&S management system is communicated among the various levels and functions of the organisation, including changes to the OH&S management system, as appropriate?\n" +
                    "b) workers are able to contribute to continual improvement?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "7.5.1",
                question:
                    "Documented information — General — Does your organization's OH&S management system include:\n" +
                    "a) documented information required by ISO 45001?\n" +
                    "b) documented information determined by the organization as being necessary for the effectiveness of the OH&S management system?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "7.5.2",
                question:
                    "Creating and updating — When creating and updating documented information, how does your organization ensure appropriate:\n" +
                    "a) identification and description (e.g. a title, date, author, or reference number)?\n" +
                    "b) format (e.g. language, software version, graphics) and media (e.g. paper, electronic)?\n" +
                    "c) review and approval for suitability and adequacy?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "7.5.3",
                question:
                    "Control of documented information — How do you ensure documented information required by your OH&S management system and by ISO 45001 is controlled to ensure:\n" +
                    "a) it is available and suitable for use, where and when it is needed?\n" +
                    "b) it is adequately protected (e.g. from loss of confidentiality, improper use, or loss of integrity)?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "8.1.1",
                question:
                    "Operational planning and control — General — Does your organization plan, implement, control and maintain the processes needed to meet requirements of the OH&S management system and to implement the actions determined in Clause 6 by:\n" +
                    "a) establishing criteria for the processes?\n" +
                    "b) implementing control of the processes in accordance with the criteria?\n" +
                    "c) maintaining and retaining documented information to the extent necessary to have confidence that the processes have been carried out as planned?\n" +
                    "d) adapting work to workers?\n\n" +
                    "How does your organization coordinate the relevant parts of the OH&S management system with other organisations in multi-employer workplaces?\n\n" +
                    "How does your organization ensure that outsourced processes are controlled (see 8.4)?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "8.1.2",
                question:
                    "Eliminating hazards and reducing OH&S risks — Has the organisation established, implemented and maintained a process(es) for the elimination of hazards and reduction of OH&S risks using the following hierarchy of controls:\n" +
                    "a) eliminate the hazard?\n" +
                    "b) substitute with less hazardous processes, operations, materials or equipment?\n" +
                    "c) use engineering controls and reorganization of work?\n" +
                    "d) use administrative controls, including training?\n" +
                    "e) use adequate personal protective equipment?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "8.1.3",
                question:
                    "Management of change — Has the organisation established a process(es) for the implementation and control of planned temporary and permanent changes that impact OH&S performance including:\n" +
                    "a) new products, services and processes, or changes to existing products, services and processes, including:\n" +
                    "   • workplace locations and surroundings?\n" +
                    "   • work organization?\n" +
                    "   • working conditions?\n" +
                    "   • equipment?\n" +
                    "   • work force?\n" +
                    "b) changes to legal requirements and other requirements?\n" +
                    "c) changes in knowledge or information about hazards and OH&S risks?\n" +
                    "d) developments in knowledge and technology?\n\n" +
                    "Does the organisation review the consequences of unintended changes, taking action to mitigate any adverse effects, as necessary?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "8.2",
                question:
                    "Emergency preparedness and response — Has the organisation established, implemented and maintained the process(es) needed to prepare for and respond to potential emergency situations identified in 6.1.2.1, and do they include:\n" +
                    "a) establishing a planned response to emergency situations, including provision of first aid?\n" +
                    "b) providing training for the planned response?\n" +
                    "c) periodically testing and exercising the planned response capability?\n" +
                    "d) evaluating performance and, as necessary, revising the planned response, including after testing and, in particular, after the occurrence of emergency situations?\n" +
                    "e) communicating and providing relevant information to all workers on their duties and responsibilities?\n" +
                    "f) communicating relevant information to contractors, visitors, emergency response services, government authorities and, as appropriate, the local community?\n" +
                    "g) taking into account the needs and capabilities of all relevant interested parties and ensuring their involvement, as appropriate, in the development of the planned response?\n\n" +
                    "Has the organisation maintained documented information on the process(es) and on the plans for responding to potential emergency situations?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "9.1.1",
                question:
                    "Monitoring, measurement, analysis and evaluation — Has the organisation established, implemented and maintained a process(es) for monitoring, measurement, analysis and performance evaluation? How does your organization determine:\n" +
                    "a) what needs to be monitored and measured:\n" +
                    "   1. the extent to which legal requirements and other requirements are fulfilled?\n" +
                    "   2. its activities and operations related to identified hazards, risks and opportunities?\n" +
                    "   3. progress towards achievement of the organisation's OH&S objectives?\n" +
                    "   4. effectiveness of operational and other controls?\n" +
                    "b) the methods for monitoring, measurement, analysis and performance evaluation, as applicable, to ensure valid results?\n" +
                    "c) the criteria against which the organisation will evaluate its OH&S performance?\n" +
                    "d) when the monitoring and measuring shall be performed?\n" +
                    "e) when the results from monitoring and measurement shall be analysed, evaluated and communicated?\n\n" +
                    "How does your organization evaluate the OH&S performance and determine the effectiveness of the OH&S management system?\n\n" +
                    "How does the organisation ensure that monitoring and measuring equipment is calibrated or verified as applicable, and used and maintained as appropriate?\n\n" +
                    "In what form does your organization retain appropriate documented information as evidence of the monitoring, measurement, analysis and performance evaluation and on the maintenance, calibration or verification of measuring equipment?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "10.1",
                question:
                    "Improvement — How do you determine and select opportunities for improvement and implement any necessary actions to achieve the intended outcomes of your OH&S management system?",
                findings: "",
                evidence: "",
                ofi: "",
            },
            {
                clause: "10.2",
                question:
                    "Incident, nonconformity and corrective action — When an incident or a nonconformity occurs, how does your organization:\n" +
                    "a) react in a timely manner to the incident or nonconformity and, as applicable:\n" +
                    "   1) take action to control and correct it?\n" +
                    "   2) deal with the consequences?\n" +
                    "b) evaluate, with the participation of workers and the involvement of other relevant interested parties, the need for corrective action to eliminate the root cause(s) of the incident or nonconformity, in order that it does not recur or occur elsewhere, by:\n" +
                    "   1) investigating the incident or reviewing the nonconformity?\n" +
                    "   2) determining the cause(s) of the incident or nonconformity?\n" +
                    "   3) determining if similar incidents have occurred, if nonconformities exist, or if they could potentially occur?\n" +
                    "c) review existing assessments of OH&S risks and other risks, as appropriate?\n" +
                    "d) determine and implement any action needed, including corrective action, in accordance with the hierarchy of controls and the management of change?\n" +
                    "e) assess OH&S risks that relate to new or changed hazards, prior to taking action?\n" +
                    "f) review the effectiveness of any action taken, including corrective action?\n" +
                    "g) make changes to the OH&S management system, if necessary?\n\n" +
                    "Does your organization take corrective actions appropriate to the effects or potential effects of the incidents or nonconformities encountered?\n\n" +
                    "In what form does your organization retain documented information as evidence of:\n" +
                    "a) the nature of the incidents or nonconformities and any subsequent actions taken?\n" +
                    "b) the results of any action and corrective action, including their effectiveness?\n\n" +
                    "How is this information communicated to relevant workers, and, where they exist, workers' representatives, and other interested parties?",
                findings: "",
                evidence: "",
                ofi: "",
            },
        ],
    },
    ...EOSH_EXCEL_MODULE_TEMPLATES,
    ...QFS_KORE_EXCEL_MODULE_TEMPLATES,
];
