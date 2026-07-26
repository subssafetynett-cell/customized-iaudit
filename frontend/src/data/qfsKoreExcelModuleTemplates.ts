// Auto-generated from QFS KORE Audit Checklist.xlsx
// Question text copied exactly from Excel. Internal clause ids (GOR-*, IMCR-*, GMP-*, SEC-*, MAINT-*, CAL-*, PEST-*, PPE-*, CTRL-*, REC-*, CE-*, RET-*, HACCP-*, LCT-*, IRH-*, PHP-*, MB-*, PFR-*, CARB-*, ETP-*, ICE-*, EMP-*, PPM-*, MM-*, ST-*, CS-*, FAC-*, WD-*, PS-*, WPM-*, WMR-*, DOW-*) are for plan view only;
// execute/preview pages show the numeric suffix.
import type { AuditTemplate } from "./auditTemplateTypes";

export const QFS_KORE_EXCEL_MODULE_META = [
    {
        id: "qfs-kore-general-operating-requirements-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:General Operating Requirements PRP-RQ-001",
        sectionTitle: "General Operating Requirements",
    },
    {
        id: "qfs-kore-imcr-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:Incident Management & Crisis Resolution (IMCR) for Operations PRP-RQ-005",
        sectionTitle: "Incident Management & Crisis Resolution (IMCR)",
    },
    {
        id: "qfs-kore-gmp-facility-design-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:PRP-RQ-010 Good Manufacturing Practices Facility Design",
        sectionTitle: "GMP Facility Design",
    },
    {
        id: "qfs-kore-security-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: PRP-RQ-012 Security, Asset Protection, and Cybersecurity of Facilities and Information",
        sectionTitle: "Security",
    },
    {
        id: "qfs-kore-maintenance-program-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:PRP-RQ-014 Maintenance Program",
        sectionTitle: "Maintenance Program",
    },
    {
        id: "qfs-kore-calibration-and-verification-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:PRP-RQ-016 Calibration and Verification Program",
        sectionTitle: "Calibration and Verification",
    },
    {
        id: "qfs-kore-pest-control-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:PRP-RQ-018 Good Manufacturing Practices Pest Control",
        sectionTitle: "Pest Control",
    },
    {
        id: "qfs-kore-ppe-and-personnel-hygiene-checklist",
        layout: "requirement",
        scoreMode: "compliance-exception-noncompliance",
        moduleLabel: "MODULE: PRP-RQ-020 Good Manufacturing Practices Personnel Practices/ Personal Hygiene",
        sectionTitle: "PPE and Personnel Hygiene",
    },
    {
        id: "qfs-kore-control-and-destruction-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: PRP-RQ-030 Control, Destruction and Disposal of Trademarked Materials and Nonconforming Products",
        sectionTitle: "Control and Destruction",
    },
    {
        id: "qfs-kore-records-management-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: PRP-RQ-060 Records Management",
        sectionTitle: "Records Management",
    },
    {
        id: "qfs-kore-consumer-engagement-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: PRP-RQ-070 Customer and Consumer Engagement and Response",
        sectionTitle: "Consumer Engagement",
    },
    {
        id: "qfs-kore-retention-samples-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: QFS-RQ-050 Retention Samples",
        sectionTitle: "Retention Samples",
    },
    {
        id: "qfs-kore-haccp-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: QFS-RQ-080 Hazard Analysis and Critical Control Points",
        sectionTitle: "HACCP",
    },
    {
        id: "qfs-kore-labeling-coding-and-traceability-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: QFS-RQ-090 Labeling, Coding, and Traceability",
        sectionTitle: "Labeling, Coding, and Traceability",
    },
    {
        id: "qfs-kore-incoming-receipt-and-handling-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: QFS-RQ-100 Incoming Receipt, Storage and Handling of Ingredients and Packaging Materials",
        sectionTitle: "Incoming Receipt and Handling",
    },
    {
        id: "qfs-kore-package-handling-and-preparation-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: QFS-RQ-200 Package Handling and Preparation",
        sectionTitle: "Package Handling and Preparation",
    },
    {
        id: "qfs-kore-mixing-and-blending-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-205 Mixing and Blending",
        sectionTitle: "Mixing and Blending",
    },
    {
        id: "qfs-kore-processing-and-filling-requirements-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-300 Processing and Filling General Requirements",
        sectionTitle: "Processing and Filling Requirements",
    },
    {
        id: "qfs-kore-carbonated-processing-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-308 Carbonated processing",
        sectionTitle: "Carbonated processing",
    },
    {
        id: "qfs-kore-equipment-technology-and-process-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-400 Equipment Technology and Process Change validation",
        sectionTitle: "Equipment Technology and Process",
    },
    {
        id: "qfs-kore-immediate-consumption-equipment-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-500 Immediate Consumption Equipment (ICE)",
        sectionTitle: "Immediate Consumption Equipment",
    },
    {
        id: "qfs-kore-environmental-monitoring-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: QFS-RQ-440 Environmental Monitoring Programme",
        sectionTitle: "Environmental Monitoring Programme",
    },
    {
        id: "qfs-kore-production-process-and-monitoring-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-600 Production Process Monitoring and Control",
        sectionTitle: "Production Process and Monitoring",
    },
    {
        id: "qfs-kore-marketplace-monitoring-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-605 Marketplace Monitoring",
        sectionTitle: "Marketplace Monitoring",
    },
    {
        id: "qfs-kore-sensory-testing-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-650 Sensory Testing for Manufacturing Facilities",
        sectionTitle: "Sensory Testing",
    },
    {
        id: "qfs-kore-cleaning-and-sanitation-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-750 Cleaning and Sanitizing",
        sectionTitle: "Cleaning and Sanitation",
    },
    {
        id: "qfs-kore-food-allergen-and-control-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-760 Food Allergen Management and Control",
        sectionTitle: "Food Allergen and Control",
    },
    {
        id: "qfs-kore-warehouse-and-distribution-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-RQ-900 Warehouse and Distribution",
        sectionTitle: "Warehouse and Distribution",
    },
    {
        id: "qfs-kore-packaging-specifications-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:QFS-SP-960 Packaging Specifications",
        sectionTitle: "Packaging Specifications",
    },
    {
        id: "qfs-kore-water-for-product-manufacturing-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: QFS-RQ-180 Water for Product Manufacturing",
        sectionTitle: "Water for Product Manufacturing",
    },
    {
        id: "qfs-kore-water-monitoring-requirements-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: QFS-RQ-185 Water Monitoring Requirements and Specifications",
        sectionTitle: "Water Monitoring Requirements",
    },
    {
        id: "qfs-kore-design-and-operation-of-water-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE: QFS-RQ-197 Design and Operation of Water Sources",
        sectionTitle: "Design and Operation of Water",
    }
] as const;

export const QFS_KORE_EXCEL_MODULE_TEMPLATES: AuditTemplate[] = [
    {
        id: "qfs-kore-general-operating-requirements-checklist",
        title: "KORE QFS Internal Audit Checklist — General Operating Requirements",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for General Operating Requirements. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "GOR-1",
              "question": "1 All operations must comply with local legal/regulatory requirements as well as with The Company’s KORE requirements, whichever is the stricter of the two.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-2",
              "question": "1.1 Operating Units may also define requirements that are specific to their local operating conditions and/or based on the capabilities of their operations. These must also be implemented.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-3",
              "question": "All operations must comply with The Company’s policies related to Human Rights and Supplier Guiding Principles (SGP-RQ-150)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-4",
              "question": "Bottling partner-approved suppliers and contract manufacturing facilities must also comply with Human Rights and Supplier Guiding Principles (SGP-RQ-150)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-5",
              "question": "All operations must comply with the Company’s policy related to the Principles for Sustainable Agriculture (PSA). Refer to Principles for Sustainable Agriculture.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-6",
              "question": "The PSA applies to all operations purchasing and manufacturing products and packaging materials of agricultural origin.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-7",
              "question": "Where operations are responsible for the direct procurement of ingredients of animal original, have direct responsibility for the management of animals (e.g., dairy), or where it is understood that animals may be used for harvesting or transportation, then the additional policies for Animal Health & Welfare must also be understood and effectively implemented. Refer to Animal Health and Welfare Guiding Principles.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-8",
              "question": "All manufacturing plants (Company owned and franchise bottling partners) must be certified to the following international standards:\n• ISO 9001\n• FSSC 22000\n• ISO 14001\n• ISO 45001 (OHSAS 18001) /NOSA",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-9",
              "question": "Certification must be obtained from an accredited third-party certification body",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-10",
              "question": "Operations must demonstrate that the requirements of all standards are being maintained at all times",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-11",
              "question": "New facilities that are built as part of existing bottling partner operations or are acquired as part of acquisition must have an OU approved HACCP plan in place before the start-up of production, until the required food safety system certification can be obtained",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-12",
              "question": "Contract manufacturing facilities must be certified to a GFSI-approved Food Safety Management System (FSMS) and ISO 9001.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-13",
              "question": "If a contract manufacturing facility is not certified at time of first production, then they are expected to commit to obtaining certification within one year of commencing the production of Company products.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-14",
              "question": "Non-certified contract manufacturers must have an OU approved HACCP plan in place before the start-up of production, until required food safety certification can be obtained.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-15",
              "question": "Ensure compliance with locally applicable food safety regulations as well as company food safety requirements, the stricter of the two.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-16",
              "question": "Ensure all products are manufactured, stored, and shipped in accordance with Company specifications and requirements to maintain quality and food safety throughout the supply chain. This includes but is not limited to the following, the specific details of which can be found in separate KORE requirements:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-17",
              "question": "Effective implementation of Company requirements for Good Manufacturing Practices . Operations may also use the requirements outlined in PD ISO/TS 22002-1, Prerequisite Programs on Food Safety.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-18",
              "question": "Use of OU validated and authorized production lines, new processes, equipment and technology . Production lines must not operate unless formally authorized and approved by the OU to commence production.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-19",
              "question": "Use of approved raw materials including ingredients and processing aids/auxiliary materials from authorized suppliers that meet company specifications",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-20",
              "question": "Includes the approval of new or changes to sweeteners systems (i.e., from granular sucrose to HFCS or vice versa)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-21",
              "question": "Use of Company/OU approved primary packages, closures (including tamper evidence) from authorized suppliers",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-22",
              "question": "Includes the approval of labels used for each product type",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-23",
              "question": "If bottling entities manufacture their own packaging materials (glass bottles, closures, preforms, PET bottles etc.), these must also be approved by the OU and meet company specifications",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-24",
              "question": "Use of OU issued Master Mixing Instructions (MMI)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-25",
              "question": "Use of approved water sources. Includes:\n• In-plant water treatment system capable of producing treated water that meets company specifications.\n• Use of natural mineral or spring water as an ingredient\n• Renewed water for product contact surfaces.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-26",
              "question": "Approval of low-acid production lines (must only be authorized for use by a Corporate QSE-approved Third-Party process authority)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-27",
              "question": "Use of Company defined processes for quality control including specifications and test methods",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-28",
              "question": "Implemented OU defined processes for date-coding or durability labelling. These must comply with local legal requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-29",
              "question": "Contract manufacturers must be approved by the Operating Unit prior to the commencement of production of Company products",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-30",
              "question": "The manufacture of food products other than Company finished beverages or joint venture food products by third-party contract manufacturing facilities must be reviewed and approved by the Operating Unit in consultation with the Global Licensing team",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-31",
              "question": "The approval of Coca-Cola trademark food products must be reviewed and approved by the Corporate VP Flavor Supply",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-32",
              "question": "Develop and implement a change management procedure that addresses at a minimum, internal and external system changes. Examples include:\n• Internal: changes in suppliers, ingredients, packaging, equipment, processes, cleaning and sanitation.\n• External: changes in regulations that impact food safety, shelf-life, workplace safety, environment, sustainability performance, product composition, labeling, and/or claims",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-33",
              "question": "Establish, implement, and maintain a CMP to determine, assess, and address risks that have impacted or have the potential to make a significant impact on Quality and Food Saftey, Occupational Health and Saftey and Environment\nThe site must allocate a Change Management Team (CMT) to review all changes\n• The CMT must be cross-functional across quality, saftey, environment and legal\n• A Change Management Agent (CMA) must be allocated to manage all minor or major changes.\nThe CMP must at minimum include a risk assessment phase to ensure the potential impact of the change (even if perceived to be low) is reviewed by the CMT\n• One-for-one changes (i.e. replacements which are considered identical to the previous state and no impact on quality, saftey and environment) may be made without the need of a CMP; however should still be approved by the appropriate area manager.\n• Minor changes that are agreed by the plant team to not impact quality, saftey or environment can be made without further assessment; however this must be agreed by the CMT.\n• All major changes (those identified to have a higher risk of impacting quality, saftey or environment) must be reviewed and approved by the relevent OU function.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-34",
              "question": "Ensure a process is in place to address situations when a regulatory agency arrives on site. Include distribution centers (bottler owned or third party contracted facilities) as part of the program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-35",
              "question": "In consultation with the OU, prepare an Ingredient Risk Management document that can be shared with regulatory agencies. The purpose of this document is to demonstrate that ingredients used to produce finished products comply with regulatory limits of usage and maximum allowable limits for identified potential food safety risks.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-36",
              "question": "Consult with the Operating unit on any other information requested by external regulatory authorities. Confirm requests do not provide access to information deemed as confidential",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-37",
              "question": "If any records are requested and taken by a regulatory authority, ensure there is a clear documentation of which records were taken",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-38",
              "question": "Ideally authorities should only be provided copies of records. However, where the action taken is specific to the removal of physical records, ensure there is a log of the records taken, and if possible, copies taken and retained.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-39",
              "question": "Notify OU immediately of the actions and records in question.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-40",
              "question": "Where samples are collected by a regulatory official during shipment, manufacturing, or storage, notify the OU of the actions taken.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-41",
              "question": "Sampling must be witnessed and documented by a bottling operation associate, Company representative, or an authorized representative of the operation (when performed in transit to an operation).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-42",
              "question": "If samples are of ingredients, ensure sampling does not adversely impact the quality and integrity of the product (i.e., done under suitable conditions to prevent contamination). On receipt, place the ingredient “on hold” pending either regulatory results or OU approval.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-43",
              "question": "If there is a concern related to the integrity of ingredients as a result of sampling, isolate the material and contact the OU for further disposition.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-44",
              "question": "Apply new tamper-evident seals after sampling. Record the number of the tamper evident seal on the supporting documentation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-45",
              "question": "Sampling of either concentrate or beverage bases should be avoided. However, if sampling is conducted, contact CPS for information and further disposition.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-46",
              "question": "If samples taken are of finished product, place that product “on hold” pending either regulatory results or OU approval.\nTake 3 additional samples of the same batch and within the same timeframe. Store samples pending further advice from the OU\nAwait further response from the OU to determine if samples should be forwarded to a Company laboratory for comparative analysis and release",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-47",
              "question": "Develop and implement a process for monitoring, analyzing data, and responding to consumer complaints and inquiries",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-48",
              "question": "Implement requirements for the managing of Incidents and events that have an impact to product, people, brand image and reputation of the Company. Refer to Incident management & Crisis Resolution (PRP-RQ-005.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-49",
              "question": "Inform the OU and follow their instructions when contacted by third parties, consumers, regulatory agencies and media related to any perceived or real incident or event",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-50",
              "question": "Design and implement a corrective action program that addresses an operations response to an incident or event, to address the findings of audits (internal or external) or to facilitate continuous improvement (preventive actions).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-51",
              "question": "Program must include tools to perform root cause analysis and problem solving",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-52",
              "question": "Ensure adequate training is provided to all associates involved in program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-53",
              "question": "Do not close out corrective actions until it can be established that all actions have been completed and effectively implemented.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-54",
              "question": "Use only Company laboratories or OU approved third-party laboratories for investigative analysis (e.g., analytical testing, microbiological identification, enumeration, toxicological analysis etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-55",
              "question": "TCCC Analytical Service Laboratories (ASL) are responsible for coordinating external testing of all Coca-Cola formulas.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GOR-56",
              "question": "Obtain advanced approval from the Operating unit for any testing of Coca-Cola formulas. This includes Cola Variants as defined in the Cola Variants List (refer to KORE Knowledge Sharing).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-imcr-checklist",
        title: "KORE QFS Internal Audit Checklist — Incident Management & Crisis Resolution (IMCR)",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Incident Management & Crisis Resolution (IMCR). Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "IMCR-1",
              "question": "The following incident types must be reported to the Operating Unit as part of the Incident\nManagement process:\nQuality/Food Safety\n1.Food safety, quality, or regulatory issue resulting from either physical, chemical,\nmicrobiological, or allergen contamination, or product labelling error, that is no longer in\ncontrol of an operation (has been distributed into the marketplace irrespective of\nquantity) and has the potential to lead to a product recall or require an active withdrawal\nof TCCC products from the marketplace.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-2",
              "question": "The following incident types must be reported to the Operating Unit as part of the Incident\nManagement process:                                                                               Any significant food safety, quality, or regulatory issue resulting from either physical,\nchemical, microbiological, or allergen contamination, or product labelling) that has\noccurred in an operation even if the product has remained in the full control of the\noperation (100% remains on-site or within a bottler-controlled distribution center).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-3",
              "question": "The following incident types must be reported to the Operating Unit as part of the Incident\nManagement process:                                                                               Consumer food safety/safety concerns (related to packaging or product) that involves\nthe following:\n• Confirmed hospitalization of a consumer resulting from the consumption of\nCompany products, or from the handling of a package (e.g., bottle explosion\ncausing injury).\n• Reporting of illnesses of two or more consumers following the consumption of\nCompany products from the same production lot.\n• Any illness which has received media attention or where legal action is threatened                                                                       Any significant food safety, quality, or regulatory issue result",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-4",
              "question": "The following incident types must be reported to the Operating Unit as part of the Incident\nManagement process:                                                                                    Suspected, threatened or actual product contamination resulting from tampering,\nincluding threats of extortion\n• Evidence of counterfeit product activities (large scale/organized versus isolated event).\n• Threatened or actual litigation involving a product or package of TCCC\n• Any food regulatory inspection or action taken by either a federal, national, state,\nprovincial, and/or local agency that results in the stopping of an operation, or\nwithdrawal/recall/seizure, reported finding (e.g., FDA 483), legal action, or that results in\nmedia attention.\nOther reportable incidents are: Threats made against TCCC, its products, property, employees, TCCC officers, or\nbottlers, including extortion and terrorist threats\n• Result of a major social, religious, political, or regulatory activity that has occurred or has\nthe potential to lead to an incident that could significantly impact the business.\n• Planned demonstrations or boycotts of Company products\n• Significant loss/theft of Company trademarked packaging or products, concentrate or\nbeverage base, information, or other significant assets\n• Natural or man-made disasters including political unrest that may impact the TCCC\nsystem\n• Cybersecurity incidences that jeopardize the ability of an operation to run or expose\nconfidential information",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-5",
              "question": "Each operation must develop and implement a documented process for the management of incidents, including a clear understanding of incidents that must be reported to the Operating Unit (as per section 1 above).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-6",
              "question": "Process may be driven directly from a bottler corporate entity or be at an individual plant or distribution center level (dependent on structure or size and location of an operation)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-7",
              "question": "Irrespective of where the program originates, each location (such as a bottling facility or distribution center) must demonstrate that they have been trained and are aware of the necessary actions to be taken in the event of a reportable incident.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-8",
              "question": "The IMCR program must include the following: Clearly defined roles and responsibilities for the management and reporting of incidents.                                                                   1.Assign a person in each location to act as the Incident management lead/coordinator.                                                           2 Persons assigned should be the primary point of contact in the event of an incident.                                                                       3.Ensure an appropriate back-up is defined when the Incident management lead is not available",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-9",
              "question": "Establishment of an Incident management team (IMT).  When an incident occurs, or when one is anticipated, the IMT (coordinated by the Incident management lead) is responsible for:\n• Managing the incident in accordance with the documented program\n• Making recommendations on actions to be taken\n• Assisting in management of incident, including control & containment,\ninvestigation, corrective actions, and lessons learned\n• Defining need for additional support from other internal and external SMEs, as needed",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-10",
              "question": "Training for team members including the Incident management lead/coordinator and incident management team on IMCR, ensuring other relevant operations personnel have also been trained (includes IMCR preparedness / validation)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-11",
              "question": "A list of key contacts (names/contact numbers) that should be notified when an incident or the potential for an incident occurs, including the types of incidents where notification should take place",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-12",
              "question": "List must be continuously updated to reflect current personnel. Include OU contacts. Ensure contact lists are readily available to needed personnel",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-13",
              "question": "Identify primary points of contact (e.g., call tree) for incidents that occur outside of normal working hours",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-14",
              "question": "Ensure operations security personnel have an updated list of contacts for communication of any incident that may impact on the operation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-15",
              "question": "Process for the identification and categorization of incidents. Includes the ability to identify incidents that can be managed internally/locally versus those that are reportable incidents",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-16",
              "question": "Process for the identification of multiple consumer complaints.                                                                                                           Each operation must conduct an investigation (IAT or IMT review) when a negative trend is identified in consumer complaints. A negative trend is when the following occurs:\n• Three or more quality contacts with same product and package, same production date code, same issue (i.e., off-taste, foreign matter) from the same or different customers or consumers.\n• Where a consistent trend of similar multiple complaints is identified across either multiple lots of the same product or across different products. Refer to Customer & Consumer Engagement & Response (PRP-RQ-070) for further details",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-17",
              "question": "Follow OU process for formal notification of an incident. Where a process is not available for formal reporting, confirm that the information that has been submitted (via email) has been received by the Operating unit for action and reporting",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-18",
              "question": "2 Ensure all reportable incidents are communicated to the Operating Unit IMCR lead within 24 hours of being identified (12 hours for an on-site fatality)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-19",
              "question": "Process for ensuring employee awareness of local emergency and incident response processes",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-20",
              "question": "Process for managing any communications or enquiries related to the reportable incident                                                               Responses to any media enquiries should first be discussed with the Operating unit, where the OU Public Affairs team (PACS) can assist with communications, holding statements, etc.                                                                                                                              If an operation also has a PACS team (as part of their own corporate program), ensure any media communications are coordinated with the Operating Unit prior to response",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-21",
              "question": "Documented food recall plan, identifying the roles and responsibilities for initiating a product recall / product withdrawal when required.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-22",
              "question": "Do not conduct a recall/withdrawal or contact regulatory authorities regarding a recall/withdrawal without first notifying and discussing communications & actions with the Operating Unit IMCR lead.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-23",
              "question": "When a product recall/ active withdrawal is required, notify all relevant customers of the actions including the reasons for the need to take an action. Where feasible, replace product as needed to avoid out of stock situations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-24",
              "question": "Review food recall plan annually and confirm that it is accurate, up to date and relevant (based on product type and/or customer expectations).  Consider including as part of a review of product traceability activities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-25",
              "question": "TCCC product removed from retail locations, customer distribution centers and/or customer warehouses that do not meet regulatory requirements or the specifications of TCCC or OU must be isolated to avoid potential reuse/resale",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-26",
              "question": "Final disposition of product should be based on the issue and risk identified. This decision must be made and agreed to in consultation with the OU",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-27",
              "question": "Any product dispositioned for destruction must be performed in accordance with Control, Handling, Destruction and Disposal of Trademarked Materials and Nonconforming Products (PRP-RQ-030)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-28",
              "question": "Alignment and inclusion of incident management process to the internal corrective action program, including process for immediate action, root cause analysis, tracking of actions and closure",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-29",
              "question": "Process for completion of lessons learned activities for reportable incidents following closeout.                                                           Lessons learned should ideally be completed within 90 days following the reportable incident. If unable to complete within the required timeframe notify the OU IMCR lead for further information and action",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-30",
              "question": "Use only Company laboratory’s or OU approved third-party laboratories for investigative analysis (e.g., analytical testing, microbiological identification, enumeration, toxicological analysis etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-31",
              "question": "TCCC Analytical Service Laboratories (ASL) are responsible for coordinating external testing of all Coca-Cola formulas. Obtain advanced approval from the Operating unit for any testing of Coca-Cola formulas. This includes Cola Variants as defined in the Cola Variants List (refer to KORE Knowledge Sharing).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-32",
              "question": "Ensure all samples used for investigative purposes are representative of the lot or of the concern raised (when issue is potentially an isolated incident that occurs during a run (e.g., cross flavor contamination, breakdown).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-33",
              "question": "Where relevant and possible, obtain samples from the consumer. Where not possible, consider the following;\n• Review retention samples to determine if they are representative of problem being raised",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-34",
              "question": "Obtain samples from the marketplace (or if still in possession from warehouse) that closely represent time of manufacture. Ideally samples should be the same or as close as possible to time of production of reported sample issue).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-35",
              "question": "Safety",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-36",
              "question": "The following incident types must be reported to the Operating Unit as part of the Incident Management process:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-37",
              "question": "Serious injury and/or fatality that occurs in conjunction with a facility, vehicle, event, or activity that can be connected to the Company and/or its bottling partners. The incident may involve employees, contractors, or members of the public. Reportable safety Incidents include",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-38",
              "question": "On-site fatality or serious injury irrespective of cause, including those related to natural causes (e.g., non-work-related heart attack) or violence in the workplace (either perpetrated by an employee or contractor)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-39",
              "question": "On-site or off-site fatality or serious injury resulting from a vehicular crash/accident (both internal/external or other cause).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-40",
              "question": "Off-site fatality or serious injury resulting from a Company-related activity, business interaction and/or from Company property. For example:\n• a contractor or associate electrocuted while working on immediate consumption/vending equipment,\n• involving a fleet vehicle travelling between work and home (or vice versa), or\n• failure of facility infrastructure (e.g., external wall) that collapses and falls on a member of the general public.\n• violent robbery involving an employee or contractor while performing route delivery or sales activities",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-41",
              "question": "Safety regulatory inspection or action taken by either a federal, national, state, provincial, and/or local regulatory agency that leads to a stopping of an operations, notices of violation/fines, legal action, or that results in media attention",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-SEC-1",
              "question": "Environment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-43",
              "question": "Environmental discharge, chemical spills, or truck accidents with discharge/spill that has an impact or potential impact to the environment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-44",
              "question": "Significant environmental/sustainability incident that attracts or has the potential to attract media attention",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-45",
              "question": "Planned NGO or external advocacy activity (e.g., protests/campaigns) related to the Company’s sustainability policies and commitments",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-46",
              "question": "Environmental regulatory inspection or action taken by either a federal, national, state, provincial, and/or local regulatory agency that leads to a ceasing of operations, notices of violation/fines, legal action, or that result in media attention",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-47",
              "question": "Business disruption or media attention due to lack of water availability or to significant decrease in source water quality (e.g., droughts, groundwater contamination, failing water supply infrastructure, or regulatory or policy changes which may reduce supply to the plant (e.g., droughts, groundwater contamination, failing water supply infrastructure, or regulatory or policy changes which may reduce supply to the plant)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-SEC-2",
              "question": "Safety: Reporting of On-site fatality",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-49",
              "question": "Any on-site fatality (contractor, employee, or member of the general public) must be communicated immediately (within 12 hours) to the Operating Unit.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-50",
              "question": "Communication must occur even though a deeper investigation may be underway or required. Include the following in your communication:\n• Description of the incident\n• Location of the incident\n• Circumstances leading to the incident\n• The nature and cause of the injury/illness\n• Number of people impacted (contractors/employees/members of the general public)\n• Immediate actions taken to mitigate further risk exposure.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-51",
              "question": "The Operating Unit (OU) president is required to communicate the incident directly to The Coca-Cola Company’s Chief Operating Officer within 24 hours of occurrence. It is therefore vital that all information is provided to the Operating Unit as per above to ensure effective reporting of the incident can take place",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-52",
              "question": "The operation involved is required to implement a robust step-change plan postincident that will be monitored regularly in partnership with the Operating Unit and the Corporate Safety Team.\nEnsure process is in place to enable a stand-down of all facilities following any on-site\nfatality for the purposes of reinforcing safety requirements and potential follow up actions\nAll manufacturing operations must organize a site wide stand-down within 7 days of receiving notification of a system on-site fatality. The stand-down must ensure that all associates across all shifts receive the required information\nWhere an incident has relevance to distribution centers, then a stand-down is also expected of these facilities to communicate safety expectations and actions\nRecords of the stand-down and associate participation must be maintained (training record/meeting attendance record), confirming that the stand-down has taken place",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-SEC-3",
              "question": "Environmental Incident Reporting",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-54",
              "question": "Ensure any incident is immediately managed and contained to avoid further impact to the environment.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-55",
              "question": "Include the following in your communication of an environmental incident:\n• Description of the incident\n• Location of the incident\n• Type or source of environmental issue (chemical/biological/physical), or whether any legal or media action/attention has occurred\n• Immediate actions taken to mitigate further risk exposure.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IMCR-56",
              "question": "Ensure coordination with the Operating Unit on all communication/reporting to authorities (where required).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-gmp-facility-design-checklist",
        title: "KORE QFS Internal Audit Checklist — GMP Facility Design",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Good Manufacturing Practices Facility Design. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "GMP-SEC-1",
              "question": "Construction and Layout of Buildings",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-1",
              "question": "Buildings shall be designed, constructed, and maintained in a manner appropriate to the\nnature of the processing operations to be carried out, the food safety hazards associated\nwith those operations, and the potential sources of contamination from the plant environs",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-2",
              "question": "Buildings shall be of durable construction which present no hazard to the product",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-3",
              "question": "Consider the potential impact of natural disasters e.g., flooding, earthquakes when designing and constructing a facility. Ensure construction methods and materials prevent the likelihood of significant damage or business disruption.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-4",
              "question": "Consideration shall be given to potential sources of contamination from the local environment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-5",
              "question": "When selecting the location for a new production facility, consider the surrounds of the facilities and respective industries present that have the potential to introduce sources of cross-contamination to the operation. Examples include industries which emit smoke,\nsignificant odors, or dust e.g., tanneries, oil refineries, railroad yards, sand and gravel\npits, cement plants etc",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-6",
              "question": "Consider impact of the above and determine whether there is the potential for risk of cross contamination or impact to ingredients or finished products resulting from above industries, and if so, whether they can be effectively managed and mitigated",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-7",
              "question": "Also consider the past use of a proposed site to ensure location does not have potential to create long term risk exposure e.g., presence of hazardous substances in the soil, or from landfill, or to contamination of underground water table (if borehole or deep well is being considered",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-8",
              "question": "Once facilities have become established, continue to review, and understand the surrounding environmental conditions as new industries enter or are formed. Ensure risks outlined above are taken into consideration to determine the potential need to mitigate risk exposure.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-9",
              "question": "The site boundaries shall be clearly identified e.g., a perimeter fence or wall with controlled access to the facility grounds to keep out animals, pests, or unauthorized personnel",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-10",
              "question": "Site design should consider the following:\no Construct roadways of a dense, hard, compacted and dust-sealed material (e.g., concrete, asphalt, paving) suitable for wheeled traffic\no Roadways to be suitably sloped to prevent accumulation of water\no Minimize vegetation and foliage. When present, shrubs and plants should be kept at least 3metres (10 feet) and/or trees 9 meters (30 feet) away from buildings\no Minimize the presence of grass, flowers with an area of minimum 60cm around the building free from vegetation. Note use of “green roofs” should consider risks associated with pest activity",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-11",
              "question": "External lighting that illuminates the factory should be placed in a manner that prevents attracting insects into the building",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-12",
              "question": "Fencing around the site perimeter should be of solid construction or constructed of climb and cut-resistant wire mesh and be of sufficient height (ideally minimum 2.5meters (8ft) high. In addition:\n• Fencing must form a barrier to prevent animals from entering the premises\n• Both sides of the fence should be clear of trees, brushes and plants that may create a security or access threat (ability to climb over fence).\n• All structures/buildings should provide adequate space between walls and fences or other structures to facilitate access for ease of cleaning and pest control services (i.e., buildings should not be directly up against an external wall structure, or create voids that cannot be accessed for cleaning or pest control)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-13",
              "question": "Buildings must be located, designed, constructed, and maintained to suit the operation being carried out, to provide adequate space to allow for hygienic performance of all operations, and to facilitate cleaning and maintenance",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-14",
              "question": "Designated walkways should be provided and marked in internal and external areas such that logical routes and traffic patterns are maintained to ensure the safety of people, and to prevent the cross-contamination of product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-15",
              "question": "Areas should be designed to ensure that processing areas not used as general pedestrian or vehicle (forklift) traffic routes.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-16",
              "question": "Buildings should be watertight to prevent the ingress of water.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-17",
              "question": "Prevent the entrance of pests or birds. Holes, drains and other places where pests are likely to gain access should be kept sealed",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-2",
              "question": "Layout of Processing Area",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-18",
              "question": "Internal layouts shall be designed, constructed, and maintained to facilitate good hygiene and manufacturing practices. The movement patterns of materials, products and people, and the layout of equipment, shall be designed to protect against potential contamination sources.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-19",
              "question": "Production facilities shall provide adequate space, with a logical flow of materials, products and personnel, and physical separation of raw from processed areas. Examples of physical separation include walls, barriers or partitions, or sufficient distance (as validated by the operation) to minimize risk",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-20",
              "question": "Openings intended for transfer of materials shall be designed to minimize entry of foreign matter and pests",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-21",
              "question": "Food production should not be carried out in areas where potentially harmful substances could enter the product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-22",
              "question": "Dedicated filling areas separated from other production and warehouse areas. This should be done by enclosing the filling area into a filling room. Filler room should be effectively separated from the packaging area",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-23",
              "question": "Specific to refillable packaging, the filling area must be enclosed and separated from the dirty area (i.e., bottle washer infeed).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-24",
              "question": "Where filling area is not separated, operations must demonstrate (through validation) that the design and operation of the area does not have the potential to impact the final product quality",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-25",
              "question": "Sugar dumping, simple syrup preparation, and final syrup preparation area",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-26",
              "question": "Water treating equipment located in a separate area with secure access control. Access should be limited to authorized personnel only.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-27",
              "question": "A separate, dedicated area for the filling of post mix (refillable cannisters or bag-in-box)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-28",
              "question": "Direct and indirect product contact surfaces must be easy to clean, non-porous or nonabsorbent and resistant to the product and to all detergents and disinfectants under the full operating conditions",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-29",
              "question": "Process area walls, floors and ceilings shall be smooth, easy to clean, and free from imperfections (e.g., crevices or cracks) that allow for possible infestation of pests or facilitate areas for the growth of microorganisms",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-30",
              "question": "Wooden structures such as doors, walls, windows etc. should not be used in processing areas where they may absorb moisture and create an environment for microbiological growth. This includes furniture (e.g., desks, cupboards, chairs etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-31",
              "question": "Floors should be constructed of material resistant and impervious to hot water, acids, and alkalis, and should be sufficiently smooth to permit proper cleaning.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-32",
              "question": "Floors in high hygiene areas should be smooth surfaces (e.g., epoxy) that are light in color where it can be easily identified as being clean.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-33",
              "question": "Where tile is used for carbonated beverage processing areas, ensure grout is maintained to prevent ingress of dust, vermin and to minimize microbiological growth. Repair damaged or missing tiles and grout as needed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-34",
              "question": "In wet process areas floors should be sloped to provide self-drainage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-35",
              "question": "All joints and edges on floors and connecting equipment/fixtures to floors must be sealed",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-36",
              "question": "Walls should be impervious to water and should be smooth and light colored, mold resistant, with a washable finish",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-37",
              "question": "Paint used on wall surfaces should be resistant to acids, alkalis, and chlorine, and should be free of toxic compounds",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-38",
              "question": "Wall to floor junction should be coved (i.e., have curved or rounded corners) to permit easy cleaning. Where not rounded, ensure cleaning processes are designed to maintain a hygienic environment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-39",
              "question": "Ceilings and overhead fixtures shall be designed to minimize build-up of dirt and condensation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-40",
              "question": "Ceilings should be light in color, mold resistant and easily cleanable",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-41",
              "question": "Light fixtures should be mounted in a manner that prevents buildup of dust or dirt.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-42",
              "question": "Doors should be tight fitting, self-closing, and outward opening",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-43",
              "question": "Both security, safety and access needs should be considered when selecting the number, location, and size of doors.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-44",
              "question": "External opening doors shall be closed or screened when not in use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-45",
              "question": "Windows should be designed to be unopenable",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-46",
              "question": "External opening windows, where present, shall be insect screened",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-47",
              "question": "Design should prevent the potential of glass becoming a physical hazard in product in the event they are broken or damaged (e.g., use of film).  Include any mirrors that are present in processing areas as part of preventive actions related to glass breakage control.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-48",
              "question": "Window ledges or sills shall be sloped to avoid accumulation of dust and moisture.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-49",
              "question": "Fixtures, ducts, pipes, and ledges should be kept to a minimum over tanks, fillers, or cleaned containers. Where such location is unavoidable, ducts and pipes must be adequately insulated to prevent condensation, thus avoiding possible contamination of products, raw materials, ingredients, or food contact surfaces.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-50",
              "question": "Equipment and support structures must be sealed to the supporting surface (e.g., walls, floors, columns, ceiling) in a way that ensure there are no pockets or gaps.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-51",
              "question": "The number and area of floor contact points shall be minimized",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-52",
              "question": "Supports for piping or equipment must be fabricated and installed such that no stagnant water or soil can remain on the surface or within the supports. Supports should be sealed to avoid build-up of residues or moisture",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-53",
              "question": "Distances between equipment and the civil construction (walls, floors, and ceiling shall be sufficient to facilitate ease of cleaning.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-3",
              "question": "Utilities",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-55",
              "question": "Water used as a product ingredient or in contact with products or product-contact surfaces, must meet Company or local regulatory requirements, the stricter of the two. Refer to Water for Product Manufacturing (QFS-RQ-180) . It is recommended that water that will be used in manufacturing should flow through pipes that can be disinfected",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-56",
              "question": "The supply of water (treated/potable) shall be sufficient to meet the needs of the production process(es). Facilities for storage, and distribution shall be designed to meet specified water quality requirements. Refer to Water for Product Manufacturing (QFS-RQ-180)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-57",
              "question": "Water for applications where there is a risk of indirect product contact (e.g., jacketed vessels, heat exchangers) shall meet specified quality and microbiological requirements relevant to the application.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-58",
              "question": "Ensure there is a process in place to identify when a leak has occurred and has entered the product stream",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-59",
              "question": "Non-potable water shall have a separate supply system that is labelled and not connected to the potable water system. Take measures to prevent non-potable water refluxing into the potable system.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-60",
              "question": "An adequate supply of fresh water should be readily available for cleaning at sites where wet cleaning is to be performed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-61",
              "question": "Ensure hot water is available where required and important to maintaining quality of activity being performed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-62",
              "question": "In areas where the floors are flushed frequently (e.g., syrup rooms and bottling rooms), hoses with trigger-type nozzles should be provided.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-63",
              "question": "Hoses should also be maintained in hygienic condition, minimizing their contact with the floor, frequent cleaning of external hose surfaces, and providing storage conditions that maintain hygiene when not in use (e.g., hose racks)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-4",
              "question": "Ventilation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-64",
              "question": "Establish requirements for filtration, humidity (RH%) and microbiology of air used as an ingredient or for direct product contact. Requirements should include the following:\n• No ventilation ducts directly over tank openings or open containers\n• Clean-out doors in ducts\n• Traps on air-conditioning systems to catch condensation\n• Filter microbiological room ventilation through a 0.5 μ filter or install a laminar flow hood large enough to perform microbiological testing\n• Provide special ventilation precautions for allergenic ingredients/products",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-65",
              "question": "Mechanical ventilation should be designed to:\n• Provide fresh air to personnel\n• Effectively distribute the air throughout the room space so that no dead zones are created\n• Control odors which might affect the quality of food\n• Control humidity (or condensation). It is recommended that conditioned air has a relative humidity of 55% to restrict the growth of microorganisms.\n• Effectively remove fumes, smoke, steam, and vapors\n• Effectively remove excessive heat\n• Reduce the number of airborne contaminants, including microorganisms\n• Provide sufficient air changes per hour",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-66",
              "question": "Ventilation systems shall be designed and constructed such that air does not flow from contaminated or raw areas to clean areas",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-67",
              "question": "Specified air pressure differentials shall be maintained based on the type of processing and conditions required for manufacturing i.e., there is a difference between aseptic processing areas and CSD processing rooms.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-68",
              "question": "Use a system with filtered air to provide 15-20 air changes per hour in syrup and filling rooms.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-69",
              "question": "Systems shall be accessible for cleaning, filter changing and maintenance.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-70",
              "question": "Exterior air intake ports shall be examined periodically for physical integrity.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-5",
              "question": "Lighting",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-72",
              "question": "All areas where food is examined processed or stored and where equipment or utensils are cleaned, must have adequate natural or artificial lighting sufficient for the activities being conducted. Where necessary lighting should give sufficient color rendering such that the lighting gives product and surface colors the same appearance as they have under daylight and incandescent lighting (i.e., poor color rendering may create a distortion of the original product color).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-73",
              "question": "Has the plant done the lighting survey and does it meet General lighting should be maintained at the proper level to allow effective and safe production. The recommended minimum lighting levels are:                                                                               Exterior, plant perimeter 110lux  (lm/m2)\nReceiving & shipping Docks / warehouses 300 lux                                                                                                                                         Syrup, Mixing & Filling rooms 300-800 Lux                                   Inspection Points 550-1500                                                                             Laboratories  750-1000 Lux                                                                                  Packaging Areas 440-825                                                                                     Offices 440-550                                                                                                           Corridors 220\n",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-74",
              "question": "Light fixtures must be equipped with protective shields to ensure that materials, product, or equipment are not contaminated in the case of breakages",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-75",
              "question": "Light fittings should ideally be flush with the ceiling to prevent accumulation of dust or a harboring for pests.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-76",
              "question": "Where natural lighting is used to illuminate areas, ensure it does not impact finished product in translucent containers.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-6",
              "question": "Electrical",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-78",
              "question": "Electrical cables or wiring must be installed according to local industrial safety regulations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-79",
              "question": "Where practical, control panels should be located in an area of low humidity outside of wet areas to reduce the rate of corrosion of electrical contacts",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-80",
              "question": "Electrical equipment should be either waterproof or shrouded with waterproofing material, especially during cleaning and sanitizing operations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-7",
              "question": "Compressed Air and Other Gases",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-82",
              "question": "Compressed air, carbon dioxide, nitrogen and other gas systems used in manufacturing and/or filling shall be constructed and maintained so as to prevent contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-83",
              "question": "Gases intended for direct or incidental product contact (including those used for transporting, blowing, or drying materials, products, or equipment) shall be from a source approved for food contact use, filtered to remove dust, oil, and water.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-84",
              "question": "Where oil is used for compressors and there is potential for the air to come into contact with the primary package or product, the oil used shall be food grade.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-8",
              "question": "Drainage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-86",
              "question": "An adequate drainage system shall be provided to convey liquid disposable waste from the plant without providing a source of contamination, and without flooding at peak demand periods.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-87",
              "question": "Drains shall be designed, constructed, and located so that there is no risk of contamination of materials or products",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-88",
              "question": "Drains shall have capacity sufficient to remove expected flow loads. Typically, there should be one floor drain for every 30 to 50m2 (300 to 500 sqft) of floor area",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-89",
              "question": "Slope floors to be self-draining. For example, this means a drop of 10 to 20 mm per meter (1/8 to 1/4 inch per foot).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-90",
              "question": "Drains must be flush to floor to prevent stagnant water",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-91",
              "question": "Drains shall not pass over processing lines. Do not locate drains directly beneath equipment.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-92",
              "question": "Place traps in drains to maintain sanitary conditions.  Place water traps in drains to prevent sewer odors.  Place screen traps in drains large enough to keep drainpipes clear and easily accessible for cleaning",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-93",
              "question": "Ensure drainage direction does not flow from a contaminated area to a clean area.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-94",
              "question": "Process drains should be separated from sanitary drains",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-95",
              "question": "Conduct routine inspection of drains to ensure they are maintained in good repair",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-96",
              "question": "Consider as part of microbiology monitoring program when located in areas where microbiological risks must be managed",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-9",
              "question": "Cleaning in place (CIP) systems",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-98",
              "question": "CIP systems shall be separated from active product lines. Parameters for CIP systems shall be defined and monitored (including type, concentration, contact time and temperature of any chemicals used).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-99",
              "question": "All CIP equipment, including tanks, pumps, heat exchangers, valves, fittings, and pipework should be type 304 stainless steel, or better.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-100",
              "question": "Any elastomeric compounds used (e.g., gaskets) must be able to withstand the temperatures used in hot sanitation and CIP chemicals.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-101",
              "question": "For cleaning of pipework, a turbulent flow is required. To achieve this, the flow rate through a CIP system should be at least 1.5 meters per second in pipelines.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-102",
              "question": "When the process pipeline circuit contains more than one pipe diameter then the flow rate of CIP solutions should be specific to give 1.5 meters per second through the largest pipe diameter in the circuit",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-103",
              "question": "Include air purge or other capability to remove residual CIP solution and water from lines.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-104",
              "question": "For tank spray devices, the flow rate must meet the manufacturer ‘s specification",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-105",
              "question": "Spray balls should be removable for cleaning and inspection.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-106",
              "question": "Include an in-line strainer to remove extraneous material from the CIP solution and prevent blockage of spray balls",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-107",
              "question": "Locate the strainer for easy access, inspection, and cleaning. It is recommended that the strainer be 100 mesh or finer.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-108",
              "question": "If a larger mesh size is used, ensure the filter is smaller than the openings in the spray balls",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-109",
              "question": "Include considerations for capturing of CIP data (temperature, run times, flow rates etc.) as part of design criteria",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-10",
              "question": "Equipment Design",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-111",
              "question": "Equipment shall be designed and located so as to facilitate good hygiene practices and monitoring. Equipment shall be located to permit access for operation, cleaning, and maintenance.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-112",
              "question": "All surfaces in contact with product must be either easily accessible for visual inspection and manual cleaning, or it must be demonstrated that routine cleaning completely removes all soil. If clean-in-place techniques are used, it must be demonstrable that cleaning is effective without dismantling.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-113",
              "question": "The design and construction of processing equipment should be reviewed by the Operating unit prior to installation to confirm system suitability",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-114",
              "question": "Equipment shall be able to meet established principles of hygienic design, including:\n• smooth, accessible, cleanable surfaces, self-draining in wet process areas.\n• use of materials compatible with intended products and cleaning or flushing agents.\n• framework not penetrated by holes or nuts and bolts.\n• Piping and ductwork shall be cleanable, drainable, and with no dead ends.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-115",
              "question": "All stainless-steel product contact surfaces should have a polished finish to facilitate drainage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-116",
              "question": "Equipment should be mechanically maintained so as to ensure good manufacturing practices",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-117",
              "question": "Equipment which has been passivated must be cleaned and sanitized before use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-118",
              "question": "All equipment and utensils coming into contact with ingredients, syrup or finished product, in the course of preparation, handling and storage, must be of sanitary design, self-draining (e.g., sloping pipework), and capable of being sanitized.  Equipment and utensils should be constructed of type 304 or type 316 stainless steel.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-119",
              "question": "To facilitate effective sanitary maintenance, all new equipment should be capable of hot (85 °C) CIP sanitation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-120",
              "question": "Equipment shall be designed to minimize contact between the operator’s hands and the products.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-121",
              "question": "Equipment shall be designed to prevent the inadvertent introduction of machine parts (washers, nuts, bolts, screws, or other removable parts) without detection",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-11",
              "question": "Syrup Tanks",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-123",
              "question": "Simple and final syrup tanks, agitators, and metal fittings must be made of stainless steel of type 304 or 316, with No.4 or better finish. All syrup tanks should have the following characteristics:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-124",
              "question": "Tanks should be of dome-top design, and should contain no pockets, sags, or joints that prevent free and complete drainage.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-125",
              "question": "Tanks should have a manhole above the liquid level to facilitate inspection and access for cleaning, while providing a sanitary air and liquid seal during normal operation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-126",
              "question": "Tanks must be accurately calibrated using calibrated probes, dip sticks, scales, pressure discs, or sanitary level indicators",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-127",
              "question": "It must be possible to isolate each tank from all others so that independent cleaning and sanitation may be practiced and so that there is no possibility for cross contamination of flavors",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-128",
              "question": "Agitators for dissolving sugar and for mixing Concentrate/Beverage Base should be topmounted.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-129",
              "question": "New stainless-steel tanks should be passivated before their initial use if the manufacturer has not already done so.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-130",
              "question": "Design syrup tanks with covers or doors that keep contaminants out when the tank is open or not in use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-131",
              "question": "Ensure tank gaskets/seals are compatible with the product or service and are food grade.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-132",
              "question": "Provide a 3A well type fitting to accommodate a thermometer. Locate the fitting so the instrument is not influenced by the heating or cooling medium.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-133",
              "question": "Terminate air vents (where used) in a processing area and drain into the tank. Provide a perforated cover having openings not more than 1/16-inch (2mm) diameter, or slots not more than 1/32 inch (1mm) wide. Do not use woven mesh wire on vents",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-134",
              "question": "Equip liquid storage tanks with breathing vents equipped with clean protective filters to allow air into or out of the storage tank",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-135",
              "question": "Equip liquid storage tanks with an in-line strainer in the infeed line. Design the strainer to be sanitary and easily removable for cleaning and inspection.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-136",
              "question": "Equip storage tanks with a means (level gauge or scale) of indicating the level of material stored in the tank",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-137",
              "question": "Equip storage tanks with a sampling",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-138",
              "question": "For Storage Tanks for Syrup/Blended Beverage/Sweetener\n• Install metering or load cell systems that are capable of measuring within ±0.25% of the target weight or volume.\n• Calibrate the metering system for the mean storage temperature to minimize delivery errors and prepare a calibration chart to correct for temperature variations.\n• Provide positive airflow across the headspace of the tank to prevent condensation.\n• Arrange an air intake so that the infeed air is at approximately the same temperature as the tank contents",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-12",
              "question": "Pipelines (including flexible hoses and fittings)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-139",
              "question": "Pipelines should be of sanitary construction with a continuous smooth internal surface. They should be passivated and equipped with sanitary fittings, have no dead ends, offsets, or pockets, and should have enough pitch (1% to 2%) to ensure complete drainage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-140",
              "question": "Pipe ends should be butt welded, with high pressure type clamps or fittings.\no Use fusion welding with an inert gas (argon or helium) backing for process pipe work. Polish the weld’s exterior to a No. 4 finish.\no Perform random weld spot testing documenting the results with photographs or sample welds.\no Perform leak testing on gas piping, such as CO2 and nitrogen.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-141",
              "question": "All pipes should be properly supported to avoid excessive stress at the elbows or joints and be sloped (1% to 2% or 10 mm per meter (1/8 inch per foot)).to facilitate self draining. The number of piping supports, as well as any of their horizontal structures\nshould be kept to a practical minimum",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-142",
              "question": "Removable connections and pipe fittings should be of same design and construction.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-143",
              "question": "Pipework must not have dead-ends (defined as a pipe that is completely closed off and does not lead to anything else, creating an area inside an enclosed system that can lead to stagnant water and potential for microbiological growth or corrosion). A deadend is considered when a pipe extends greater than 1.5 times the diameter of the pipe itself",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-144",
              "question": "To facilitate cleaning, and to minimize microbiological problems, all couplings, valves, and sampling ports must be of sanitary design, and must be constructed to permit hot (85°C) sanitation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-145",
              "question": "Put strainers of sanitary design into transfer lines for ingredients, intermediate products and finished beverages.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-146",
              "question": "Install removable strainers so you can remove them easily for cleaning and inspection or use a see-through section of Pyrex for piping to allow inspection without removing the filter. Use the following sizes of strainers:\no 30 mesh for concentrate, beverage bases o 30-40 mesh for final syrup o 100 mesh for final beverage o 20 mesh for pulp-containing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-147",
              "question": "Adequately mark or code lines or connection points to identify connections easily.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-148",
              "question": "Use block and bleed or mix-proof valve technology. Valves must be normally closed when power is off.\nProvide divert panel connections with complete physical disconnects.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-149",
              "question": "Flexible hoses should be of sanitary design and approved for food contact use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-150",
              "question": "Hoses should also be maintained in hygienic condition, minimizing their contact with the floor, frequent cleaning of external hose surfaces, and providing storage conditions that maintain hygiene when not in use (e.g., hose racks, end caps etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-151",
              "question": "Hoses that are not stored in secured areas (e.g., outside areas) should be maintained in hygienic conditions and stored in sanitary housing. Include the ability to secure to prevent unauthorized use or access",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-13",
              "question": "Bottle Washer Design",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-153",
              "question": "Multi-compartment bottle washers with separate in-feed and discharge and more than one caustic compartment are recommended.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-154",
              "question": "Double-ended bottle washers are required within the Coca-Cola system as they provide maximum separation of dirty bottles at the infeed from clean bottles at the discharge.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-155",
              "question": "System should be designed in manner to avoid contamination post washing (e.g., from condensation, dust, dirt, broken bottles, unclean bottles etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-156",
              "question": "Clean bottles should be discharged into a filling room with positive pressure and filtered air to avoid microbiological contamination. (Typical filtered air five micrometers)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-157",
              "question": "Washer exhaust systems need to be designed to remove steam/odors from the processing areas",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-158",
              "question": "Beverage Filling Equipment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-159",
              "question": "Filler product contact areas and parts should be capable of withstanding hot sanitation (85°C) with a minimum contact time of 15 minutes.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-160",
              "question": "Fillers meeting these requirements are made of stainless steel, and normally have recirculation systems that allow continuous contact with all product contact surfaces.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-161",
              "question": "High temperature resistant gaskets and O-rings are required",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-162",
              "question": "Lubricants must have no direct contact with the product, and where contact is unlikely, but possible, the lubricants must be food-grade, tasteless, and approved for use by local regulatory agencies",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-163",
              "question": "Glass bottle fillers should be fully protected and equipped with glass fragment shielding which covers all unsealed bottles (filled and unfilled) in the event of a bottle failure.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-164",
              "question": "The filling valve sealing rubber or centering cup should be easily changed to prevent glass fragments dropping into subsequent bottles filled on a valve where a bottle failure occurs",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-165",
              "question": "Flushing systems or washout tools (e.g., water hoses) should ensure thorough valve flushing after breakage. Treated water at high volume, low pressure should be used",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-14",
              "question": "Beverage preparation tools (including objects in processing areas",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-167",
              "question": "2 Ensure tool used in the sampling, decanting, dispensing, weighing, discharging etc. in processing areas are of suitable design to ensure they do not introduce sources of physical, chemical, or microbiological risk. Examples include knives (used for cutting or opening of bags, sampling devices, buckets, scoops, stirrers, scrapers, manual strainers etc",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-168",
              "question": "Tools that come into contact with ingredient or finished product must be of similar construction and materials to processing equipment, being inert, stain and chemical resistant, easily cleanable, and free from likelihood of introducing physical hazards (e.g., glass, metal)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-169",
              "question": "Utensils should be constructed of type 304 or type 316 stainless steeI",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-170",
              "question": "Do not use wooden tools for above to prevent potential for microbiological contamination",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-171",
              "question": "Tools used in aseptic processes should be made of materials that can withstand sterilization (when required)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-172",
              "question": "Do not use tools that can lead to parts or pieces entering product streams (e.g., snap-off knife blades, devices with nuts/screws/washers etc",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-173",
              "question": "Ensure other objects introduced or present in processing areas do not have the potential to be introduced into product streams. Consider the following:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-174",
              "question": "Controls to prevent the introduction of desiccant bags (used to reduce moisture), tamper evident seals, ties, and other foreign matter (wood, stones etc.) into processing tanks coming from incoming materials",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-175",
              "question": "Control of items and objects that are introduced into a processing area that may be a source of foreign matter. Examples include pens, bulletin board pins and magnets, flashlights/torches (used for tank inspection), loose gaskets and seals etc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-176",
              "question": "Parts such as nuts, bolts, screws, washers etc. that are often introduced through maintenance activities are accounted for and stored appropriately to prevent entry into the process stream",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-177",
              "question": "Conditions and controls that prevent personnel practices from introducing foreign matter into processing areas (i.e., through people movement (from shoes, clothing))",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-178",
              "question": "Controls for minimizing contamination from lift trucks or pallet jacks used to transfer ingredients in to processing areas, including minimizing introduction of wood and nails from pallets",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-15",
              "question": "Closure & Crowns, Preform Hoppers and Chutes/Feeds",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-180",
              "question": "Closure and crown feeding systems, and preform hoppers and conveyors must be of suitable design to prevent the ingress of dust, dirt, and vermin from the external environment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-181",
              "question": "Ensure delivery systems allow for inspection and cleaning due to the buildup of such things as crown dust, plastic particles, and other materials",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-16",
              "question": "Storage/Warehousing locations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-183",
              "question": "Storage locations for all ingredients, packaging and finished products must be designed so they are clean, dry, well ventilated, protected from pests, dust, condensation, fumes, odors, the elements (such as sun, rain, freezing, etc.) or from other sources of contamination or degradation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-184",
              "question": "Ensure that design includes consideration of processes to control warehouse temperature, humidity, and other environmental conditions. Refer to Package Handling and Preparation (QFS-RQ-200)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-185",
              "question": "Consider the need for segregation of ingredients that have been designated as allergens from other non-allergenic ingredients, and design space accordingly.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-186",
              "question": "Segregate the storage of allergenic from non-allergenic materials. In case they must be stored in the same rack, ensure the allergenic materials are placed on the floor layer or below the non-allergenic ones.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-187",
              "question": "Keep enough distance from walls to facilitate effective cleaning and prevent harboring of any pests, insects, or rodents (recommended minimum of 18 inches or 45 cm)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-188",
              "question": "Include areas for parking or recharging of fork-lift trucks",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-189",
              "question": "Fork-lift trucks should not be used in areas where the maintaining of hygienic conditions is necessary. If used, they should be dedicated and not used outside of the area (to prevent cross contamination from the external environment).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-190",
              "question": "Include areas for segregation of nonconforming materials or work in process products that prevents access and potential of release of product to the trade.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-17",
              "question": "Bagged Granulated Sugar Storage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-192",
              "question": "Bagged sugar should be stored in a separate dedicated, secure room. The storage room should be pest and bird-proof and should be provided with tight fitting doors and windows",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-193",
              "question": "To prevent high and variable humidity, the storage room should be in a dry location with masonry walls that are well-sealed and painted to keep out moisture. There should be a floor drain to facilitate cleaning",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-194",
              "question": "Bags of sugar should be stacked on platforms or pallets and not directly on the floor. At least 60cm should be allowed between the walls and the sugar stacks, and at least 50 cm between the stacks themselves to permit good air circulation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-195",
              "question": "Sugar bags that are opened for sampling purposes should be adequately sealed to prevent spillage and longer-term issues with GMPs (sticky floors/food source for pests)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-196",
              "question": "Measures should be taken to prevent the relative humidity rising above 60% and the temperature falling below 10 °C. A system of forced, filtered air circulation can ensure that the proper storage conditions are maintained at all times. To maintain these conditions, it may be necessary to provide dehumidification equipment and/or an air heating system.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-18",
              "question": "Carbon Dioxide Storage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-198",
              "question": "Storage tanks should be installed on a concrete pad and foundation as well as a concrete apron.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-199",
              "question": "The receiving system should be made secure, and if located outside should be fenced off.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-200",
              "question": "Heaters and mechanical refrigeration should be provided to maintain safe working pressures in the system. The pressure in the storage tank should be maintained at about 23 kg/cm2 by keeping the tank temperature at -18°C or lower",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-201",
              "question": "Dual relief valves should be provided in case the refrigeration system fails to operate",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-19",
              "question": "Concentrate & Beverage Base Storage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-203",
              "question": "Concentrate and Beverage Base should be stacked on platforms or pallets and not directly on the floor. Sufficient room should be allowed between stacks and between the wall and stacks to permit good air circulation and easy access for cleaning.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-204",
              "question": "Coca-Cola Concentrate and liquid Beverage Base Parts should be stored in a clean, pest free, secure area and in accordance with the storage conditions identified on label. Cold and frozen storage rooms should be monitored and alarmed to notify operations in event of cold room failure",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-205",
              "question": "Dry Beverage Base Parts should be properly stored in a secure, cool, dry enclosure of uniform temperature. This storage area should not be used for any other purpose",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-206",
              "question": "Access to concentrate and beverage base storage areas should be limited to authorized personnel only.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-20",
              "question": "Packaging Materials storage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-208",
              "question": "Packaging Materials should be stored in a manner to prevent contamination from foreign matter, insects, dust, and rodents, to maintain product quality and to encourage good housekeeping practices",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-209",
              "question": "Clean unsealed containers, empty or filled, should be protected from contamination by careful and cautious handling using equipment and procedures designed to assure container security",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-210",
              "question": "Dirty empty bottles (refillable packages) should be stored in a separate part of the plant to avoid contamination of non-returnable containers and finished product",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-211",
              "question": "Non-Returnable packaging (bottles & cans) must be packed, delivered, and stored in a sanitary manner. To fulfill this requirement, non-returnable packaging should be delivered on either a shrink-wrapped or banded pallet with each layer separated by non-reusable cardboard or fiberboard dividers",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-212",
              "question": "Plants that continue to use reusable cardboard or fiberboard dividers, must ensure that they are stored and handled to prevent cross-contamination (from chemicals, chemically treated pallets, etc.). Operations must also work with their packaging suppliers to prevent similar risk in suppliers’ facilities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-213",
              "question": "Cans should be packed, delivered, and stored in a sanitary manner. The storage area should be separated from the empty bottle storage area to avoid cross contamination",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-214",
              "question": "Pallets with empty cans which will not be filled are to be protected with cardboard, and preferably should be shrink-wrapped to protect them from dust.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-215",
              "question": "Pallets of empty cans should be stored indoors and should be covered following partial use of a pallet.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-216",
              "question": "Crowns, Closures, and Can Ends should be stored in clean areas free from odors, sources of moisture, and away from direct sunlight and heat",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-217",
              "question": "Closures should be stored in a dedicated secure storage room which is clean, wellventilated and pest proof.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-218",
              "question": "Supply and store crowns and closures in plastic or paper bags inside the carton they were delivered in.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-219",
              "question": "Follow recommended supplier storage conditions. This is typically with a relative humidity of 20-60% and temperature of 10-32°C",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-220",
              "question": "All cartons should be kept unopened until required for use. Partially used cartons should be resealed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-221",
              "question": "Closures may require conditioning to ensure ease of application. If required store in suitable location.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-222",
              "question": "Cartons and sleeves should be stacked on pallets or racks, and sufficient space should be left between stacks and walls to allow adequate air circulation. The cartons should not be stacked more than six high",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-223",
              "question": "Supply and storage of can lids in paper sleeves is recommended. Can lids should be stored to prevent contamination from dust, insects, and rodents. Partially used sleeves should be resealed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-21",
              "question": "Finished Product Storage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-225",
              "question": "Finished product must be stored in clean, ventilated, pest-free spaces",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-226",
              "question": "Store product in accordance with its storage conditions i.e., ambient, refrigerated, or frozen",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-227",
              "question": "Non-refrigerated finished products should be stored cool, away from direct heat and sunlight. Frost protection must be provided. Product once frozen should no longer be sold.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-228",
              "question": "Finished product must not be exposed to direct sunlight which can cause sensory damage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-229",
              "question": "Do not store products outside (no cover) exposed to the elements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-230",
              "question": "The use of a tarpaulin over the top of products stored outside is not considered appropriate cover.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-22",
              "question": "Pallets",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-232",
              "question": "New or inactive pallets should be stored outside in a remote area. If pallets of different sizes are used, they should be stored according to size",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-233",
              "question": "Pallets should be stored on a paved area and should be covered if stored for a long period of time",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-234",
              "question": "Store pallets in a manner that prevents the potential for infestation and prevents them from becoming a source of microbiological contamination, or sensory risk.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-235",
              "question": "Wooden pallets must be heat or kiln-dried treated to ensure that all wood-bearing insects and larvae are killed off, after which the pallets can be used and reused.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-236",
              "question": "Do not use chemically treated wooden pallets unless local regulations require treatment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-237",
              "question": "Ensure pallet treatments where used do not have the potential to contaminate package materials or products during shipment and storage.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-238",
              "question": "Maintenance/Engineering workshops",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-239",
              "question": "Design and construct maintenance and engineering workshops in a manner that prevents cross contamination with processing areas",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-240",
              "question": "Provide adequate space for repairs, machining of parts, and storage of spare parts.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-23",
              "question": "Laboratory Facilities",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-242",
              "question": "In-line and on-line test facilities shall be controlled to minimize risk of product contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-243",
              "question": "Build walls, floors, ceilings, and doors from smooth, non-porous materials that are easily cleaned.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-244",
              "question": "Use only countertops built from smooth, non-porous materials that resist stains",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-245",
              "question": "Install all fume hoods so they vent outside the plant and away from air intakes that could recycle the exhaust back into the plant. Ensure hoods meet local regulations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-246",
              "question": "Ventilate the air to ensure 23approx.. 10 changes per hour.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-247",
              "question": "Microbiology laboratories shall be designed, located, and operated so as to prevent contamination of people, plant, and products. They shall not open directly on to a production area.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-248",
              "question": "Filter microbiological room through 0.5µ filter or install laminar flow hood large enough to perform all microbiological activities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-249",
              "question": "Do not use construction materials in the micro lab that may be a potential source of contamination e.g., wood, porous tiles etc",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-24",
              "question": "Personnel Facilities (toilets, changerooms, and canteens)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-251",
              "question": "Personnel hygiene facilities (e.g., toilets, handwashing facilities, changerooms) shall be available and adequate to ensure that the degree of personal hygiene required can be maintained. The facilities shall be located close to the points where hygiene requirements apply and shall be clearly designated.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-252",
              "question": "Adequate number of locations and means for the washing, drying, and sanitizing of hands (includes washbasins, supply of hot and cold or temperature-controlled water, and soap, sanitizing solution, covered trash receptacles).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-253",
              "question": "Use of sanitizer only as the means of cleaning hands is not sufficient. Operations must ensure both hand washing and sanitation stations are in place in designated areas, especially syrup, mixing & blending and filling areas",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-254",
              "question": "Taps/faucets, soap & sanitizer dispensers, single use paper towel dispensers should be designed to operate as hands free.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-255",
              "question": "Sinks must be designated for hand washing and separated from sinks used for equipment or cleaning.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-256",
              "question": "Sinks should be designed with proper drainage tied into the drainage system. They should not drain directly to the floor, especially in areas where hygienic conditions are to be maintained",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-257",
              "question": "An adequate number of toilets of appropriate hygienic design, each with handwashing, drying and sanitizing facilities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-258",
              "question": "Number of toilets should coincide with breakdown of gender (male/female) and number of employees. Recommended number of toilets is 1 per 10 associates.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-259",
              "question": "Toilets must not open directly on to production, packing or storage areas.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-260",
              "question": "Adequate changeroom facilities for personnel.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-261",
              "question": "Changerooms should be located to enable personnel to move to the production area in such a way that reduces the risk to the cleanliness of their workwear",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-262",
              "question": "Toilets should have adequate ventilation, exhausting to the plant exterior to achieve the number of air changes per hour necessary to prevent static odors.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-263",
              "question": "Staff canteens and designated areas for food storage and consumption shall be situated so that the potential for cross-contamination of production areas is minimized.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-264",
              "question": "Staff canteens shall be managed to ensure hygienic storage of ingredients and preparation, storage and serving of prepared foods. Storage conditions and storage, cooking and holding temperatures, and time limitations, shall be specified",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-265",
              "question": "Employees’ own food shall be stored and consumed in designated areas only",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-SEC-25",
              "question": "Waste Management, Disposal & Removal",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-267",
              "question": "Systems shall be in place to ensure that waste materials are identified, collected, removed, and disposed of in a manner which prevents contamination of products or production areas.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-268",
              "question": "Containers for waste and inedible or hazardous substances shall be\n• clearly identified for their intended purpose.\n• located in a designated area.\n• constructed of impervious material which can be readily cleaned and sanitized.\n• closed when not in immediate use.\n• locked where the waste may pose a risk to the product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-269",
              "question": "Provision shall be made for the segregation, storage, and removal of waste",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-270",
              "question": "Accumulation of waste shall not be allowed in food-handling or storage areas. Removal frequencies shall be managed to avoid accumulations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "GMP-271",
              "question": "Labelled materials, products or printed packaging designated as waste shall be disfigured or destroyed to ensure that trademarks cannot be reused. Removal and destruction shall be carried out by approved disposal contractors. The organization shall retain records of destruction.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-security-checklist",
        title: "KORE QFS Internal Audit Checklist — Security",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Security, Asset Protection, and Cybersecurity. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "SEC-1",
              "question": "Ensure implemented security processes and practices, including requirements for cybersecurity, are in accordance with local regulatory requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-2",
              "question": "Operations who are located in high-risk locations (e.g., conflict zones) must ensure enhanced procedures are in place to prevent significant risk exposure. Contact the Operating Unit and/or the Global Security support team for further guidance as deemed necessary",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-3",
              "question": "Access to an operation must be provided to any authorized representative of The Coca-Cola Company for the purposes of official Company business (e.g., member of the Global audit team). Authorized representatives:\n3.1 Must provide proof of identification prior to entry (e.g., the Company’s badge or other valid identification of the Company).\n3.2 May take photographs as part of official Company business.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-4",
              "question": "Conduct a security vulnerability/ threat assessment to ensure a complete understanding of the environment in which the facility is operating. Includes an assessment of both internal and external environmental factors such as location, cultural, social, and political situation, type of facility and surrounds, physical layout, size of associate population, etc",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-5",
              "question": "At minimum conduct assessment annually. Increase frequency based on perceived changes to the operating environment or in response to threats. Changes in the operating environment are related to, but not limited to, expansion of facilities or new construction, sudden increase in crime, social unrest, major strike events and etc",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-6",
              "question": "Include potential risk exposure of product tampering as part of threat assessment (as part of food security/food defense program).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-7",
              "question": "Develop and implement a security program based on the security vulnerability assessment to facilitate the flow of people and materials into and out of the facility as well as the security of proprietary or sensitive information. The design of the security program should be both preventive and reactive to discourage and deflect perceived threats, while maintaining business continuity. This may include but not be limited to the following:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-8",
              "question": "Appropriate physical controls to the prevent unauthorized access to a facility’s grounds (e.g., perimeter fencing or walls of adequate height that prevent scaling/climbing over, exterior lighting, guards, alarms, warning signs, etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-9",
              "question": "Controls to manage access at points of facility entry (e.g., security access control, security gates/barriers, personnel checks and identification, ID badges (associates, visitors, contractors), card access or fingerprint readers/retina scanners).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-10",
              "question": "Includes controls for secure flow and movement of trucks in and out of a facility, together with their drivers.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-11",
              "question": "Includes procedures to manage the access of contractors and visitors to the facility.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-12",
              "question": "Mechanisms to locate and identify unauthorized entry into the facility (e.g., CCTV, guard patrols).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-13",
              "question": "Procedures for actions to be taken in the event of a security breach.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-14",
              "question": "Procedures to control the unauthorized use of cameras or other electronic devices (mobile phones) for the capturing of proprietary or sensitive information.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-15",
              "question": "Control and evacuation procedures in the event of a threat (e.g., evacuation contingency plans, emergency shut down procedures, procedures to secure critical assets, identification of safe havens or muster stations).                                                                                                                                             Contingency plans must include actions to be taken to secure the area and sensitive information in the event of power outage, fire, and etc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-16",
              "question": "Confirmation that implemented security processes meet local regulations for security.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-17",
              "question": "Maintain records of access control to the facility.                                                                                                     Include administrative controls for keys, login cards, and keypad codes used to access the facility and sensitive areas.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-18",
              "question": "Maintain a list of restricted areas and define who has access to them.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-19",
              "question": "Protect the integrity of ingredients, intermediate materials, and finished products during processing when personnel are not present (e.g., use of uniquely identifiable, tamperevident seals or tape to re-seal open packages)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-20",
              "question": "Ensure all personnel entering the facility understand the manufacturing plants security program.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-21",
              "question": "Employees dealing with proprietary or sensitive information, or those working in sensitive areas of the manufacturing plant or performing sensitive activities must receive additional training on their security.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-22",
              "question": "Ensure all training is documented.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-SEC-1",
              "question": "Sensitive areas",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-24",
              "question": "The following areas are considered sensitive and must have access control beyond that of the entire facility (e.g., security devices such as locks, fingerprint readers, etc.):\n• Water treatment\n• Wells and boreholes\n• Laboratories\n• Concentrate and beverage base storage areas\n• Syrup manufacturing (Processing/production, mixing and blending tanks)\n• Datacenters and network servers.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-25",
              "question": "Conduct a risk assessment for the following sensitive areas to determine whether any additional security is needed beyond facility access:\n• Ingredient & packaging storage areas\n• Hazardous chemical storage\n• Label storage\n• Retention sample storage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-26",
              "question": "Sensitive areas that are not part of the main facility or campus must be adequately secured to prevent unauthorized access or tampering (e.g., off-site deep wells or boreholes, warehouses, etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-27",
              "question": "Ensure third party locations used for ingredient, primary packaging or product storage have adequate security to prevent unauthorized access",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-28",
              "question": "Ensure contract manufacturing facilities have similar secure access controls as those defined in this requirement.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-SEC-2",
              "question": "Cybersecurity",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-29",
              "question": "An Information Security policy must be defined and include requirements to protect sensitive information from unauthorized access and manipulation and ensure availability of information, systems, and processes to authorized users when needed",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-30",
              "question": "Each operation must designate a person to be responsible and accountable for information security.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-31",
              "question": "Governance and risk management processes must also address ransomware risks. Refer to BRF ID.6. Backups of information must be conducted, maintained, and tested periodically. Refer to BRF PR.14",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-32",
              "question": "Access control mechanisms for the network, systems, etc. must be in place. For example (where appropriate):\n• unique user/asset IDs (no shared accounts). Refer to BRF PR.1.\n• strong password requirements. Refer to BRF PR.20.\n• multi-factor authentication where appropriate (e.g., administrative access). Refer to BRF PR.21\n• VPN/secure remote access mechanisms. Refer to BRF PR.25.\n• user access review routines. Refer to BRF PR.2.\n• access revocation for inactive/terminated users. Refer to BRF PR.2.\n• logging and monitoring of user access, etc. Refer to BRF DE.1. These requirements must apply to all employees, third parties, etc. who access the organization’s network and information technology assets",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-33",
              "question": "Safeguards such as firewalls, network segmentation (where appropriate), relevant security patching, anti-virus/malware protection, etc., must be in place to protect computing environment from malicious code (e.g., viruses) and other threats and vulnerabilities. Refer to BRF DE.1, PR.3, PR.23, and PR.24.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-34",
              "question": "Use monitoring systems and procedures, consistent with industry standards (e.g., NIST) to detect and retain a record of actual and attempted attacks or intrusions into member information systems",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-35",
              "question": "Establish, implement, and maintain incident response programs that specify actions to be taken when unauthorized access to or use of sensitive information or information systems is suspected or detected, and/or manufacturing systems, equipment, etc. is impacted by (suspected) cyber incidents.The program must be communicated to all relevant stakeholders and exercised yearly with lessons learned documented and response plans updated accordingly. Refer to BRF RS.5.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-36",
              "question": "All breaches of information security and suspected weaknesses must be reported to the Operating Unit by in scope external parties and to the appropriate organization stakeholders.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-37",
              "question": "The incident reporting and investigations process must be linked to the facility's Incident Management and Crisis Resolution (IMCR) program. Lessons-learned provisions should also be included to avoid repeat incidents.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-38",
              "question": "Incident Response and Recovery plans must exist and are executed during or after an event.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-39",
              "question": "All information assets (both physical devices and software platforms/applications) must be tracked via inventory control or configuration management database (CMDB) and backed up on a regularly scheduled basis to ensure the availability of information assets and limit data and/or function loss in the event of an outage.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-40",
              "question": "9 Deliver and document periodic training for all employees to ensure that all personnel are knowledgeable in fulfilling their assigned responsibilities under the program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-41",
              "question": "Ensure business continuity processes are produced, maintained, and tested as far as practical to limit losses caused by disruptions to critical business operations and to enable efficient and effective recovery. This approach will protect the life and safety of all personnel, as well as the image, reputation, assets and resources of the organization.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-42",
              "question": "Defined roles and responsibilities must be established within the Business Continuity process, and a lessons-learned portion defined to drive plan improvements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-SEC-3",
              "question": "Information Security",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-44",
              "question": "Controls to manage access to computers, restricted file room, technology inventory rooms, and data centers with relevant information (e.g., Master Mixing Instructions, product and ingredient analysis, food safety plans, critical information, etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-45",
              "question": "Directories, websites, and SharePoint sites containing sensitive information should have access restricted to authorized users only",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-46",
              "question": "Access control to computers and equipment’s programmable logic controller (PLC) must be implemented with different authorizations levels.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-47",
              "question": "Implement mechanisms that prevent more than one person from using the same access login. When administrator accounts apply, keep track of everyone who has the admin password and ensure no two people have access to the account at the same time. Moreover, segregation of duties is required for critical tasks and operations to ensure that no single individual has complete control over the operation. Refer to PR.2.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-48",
              "question": "All sensitive information, including intellectual property, and customer data, whether in hard copy or on electronic devices such as laptops, tablets, hard disk drives, magnetic tapes, and CDs should be physically secured when not in use. Physical security includes access-controlled measures such as locking materials in secured cabinets, etc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-49",
              "question": "Servers, including but not limited to mainframes, midranges, and applications must be stored and managed in a trusted/secure environment that limits physical access to the devices so that only authorized and authenticated parties are provided access.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-50",
              "question": "Develop and implement procedures for the destruction and disposal of materials containing trademark and sensitive information, including intellectual property (i.e., Mixing Master Instructions and product records) and customer data, whether in hard copy or on electronic devices such as laptops, tablets, hard disk drives, magnetic tapes, CDs, etc",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-51",
              "question": "Before disposing or recycling an electronic device, completely erase all information on it and make sure the data is no longer recoverable. Old hard drives and other electronic devices that contain critical information must be physically destroyed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "SEC-52",
              "question": "Hard copies containing sensitive information must be shredded before being sent for recycling or disposal.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-maintenance-program-checklist",
        title: "KORE QFS Internal Audit Checklist — Maintenance Program",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Maintenance Program. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "MAINT-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-2",
              "question": "Design and implement a master schedule for maintenance for all applicable equipment critical for ensuring Quality, Food Safety, Occupational Health & Safety and Environmental performance and compliance.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-3",
              "question": "Maintain records of maintenance activities to demonstrate compliance with these and other record keeping requirements. Refer to Records Management (PRP-RQ-060).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-SEC-2",
              "question": "Maintenance Program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-5",
              "question": "Implement an equipment maintenance program to ensure continuous optimal performance as defined by its design criteria. Maintenance programs should consider importance of equipment and may include corrective (breakdown), predictive, preventive and/or routine maintenance",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-6",
              "question": "Ensure maintenance activities and their costs are included as part of annual business plans",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-7",
              "question": "Equipment maintenance shall be performed by suitably trained, qualified, and experienced personne",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-8",
              "question": "All maintenance activities should be conducted in accordance with TCCC, local regulatory and manufacturer safety and environmental requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-9",
              "question": "Where maintenance activities are outsourced or conducted by third party contracted personnel, ensure they also follow internal requirements and safety procedures, and are suitably qualified to perform the tasks as defined (e.g., licensed tradesman, certified technicians etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-10",
              "question": "The decision on selection of vendors/contractors should be verified by qualified plant personnel who can confirm that contractors meet above requirements. Refer to Contractor Management (PRP-RQ-110) for further information on selection and management of responsibilities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-11",
              "question": "Perform routine and preventive maintenance as per manufacturer’s recommendations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-12",
              "question": "Operations may consider deviating from the recommended frequency due to availability of vendors, parts, be in conflict zones, or affected by political unrest etc. In these instances, establish processes that ensure that additional controls and inspections are performed to look for any conditions that may lead to an impact to process performance (e.g., increased sampling or equipment inspection",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-13",
              "question": "Operations may also conduct a risk assessment using historical data and other information to adjust maintenance frequency, especially when a maintenance frequency has not been defined. In these instances, ensure that processes exist to confirm that equipment continues to produce expected results.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-14",
              "question": "Conduct inspections of equipment prior to use/startup to confirm they are in suitable condition and meeting intended performance and safety criteria. Any equipment found in substandard operating condition that may adversely affect product quality, people safety or impact environmental processes must not be used i.e., repaired, replaced, or taken out of commission",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-15",
              "question": "When not suitable for usage, ensure status is clearly communicated to all appropriate personnel through suitable means (e.g., removed from area, visible labeling on equipment indicating that it is “Out of Service”, or discarding of equipment (where feasible))",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-16",
              "question": "Any ingredients, packaging, and/or final product exposed to risk as a result of substandard equipment or operating conditions must be segregated until disposition can be determined",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-17",
              "question": "For safety equipment, determine whether the equipment can be returned to use following suitable safety risk assessment. If deemed not repairable, discard immediately to prevent use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-18",
              "question": "For environmental equipment that is not meeting performance standards, take required actions to ensure that the nonconforming equipment is not leading to an environmental risk.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-19",
              "question": "Prior to conducting maintenance activities on processing equipment, ensure that all ingredients, product and/or packaging that may be exposed to cross contamination due to the activity is removed from the area/production line",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-20",
              "question": "Minor line adjustments that do not expose product or packaging do not require clearance",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-21",
              "question": "Equipment that undergoes maintenance must be returned to a clean state post maintenance.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-22",
              "question": "Ensure no potential for cross contamination exists following maintenance (from machine parts, debris, dust/dirt, grease/lubricants, or other possible sources of contamination)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-23",
              "question": "Equipment should be re-inspected prior to being returned to use to confirm that all tools and parts have been removed from equipment used for processing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-24",
              "question": "Specific to spare parts, use original equipment manufacturer (OEM) where possible.                                                             When OEM parts are not used or available, ensure that alternative parts maintain operating condition and have been confirmed to ensure food safety & environmental compliance (e.g., food grade for product contact materials e.g., gaskets, seals etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-25",
              "question": "Safety equipment such as PPE should be certified as per requirements outlined in Personal Protective Equipment (OHS-RQ-205). This should be confirmed at time of purchase to avoid use of non-approved or certified PPE equipment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-26",
              "question": "Maintain a suitable area (workshop) within the facility for the purposes of conducting maintenance activities",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-27",
              "question": "Workshop areas must be designed to ensure the safe use of equipment designed for maintenance activities e.g., welding, grinding, modification",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-28",
              "question": "Maintenance workshops shall be designed and located to prevent cross contamination to areas used for the storage and handling of raw materials, final product, or used for other employee activities (e.g., cafeteria, offices, meeting rooms).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-29",
              "question": "Implement housekeeping programs within maintenance workshops that facilitate the effective access to tools, parts, equipment etc. Each plant should implement 5S programs within the maintenance area and\nother areas where maintenance equipment is stored or located.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-30",
              "question": "Tools, toolboxes, machine and spare parts or interchangeable parts stored or located in processing areas shall be maintained in suitable condition to ensure no potential for cross contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-31",
              "question": "Tools used in areas where sensitive beverages are manufactured should be dedicated (ideally stored in the processing area and only used for maintenance of equipment in the area). Maintain and store in a sanitary manner to prevent the likelihood of them leading to being a source of contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-32",
              "question": "Ensure tools introduced into a sensitive area from other areas are sanitized prior to use. For example, tools used in an aseptic chamber should undergo the same CIP treatment as the equipment itself.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-33",
              "question": "Maintain records of maintenance activities to confirm completion and traceability of activities",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MAINT-34",
              "question": "Maintenance information should be used to further optimize the maintenance process. The following opportunities should be considered:\n• Establish performance criteria that allow for the optimization of the maintenance process\n• Evaluate the maintenance personnel skills and performance\n• Modify existing preventive maintenance and routine maintenance programs\n• Develop a predictive maintenance program on key equipment to maintain production efficiencies\n• Track operational costs and performance for all key equipment\n• Determine spare part inventory levels",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-calibration-and-verification-checklist",
        title: "KORE QFS Internal Audit Checklist — Calibration and Verification",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Calibration and Verification Program. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "CAL-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-2",
              "question": "Design and implement a master schedule for calibration/verification for all applicable equipment critical for ensuring Quality, Food Safety, Occupational Health & Safety and Environmental performance and compliance",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-3",
              "question": "Maintain records of calibration/verification activities to demonstrate compliance with these and other record keeping requirements. Refer to Records Management (PRP-RQ-060).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-SEC-2",
              "question": "Calibration and Verification Program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-5",
              "question": "Design and implement a calibration/verification program to ensure the validity and accuracy of all critical to QSE equipment used for monitoring, testing, control, or protection",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-6",
              "question": "Prepare a master list of all equipment, instruments, and items/devices that have an impact on food safety, quality, workplace safety, environmental monitoring and/or legal compliance that require regular calibration and/or routine verification.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-7",
              "question": "Ensure all equipment and devices are uniquely identified, including a process that ensures the ability to verify their calibration status (i.e., last calibration performed/when next calibration is due).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-8",
              "question": "The design of the calibration program must ensure that all users/operators can verify the status of calibration prior to use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-9",
              "question": "Ensure all new equipment has been calibrated or verified prior to first usage\nVerify from equipment supplier whether re-calibration or verification is required before putting equipment in to first use, as the movement or shipping of equipment may have a direct impact on the accuracy of measurements or test results",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-10",
              "question": "Establish calibration and/or verification intervals/frequency based upon the manufacturer’s recommendations, the level of projected use, the usage environment and usage history",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-11",
              "question": "Certain equipment such as balances and scales, temperature monitoring devices etc. may require routine verification checks. Ensure all equipment that requires verification is clearly identified and that procedures are in place to ensure this is performed at the required frequency",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-12",
              "question": "Verification should be performed using the best available reference materials, preferably certified reference standards",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-13",
              "question": "Verification activities should be performed at the range of use of the equipment. Ideally verification activities should bracket the intended range to confirm that the equipment is working in accordance with specification. For example, if temperature of pasteurization is 136 °C, verification should be performed at the specification and/or ideally above and below the range where both food safety and quality may be impacted i.e., below specification food safety risk / above specification potential quality risk).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-14",
              "question": "Where precision and repeatability are critical to the quality of results (e.g., analytical test methods), use control charts to monitor ongoing equipment performance. When a significant shift/drift begins to occur, determine if recalibration is required. Keep a record of the results",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-15",
              "question": "Perform calibration or verification activities after repair, maintenance, or relocation to reconfirm equipment continues to perform to expected specifications.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-16",
              "question": "Protect equipment from damage and deterioration during handling, maintenance, relocation, or storage.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-17",
              "question": "When equipment or devices require calibration, ensure the following:                                                                            1. Calibration must be performed by trained and qualified personnel. In most instances this will be an external third-party calibration agency.                                                                                                                                         2.  Ensure any third-party agencies are suitably qualified to performance calibration. Third party agencies should be accredited to a recognized standard (e.g., ISO 17025 for Testing and Calibration Laboratories, UKAS, CLAS).                                                                                                                                                                            3. Standards used for calibration must be traceable to NIST or equivalent.\n8.3 Calibration should be performed against the full working range of intended use of the equipment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-18",
              "question": "Reference materials used for the purposes of on-site calibration or verification should be maintained in optimal condition. For example, certified weights used for verifying balances or scales must be properly stored and handled to protect their integrity",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-19",
              "question": "Ensure that all measurements are traceable to an international standard or OEM recommendations/guidelines",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-20",
              "question": "Maintain records of calibration for all reference materials for traceability purposes. These are typically certificates provided by the manufacturer or an external third-party agency used for recalibration. Do not attach calibration labels directly on to reference materials where it will alter their accuracy e.g., certified weights",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-21",
              "question": "In some circumstances a reference material or certified reference may not be available (e.g., laboratory calibration solutions). In this instance prepare a suitable consensus standard. The properties of this material should be characterized by repeat testing.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-22",
              "question": "Store all reference materials in a protected area to prevent deterioration, change to accuracy or damage. This includes standard solutions used in the laboratory",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-23",
              "question": "Ensure solutions are stored in accordance with manufacturers specifications",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-24",
              "question": "Solutions used in the laboratory should have clearly identified date of preparation and use by or expiry dates. Do not use solutions after expiry date has been reached",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-25",
              "question": "Establish procedures for actions to take when equipment fails verification/calibration",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-26",
              "question": "When verification or calibration indicates that the equipment is not performing in accordance with specification, take it out of service.                                                                                                                                                1. The decision to be taken may be to recalibrate, replace or discard.                                                                    2. Identify equipment that is unable to meet specification or performance tolerances with its status (i.e., do not use). When unable to recalibrated, ensure process does not allow equipment to be inadvertently returned to use.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-27",
              "question": "When equipment is critical to the quality and/or safety of the product, or to the decisions on safety, environmental or legal compliance, conduct an assessment of all product and processes conducted since last calibration/verification was performed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-28",
              "question": "If equipment is identified as a critical control point (CCP), isolate all product on hand and contact OU to review actions to be taken e.g., extended sampling plans, product release criteria.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-29",
              "question": "If product is work in progress (e.g., simple or final syrup production), then isolate and review impact of verification or calibration before proceeding to final production",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-30",
              "question": "For finished product, isolate all product that is in stock and determine process to check and determine whether product quality or safety has been compromised",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-31",
              "question": "If product has been released to the trade, discuss with OU potential risk exposure, and take appropriate actions agreed to by both parties",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CAL-32",
              "question": "If process is specific to legal compliance (e.g., wastewater discharge), then contact OU to discuss actions and next steps.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-pest-control-checklist",
        title: "KORE QFS Internal Audit Checklist — Pest Control",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Good Manufacturing Practices Pest Control. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "PEST-SEC-1",
              "question": "General",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-2",
              "question": "Hygiene, cleaning, incoming materials inspection, and monitoring procedures shall be implemented to reduce the likelihood of creating an environment that is conducive to the harboring of pests",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-3",
              "question": "The pest control program shall be documented and shall identify target pests, addressing plans, methods, schedules, and control procedures to minimize activity or the potential for infestation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-4",
              "question": "Complete an analysis of the common types of pests to be controlled (e.g., birds, insects, rodents, lizards, cats etc.). Pay attention to the specific types of pests and animals that may be present based on the geographic diversity/characteristics of the local environment. Examples include monkeys and snakes in dense surroundings such as jungles or rainforests, or frogs and lizards near large bodies of water.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-5",
              "question": "Design of the pest control program should consider external surrounding environment (e.g., location, vegetation), and local surrounding businesses (types of pests that may be attracted)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-6",
              "question": "Develop a pest control program that ensures pest activities are reduced/minimized the closer you get to the point of manufacturing. This includes “zones” or “barriers” of defense from the outside to inside.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-7",
              "question": "Include in program a list of chemicals which are approved for use in specified areas of the facility",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-8",
              "question": "Make sure that all chemicals and traps to be used comply with local legislation and do not pose a risk to employees, product, or the environment.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-SEC-2",
              "question": "Pest Control Responsibilities",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-10",
              "question": "Each operation must designate a person to be responsible for the management and oversight of pest control activities",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-11",
              "question": "Operations contracting pest control services to a third-party must ensure that the contractor has the required capabilities, training and understanding of the conducting of pest control activities in food manufacturing facilities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-12",
              "question": "Operations must not delegate full responsibility and accountability for pest management to an external third-party contractor. Operations must maintain accountability and ensure the effectiveness of the program by participating and observing pest control activities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-13",
              "question": "Operations who choose to perform their own pest control activities must ensure that all personnel performing pest control activities are appropriately trained and qualified to the perform the task. In addition, they must conduct pest control activities in alignment with this requirement",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-14",
              "question": "Periodically conduct audits of the pest control program to confirm effectiveness (e.g., identification of pest activity, chemicals used, condition and placement of bait stations etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-SEC-3",
              "question": "Preventing access",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-16",
              "question": "Buildings shall be maintained in good repair. Holes, drains and other potential pest access points shall be sealed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-17",
              "question": "External doors, windows or ventilation openings shall be designed to minimize the potential for entry of pests",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-18",
              "question": "All doorways must be appropriately sealed to prevent rodents at ground level",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-19",
              "question": "For doors that are used frequently throughout the day, use overlapping plastic curtain strips or high-speed roller doors to prevent birds and other pests such as insects from entering.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-20",
              "question": "Where the potential for bird activity is possible (warehouses etc.), ensure suitable prevention devices are used",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-21",
              "question": "Consider the use of air curtains on doors to processing areas as a deterrent to entry of flying insects",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-SEC-4",
              "question": "Harborage and infestations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-23",
              "question": "Storage practices shall be designed to minimize the availability of food and water to pests.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-24",
              "question": "Include in incoming material receiving program processes to inspect material and shipping devices (i.e., pallets, containers) to ensure they are free of pests",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-25",
              "question": "Before unloading, inspect incoming ingredients and package integrity to see if there are webs or pin holes. For example, and where practical check the underside of carton flaps or in bag/sack folds (between seems) to look for any insects that may not be externally visible",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-26",
              "question": "Immediately isolate any material found to be contaminated with pests. Material found to be infested shall be handled in such a way as to prevent contamination of other materials, products, or the facility",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-27",
              "question": "If material can still be used, ensure activity is eliminated before releasing for use. Where not feasible, reject ingredients and dispose of in a manner that prevents further risk of spreading of infestation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-28",
              "question": "2 Inspect pallets that will be used within the facility for activity. Ensure they do not create a source of further infestation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-29",
              "question": "Fumigation and insecticide sprays must not be applied directly on ingredients, packaging, or final product surfaces.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-30",
              "question": "Maintain facility grounds to prevent areas of infestation . Store waste in a manner that prevents attraction and harborage.  Trash compactors and refuse containers close to the building must be maintained in a sanitary manner.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-31",
              "question": "All locations where product residue may be present or spilled must be maintained to prevent attraction of bees, wasps, or ants.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-32",
              "question": "Maintain grounds in a clean condition, well drained (to prevent stagnant water or pooling water sources) to prevent harborage areas for mosquitoes. Use mosquito repellants that won’t affect environment or aquatic life",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-33",
              "question": "Avoid build-up of old machine/equipment parts or building materials. Where necessary, ensure adequate pest control activities are in place to minimize likelihood of harborage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-34",
              "question": "Identify areas within the facility where infestation may occur. Include in routine inspection and pest control activities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-35",
              "question": "Areas identified as common locations for harborage of pests include in cracks in walls or floor tiles, around drains, roof cavities, dark and damp locations (e.g., mosquitoes or fruit flies in drip trays, or in remote dark corners under storage tanks",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-SEC-5",
              "question": "Monitoring and detection",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-37",
              "question": "Pest-monitoring programs shall include the placing of detectors and traps in key locations to identify pest activity",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-38",
              "question": "A map of detectors and traps shall be maintained.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-39",
              "question": "Detectors and traps shall be designed and located to prevent potential contamination of materials, products, or facilities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-40",
              "question": "Detectors and traps shall be of robust, tamper-resistant construction and be appropriate for the target pest.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-41",
              "question": "The detectors and traps shall be inspected at a frequency intended to identify new pest activity. The results of inspections shall be analyzed to identify trends.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-SEC-6",
              "question": "Eradication",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-43",
              "question": "Eradication measures shall be put in place immediately after evidence of infestation is reported. Ensure measures take in to account local regulations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-44",
              "question": "Ensure any clean-up activities resulting from infestation (e.g., birds nests / droppings) are done in a manner as to prevent spread of disease or contamination.  Activities should be performed using suitable protective clothing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-45",
              "question": "Pesticide use and application shall be restricted to trained operatives and shall be controlled to avoid product safety hazards",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-46",
              "question": "Records of pesticide use shall be maintained to show the type, quantity and concentrations used; where, when, and how applied, and the target pest.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-47",
              "question": "Exterior monitoring devices/bait stations for the control of rats and mice should be tamperresistant, anchored in place and properly labeled",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-48",
              "question": "Ideally, traps/stations should be positioned at 15 to 30-meter (50 to 100-foot) intervals along exterior perimeter walls and elsewhere if appropriate",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-49",
              "question": "All bait stations should be monitored and serviced at appropriate intervals. The frequency should be in line with levels of rodent activity in the stations (ideally at least monthly).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-50",
              "question": "Baits shall not be used in processing areas.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-51",
              "question": "Where permitted by law, internal control programs may be used (mechanical traps, extended trigger traps and/or glue boards (with plastic covers to prevent from dust)). These should not include feeding stations of any kind",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-52",
              "question": "Traps/stations should also be placed near all entrances and preferably at both sides.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-53",
              "question": "Stations should be labeled, constructed of a durable material such as hard plastic and should be kept locked and secured in place.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-54",
              "question": "Electric flying insectocutors (insect “knock-down” devices) should be placed so as not to attract insects into the inside of a plant from the outside",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-55",
              "question": "Do not place insectocutors within 3 meters (10 feet) of exposed packaging and product, or install near or above processing equipment, to prevent the potential for “blowout” contamination",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PEST-56",
              "question": "Catch trays should be regularly inspected emptied, cleaned, and maintained.  Ultraviolet light tubes should be replaced according to the supplier. The lights should be always switched on, even when the site is not operating",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-ppe-and-personnel-hygiene-checklist",
        title: "KORE QFS Internal Audit Checklist — PPE and Personnel Hygiene",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for PPE and Personnel Hygiene. Score findings as Compliance (2) / Meet with Exceptions (1) / Non Compliance (0).",
        content: [
            {
              "clause": "PPE-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-2",
              "question": "Each operation must be familiar with and ensure compliance to any local regulatory requirements related to personnel practices / personal hygiene, including policies pertaining to ensuring medical/health of employees, jewelry policies, hand washing, availability of facilities (adequate number of toilets, change rooms, canteen) designated smoking areas etc.\n1.1 Implementation of a personal hygiene policy must ensure compliance with either local regulations or TCCC requirements, the stricter of the two.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-3",
              "question": "Ensure all employees, contractors and visitors understand their responsibilities for maintaining hygiene, food safety and good health.                                                                                                                                                                  All employees must receive initial orientation/induction training outlining the operations policies related to personal hygiene. This can be included as part of a broader induction program.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-4",
              "question": "Employees should not begin work in processing areas without verification or completion of hygiene orientation/induction program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-5",
              "question": "Employees or contractors who may move between operation locations should undergo induction/orientation to the new sites policies. It should not be assumed that they are similar or be avoided to simplify process.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-6",
              "question": "All visitors and contractors who enter the site must be made aware of their responsibilities related to site personal hygiene policies. This can be done through initial orientation/induction training (e.g., use of instructional videos, pamphlets)                                                                                                                                                   Contractors must not begin work on-site until they have read and confirmed their understanding of the plant’s personal hygiene program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-7",
              "question": "Maintain records that confirm all employees, visitors, and contractors have received and understood the relevant information related to their responsibilities in following and enforcing the sites hygiene program.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-8",
              "question": "Conduct ongoing audits of the hygiene program to ensure it is being followed and effectively implemented.                                                                                                                                                                            Conduct refresher training on the operations hygiene program at an appropriate frequency based on risk or in response to reduced awareness, implementation and/or compliance to the program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-9",
              "question": "Ensure relevant parts of the hygiene policy are visibly communicated to all associates at relevant locations. Types of communications and locations include:                                                                                             Outline of site policy available at entry to the facility (e.g., at security entrance or before entry to the building)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-10",
              "question": "Handwashing instructions located at each toilet room and dressing room, and prior to entry to areas where hygiene must be maintained.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-11",
              "question": "Smoking, eating, or drinking instructions displayed in areas where permitted and applicable",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-12",
              "question": "Information at the entrance to secure processing areas (e.g., syrup room, cold room, sugar store, other sensitive processing areas). communicating that only authorized persons are permitted to enter, or that visitors/contractor should only be in areas when authorized and under supervision",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-13",
              "question": "Include requirements for hygiene and required personal protection equipment needed in the area",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-SEC-2",
              "question": "Personal Behaviors",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-15",
              "question": "Establish and implement personnel hygiene procedures that ensure the safe manufacture of quality products that meet Company and local regulatory requirements. The procedures shall at a minimum include the following",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-16",
              "question": "Identification/ Designation of areas where smoking, eating, and chewing are permitted, with a clear understanding of where it is also prohibited.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-17",
              "question": "Guidance on handling of food brought on site by employees’ (i.e., where to be stored and where to consume (in designated areas only))",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-18",
              "question": "Identification of permitted personal items, where control of such items is necessary for both the protection of the individual and other associates (e.g., Smoking materials, medicines etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-19",
              "question": "Clear identification of prohibited items (e.g., alcoholic beverages, illicit drugs/drug paraphernalia, firearms)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-20",
              "question": "Maintenance of personal lockers so that they are kept free from rubbish and soiled clothing, and are not used for the storage of product contact tools and equipment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-21",
              "question": "Policy for jewelry for all employees, visitors, and contractors\na.Jewelry and other loose objects shall not be worn or taken into a food handling or processing operation or any area where food is exposed. These create both a challenge to maintain hygiene but can also be a safety hazard (increased risk of personal injury if the jewelry gets caught by moving machinery parts or equipment).\nb.The wearing of plain bands with no stones and medical alert bracelets that cannot be removed can be permitted, however consider the customer requirements and the applicable food legislation before permitting.\nc. Rings and studs in exposed parts of the body, such as ears, noses, tongues, and eyebrows, must not be worn",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-SEC-3",
              "question": "Personal cleanliness",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-23",
              "question": "Actively observe, educate, train, and reinforce proper handwashing and hygiene procedures.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-24",
              "question": "Hands and exposed portions of the arms must be properly washed in designated handwashing stations for the following situations:\n• Before start of shift\n• When entering a processing area where ingredients, packaging intermediates or finished product are being handled, filled, or processed.\n• Before putting on gloves used in food/product contact areas\n• Between the end of one task and the start of a different one where cleaning and disinfection is required to avoid cross contamination\n• Immediately after using the restroom or performing any unsanitary tasks such as, handling trash or chemicals, touching the floor or face, sneezing, coughing, or nose blowing\n• After smoking, eating, or drinking",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-25",
              "question": "Personnel shall be required to refrain from sneezing or coughing over materials or products. Spitting (expectorating) must be prohibited.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-26",
              "question": "Fingernails shall be kept clean and trimmed. Varnish and nail polish must not be worn",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-27",
              "question": "The use of gloves to prevent risk from fingernails or varnish entering product may be permitted provided they are maintained in good condition, worn at all times, and only removed outside and away from processing areas.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-28",
              "question": "Identifying areas where basic hygiene/bathing practices need to be reinforced to prevent indirect contamination of product or processing areas.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-SEC-4",
              "question": "Workwear and Protective clothing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-30",
              "question": "A standard uniform should be provided to all production personnel.                                                                                                              The uniform should be made of material which is easily cleanable and able to withstand industrial use.  Consider the use of light-colored clothing in processing areas where it allows for the easy identification of cleanliness/condition (i.e., whether dirty or not)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-31",
              "question": "A sufficient number of changes should be provided to allow for regular laundering.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-32",
              "question": "Operators should change uniforms daily or as needed when soiled as part of performing duties.\na. Where laundry services are provided on-site, ensure location of laundry prevent contamination of processing or change areas.\nb. Where third-party laundry services are provided for uniform cleaning, ensure they are approved for use. c. Provide location for collection of dirty uniforms (to ensure they are not a source of further contamination) and a similar collection/storage location for clean distribution of uniforms.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-33",
              "question": "Personnel who work in or enter into areas where exposed products and/or materials are handled shall wear work clothing that is fit for purpose, clean and in good condition (e.g., free from rips, tears, or fraying material). The following should be considered\n• Clothing dedicated for food protection or hygiene purposes shall not be used for any other purpose (outside of the processing or work area)\n• Workwear should not have buttons to avoid them falling off and entering product\no Zips or press stud fastenings are acceptable.\n• Workwear should not have outside pockets to prevent objectives falling out and into processing equipment.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-34",
              "question": "Include requirements that prevent the wearing of items such as pins, loose badges, lanyards with IDs or other loose materials that could be a product or safety (catch) hazard.\n• Workwear shall be laundered to standards and at intervals suitable for the intended use of the garments.\n• Workwear shall provide adequate coverage to ensure that hair, perspiration, etc. cannot contaminate the product",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-35",
              "question": "Hair, beards, and moustaches covers shall be used in processing areas.\na.  Covers should ensure full restraint of hair to avoid introduction into process and to minimize safety risk\nb. For associates with long hair, ensure ties used to hold up or hold back hair are of suitable design to prevent loss or potential to enter product streams",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-36",
              "question": "Disposable gloves used in processing areas must be clean and in good condition. Remove/replace gloves when they become soiled or damaged during use, and before entering a restroom, break area or leaving the manufacturing area.  Avoid use of latex gloves where possible.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-37",
              "question": "Shoes shall be fully enclosed and made from non-absorbent materials.                                                                                        Protective steel toe shoes must be used in areas where potential for injury due to drop of objects can occur  For sensitive areas, dedicated shoes should be provided to prevent the introduction of contamination from outside of the facility.                                                                                                                                                                 Conduct a risk assessment to determine whether controls need to be established to reduce contamination from shoes (e.g., use of sticky pads or shoe sanitizing mats, use of shoe covers)                                                                        Shoes should be routinely cleaned and disinfected to maintain hygiene conditions",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-38",
              "question": "Use of face masks should be considered where risk of contamination may exist from employees and their breathing (e.g., expel of microbiological contaminants)  Masks must be worn when concern exists that associates may contaminate product. Following COVID pandemic, consider maintaining a sufficient supply of masks to be able to reintroduce mask wearing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-39",
              "question": "Personal protective equipment, where required, shall be designed to prevent product contamination Maintain all personal protection equipment in hygienic condition, free from dust and dirt, and adequately cleaned and stored for future use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-SEC-5",
              "question": "Health status",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-41",
              "question": "Subject to legal restrictions in the country of operation, employees shall undergo a medical examination prior to employment, unless documented hazard or medical assessment indicates otherwise.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-42",
              "question": "Additional medical examinations, where permitted, shall be carried out at intervals defined by the organization (ideally annually)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-43",
              "question": "Where manual bottle inspection is still performed or is required as part of backup procedures for when automatic empty bottle inspection systems are not functioning, conduct annual eyesight testing by a recognized practitioner for associates that would be assigned to manual inspection.                                                                             Confirm those required to perform manual inspection are certified as capable for these duties.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-44",
              "question": "Implement a hearing conservation program that includes the conducting of hearing tests in accordance with Hearing Conservation (OHS-RQ-165).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-SEC-6",
              "question": "Illness and injuries",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-46",
              "question": "Where permitted by law, employees shall be required to report the following conditions to management for possible exclusion from food-handling areas: jaundice, diarrhea, vomiting, fever, sore throat with fever, visibly infected skin lesions (boils, cuts, or sores) and discharges from the ear, eye, or nose",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-47",
              "question": "People known or suspected to be infected with, or carrying, a disease or illness that is transmissible through food shall be prevented from handling food, or handling materials which come into contact with food.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-48",
              "question": "In processing areas, personnel with wounds or burns shall be required to cover them with specified dressings. Any lost dressing shall be reported to supervision immediately",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPE-49",
              "question": "An area should be provided in every plant for medical services and first aid treatment.                                                                 The first aid treatment area should be provided with adequate resources to support the delivery of medical services such as a bed, chairs, and a sink with hot and cold running water.                                                                           First aid equipment should be protectively stored to maintain in optimal condition.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-control-and-destruction-checklist",
        title: "KORE QFS Internal Audit Checklist — Control and Destruction",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Control, Destruction and Disposal of Trademarked Materials and Nonconforming Products. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "CTRL-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-2",
              "question": "Develop and implement procedures for the control, record, handling, destruction and disposal of nonconforming products and trademarked materials.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-3",
              "question": "When concentrate, beverage base, juice, or other materials received from CPS are damaged, suspected of not conforming to TCCC specifications, or have expired, contact your respective CPS manufacturing plant for further instructions on disposition and disposal.\na. Ensure nonconforming CPS sourced ingredients are stored & handled in a manner that prevents their unintended use.\nb. Obtain approval and disposal procedures from CPS for the destruction of concentrate, and beverage base.\nc. Follow additional requirements provided by OUs in terms of reporting and records of disposition of nonconforming concentrate, beverage bases and juices.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-4",
              "question": "When bottler procured ingredients are suspected to be nonconforming to TCCC specifications, notify the OU for their follow-up and action with the supplier.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-5",
              "question": "Contact your OU QSE manager when:\na.Nonconforming materials were used, and finished products distributed to the marketplace.\nb. Immediately contact the OU Incident Management Team and OU QSE manager for alignment on actions and next steps. Refer to local regulation, Incident Management and Crisis Resolution (PRP-RQ-005), and applicable OU requirement.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-SEC-2",
              "question": "Control of Proprietary information present on used/empty Concentrate & Beverage Base containers",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-6",
              "question": "Ensure concentrate, beverage base or flavor merchandise containers are free from residual material/remnant before they are sent for disposal.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-7",
              "question": "Containers and their closures should be thoroughly rinsed (with treated water) as part of the mixing process to ensure full transfer of flavor materials from the container.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-8",
              "question": "Ensure containers have been adequately rinsed to minimize the amount of remnant flavor present in containers prior to disposal",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-9",
              "question": "For large bulk tanks used for Coca-Cola Part 1 and 2, ensure these are adequately rinsed before sending out for disposal.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-10",
              "question": "Prevent the identification of TCCC, and any product, hazardous waste or merchandise number on containers that are destroyed or sent to the landfill. Methods include, but are not limited to:\n• Removing labels\n• Removing the print from the existing labe",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-11",
              "question": "Operations may use paints, labels, or stickers for the covering up of proprietary information provided that this method can be proven to permanently obscure and prevent access to this information",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-SEC-3",
              "question": "Disposal of Nonconforming Products and Trademarked Materials",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-13",
              "question": "Manage disposal of trademarked materials and nonconforming products according to the requirements of TCCC and in compliance with applicable laws, and regulations. This includes laws and regulations that govern the transportation of hazardous materials and disposal of solid or hazardous waste.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-14",
              "question": "Comply with the applicable laws and regulations and KORE requirements, whichever is stricter.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-15",
              "question": "Use only government-approved sites and contractors for hazardous waste disposal and/or transportation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-16",
              "question": "For Hazardous Materials Handling and Transportation, refer to local regulation, Hazard Communication and Hazardous Material Control (OHS-RQ-191), Transportation of Dangerous Goods (OHS-RQ-193), and Waste Management (ENV-RQ-220)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-17",
              "question": "Direct questions regarding legal compliance to your OU QSE manager for further information and action (i.e., with SRA/legal)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-18",
              "question": "Where possible and when permitted by local authorities, dispose of nonconforming ingredients, and finished liquid product contents through the facility’s on-site wastewater treatment system. This provides the greatest protection of proprietary ingredients and product information.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-19",
              "question": "For finished product, all packaging components should be collected for recycling separately from liquid contents",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-20",
              "question": "Empty and collect liquid contents, other than packaged water, from product packaging for treatment/disposal.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-21",
              "question": "Non-conforming packaged water products may be emptied and disposed of directly to wastewater collection systems",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-22",
              "question": "Ensure appropriate controls are established when disposing of materials through the wastewater systems to prevent impacting wastewater process operating conditions or violating wastewater discharge permit limits. Refer to the ENV-RQ-220 requirement",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-23",
              "question": "Provide adequate storage for high strength waste streams and control methods for addition/introduction of the high strength waste streams into the main wastewater treatment system/discharge (examples: pumping/flow control, pH/ waste load monitoring, potentially separate neutralization capabilities and mixing at the point of introduction).\nThis is to prevent disruption of stabilized biological treatment processes which are sensitive to damage/shock from excessive or rapid changes in pH and/or waste load concentrations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-24",
              "question": "Concentrate and beverage bases must be segregated and blended in an appropriate leak-free container according to their characteristics (i.e., flammable, non-hazardous, corrosive). Disposal must be carried out by approved third party facilities following the requirements of this document",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-25",
              "question": "Alternative disposal processes can be carried out according to methods approved by the CPS supplier of the concentrate and beverage bases. Disposing of concentrate and beverage base through the wastewater systems is highly discouraged.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-26",
              "question": "Solid ingredients supplied by CPS must have their label information removed prior to disposal. Incineration of powdered ingredients is recommended",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-27",
              "question": "When disposal cannot be performed onsite, use only approved third party facilities.\na. The OU is responsible for the authorization of third-party facilities. The OU may delegate this responsibility to the bottling partner.\nb. The decision to delegate this responsibility to the bottling partner must be documented and records maintained confirming delegation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-28",
              "question": "Bottling partners responsible for third party disposal site authorization must ensure the following:\n• Ensure facilities have been audited and approved prior to use confirming that local regulatory requirements are being met for the destruction and disposal of materials.\n• Records of destruction are maintained in accordance with record retention policies.\n• Conduct follow up audits at regular frequencies (recommend annually) to confirm continued compliance to applicable local regulatory requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-29",
              "question": "Ensure records of disposal are maintained as proof of destruction.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-30",
              "question": "The destruction by a third-party of nonconforming finished products returned from the market as a result of a food safety hazard or regulatory action must be witnessed by Company personnel, or agents authorized by the OU. Maintain records of destruction.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-SEC-4",
              "question": "Disposal of Trademarked Materials",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-31",
              "question": "Remove trademarks from equipment sold to third parties. This includes vending equipment, coolers, immediate consumption equipment, trucks, and trailers.                                                                                                                                            Deface or destroy obsolete trademarked materials, Point of Purchase/Point of Sale materials or packaging materials to prevent their inadvertent use.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-32",
              "question": "Specific to any materials that may use metal-based pigments (e.g., plastic crates, glass bottles, etc.), ensure that appropriate disposal procedures are taken into consideration. Examples include the grinding and disposal of plastic crates where the graphic may be painted using a heavy metal pigment. Contact OU for further information and instructions for disposal and destruction.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-SEC-5",
              "question": "Disposal of Materials Containing Sensitive Information",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-33",
              "question": "Develop and implement procedures for the destruction and disposal of materials containing sensitive information, including intellectual property (i.e., Mixing Master Instructions and product records) and customer data whether in hard copy or on electronic devices such as laptops, tablets, hard disk drives, magnetic tapes, CDs, etc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-34",
              "question": "Before disposing or recycling an electronic device, completely erase all information on it and make sure the data is no longer recoverable. Old hard drives and other electronic devices that contain critical information must be physically destroyed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CTRL-35",
              "question": "Hard copies containing sensitive information must be shredded before being sent for recycling or disposal.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-records-management-checklist",
        title: "KORE QFS Internal Audit Checklist — Records Management",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Records Management. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "REC-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-2",
              "question": "Maintain records to demonstrate compliance with company, OU, and local legal requirements.\na. Define the controls needed for the identification, storage, protection, retrieval, retention, and disposition of records, including electronic data.\nEnsure records are legible, readily identifiable, and retrievable.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-3",
              "question": "For hard copy records, ensure location of storage is designed in a manner that protects them from deterioration.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-4",
              "question": "Ensure training is provided to all associates on the importance of record keeping activities, including the reasons records are required & maintained, the importance of records integrity and the value of the signature in confirming whether a task has been performed or completed (includes electronic verification).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-5",
              "question": "Follow applicable regulatory and/or OU recordkeeping requirements in order to maintain traceability of ingredients and products.                                                                                                                                                                In the absence of regulations and/or OU requirements for record retention, keep records for a minimum of five years.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-6",
              "question": "Ensure effective controls and processes are in place to mitigate risk exposure from cybersecurity threats. Report all cybersecurity breaches to the Operating Unit as part of the IMCR process",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-6",
              "question": "Maintain and report technical data based on Corporate QSE and OU-defined requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-SEC-2",
              "question": "Electronic Data",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-8",
              "question": "Ensure electronic entries are traceable to the date and person that input the data.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-9",
              "question": "Ensure supporting test data entered into workbooks is permanently available according to the retention period",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-10",
              "question": "Document any changes to data, together with the reasons for the change.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-11",
              "question": "Protect computer programs with secure passwords.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-12",
              "question": "Implement an authorization plan to alter program data.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-13",
              "question": "Do not allow the use of another person’s access control/password to perform a task. Where relevant, and where computers are used in a shared environment, ensure instructions clearly state the importance of logging out and logging in under one’s own unique password or under a shared workstation-specific password to maintain records integrity/traceability",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-14",
              "question": "Maintain a list of authorized employees responsible for a shared workstationspecific password",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-15",
              "question": "Back-up computer files at a frequency that protects against loss and facilitates ease of recovery. The recommended frequency is daily.                                                                                                                                          Maintain archived computer data in a secure, off-site location",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-16",
              "question": "Protect computer programs from unauthorized access",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-17",
              "question": "Retain documentation that pertains to the computer program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-SEC-3",
              "question": "Operational Records",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-19",
              "question": "At minimum the following operational records must be maintained and available to confirm compliance\n• Product identification.\n• Date code and any other code applied to primary and/or secondary packaging.\n• Equipment and process calibration data.\n• Equipment and process verification data (i.e., control charts, cleaning, and sanitizing records, etc.).\n• Corrective and preventative actions.\n• Quality control records.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-SEC-4",
              "question": "Laboratory Records",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-21",
              "question": "Maintain records of all quality testing performed, including those performed by suppliers (e.g., applicable Certificates of Analysis (CoAs) and annual analysis shared with the manufacturing plant). The following records must be maintained and readily available to demonstrate compliance:                                                         Laboratory equipment and process calibration data.\n• Laboratory equipment and process verification data (i.e., control charts, certification documents, etc.).\n• Corrective and preventative actions.\n• Analytical test records to include raw and final results.\n• Data changes and reason for the change.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "REC-23",
              "question": "Laboratory records must have the identification of the analyst who performed the test",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-consumer-engagement-checklist",
        title: "KORE QFS Internal Audit Checklist — Consumer Engagement",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Customer and Consumer Engagement and Response. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "CE-SEC-1",
              "question": "General",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-2",
              "question": "Each operation must provide a mechanism for consumers to contact the Company with respect to consumer complaints.\n1.1 Comply with local regulations related to consumer contact process, which includes complying with local regulations in the case of exporting or importing products.\n1.2 The following options should be used for consumer contact purposes, if required by local regulation:\n• Contact number directly located on the product package. This includes provisions for returnable packaging (e.g., glass, RefPET, etc.).\n• Information on package on how to report via the internet (e.g., e-mail, website, QR Code, etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-3",
              "question": "Develop and implement a process for monitoring, analyzing, and responding to consumer complaints and inquiries. The program must contain at minimum:\n• Trained associates competent to handle consumer/customer contacts and follow up.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-4",
              "question": "Monitor and improve customer/consumer satisfaction",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-5",
              "question": "Maintain records of customer/consumer communications when a complaint is involved.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-6",
              "question": "Handle requests, including, but not limited to, quality, environmental, safety, products, packages, ingredients, or general Company information.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-6",
              "question": "Establish continuous improvement activities",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-7",
              "question": "Initiate immediate corrective action after multiple complaints or serious incidents with escalation to the IMCR program as necessary.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-8",
              "question": "Establish an advertised phone number or online access to consumer contact centers in line with local communication resources",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-9",
              "question": "Consumer Sample Retrieval:\no Handle samples in order to protect the integrity of the sample.\no Maintain and record the chain of custody of the sample.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-10",
              "question": "All consumer complaints and inquiries must be registered, including situations where contact is not made through the communication channel intended for this purpose (i.e., social media platforms, consumer walk up to a manufacturing plant reception, etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-11",
              "question": "If a central OU consumer response system/center is in place, inform the OU when the facility is directly contacted by the consumer so that this information is captured for the purpose of traceability and trending. Examples include:\n• Telephone calls directly to manufacturing plant/plant reception.\n• Emails received by employees with product complaints being made by customers or business partners.\n• Consumers who go to the manufacturing plant to complain about products.\n• Letters sent directly to the manufacturing plant.\n• Social media.\n• Other situations that do not follow the normal workflow of consumer complaints",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-SEC-2",
              "question": "Customer Engagement and Response",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-12",
              "question": "Develop and implement a process for monitoring, analyzing, and handling customer contacts. This may be included as part of the consumer response program or managed as a separated program. The program must contain at minimum:\n• Trained associate/personnel competent in handling customer contacts.\n• A mechanism to track customer contacts.\n• Analysis of data from contacts received.\n• Records of customer follow-up communications.\n• Immediate corrective action after multiple complaints or serious incidents with escalation to the Incident Management process as necessary.\n• Individual customer specifications for quality management aspects (i.e., frequency of mock-up traceability exercises, time expectancy for product traceability, recall procedures, etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-13",
              "question": "Creation of annual improvement goals based on prior-year results or multi-year trends",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-14",
              "question": "Follow the OU-defined protocol to manage customer complaints, including product recovery actions initiated by IMCR",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-15",
              "question": "Do not authorize customer audits of manufacturing facilities and/or distribution centers without specific review and approval from the OU.\na. Notify the OU if a customer requests an audit.\nb. Do not provide information (e.g., audit, findings, corrective action plans) to the customer without OU and legal approval.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-SEC-3",
              "question": "Responding to Customer and Consumer Complaints",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-17",
              "question": "Investigations must be conducted for all the following complaint types, irrespective of whether a trend or severity:\n• Injury complaints.\n• Illness or sickness complaints.\n• Primary package does not match secondary packaging.\n• Incorrect information on labels or labels does not match the product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-18",
              "question": "Each operation must conduct an investigation when a repeated negative trend is identified in consumer complaints.                                                                                                                                                                                                           A negative trend is where three or more quality contacts with same product and package, same production date code, same issue (i.e., off-taste, foreign matter, no carbonation, etc.), from the same or different customers or consumers.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-SEC-4",
              "question": "Continuous Improvement in Customer and Consumer Satisfaction",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CE-20",
              "question": "consumer/customer satisfaction. The program should include the following:\n• Monitoring of consumer complaint rate at the manufacturing plant and ownership levels.\n• Establishment of annual improvement goals.\n• Annual plans for customer and consumer complaint reduction.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-retention-samples-checklist",
        title: "KORE QFS Internal Audit Checklist — Retention Samples",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Retention Samples. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "RET-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-2",
              "question": "Collect, store, and retain samples for the purposes of traceability and when needed for further follow-up and investigation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-3",
              "question": "Provide suitable storage location for retention samples. The storage area should have the following conditions:\n• Temperature controlled at ambient, or at the specific conditions described on the label, MMI and/or specification, whichever is stricter. Note: For ambient temperature, follow 11°C-30 °C (51.8°F-86°F) or, if applicable, the local authority’s standard, whichever is stricter\n• No exposure to UV or direct sunlight\n• Dry and free of odor\n• Secure access controlled\n",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-4",
              "question": "Follow local regulations regarding retention samples where applicable and stricter than requirements in this document.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-5",
              "question": "Ensure storage conditions allow for easy identification and retrieval of samples (e.g., unique sample identification numbers, labelled rack locations or storage bins arranged by date/time of production)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-6",
              "question": "Ensure there is enough space and adequate lighting to perform visual inspection of samples, where required.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-6",
              "question": "Visual inspections for monitoring or release purposes must be performed in a place intended for this purpose (i.e., sensory room).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-7",
              "question": "Ensure samples have tamper-evident seals or are stored in a locked room with controlled access",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-8",
              "question": "Maintain records that demonstrate when a sample has been opened or removed from retention storage, by whom and the reasons why.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-9",
              "question": "Retain samples of direct bottler purchased ingredients and packaging (excluding gases). Note: Samples of the above ingredients and materials may be retained by suppliers as an alternative to collecting and retaining a sample at every facility. In this instance, manufacturing plants must ensure that suppliers are retaining samples of each lot. In addition, the conducting of traceability exercises must include the verification of the ability to perform traceability against these materials as needed.\n",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-10",
              "question": "Do not use proprietary primary packaging (product bottles) for the storage of retention samples (e.g., for granular sugar, auxiliary materials, finished syrup etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-11",
              "question": "Appropriately dispose of samples once they have reached the defined retention period.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-12",
              "question": "Follow Operating Unit recommendation for an increase in sampling plan or retention periods.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-SEC-2",
              "question": "Ingredient and Package Retention samples",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-14",
              "question": "Retain samples of bottler procured ingredients (excluding gases).  Do not collect retention samples for Company-sourced ingredients (e.g., concentrates, beverage bases etc.) and gases (e.g., carbon dioxide). Retention samples are not required for ingredients pre-released by Ingredient Quality Department (IQD)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-15",
              "question": "Retain for each lot of ingredients received, enough samples to perform three full release analyses. Determine retention period for ingredients that ensures traceability can be performed throughout the shelf life of the final product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-16",
              "question": "Primary packaging retention samples are not required based on the samples taken of finished products.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-SEC-3",
              "question": "Activated Carbon",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-18",
              "question": "Sample at least 500 grams of activated carbon used for water treatment and sugar treatment during replacement and keep it until the next replacement.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-SEC-4",
              "question": "Intermediate Product Retention samples (e.g., quasi-syrup, simple and final syrups)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-20",
              "question": "Follow Operating Unit (OU) requirements for intermediate product retention samples. Where required, include the following:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-21",
              "question": "Retain sufficient sample to be able to perform testing in triplicate (e.g., 250 mL) based on the sampling plan.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-22",
              "question": "Retention samples must be kept for the shelf-life of the intermediate product, in accordance with the MMI/specification storage condition.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-23",
              "question": "Collect retention samples using a container with single-use and odor-free closure. Containers made of glass or materials that do not absorb aromas, flavors or colors can be used as an alternative if the plant demonstrates an efficient cleaning procedure after use to prevent possible cross-contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-SEC-5",
              "question": "Finished Product Retention samples",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-25",
              "question": "Collect at least three finished product samples with the original package of each production run and/or finished syrup batch used during production. This ensures that there are samples available to perform triplicate full release analyses",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-26",
              "question": "The samples must be representative, being taken 1 at beginning, 1 in the middle, and 1 at end of the production run and/or finished syrup batch used during production.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-27",
              "question": "As an alternative, for packages larger than 2 liters, a product sample can be taken in sufficient quantity for analysis in triplicate.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-28",
              "question": "Ensure sampling from larger containers is performed under controlled conditions in order to maintain the final product integrity",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-29",
              "question": "Store finished product retention samples in conditions equivalent to the storage conditions identified on the label, MMI and/or specification, whichever is stricter (i.e., ambient/ refrigerated/ hot)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-30",
              "question": "Keep finished product retention samples for, at least, shelf-life or best before (depending on the market) plus 1 month.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "RET-31",
              "question": "If shelf-life is 12 months, then retain samples for a minimum of 13 months",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-haccp-checklist",
        title: "KORE QFS Internal Audit Checklist — HACCP",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Hazard Analysis and Critical Control Points (HACCP). Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "HACCP-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-2",
              "question": "The manufacturing plant must comply with the certification and compliance requirements established in the General Operating Requirements (PRP-RQ-101)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-3",
              "question": "Implement the HACCP system according to the 5 preliminary steps and 7 HACCP\nPrinciples in ISO 22000 FSMS:                                                                                                                                                                                      Note: Five Preliminary Steps:\n• Step 1: Assemble HACCP team\n• Step 2: Describe product\n• Step 3: Identify intended use\n• Step 4: Construct flow chart\n• Step 5: Verify flow diagram on-site\nNote: Seven HACCP Principles\n• Principle 1: Conduct a hazard analysis.\n• Principle 2: Determine the critical control points (CCPs).\n• Principle 3: Establish critical limits.\n• Principle 4: Establish monitoring procedures.\n• Principle 5: Establish corrective actions.\n• Principle 6: Establish verification procedures.\n• Principle 7: Establish record-keeping and documentation procedures.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-4",
              "question": "Implement, manage, and control prerequisite programs as defined in ISO/TS 22002 (External) and supplemental KORE requirements, and local regulation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-5",
              "question": "All prerequisite programs must be documented and regularly audited, being managed separately from the HACCP plan.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-6",
              "question": "Use prerequisites programs, historical data, and deviations as inputs to the HACCP plan",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-U1",
              "question": "Establish the facility’s performance goals for food safety and verify that they meet the\nrequirements of the facility’s management system.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-SEC-2",
              "question": "HACCP/Food Safety Team",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-7",
              "question": "Build a multidisciplinary HACCP/food safety team made up of people with different specific knowledge and training. Team members must be able to identify and assess food safety hazards, develop, and implement suitable control measures and investigate and report nonconformances.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-8",
              "question": "Designate a HACCP/Food Safety team leader  and a team co-leader for the facility.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-9",
              "question": "Train HACCP team members in the five preliminary steps and the seven principles of HACCP.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-SEC-3",
              "question": "HACCP Validation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-11",
              "question": "Validate the HACCP program to ensure hazards are under control before implementation of the program, following changes to process, product, or other activity affecting the hazard analysis or program, or minimum annually.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-12",
              "question": "Records, scientific/regulatory information, and linkage between the HACCP plan and prerequisite programs, as well as internal audits and tests results must be considered as review activities in the validation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-13",
              "question": "Before implementing control measures, validate the capability and effectiveness of the control measures to ensure control of the identified food safety hazard(s).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-14",
              "question": "After implementing control measures, confirm the capability and/or effectiveness of the control measures; modify and reassess as needed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-SEC-4",
              "question": "HACCP Verification",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-16",
              "question": "Review the HACCP program, at minimum, once per year and/or when:\n• processes or products change\n• an incident occurs\n• a food safety near miss is identified as part of an opportunity to improve the\nprocess.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-17",
              "question": "All food safety incidents require comprehensive review, corrective action, and revalidation of the HACCP plan",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-U2",
              "question": "Monitor the food safety system to identify potential food safety near misses and improvement opportunities. Track food safety near misses to understand the potential for a food safety incident.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-18",
              "question": "Update the HACCP plan based on learnings (including near misses) to ensure that the risk assessment, controls, and monitoring activities are still applicable and adequately control the risk.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-19",
              "question": "Record and analyze the results as part of management system routines.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-SEC-5",
              "question": "Training",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-26",
              "question": "Train associates in food safety concepts and prerequisite programs",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-27",
              "question": "Specific training must be developed for employees responsible for monitoring, verifying, and/or validating Critical Control Points (CCPs) or Operational Prerequisite Programs (OPRPs). Train these employees when there are changes related to the HACCP",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-U3",
              "question": "The effectiveness of training must be evaluated, and actions taken when needed",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "HACCP-28",
              "question": "Additional training and certifications must be provided to individuals in accordance with local legislation (e.gGMP, internal auditor certification etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-labeling-coding-and-traceability-checklist",
        title: "KORE QFS Internal Audit Checklist — Labeling, Coding, and Traceability",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Labeling, Coding, and Traceability. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "LCT-SEC-1",
              "question": "Labelling",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-2",
              "question": "All labels must be stored in a controlled area to prevent unauthorized use. Storage conditions (e.g., temperature, humidity, etc.) should be in accordance with supplier recommendations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-3",
              "question": "Develop and implement programs for product labelling. The program must contain, at a minimum:\n• Ensuring all labels used by the manufacturing plant are approved for use by the Operating Unit for the specific product/package configuration.\n• Outline the process for verification of all labels at start-up and during production (i.e., correct label goes on the right package, information is legible). Includes actions to be taken at product changeover\n• Process for storing and allocation of labels that prevents mixing of different product labels, or campaigns within the same product type.\n• Method for identification of label status (e.g., approved/rejected) including process for the segregation of non-conforming material together with process to identify and store these materials that prevent their use.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-4",
              "question": "Employees must be trained and understand the importance of correct receipt, storage, inspection, and disposition of the labels.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-5",
              "question": "When barcode scanners or vision systems are available, challenge tests must be performed and recorded for each production.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-6",
              "question": "Barcode scanners and vision systems must be validated for each product and before every time a new label is used for the first time",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-6",
              "question": "Implement and maintain a preventive maintenance and calibration program based on the manufacturer’s requirement.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-SEC-2",
              "question": "Relabelling",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-8",
              "question": "Process of changing an existing label on a product without repacking the product. Notify OU and obtain approval when relabeling product.                                                                                                                                                    Re-labeled products must be within their shelf-life and durability period.                                                          Document and maintain records of a business justification to relabel.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-9",
              "question": "Over-labeling (applying a label over another label, without repacking the product) is not permitted",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-10",
              "question": "Ensure two-way traceability and the original date of manufacturing is maintained for relabeled product",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-11",
              "question": "Identify and address the root cause to eliminate the need for relabeling.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-SEC-3",
              "question": "Coding",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-13",
              "question": "All products are required to be labeled with either a date code or durability* code that allows for both the effective traceability of products and for the consumer to identify optimum shelf-life* for beverage consumption.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-14",
              "question": "Develop and implement procedures for the coding of finished products. This should include but not be limited to the following:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-15",
              "question": "Coding requirements must comply with both Operation Unit and regulatory requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-16",
              "question": "Primary container coding must be legible and comply with coding requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-17",
              "question": "For all products including repackaged and reconfigured products, calculate coding from the original date of packaging/filling",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-18",
              "question": "Secondary packaging must also be coded when the date code on the primary packaging is not visible (e.g. cardboard carton, fridgepacks etc).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-19",
              "question": "Shrink film or other similar secondary packaging materials used to hold together individual units of product does not need to be coded as long as it can be demonstrated that the date code remains visible on primary packaging. Any obstruction to the visibility of the date code on the primary package will require the secondary packaging to be coded.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-20",
              "question": "When repackaged product contains multiple primary package date codes, then ensure the code on any secondary packaging (that is required to be coded) uses the earliest production date or the shortest durability period",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-21",
              "question": "Confirmation that imported and exported products have product codes that meet applicable regulations in country of sale.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-22",
              "question": "Codes that enable product rotation and traceability, and When using durability labeling, the use of “Best Before,” or similar text as part of the code.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-23",
              "question": "Codes must include at a minimum:                                                                                                                                                            The ability to identify the manufacturing plant/line that produced the product                                             Production date, durability period, or best before date (BBD).\nThe production time or sequence number.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-24",
              "question": "All coding elements must be completely readable. If one of the coding elements are not readable, stop the line and do not proceed with production.                                                                                                                           Codes must be readable during the entire product shelf life.                                                                                                          The date code must be applied in such a manner as not to cover any of the Trademarks, ingredient declarations or address details printed on the closure, label, or secondary packaging.                                               The date code must be applied in such a manner as to be easily readable by customers and consumers",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-25",
              "question": "Implement and maintain a process to ensure product codes are correct at start-up and maintained during the entire run and following process deviations such as line breakdown, intervention on coding equipment, packaging change, etc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-26",
              "question": "Implement and maintain a preventive maintenance program for coding equipment based on the manufacturer’s requirement.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-SEC-4",
              "question": "Traceability",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-28",
              "question": "Develop and maintain a traceability system that ensures: Products failing to meet required quality and food safety standards can be identified, located, and removed from all necessary points of the supply chain.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-29",
              "question": "Each location (manufacturing plant, warehouses, distribution centers, authorized suppliers) has the ability to identify and locate 100% of stock within 24 hours (or less where required to meet customer requirements) and can demonstrate two-way traceability (backward and forward) in the supply chain.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-30",
              "question": "Identification of product lots/batches and their relation to lots/batches of incoming materials (i.e., ingredients, packaging, processing aids, auxiliary materials in contact with product).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-31",
              "question": "Chaining batches must be recorded during the process to ensure traceability.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-32",
              "question": "Chaining batches is when one batch of syrup, carbon dioxide, juice, liquid milk, or beverage is added to another continuously without completely draining the tank and creating a clear break between lots/batches.\n13.4.1 Records must include at minimum:\n• Date and time of chaining batches processes.\n• Lots/batches involved in the chaining batches and their analysis data.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-33",
              "question": "Linkage of production lots/batches to processing and delivery records through distribution.\n13.5.1 Traceability records containing the product lot/batches, when full pallets are opened for picking or portions smaller than one pallet are distributed",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-34",
              "question": "Traceability records retained according to the applicable local regulations and the shelf-life of the finished product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-35",
              "question": "Record both the lot and sequence number for concentrate and beverage base containers for traceability purposes",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-SEC-5",
              "question": "Mock Traceability Exercise",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-37",
              "question": "Conduct mock traceability exercise twice per year for effectiveness and continuous improvement. The lot chosen for traceability exercise must have part of the lot already delivered to market to verify the manufacturing plant capability to trace one-step-forward.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-38",
              "question": "If Global Audit Organization (GAO) challenges the traceability system in a given year, this may be used as one of these assessments.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-39",
              "question": "The mock traceability exercise must contain backward and forward product traceability",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-40",
              "question": "Backward traceability must demonstrate available of information related to each lot or batch of incoming material used (including ingredients, packaging, processing aids, auxiliary materials in contact with product), process information and results.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-41",
              "question": "Backward traceability must allow for 100% traceability of incoming materials used during production (ingredients, packaging, processing aids, auxiliary materials in contact with product). Includes information such as COAs and COCs, receipt and release testing checks)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-42",
              "question": "Forward traceability must be conducted at least one step up (e.g., distribution centers or point of sale in case of direct supply).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-43",
              "question": "A rationale containing the stock dates and quantities used for forward traceability must be developed in cases where more than 100% products were traced",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "LCT-44",
              "question": "If the mock traceability exercise identifies exceptions to expected compliance, implement corrective actions, and repeat the exercise to verify the effectiveness of the actions taken.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-incoming-receipt-and-handling-checklist",
        title: "KORE QFS Internal Audit Checklist — Incoming Receipt and Handling",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Incoming Receipt, Storage and Handling of Ingredients and Packaging Materials. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "IRH-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-2",
              "question": "Purchase approved ingredients from an authorized supplier facility. All ingredients must meet Company specifications for their intended end use.\n1.1 Operating Unit (OU) are responsible for providing manufacturing plants with an updated list of approved suppliers and their approved manufacturing/sourcing locations.\n1.1.1 Purchase ingredients only from approved suppliers and their authorized manufacturing locations.\n1.1.2 When unable to source ingredients from the approved supplier list or location, contact the operating unit for alternative options.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-3",
              "question": "Develop and implement an incoming ingredient program that should include but not be limited to the following:\n• Process for receiving of incoming ingredients.\n• Verification of transportation condition of ingredients (i.e., product temperature, confirm no potential sources of or exposure to materials that may cause cross-contamination, time of transportation from supply point to manufacturing plant, vehicle condition).\n• Testing to be performed following receipt.\n• Condition of storage and handling.\n• Method for identification of ingredient status (e.g., approved/rejected).\n• Process for the segregation of non-conforming material together with process to identify and store these materials that prevents their use.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-4",
              "question": "Do not receive expired ingredients. Isolate all affected packages and contact supplier for further guidance",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-5",
              "question": "Ensure incoming ingredients and primary packages are protected by unbroken, unique and/or supplier identifiable tamper-evidents",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-6",
              "question": "Where feasible, vehicles used for transportation of materials should be sealed using a unique, identifiable tamper evident seal to protect against unauthorized access to materials during transit.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-6",
              "question": "Tankers used for transportation of bulk ingredients (e.g., water, juice, HFCS, gases) must have tamper evident seals present on all tank entry and discharge points. Verify and record seal numbers on receipt.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-7",
              "question": "Unique supplier identifiable tamper evident devices must be present on all ingredient containers and primary packing.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-8",
              "question": "Perform ingredient release testing in accordance with KORE requirements. Do not sample or analyze incoming concentrate or beverage base ingredients unless requested by CPS or the OU",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-9",
              "question": "Operating Units may approve variance to testing requirements based on detailed risk assessment and historical risk profile.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-10",
              "question": "Maintain documentation to confirm that ingredients meet specifications prior to their use in production",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-11",
              "question": "Monitor ingredient quality performance and implement corrective actions when negative trends are observed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-12",
              "question": "Ensure each batch/lot of ingredients are received with a Certificates of Analysis (CoAs) or Certificates of Conformance (CoCs) that demonstrate compliance with KORE requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-13",
              "question": "The certificate must contain at minimum the following information:\n• Name of the ingredient\n• Manufacturer's name\n• Manufacturer’s plant location\n• Manufacturer's batch number\n• Date of manufacture\n• Date of expiry or period of shelf-life\n• Signature of person issuing the certificate (electronic signatures are acceptable)\n• Position or role of person issuing the certificate",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-14",
              "question": "Before using Company-sourced ingredients (e.g., concentrates, beverage bases, juices etc.) ensure they are released by the proper authority (i.e., Ingredient Quality Department (IQD), Juice Quality Lab (JQL), Commercial Product Supply (CPS), Global Brewed Beverages (GBB), or Operation Unit Quality Department)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-15",
              "question": "If there is not a release process in place, refer to the OU for the release criteria for the ingredient.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-16",
              "question": "Third-party laboratories do not have the authority to release ingredients.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-17",
              "question": "Retain samples of direct bottler purchased ingredients (excluding gases). Refer to Retention Samples (QFS-RQ-050) requirement.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-18",
              "question": "Do not collect retention samples for Company-sourced ingredients (e.g., concentrates, beverage bases, juices etc.) and gases (e.g., carbon dioxide).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-19",
              "question": "Provide adequate location and space for the storage of ingredient retention samples. Store retention samples in a cool and dry location protected from direct sunlight.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-2",
              "question": "Receiving Ingredients – Conditions of transportation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-21",
              "question": "Where ingredient samples are collected based on local regulatory requirements by a regulatory official, or by an approved third-party, during shipment, manufacturing, or storage, notify the OU of the actions taken and ensure the following:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-22",
              "question": "Sampling must be witnessed and documented by a bottling operation associate, Company representative, or an authorized representative of the operation (when performed in transit to an operation).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-23",
              "question": "Ensure sampling does not adversely impact the quality and integrity of the product (i.e., done under suitable conditions to prevent contamination). On receipt, place the ingredient “on hold” pending either regulatory results or OU approval.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-24",
              "question": "If there is a concern related to the integrity of ingredients as a result of sampling by either a regulatory authority or other third-party, isolate the shipment/material and contact the OU for further disposition.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-25",
              "question": "Apply new tamper-evident seals after sampling. Record the number of the tamper evident seal on the supporting documentation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-26",
              "question": "Sampling of either concentrate or beverage bases should be avoided. However, if sampling is conducted, contact CPS for information and further disposition",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-27",
              "question": "Prior to unloading and receipt of ingredients, ensure that the conditions of transportation were suitable and did not have a direct impact on ingredient quality. The following checks of shipping conditions should include but not be limited to the following:\n• Verification that product was shipped at temperatures in accordance with supplier and/or OU recommendations.\n• Review of transportation vehicle to determine whether ingredients have been protected from cross-contamination (i.e., infestations, off-odors, rain, sunlight, humidity).\n• Confirm conditions of pallets used to transport ingredients. Refer to the Good Manufacturing Practices Facility Design (PRP-RQ-010).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-3",
              "question": "Storing and Handling Ingredients",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-29",
              "question": "Store and handle ingredients in suitably designed storage areas and in a manner that prevents contamination or unauthorized access.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-30",
              "question": "Store ingredients in clean, well-ventilated spaces protected from dust, condensation, fumes, odors, or other sources of contamination (i.e., dirt, pests, and birds)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-31",
              "question": "Protect ingredients from the elements (weather) including rain, direct sunlight or freezing (where applicable).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-32",
              "question": "Do not store ingredients in areas where there may be a strong odor (e.g., chemical storage rooms, diesel storage, freshly painted walls, or new epoxy floors).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-33",
              "question": "Maintain storage buildings in good repair. Drains and other access points (e.g., under doors, around windows), should be designed to prevent the ingress of dust and vermin.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-34",
              "question": "Do not store boxed or bagged ingredients directly on the floor to protect from crosscontamination (e.g. store on pallets or shelving systems)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-35",
              "question": "Design and implement cleaning programs to maintain sanitary conditions of storage. Establish a cleaning frequency for the removal of webbing or other high cleaning that minimizes the risk of contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-36",
              "question": "Maintain suitable space in storage area along walls (approx. 45cm or 18 inches) to allow ease of cleaning and access to perform pest control activities.  Where the facility design has not allowed for suitable space for ease of access (i.e., fixed racking systems located directly up against external walls), ensure inspection routines and frequency of cleaning is increased to maintain suitable conditions.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-37",
              "question": "Follow ISBT industry standards for maintenance and cleaning of carbon dioxide tanks. The activities must be conducted or supervised by a commercial supplier or qualified engineer, if required. Refer to ISBT CO2 Operational Practices Bulk Receivers and Pressure Building Vaporizers (external).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-38",
              "question": "Ensure storage areas are designed to prevent unauthorized access to ingredients, bulk storage tanks and packaging materials",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-39",
              "question": "Conduct risk assessment to confirm types of security to be installed to prevent unauthorized access.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-40",
              "question": "Ensure separate, secured (locked or otherwise access controlled) storage for cleaning materials, chemicals, or other hazardous substances.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-41",
              "question": "Store ingredients in accordance with the storage conditions established by the supplier (i.e., temperature and humidity).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-42",
              "question": "Variation to ingredient storage conditions must be authorized by the OU following risk assessment.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-43",
              "question": "When staging ingredients, ensure that the area used is suitably designed to maintain ingredient integrity. If ingredients have been staged for a considerable time prior to use, consider returning to storage areas to prevent contamination during cleaning.                                                                                                                                              Do not store remnant materials in staging areas unless they will be used in production within an appropriate timeframe. Remove from staging areas when wet cleaning is being performed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-44",
              "question": "Store concentrates and beverage bases as identified on the label.                                                                                Do not store ambient beverage bases in the cold room or in areas of the manufacturing plant where the temperature may fall below ambient storage conditions (less than 11°C) to prevent the potential for crystallization.                                                                                                                                                                                           The decision to store ambient beverage bases in cold room should be approved by CPS.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-45",
              "question": "Only accept incoming allergenic ingredients with labeling, or additional information that highlights the allergen.  Ensure personnel are aware of the receiving of allergenic ingredients and how to appropriately handle and store. For more information refer to QFS-RQ-760 Food Allergen Management and Control requirement.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-46",
              "question": "Implement and maintain First Expired First Out (FEFO) processes to ensure product turnover in the warehouse.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-47",
              "question": "For ingredient remnants (i.e., packages that have been opened and there is left over material for use in future batches), ensure the original container is re-sealed using an identifiable seal",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-48",
              "question": "If the original package is no longer useable, ensure ingredients are transferred to a suitable alternative container (bag or box), and use identifiable tamper evident seals or tape to reseal the package.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-49",
              "question": "Do not re-use previous supplier seals that should have been broken on opening",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-50",
              "question": "When ingredients or primary packaging are to be stored off-site from a manufacturing location, ensure all requirements in this document have been met and effectively implemented.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-51",
              "question": "Use of an off-site location or third-party warehouse must be reviewed and authorized either by the Operating Unit (OU) or by the bottling manufacturing plant/partner.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-52",
              "question": "When off-site storage is outsourced to a third party, ensure required procedures and controls are in place to protect and prevent ingredients from contamination or unauthorized use.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-53",
              "question": "Conduct regular inspections/audits of off-site locations to confirm maintaining of requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-54",
              "question": "Design and implement process to identify and control ingredient disposition when managing between on-site and off-site locations.                                                                                                                                                                 Include records of movement between locations.                                                                                                                                 Ensure chain of custody between on-site & off-site locations at all times.                                                                                   Ensure ingredient damage/spills/losses are immediately reported for appropriate disposition and action.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-55",
              "question": "Develop a plan for when storage conditions cannot be maintained due to equipment failure. For example, when cold room is unable to maintain storage temperatures.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-56",
              "question": "If an event does occur when cold storage has failed to maintain required temperature of storage, identify the length of time that storage conditions have been exceeded and at what temperatures. Contact OU (or CPS for concentrate & beverage bases) for further review of actions to be taken to ensure that integrity of ingredients have been maintained.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-4",
              "question": "Nutritive Sweeteners (e.g., Granular Sucrose)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-58",
              "question": "Purchase nutritive sweeteners in accordance with Company specifications. When granular sucrose does not meet Company specifications, use a Company approved in-plant nutritive sweetener treatment process to treat prior to use in final product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-59",
              "question": "The decision to purchase and treat nutritive sweeteners that are outside of quality specifications must be approved by the Operating Unit. This includes the approval of both the type of sweetener and the treatment system to be used",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-60",
              "question": "In-plant treatment processes are unique and designed to treat nutritive sweeteners within specific specification ranges. Ensure that all purchased nutritive sweeteners are aligned with the type of in-plant treatment to be used.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-61",
              "question": "Ensure that final treated simple syrup sweeteners consistently meet Company specifications",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-62",
              "question": "Perform sensory training and evaluation based on Methods outlined in accordance with Nutritive Sweetener Sensory Evaluation (SM-PR-420).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-5",
              "question": "Carbon Dioxide",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-64",
              "question": "Use safety measures and correct Personal Protective Equipment (PPE) when handling liquid carbon dioxide. This includes the safe coupling of bulk transportation tankers to onsite storage tanks",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-65",
              "question": "Verify that Material Safety Data Sheets (MSDSs) are available, current, and being followed",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-66",
              "question": "Verify tanker deliveries of carbon dioxide from the supplier manufacturing plant/depot to the bottling plant, ensuring no intervening deliveries are made to other parties unless validated and approved by the OU.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-67",
              "question": "Ensure traceability of carbon dioxide batches received when mixing different batches in the storage tank is possible",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-68",
              "question": "Confirm presence of supplier identifiable tamper evident seals on all access and discharge points.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-69",
              "question": "Use a Company approved barrier system for the filtering of carbon dioxide (e.g., Parker Domnick Hunter PCO2 filter or Micropure). Ensure that all carbon dioxide used in the manufacturing of products passes through the barrier as defined by the original equipment manufacturer (OEM).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-70",
              "question": "Follow the barrier system manufacturer’s recommendation for carbon dioxide barrier replacement frequency (all component filters and cartridges).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-71",
              "question": "Installation of the barriers must follow the OEM requirement (i.e., design, operation conditions, etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-72",
              "question": "Implement a monitoring and maintenance program in line with the OEM’s recommendations to ensure the effectiveness of the barrier system",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-73",
              "question": "Ensure no contamination occurs, including oil contamination from vaporizers",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-74",
              "question": "Perform sensory testing in accordance with Snow Test (SM-PR-130) and Sensory Evaluation of Carbon Dioxide in Water (SM-PR-135)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-6",
              "question": "Juice (Receipt",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-76",
              "question": "Check and record the following for every shipment of ingredients whether container or bulk:\n• Integrity of the seals for tamper evidence\n• Condition of the containers (signs of physical abuse)\n• Evidence of leakage\n• Identification of the ingredient and correctness of the delivery in relation to the order\n• Delivery documents on quantities and batch numbers as per order\n• Label condition and correctness\n• Temperature at receipt; ensure this transportation temperature corresponds with the label or MMI",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-7",
              "question": "Juice Storage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-78",
              "question": "Store ingredients according to the conditions described on the labels of the containers or the MMI. When the MMI contradicts the label, use the coldest storage condition.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-79",
              "question": "Monitor and record the storage conditions of ingredients where required (i.e., frozen or refrigerated).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-80",
              "question": "Implement FEFO (First to Expire First Out) rotation procedures for juice ingredients. Maintain records of deliveries and expiration dates for juice ingredients and update these when generating remnants",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-81",
              "question": "Strictly control tracking and traceability.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-82",
              "question": "Handle each bulk container as an integral unit. When splitting bulk loads into different storage tanks, maintain traceability. Bulk Storage Time & Conditions Orange concentrate (65°Brix) Max. 10 days from day of truck unloading with 5°C max",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-8",
              "question": "Dry Ingredients",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-84",
              "question": "Before opening of any closed container, they must be conditioned by minimum 24 hours at room temperature (same temperature as in sampling/dispensing/ repackaging area). If the product is colder, a condensation of air humidity on the cold product will occur, which may have severe impact on product quality.\n34.1 Conditions at opening: maximum 30°C.\n34.2 Avoid exposure to temperatures below 0°C.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-9",
              "question": "Auxiliary Materials and Processing Aids",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-86",
              "question": "Do not receive an auxiliary material or processing aid that has visual evidence of tampering or container damage that would affect its quality and integrity",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-87",
              "question": "Store auxiliary materials and processing aids in accordance with the storage conditions established by the supplier (e.g., temperature and humidity) to avoid potential contamination and quality issues",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-88",
              "question": "Use safety measures when receiving and handling auxiliary materials and processing aids according to supplier specification.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-89",
              "question": "Ensure correct use of required Personal Protective Equipment (PPEs) when handling",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-90",
              "question": "Ensure that Material Safety Data Sheets (MSDSs) are available, current, and being followed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-91",
              "question": "Only use auxiliary materials and processing aids approved for use in food industries (i.e., NSF ID, FDA approval, EFSA, local registration, Japan Water Works approval, etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-92",
              "question": "When applicable, ensure that the material is registered correctly according to local regulations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-93",
              "question": "Confirm auxiliary materials and processing aids meet Company or local specifications, the stricter of the two.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-94",
              "question": "Follow the supplier’s recommendations for material replacement timeline or efficiency test. The recommendations may include additional analysis.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-10",
              "question": "Primary Packaging (excluding previously used refillable packaging)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-96",
              "question": "Develop and implement programs for incoming package receipt, inspection, and disposal. Programs must include at minimum:\n• Visually inspect packaging materials upon receipt for damage, contamination, and to confirm tamper evidence remained in place during shipment.\n• Ensure conditions of transportation of primary packages have been met.\n• Do not expose packages to direct sunlight.\n• Confirm no potential sources of or exposure to materials that may cause crosscontamination, or defect e.g., sunlight exposure.\n• Condition of storage and handling.\n• Method for identification of ingredient status (e.g., approved/rejected).\n• Process for the segregation of non-conforming material; the process must include identification and storage of these materials to prevent their use.\n• Packages must be clean and undamaged during transport to the filler or production line.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-97",
              "question": "Develop and implement test and release procedures, as well as storage and handling procedures",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-98",
              "question": "Storage and handling procedures must be implemented based on suppliers and Company requirements. (i.e., temperature).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-99",
              "question": "Implement a packaging handling procedure in case of empty bottle leftovers on the production line after stoppage in order to mitigate potential risks of cross contamination",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-100",
              "question": "The primary packaging must comply with the Company’s specification",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-101",
              "question": "Maintain documentation to confirm that primary packages meet specifications prior to their use in production.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-102",
              "question": "Release packaging materials either by sampling, inspection, and testing, or by the packaging supplier’s certificates of analysis (COAs) or certificates of conformance (COCs).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-103",
              "question": "Monitor primary packages quality performance and implement corrective actions when negative trends are observed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-SEC-11",
              "question": "Primary Packaging (previously used refillable packaging)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-104",
              "question": "Previously used refillable packaging refers to packaging materials that were previously received, inspected, filled, and distributed to the market. .",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "IRH-105",
              "question": "Develop and implement programs for incoming package receipt, inspection, and disposal. Refer to Package Handling and Preparation (QFS-RQ-200)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-package-handling-and-preparation-checklist",
        title: "KORE QFS Internal Audit Checklist — Package Handling and Preparation",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Package Handling and Preparation. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "PHP-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-2",
              "question": "Implement processes, equipment, and controls to ensure all packaging (including selfmanufactured) meet applicable regulations and Company specifications.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-3",
              "question": "Use proprietary packages for Company products only. Do not use proprietary packaging for purposes other than storing Company products (e.g., for storage of oil, cleaning, and sanitation solutions, etc.) or retention samples (e.g., sugar, finished syrup, etc.).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-4",
              "question": "Obtain Operation Unit (OU) approval for new refillable packaging operations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-5",
              "question": "Only produce products according to their specific packaging as approved by the OU, R&D and SRA.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-6",
              "question": "The specific attributes of each approved package for each product must be followed, such as weight, color, labeling, size specifications, etc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-6",
              "question": "Do not leave containers on conveyors during prolonged breakdowns, maintenance activities, or after the completion of a production run",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-7",
              "question": "Conduct a risk assessment and document the maximum time containers can remain on conveyors during stoppages before removing them",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-8",
              "question": "Do not expose packages to direct sunlight to avoid quality deviations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-2",
              "question": "Refillable Packages General Refillable Packages Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-10",
              "question": "Develop and implement programs for incoming receipt, inspection, and segregation of new and existing refillable glass/PET. Programs must include at minimum:\n• Visual inspection of packaging materials upon receipt for damage and/or contamination, during shipment.\n• Condition of storage and handling.\n• Process for the segregation of non-conforming material; the process must include identification and storage of these materials to prevent their use.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-11",
              "question": "Includes method for identification of package status (e.g., approved/rejected).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-12",
              "question": "Ensure all refillable packaging is stored to prevent damage to the package and to minimize further contamination as a result of storage.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-13",
              "question": "Store refillable packages either in a covered area, or use temporary covers to protect bottles from further contamination (using stretch film, tarpaulin, etc.), deterioration (e.g., scuff/scratch, fading, etc.), and/or becoming a potential source for standing water (that creates the potential for mosquito proliferation)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-14",
              "question": "For Returnable Glass Bottles (RGB), if covered storage is not feasible, then the operation must demonstrate through validation that bottle washer operating parameters are capable of cleaning bottles under the worst case scenario (e.g., heavily soiled, baked/dried product).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-15",
              "question": "In some instances where RGB bottles are heavily contaminated or soiled, consider the need for double washing of bottles prior to filling.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-16",
              "question": "In addition, ensure that standing water does not create the environment for mosquito proliferation. In some geographies, this is required under local regulations to prevent spread of disease",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-17",
              "question": "Returned containers must not be stored near non-refillable containers, ingredients, or final products. Use enough spaces or barriers to mitigate potential cross contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-3",
              "question": "Refillable Package Pre-Inspection Program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-19",
              "question": "Implement a process for the inspection of refillable packages prior to uncasing and/or adding bottles to the line leading to the washer. This is to remove any gross contaminants (wrappers, straws etc.) that may not be removed by the washing process and optimizes washer performance",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-20",
              "question": "Where feasible, use pre-wash inspection processes to remove bottles that are not suitable for filling. Refer to section on “Specific requirements for container inspection for refillable containers”",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-21",
              "question": "Dispose of unusable containers in a safe manner. For glass bottles, do not break bottles (to render unusable) in immediate proximity to the line where glass fragments may enter open packages.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-4",
              "question": "Bottle Crates",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-23",
              "question": "Use clean crates that maintain the image of the Company.\n11.1 Ensure crates are clean before use. Crates without proper cleaning can increase bottle scuffing and cross contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-24",
              "question": "Inspect crates before use and do not use the dirty ones.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-25",
              "question": "If the operation has installed an automatic crate washer, ensure cleaning agents are fully removed to prevent bottles from scuffing.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-26",
              "question": "Maintain cleanliness of crate washers to ensure that they do not become a source of contamination in the manufacturing plants or to finished products.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-27",
              "question": "Use new crates with heavy metal-free colorants. It is acceptable to use recycled crate material that contains heavy metals, as long as the applicable regulations are met.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-5",
              "question": "Specific requirements for container condition for refillable packaging",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-29",
              "question": "Implement procedures in the bottling operation to ensure that container conditions (e.g., scuff, scratch, ACL condition (where applicable) etc.) are maintained in accordance with Operating Unit requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-30",
              "question": "Each operation must follow the container condition standards defined by the OU. These standards have been defined to ensure that our packaging meets market specific consumer acceptance criteria",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-31",
              "question": "In the absence of OU specific standards, then the specifications outlined in QFS-SP-960 are to be followed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-6",
              "question": "Glass bottles",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-33",
              "question": "Implement procedures to cull from the glass float refillable glass bottles that no longer meet acceptable conditions for sale. These include the following defects:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-34",
              "question": "Scuff “wearband” wider than 4 mm extending around more than 50% of a bottle’s circumference.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-35",
              "question": "Scuffing or scratching that infringes on brand graphics, the ACL or to the ACL panel to a degree that it removes lettering, reduces panel definition, or otherwise adversely affects a Company trademark is deemed unacceptable for filling.\no Includes scuffing or scratching that makes the net content declaration illegible",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-36",
              "question": "The complete absence/loss of an ACL or significant color loss of an ACL that makes it illegible or creates a poor image of the company",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-37",
              "question": "Damage (such as bruises) that exceeds 6 mm, excluding finish.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-38",
              "question": "Bearing Surface damage where glass loss exceeds 100 mm2 or that has sharp edges, or where the bottle base is visibly thinner than the adjacent wall.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-39",
              "question": "Damage of any size on the finish, finish sealing surface, bottle threads, or transfer bead",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-40",
              "question": "Blisters larger than 3.0 mm in the bottle wall, not on the surface.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-41",
              "question": "Seed count more than 1.25 per gram of glass weight.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-7",
              "question": "Washing of Packaging (bottles, reusable closures, bulk containers including polycarbonate bottles, etc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-43",
              "question": "Develop and implement procedures for preventive maintenance and cleaning of equipment used for washing returned containers.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-44",
              "question": "Rinse or wash all new containers.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-45",
              "question": "Wash returned containers prior to refilling according to this requirement.  Rinse and drain bottles completely before their entry into the first caustic tank",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-46",
              "question": "Do not let temperature changes between the adjacent tanks exceed 25°C, to minimize thermal shock.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-47",
              "question": "To prevent bottle shrinkage or stress cracking, empty the bottle washer to ensure that bottles will not be in the caustic tank for more than 20 minutes.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-48",
              "question": "Discharge bottles from the washer to a bypass conveyor if the washer stops for more than 10 minutes.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-49",
              "question": "Ensure that bottles exiting the washer do not have caustic solution on the external bottle base.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-50",
              "question": "Identify washer parameters using reference tables 1-9 below for applicable contact times and temperatures",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-51",
              "question": "Validate and obtain OU approval for washer parameters based only on the tables",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-52",
              "question": "The validation of the washer must be performed considering, at least, the criteria of operating speed, contact time, temperatures, concentrations, and effectiveness for the removal of residuals, line lubricants, and additives as well as the prevention of yeast and mold",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-53",
              "question": "Use EDTA/MGDA in the pre-final rinse when washing glass with applied ceramic labels (ACL) containing heavy metals. Where not used, implement a heavy metal monitoring program based on the materials used (e.g., lead and cadmium-based pigments).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-54",
              "question": "Develop washing procedures for returnable closures (e.g., used on postmix syrup stainless steel containers) to ensure they are clean and suitable for reapplication (refer to table 3)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-55",
              "question": "Caustic soda (NaOH) is the recommended chemical to be used as a washing solution. Alternatives to the use of caustic soda (e.g., caustic soda-based detergents) must be validated and approved by the responsible SME in Corporate QSE and OU",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-56",
              "question": "Develop and implement a quality-monitoring program to ensure bottle washing is effective for the removal of residuals, line lubricants, and additives as well as the prevention of yeast and mold. Refer to Table 9 for container testing parameters.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-8",
              "question": "Refillable Post-Wash Inspection (ASEBI, EBI, Human visual inspection)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-58",
              "question": "Install OU-approved equipment for the inspection of refillable bottles post washing:\n• A validated All Surface Empty Bottle Inspector (ASEBI),\n• A validated empty bottle inspector (EBI) with visual inspection (for glass only)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-59",
              "question": "Implement a no-operate/no-run policy for when ASEBI fails to operate in accordance with approved, validated operating conditions",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-60",
              "question": "Operations may use human visual inspectors for when an ASEBI is not operating, and production is required to continue. Manual inspection procedures must be effectively implemented in accordance with the requirements outlined below",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-61",
              "question": "ASEBI’s and EBI’s must be verified (using defective sample test bottles) at minimum at start-up and every 4 hours during production. Follow OU requirement if stricter.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-62",
              "question": "Refer to Appendix 1 for descriptions and illustrations of defects in REFPET and glass bottles to be used as standard defect bottles during ASEBI and EBI operational tests",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-63",
              "question": "Ensure test process and test bottle identification prevent defective test bottles from entering the good product bottle stream.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-64",
              "question": "Develop and implement procedures for preventive maintenance and cleaning of processes and equipment used for post-wash inspection (i.e., ASEBI, EBI).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-65",
              "question": "Operate the post-wash inspection equipment according to the manufacturer’s instructions and do not modify the operating parameters without prior authorization from the OU and Center.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-9",
              "question": "Requirements for Associates performing manual visual Inspection",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-67",
              "question": "Perform inspection training for personnel assigned to bottle inspection",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-68",
              "question": "Conduct and record eye testing for each inspector to confirm that their vision can detect defects as required by process.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-69",
              "question": "Visual inspection stations must be designed to ensure correct seat height and no obstructions for inspectors’ sight (such as conveyor bars).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-70",
              "question": "Rotate inspectors between empty bottle inspection and other duties at regular intervals.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-71",
              "question": "Limit inspection time to 20 minutes per inspector. The time interval between empty bottle inspections must be at least twice the time spent performing the inspection. An example rotation schedule is 10 minutes of inspecting empty bottles and 20 minutes doing other activities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-10",
              "question": "Disposition of Rejected Bottles",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-73",
              "question": "Rejected bottles can be returned for washing when they can be re-washed (i.e., if first wash was not effective or when foreign matter can be removed, and bottle returned to the washer for washing).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-74",
              "question": "Bottles rejected due to alarms or as a result of testing can also be returned for washing.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-75",
              "question": "Dispose and make unusable bottles any bottles that are rejected by the following:\n• Any bottle that has been rejected by the prewash sniffer,\n• Any bottle that is culled as part of prewash visual inspection and residual liquid detectors (other than removable foreign object), and\n• Any bottle that is removed post-washing that cannot be re-washed (due to not meeting container conditions, or when rewashing will not render the product suitable for filling).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-11",
              "question": "Non-Refillable Packages",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-77",
              "question": "Includes cans, non-refillable PET/HDPE, and non-returnable glass.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-78",
              "question": "Develop and implement programs for incoming package receipt, inspection, and disposal. Refer to the Incoming Receipt, Storage and Handling of Ingredients and Packaging Materials (QFS-RQ-100) requirement",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-79",
              "question": "Inform the OU, procurement, and other relevant parties when identifying or rejecting nonconforming primary packaging batches/lots. (e.g., crowns, closures, preforms, cans)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-80",
              "question": "Use only non-refillable packages that meet the Company specifications",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-12",
              "question": "Preforms",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-82",
              "question": "Preforms specifications and suppliers/supply points must be approved by the Operating Unit.\n44.1 Bottlers must not change preform specifications (e.g., light weighting) without first obtaining OU approval",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-83",
              "question": "Develop and implement procedures for cleaning and sanitizing of processes and equipment used for preforms storage and transportation (e.g., air conveyors, storage tanks). This is to prevent the buildup and transfer of dust, dirt, and debris to final product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-84",
              "question": "Store preforms under controlled access and in a manner that mitigates the potential for quality and food safety risks (e.g., temperature, humidity, and ultraviolet).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-85",
              "question": "Preforms must be clean and undamaged before use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-86",
              "question": "If the bottle blowing process is outsourced, ensure that the third-party complies with all Company requirements based on this document and other relevant requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-87",
              "question": "Bottle performance must be monitored. Approved containers must comply with the approved specification and be monitored. Refer to the Supplier Requirements Packaging, PET Preforms (SU-RQ-202), and Packaging Requirements PET Bottles (SU-RQ-204).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-13",
              "question": "Container Preparation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-89",
              "question": "Use process, product, equipment, and package-specific procedures that deliver clean containers fit for use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-90",
              "question": "Develop and implement procedures for preventive maintenance, cleaning, and sanitizing of processes and equipment used for container preparation, storage, and transportation (e.g., air/water rinse, air conveyors, washers, inspection equipment, etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-91",
              "question": "For low acid and aseptic processes, cleaning and sanitizing are essential to ensure the absence of food safety risks.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-SEC-14",
              "question": "Rinsing Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-93",
              "question": "Use treated or potable water for rinsing non-refillable glass beverage bottles. Treated or potable water must comply with the Company requirement and/or local regulation, the stricter of the two",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-94",
              "question": "Use OU-approved air rinsing or water rinsing for beverage cans, plastic bottles, and plastic cups.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-95",
              "question": ".\n52.1 Use clean, dry, oil-free, and filtered air when utilizing air rinsing processes.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-96",
              "question": "Install rinse air pressure sensors with alarms/line stops",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-97",
              "question": "3 Pass frozen beverage containers through deionized air blowers with dust vacuums",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-98",
              "question": "Treated or potable water must comply with the Company requirement and/or local regulation, the stricter of the two.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-99",
              "question": "Develop and implement procedures for preventive maintenance, verification and monitoring of air rinsing or water rinsing for beverage cans, plastic bottles, and plastic cups",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PHP-100",
              "question": "Perform a risk assessment to determine if air or water rinsing is needed for in-line blown PET bottles and obtain OU approval for the decision. The risk assessment must consider, at a minimum, the package material and equipment design.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-mixing-and-blending-checklist",
        title: "KORE QFS Internal Audit Checklist — Mixing and Blending",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Mixing and Blending. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "MB-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-2",
              "question": "Mix, blend, and store products according to Master Mixing Instructions (MMI).\n1.1 Do not adjust the recipe or formula without OU approval.\n1.2 Follow the order of addition as defined in the MMI. Changing the order of addition has the potential to impact product performance and stability.\n1.3 Do not add ingredients all at once or pre-mix the ingredients unless approved by MMI",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-3",
              "question": "Follow a validated cleaning and sanitizing matrix in all processing equipment to avoid cross contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-4",
              "question": "Use treated water for product manufacturing, and to prepare simple syrup from granular sucrose, dextrose, or other sweeteners.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-5",
              "question": "Ensure a mechanism is in place to identify the correct addition of ingredients (i.e., number of unitized packages or quantity of ingredients added) to avoid over or under-addition.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-6",
              "question": "Register and document the ingredient name, lot number, and order of addition for the purposes of traceability.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-6",
              "question": "After emptying liquid concentrate and beverage base containers, thoroughly rinse their contents into the batch except when noted in the MMI.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-7",
              "question": "Pass ingredients and product through a stainless-steel screen or magnetic trap at appropriate locations in the process, specified in MMI or based on the risk assessment.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-8",
              "question": "Ensure a monitoring procedure is implemented to verify the condition and cleanliness of screens, strainers, and magnets. Add ingredients in a manner to prevent the addition of foreign material to the batch.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-9",
              "question": "Where a site-glass is present in a line for inspection purposes, confirm integrity as part of the maintenance activities. Be careful during maintenance activities not to over tighten glass in a manner that impacts its structural integrity and could potentially lead to breakage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-10",
              "question": "If defined in MMI, control and monitor the temperature and contact time for specific ingredient.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-11",
              "question": "Ensure dry ingredients are fully dissolved before proportioning or filling.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-12",
              "question": "Ensure each of the following yield targets: 10.1 Final syrup batch yield: not greater than 100% based on units of concentrate or beverage base.\n10.2 Blended beverage yield: not greater than 100% based on syrup volume or according to the MMI.\n10.3 Continuous blend finished beverage yield: not greater than 100% based on concentrate or beverage base volume",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-13",
              "question": "When deviations occur during production that lead to the over or under-addition of ingredients (including water), contact OU for further decisions on actions and next steps.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-14",
              "question": "Do not attempt to adjust product to bring into specification without first verification by OU. Analytical services may also provide additional support and testing to address any corrections.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-SEC-2",
              "question": "Simple Syrup Manufacturing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-16",
              "question": "When using heat treatment to manufacture simple syrup, ensure the temperature of the simple syrup reduces to ≤ 30°C (86°F), or as directed by the MMI, before adding the flavoring ingredients.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-17",
              "question": "When using heat treatment to manufacture syrups containing non-nutritive sweeteners, ensure the temperature of the water reduces to ≤ 25°C (77°F), or as directed by the MMI, before adding nonnutritive sweeteners and flavoring ingredients",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-18",
              "question": "Syrups sweetened with sucrose require testing to determine the level of inversion. Follow OU requirements or manufacturing plant SOP to define the inversion calculation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-SEC-3",
              "question": "Storage of Syrup/Blended Beverage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-20",
              "question": "Meet the requirements for storage time and temperature defined in the MMI or according to applicable regulations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-21",
              "question": "If cooling is applied during storage, ensure there is no precipitation of ingredients",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-22",
              "question": "Ensure adequate agitation in the mixing tank at the validated agitation speed to keep consistency of fill, especially for products with pulp or other solid components (e.g., aloe particles)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-23",
              "question": "Agitation should be continuous in order to maintain homogeneity, unless otherwise specified in the MMI or defined as part of the validation process.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-SEC-4",
              "question": "Continuous Blending",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-25",
              "question": "Defined dosing accuracy, (i.e. dispensing each required component stream to the blend within +/- 0.25% accuracy or better by weight of the amount specified by MMI.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-26",
              "question": "Defined criteria for mixing effectiveness (e.g., syrup brix, acidity)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-27",
              "question": "At least once per year, calibrate flow meters according to external traceable standards to ensure ingredient dosing complies to the MMI.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-SEC-5",
              "question": "Syrup/Blended Beverage Testing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MB-29",
              "question": "Test each batch of syrup and blended beverage according to Table 6, or as specified in the MMI.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-processing-and-filling-requirements-checklist",
        title: "KORE QFS Internal Audit Checklist — Processing and Filling Requirements",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Processing and Filling General Requirements. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "PFR-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-1",
              "question": "Follow requirements of Company, Operating Unit (OU) or local regulations, whichever are stricter.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-2",
              "question": "Follow Master Mixing Instructions (MMI) for processing conditions and finished product requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-3",
              "question": "Ensure GMP condition in the facility is in accordance with ISO standards and KORE requirements (PRP-RQ-018, PRP-RQ-020).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-4",
              "question": "All equipment should comply with the hygienic design principles mandatory or applicable for the region and the country (e.g., 3-A Sanitary Design Standards, European Hygienic Engineering Design Group (EHEDG).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-5",
              "question": "Production lines must have a detailed process flow chart and a piping and instrument diagram, outlining the equipment, process control and product flow. The flow diagram must be verified by the HACCP and/or food safety management team on the site and updated when changes occur.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-6",
              "question": "Production lines must have a detailed process flow chart and a piping and instrument diagram, outlining the equipment, process control and product flow. The flow diagram must be verified by the HACCP and/or food safety management team on the site and updated when changes occur.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-6",
              "question": "The manufacturing plants must have a Calibration and Verification Program (PRP-RQ-016) to verify the accuracy and precision of weighing devices and sensors used to measure ingredients, in process and finished product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-7",
              "question": "Maintain environmental control conditions appropriate for the area and hygiene requirements based on a risk assessment. For example, areas in which raw materials are prepared as product ingredients and/or products are processed and packaged",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-8",
              "question": "Refer to Environment Monitoring Programs and implement an environmental monitoring plan based on the risk assessment (QFS-RQ-440).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-9",
              "question": "Ensure correct sizes of strainer, screen, filter, and magnet are installed according to MMI or other mixing and blending procedure document, to prevent foreign matters at tipping stations and in the entire process flow. In case not defined in MMI, determine the strainer sizes and minimum limit of barriers of the rejection system needed to remove physical hazards during HACCP analysis",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-10",
              "question": "Based on a risk assessment, OEM recommendation or the evaluation of the environment and air quality compliance, ensure the filling area has appropriate environmental control. This may include ensuring the filling room/filling hall is separate, enclosed, and ventilated with filtered air.  For those rooms classified as requiring environmental control (e.g., aseptic fill, ultraclean fill, cold fill, etc.), design, construct and verify that the ventilation systems provide the required minimum number of air changes per hour and air quality (i.e., particulate air counts or microbiological air counts) appropriate for the level of hygiene in the room.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-11",
              "question": "1 Based on a risk assessment, the ventilation systems should be designed, constructed, and verified to prevent the risk of cross-contamination.                                                                                                                                                                                                               For those rooms classified as requiring environmental control (e.g., aseptic fill, ultraclean fill, cold fill, etc.), monitor the performance of the ventilation system and do not operate filling equipment if the ventilation system is not providing positive pressure.                                                                                                                                                                                                                                                                                                               Ensure a pressure differential between the controlled areas exists.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-12",
              "question": "Air filters (e.g., HEPA filters) should be inspected and/or replaced at an appropriate frequency based on supplier recommendation. During inspection or after replacement, filters should be checked for pressure differential to confirm performance.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-13",
              "question": "Ensure that water used in processing meets the company specifications.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-14",
              "question": "Ensure that any steam that is used in contact with the product (such as steam injection or steam infusion), or product contact surfaces (such as steam sterilization), is culinary grade. Refer to 3A Sanitary Standards 609-03 - Method of Producing Steam of Culinary Quality, or equivalent local standard.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-15",
              "question": "Ensure appropriate temperature and humidity control for medium and high hygiene areas, depending on the risk of processing and/product (e.g., preform storage, ingredient handling area of dry filling). For more information, refer to GMP Facility Design (PRP-RQ-010).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-16",
              "question": "Ensure the use of food-grade lubricants where there may be contact between the lubricant and the product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-17",
              "question": "When using a nitrogen dosing system ensure the nitrogen (liquid or gas) meets Company specification.\n17.1 For aseptic beverages, ensure that all lines supplying the nitrogen are included in the aseptic fillers cleaning and sterilization programs. Frequency of cleaning and monitoring programs to verify the supply of sterile nitrogen must be defined.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-18",
              "question": "Validate the maximum production run time to determine the frequency with which the cleanin-place (CIP), sterilization-in-place (SIP), or clean-out-of-place (COP) cycles, should be conducted.\n18.1 Do not exceed the maximum validated production run time unless approved by the OU.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-19",
              "question": "Only use finished product proprietary packaging for the product itself. Do not use for alternate purposes such as holding filler valve parts, cleaning chemicals, sanitizers, etc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-20",
              "question": "Use ingredients according to First Expired First Out (FEFO). Use packaging material according to First In First Out (FIFO).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-21",
              "question": "Use only OU approved tamper-evident closures or features on packages.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-22",
              "question": "Ensure processes are in place to remove product residue from bottle finish/threads before closure application, and to remove beverage residue from the external surfaces of filled packages (i.e., use of rinses post-filling). Implement container preparation and inspection processes in accordance with Package Handling and Preparation (QFS-RQ-200).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-23",
              "question": "Reject containers with misapplied closures or labels. Manufacturing facilities must implement a positive verification of labeling and packaging\nprogram as part of the manufacturing process. Integrate technological solutions such as\nin-line closure/label inspection system/camera, based on the risk assessment and the\nevidence of IMCR, customer complaint.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-24",
              "question": "Inspect the package integrity according to the defined control program. Packaging integrity testing may include pressure, burst, air leak (vacuum), dye penetration, conductivity (electrolytic), tear down (double seam), tear down (paperboard), tensile strength (peel), torque, chemical etching, vision systems, etc.\n24.1 Provide internal pressure in finished product, where applicable or when specified in the MMI, to ensure sturdy packages during handling, transportation, and storage.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-25",
              "question": "Implement a finished product-testing program according to the Company requirements, OU requirements, and local regulations. Follow respective tables for microbiological monitoring of the process requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PFR-26",
              "question": "Manufacturing plant must have a management of change control program (or equivalent program) that ensures all changes to key personnel, product formulations, processing equipment, packaging or operational procedures go through a formal evaluation process and risk assessment. For more information, refer to Equipment, Technology and Process Change Validation (QFS-RQ-400).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-carbonated-processing-checklist",
        title: "KORE QFS Internal Audit Checklist — Carbonated processing",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Carbonated processing. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "CARB-SEC-1",
              "question": "General Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CARB-1",
              "question": "Follow Processing and Filling General Requirements (QFS-RQ-300).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CARB-SEC-2",
              "question": "Filling",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CARB-2",
              "question": "If requested by MMI, flush package headspace with carbon dioxide or nitrogen gas before capping to meet the headspace oxygen and avoid oxidation.\nPrior to releasing finished product to the market, ensure containers are conditioned above the dew point for the types of packages (i.e., cans in carton), of which the quality can be affected by condensation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CARB-3",
              "question": "If the warming of containers is required, do not exceed the maximum warming temperature defined in MMI or by the manufacturing plant, to avoid affecting beverage quality like sensory.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CARB-SEC-3",
              "question": "Testing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CARB-4",
              "question": "8 Perform finished product testing according to Table 1a and Table 1b and product specification regulated in MMI.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CARB-5",
              "question": "For the minimum number of samples required for microbiological testing of finished product, refer to normal, tightened, and reduced plans listed in the finished product tables below.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CARB-6",
              "question": "The use of in-line validated continuous monitoring devices could replace the need for periodic testing of an attribute as defined in this document.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CARB-7",
              "question": "Perform additional tests before release as required by the OU and local regulations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-equipment-technology-and-process-checklist",
        title: "KORE QFS Internal Audit Checklist — Equipment Technology and Process",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Equipment Technology and Process Change validation. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "ETP-SEC-1",
              "question": "General requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-1",
              "question": "Operating Unit (OU) is responsible for ensuring the effective implementation of the validation protocols, for example those shown in Table1 (KORE Knowledge Sharing). Plants and facilities are responsible for building a validation project team and implementing validation activities.\n1.1 A project team should include the representatives from OU, occupational safety, quality, food safety, environmental, engineering, production, and the supplier in order to ensure review of these functional areas at each step of the process.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-2",
              "question": "Establish or update the HACCP plan as a part of this process, to identify all the critical control points and clarify the control measures.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-3",
              "question": "After overhaul, major maintenance or any unscheduled maintenance that can impact line performance, conduct re-validation or verification of equipment performance in consultation with the equipment supplier.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-4",
              "question": "Comply with Validation Specifications (QFS-RQ-410).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-5",
              "question": "Process and line validation approval\na. For low-acid (pH > 4.6) shelf stable products the thermal processing conditions and critical factors necessary to ensure food safety and commercial sterility must be validated by an approved third-party authority. An approved third party may be a TCCC approved Process Authority, or an internal OU expert approved by the Director of Process Validation and Thermal Processing Governance. A list of approved third-party authorities can be found on the Thermal Processing and Process Validation Network site.\nb. For new lines an approved third party must be engaged during Design Qualification to ensure the equipment is fit for purpose and the design can achieve the minimum requirements as defined in the MMI.\nc. For new lines, established lines or contract packers an approved third party must be engaged to approve thermal processing equipment and confirm the Scheduled Process.\nd.Each OU and Manufacturing location must keep the approved third-party authority’s process recommendations letter/report on file.\ne. When there is any deviation from the Scheduled Process that does not have automatic intervention, obtain approval for product release by an approved third party in consultation with OU.\nf. Validation of all other product categories must be performed by individuals who have the necessary skills, knowledge, and training to approve such processes, as defined by the OU.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-6",
              "question": "Validate and obtain OU authorization for production lines, new processes, equipment, and technology, to ensure they demonstrate the capability to achieve company specifications.\na. Conduct risk/readiness assessment prior to line validation.\nb. Obtain OU approval of the readiness assessment. NOTE: A readiness/risk assessment is a documented process that ensures all procedures, facilities, equipment, and resources required to complete the validation successfully are met before commencing validation. A readiness/risk assessment may include (but not limited to):\n- OEM and other third-party contracts finalized\n- Drawing diagrams finalized and up to date (e.g. P&ID’s, schematic diagrams, facility layout, etc.)\n- Validation protocols and documents prepared and approved by OU and OEM.\n- Validation pre-requisites, timeline, sequence and requirements prepared\n- Environmental and facility design requirements reviewed and assessed\n- Health and safety requirements reviewed and assessed\n- Financial resources and risks approved\n- All third-party resources approved and ready (e.g. third party process authority, cleaning supplier, etc.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-7",
              "question": "Validate new equipment and new technologies by following the four validation steps listed below or an equivalent validation process.\n• Design Qualification\n• Installation Qualification\n• Operational Qualification\n• Performance Qualification",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-SEC-2",
              "question": "Step One: Design Qualification (DQ)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-8",
              "question": "Document the design specifications of the equipment or technology and detail the decisions in the selection of the supplier.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-9",
              "question": "During DQ engage with an OU Thermal Processing SME or TCCC recognized Process Authority to ensure that the proposed design meets the necessary requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-10",
              "question": "Once the project team approves the design specifications, proceed to installation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-11",
              "question": "The design qualification may be completed at a location different from the installation location.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-SEC-3",
              "question": "Step Two: Installation Qualification (IQ)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-12",
              "question": "Verify the equipment or technology is received as designed and installed as specified.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-13",
              "question": "Where applicable EHEDG guidelines, 3A sanitary guidelines, Codex International Food Standards or equivalent regional and local guidelines apply, they should be followed during the IV",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-14",
              "question": "An approved welding contractor quality control process should be followed both prior to welders being approved to work onsite and during the installation. A weld quality screening process should be followed to ensure that all welds performed onsite are to a high standard.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-15",
              "question": "All newly installed stainless-steel pipework, welds and equipment must have gone through a formal passivation process and been reviewed to ensure the passivation process has achieved the required surface finish.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-16",
              "question": "The location of all temperature devices, pressure devices, conductivity meters and other instruments should be reviewed (as approved during DQ), ensuring they are installed correctly, installed in the correct location and labelled correctly.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-17",
              "question": "Document and confirm that all materials used in and purchased for the installation meets the DQ requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-18",
              "question": "Leak (pressure) testing of all pipes, heat exchangers and tanks should be documented.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-19",
              "question": "Once the project team approves the installation qualification, the project can proceed to operational qualification.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-SEC-4",
              "question": "Step Three: Operational Qualification (OQ)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-20",
              "question": "Demonstrate that the equipment or technology will function according to the operational specification in the designated environment. If OQ is performed because of a modification, document the changes.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-21",
              "question": "Validate performance of the thermal processing equipment to ensure the requirements detailed in the MMI can be achieved.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-22",
              "question": "Validate the operation and performance of all critical processes.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-23",
              "question": "Provide calibration records of sensors (i.e., thermometer, flow meter and pressure gauge).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-24",
              "question": "Validate CIP and sterilization operations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-25",
              "question": "Validate or verify the accuracy of computer assisted systems.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-26",
              "question": "Validate or verify the activation of all alarms and corrective actions where applicable.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-27",
              "question": "Once the project team approves the operational qualification, the project can proceed to performance qualification.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-SEC-5",
              "question": "Step Four: Performance Qualification (PQ",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-28",
              "question": "Demonstrate that the equipment or technology performs according to design criteria over a defined time period using data to confirm.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-29",
              "question": "Include a documented risk assessment and approval from the project team on the final validation for the following:\n• Engineering\n• EOSH\n• Quality\n• Food Safety\n• Training",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-SEC-6",
              "question": "Process Change Validation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-30",
              "question": "Validate any process change that impacts product quality, food safety, the environment, occupational health and safety or applicable regulations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-31",
              "question": "Validate the following product conditions when the production line is idle:\n• The amount of time the filler can be down prior to re-sanitizing\n• The amount of time a package can sit under a valve prior to package distortion (where applicable)\n• The amount of time an empty package can stay on conveyer prior to package distortion (where applicable)\n• How to keep the system sterile/hygienic during downtime\n• Product quality before resuming production\n• Prevention of product overheating (where applicable)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ETP-32",
              "question": "Validate the changes to the following processing and more as defined by OU or based on the risk assessment.\n• Introduction of new product categories, such as non-preservative or allergen-containing (increased microbiological sensitivity)\n• Change in product formula, such as increased allergen component\n• Change in thermal processing and critical parameter settings (i.e., temperature, flow rate).\n• Change in beverage recirculation and line stoppage procedure for thermal manufacturing.\n• Change in maximum production running hours and line speed\n• Change in primary package design (bottle and closure shape that can impact rinsing/sterilizing effect etc.) and secondary package design (label information, graphic design etc.)\n• Change in container preparation processes or detergent (rinsing, washing, sterilizing, or no-rinsing)\n• Change in cleaning and sanitizing processes or detergent\n• Testing plans per processing documents\n• Water treatment process",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-immediate-consumption-equipment-checklist",
        title: "KORE QFS Internal Audit Checklist — Immediate Consumption Equipment",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Immediate Consumption Equipment (ICE). Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "ICE-SEC-1",
              "question": "General requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-1",
              "question": "Purchase immediate consumption equipment from ISO 9001 accredited suppliers that meet the following criteria:\n• Equipment design verification and performance check by an ISO17025 certified laboratory or meet ISO 17025 requirements. If an exception is made by OU, keep that information on OU approval/communication on file for reference.\n• Local legal requirements for electrical safety or IEC 60335 in the absence of local requirements.\n1.1 Only purchase from an OU approved fountain dispenser list.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-2",
              "question": "Develop an ICE purchasing plan to phase in natural refrigerants based on the OU-defined timeline. This plan must achieve the following:\n• CFC-free, HCFC-free, and HFC-free insulation material.\n• CFC-free, HCFC-free, and HFC-free refrigerants for newly purchased equipment or alternative ultra-low Global Warming Potential (GWP) refrigerants, in viable markets.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-3",
              "question": "Ensure coolers and vendors comply with local energy consumption guidelines, in order to support the sustainability objectives. This could be local industry standards (etc. EN 16902 CC2 K4 in Europe for coolers).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-4",
              "question": "Ensure that equipment using hydrocarbon (HC) refrigerants minimizes the gas charge, potential leakages, and potential sparking.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-5",
              "question": "Purchase fountain dispensing equipment components intended for direct food contact (example: tubing) that comply with local or international food contact material (FCM) regulations. Require a Certificate of Compliance (COC) from the supplier against FCM regulations in the country of use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-SEC-2",
              "question": "Equipment Maintenance",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-6",
              "question": "Follow supplier instructions and use supplier-approved or OU/bottler-validated parts to ensure the safe maintenance, service and refurbishment of equipment.\n6.1 Perform repairs that require opening or refilling refrigerant gas in dedicated workshops.\n6.2 Equipment must comply with local regulations before in-field placement.\n6.3 Important changes to the design or to the BOM require a re-validation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-7",
              "question": "The operation must define a procedure for equipment at end-of-life and equipment for disposal to protect the company brand and prevent reuse. Refer to Trademarked materials and Non-conforming Products for more information (PRP-RQ-030)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-8",
              "question": "Use, recover, and dispose of ozone-depleting substances (ODS) and selected greenhouse gases (see the “Immediate Consumption Equipment (ICE) Operations Guideline in KORE Knowledge Sharing for in-scope compounds) based on the following criteria: 8.1 Implement controls to ensure that the use, recovery, and disposal of refrigerants, gases and other materials are managed safely and do not release in-scope compounds into the atmosphere. Refer to ICE Operation Guideline (KORE Knowledge Sharing) on how to meet the requirements of minimizing the gas charge for equipment using HC refrigerants.\n8.2 Reuse, recycle, reclaim or destroy in-scope compounds.\n8.3 Ensure contaminated or otherwise unusable refrigerant is disposed of under controlled conditions that prevent the contamination of the environment\n8.3.1 Guidelines for the disposal of refrigerant in accordance with the Montreal Protocol can be found in ODS Destruction in the United States and Abroad (External).\n8.4 Use a certified and licensed destruction facility, if one is available.\n8.5 Do not mix different types of refrigerants when recovering them.\n8.6 Recycle or dispose of in-scope compounds or equipment containing in-scope compounds properly.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-9",
              "question": "Ensure routine maintenance of containers containing in-scope compounds, including checking for and fixing leaks.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-SEC-3",
              "question": "Recordkeeping",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-10",
              "question": "Maintain an inventory of all ICE equipment, including the number of newly purchased ICE units and their use of HFC versus natural refrigerants.\n10.1 Maintain a record of end-of-life equipment disposal to protect the company brand and prevent reuse.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-11",
              "question": "Measure and document the amounts of refrigerants, gases, and other materials that contain in-scope compounds (including new purchases) that are stored, used, recovered, transferred offsite, or destroyed/disposed",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-SEC-4",
              "question": "Fountain Ingredients Water",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-12",
              "question": "Use only potable water for dispensing and brewing. Determine potability by either testing for compliance with the company specifications or obtaining declaration from the local authority.\n12.1 Where water will be sourced from private or municipal wells, use OU-defined requirements to approve and test water to confirm potability.\n12.2 Perform a risk assessment to determine test frequency when a declaration is not available and based on historical water quality results.\n12.3 Where chlorine concentration levels in source water are identified as having an impact on beverage quality at the point of use/purchase, consider the use of additional filtration to reduce the levels of chlorine present",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-13",
              "question": "3 Dispensing must not take place during a water quality disruption from the municipality. After a disruption, conduct a complete sanitation of the equipment. Replace any component impacted by the disruption if necessary.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-SEC-5",
              "question": "Gases",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-14",
              "question": "Use only beverage-grade carbon dioxide purchased from authorized suppliers that meet\ncompany specifications (Carbon Dioxide Specification, BP-SP-110).\n14.1 Where the customer is responsible for directly purchasing carbon dioxide, ensure that\nthere are clear requirements communicated to the customer (e.g. operating\nprocedures, manuals) that outline the need to use only beverage -grade carbon\ndioxide.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-15",
              "question": "Use beverage-grade nitrogen and compressed air that meet industry standards for beverage contact (Liquid Nitrogen Specification, BP-SP-142 and Compressed Air Performance Specifications, BP-SP-136).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-16",
              "question": "Ensure gas-lines and air compressors use components that are approved for food contact.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-17",
              "question": "7 Implement procedures to manage and control the environmental, occupational safety, and health risks associated with refrigerants.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-SEC-6",
              "question": "Marketplace",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-18",
              "question": "8 Ensure company products are displayed and served appropriately within the required temperature.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-19",
              "question": "Design and implement a program for the review and authorization of an outlet, confirming that it is capable of serving quality beverages (e.g. ready-to-drink or fountain products) that meet company specifications. The following should be included as part of the authorization process -\n• Verification that water quality meet potability standards (for fountain beverages)\n• Environmental conditions (e.g. temperature, humidity, exposure to the elements)\n• Pipe-working (for fountain dispensers)\n• Equipment location and condition\n• Compliance of the outlet and the proposed installation with local regulations, including the verification of the safe condition of electrical supply (to prevent electrocution).\no Include in this consideration the long-term potential for deterioration of the electrical systems due to damage that may be caused by equipment movement, pest activity, corrosion etc.\n• Ability to implement required cleaning and maintenance\n• Storage conditions of syrup or other products",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-20",
              "question": "Ensure equipment operations, installation, accessories, and replacement parts - 20.1 Comply with safety parameters (example: stability, electrical, fire,) and local regulations.\n20.2 Adhere to industry and food safety standards.\n20.3 Follow the manufacturer's recommendations.\n20.4 Reflect a positive image to customers and consumers.\n20.5 Do not change equipment performance or temperature range of products served to consumers.\n20.6 Specific to product lines, ensure they are clearly labeled and visibly identifiable to prevent incorrect beverage connection. Note: Where required, use different BIB-connectors (e.g. diet syrups with larger diameter), to prevent wrong syrup hook-up. This is strongly recommended but not currently required for all locations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-21",
              "question": "When dispenser equipment is required to go out of operation for a considerable period of time (e.g. due to outlet lockdown), ensure there is a restart procedure in place that requalifies the outlet prior to the recommencement of beverage. Refer to Dispenser Beverage Operations Knowledge Sharing page for examples of restart procedures.\n• Immediate Consumption Equipment (ICE) Operations Shut Down and Start Up Protocol\n• Fountain Operations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-22",
              "question": "Implement a risk-based, dispensed beverage quality-monitoring program for water, ice, and finished products that follow OU guidance and/or requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-23",
              "question": "Train outlet personnel on operation and cleaning of dispensing or brewed beverage equipment, as well as on aspects impacting the quality and food safety of company products when installing equipment in the marketplace. Note: Given the level of turn over that occurs within the food service industry, it is necessary to ensure that any training initiatives allow for the continued suitable operation of a dispenser at all times.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ICE-24",
              "question": "Implement a process that allows for capturing of consumer complaints related to dispenser beverages and vended products.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-environmental-monitoring-checklist",
        title: "KORE QFS Internal Audit Checklist — Environmental Monitoring Programme",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Environmental Monitoring Programme. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "EMP-SEC-1",
              "question": "Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-3",
              "question": "Each manufacturing plant must develop and implement an Environmental Monitoring program (EMP) that complies with the requirements listed in this document and local legal requirements. At a minimum, the following must be considered for the program:\n• Covers all production processes to ensure control of pathogens of concerns, hygienic indicators and spoilage microorganisms.\n• Must be a part of the Plant Microbiological Monitoring program and works together with other parts: Cleaning and Sanitation Effectiveness Monitoring and Ingredients and Final Product Monitoring.\n• Must be risk-based, dynamic and tailored to specific facility processes and conditions.\n1.1 Obtain Operating Unit (OU) authorization of the EMP program.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-2",
              "question": "Risk assessment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-5",
              "question": "Conduct a microbiological risk assessment to include the complete portfolio of products produced at the manufacuturing plant. To develop a robust EMP program the risk assessment must consider the following: 2.1 Intrinsic and extrinsic factors of ingredients, parts and products, including:\n• pH (Low Acid, High Acid, Acidified) and type of organic acids (optional)                                                                      Water Activity – Aw (Low moisture food, Intermediate moisture food) - optional\n• Presence of preservatives\n• Carbonation\n• Temperature storage and distribution\n• Interaction with product microflora (if present, optional): Fermented food, Packaged water.\n2.2 Microbial Ecology of the Processing Environment and type of cleaning\n• Wet, Controlled Wet or Dry\n2.3 Hygienic zoning according to Table 1 and product proximity according to Table 2.\n2.4 Processing Technologies\n• Technologies based on product exposure to environment\n• Kill step like thermal processing e.g Pasteurization, Ultra High temperature (UHT) or other technologies e.g High Pressure Pasteurization (HPP)\n2.5 Risk of Manufacturing Plant\n• Age of plant, type of lines and sanitation capability\n• Hygienic Design of plant and HVAC (Heating, ventilation and air conditioning)\n• Current level of facility hygienic zoning, risk of cross-contamination and environmental control\n• Regulations in place and history of outbreaks (including competitors)\n2.6 Use the Decision Tree in the Appendix to determine what monitoring is needed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-3",
              "question": "Zoning",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-6",
              "question": "Define hygienic zoning and product proximity zones in the manufacturing facility to identify critical areas and develop effective EMP sampling plan.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-4",
              "question": "Target Microorganisms",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-8",
              "question": "Manufacturing plants should test for spoilage and hygiene indicators as part of the Environmental Monitoring Program. This provides important information on the plants good manufacturing practices, and facilitates the implementation of preventive measures that control the presence of spoilage microorganisms.\n4 Establish a list of target microorganisms to include in the plant monitoring program.\n4.1 As a starting point, use table 3 to develop a list of target microorganisms to consider (based on product type and processing technology). In addition, consider the following:\n4.1.1 Identify microorganisms that can contaminate the final product and have a high risk of entering the manufacturing facility via materials, personnel, equipment, air, pests etc.\n4.1.2 Evaluate any past microbiological trends related to spoilage or hygiene organisms observed in either raw materials, the manufacturing environment and/ or in finished product and consider for inclusion in the monitoring program\n4.1.3 Evaluate the impact of the presence of those microbes at any step in the manufacturing process from raw materials, and packaging through filling and finished product.\n4.2 For air monitoring, target microorganisms for all products and all technologies are Total Viable Count (TVC) and Yeast and Mold\nNote: Hygienic indicator and Spoilage Microorganisms indicate improper cleaning, insanitary conditions or post-process contamination: Total Plate Count (TPC, TVC or APC); Yeast & Molds; Dekkera spp. - region specific; Preservative Resistant Yeasts (Z.bailii, Candida kruseii); Listeria spp ; Enterobacteriaceae (Note: Enterobacteriaceae should be considered for environmental monitoring and not coliforms unless local regulatory requirements for environmental monitoring)\nNote: Other microorganisms (e.g., Highly Resistant Spores (HRS) for bacterial spore formers, Thermo Acidophilic bacteria (TAB), Heat resistant molds (HRM)) can be included in EMP for Troubleshooting purposes based on risk assessment and historical data.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-5",
              "question": "Specific Requirements for Pathogen Testing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-10",
              "question": "Routine pathogen testing is not required unless required to be demonstrated as part of local regulations or unless identified through risk assessment.\n5.1 When pathogen testing is to be included as part of EMP, then the following requirements apply based on zone proximity:\n5.1.1 No pathogens are permitted in Zones 1 and 2.\n5.1.2 Specific to Zones 1 & 2: Environmental monitoring microbiology results are required to be included as part of final product release criteria. If results are positive, production must stop, and all product must be placed on hold until testing can confirm that there is no further risk.\n5.1.3 Specific to Zone 3: Conduct a risk assessment to determine the likelihood of finished product contamination. When the likelihood is considered high, production must be stopped until the monitoring program can confirm that pathogenic microorganisms are no longer present.\n5.1.4 Zone 4: No specific requirements for zone 4, unless risk assessment identifies the potential opportunity for pathogens to be transferred from these areas to zones 1-3.\n5.2 Manufacturing plants must have a documented risk management plan that describes how to manage positive results of pathogens for applicable zones. This plan shall at minimum describe the following:\n• Escalation to OU QFS Director and Corporate QFS Microbiology Director,\n• Product release (e.g. intensive finished product sampling plan),\n• Root cause analyses (e.g. vector swabbing) and\n• Communication plan, clearly state that when pathogens are detected in zones 1 and 2 finished product shall not be released to the market.\n5.3 In all cases, root cause analyses shall be conducted, and aggressive actions taken to eliminate the presence of any pathogens before production is restarted.\n5.4 Swabathon or investigative pathogen testing can only be conducted while there is no production at the facility. Resuming production can only be done after absence of pathogens has been confirmed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-6",
              "question": "Sampling Approach",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-12",
              "question": "Define all sampling points, based on the facility zoning and general hygienic situation during the sampling schedule to anticipate any deviation or to monitor points of concern ad hoc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-13",
              "question": "Determine the number of environmental samples taken based on the risk levels related to the product and process, size of the facility, validation results and historical data. Focus should be given to open areas where the product is exposed after a heat-treatment step and where the risk of product recontamination is highest and surrounding areas in close proximity (zone 2).\n7.1 Follow the sampling priority and split of numbers of samples for spoilage and hygiene indicators in Table 4 below.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-14",
              "question": "Start from the Validation phase to develop robust routine sampling and consider the following:\n8.1 Validation Phase:\n• Extended sampling from different locations (High, Medium and Low risk) and all product proximity zones at different times within a defined period to see all trends\n• Results should be used as the initial base for routine sampling scheme\n• Revalidate sampling plan in case of any modification\n8.2 Routine Sampling\n• Results of validation phase are used to set up the ongoing routine sampling\n• Sampling points should be rotated in terms of sampling time and position on the swabbed surface.\n• If food contact surfaces are to be tested for pathogens (based on risk assessment and validation phase results), there must be a “hold and release policy” in place of the final product production, as a positive food contact surface means the product is contaminated.\n• For pathogenic microorganism run a Swabbathon of non-food contact surfaces once per quarter and adjust according to the results. Recommended total samples number 50-70. High risk area: >40% (Z1 >30%; Z2 >40%; Z3 >30%)\n8.3 Investigation/troubleshoting sampling\n• Identify new sampling locations when it is needed, based on internal risk analysis                                                 Use Swabbathon to establish baseline or to understand full scope of the contamination\n• Use Vector swabbing to investigate the source and the spreading of contamination. Establish vectors in all directions",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-7",
              "question": "Sampling frequency",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-16",
              "question": "Develop sampling schedule for routine and investigational sampling. After a period of a few months within the specification (Tables 5 and 6), the sampling frequency in the specific area can be reduced based on risk assessment",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-17",
              "question": "High Risk areas must be sampled at a higher frequency.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-18",
              "question": "Sampling must be conducted at different days of the week to get full information about the production cycle. Consider seasonal changes if expected to have higher contamination or micro growth in some seasons rather than others",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-19",
              "question": "Schedule different production shifts if there is production operation or the location is on Stoppage mode",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-20",
              "question": "Positive results must trigger investigational extensive sampling as part of corrective actions.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-8",
              "question": "Verification of sampling",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-22",
              "question": "The relevance of schedule and sampling scheme must be regularly verified (based on trend analysis and additional investigation sampling) to make sure that the monitoring remains dynamic and do not provide a false sense of security.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-9",
              "question": "Sampling methods",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-24",
              "question": "Multiple sampling approaches must be taken as part of a robust EMP because microorganisms settle on surfaces and are often spread via the air.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-25",
              "question": "Follow Environmental Sampling Technique (SM-PR-694) for surface sampling and analysis methods.\n16.1 Swabs or sponges are to be used for direct contact surfaces and non-direct contact surfaces\n• Facility Surface Swabbing (e.g., drains, walls)\n• Equipment Swabbing\n16.2 Air sampling:\n• Use Air sampler as preferred sampling method following KORE SM-PR-601\n• Air samples results expressed as cfu/m3",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-26",
              "question": "Do not use rapid microbiology methods that measure total ATP, rapid bioluminescence for Environmental monitoring program. NBB can be used as additional tool for EMP.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-10",
              "question": "EMP Sampling Plan",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-28",
              "question": "Procedure for sampling and testing must include the following:\n• Selected sampling sites at each frequency (e.g., random selection, all identified sites rotated through on a monthly basis)\n• Tools used for sampling (e.g., sponges, swabs)\n• Aseptic sampling procedures\n• Test methods for each target organism (including confirmation test methods where applicable) or Training requirements for staff performing sampling\n• Recordkeeping and data trending requirements\n• Preventive and Corrective actions",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-29",
              "question": "Sampling plans shall be reviewed at least every year. Alarm levels should be set after establishing the baseline. Alarm levels should be reviewed at least 6 months after the program has started.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-11",
              "question": "Recordkeeping and Data trending requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-31",
              "question": "Records must include\n• Sample identification logbook\n• Trend analysis\n• RCA (Root Cause Analysis) // CAPA (Corrective Action / Preventive Action)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-32",
              "question": "Regular trend analysis must be used to identify any negative trends versus established alarm level and trigger corrective actions when appropriate.\nNote: It is extremely useful to have a computer-based spreadsheet for tracking results and documenting corrective actions.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-SEC-12",
              "question": "Communication and corrective actions",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-34",
              "question": "All out-of-specification results must be communicated immediately, before retesting.\n22.1 Develop communication route in case of out-of-specs results and agree with stakeholders.\n22.2 Plant must develop a predetermined action plan that would be implemented in the event of a pathogen-positive environmental sample result. The action plan should be specific for each of the four zones in different hygienic areas.\n22.3 Root Cause Analysis (RCA) must be employed immediately to investigate out of specification results. Corrective actions should involve sustained investigative sampling to identify the source of contamination. Personnel involved in RCA should aim to “seek and destroy contaminants.”",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-35",
              "question": "All contaminated surfaces must be thoroughly re-cleaned and sanitized.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "EMP-36",
              "question": "After implementation of corrective actions sampling must be performed as a verification step and prior to releasing the line or production area. Resume to normal sampling after at least 3 consecutive conforming results.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-production-process-and-monitoring-checklist",
        title: "KORE QFS Internal Audit Checklist — Production Process and Monitoring",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Production Process Monitoring and Control. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "PPM-SEC-1",
              "question": "General requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPM-1",
              "question": "Follow this requirement to identify important parameters to be included in production process monitoring which can impact quality and food safety. Follow operating unit (OU) requirements to add additional parameters.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPM-2",
              "question": "Implement a sampling and testing program based on those parameters within the production process to ensure that products and packages meet company specifications in the tables below and/or fit-for-purpose specifications developed by the OU as listed in the Master Mixing Instructions (MMI), and/or other TCCC specifications",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPM-3",
              "question": "Identify the critical parameters that require statistical process control (SPC) to ensure compliance to critical release specification criteria or implement SPC as required by OU.\n2.1 Perform process capability (Cpk) studies on these parameters.\n2.2 Calculate control limits.\n2.3 Develop measures to ensure Cpk values > 1.33 or, alternatively, Ppk values > 1.00.\n2.4 Develop measures to ensure control limits are more restrictive than specification limits.\n2.5 Initiate a reassessment of the control limits through a process capability study when major changes are made to a process through maintenance or equipment upgrades.\n2.6 Perform a corrective action when Cpks/Ppks do not meet requirements. Production can continue if the released products meet company specifications.\n2.7 For critical parameters that are continuously monitored on-line and/or on all samples, while statistical sampling and testing is not required, the process control is necessary to monitor the trend in deviation, perform Cpk study etc.\n2.8 Ensure that released products meet company specifications.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPM-4",
              "question": "The manufacturing plant must designate the authority and responsibility of personnel who can make changes to control settings.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPM-5",
              "question": "Ensure that equipment and processes are fit-for-purpose and capable of manufacturing finished products that meet TCCC specifications",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPM-6",
              "question": "Ensure that purchase contracts for new equipment contain agreed-upon performance standards for process capability to meet the capability requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPM-7",
              "question": "Demonstrate that performance standards are met for equipment or process validations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PPM-8",
              "question": "Use targets and tolerances from Table 1, MMI, OU instructions, other KORE requirements, or any combination of these for the implementation of the monitoring programs defined in requirements above.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-marketplace-monitoring-checklist",
        title: "KORE QFS Internal Audit Checklist — Marketplace Monitoring",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Marketplace Monitoring. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "MM-SEC-1",
              "question": "General requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-1",
              "question": "Store, ship and display products and packages in a manner that protects quality & food safety and maintains and enhances brand reputation & image. Include the following(see module req)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-2",
              "question": "Process to remove products and packages from the trade that do not meet quality, food safety, or regulatory requirements. Include considerations where product is owned by customers that must be managed to prevent impact to brand image and reputation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-3",
              "question": "OU-approved program to monitor age and rotation of company products during distribution and in the marketplace",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-4",
              "question": "OU-approved dispensed beverage quality monitoring program for water, ice, and finished dispensed beverages.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-5",
              "question": "Programs to maintain the quality and effective use of Company images and trademarks as part of route to market and point of sale / point of purchase activities. This should include but not limited to the following:\no Condition of branded trucks and company vehicles (clean, well maintained). Includes quality of graphics and images (where used)).\no Condition of immediate consumption equipment including coolers, vending machines, dispensers etc (clean, well maintained and safe to operate)\no Condition of signage, point of sale/point of purchase materials\no Conditions of facilities known to be associated with manufacturing, handling and distribution of Company products (i.e., maintenance of grounds and facilities)\no Clothing/uniforms worn by bottling personnel who directly interact with the customer or members of the general public",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-SEC-2",
              "question": "Test",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-7",
              "question": "Use targets (T) and tolerances from Table 1, MMI, OU instructions, other KORE requirements, or any combination of these for the implementation of the monitoring programs defined in requirements above",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-8",
              "question": "Product-specific attributes may be provided in the MMI and always supersede those in the table below.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-SEC-3",
              "question": "Scope Packaging Specifications",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "MM-10",
              "question": "The table below indicates to which packaging types the above packaging specifications apply.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-sensory-testing-checklist",
        title: "KORE QFS Internal Audit Checklist — Sensory Testing",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Sensory Testing. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "ST-SEC-1",
              "question": "General requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-1",
              "question": "Perform sensory testing for ingredients and finished products to ensure compliance. Refer to tables below",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-2",
              "question": "Ensure that sensory testing is performed by a trained and qualified sensory panel. Ensure training for sensory panel members is performed using company-approved, core and specific off-note test kits. Contact Coca-Cola Analytical Services (CCAS) or CPS Sensory lead for more information on company-approved sensory kits",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-3",
              "question": "Ensure that every manufacturing facility has a certified bottler sensory leader.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-4",
              "question": "The Bottler Sensory Leader and back-up must be certified upon successful completion of a recognized sensory training program, by an authorized TCCC associate (Center, CCAS or BU) or through an authorized external partner.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-5",
              "question": "The certified bottler sensory leader role includes the following responsibilities:\n• Determine sensory panel training needs\n• Recruiting, selecting, screening and training sensory panel members per training program requirements.\n• Ensuring effective implementation of relevant sensory testing protocols (for ingredients/finished products).\n• Co-ordinating site participation in the Sensory Program Proficiency Scheme (SPPS).\n• Continuously reviewing the program effectiveness",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-6",
              "question": "Conduct sensory preparation and testing in an area/location that allows samples to be prepared hygienically and tested under the following conditions:\n• Free of extraneous odors, noise, or other distractions.\n• Bright and evenly illuminated with minimal or no shadows.\n• Separation of panel members to ensure independence of test results",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-7",
              "question": "Conduct sensory testing in accordance with the following test protocol and Tables below. Follow all applicable KORE standard methods.\n5.1.1 For first time production, obtain a standard sample from R&D / Product Developer/OU. If it is not possible to obtain a standard sample, refer to R&D/OU for guidance",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-8",
              "question": "For other types of non-beverage products (e.g. ice cream, tea powder, cheese, yoghurt), contact the respective Coca-Cola Analytical Services (CCAS) Sensory Lead to determine the best training methods (including off-notes) to use.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-9",
              "question": "Company, franchise bottling partner manufacturing facilities, contract manufacturing facilities and merger & acquisition facilities must participate in the Company-defined Sensory Program Proficiency Scheme (SPPS) on a quarterly basis.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-10",
              "question": "Individual Panel members are required to:\n• Participate in a minimum of 2 rounds out of 4 consecutive rounds.\n• Achieve a minimum average score of 75% for core scheme over the previous 4 rounds.\n• Achieve a minimum score of 75% correct in the detection of off-notes. (Discernment = correctly identifying \"in\" from \"out\" samples.)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-11",
              "question": "If the minimum average score of 75% is not met, re-train and re-qualify panelists on the detection of off notes. If attendance requirement is not met retrain and re-qualify.\n• Proficiency criteria should be reset from the re-qualification date.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-12",
              "question": "The sensory leader must determine any additional training needs for capability development based on routine monitoring of the program and SPPS results",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-13",
              "question": "Re-screen and re-train panel members if panellists have been absent and not participated in sensory evaluations for ≥ 12 months.\n8.1.1 Re-screen includes panel Consent and Basic Acuity Screening includes Vision Test, Aroma Test and Basic Taste.\n8.1.2 Re-train includes off-note training and qualification",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-14",
              "question": "For New sensory off-notes obtain approval from the respective Coca-Cola Analytical Services (CCAS) sensory lead, before introducing the new off-notes for sensory panel member training. New sensory off-notes must be confirmed as FEMA-GRAS before they are approved for use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-15",
              "question": "Determine the need, establish the validation process and ensure effectiveness of non-human sensory technology.\n• Non-human sensory technology can be used to augment human sensory testing. Non-human sensory technology must not replace human sensory testing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-SEC-2",
              "question": "Sensory Evaluation Test Protocols",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-17",
              "question": "Conduct sensory evaluations using a qualified sensory panel according to the tables below. The tables list the minimum number of panelists although more panelists may be used based on business unit’s risk assessment.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-SEC-3",
              "question": "Product Release and Disposition Decision Tree",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "ST-19",
              "question": "interpret individual sample results in the following manner (refer to decision tree below as an example):\n• If all the panelists find the sample to be characteristic and with no off-notes (In) against a reference control sample, the sample meets specification.\n• If > 50% panelists find the sample uncharacteristic or find off-notes against a reference control sample (Out), the sample is nonconforming. Place the product on hold, handle product as nonconforming and initiate a corrective action.\n• If ≤ 50% panelists find the sample uncharacteristic or finds off-notes (Out), assess the sample again using a different qualified panel with at least the same number of panelists.\no If none of the additional panelists detects an off-note, the sample meets specifications (In).\no If one or more of the additional panelists find the sample to be uncharacteristic or find an off-note (Out), the sample is nonconforming. Place the product on hold, handle the product as nonconforming and initiate a corrective action.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-cleaning-and-sanitation-checklist",
        title: "KORE QFS Internal Audit Checklist — Cleaning and Sanitation",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Cleaning and Sanitation. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "CS-SEC-1",
              "question": "General requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-1",
              "question": "Design and construct the line layout, internal structure, equipment, and utensils to ensure effective cleaning and facilitate good hygiene",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-2",
              "question": "Document and implement a cleaning and sanitizing program that ensures manufacturing equipment, and the manufacturing plant infrastructure are sanitary, and free from crosscontamination (e.g., previous products, allergens, residual cleaning, and sanitizing agents)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-3",
              "question": "The program must meet applicable regulations and include:\no Areas, equipment, and utensils to be cleaned and/or sanitized\no Roles and responsibility for the tasks specified\no Line layout and inspection plan for piping, spray balls, sight glasses, sample ports, valves, and tanks\no Validation of cleaning and sanitizing procedures, equipment, frequencies, agents, and technologies\no Monitoring and verification plans\no Post-clean inspections after CIP/COP to confirm effectiveness\no Pre-start-up verifications before production commences\no The amount of time equipment can remain idle between usage\no Re-validation of cleaning and sanitizing system\no Demonstrated evidence that no residual chemicals are present before use, except when using terminal sanitizers\no Microbiological monitoring plan to ensure the effectiveness of cleaning and sanitizing, including the cleaning and sanitizing equipment\no Root cause analysis and corrective action when there is deviation detected in the program\no Production of Kosher products may require alternate cleaning and sanitizing procedures for changeovers.\noEstablish kosher procedures based on local rabbinical guidelines.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-4",
              "question": "Cleaning and sanitizing agents and chemicals must be clearly identified, stored separately, and used only in accordance with the supplier’s instruction.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-5",
              "question": "All cleaning and sanitizing agents and chemicals used on equipment and surfaces deemed as food grade and have the potential to come into contact with product must be demonstrated as suitable for use on food contact surfaces.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-6",
              "question": "Cleaning and sanitizing parameters (i.e., time, temperature, and titration) must be established by the operation based on the chemical supplier recommendations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-7",
              "question": "Ensure the traceability of agents/chemicals used for cleaning and sanitizing.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-SEC-2",
              "question": "Cleaning Effectiveness Validation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-9",
              "question": "Follow Equipment, Technology and Process Change Validation (QFS-RQ-400). Additional OU specific validation requirements should be included as part of the process validation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-10",
              "question": "Upon installation of the line, perform an initial cleaning validation to demonstrate that the CIP/COP systems and/or practices can achieve the desired cleaning objectives.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-11",
              "question": "Clarify the responsibility of validation team and success criteria of cleaning effectiveness validation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-12",
              "question": "All surfaces that come into contact with product must be tested including tanks, pipework, heat exchangers, valves, filler heads",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-13",
              "question": "As part of the validation process, determine the most effective test (e.g., swab test, CIP rinse water microbiological test) to be performed to confirm cleaning and sanitation performance.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-14",
              "question": "Where applicable and deemed critical to the quality and safety of the product, conduct tests on external surfaces of equipment to ensure effectiveness of the cleaning and sanitation process on the processing environment (e.g., CIP/COP effectiveness)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-15",
              "question": "Validate cleaning and sanitizing procedures, equipment, frequencies, agents and technologies, critical components setting (e.g., flow rate, contact time, temperature, concentration of agent) as per OU validation requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-16",
              "question": "Other cleaning and sanitizing methods may be considered based on validation and OU approval, e.g., electro-chemically activated (ECA) water. Refer to Cleaning and Sanitizing Playbook for more information on alternative methods.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-17",
              "question": "Cleaning validation must take into account the worst-case scenario of product to be run. For example, when there are multiple allergen products produced on the same line, the line must be validated to clean the product that contains most allergen ingredient.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-18",
              "question": "Re-validate the cleaning and sanitizing system when any significant change happens to the manufacturing process or the validated cleaning process. Follow any additional OU requirements.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-19",
              "question": "Consider potential changes where re-validation may be required to include but not limited to the following:\noChanges in piping, installed equipment, programming, process flow\noNew products or changes to product, formula\noAlternate processing temperatures\n○ Increased production running time between CIPs\n○ Implementation of an aseptic intermediate cleaning between production runs\n○ Change in type of detergent or sanitizing agent, or supplier\n○ Change in critical components: detergent concentration, contact time, temperature,\nflow rate\n○ New cleaning and sanitizing methods (e.g., ECA, ultrasonic cleaning etc.)\n○ Changes to the programmable logic controller (PLC) and CIP sequencing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-SEC-3",
              "question": "Monitoring and Verification",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-20",
              "question": "Monitor the real time measurement of critical components of cleaning and sanitizing process, such as flow rate, contact time, temperature, concentration of agent.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-21",
              "question": "Where real time measurement is not possible, operations must use alternative means to ensure the effectiveness of the cleaning and sanitation process. (e.g., increase frequency of inspection and testing)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-22",
              "question": "Maintain and validate a plant-specific changeover matrix, which is reviewed and updated regularly and on the introduction of new formula and new products",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-23",
              "question": "Conduct visual inspection on the equipment as a part of post-clean inspection and/or prestart-up inspection to assess the effectiveness of cleaning procedure and ensure no visible product residue.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-24",
              "question": "In addition to visual, the presence of odor (past flavor, cleaning agent etc.) should also be considered in determining the effectiveness of the cleaning and sanitation process.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-SEC-4",
              "question": "Product Changeover",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-25",
              "question": "The product changeover matrix must be developed, maintained, and validated, based on product specific characteristics and local regulation. Refer to the Master Mixing Instructions and R&D for product characteristics and special instructions.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-26",
              "question": "Every piece of process equipment must be cleaned and sanitized based on the changeover matrix (e.g., syrup processing equipment, blending, carbonating, filling equipment, pipes etc.). At least weekly a cleaning and sanitizing must be performed on every piece of process equipment.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-27",
              "question": "Develop a changeover matrix using requirements and tables below as a minimum in addition to local regulation. Additional cleaning procedures and modifications may be implemented based on risk assessment and validation and approved by the OU.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-28",
              "question": "The changeover matrix must be developed for each individual product and must be updated whenever a new product is launched. Refer to Appendix 1 example.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-29",
              "question": "Choose the most stringent procedure when a changeover involves multiple variables.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-30",
              "question": "Variations in the cleaning and sanitizing methods must be validated and approved by OU, as well as changeovers involving attributes not listed in the following requirements and tables.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-SEC-5",
              "question": "External sanitation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-31",
              "question": "For more information relevant to external sanitation (e.g., Cleaning-out-of-Place, dry cleaning, housekeeping), refer to Cleaning and Sanitizing Playbook (Knowledge Sharing).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-32",
              "question": "The order of external sanitations should be done from the dirtiest areas to the cleanest areas (i.e., start with drains, floors, and walls, then conveyors, and end with filling equipment and food contact surfaces).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-33",
              "question": "Sanitation of the external surface of filling equipment are to be completed prior to CIP sanitation step of the internal surfaces",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-34",
              "question": "External sanitations can be done in parallel while the CIP is cleaning as long as the external finishes prior to the internal sanitizing step.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-35",
              "question": "Any exception to the above must be validated to confirm the effectiveness of the process used.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-36",
              "question": "In case the order is altered, the sanitation vendor should be consulted, and a facility level procedure drafted, and risk assessment maintained for future reference.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-37",
              "question": "Do not use high pressure washers in case of aerosolize contaminants and microbes into the air and contaminate/re-contaminate food contact surfaces",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-SEC-6",
              "question": "Deviation Control",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-38",
              "question": "Identify and control potential impacted finished products.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-39",
              "question": "Initiate root cause analysis, identify, and control potential impacted finished products, and conduct corrective actions to assess the efficacy of the program, potential food safety and quality impact on the batch when there is deviation detected in the cleaning and sanitation procedure (i.e., any deviation in the parameter monitoring of CIP program, unsatisfactory microbiological test results or trends).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-SEC-7",
              "question": "Test",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-40",
              "question": "Develop a cleaning and sanitizing effectiveness monitoring program using Tables 1–14 as a minimum. Additional testing and modifications may be implemented based on risk assessment and approved by the OU.\n• Perform physical and chemical test to detect chemical residue, product residue.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "CS-41",
              "question": "Perform microbiological monitoring on air samples (to monitor airborne microorganisms in key processing areas), final rinse water samples, and swab samples. Refer to Environmental Monitoring Program for further information.\n• Sample the final rinse water from the equipment only when the rinse water temperature is below 40°C (104°F).\n• Fillers with CIP cup attachments may take one sample from the CIP return line instead of the sample number listed.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-food-allergen-and-control-checklist",
        title: "KORE QFS Internal Audit Checklist — Food Allergen and Control",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Food Allergen Management and Control. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "FAC-SEC-1",
              "question": "General requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-2",
              "question": "Manage food allergens and sensitivities listed in regulations specific to the country of manufacture and sale. Where no regulations exist, follow the list from the Codex.\n1.1 Sulfites in caramel-containing beverages are exempt from the requirements based on assessment by global Scientific and Regulatory Affairs (SRA).\n1.2 Sulfites from other sources must follow these requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-3",
              "question": "Allergen hazards shall be fully addressed within factory Hazard Analysis Critical Control Points (HACCP) system. Use HACCP approached decision tree to assess and control allergen hazards",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-4",
              "question": "All factories using any critical allergens as ingredients must integrate those products into the HACCP study that do not mention the allergen in the ingredient statement (i.e., products normally considered to be free from the allergen), in order to assess the risk of allergen cross-contact.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-5",
              "question": "The risk of cross-contact should be considered through ingredients, through storage facilities, and production trials, etc",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-6",
              "question": "Where the HACCP study shows that control measures are sufficient to guarantee that the potential cross-contact can be prevented, the relevant Critical Control Points (CCPs) and the associated monitoring must be included in the factory HACCP plan.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-7",
              "question": "Where the HACCP study shows that Good Manufacturing Practices (GMP) and other reasonable control measures cannot exclude the possibility of a product contamination by a critical allergen, then the respective finished product must declare the allergen on the label.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-8",
              "question": "Identify and label food allergens, food allergen by-products, food sensitivities, and any sensitive materials handled onsite as required by regulations specific to the country of manufacture and sale.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-9",
              "question": "Verify labeling and other documentation from CPS and other suppliers for materials and ingredients shipped directly to the facility.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-10",
              "question": "Design and implement a food allergen management program that meets the requirements of the “Codex Alimentarius Code of Practice on Food Allergens Management for food business operators” (External) and/or regulatory requirements (local and country of sales), whichever is stricter",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-11",
              "question": "Conduct a risk assessment and implement an allergen control plan using a crossfunctional team that includes, but not limited to an allergen process flow diagram that identifies where allergens are stored, handled and identifies areas where controls should be applied. Refer to the Technical Implementation Guide (Knowledge Sharing).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-12",
              "question": "Ensure the allergen management program includes at a minimum, but not limited to the following controls:\n• Clean-in-Place (CIP)/Clean-out-Place (COP) systems\n• Ingredient receipt and storage (must be translated to local language in case of imports)\n• Introduction of new allergen containing product to facility or line\n• Personnel Hygiene for people working with allergens, specifically powdered allergens\n• Auxiliary materials and processing aids\n• Returnable packaging process\n• Finished product storage and distribution\n• Spills management for transportation\n• Blending tools, containers and utensils\n• Packaging integrity of ingredients/materials and products\n• Traffic patterns for people working with allergens\n• Internal training program that includes allergen/sensitivity control and awareness of all allergens in the facility",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-13",
              "question": "When introducing new products, and before first commercial production run, inform the OU of any identified allergen cross-contamination risks after implementing the validated allergen management program.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-SEC-2",
              "question": "Receipt, Storage and Handling",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-15",
              "question": "Maintain documentation and records relating to allergen ingredients, specifications, allergen mapping (to know what is where and how transferred/routed in the factory), validations, verification and monitoring plans, and training.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-16",
              "question": "In the case of direct supply of materials, with the supplier's management being under the responsibility of the bottling partner or joint venture, ensure that allergen information is updated based on the SRA Global Food Allergens List (Knowledge Sharing) and the form TCCC Global Food Allergen and Sensitivity Template (SU-FM-110) for each material and supplier",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-17",
              "question": "All information and updates must be communicated by the form SU-FM-110.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-18",
              "question": "The up-to-date approved artwork must be checked against the received labels and Master Mixing Instructions (MMIs) must be checked before use",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-19",
              "question": "Establish and communicate instructions to transporters to store allergen-containing products below non-allergen containing products during transportation.\n8.1 Verify bulk tanker and relevant accessories cleaning and sanitation records upon receipt of ingredients and materials, if applicable.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-20",
              "question": "Establish and implement storage and handling controls to prevent leakage/spills and crosscontamination from allergen-containing ingredients and/or finished products.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-21",
              "question": "Spill control procedures must be in place to prevent cross-contamination during storage, handling or distribution.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-22",
              "question": "Use dedicated protective clothing and equipment when handling powdered allergens that are not used in other areas of the facility. Follow Respiratory Protection (OHS-RQ-210) for PPE requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-23",
              "question": "Storage control must include storage of products, and ingredients, containing allergens in order to avoid cross-contamination in case of leakage/spills. Areas and pallet positions intended for storage of products, and ingredients, containing allergens must be mapped",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-24",
              "question": "Use dedicated processing lines and equipment to prevent allergen cross contact. When not feasible, conduct a risk assessment and establish validated controls to mitigate the risk of allergen cross contact",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-25",
              "question": "Establish a training plan and carry out annual training, and refreshers, in allergen awareness and allergen issues for all relevant factory personnel, including production, QA, engineers, contractors and visitors, etc.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-SEC-3",
              "question": "Effectiveness of Allergen Management Plan",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-27",
              "question": "Assess the effectiveness of the allergen management plan throughout the three key phases as follows.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-SEC-4",
              "question": "Validation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-29",
              "question": "Conduct validation when new lines are implemented, changes in the process or cleaning are implemented, or when introducing new allergens.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-30",
              "question": "For a proper validation, manufacture the allergen containing formulation, perform established cleaning procedures and finalize by manufacturing a formulation that doesn’t contain the allergen",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-31",
              "question": "Take samples from CIP rinse water, line swabs and finished product and have them tested by an external accredited lab.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-SEC-5",
              "question": "Verification",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-33",
              "question": "Only perform verification after successful completion of validation, to confirm that established controls give satisfactory results.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-34",
              "question": "Take samples from critical verification points and test in house or with an approved, accredited laboratory",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-35",
              "question": "Verification step must be performed ensuring that all parameters defined in the validation are still being followed correctly.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-SEC-6",
              "question": "Monitoring",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-37",
              "question": "Perform routine monitoring, based on risk assessment, that confirm that measurements taken are consistently effective to prevent cross contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-38",
              "question": "At a minimum, monitor CIP/COP rinse water or dry cleaning to ensure effective removal of food allergens/sensitivities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-39",
              "question": "Define monitoring frequency as required.\n• Samples taken during this phase can be of broad spectrum, they do not need to be allergen specific.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-SEC-7",
              "question": "Cleaning and Sanitizing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-41",
              "question": "Validate changeover/cleaning procedures to ensure the effective removal of food allergens/sensitivities.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-42",
              "question": "Validate the changeover/cleaning procedure for all allergens/sensitivities in a given product category (e.g., tea and juices) using the same production line, the same configuration of the line, the same process conditions and the same cleaning regime (time, temperature, concentration, cleaning product). For each allergen/sensitivity to test, choose the formula(s) with the highest load",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-43",
              "question": "Use commercially available test kits or a general protein test for specific allergen to validate effective removal of food allergens/sensitivities. Use an approved third-party lab to confirm results are accurate.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-44",
              "question": "Ensure selected test kits are fit-for-purpose. Refer to Allergens Testing procedure: Key considerations and Checklist (Knowledge Sharing).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-45",
              "question": "Validation does not apply to equipment dedicated to a single sensitivity or allergen (e.g. sulfite or dairy).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-46",
              "question": "Use a dedicated CIP, COP or dry-cleaning equipment to ensure effective removal of allergens. Validate an alternative if the dedicated CIP solution is not available.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-47",
              "question": "Do not re-use CIP solution that contains allergens on any equipment used for the manufacture of products not containing allergens or contains a different allergen. When not feasible, conduct a risk assessment and establish validated controls to mitigate the risk of allergen cross contact.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-48",
              "question": "Perform a visual inspection and clear the entire production line before running a product that does not contain the same allergen (or an allergen-free product).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "FAC-49",
              "question": "Follow the established change management program any time the process, equipment, product profile, cleaning and sanitizing, or regulations change.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-warehouse-and-distribution-checklist",
        title: "KORE QFS Internal Audit Checklist — Warehouse and Distribution",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Warehouse and Distribution. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "WD-SEC-1",
              "question": "General requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-1",
              "question": "Use only warehouses and distributors that have been reviewed and authorized either by the Operating Unit (OU) or by the bottling manufacturing plant/partner.\n1.1 Warehouses and distributors should be authorized using the criteria outlined in this document.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-2",
              "question": "Follow local regulations, or Company requirements (the stricter of the two) for storage, transportation, and distribution conditions.\na.  Ensure the traceability, quality, food safety and security of products/packages are not adversely affected by these factors, including when using third-party transportation companies.\nb. Specific to Global Food Safety Agreement between TCCC and McDonald’s, ensure TCCS managed third-party warehouse and distribution centers meet the requirements of the McDonald’s Distribution Quality Management Process (DQMP) or are certified to a recognized GFSI scheme and to ISO 9001 (External).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-3",
              "question": "Ensure that the product recall, withdrawal, and replacement program is well established, implemented and effective. Refer to General Operating Requirements (PRP-RQ-001) and Operating Unit Governance (OU-RQ-101).                                                                                                                                                                                                                                                                           Include warehouse and distribution as part of any traceability or mock recall exercises.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-4",
              "question": "Ensure the transfers during shipment between partial truckloads have chain-of-custody documentation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-5",
              "question": "Store, ship, and distribute ingredients, intermediate/finished products, and packages in a manner that protects the environment and safety of the personnel handling the materials.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-6",
              "question": "Store and ship ingredients, intermediate/finished products using a First Expired, First Out (FEFO) rotation principle",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-7",
              "question": "Where samples are collected by a regulatory official, or an approved third-party, during shipment, manufacturing, or storage, notify the OU of the actions taken.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-8",
              "question": "Sampling must be witnessed and documented by a bottling operation associate, Company representative, or an authorized representative of the operation (when performed in transit to an operation)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-9",
              "question": "Ensure sampling does not adversely impact the quality and integrity of the product (i.e., done under suitable conditions to prevent contamination). On receipt, place the ingredient “on hold” pending either regulatory results or OU approval.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-10",
              "question": "If there is a concern related to the integrity of ingredients as a result of sampling by either a regulatory authority or other third-party, isolate the shipment/material and contact the OU for further disposition",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-11",
              "question": "Apply new tamper-evident seals after sampling. Record the number of the tamper evident seal on the supporting documentation",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-12",
              "question": "Sampling of either concentrate or beverage bases should be avoided. However, if sampling is conducted, contact CPS for information and further disposition.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-SEC-2",
              "question": "Security",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-13",
              "question": "Ensure all warehouses and distribution centers are adequately protected from unauthorized entry.\na. All warehouse and distribution centers need to have physical security control (i.e., fencing, security personnel, security monitoring devices) to prevent tampering or theft, and monitor incoming and outgoing receipt.\nb. Ensure access control for drivers\nc. Drivers should stay in indicated areas during loading/unloading.\nd. Drivers should comply to Company workplace safety requirements (i.e., wearing safety shoes, wear harness when work at height, register log of trucks).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-SEC-3",
              "question": "Receiving",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-14",
              "question": "Physically inspect transportation containers/trucks for any potential physical, chemical, or microbiological cross-contamination hazards before loading/unloading materials.                                                                                                                                                                                                    As part of the inspection process, ensure no off-odors are present that could lead to the contamination of raw materials or final products.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-15",
              "question": "Vehicles used for transportation of materials should be sealed using a unique, identifiable tamper evident seal to protect against unauthorized access to materials during transit.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-16",
              "question": "Tankers used for transportation of bulk ingredients (e.g., water, juice, HFCS, gases) must have tamper evident seals present on all tank entry and discharge points. Verify and record seal numbers on receipt.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-17",
              "question": "Unique supplier identifiable tamper evident devices must be present on all ingredient containers and primary packing.                                                                                                                                                                                                            Tamper evident security devices should be traceable back to the supplier.                                                                       Any material received with tamper-evident feature not complying with the above requirements (excluding exceptions as primary package shipping configuration and new refillable primary packaging containers), should be isolated and not used in production",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-18",
              "question": "For ingredients that are required to be shipped either refrigerated or frozen, ensure that these conditions can be confirmed at the time of receipt.\na.  Any ingredient found outside of temperature specification should be isolated. Contact the OU or CPS for further disposition.\nb.  Confirm required temperature has been maintained throughout shipment through a temperature-recording device",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-SEC-4",
              "question": "Storage",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-19",
              "question": "Store ingredients, intermediates, packaging materials and finished products in clean, dry, well-ventilated spaces protected from pests, dust, condensation, fumes, odors, elements like sun, rain, etc. or other sources of contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-20",
              "question": "Store ingredients, intermediates, primary packaging and finished products in a manner that prevents them from being contaminated (e.g., on racks or pallets in designated areas). Do not store directly on the floor.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-21",
              "question": "Keep enough distance from walls to facilitate effective cleaning and prevent harboring of any pests, insects, or rodents (recommended minimum of 18 inches or 45 cm).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-22",
              "question": "Ensure the storage racks and pallets are in good condition to hold the intended load and height. Refer to Material Handling (OHS-RQ-195)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-23",
              "question": "Store away from direct sunlight to protect from oxidation and/or discoloration",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-24",
              "question": "Prevent cross-contamination of allergenic and non-allergenic materials during storage, handling, and distribution.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-25",
              "question": "Segregate the storage of allergenic from non-allergenic materials. In case they must be stored in the same rack, ensure the allergenic materials are placed on the floor layer or below the non-allergenic ones.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-26",
              "question": "Identify and segregate nonconforming materials, including products and ingredients without proper tamper-evident features",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-27",
              "question": "Gasoline- or diesel-powered fork-lift trucks should not be used in ingredient or product storage areas to prevent contamination from dust and fumes",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-SEC-5",
              "question": "Shipping",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-28",
              "question": "Comply with local and international shipping regulations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-29",
              "question": "Vehicles, conveyance, and containers should be maintained in a clean and good condition and in a state of repair and provide protection against damage or contamination of the materials and products.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-30",
              "question": "All vehicles should be inspected to confirm that all necessary safety devices are in place and that the vehicles are roadworthy. Refer to Fleet Management (OHS-RQ155).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-31",
              "question": "Where the same vehicles, conveyances and containers are used for food and non-food products, cleaning should be carried out between loads. Cleaning evidence should be available upon request",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-32",
              "question": "Where the bottling operation or distributor has direct ownership or is responsible for the vehicle, ensure cleaning procedures are in place to maintain vehicle in suitable condition (i.e., free from odors, dust, dirt, pests).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-33",
              "question": "In case of combined transportation, ensure the products are not transported together with hazardous, chemicals, toxic and polluting, mechanical parts, oily parts, green plants, seafood, exposed meat, or goods with strong odor",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-34",
              "question": "Bulk containers shall be dedicated to food or a specified material as per local regulations or OU requirements.\na. Ensure bulk tank washing procedures are in place and effectively implemented.\nb.  Employ tamper-evident features on bulk containers.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-35",
              "question": "Each operation must ensure the following:\na.  The status of all materials and finished products in the warehouse and distribution center is clearly identified, either physically and/or in the inventory management system (e.g., SAP, MRP, manually or other release systems).\nb. Clearly identify person/s responsible for managing the disposition of all materials and finished products.\nc. Authority for changing the status of any material (i.e., authority for release and for blocking) is clearly designated in writing.\nd. Ensure all requirements have been met prior to final product release.\ne. Process for communicating materials and product disposition between production and warehouse/shipping/logistics.\nf. Records that provide traceability of decisions and actions taken including persons responsible.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-36",
              "question": "For materials and finished products that are blocked or awaiting release, the warehouse and distribution must have a mechanism to identify and hold them from non-authorized dispatch",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-37",
              "question": "Each operation must ensure all testing and release requirements have been completed prior to final product being shipped to the customer or consumer.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-38",
              "question": "Products may be shipped out of the manufacturing plant to an off-site internal or thirdparty warehouse/distribution center prior to final release provided that product still remains in full control within the KO system (i.e., early release/ship on hold)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-39",
              "question": "Manufacturing plant must be able to demonstrate that final products remain under their control and that product cannot be inadvertently shipped to customers until final release has been obtained.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-40",
              "question": "OU may authorize parametric release based on manufacturing plants demonstrating critical capability of process controls.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-41",
              "question": "No operation can implement parametric release without full review and authorization by the OU following the assessment of all risks and controls.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-42",
              "question": "Only corporate and OU authorized bottler and manufacturing plant can conduct parametric release with compliance to the scope and all requirements defined in the program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-43",
              "question": "The decision for parametric release must be by product type and risk categorization i.e., the decision for one product to be allowed to be shipped under parametric release does not provide full authorization for all products to be shipped under the same conditions.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-44",
              "question": "Operations who are authorized to implement parametric release must ensure a robust and validated traceability/withdraw procedure is in place to ensure products can be withdrawn and recovered rapidly and effectively in the event non-conformities are identified in release test results",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-45",
              "question": "Provide automated, continuously recorded temperature monitoring for the storage and transportation of chilled and frozen products. Include a process for notification of out-ofspecification temperatures.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-46",
              "question": "Enclose and control the temperature of loading/shipping docks",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-47",
              "question": "Trucks transporting chilled and frozen products must be constructed, insulated, and equipped with adequate refrigeration capacity and an air delivery system to continuously maintain appropriate temperature.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-48",
              "question": "Confirm the vehicle temperature settings to confirm that the maximum allowable temperatures of the products, either according to Table 1 or local regulations, are not exceeded. Confirm that third-party trucks used for transport meet the same temperature control requirements as company owned vehicles",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-49",
              "question": "Prior to loading, confirm and record air temperature inside vehicle.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-SEC-6",
              "question": "Concentrate and Beverage Base",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-50",
              "question": "Implement a process to periodically monitor the age of ingredient and product inventory approaching expiration date.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-51",
              "question": "When the manufacturing plant is unable to use the concentrate and beverage base prior to expiration, a shelf-life extension request must be submitted to OU. Refer to OU-RQ-101.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-52",
              "question": "If shelf-life is approved for extension, ensure that the new shelf-life is clearly identified and visible on all packages.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-53",
              "question": "Ensure concentrate and beverage base is received with at least 50% or six months of shelf-life left (the shorter of the two). Any decision to accept product less than the above must be agreed between CPS, OU, and the manufacturing plant.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-54",
              "question": "Under certain circumstances, manufacturing plants may need to move concentrate and beverage base between manufacturing locations or to another bottler plant within the same country. In these instances, the manufacturing plants must seek approval from OU and ensure the following",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-55",
              "question": "The chain of custody of the beverage base and concentrate is maintained to prevent unauthorized access.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-56",
              "question": "All transfers of beverage base and concentrate follow suitable shipping conditions (clean, secure, temperature controls where applicable) to prevent deterioration of quality.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-57",
              "question": "All transfers of beverage base and concentrate comply with the company’s relevant environmental and health and safety requirements, as well as any relevant local legislation concerning the transportation of hazardous substances.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-58",
              "question": "When concentrate and beverage base are shipped under potentially abusive or extreme conditions, refer to CPS for further information.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-59",
              "question": "For direct shipment of concentrate and beverage bases from CPS to bottler location, when the shipment is under potential abusive conditions (temperature, duration of the shipment etc.) compared to the relevant information (requirement on the label, standard shipping instructions for the part concentrate, etc.), CPS must decide disposition of the materials based on risk assessment, with R&D consultation where needed. CPS must communicate the disposition decision to the bottler location. OU must be informed by the bottler when such situation occurs",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-60",
              "question": "For intermediate shipment between bottlers, the original transportation conditions (temperature, duration of the shipment etc.) must be followed. Intermediate shipment only applies for non-opened packages.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-SEC-7",
              "question": "Training",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WD-61",
              "question": "Warehouse employees need to receive training to carry out above activities, including but not limited to the storage and handling of products, loading, and unloading, inspection of vehicle condition upon receiving and shipping, FEFO, nonconforming material management, allergen control, temperature control.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-packaging-specifications-checklist",
        title: "KORE QFS Internal Audit Checklist — Packaging Specifications",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Packaging Specifications. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "PS-SEC-1",
              "question": "General requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PS-1",
              "question": "Audit Table 1 for Bottle Condition (Excluding Metal Bottles)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PS-2",
              "question": "Audit Table  2 for Cans and Other Packages Condition",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PS-3",
              "question": "Audit Table 3 for  Package Label/ACL Condition",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PS-4",
              "question": "Audit Table 4 for Package Closure Condition",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PS-5",
              "question": "Audit Table 5 for Package Closure Function",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "PS-6",
              "question": "Audit Table 6 for Date Code",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-water-for-product-manufacturing-checklist",
        title: "KORE QFS Internal Audit Checklist — Water for Product Manufacturing",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Water for Product Manufacturing. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "WPM-SEC-1",
              "question": "Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-2",
              "question": "Water used as an ingredient in product must be Treated Water unless product is\nformulated with Natural Mineral Water or Spring Water to be indicated as a label\ndeclaration",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-3",
              "question": "Water used in all manufacturing processes where water contacts product, other\ningredients, product contact surfaces, packaging exterior, cleaning and sanitizing must be validated for the application and must have Treated or Potable Water quality.\nTreated or Potable quality is required as a starting point with the understanding that an\nadded disinfectant, resulting in a disinfection residual, may be necessary and validated\nas acceptable for some applications.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-4",
              "question": "Water for uses with no potential of contact with products, packaging, processing\nequipment, and use outside of syrup or filling room environments can be non-potable\nwater if the quality of the non-potable water is acceptable for the application.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-5",
              "question": "All water sources must be approved and authorized by the Operating Unit (OU) as\nrequired in Design and Operations of Water Sources (QFS-RQ-197).\na. The OU must authorize the use of natural mineral water or spring water as an\ningredient in the finished product.\nb. Requirements for Source Water approval and authorization are in Natural\nMineral/Spring Water for Product Manufacturing (QFS-RQ-195).\nc.  Mineral or Spring Water used as declared ingredient must follow local\nregulations for treatment. Water should pass through a 0.45 micron\nabsolute filter (0.2 microns, if allowed by local regulation) at the point of use\n(before the mix tank or water production line).\nd.  Mineral or Spring Water stored before use must be stored in stainless steel\ntanks designed with hygienic standards to ensure microbiological protection\nof the tank headspace air.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-6",
              "question": "The OU is responsible for approving all water treatment systems used to produce\ntreated water.\na. If the source water is identified as Non-Potable, the OU must approve type of water\ntreatment system used to produce Potable Water for the facility, as necessary.\nb. The OU can validate and approve alternative processes which are not currently\nidentified in this document. The validation must follow the process in QFS-RQ-400.\nc. The OU and/or bottler may request TCCC to include additional approved\nprocesses that have been piloted, tested and/or validated for use by a\nmanufacturing facility.\nd. The design criteria must consider the additional impact of processing and treatment\nin the overall stability and quality of a finished beverage product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-6",
              "question": "Materials used in the construction of treatment systems must be deemed as suitable for\ncontact with drinking water or food in accordance with local regulations and/or local\nindustry standards.\nWhen local standards or regulations are not available, follow international\nstandards such as National Sanitation Foundation International (External).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-7",
              "question": "Standard operational procedures (SOP) must be developed and implemented for the\nsafe operation of a water treatment system. The procedures must include but not be\nlimited to the following:\n• Maintenance routinesUse of chemicals approved for drinking water or food production\n• Process validation for individual process steps, including flow control\n• Performance monitoring and records\n• HACCP program",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-8",
              "question": "Both NF and RO require pre-treatment to protect the membranes from abrasion, scaling\nand fouling. Pretreatment may require prior filtration processes and manufacturers\ntypically require 1 micron filter, or better, on the feed water to the membrane skid.\nPretreatment may also require addition of antiscalent chemicals or pH adjustment.\nChlorine reduction is required pretreatment for most NF and RO membranes. Most NF\nand RO membranes do not tolerate chlorine residual for extended time without\ndegrading. Cellulose acetate membranes are an exception and require a chlorine\nconcentration in the feed water to prevent microbiological degradation.\nIf a by-pass around the RO is used in order to use the RO system to regulate\nconductivity, any water that is by-passed must be filtered to ensure < 0.3 NTU before\nbeing combined with the RO permeate.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-SEC-2",
              "question": "Chlorine disinfection",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-10",
              "question": "Chlorine residual for disinfection must be measured as free chlorine residual.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-11",
              "question": "Chlorine disinfection systems for Treated Water should provide a CCT of 6 mgmin/\nL based on free chlorine residual, water pH < 9 and temperature >10oC.\nExample: For the tank with a CT of 6 minutes, a C of 1 mg/L (1 ppm) is required.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-12",
              "question": "The OU may validate free chlorine residual concentrations less than 1 ppm at the\nend of a longer hydraulic detention time by performing calculations to demonstrate\nthe minimum chlorine mass-time/L is >6.0 mg-min/L according to this process:\n• Demonstrate chlorine contact time (in minutes) with a physical tracer test or\ncalculate based on the tank hydraulic detention time capacity divided by the\naverage system flow rate, multiplied by a baffling factor of 0.2.\n• When this chlorine contact time is multiplied by the chlorine residual, the\nresultant must be greater than 6.0 mg-min/L.\n• For different water temperatures, or pH the required CCT to achieve 4.0 log\nvirus inactivation can be determined from the Table 1. At pH >9 the efficacy of\nchlorine is significantly reduced.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-13",
              "question": "Free chlorine residual greater than 0.5 ppm for incoming water from a municipal\nsupply is acceptable for chlorine disinfection without additional on-site chlorination\nunder the following conditions:\n• The free chlorine concentration in the incoming water is continuously\nmonitored with an in-line monitor.\n• Record and trend data, automatically or manually, from the in-line monitor\ndisplay every 4 hours.\n• The daily average of the recorded 4 hour recorded residuals for free\nchlorine concentration is 0.5 ppm or greater, and the minimum daily value\nis >0.35 mg/L\n• The continuous in-line monitor alarms and/or stops the process when the free\nchlorine concentration of the incoming water is below 0.5 ppm.\n• The incoming water total count is less than 250 cfu/mL and is monitored\nweekly.\n• Incoming water coliforms are not detected and are monitored weekly.\n• Stand-by supplemental disinfection system is available.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-14",
              "question": "Chloramine residual measured as total chlorine residual is not an acceptable\nchlorine disinfection alternative. If the incoming water has total chlorine residual\n(chloramines) greater than 0.5 mg/L, or has a free chlorine residual of 0.5 mg/L or\nless:\n• Chlorinate to break-point to achieve and maintain an acceptable free chlorine\nresidual, or\n• Use a different approved disinfection technology.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-SEC-3",
              "question": "Ultraviolet (UV) Light Disinfection",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-16",
              "question": "UV systems are either validated externally by a 3rd Party or they are non-validated.\nSome water treatment system sequences require a validated unit while other\ncombinations can allow use of a non-validated unit.\n• Validated units are an assurance that the unit will provide the stated required\ndose to all of the water that passes through the UV system. Installing a 3rd\nParty validated unit provides assurance that the dose required will be\ndelivered to all water treated by the unit.\n• Non-validated units deliver an average dose meaning some of the water\npassing through the unit may receive a higher dose while some water may\nreceive a lower dose. Non-validated units do not guarantee that all water will\nreceive the necessary disinfection.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-17",
              "question": "UV Dose requirements are based on Table 2. Water Treatment Process\nCombinations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-18",
              "question": "Third Party Validation\n• The UV system supplier will provide the bottler with a certification letter from\nan external third party as evidence that the third party validated the UV\nreactor’s disinfection performance at specific operating parameters that can be\nmonitored for validated units. The dose to achieve the required level of\ninactivation must be indicated in the documentation provided by the\nmanufacturer, and the visually displayed RED should match or exceed that\ndocumented required dose.\nThe validation letter must include:                                                                                                                                                                                                                                                                                               Details of validation conditions\no Validation protocol used (USEPA UVDGM, DVGM or ÖNorm as\nappropriatefor the required dose)\no Validation approach (UV intensity set point or calculated dose)\no Validation organism\no Log inactivation obtained for the target organism or reduction equivalent\ndose (RED) achieved\no Ultraviolet transmission (UVT) and flow envelope at which the system is\nvalidated",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-19",
              "question": "Production facilities cannot validate UV equipment. UV equipment\nvalidation as described above can only be performed by external third party\nproviders at the time of procurement. Evidence of validation must be\nprovided at the time of procurement.\no A validated UV system requires a germicidal sensor to measure the UV\nintensity delivered from the lamp array at wavelengths of 250 to 280 nm.\no The sensor for intensity measurement must be absolute (for wavelength\nand angular response of the sensor) and non-operator adjustable.\no If UVT was required for the validation protocol, the UV system must\ninclude an instrument for measuring the UVT or ultraviolet absorbance\n(UVA) of the water.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-SEC-4",
              "question": "Granular Activated Carbon (GAC)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-21",
              "question": "GAC is primarily used to reduce chlorine and chloramine residuals concentrations.\n10.1 All on-site water treatment for producing treated water require an activated carbon\nprocess unless all following conditions are met:\n• The system includes a Nanofiltration (NF) or Reverse Osmosis (RO)\nsystem for all treated water, and\n• The total trihalomethane concentration in the feed water to the\nmembrane system is less than 40 mg/L (Note: membrane systems do\nnot provide significant removal of volatile compounds like\nTrihalomethanes)\n• Any chlorine residual in the membrane system feed water is chemically\nquenched prior the NF/RO system.\n• The resulting membrane treated water meets the TCCC Specifications\nand local drinking water regulations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-22",
              "question": "GAC beds for chlorine reduction typically require at least a 7-minute empty bed\ncontact time.\n• GAC beds for chloramine reduction typically require a 10 – 14 minute empty\nbed contact time or require specialized catalytic GAC media designed for\nchloramine reduction.\n• GAC systems for pesticide or synthetic organic removal must be designed\nspecifically for removal of the compounds of risk. These GAC systems are\ndesigned to operate with two equal sized beds, in series, typically with each\nbed having at least 15 minutes of empty bed contact time. The first bed is the\nLEAD bed, and the second bed is the LAG bed. When breakthrough is\nobserved after the LEAD bed, the media is replaced in that bed, and the flow\nsequence through the two beds are reversed where the bed with the freshest\ncarbon becomes the LAG bed and the bed with the older carbon becomes the\nLEAD bed. Flow through the beds must be controlled to maintain the design\nsurface loading rate for the system.                                                                                                                                              Activated Carbon material must be appropriate for drinking water treatment\nwithout leaching metals into the processed water. Leaching of metals typically\nonly occurs when new carbon is placed requiring rinsing to stabilize and\nremove carbon fines.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-23",
              "question": "Use a polishing filter after GAC treatment with one of the following ratings:\n• 1 – 20 μm absolute filter or\n• 1 – 5 μm nominal filter",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-SEC-5",
              "question": "Alkalinity Reduction",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-25",
              "question": "Use one of the following treatment processes when source water requires alkalinity\nreduction:\n• Lime softening (same as hydrated lime treatment) - type of conventional\nchemical treatment\n• Ion exchange                                                                                                                                                                                          Electrodialysis\n• Nanofiltration\n• Reverse osmosis",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-26",
              "question": "Powdered Activated Carbon (PAC)\n• PAC may be added before or during conventional chemical treatment to\nprovide additional protection against seasonal taste and odor issues related to\nalgal blooms.\n• PAC does not satisfy the requirement for GAC.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-SEC-6",
              "question": "Water Storage Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-SEC-7",
              "question": "Source Water",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-29",
              "question": "Source Water may be stored in above ground tanks or underground cisterns Underground cisterns must be coated to avoid contamination from underground\nwater or other residues; ensure coating materials meet local regulatory\nrequirements for food-contact surfaces or drinking water contact.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-SEC-8",
              "question": "Treated Water",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WPM-31",
              "question": "Treated water in storage tanks may be stored chlorinated if stored prior to GAC process\nor may be stored as unchlorinated water.\na. If unprotected, treated water stored for more than six hours between processing\nand use, may have a risk of failing to continuously meet treated water\nmicrobiological specifications. If treated water is to be stored for more than six\nhours between processing and use, the facility must evaluate the need for a\nmicrobiological protection process (storage with a chlorine residual, or UV\nrecirculation), and a protection process must be implemented if risks to\nmicrobiological quality are identified.\nb.  If chlorination is selected as a stored water protection process, chlorinated\nwater in storage tanks must have a chlorine residual of at least 0.2 to 0.5\nppm free chlorine. Higher concentrations are acceptable.\nc. If UV disinfection is selected as a stored water protection process, the UV\ndisinfection dose must provide a 40 mJ/cm2 dose with an in-line\nrecirculating system. A higher dose is also acceptable.\n• Base the recirculation rate on the facility conditions and validate for\neffectiveness by demonstrating that the water to production meets\nthe treated water microbiological specifications\nd. Tanks purchased for treated water storage after January 1, 2018, must be\nequipped for clean-in-place (CIP).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-water-monitoring-requirements-checklist",
        title: "KORE QFS Internal Audit Checklist — Water Monitoring Requirements",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Water Monitoring Requirements and Specifications. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "WMR-SEC-1",
              "question": "Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-2",
              "question": "1 Each facility must develop a documented water monitoring plan including source, treated, and packaged water. The monitoring plan must be approved by the OU.\n1.1 Potable water must be included in the water monitoring plan when:\n• potable water is produced on-site from a non-potable source or\n• potable water is used for a manufacturing application where the water can directly or indirectly contact product.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-3",
              "question": "2 The water monitoring plan must identify:\n• Parameters to be monitored for risk identification, compliance and/or process control\no Comply with Corporate water parameter specifications in this document (Table 1-Table 5) and/or local regulations, whichever is stricter of the two. This will require the continued review of local regulations to ensure that testing parameters are kept up to date at all times.                                                                                         Include sample locations where parameter is monitored for risk, compliance and/or process control.\no Risk monitoring locations may be the source water or at intermediate processing steps depending on whether the origin of the parameter is the source water or due to water treatment processing                                   Compliance monitoring location for treated water is the first sample point after the last water treatment system process\no Compliance monitoring location for potable water is a representative point-of-use (select a single location if potable water is validated for use at multiple process locations)\no Compliance monitoring location for packaged water is either from a sample point immediately prior to filling or finished product in final packaging may be submitted for packaged water analysis\no Process monitoring locations include the first sample point after the last water treatment system process at a minimum, but may include additional locations as necessary to ensure control of the end-to-end water treatment processing\n• Frequency of monitoring of each parameter for risk, compliance and/or process control\no Frequency for compliance is as indicated in this document (Table 1-Table 5), annually at a minimum for treated and packaged water. OU can request to increase the frequency based on risk of occurrence, potential variability of results or as mandated by local regulations.\no Frequencies for risk parameter monitoring are as required by the OU based on the data from the Design and Operations of Water Source (QFS-RQ-197), Source Vulnerability Assessment (SVA, ENV-RQ-235), or probability of occurrence or media attention for emerging contaminants identified by corporate/OU QSE and/or SRA as a global or local reputational risk.\no Frequency for process control should be established by the standard operational process (SOP) of the facility.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-4",
              "question": "3 Water monitoring samples must be analyzed by capable laboratories:\n3.1 Use an OU authorized third-party laboratories for all analysis for compliance and risk parameter monitoring.\n3.2 On-site laboratories must be capable of sampling and analyzing parameters required for routine process monitoring.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-SEC-2",
              "question": "Source Water Monitoring Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-6",
              "question": "Source water must be analyzed as required in Design and Operations of Water Sources (QFS-RQ-197) for OU water source approval.\n5.1 In addition to the source approval analysis, OU has the authorization to require, as needed:\n• The third-party analyses for parameters in Tables 3, 4 and 5 annually\n• monitoring for seasonally variable parameters which may impact process performance (THMs)\n• risk parameters identified during SVA or by corporate/OU SRA\n• periodic scan analyses for contaminants of concern identified to be emerging contaminants (PFAS, new pesticides, etc.) and potentially present in the source; OU will determine necessary frequencies of analysis if emerging contaminants are detected",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-6",
              "question": "Source water testing plan must be developed for the facility, including Process Parameters identified in Table 1 and Table 2.\nNOTE: Additional source water parameter monitoring for Natural Mineral Water designation may be required by local regulations.\n6.1 Trended data is recommended to be retained by the facility as evidence of water treatment system control. Retention of trended data is recommended to be at least 1 year to understand seasonal variability.\n6.2 Source water sampling location must be prior to the treatment process, including any disinfection process, to ensure maximum efficiency of the water treatment system.\n6.3 Frequency of testing depends on the water source and the water treatment system.\n• Highly variable source waters as evidenced by fluctuations in turbidity, alkalinity, residual disinfectant concentrations, nitrate concentrations (e.g., water direct from untreated surface water, some municipalities, water blended from multiple sources) may require on-line monitoring or testing every 4-8 hours\n• Less variable source waters (e.g., some municipalities, most well waters) may only require testing once per week, or less frequently if a baseline is established allowing for less frequent testing",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-7",
              "question": "The source water data must be compared with treated and/or potable water specifications. Any compound identified in the source water at a concentration higher than required for treated and/or potable water specifications must be identified in water monitoring plans as Source above Specification (SaS)\n7.1 Parameters identified as SaS must be monitored annually to determine if concentration is stable or increasing.\n7.2 Confirm corresponding annual treated water result for SaS parameter is in compliance to verify water treatment process performance.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-SEC-3",
              "question": "Treated Water Monitoring Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-9",
              "question": "8 Test treated water for Table 1 Process Performance Monitoring Parameters and Specifications.\n• Analyses performed on-site\no All parameters except sensory may be analyzed by benchtop facility lab analysis or with on-line real-time instrumentation.\n• Test frequency: Every four hours\no OU may allow modification of test frequency based on type of water treatment system, validated process performance and availability of on-line, real-time instrumentation. On-line instrumentation can be used to justify reduced lab test frequencies which verify on-line results and check instrument calibration.\n• Sampling point:\no Water sample for Treated Water quality analysis must be obtained at a sampling point following the last water treatment process as minimum.\no Locations identified in the monitoring plan based on water treatment process standard operating procedures for process control.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-10",
              "question": "The manufacturing facility must implement microbiological sampling monitoring program for water, including the microbiological tests in Table 2.\n• Analyses performed on-site\no If the facility does not have on-site capability, the local OU approved 3rd Party lab may be used for analyses if sample holding time limitations requirements are met.\n• Test Frequency:\no Weekly for Coliforms, E. Coli and Total Plate Count (TPC)\no Monthly for Y & M\no Annually for Pseudomonas aeruginosa (to be conducted by an approved third-party laboratory)\n• Sampling point:\no Analyses performed for Treated Water at sampling point immediately after last Water Treatment System process.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-11",
              "question": "10 Test treated water for compliance against the specifications in Table 3 Chemical Specifications for 3rd Party Laboratory Testing of Treated, Potable and Packaged Water, Table 4 Microbiological Specifications for 3rd Party Laboratory Testing for Treated, Potable and Packaged Water and any additional parameters designated by the OU, annually at a minimum with no more than 16 months between sampling events,                  NOTE: Monitoring frequencies for Radionuclides may be extended to a 3-year frequency, if no radiological anthropogenic activity has been identified within the source water area, and the natural radionuclides compounds are less than 50% of the stated maximum health limit (MHL).\n10.1 OUs must include any additional parameters and more stringent specifications for TCCC specification parameters required by local regulations for drinking water, potable water and water for product manufacturing in monitoring plans.\n10.2 OUs may include additional risk parameters identified during SVA or by corporate/OU SRA and periodic scan analyses for contaminants of concern identified to be emerging contaminants (PFAS, new pesticides, etc.) and potentially present in the source.\n10.3 OUs may require annual testing to occur in specific months to capture potential seasonal variations for water treatment systems using surface water sources, municipal water sources or wells with seasonal water quality.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-12",
              "question": "Test water for Table 5. General Water Quality Parameters as part of the annual treated water testing. These parameters are to provide a general understanding of overall water quality characteristics that may impact water treatment process selection and operations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-SEC-4",
              "question": "Potable Water Monitoring Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-14",
              "question": "12 Potable water must meet the Corporate Specifications and local drinking water regulatory requirements.\n12.1 Frequency of analysis, if monitoring required, is the same as for treated water monitoring.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-SEC-5",
              "question": "Packaged Water Monitoring Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-16",
              "question": "13 Test packaged water against the Specifications in Table 3 Chemical Specifications for 3rd Party Laboratory Testing of Treated, Potable and Packaged Water, Table 4. Microbiological Specifications for 3rd Party Laboratory Testing for Treated, Potable Water and Packaged Water and any additional parameters designated by the OU, annually at a minimum.\n13.1 OUs must include any additional parameters and more stringent specifications for TCCC specification parameters required by local regulations for packaged water.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-SEC-6",
              "question": "Requirements for Out of Specification Results (OOS)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-18",
              "question": "14 OOS results must be reported to the OU immediately for any parameter from Table 3 and Table 4.\n14.1 OOS results of parameters from other categories should be assessed by the facility to determine if the incident requires elevation of reporting to the OU.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-19",
              "question": "15 If the OOS parameter result represents a food safety risk to the finished product, the facility must take immediate actions to mitigate the risk.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-20",
              "question": "16 The facility must determine the root cause of the OOS result and take necessary corrective actions to bring the OOS result back within specifications.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-21",
              "question": "17 Test the source water for the OOS parameter to determine if the source water is contributing to the OOS condition.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-22",
              "question": "Test the OOS parameter at a minimum of every three months until it demonstrates compliance.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "WMR-23",
              "question": "Maintain records of the actions taken.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    },
    {
        id: "qfs-kore-design-and-operation-of-water-checklist",
        title: "KORE QFS Internal Audit Checklist — Design and Operation of Water",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: "KORE QFS internal audit checklist for Design and Operation of Water Sources. Score findings as Compliance / Non Compliance.",
        content: [
            {
              "clause": "DOW-SEC-1",
              "question": "Requirements",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-2",
              "question": "Water Source Approval and Authorization",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-3",
              "question": "All new water sources to be used for Treated Water or Potable Water in contact with food or food contact surfaces must be approved by the Operating Unit (OU) before first use. Water sources include water wells, spring catchments, surface water extraction, 3rd party water supply (e.g., municipal supply) and tankered water.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-4",
              "question": "Approval requirements of new water sources must be based on the risk assessment and the use of the water sources. As a minimum the following items are required:\n• All relevant permits, licenses, and concessions.\n• Assessment of quality, capacity, legal, environmental risks and public perceptional risks for the manufacturing facility, the catchment and the hosting community’s access to portable water. The risk assessment must be performed by a water resource expert and must be added as an addendum to the existing SVA.\n• Determination of the maximum withdrawal volume per hour and on annually based on quality, environmental, legal, technical, and social assessments.\nExample: Pumping test for water wells, environmental and social impact assessment (ESIA) for surface water extraction\n• Water quality analysis and comparison to the analytical scope defined in Appendix: Parameter Scope (KORE Knowledge Sharing). The scope includes the parameters requested in QFS-RQ-185, additional microbiological (e.g., viruses) and chemical (e.g., PFAS, sweeteners, metabolites of pesticides, endocrine disruptors, corrosion inhibitors, hormones) parameters to assess potential quality risks, ensure optimized water treatment operations and fit-for-purpose chemical compositions (e.g., natural mineral water). Risk parameters identified during the source validation, should be included in the annual water monitoring program as requested in QFS-RQ-185. As not all parameters from Appendix: Parameter Scope (KORE Knowledge Sharing) are legally regulated, reference values are provided. These limits and the limit of quantification must be adjusted to meet local regulations or best practices.\nDetermination of monitoring frequency, duration and additional parameter required for the authorization must be defined based on legal requirements, the vulnerability of the water source and the intended use (e.g. Natural Mineral Water). Seasonal impact on source water quality must be considered. A 12 months monitoring period is recommended for natural mineral water.\n• Development of a source monitoring plan to ensure water quality and process stability of the water treatment. Based on seasonal variability, the vulnerability and analytical results of the source water, the analytical scope (chemical, physical, microbiological parameters) and frequency needs to be defined.\nExamples: for a well source likely to fluctuate with seasonal rainfall / drought events, the authorization must require seasonal monitoring of nitrates/nitrites, fertilizers and pesticides in the growing seasons and/or inorganics in dry seasons\nFor all sources approved and authorized by the OU prior to August 31, 2022, the manufacturing facility and/or OU must maintain historical analytical evidence to demonstrate the assessment of source water quality which enabled authorization. An approved SVA is accepted as source approval.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-3",
              "question": "Water Source Design and Monitoring",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-4",
              "question": "Municipal Supply",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-6",
              "question": "Environmental, community access to water, economic, quality and capacity risks associated with the municipal supply must be assessed in accordance with ENV-RQ-235. The risk assessment must include, the municipal water sources, the municipal water treatment, and the distribution network.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-7",
              "question": "The supply point must be secured against unauthorized access. A flowmeter must monitor the flow rate and the supplied volume to ensure contractual and legal compliance. A hygienic sampling valve must be installed to monitor microbiological and chemical quality of the water. A pressure gauge must monitor pressure of the supply. The monitoring frequency and additional monitoring requirement must be documented and implemented based on the assessed risks.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-5",
              "question": "Water Boreholes\nConstruction",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-9",
              "question": "Regulatory requirements, drilling location, drilling method, borehole design, construction supervision, validation and acceptance of a borehole need to be approved by an OU water resource expert or by an OU-approved third-party water resource expert, who is independent to the drilling company, to avoid a conflict of interest.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-10",
              "question": "All relevant permits (e.g., drilling permit, environmental permit) must be obtained prior to the construction of the borehole",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-6",
              "question": "Drilling location",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-12",
              "question": "The selection of the drilling location must be done based on:\n• the vulnerability, the expected quality and capacity of the water resource (e.g., hydrogeological study). In case the available information are not sufficient, further investigations (e.g., test drill, surface geophysics) must be performed.\n• the social and environmental impact of the water extraction (e.g., Environmental and Social Impact Assessment).\n• Land ownership and access to the drilling site and pipelines connecting the source and the plant.\n• Legal and financial implication for drilling and water extraction.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-7",
              "question": "Well Design",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-14",
              "question": "The well design must be based on legal requirements, the hydrogeology, technical capabilities of drilling companies and the water demand of the plant. Prior to drilling, a conceptual design must be developed based on the expected hydrogeology. This conceptual design must be adjusted based on the encountered geology and down-hole geophysical investigations.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-8",
              "question": "Drilling",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-16",
              "question": "A hygiene concept must be developed to ensure that no environmental contamination occurs during drilling. The concept needs to include fluid storage and spill management (e.g., plastic foil under the drilling rig), cleaning and disinfection of tool and well installation as well as hygiene requirements for the crew.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-17",
              "question": "Based on the geology, the design of the well and the capabilities of the drilling company, boreholes can be drilled with different drilling methodologies. Most common are rotary drilling with reverse circulation, cable tool drilling and down-the-hole hammer (with casing during drilling operation, when possible and/or needed, e.g., ODEX tool). An independent water resource expert in consultation with the drilling company must approve the appropriate drilling method and define technical requirements (e.g., drilling rig, drilling bit, compressors and grouting pump) and required capability of the crew (e.g., geologist).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-18",
              "question": "Boreholes must be developed after drilling to:\n• remove drilling residues (e.g., drilling mud),\n• clean fines from the aquifer and\n• ensure settling of the filter pack",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-19",
              "question": "The development of boreholes decreases the head loss and increases well efficiency and enhances the life span.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-20",
              "question": "Well development must be done by mechanically (over-pumping, airlift, jetting), and / or chemical dispersing agents, detergents, acids). All used chemicals must be approved for drinking water wells and environmental-friendly.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-21",
              "question": "All construction materials in contact with water need to be food contact grade certified (e.g., NSF), and meet local and international quality requirements (e.g., British Standard, ISO, etc.). Corrosion resistance of all materials need to be ensured based on the water analysis and chemicals (e.g., acids, chlorine, or peroxide) planned to be used for cleaning and disinfection program of the well. For new wells, corrosion resistant steel (e.g., SAE 304 L stainless steel), uPVC HDPE or plastic-coated steel should be used. Mild steel (low carbon steel) must not be used in contact with water. All material must be clean and disinfected before introduction to the borehole. All steel equipment must be pickled and passivated to prevent corrosion (especially welded connections if any).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-22",
              "question": "Casings and filter screens must be installed to ensure borehole stability, sand free water, avoid surface water inflow and hydraulic connection of different aquifers. “Open hole” boreholes must be only installed in very stable bedrock aquifers. Casing and cementation must be installed above the aquifer.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-23",
              "question": "The production casing (inner casing) and filter screens are in direct contact to the water. The diameter of the casing must allow sufficient space to accommodate the submersible pump (the annular space between pump and casing must be at least 5 cm. Centralizer must be used in adequate intervals to ensure a central installation. The filter screen design (e.g., collapse resistance, slot width, diameter, filter type) must be based on the depth of the well, the gravel pack, the geology and the planned extraction rate. It is recommended to use a filter screen with a high open surface area (e.g., wire wrapped filter screens) to avoid high entrance velocity of the water to the well and clogging. Filter screen must not be manually slotted. It is recommended to use couplings which allow fast installation (e.g., ZSM Connectors)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-9",
              "question": "Annular space",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-25",
              "question": "The annular space (gap between borehole and casing) must have a minimum width of 5 cm to ensure adequate installation and functionality of the gravel pack and the cement sealing.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-26",
              "question": "Gravel or glass beads must be installed at screened sections of the well allowing water inflow with minimum head loss, ensure borehole stability and prevent the filter screen from clogging. Grain size range of the gravel pack must be based on the aquifer and the slot width of the filter screens. The gravel must meet pertinent quality standards (e.g., EN 12904) and consist of min 95% inert silica material with rounded edges and must be free of organic contamination.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-27",
              "question": "A clay or a cement-clay mixture (e.g., Dammer) must be installed in the annular space of the surface/protective casing and at blind (unscreened) casing sections of the well to prevent surface water inflow and the hydraulic connection of aquifers at different depths. The cement/clay grout must provide a continuous dense lining which surrounds the protective casing. The recommended method is to inject the cement under pressure in the annular space, from the bottom up to the surface:",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-28",
              "question": "As the cementing of the well is critical for the well, cementing must be supervised by an expert independent of the drilling company. The quality of the cementation must be assessed with geophysical methods (e.g., cement bond log, NN). In telescoped wells, the geophysics must be performed before the inner casing is installed, as the grouting cannot be assessed through multiple casings.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-29",
              "question": "A counter-filter or clay plug must be installed between gravel pack and sealing to ensure their separation. The counter filter must consist of filter sand with a grain size of approximately a quarter of the diameter of that of the filter gravel.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-10",
              "question": "Submersible Pumps",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-31",
              "question": "In case the dynamic water level (water level during pumping) in the borehole is below surface level, a submersible pump certified for drinking water must be installed. The technical design of the pump must be selected based on hydraulic data derived from a pumping test. The pump model must be based on water quality and the pump curve, which includes flow and pressure head, to ensure energy efficient exploitation. Head loss due to well aging, water level decline and long-range production plan must be considered to determine the required pressure head. A net positive suction head (e.g., minimum water level above pump) must be ensured to avoid cavitation and damage of the pump. The suction inlet of the pump must be installed above the filter screens. The pump must be connected to a frequency converter to regulate the pumping rate. The extraction rate must not be reduced by choking the valves at well-head. The pump must be cooled by the water pumped, additional liquid cooling is not permitted.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-32",
              "question": "The submersible pump is connected to a rising main to deliver the water to the surface via the well head. Recommended materials are stainless steel, and HDPE (food grade). Design of rising mains including couplings must allow fast removal and dismantling (e.g., replacement of submersible pump). For stainless steel pipes ZSM connection are recommended, as they ensure reliable and fast installation/removal. The internal diameter of the rising main must allow a flow velocity < 2m/sec under nominal operating conditions.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-33",
              "question": "The well head is the cover of the well and seals the well against the environment. The well head connects the rising main with the water delivery pipe to the production facility. The well head must be food grade and corrosion resistant to water and cleaning/disinfection chemicals. It is recommended to use stainless steel (e.g. SAE 304 L stainless steel).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-34",
              "question": "The casing of the well and the wellhead must be connected watertight to prevent inflow of surface water or air. Rising main and the water pipe in the well head must have the same diameter, to reduce scaling or fouling. The wellhead must be sealed against direct air inflow or intrusion by dirt or vermin. The wellhead must have sealable openings to accommodate:\n• Power cable for the submersible pump\n• Cable for the hydrostatic probe (or manual monitoring of water level by level gauge)\n• Sterile air filter (0.2μm) to allow “breathing” of the well without microbiological risk                                                                                                                Removable spray balls for recirculating cleaning/disinfection agents (3 spray balls is recommended to ensure the application of the entire casing, all cables and the rising main).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-11",
              "question": "Monitoring devices and Installations",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-36",
              "question": "Monitoring of key parameters provides evidence on compliance with legal and company requirements, and supports risk mitigation of water supply, quality, and environmental risks.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-37",
              "question": "The following monitoring devices must be installed:\n• Electromagnetic flowmeter (instantaneous flow and cumulative volume)\n• Permanent hydrostatic probe directly above pump to monitor water levels (static and dynamic water levels)\n• Pressure sensor at the well head (steel membrane-type gauge or electronic sensor)\n• Online sensor for temperature and electrical conductivity\n• Electrical consumption of the submersible pump\n• Hygienic sampling valve with sanitary connections for microbiological sampling\nThese parameters must be recorded by data logger or the plant’s monitoring system allowing alarming, trending and data interpretation.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-12",
              "question": "Well housing and security",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-39",
              "question": "The well must be protected in a well house (above ground) or well chamber (below ground) to restrict access and to protect the well head and sensitive equipment (regulation & instrumentation) against environmental impact and unauthorized people access. The design and construction of the well house must comply with the local regulations (e.g., building permit). The well house must be equipped with:\n• Heating device in case of freezing risk\n• Drainage to avoid stagnant water on the floor\n• Ventilation to avoid mold and ensure breezing air (upper and lower ventilation device at the opposite side of the well house is recommended)\n• The floor must be water and chemical resistant (e.g., epoxy, tiles) and inclined towards the drain to avoid stagnant water\n• Access control and security (e.g., fence, video camera, alarm system)\n• Housing design must allow fast install/replace the submersible pump (e.g., openable roof or roof hatch)\n• Pest control (e.g., traps, insect screen)",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-13",
              "question": "Validation and acceptance",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-41",
              "question": "A Pumping test needs to be performed to determine the aquifer characteristics and the well performance including extraction capacity. The pumping test needs to be designed (duration, flow rate, monitoring requirements) and evaluated by a hydrogeologist based on the well and the aquifer system in accordance with ISO 14686:2003. The pumping test consists of 2 parts:\n• a step test (well test) to determine the specific capacity of the well and its critical flowrate.\n• an aquifer test to determine hydraulic conductivity, specific storage coefficient (storativity), extent of the drawdown cone (cone of depression) and transmissivity.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-42",
              "question": "The well must be pumped at expected future pumping rate to reach a consistent pH, temperature, and conductivity before sampling to ensure representativity of the sample. In case of seasonal or weather impact on source water quality multiple analysis might be required.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-43",
              "question": "The borehole geophysical investigation program for the acceptance of the borehole must be designed based on the borehole design and the geological context. The program must ensure the validation of:\n• Integrity of the well and the compliance with the design specification e.g., video inspection (OPT).\n• annular sealing and the gravel pack by e.g., cement bond log (CBL), gamma-gamma density (GG.D), segmented gamma ray log (SGL), neutron-neutron-Log (NN)\n• Integrity of pipe connections e.g., focused resistance log (FEL), sum packer test.\n• Verticality of the borehole e.g., inclinometer\n• Location of inflow areas e.g., dynamic and static flowmeter (FLOW), and quality changes of the inflowing water e.g., conductivity log (SAL), temperature log (TEMP), video inspection (for turbidity)\n• Sediment in the well e.g., video inspection",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-44",
              "question": "A well completion report must be prepared to document and summarize the performed tasks and the well and aquifer characteristics. The report must include location map, as-built construction drawing, drilling log, specifications and certificates of down-hole material (filter screens, casings, filter gravel, submersible pump, raising main, monitoring devices) and well head, pumping test results, maximum and optimum extraction rate, well development and rinsing protocols, permits, geophysical reports, water analysis, ownership documents of the property, geological context and aquifer description.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-14",
              "question": "Operation and Monitoring",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-46",
              "question": "The well must be operated in accordance with legal requirements and operational parameters defined in the well completion report. A standard operating procedure including monitoring program, cleaning and routine maintenance must be implemented. The monitoring program must include the static and dynamic piezometric levels, pressure at the well head, flow rate, extracted water volume, electrical consumption, microbiological and chemical water quality including total dissolved substances (TDS) or electrical conductivity and water temperature. The monitoring frequency must depend to evidence legal requirements, variability of parameter and quality, capacity, and environmental risk assessment. The data need to be frequently consolidated, and trends identified. Pumping tests or video inspection must be performed if risks are identified (e.g., water level decline, water quality).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-47",
              "question": "In case the quality is not impacted by water level fluctuations, the water abstraction rate must be regulated based on water demand of the plant to minimize environmental impact. Fluctuations of the water level (e.g., Start and Stop operation) should be limited if feasible (storage tank usage and flowrate adjustment via pump frequency inverter).",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-SEC-15",
              "question": "Decommissioning",
              "findings": "",
              "evidence": "",
              "ofi": ""
            },
            {
              "clause": "DOW-49",
              "question": "Legal requirements for the decommissioning of boreholes must be followed, including notification requirements to the authorities. Unused water boreholes must be decommissioned, if they are not used as monitoring wells or as contingency/future supply, to ensure that they are no pathway for groundwater contamination. The decommissioning must be designed and approved by a water resources expert.",
              "findings": "",
              "evidence": "",
              "ofi": ""
            }
        ],
    }
];
