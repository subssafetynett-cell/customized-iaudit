export type AuditStandard = "ISO 9001" | "ISO 14001" | "ISO 45001";
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
