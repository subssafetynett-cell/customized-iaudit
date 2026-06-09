export type AuditStandard = "ISO 9001" | "ISO 14001" | "ISO 45001" | "ISO 22000";
export type TemplateType = "section" | "checklist" | "clause-checklist" | "process-audit";

export interface SectionContent {
    title: string;
    placeholder: string;
}

export interface ChecklistContent {
    clause: string;
    question: string;
    findings: string;
    evidence: string;
    ofi: string;
    actionBy?: string;
    closeDate?: string;
    assignTo?: string;
    assignToName?: string;
    assignToEmail?: string;
    findingType?: "C" | "OFI" | "Min" | "Maj";
}export interface ClauseChecklistContent {
    clauseId: string; // e.g., "5"
    title: string; // "Leadership and Commitment"
    subClauses: string[]; // List of sub-clause titles e.g. "5.1 Leadership...", "5.2 Policy..."
    // Findings data structure
    findingType?: "C" | "OFI" | "Minor" | "Major";
    findingDetails?: string; // Text input
    findingImages?: string[]; // URLs or base64
    // Conditional fields
    description?: string;
    correction?: string;
    rootCause?: string;
    correctiveAction?: string;
    actionBy?: string;
    closeDate?: string;
    assignTo?: string;
    assignToName?: string;
    assignToEmail?: string;
}

export interface ProcessAuditContent {
    id: string;
    refNo?: string;
    clauseNo?: string;
    department?: string;
    processArea?: string;
    auditees?: string;
    evidence?: string;
    conclusion?: string;
    findingType?: "C" | "OFI" | "Minor" | "Major";
    description?: string;
    correction?: string;
    rootCause?: string;
    correctiveAction?: string;
    actionBy?: string;
    closeDate?: string;
    assignTo?: string;
    assignToName?: string;
    assignToEmail?: string;
}

export interface AuditTemplate {
    id: string;
    title: string;
    standard: AuditStandard;
    type: TemplateType;
    description: string;
    isIntegrated?: boolean;
    isTripleMapping?: boolean;
    content: SectionContent[] | ChecklistContent[] | ClauseChecklistContent[] | ProcessAuditContent[];
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
    {
        id: "iso-14001-clause-audit",
        title: "ISO 14001:2015 Clause Audit",
        standard: "ISO 14001",
        type: "clause-checklist",
        description: "Clause-by-clause audit with detailed finding reporting.",
        content: [
            {
                clauseId: "4",
                title: "Context of the Organization",
                subClauses: [
                    "4 Context of the Organization",
                    "4.1 Understanding the organization & its context",
                    "4.2 Understanding the needs and expectations of interested parties",
                    "4.3 Determining the scope of the EMS",
                    "4.4 Environmental management system"
                ]
            },
            {
                clauseId: "5",
                title: "Leadership and Commitment",
                subClauses: [
                    "5 Leadership",
                    "5.1 Leadership and Commitment",
                    "5.2 Environmental Policy",
                    "5.3 Organizational roles, responsibilities and authorities"
                ]
            },
            {
                clauseId: "6",
                title: "Planning",
                subClauses: [
                    "6 Planning",
                    "6.1 Actions to address risks and opportunities",
                    "6.1.1 General",
                    "6.1.2 Environmental aspects",
                    "6.1.3 Compliance obligations",
                    "6.1.4 Planning action",
                    "6.2 Environmental objectives and planning to achieve them",
                    "6.2.1 Environmental objectives",
                    "6.2.2 Planning actions to achieve environmental objectives"
                ]
            },
            {
                clauseId: "7",
                title: "Support",
                subClauses: [
                    "7 Support",
                    "7.1 Resources",
                    "7.2 Competence",
                    "7.3 Awareness",
                    "7.4 Communication",
                    "7.5 Documented Information"
                ]
            },
            {
                clauseId: "8",
                title: "Operation",
                subClauses: [
                    "8 Operation",
                    "8.1 Operational Planning and Control",
                    "8.2 Emergency Preparedness and Response"
                ]
            },
            {
                clauseId: "9",
                title: "Performance Evaluation",
                subClauses: [
                    "9 Performance Evaluation",
                    "9.1 Monitoring, measurement, analysis and evaluation",
                    "9.2 Internal Audit",
                    "9.3 Management Review"
                ]
            },
            {
                clauseId: "10",
                title: "Improvement",
                subClauses: [
                    "10 Improvement",
                    "10.1 General",
                    "10.2 Nonconformity and Corrective Action",
                    "10.3 Continual Improvement"
                ]
            }
        ]
    },
    {
        id: "iso-9001-clause-audit",
        title: "ISO 9001:2015 Clause Audit",
        standard: "ISO 9001",
        type: "clause-checklist",
        description: "Clause-by-clause Quality Management System audit.",
        content: [
            {
                clauseId: "4",
                title: "Context of the Organization",
                subClauses: [
                    "4 Context of the Organization",
                    "4.1 Understanding the organization & its context",
                    "4.2 Understanding the needs and expectations of interested parties",
                    "4.3 Determining the scope of the QMS",
                    "4.4 QMS and its processes"
                ]
            },
            {
                clauseId: "5",
                title: "Leadership",
                subClauses: [
                    "5 Leadership",
                    "5.1 Leadership and commitment",
                    "5.1.1 General",
                    "5.1.2 Customer focus",
                    "5.2 Policy",
                    "5.2.1 Establishing the quality policy",
                    "5.2.2 Communicating the quality policy",
                    "5.3 Organizational roles, responsibilities and authorities"
                ]
            },
            {
                clauseId: "6",
                title: "Planning",
                subClauses: [
                    "6 Planning",
                    "6.1 Actions to address risks and opportunities",
                    "6.2 Quality objectives and planning to achieve them",
                    "6.3 Planning of changes"
                ]
            },
            {
                clauseId: "7",
                title: "Support",
                subClauses: [
                    "7 Support",
                    "7.1 Resources",
                    "7.1.1 General",
                    "7.1.2 People",
                    "7.1.3 Infrastructure",
                    "7.1.4 Environment for the operation of processes",
                    "7.1.5 Monitoring and measuring resources",
                    "7.1.6 Organizational knowledge",
                    "7.2 Competence",
                    "7.3 Awareness",
                    "7.4 Communication",
                    "7.5 Documented information",
                    "7.5.1 General",
                    "7.5.2 Creating and updating",
                    "7.5.3 Control of documented information"
                ]
            },
            {
                clauseId: "8",
                title: "Operation",
                subClauses: [
                    "8 Operation",
                    "8.1 Operational planning and control",
                    "8.2 Requirements for products and services",
                    "8.2.1 Customer communication",
                    "8.2.2 Determining the requirements for products and services",
                    "8.2.3 Review of the requirements for products and services",
                    "8.2.4 Changes to requirements for products and services",
                    "8.3 Design and development of products and services",
                    "8.3.1 General",
                    "8.3.2 Design and development planning",
                    "8.3.3 Design and development inputs",
                    "8.3.4 Design and development controls",
                    "8.3.5 Design and development outputs",
                    "8.3.6 Design and development changes",
                    "8.4 Control of externally provided processes, products and services",
                    "8.4.1 General",
                    "8.4.2 Type and extent of control",
                    "8.4.3 Information for external providers",
                    "8.5 Production and service provision",
                    "8.5.1 Control of production and service provision",
                    "8.5.2 Identification and traceability",
                    "8.5.3 Property belonging to customers or external providers",
                    "8.5.4 Preservation",
                    "8.5.5 Post-delivery activities",
                    "8.5.6 Control of changes",
                    "8.6 Release of products and services",
                    "8.7 Control of nonconforming outputs"
                ]
            },
            {
                clauseId: "9",
                title: "Performance evaluation",
                subClauses: [
                    "9 Performance evaluation",
                    "9.1 Monitoring, measurement, analysis and evaluation",
                    "9.1.1 General",
                    "9.1.2 Customer satisfaction",
                    "9.1.3 Analysis and evaluation",
                    "9.2 Internal audit",
                    "9.3 Management review",
                    "9.3.1 General",
                    "9.3.2 Management review inputs",
                    "9.3.3 Management review outputs"
                ]
            },
            {
                clauseId: "10",
                title: "Improvement",
                subClauses: [
                    "10 Improvement",
                    "10.1 General",
                    "10.2 Nonconformity and corrective action",
                    "10.3 Continual improvement"
                ]
            }
        ]
    },
    {
        id: "iso-45001-clause-audit",
        title: "ISO 45001:2018 Clause Audit",
        standard: "ISO 45001",
        type: "clause-checklist",
        description: "Clause-by-clause Occupational Health and Safety audit.",
        content: [
            {
                clauseId: "4",
                title: "Context of the Organization",
                subClauses: [
                    "4 Context of the Organization",
                    "4.1 Understanding the organization & its context",
                    "4.2 Understanding the needs and expectations of interested parties",
                    "4.3 Determining the scope of the OH & S management system",
                    "4.4 OH & S management system"
                ]
            },
            {
                clauseId: "5",
                title: "Leadership and worker participation",
                subClauses: [
                    "5 Leadership and worker participation",
                    "5.1 Leadership and commitment",
                    "5.2 OH&S policy",
                    "5.3 Organizational roles, responsibilities and authorities",
                    "5.4 Consultation and participation of workers"
                ]
            },
            {
                clauseId: "6",
                title: "Planning",
                subClauses: [
                    "6 Planning",
                    "6.1 Actions to address risks and opportunities",
                    "6.1.1 General",
                    "6.1.2 Hazard identification and assessment of risks and opportunities",
                    "6.1.3 Determination of legal requirements and other requirements",
                    "6.1.4 Planning action",
                    "6.2 OH&S objectives and planning to achieve them",
                    "6.2.1 OH&S objectives",
                    "6.2.2 Planning to achieve OH&S objectives"
                ]
            },
            {
                clauseId: "7",
                title: "Support",
                subClauses: [
                    "7 Support",
                    "7.1 Resources",
                    "7.2 Competence",
                    "7.3 Awareness",
                    "7.4 Communication",
                    "7.4.1 General",
                    "7.4.2 Internal communication",
                    "7.4.3 External communication",
                    "7.5 Documented information",
                    "7.5.1 General",
                    "7.5.2 Creating and updating",
                    "7.5.3 Control of documented information"
                ]
            },
            {
                clauseId: "8",
                title: "Operation",
                subClauses: [
                    "8 Operation",
                    "8.1 Operational planning and control",
                    "8.1.1 General",
                    "8.1.2 Eliminating hazards and reducing OH&S risks",
                    "8.1.3 Management of change",
                    "8.1.4 Procurement",
                    "8.2 Emergency preparedness and response"
                ]
            },
            {
                clauseId: "9",
                title: "Performance evaluation",
                subClauses: [
                    "9 Performance evaluation",
                    "9.1 Monitoring, measurement, analysis and performance evaluation",
                    "9.1.1 General",
                    "9.1.2 Evaluation of compliance",
                    "9.2 Internal audit",
                    "9.2.1 General",
                    "9.2.2 Internal audit programme",
                    "9.3 Management review"
                ]
            },
            {
                clauseId: "10",
                title: "Improvement",
                subClauses: [
                    "10 Improvement",
                    "10.1 General",
                    "10.2 Incident, nonconformity and corrective action",
                    "10.3 Continual improvement"
                ]
            }
        ]
    },
    {
        id: "integrated-audit-checklist",
        title: "IMS Integrated Audit Checklist (ISO 9001, 14001, 45001)",
        standard: "ISO 9001",
        isIntegrated: true,
        isTripleMapping: true,
        type: "checklist",
        description: "IMS Integrated Audit Checklist covering ISO 9001, ISO 14001 and ISO 45001 requirements mapping.",
        content: [
            {
                clause: "4.1",
                question: "Has your organization determined external and internal issues relevant to its purpose and its strategic direction that affect its ability to achieve the intended result(s) of its EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.1",
                question: "Does your organization monitor and review information about these external and internal issues?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.2",
                question: "Does your organisation determine the interested parties that are relevant to the EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.2",
                question: "Does your organisation determine the requirements of these interested parties that are relevant to the EQMS, which may include regulatory requirements, local, regional or global environmental conditions that can affect, or be affected by, your organization??",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.2",
                question: "Does your organization determine which of those requirements are to be managed as compliance obligations in order to mitigate adverse risk or exploit beneficial opportunities that can be integrated in the operational planning of the EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "Does your organization determine the boundaries and applicability of the EQMS to establish its scope?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "When determining this scope, has your organization considered the external and internal issues referred to in 4.1?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "When determining this scope, has your organization considered the requirements of relevant interested parties referred to in 4.2?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "When determining this scope, has your organization considered the products and services of your organization and defined its operational units, functions and physical boundaries?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "When determining this scope, has your organization considered its activities, products and services in order to mitigate adverse risk or exploit beneficial opportunities that can be integrated into system, process and product lifecycles, such as: 1. Raw material acquisition; 2. Manufacture; 3. Packaging/Transport/Delivery; 4. Use; 5. End of life treatment; 6. Final disposal.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "Has your organization applied all the requirements of this International Standard if they are applicable within the determined scope of its EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "When determining this scope, has your organization considered and documented its ability and authority to control and influence factors relating to external and internal issues?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "Is the scope of your organization's EQMS available and maintained as documented information? (See 7.5.1a)",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "Does the scope state the types of products and services covered, and provide justification for any requirement of ISO 9001:2015 that your organization determines is not applicable to the scope of its EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4",
                question: "Has your organization has considered the knowledge and information obtained by 4.1 and 4.2 when implementing and operating its EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Has your organization established, implemented, maintained and continually improved an EQMS, including the processes needed and their interactions, in accordance with the requirements of ISO 9001:2015?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Has your organization determined the processes needed for the EQMS and their application throughout your organization?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Has your organization determined the inputs required and the outputs expected from these processes?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Has your organization determined the sequence and interaction of these processes?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Has your organization determined and applied the criteria and methods (including monitoring, measurements and related performance indicators) needed to ensure the effective operation and control of these processes?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Has your organization determined the resources needed for these processes and ensure their availability?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Has your organization assigned responsibilities and authorities for these processes?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Has your organization addressed the risks and opportunities as determined in accordance with the requirements of 6.1?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Has your organization evaluated these processes and implement any changes needed to ensure that these processes achieve their intended results?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.1",
                question: "Does your organization improve the processes and the EQMS as per the requirements of 10?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.2",
                question: "To the extent necessary, does your organization maintain documented information to support the operation of its processes?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4.2",
                question: "To the extent necessary, does your organization retain documented information to have confidence that the processes are being carried out as planned?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by taking accountability for the effectiveness of the EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by ensuring that integrated policies and objectives are established for the EQMS and are compatible with the context and strategic direction of your organization and its context?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by ensuring the integration of the EQMS requirements into your organization’s business processes?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Has Top Management demonstrated leadership and commitment to the EQMS by ensuring that your organization has the required resources to implement it?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by promoting the use of the process approach and risk-based thinking?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by ensuring that the resources needed for the EQMS are available?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by communicating the importance of effective quality and environmental management and of conforming to the EQMS requirements?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by ensuring that the EQMS achieves its intended results?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by engaging, directing and supporting persons to contribute to the effectiveness of the EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by promoting improvement?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.1",
                question: "Does Top management demonstrate leadership and commitment with respect to the EQMS by supporting other relevant management roles to demonstrate their leadership as it applies to their areas of responsibility?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.2",
                question: "Does Top management demonstrate leadership and commitment with respect to customer focus by ensuring that customer and applicable statutory and regulatory requirements are determined, understood and consistently met?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.2",
                question: "Does Top management demonstrate leadership and commitment with respect to customer focus by ensuring that the risks and opportunities that can affect conformity of products and services and the ability to enhance customer satisfaction are determined and addressed?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1.2",
                question: "Does Top management demonstrate leadership and commitment with respect to customer focus by ensuring that the focus on enhancing customer satisfaction is maintained?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2",
                question: "Has Top Management established, implemented and maintained as documented information (See 7.5.1) an environmental policy, with regard to the scope of our EQMS, is appropriate to the context; including the nature, scale, and environmental impacts of your organization’s activities, products and services?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2",
                question: "Has Top Management established, implemented and maintained as documented information (See 7.5.1) an environmental policy, with regard to the scope of our EQMS to provide a framework within which to establish and document our environmental objectives?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2",
                question: "Has Top Management established, implemented and maintained as documented information (See 7.5.1) an environmental policy, with regard to the scope of the EQMS, which includes a commitment to fulfil any compliance obligations deemed appropriate?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2",
                question: "Has Top Management established, implemented and maintained as documented information (See 7.5.1) an environmental policy, with regard to the scope of the EQMS, which includes a commitment to protect the environment, prevent pollution and any other specific commitments or obligations that are relevant to the organization’s context as appropriate? E.g.: 1. Sustainable resource use; 2. Climate change mitigation and adaptation; 3. Protection of biodiversity & ecosystems.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2",
                question: "Has Top Management established, implemented and maintained as documented information (See 7.5.1) an environmental policy, with regard to the scope of the EQMS, which includes a commitment to enhance environmental performance by undertaking continual improvement of your EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2.1",
                question: "Does Top management establish, implement and maintain a policy that is appropriate to the purpose and context of your organization and supports its strategic direction?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2.1",
                question: "Does Top management establish, implement and maintain a policy that provides a framework for setting quality objectives?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2.1",
                question: "Does Top management establish, implement and maintain a policy that includes a commitment to satisfy applicable requirements?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2.1",
                question: "Does Top management establish, implement and maintain a policy that includes a commitment to continual improvement of the EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2.2",
                question: "Is the EQMS policy available and be maintained as documented information? (See 7.5.1a)",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2.2",
                question: "Is the policy communicated, understood and applied within the organization?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2.2",
                question: "Is the policy available to relevant interested parties, as appropriate?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Does Top management ensure that the responsibilities and authorities for relevant roles are assigned, communicated and understood within your organization?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Has Top management assigned the responsibility and authority for ensuring that the EQMS conforms to the requirements of ISO 9001 and ISO 14001:2015?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Has Top management assigned the responsibility and authority for ensuring that the processes are delivering their intended outputs?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Has Top Management assigned responsibility and authority to relevant personnel for reporting on the performance of our EQMS, including environmental KPIs to Top Management?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Has Top management assigned the responsibility and authority for reporting on the performance of the EQMS and on opportunities for improvement (see 10.1), in particular to top management?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Has Top management assigned the responsibility and authority for ensuring the promotion of customer focus throughout your organization?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Has Top management assigned the responsibility and authority for ensuring that the integrity of the EQMS is maintained when changes to the EQMS are planned and implemented?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.1",
                question: "When planning for the EQMS, has the organization considered the issues referred to in 4.1 and the requirements referred to in 4.2?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.1",
                question: "Has the organization determined the risks and opportunities that need to be addressed to give assurance that the EQMS can achieve its intended result(s)?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.2",
                question: "Has the organization determined the environmental aspects of its activities, products and services that it can control and those that it can influence, and their associated environmental impacts, considering a life cycle perspective?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.3",
                question: "Has the organization determined and have access to the compliance obligations related to its environmental aspects?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.2.1",
                question: "Has the organization established quality and environmental objectives at relevant functions, levels and processes?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.2.2",
                question: "When planning how to achieve its environmental and quality objectives, has the organization determined what will be done, what resources will be required, who will be responsible, when it will be completed, and how the results will be evaluated?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1.1",
                question: "Has the organization determined and provided the resources needed for the establishment, implementation, maintenance and continual improvement of the EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1.2",
                question: "Has the organization determined and provided the persons necessary for the effective implementation of its EQMS and for the operation and control of its processes?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.2",
                question: "Has the organization determined the necessary competence of person(s) doing work under its control that affects its environmental performance and its ability to fulfil its compliance obligations?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.3",
                question: "Are persons doing work under the organization's control aware of the environmental policy, significant environmental aspects, their contribution to the effectiveness of the EQMS, and the implications of not conforming with the EQMS requirements?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.4.1",
                question: "Has the organization established, implemented and maintained the process(es) needed for internal and external communications relevant to the EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.5.1",
                question: "Does the organization's EQMS include documented information required by ISO 9001 and ISO 14001, and documented information determined by the organization as being necessary for the effectiveness of the EQMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.1",
                question: "Has the organization planned, implemented and controlled the processes needed to meet requirements for the provision of products and services, and to implement the actions determined in Clause 6?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.1",
                question: "Has the organization established operating criteria for the processes and implemented control of the processes in accordance with the operating criteria?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.2",
                question: "Has the organization established, implemented and maintained the process(es) needed to prepare for and respond to potential emergency situations?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.1.1",
                question: "Has the organization determined what needs to be monitored and measured, the methods for monitoring, measurement, analysis and evaluation, when the monitoring and measuring shall be performed, and when the results shall be analysed and evaluated?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.1.2",
                question: "Has the organization established, implemented and maintained the process(es) needed to evaluate fulfilment of its compliance obligations?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.2.1",
                question: "Does the organization conduct internal audits at planned intervals to provide information on whether the EQMS conforms to the organization's own requirements and the requirements of the standards, and is effectively implemented and maintained?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.3.1",
                question: "Does top management review the organization's EQMS, at planned intervals, to ensure its continuing suitability, adequacy, effectiveness and alignment with the strategic direction of the organization?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.1",
                question: "Has the organization determined and selected opportunities for improvement and implemented any necessary actions to meet customer requirements and enhance customer satisfaction?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.2",
                question: "When a nonconformity occurs, does the organization react to it and, as applicable, take action to control and correct it, and deal with the consequences, including mitigating adverse environmental impacts?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.3",
                question: "Does the organization continually improve the suitability, adequacy and effectiveness of the EQMS to enhance environmental and quality performance?",
                findings: "",
                evidence: "",
                ofi: ""
            }
        ]
    },
    {
        id: "iso-14001-checklist",
        title: "ISO 14001:2015 Internal Audit Checklist",
        standard: "ISO 14001",
        type: "checklist",
        description: "Comprehensive checklist for ISO 14001:2015 Environmental Management System internal audits.",
        content: [
            {
                clause: "4.1",
                question: "Has the organization determined external and internal issues that are relevant to its purpose and that affect its ability to achieve the intended outcomes of its EMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.2",
                question: "Has the organization determined the interested parties relevant to the EMS and their relevant needs and expectations?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "Has the organization determined the boundaries and applicability of the EMS to establish its scope?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4",
                question: "Has the organization established, implemented, maintained and continually improved an EMS, including the processes needed and their interactions?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1",
                question: "Does top management demonstrate leadership and commitment with respect to the EMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2",
                question: "Has top management established, implemented and maintained an environmental policy?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Are organizational roles, responsibilities and authorities assigned and communicated within the organization?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.1",
                question: "When planning for the EMS, has the organization considered issues from 4.1 and requirements from 4.2, and determined the risks and opportunities?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.2",
                question: "Has the organization determined the environmental aspects of its activities, products and services that it can control and those that it can influence?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.3",
                question: "Has the organization determined and have access to the compliance obligations related to its environmental aspects?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.2.1",
                question: "Has the organization established environmental objectives at relevant functions and levels?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1",
                question: "Has the organization determined and provided the resources needed for the establishment, implementation, maintenance and continual improvement of the EMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.2",
                question: "Has the organization determined the necessary competence of person(s) doing work under its control that affects its environmental performance?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.3",
                question: "Are persons doing work under the organization's control aware of the environmental policy, significant environmental aspects, and their contribution to the EMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.4.1",
                question: "Has the organization established, implemented and maintained the process(es) needed for internal and external communications relevant to the EMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.5.1",
                question: "Does the organization's EMS include documented information required by ISO 14001 and determined by the organization as necessary?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.1",
                question: "Has the organization established, implemented, controlled and maintained the processes needed to meet EMS requirements?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.2",
                question: "Has the organization established, implemented and maintained the process(es) needed to prepare for and respond to potential emergency situations?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.1.1",
                question: "Has the organization determined what needs to be monitored and measured, and the methods for monitoring, measurement, analysis and evaluation?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.1.2",
                question: "Has the organization established, implemented and maintained the process(es) needed to evaluate fulfilment of its compliance obligations?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.2.1",
                question: "Does the organization conduct internal audits at planned intervals to confirm the EMS conforms to the organization's requirements and ISO 14001?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.3",
                question: "Does top management review the organization's EMS, at planned intervals, to ensure its continuing suitability, adequacy and effectiveness?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.1",
                question: "Has the organization determined opportunities for improvement and implemented necessary actions to achieve the intended outcomes of its EMS?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.2",
                question: "When a nonconformity occurs, does the organization react to the nonconformity and take action to control and correct it?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.3",
                question: "Does the organization continually improve the suitability, adequacy and effectiveness of the EMS to enhance environmental performance?",
                findings: "",
                evidence: "",
                ofi: ""
            }
        ]
    },
    {
        id: "iso-45001-checklist",
        title: "ISO 45001:2018 Internal Audit Checklist",
        standard: "ISO 45001",
        type: "checklist",
        description: "Comprehensive checklist for ISO 45001:2018 Occupational Health and Safety Management System internal audits.",
        content: [
            {
                clause: "4.1",
                question: "Has the organization determined external and internal issues that are relevant to its purpose and that affect its ability to achieve the intended outcomes of its OH&S management system?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.2",
                question: "Has the organization determined the other interested parties, in addition to workers, that are relevant to the OH&S management system?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "Has the organization determined the boundaries and applicability of the OH&S management system to establish its scope?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4",
                question: "Has the organization established, implemented, maintained and continually improved an OH&S management system?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1",
                question: "Does top management demonstrate leadership and commitment with respect to the OH&S management system?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2",
                question: "Has top management established, implemented and maintained an OH&S policy?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Has top management assigned the responsibility and authority for relevant roles within the OH&S management system?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.4",
                question: "Has the organization established, implemented and maintained a process(es) for consultation and participation of workers at all applicable levels?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.1",
                question: "Has the organization considered the issues from 4.1 and requirements from 4.2 and 4.3, and determined the risks and opportunities?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.2.1",
                question: "Has the organization established, implemented and maintained a process(es) for ongoing and proactive hazard identification?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.2.2",
                question: "Has the organization established, implemented and maintained a process(es) to assess OH&S risks from the identified hazards?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1.3",
                question: "Has the organization established, implemented and maintained a process(es) to determine and have access to up-to-date legal and other requirements?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.2.1",
                question: "Has the organization established OH&S objectives at relevant functions and levels to improve the OH&S management system and performance?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1",
                question: "Has the organization determined and provided the resources needed for the establishment, implementation, maintenance and continual improvement of the OH&S management system?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.2",
                question: "Has the organization determined the necessary competence of workers that affects or can affect its OH&S performance?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.3",
                question: "Are workers made aware of the OH&S policy, OH&S objectives, their contribution to the OH&S management system, and implications of non-conformance?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.4.1",
                question: "Has the organization established, implemented and maintained the process(es) needed for internal and external communications?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.5.1",
                question: "Does the organization's OH&S management system include documented information required by ISO 45001?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.1.1",
                question: "Has the organization planned, implemented, controlled and maintained the processes needed to meet requirements of the OH&S management system?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.1.2",
                question: "Has the organization established, implemented and maintained a process(es) for the elimination of hazards and reduction of OH&S risks using the hierarchy of controls?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.1.3",
                question: "Has the organization established a process(es) for the implementation and control of planned changes that impact OH&S performance?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.1.4",
                question: "Has the organization established a process(es) to control the procurement of products and services to ensure their conformity to its OH&S management system?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.2",
                question: "Has the organization established, implemented and maintained a process(es) needed to prepare for and respond to potential emergency situations?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.1.1",
                question: "Has the organization determined what needs to be monitored and measured, and the methods for analysis and performance evaluation?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.1.2",
                question: "Has the organization established, implemented and maintained a process(es) for evaluating compliance with legal and other requirements?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.2.1",
                question: "Does the organization conduct internal audits at planned intervals to confirm the OH&S management system conforms to the organization's requirements and ISO 45001?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.3",
                question: "Does top management review the organization's OH&S management system, at planned intervals, to ensure its continuing suitability, adequacy and effectiveness?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.1",
                question: "Has the organization determined opportunities for improvement and implemented necessary actions to achieve intended outcomes?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.2",
                question: "Has the organization established, implemented and maintained a process(es), including reporting and investigating, to determine and manage incidents and nonconformities?",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.3",
                question: "Does the organization continually improve the suitability, adequacy and effectiveness of the OH&S management system, by enhancing OH&S performance?",
                findings: "",
                evidence: "",
                ofi: ""
            }
        ]
    },
    {
        id: "iso-22000-checklist",
        title: "ISO 22000:2018 Audit Checklist Form",
        standard: "ISO 22000",
        type: "checklist",
        description: "ISO 22000:2018 audit checklist — Part 1 (Clauses 4–10), Part 2 PRPs (ISO/TS 22002-1), and Part 3 FSSC 22000 V6 additional requirements.",
        content: [
            {
                clause: "4.1",
                question: "Understanding the organization and its context — The organisation has determined external and internal issues that are relevant to its purpose and that can affect its ability to achieve the intended results of FSMS. The organisation has identified, reviewed, and updated external and internal issues.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.2",
                question: "Understanding the needs and expectations of interested parties — The organization can consistently provide products and service that meet applicable statutory/regulatory and customer requirements with regard of food safety, the organization shall determine and the interested parties that are relevant to the food safety management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.3",
                question: "Determining the scope of the food safety management system — The organization had determined the boundaries and applicability of the food safety management system to establish its scope the scope shall specify the products and services processes and production sites that are addressed by the food management systems and shall include the activities, processes product or service that can have an influence on the food safety of the end products.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "4.4",
                question: "Food Safety Management system — The organization had established implemented, maintained, updated, and continually improve a food safety management system including the processes needed and their interactions, in accordance with the requirements of document.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.1",
                question: "Leadership and commitment — Top management has demonstrated leadership and commitment with respect the food safety management system by ensuring that the integration of food safety management system requirements into the organization's business process and the resource needed for the food safety management system are available etc.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2",
                question: "Policy — Top management have established, implemented, and maintained a food safety policy that Is appropriate to the purpose and context of organization and provides a framework for setting and reviewing the objectives of food safety management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.2.2",
                question: "Communicating the food safety policy — Top management has communicated the policy, made sure every employee understood the food safety policy and applied the policy at all levels within the organization.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "5.3",
                question: "Organizational roles, responsibilities — Top management has ensured that the responsibilities and authorities for relevant roles are assigned, communicated, and understood within the organization. Top management shall the responsibility and authority for ensuring that the food safety management system conforms to the requirements of this document and reporting on the performance of the food safety management system to top management including appointing the food safety team and the food safety team leaders.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.1",
                question: "Actions to address risks and opportunities — There are actions to address these risks and opportunities How to integrate and implement the actions into its food safety management system processes, evaluate the effectiveness of these actions taken by the organization to address risks and opportunities shall be proportionate and the potential impact on food safety requirements.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.2",
                question: "Objectives of the food safety management system and planning to achieve them — The organization has established objectives of the food safety management system at relevant functions and levels. The objectives of the food safety management shall be consistent with food safety policy; authorization of results and it is measurable.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "6.3",
                question: "Planning of changes — The organization has determined the need for change to the food safety management system, including personnel changes, the changes shall be carried out and communicated in planned manner. The organization shall consider the purpose of the changes and their potential consequence for supply and maintenance of safe food production, the integrity of the food safety management system, and the availability resources to effectively implement the change including the allocation or re-allocation of responsibilities and authorities.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1",
                question: "Resources — The organization had provided the resources needed for the establishment, implementation, maintenance, updating and continual improvement of the food safety management system. The capability of and any constraints on existing internal resources and Resources required from external source are considered.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1.2",
                question: "People — The organization has ensured that persons necessary to operate and maintain an effective food safety management system are competent. Where the assistance of external experts is used, evidence of agreement or contracts defining the competency, responsibility and authority of external experts has been retained as documented information.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1.3",
                question: "Infrastructure — The organization has provided the resources for the determination, establishment and maintenance of the infrastructure necessary to achieve conformity with the requirements of the food safety management system. Infrastructure can include land, vessels, buildings and associated utilities, equipment, including hardware and software, transportation, information and communication technology.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1.4",
                question: "Work environment — The organization has determined, provided and maintained the resources for the establishment, management and maintenance of the work environment necessary to achieve conformity with the requirements of the food safety management system. A suitable environment can be a combination of human and physical factors.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1.5",
                question: "Externally developed elements of the food safety management system — The organisation makes use of externally developed elements for the implemented food safety management system and ensured that the external elements are developed in conformance with requirements, is applicable to the site(s), specifically adapted to the processes and products of the organization, is implemented, maintained and updated as required and retained as documented information.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.1.6",
                question: "Control of externally provided processes, products or services — The organization has established and applied criteria for the evaluation, selection, monitoring of performance and re-evaluation of external providers of processes, products and/or services used.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.2",
                question: "Competence — There's necessary competence of person(s) including external providers doing work under its control that affects its food safety performance and effectiveness of food safety management system, ensure that these persons, including the food safety and those responsible for operation of the hazards control plan, are competent based on appropriate education, training, or experience.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.3",
                question: "Awareness — The organization had ensured that all persons doing work under the organization control shall be aware of the food safety policy, the objective of the food safety management system relevant to their task(s) and the individual contribution to the effectiveness of the food safety management system, including the benefits of improved food safety performance.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.4",
                question: "Communication — The organisation had established sufficient information is communicated externally and is available for interested parties of the food chain the organization shall establish implement and maintain effective communications with external providers and contractors, customers and/or consumers in relation to, product information to enable the safe handling display, storage, preparations, distribution and use of product within the food chain or by the consumer and Identified foods safety hazards that need to be controlled by the other organizations in the food chain, and/or consumers.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.4.2",
                question: "External communication — The organization has ensured that sufficient information is communicated externally and is available for interested parties of the food chain. The organization has effective communications with external providers and contractors, customers and/or consumers, statutory and regulatory authorities and other organizations that have an impact on, or will be affected by, the effectiveness or updating of the food safety management system. Evidence of external communication is retained as documented information.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.4.3",
                question: "Internal communication — The organization has an effective system for communicating issues having an impact on food safety. Ensuring that the food safety team is informed in a timely manner of any changes to any process or procedure.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.5",
                question: "Documented information — The organization food safety management had included documented information required by this document, document information determined by the organization as being necessary for the effectiveness of the food safety management system and documented information and food safety requirements required by statutory/regulatory authorities and customer.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.5.2",
                question: "Creating and updating — The organization has the appropriate identification and description, format and review and approval processes for suitability and adequacy of documents.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "7.5.3",
                question: "Control of documented information — All documented information is available and suitable for its use, is adequately protected, distributed, and retrieved as needed, stored and preserved adequately, controlled with regards to changes/ updates, retained and correctly disposed of when required.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.1",
                question: "Operation planning and control — The organization has met the requirements for the realization of safe products and implemented control and record keeping for the established criteria of the processes.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.2",
                question: "Prerequisite programs (PRPs) — There's establishment of the hazard control plan, the organization shall update the following information, if necessary, characteristics of raw materials, ingredients, and product – contact materials, characteristics of end product intended use and flow diagrams and description of processes and process environment.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.3",
                question: "Traceability system — The traceability system can uniquely identify any component of any process from incoming material from the suppliers to the first stage of the distribution route of the end product. This included rework of materials/ products.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.4",
                question: "Emergency preparedness and response — Top management has prepared and planned to identify preventive actions that deal with potential emergency situation and incidents that may impact on food safety and which are relevant to the role of the organization in the food chain.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.4.2",
                question: "Handling of emergencies and incidents — The organisation can respond to actual emergency situations and take action to reduce the consequences of the emergency situation, including the impact on food safety during an emergency. Able to periodically test procedures where practical and update the documented information after the occurrence of any incident, emergency situation or tests.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5",
                question: "Hazard control — The hazard analysis preliminary information had been collected, updated, and maintained by the food safety team. This shall include but not be limited to the organization products, processes, customers' requirements, equipment, and food safety hazards relevant to the food safety management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.1",
                question: "Preliminary steps to enable hazard analysis — The organization has carried out the hazard analysis, preliminary documented information has been collected, maintained and updated by the food safety team. This includes applicable statutory, regulatory and customer requirements, the organization's products, processes and equipment and relevant food safety hazards.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.1.2",
                question: "Characteristics of raw materials, ingredients and product contact materials — The organization has ensured that all applicable statutory and regulatory food safety requirements are identified for all raw materials, ingredients and product contact materials. Has maintained documented information concerning all raw materials, ingredients and product contact materials to the extent needed to conduct the hazard analysis.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.1.3",
                question: "Characteristics of end products — The organization ensured that all applicable statutory and regulatory food safety requirements are identified for all the end products intended to be produced. Also maintain documented information concerning the characteristics of end products to the extent needed to conduct the hazard analysis.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.1.4",
                question: "Intended use — The intended use, including reasonably expected handling of the end product and any unintended use but reasonably expected mishandling and misuse of the end product, is considered and shall be maintained as documented information to the extent needed to conduct the hazard analysis.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.1.5",
                question: "Flow diagrams and description of processes — The food safety team has established, updated flow diagrams as documented information for the products or product categories and the processes covered by the food safety management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.1.5.1",
                question: "Preparation of the flow diagrams — Flow diagrams are clear, accurate and sufficiently detailed to the extent needed to conduct the hazard analysis.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.1.5.2",
                question: "On-site confirmation of flow diagrams — The food safety team has confirmed on-site the accuracy of the flow diagrams, update the flow diagrams where appropriate and retained the documented information.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.1.5.3",
                question: "Description of processes and process environment — The food safety team shall describe, to the extent needed to conduct the hazard analysis, the layout of premises, including food and non-food handling areas, processing equipment and contact materials, existing PRPs, external requirements that can impact the choice and the strictness of the control measures and variations resulting from expected seasonal changes or shift patterns.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.2",
                question: "Hazard Analysis — The food safety team has conducted a hazard analysis, based on the preliminary information and determined the hazards that needs to be controlled.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.2.2",
                question: "Hazard identification and determination of acceptable levels — The organization has identified and documented all food safety hazards that are reasonably expected to occur in relation to the type of product, type of process and process environment.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.2.3",
                question: "Hazard assessment — The organization has conducted, for each identified food safety hazard, a hazard assessment to determine whether its prevention or reduction to an acceptable level is essential.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.2.4",
                question: "Selection and categorization of control measure(s) — Based on the hazard assessment, the organization has selected appropriate control measures or combination of control measures that will be capable of preventing or reducing the identified significant food safety hazards to defined acceptable levels. The organization has categorized the selected identified control measures to be managed as OPRP(s) or at CCPs. The categorization is carried out using a systematic approach.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.3",
                question: "Validation of control measure(s) and combinations of control measures — The food safety team has validated that the selected control measures can achieve the intended control of the significant food safety hazard(s). The validation was done prior to implementation of control measure(s) to be included in the hazard control plan and after any change therein.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.4",
                question: "Hazard Control plan (HACCP/OPRP Plan) — The hazard control plan includes the following information for each control measure at each CCP or OPR: Food safety hazards to be controlled at the CCP or by the OPRP, critical limit(s) at CCP or action criteria for OPRP, monitoring procedures, corrections to be made, records of monitoring, responsibilities and authorities.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.4.2",
                question: "Determination of critical limits and action criteria — Critical limits at CCPs and action criteria for OPRPs are specified. The rationale for their determination is documented. Critical limits at CCPs are measurable and action criteria for OPRPs are measurable or observable.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.4.3",
                question: "Monitoring systems at CCPs and for OPRPs — At each CCP, a monitoring system is established for each control measures to detect any failure to remain within the critical limits. The system includes all scheduled measurements relative to the critical limits. For each OPRP, a monitoring system is established for the control measures to detect failure to meet the action criterion.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.4.4",
                question: "Actions when critical limits or action criteria are not met — The organization has specified corrections and corrective actions to be taken when critical limits or action criterion are not met. Actions include potentially unsafe products are not released; the cause of nonconformity is identified, and recurrence is prevented.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.5.4.5",
                question: "Implementation of the hazard control plan — The organization has implemented and maintained the hazard control plan and retain evidence of the implementation as documented information.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.6",
                question: "Updating the information specifying the PRPs and the hazard control plan — There's establishment of the hazard control plan, the organization shall update the following information, if necessary, characteristics of raw materials, ingredients, and product – contact materials, characteristics of product intended use and flow diagrams and description of processes and process environment. When required, the hazard control plan and/or the PRP(s) shall be updated.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.7",
                question: "Control of monitoring and measuring — The organization had provided evidence that the specified monitoring and measuring methods and equipment is in use is adequate for the monitoring and measuring activities related to the PRP(s) and the hazard control plan. The monitoring and measuring the equipment used shall be calibrate or verified at specified intervals prior to use, adjusted or re-adjusted as necessary, identify to enable the calibration status to be determined. Safeguard from adjustments that would invalidate the measurement result; and protect from damage and deterioration. The results of calibration and verification shall be retained as documented information. The calibration of equipment shall be traceable to international measurements standards.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.8.1",
                question: "Verification — The organization shall establish, implement and maintain verification activities. The verification planning shall define purpose, methods, frequencies and responsibilities for the verification activities. The verification activities shall confirm that: the PRP(s) are implemented and effective; the hazard control plan is implemented and effective; hazard levels are within identified acceptable levels; input to the hazard analysis is updated; other actions determined by the organization are implemented and effective.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.8.2",
                question: "Analysis of results of verification activities — The food safety team has conducted an analysis of the results of verification that shall be used as an input to the performance evaluation of the food management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.9",
                question: "Verification related to PRPs and the hazard control plan — The organization had ensured that data derived from monitoring of OPRPs and CCPs are evaluated by designated persons with sufficient competence and authority to initiate corrective actions and corrections.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.9.2",
                question: "Corrections — The organization had ensured that when critical limits at CCPs and/or action criteria for OPRPs are not met, the products affected are identified and controlled about their use and release. The organization has established, maintained and updated documented information that includes methods of identification assessment, correction for affected products to ensure their proper handling: and arrangements for review of corrections carried out.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.9.3",
                question: "Corrective action — The need for corrective action shall be evaluated when critical limits at CCPs and/or action criteria for OPRPs are not met. The organization shall establish and maintain document information that specify appropriate action to identify and eliminate the cause of detected nonconformities, to prevent recurrence, and to return the process to control after a nonconformity is identified. This action shall include reviewing nonconformities identified by customers and/or consumer complaints/regulatory inspection reports, reviewing trends in monitoring results that may indicate loss of control and determining the cause (s) of nonconformities, documenting the results of corrective action taken; and reviewing corrective action taken to ensure that they are effective. Document information on all corrective actions shall be retained.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.9.4.2",
                question: "Evaluation for release — Each lot of products affected by the nonconformity shall be evaluated. Products affected by failure to remain within critical limits at CCPs shall not be released.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.9.4.3",
                question: "Disposition of nonconforming products — Products that are not acceptable for release shall be: reprocessed or further processed within or outside the organization to ensure that the food safety hazard is reduced to acceptable levels; redirected for other use as long as food safety in the food chain is not affected; destroyed and/or disposed as waste. Documented information on the disposition of nonconforming products, including the identification of the persons with approving authority shall be retained.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "8.9.5",
                question: "Withdrawal/ Recall — The organization can ensure the timely withdrawal/ recall of lots of end products that have been identified as potentially unsafe, by appointing competent persons, having the authority to initiate and carry out the withdrawal/recall. The organization shall establish and maintain documented information of the entire recall process.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.1",
                question: "Monitoring, measuring, analysis and evaluation — The organization had determined what need to be monitored and measured, the method for monitoring the measurements, analysis, and evaluation, as applicable, to ensure valid results, when the monitoring shall be performed. The organization had retained appropriate documented information as evidence of the results. The organization had evaluated performance and the effectiveness of the food safety management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.1.2",
                question: "Analysis and evaluation — The organization has analysed and evaluated appropriate data and information arising from monitoring and measurement, including the results of verification activities related to PRPs and the hazard control plan, the internal and external audits.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.2",
                question: "Internal audit — The organization had planned, established, implemented, and maintained and audit programme(s) including the frequency, methods, responsibilities, planning requirements and reporting, which shall take into consideration the importance of the process concerned changes in the food safety management system, and a results of monitoring measurements and previous audits.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.3",
                question: "Management review — Top management had reviewed the organization's food safety management system, at planned intervals, to ensure its continuing suitability, adequacy, and effectiveness.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.3",
                question: "Management review input — The management review shall consider the following: the status of actions from previous management reviews; changes in external and internal issues that are relevant to the food safety management system; information on the performance and the effectiveness of the food safety management system; the adequacy of resources; any emergency situation, incident or withdrawal/recall that occurred; opportunities for continual improvement. The data shall be presented in a manner that enables top management to relate the information to stated objectives of the food safety management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "9.3.3",
                question: "Management review output — The outputs of the management review shall include the following: decisions and actions related to continual improvement opportunities; any need for updates and changes to the food safety management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.1",
                question: "Nonconformity and corrective action — The organization shall retain documented information as evidence of the nature nonconformities and any subsequent action taken.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.2",
                question: "Continual improvement — Top management shall ensure that FSMS is continually updated. To achieve this, the food safety team shall evaluate the food safety management system at planned intervals. The team shall then consider whether it necessary to review the hazard analysis (see 8.5.2), the establish hazard control plan (see 8.5.4), the establish PRPs (see 8.2). The updating activities shall be based on input form communication external as well as internal.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "10.3",
                question: "Update of the food safety management system — The organizational had continually improved the suitability, adequacy, and effectiveness of the food safety management system to enhance the operation of the organization. Top management shall ensure that the organization continually improve the effectiveness of the food safety management system through the use of communication (see 7.4), management system through the use of communication (see 9.3), and internal audit (see 9.2), analysis of result of verification activities, validation of control measure(s) and combination(s) of control measure(s), corrective actions (see 8.9.2) and food safety management system updating (see 10.2).",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 4.1",
                question: "General requirements — Buildings shall be designed, constructed and maintained in a manner appropriate to the nature of the processing operations to be carried out, the food safety hazards associated with the operations and the potential sources of contamination from the environment. Buildings is of durable construction which presents no hazard to the product.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 4.2",
                question: "Environment — Consideration given to potential sources of contamination from the environment. Food production should not be carried out in areas where potentially harmful substances could enter the product. Effective measurements taken to protect against potential contaminants are periodically reviewed.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 4.3",
                question: "Locations of establishments — Site boundaries clearly identified. Access to site is controlled. Site must be maintained in very good order. Vegetation to be removed/ tended to. Roads, yards and parking areas properly drained to prevent standing water.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 5.1",
                question: "General requirements — Internal layouts are maintained to facilitate good hygiene and manufacturing practices. The movement patterns of materials, products, people and the layout of equipment is designed to protect against potential contamination.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 5.2",
                question: "Internal design, layout and traffic patterns — The building has adequate space, with a logical flow of materials, products and personnel. Also physical separation of raw and processed areas.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 5.3",
                question: "Internal structures and fittings — Process are walls and floors are washable/ cleanable, as appropriate for the process or product hazard. Materials of construction is resistant to the cleaning system applied. Wall floor junctions and corners are rounded in processing areas to facilitate cleaning. Floors to be designed to avoid standing water. In wet process areas, floors are sealed and drained, the drains are trapped and covered. Ceilings and overhead fixtures are designed to minimise build-up of dirt and condensation. External opening windows, roof vents or fan, where present, are insect screened. External opening doors are closed or screened when not in use.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 5.4",
                question: "Location of equipment — Equipment to be designed and located to facilitate good hygiene practices and monitoring. Equipment is located to permit operation, cleaning and maintenance.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 5.5",
                question: "Laboratory facilities — In-line and on-line test facilities are controlled to minimise the risk of product contamination. Microbiological laboratories are designed, located and operated to prevent contamination of people, plant and products. They shall not open directly to production areas.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 5.6",
                question: "Temporary or mobile premises and vending machines — Designed, located and constructed to prevent pest harbourage and potential contamination of products. Additional hazards associated with temporary structures and vending machines to be controlled.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 5.7",
                question: "Storage of food, packaging materials, ingredients and non-food chemicals — Facilities used to store ingredients, packaging and products provide protection against dust, condensation, drains, waste and other sources of contamination. Stage areas are dry and well ventilated. Monitoring and control of temperature and humidity are applied where specified. Storage areas designed or arranged to allow segregation of raw materials, work in progress and finished products. All materials and products to be stored off the floor and with sufficient space between materials and the walls to allow inspection and pest control activities to be carried out. The storage area designed to allow maintenance and cleaning, prevent contamination and minimise deterioration. A separate, secure storage area provided for cleaning materials, chemicals and other hazardous substances. Exceptions for bulk or agricultural crop materials to be documented in the food safety management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 6.1",
                question: "General requirements — The provisions and distribution routes for utilities to and around processing and storage areas are designed to minimise the risk of product contamination. Utilities' quality to be monitored to minimise product contamination risk.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 6.2",
                question: "Water supply — The supply of potable water must be sufficient to meet the needs of the production processes. Facilities for storage, distribution and where needed, temperature control of the water is designed to meet specified water quality requirements. Water used as product ingredient, including ice or steam (including culinary steam), or in contact with products or product surfaces, must meet specified quality and microbiological requirements relevant to the product. Water for cleaning or applications where there is a risk of indirect product contact must meet specified quality and microbiological requirements to the application. Where water supplies are chlorinated, checks are done to ensure the residual chlorine levels at the point of use remains within the limits given in relevant specifications. Non-potable water must have a separate supply system that is labelled and not connected to the potable water system. Take measures to prevent the nonportable water refluxing into the potable system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 6.3",
                question: "Boiler chemicals — Boiler chemicals, if used, are either approved food additives which meet relevant additive specifications, or additives which have been approved by the relevant regulatory authority as safe for use in water intended for human consumption. Boiler chemicals are stored in a separate, secure (locked or otherwise access controlled) area when not in immediate use.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 6.4",
                question: "Air quality and ventilation — The organization has established requirements for filtration, humidity (RH%) and microbiology of air used as an ingredient or for direct product contact. Where temperature and/or humidity are deemed critical by the organization, a control system is put in place and monitored. Ventilation (natural or mechanical) is provided to remove excess or unwanted steam, dust and odours, and to facilitate drying after wet cleaning. Room air supply quality is controlled to minimise risk from airborne microbiological contamination. Ventilation systems are designed and constructed such that air does not flow from contaminated or raw areas to clean areas. Specified air pressure differentials shall be maintained. Systems shall be accessible for cleaning, filter changing and maintenance. Exterior air intake ports shall be examined periodically for physical integrity.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 6.5",
                question: "Compressed air and other gases — Compressed air, carbon dioxide, nitrogen and other gas systems used in manufacturing and/or filling shall be constructed and maintained to prevent contamination. Gases intended for direct or incidental product contact is from a source approved for food contact use, filtered to remove dust, oil and water. Where oil is used for compressors, the oil used must be food grade.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 6.6",
                question: "Lighting — The lighting provided (natural or artificial) will allow personnel to operate in a hygienic manner. The intensity of the lighting is appropriate to the nature of operations. Light fixtures are protected to ensure that materials, product or equipment are not contaminated in the case of breakages.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 7.1",
                question: "General requirements — Systems are in place to ensure that waste materials are identified, collected, removed and disposed of in a manner which prevents contamination of products or production areas.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 7.2",
                question: "Containers for waste and inedible or hazardous substances — Containers for waste and inedible or hazardous substances shall be clearly identified for their intended purpose, located in a designated area, constructed of impervious material which can be readily cleaned and sanitized, closed when not in immediate use and locked where the waste may pose a risk to the product.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 7.3",
                question: "Waste management and removal — Provision is made for the segregation, storage and removal of waste. Accumulation of waste is not allowed in food-handling or storage areas. Labelled materials, products or printed packaging designated as waste shall be disfigured or destroyed to ensure that trademarks cannot be reused. Removal and destruction are carried out by approved disposal contractors. The organization shall retain records of destruction.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 7.4",
                question: "Drains and drainage — Drains are designed, constructed and located so that the risk of contamination of materials or products is avoided. Drains shall have capacity sufficient to remove expected flow loads. Drains shall not pass over processing lines. Drainage direction shall not flow from a contaminated area to a clean area.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 8.1",
                question: "General requirements — Food contact equipment is designed and constructed to facilitate cleaning, disinfection and maintenance. Contact surfaces are not affected by the intended product or cleaning system. Food contact equipment shall be constructed of durable materials able to resist repeated cleaning.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 8.2",
                question: "Hygienic design — Equipment can meet established principles of hygienic design, including smooth, accessible, cleanable surfaces, self-draining in wet process areas, framework not penetrated by holes or nuts and bolts. Piping and ductwork are cleanable, drainable, and with no dead ends. Equipment is designed to minimize contact between the operator's hands and the products.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 8.3",
                question: "Product contact surfaces — Product contact surfaces are constructed from materials designed for food use. They shall be impermeable and rust or corrosion free.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 8.4",
                question: "Temperature control and monitoring equipment — Equipment used for thermal processes is able to meet the temperature gradient and holding conditions given in relevant product specifications. Equipment supports the monitoring and control of the temperature.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 8.5",
                question: "Cleaning plant, utensils and equipment — Wet and dry-cleaning programmes are documented to ensure that all plant, utensils and equipment are cleaned at defined frequencies. The programmes do specify what is to be cleaned (including drains), the responsibility, the method of cleaning (e.g., CIP, COP), the use of dedicated cleaning tools, removal or disassembly requirements and methods for verifying the effectiveness of the cleaning.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 8.6",
                question: "Preventive and corrective maintenance — The preventive maintenance programme includes all devices used to monitor and/or control food safety hazards. Corrective maintenance shall be carried out in such a way that production on adjoining lines or equipment is not at risk of contamination. Lubricants and heat transfer fluids are food grade where there is a risk of direct or indirect contact with the product. The procedure for releasing maintained equipment back to production includes clean up, sanitizing, where specified in process sanitation procedures, and preuse inspection. Maintenance personnel shall be trained in the product hazards associated with their activities.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 9.1",
                question: "General requirements — Purchasing of materials which impact food safety are controlled to ensure that the suppliers used have the capability to meet the specified requirements. The conformance of incoming materials to specified purchase requirements shall be verified.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 9.2",
                question: "Selection and Management of suppliers — There is a defined process for the selection, approval and monitoring of suppliers. The process used is justified by hazard assessment, including the potential risk to the final product, and includes assessment of the supplier's ability to meet quality and food safety expectations, requirements and specifications and description of how suppliers are assessed.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 9.3",
                question: "Incoming material requirements (raw/ingredients/packaging) — Delivery vehicles are checked prior to, and during, unloading to verify that the quality and safety of the material has been maintained during transit. Materials are inspected, tested or covered by COA [Certificate of Analysis] to verify conformity with specified requirements prior to acceptance or use. The method of verification is documented.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 10.1",
                question: "General requirements — Programmes must in place to prevent, control and detect contamination. Measures to prevent physical, allergen and microbiological contamination are included.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 10.2",
                question: "Microbiological cross-contamination — Areas where potential microbiological cross-contamination exists, the hazard is identified and segregated. Control measures are in place, suitable for each area of processing as follows: separation of raw from finished or ready to eat products (structural segregation - physical barriers, walls or separate buildings); access controls with requirements to change into required workwear; traffic patterns or equipment segregation; air pressure differentials.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 10.3",
                question: "Allergen management — Allergens present in the product, either by design or by potential manufacturing cross-contact, is declared. The declaration is on the label for consumer products, and on the label or the accompanying documentation for products intended for further processing. Products are protected from unintended allergen cross-contact by cleaning and line change-over practices and/or product sequencing. Rework containing allergens are used only in products which contain the same allergen(s) or through a process which is demonstrated to remove or destroy the allergenic material.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 10.4",
                question: "Physical contamination — Where brittle materials are used, periodic inspection requirements and defined procedures in case of breakage is in place. Glass breakage records are maintained. Measures are in place to prevent, control or detect potential contamination.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 11.1",
                question: "General requirements — Cleaning and sanitizing programmes are established to ensure that the food processing equipment and environment are maintained in a hygienic condition. Programmes are monitored for continuing suitability and effectiveness.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 11.2",
                question: "Cleaning and sanitizing agents and tools — Cleaning and sanitizing agents and chemicals are clearly identified, food grade, stored separately and used only in accordance with the manufacturer's instructions. Tools and equipment are of hygienic design and maintained in a condition which does not present a potential source of contamination.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 11.3",
                question: "Cleaning and sanitizing programmes — Established and validated by the organization to ensure that all parts of the establishment and equipment are cleaned and/or sanitized to a defined schedule, including the cleaning of cleaning equipment. Cleaning and/or sanitizing programmes must specify: areas, items of equipment and utensils to be cleaned and/or sanitized; responsibility for the tasks specified; cleaning/sanitizing method and frequency; monitoring and verification arrangements; post-clean inspections; pre-start-up inspections.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 11.4",
                question: "Cleaning in place (CIP) systems — CIP systems are separated from active product lines. Parameters for CIP systems are defined and monitored (type, concentration, contact time and temperature of any chemicals used).",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 11.5",
                question: "Monitoring sanitation effectiveness — Cleaning and sanitation programmes are monitored at frequencies specified by the organization to ensure their continuing suitability and effectiveness.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 12.1",
                question: "General requirements — Hygiene, cleaning, incoming materials inspection and monitoring procedures are implemented to avoid creating an environment conducive to pest activity.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 12.2",
                question: "Pest control programmes — The establishment has a nominated person to manage pest control activities and/or deal with appointed expert contractors. Pest management programmes are documented and shall identify target pests, and address plans, methods, schedules, control procedures and, where necessary, training requirements. Programmes include a list of chemicals which are approved for use in specified areas of the establishment.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 12.3",
                question: "Preventing access — Holes, drains and other potential pest access points are sealed. External doors, windows or ventilation openings are designed to minimize the potential for entry of pests.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 12.4",
                question: "Harbourage and infestations — Storage practices minimize the availability of food and water to pests. Material found to be infested are handled in to prevent contamination of other materials, products or the establishment. Potential pest harbourage (e.g. burrows) are removed. Where outside space is used for storage, stored items shall be protected from weather or pest damage.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 12.5",
                question: "Monitoring and detection — Pest-monitoring programmes include the placing of detectors and traps in key locations to identify pest activity. A map of detectors and traps are maintained. Detectors and traps are designed and located to prevent potential contamination of materials, products or facilities. The detectors and traps are of robust, tamper-resistant construction. They are appropriate for the target pest. The detectors and traps are inspected at a frequency intended to identify new pest activity. The results of inspections are analysed to identify trends.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 12.6",
                question: "Eradication — Eradication measures are initiated immediately after evidence of infestation is reported. Pesticide use and application is restricted to trained operatives and are controlled to avoid product safety hazards. Records of pesticide use are maintained to show the type, quantity and concentrations used; where, when and how applied, and the target pest.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 13.1",
                question: "General requirements — Personal hygiene and behaviour procedures related to the hazard posed to the process area or product are established and documented. All personnel, visitors and contractors are required to comply with the documented requirements.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 13.2",
                question: "Personnel hygiene facilities and toilets — Clearly designated personnel hygiene facilities are made available to ensure that the degree of personal hygiene required by the organization can be maintained. The establishment has adequate resources for proper handwashing practices, sinks solely designated for handwashing, a sufficient number of toilets, ensures the hygiene facilities do not open into production areas and have adequate changing facilities.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 13.3",
                question: "Staff canteens and designated eating areas — Staff canteens and designated areas for food storage and consumption is situated so that the potential for cross-contamination of production areas is minimized. Storage, cooking and holding temperatures, and time limitations, shall be specified.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 13.4",
                question: "Workwear and protective clothing — Personnel who work in, or enter into, areas where exposed products and/or materials are handled wear work clothing. Workwear must not have buttons or outside pockets above waist level. Zips or press stud fastenings are acceptable. Workwear is laundered to standards and at intervals suitable for the intended use of the garments. Workwear provides adequate coverage to ensure that hair, perspiration, etc. cannot contaminate the product, unless hazard analysis indicates otherwise. Where gloves are used for product contact, they are clean and in good condition. Use of latex gloves should be avoided. Shoes for use in processing areas fully enclose the foot and is made from non-absorbent materials.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 13.5",
                question: "Health status — Employees undergo a medical examination prior to employment in food contact operations (including site catering) unless documented hazard or medical assessment indicates otherwise (subject to legal restrictions in the country of operation). Additional medical examinations, where permitted, are carried out at intervals defined by the organization.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 13.6",
                question: "Illness and injuries — Employees are required to report to management for possible exclusion from food-handling areas when their illness pose a significant risk to the food being handled/ processed. These reports are documented and recorded.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 13.7",
                question: "Personal cleanliness — Monitoring measures in place to record any deviations from personal cleanliness.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 13.8",
                question: "Personal behaviour — A documented policy that describes the behaviours required of personnel in processing, packing and storage areas.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 14.1",
                question: "Rework — General requirements — Rework is stored, handled and used in such a way that product safety, quality, traceability and regulatory compliance are maintained.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 14.2",
                question: "Rework — Storage, identification, and traceability — Segregation requirements for rework (e.g. allergen) shall be documented. Reworked products are clearly identified and/or labelled to allow traceability. The reason for rework designation is recorded (e.g. product name, production date, shift, line of origin, shelf-life).",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 14.3",
                question: "Rework usage — Where rework is incorporated into a product as an \"in-process\" step, the acceptable quantity, type and conditions of rework use is specified. The process step and method of addition, including any necessary pre-processing stages, is defined. Where rework activities involve removing a product from filled or wrapped packages, controls are put in place to ensure the removal and segregation of packaging materials and to avoid contamination of the product with extraneous matter.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 15.1",
                question: "Product recall — General requirements — Systems are in place to ensure that products failing to meet required food safety standards can be identified, located and removed from all necessary points of the supply chain.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 15.2",
                question: "Product recall requirements — A list of key contacts in the event of a recall is maintained. Where products are withdrawn due to immediate health hazards, the safety of other products produced under the same conditions is evaluated. The need for public warnings shall be considered.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 16.1",
                question: "Warehousing — General requirements — Materials and products are stored in clean, dry, well-ventilated spaces protected from dust, condensation, fumes, odours or other sources of contamination.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 16.2",
                question: "Warehousing requirements — Effective control of warehousing temperature, humidity and other environmental conditions is provided where required by product or storage specifications. Where products are stacked, are the lower levels protected? Waste materials and chemicals are stored separately. All non-conforming materials are segregated and easily identified. Specified stock rotation systems in place (FIFO). Gasoline- or diesel-powered fork-lift trucks are not used in food ingredient or product storage areas.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 16.3",
                question: "Vehicles, conveyances, and containers — Vehicles, conveyances, and containers are maintained in a state of repair and cleanliness. Also provide protection against damage or contamination of the product. Cleaning to be carried out between loads and records are kept of cleaning activities. Bulk containers are dedicated to food use only.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 17",
                question: "Product information / consumer awareness — Consumers are made aware of the product and its importance so that they can make informed decisions regarding the product. Information relayed in the form of labels, advertisements or company websites.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 18.1",
                question: "Food defence, biovigilance and bioterrorism — General requirements — The establishment has assessed the hazards to products posed by potential acts of sabotage, vandalism or terrorism and has put in place proportional protective measures.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "PRP 18.2",
                question: "Access controls — Potentially sensitive areas are access controlled. Access should be physically restricted by use of locks, electronic card key or alternative systems.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.1(a)",
                question: "Management of Services — Laboratory analysis services used for the verification and/or validation of food safety, are competent laboratory (external and internal) that have a capability to produce precise and repeatable test results using validated test methods and best practices.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.1(b)",
                question: "Emergency Procurement (C, D, I, FII, G, and K) — The organisation has a documented procedure for procurement for emergency situations to ensure that products still conform to specified requirements and the supplier has been evaluated.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.1(d)",
                question: "Raw Material and Finished product Specification (C, D, I, FII, G, and K) — The organisation shall establish, implement, and maintain a review process for raw material and finished product specifications to ensure continued compliance with food safety, quality, legal and customer requirements.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.2(a)",
                question: "Product labelling — The organisation has ensured that finished products are labelled according to all applicable statutory and regulatory requirements in the country of intended sale, including allergen and customer specific requirements.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.2(b)",
                question: "Product labelling — Where the product is unlabelled, all relevant product information shall be made available to ensure the safe use of food by the customer or consumer.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.2(c)",
                question: "Product labelling — Where a claim (e.g., allergen, nutritional, method of production, chain of custody, raw material status, etc) is made on the product label or packaging, the organisation shall maintain evidence of validation to support the claim and shall have verification systems in place, including traceability and mass balance, to ensure product integrity is maintained.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.3.1",
                question: "Food defence — Threat assessment — The organisation has: a) Conducted and documented the food threat assessment, based on a defined methodology, to identify and evaluate potential threats linked to the process and products within the scope of the organisation; b) Developed and implemented appropriate mitigation measures for significant threats.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.3.2",
                question: "Food defence — Plan — a) The organization has a documented food defence plan specifying the mitigation measures and verification procedures. b) The food defence plan shall be implemented and supported by the organisations FSMS. c) The plan complies with applicable legislation, cover the process and products within the scope of the organisation and be kept up to date. d) For food category FII, in addition to above, the organisation ensured that their suppliers have a food defence plan in place.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.4.1",
                question: "Food fraud mitigation — Vulnerability assessment — The organisation has: a) Conducted and documented the food fraud vulnerability assessment, based on a defined methodology, to identify and assess potential vulnerability; and b) Developed and implemented appropriate mitigation measures for significant vulnerabilities. The assessment shall cover the process and products within the scope of the organisation.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.4.2",
                question: "Food fraud mitigation — Plan — a) The organisation has a documented food defence plan, based on the threat's assessment, specifying the mitigation measures and verification procedures. b) The food defence plan is implemented and supported by the organisations FSMS. c) The plan shall comply with applicable legislation, cover the process and products within the scope of the organisation and be kept up to date.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.6(a)",
                question: "Management of allergens — A list of all the allergens handled on site, including in raw material and finished products.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.6(b)",
                question: "Management of allergens — Risk assessment covering all potential sources of allergens cross contamination.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.6(c)",
                question: "Management of allergens — Identification and implementation of control measures to reduce or eliminate the risk of cross-contamination, based on outcome of the risk assessment.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.6(d)",
                question: "Management of allergens — Validation and verification of these control measures shall be implemented and maintained as documented information. Where more than one product is produced in the same production area that has different allergen profiles, verification testing shall be conducted at a frequency based on risk e.g., surface testing, air sampling, and/or product testing.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.6(e)",
                question: "Management of allergens — Precautionary or warning labels shall only be used where the outcome of the risk assessment identifies allergen cross contamination as a risk to the customer, even though all the necessary control measures have been effectively implemented. Applying warning labels does not exempt the organisation from implementation the necessary allergen control measures or undertaking verification testing.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.6(f)",
                question: "Management of allergens — All personnel shall receive training in allergen awareness and specific training on allergen control measures associated with their area of work.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.6(g)",
                question: "Management of allergens — The allergen management plan shall be reviewed at least annually, and following any significant change that impacts food safety, a public recall or a product withdrawal by the organisation as a result of an allergen/s, or when trends in the industry show contamination or similar products relating to allergens. The review shall include an evaluation of the effectiveness of existing control measures and the need for additional measures. Verification data shall be trended and used as input for the review.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.6(h)",
                question: "Management of allergens — For food chain Category D: Where there is no allergen-related legislation for the country of the sale pertaining to animal feed, this section of the scheme requirements may be indicated as Not Applicable, unless a claim relating to an allergen status has been made on the animal feed.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.7(a)",
                question: "Environmental monitoring (C, I and K) — Risk-based environmental monitoring program.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.7(b)",
                question: "Environmental monitoring (C, I and K) — Documented procedure for the evaluation of the effectiveness of all controls on preventing contamination from the manufacturing environment and this shall include, at a minimum, the evaluation of microbiological and allergen controls present.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.7(c)",
                question: "Environmental monitoring (C, I and K) — Data of the monitoring activities including regular trend analysis.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.7(d)",
                question: "Environmental monitoring (C, I and K) — The program must be reviewed at least annually and more frequently if required including when the following triggers occurs: significant changes related to product, processes or legislation; when no positive testing results have been obtained over an extended period; trend in out of specification microbial results, related to both intermediate and finished products, linked to environmental monitoring; a repeated detection of pathogens during routine environmental monitoring; and when there are alerts, recalls, or withdrawals relating to product/s produced by the organisation.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.8(a)",
                question: "Food safety and quality culture (ALL) — As part of the organisations commitment to cultivating a positive food safety and quality culture, senior management shall establish, implement and maintain a food safety and quality culture objective(s) as part of the management system. The following shall be addressed at minimum: communication; training; employee feedback and engagement; performance measurement of defined activities covering all sections of the organisation impacting on the food safety and quality.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.8(b)",
                question: "Food safety and quality culture (ALL) — The objective(s) shall be supported by a document food safety and quality culture plan, with targets and timelines and included in the management review and continuous improvements process of the management system.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.9(a)",
                question: "Quality control (ALL) — The organisation has: I. Establish, implement, and maintain policy and quality objectives. II. Establish implement and maintain quality parameters in line with finished product specifications, for all products and/or product groups within the scope of certification including product release that addresses quality control and testing. III. In addition to and aligned with clauses 9.1 and 9.3 of ISO 22000:2018 undertake analysis and evaluation of the results of the quality control parameters as defined 2.5.9(a)(ii) above and include it as input in management review. IV. In addition to and aligned with clause 9.2 ISO 22000:2018 include quality elements as defined in this clause within the scope of internal audit.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.9(b)",
                question: "Quality control (ALL) — Quantity control procedures, including for unit, weight, and volume, shall be established, and implemented to ensure product meets the applicable customer and legal requirements. This shall include a program for calibration and verification of equipment used for quality and quantity control.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.9(c)",
                question: "Quality control (ALL) — Line start-up and change over procedures shall be established and implemented to ensure products including packaging and labelling, meet applicable customer and legal requirements. This shall include having controls in place to ensure labelling and packaging from the previous run have been removed from the line.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.10(a)",
                question: "Transportation, storage and warehousing (ALL) — The organization established, implemented and maintain a procedure and specified stock rotation system that includes FEFO principles in conjunction with the FIFO requirements.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.10(b)",
                question: "Transportation, storage and warehousing (ALL) — The organization has specified requirements in place that define post slaughter time and temperature in relation with chilling or freezing of the products.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.10(c)",
                question: "Transportation, storage and warehousing (ALL) — For food chain category FI, in addition to BSI/PAS 221:2013 clause, the organisation shall ensure that the product is transported and delivered under conditions which minimize the potential for contamination.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.10(d)",
                question: "Transportation, storage and warehousing (ALL) — Where transport tanker is used, the following shall apply in addition to clause 8.2.4 of ISO 22000:2018: Organisation that uses tankers for transportation of their final product shall have a documented risk-based plan to address transportation tank cleaning. It shall consider potential sources of cross contamination, and appropriate control measures including cleaning and ventilation. Measures shall be in place to assess cleanliness of the tanker at the point of reception of the empty tanker, prior to loading. For organisations receiving raw material in tankers, the following shall be included in the supplier agreement as minimum to ensure product safety to prevent cross-contamination: tanker cleaning validation, restrictions linked to prior use and applicable control measures relevant to the product being transported.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.11(d)",
                question: "Hazard control and measures to prevent cross contamination (ALL excluding FII) — For all food categories, excluding FII the following requirements relating to foreign matter management apply, in addition to clause 8.2.4 (h) of ISO 22000:2018: The organisation shall have a risk assessment in place to determine the need and type of foreign body detection equipment required. Where required justification shall be maintained as documented information (Magnets, metal detectors, x-ray equipment, filters and sieves). A documented procedure shall be in place for foreign matter management and use of selected equipment. The organisation shall have controls in place for foreign matter management including procedures for the management of all breakages linked to potential physical contamination.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.12",
                question: "PRP verification process (C, D, G, I & K) — The organisation has established, implemented, and maintained routine site inspections/prp checks to verify that site (internal and external), production environment and processing equipment are maintained in a suitable condition to ensure food safety. Frequency shall be based on risk and PRP.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.13",
                question: "Product design and development (BIII, C, D, E, F, I & K) — A product design and development procedure is established, implemented and maintained for new products and changes to product or manufacturing processes to ensure safe and legal products are produced.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.15(a)",
                question: "Equipment management (ALL excluding FII) — Have documented purchase specification in place, which addresses hygienic design, applicable legal and customer requirements and intended use of the equipment, including product handled. The supplier shall provide evidence of meeting the purchase specification prior to installation.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.15(b)",
                question: "Equipment management (ALL excluding FII) — Establish and implement a risk-based change management process for new equipment and/or any changes to existing equipment, which shall be adequately documented including evidence of successful commissioning. Possible effects on existing systems shall be assessed and adequate control measures determined and implemented.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.16(a)",
                question: "Food loss and waste (ALL excluding I) — Have a documented policy and objective detailing the organisations strategy to reduce food loss and waste within their organisation and related supply chain.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.16(b)",
                question: "Food loss and waste (ALL excluding I) — Have controls in place to manage products donated to non-profit organisations, employees and other organisations and ensure that these products are safe to consume.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.16(c)",
                question: "Food loss and waste (ALL excluding I) — Manage surplus products or by-products intended as animal feed/food to prevent contamination of these products.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.16(d)",
                question: "Food loss and waste (ALL excluding I) — These processes shall comply with the applicable legislation, be kept up to date, and not have a negative impact on food safety.",
                findings: "",
                evidence: "",
                ofi: ""
            },
            {
                clause: "FSSC 2.5.17",
                question: "Communication requirements (ALL) — The organisation shall inform certification body within 3 working days of the commencement of events or situation below and implement suitable measures as part of their emergency preparedness and response process: a) Serious events that impact the FSMS, legality and/or the integrity of the certification including situations that pose a threat food safety, or certification integrity as a result of a force majeure, natural or man-made disaster. b) Serious situation where the integrity of the certification is at risk and/or where the foundation can be brought into disrepute. These include, but not limited to: public safety events; actions imposed by regulatory authority as a result of food safety issue(s) where addition monitoring or forces shutdown of production is required; legal proceedings, prosecution, malpractice and negligence; and fraudulent activities and corruption.",
                findings: "",
                evidence: "",
                ofi: ""
            }
        ]
    },
    {
        id: "iso-9001-process-audit",
        title: "ISO 9001:2015 Process Audit Report",
        standard: "ISO 9001",
        type: "process-audit",
        description: "Process-based audit report with executive summary and repeatable process sections.",
        content: [
            { id: "1" }
        ]
    },
    {
        id: "iso-14001-process-audit",
        title: "ISO 14001:2015 Process Audit Report",
        standard: "ISO 14001",
        type: "process-audit",
        description: "Process-based audit report with executive summary and repeatable process sections.",
        content: [
            { id: "1" }
        ]
    },
    {
        id: "iso-45001-process-audit",
        title: "ISO 45001:2018 Process Audit Report",
        standard: "ISO 45001",
        type: "process-audit",
        description: "Process-based audit report with executive summary and repeatable process sections.",
        content: [
            { id: "1" }
        ]
    }
];
