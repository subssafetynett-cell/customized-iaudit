import { AuditQuestion } from "../types/gapAnalysis";

const createQuestion = (id: string, clause: string, text: string): AuditQuestion => ({
    id,
    clause,
    text,
    finding: null,
    actionPlan: "",
    evidence: ""
});

export const ISO_9001_QUESTIONS: AuditQuestion[] = [
    // Clause 4: Context of the organization
    createQuestion("9001-4.1-1", "4. Context", "Has the organization determined external and internal issues relevant to its purpose?"),
    createQuestion("9001-4.1-2", "4. Context", "Please see Document reference: Context of the Organization"),
    createQuestion("9001-4.1-3", "4. Context", "Does the organization monitor and review information about these external and internal issues?"),
    createQuestion("9001-4.2-1", "4. Context", "Have the interested parties relevant to the QMS been determined?"),
    createQuestion("9001-4.2-2", "4. Context", "Have the requirements of these interested parties been determined?"),
    createQuestion("9001-4.2-3", "4. Context", "Does the organization monitor and review information about these interested parties and their requirements?"),
    createQuestion("9001-4.3-1", "4. Context", "Has the scope of the QMS been determined and documented?"),
    createQuestion("9001-4.3-2", "4. Context", "Does the scope state the types of products and services covered?"),
    createQuestion("9001-4.4-1", "4. Context", "Are the processes needed for the QMS and their application determined?"),
    createQuestion("9001-4.4-2", "4. Context", "Are the criteria and methods (including monitoring, measurements and related performance indicators) needed to ensure the effective operation and control of these processes determined?"),

    // Clause 5: Leadership
    createQuestion("9001-5.1-1", "5. Leadership", "Does top management demonstrate leadership and commitment with respect to the QMS?"),
    createQuestion("9001-5.1-2", "5. Leadership", "Is the quality policy and objectives established for the QMS and are they compatible with the context and strategic direction of the organization?"),
    createQuestion("9001-5.1-3", "5. Leadership", "Are the integration of the QMS requirements into the organization’s business processes ensured?"),
    createQuestion("9001-5.1-4", "5. Leadership", "Is the use of the process approach and risk-based thinking promoted?"),
    createQuestion("9001-5.2-1", "5. Leadership", "Is the quality policy established, implemented and maintained?"),
    createQuestion("9001-5.2-2", "5. Leadership", "Is the quality policy available and maintained as documented information?"),
    createQuestion("9001-5.2-3", "5. Leadership", "Is the quality policy communicated, understood and applied within the organization?"),
    createQuestion("9001-5.3-1", "5. Leadership", "Are the responsibilities and authorities for relevant roles assigned, communicated and understood?"),
    createQuestion("9001-5.3-2", "5. Leadership", "Has top management assigned the responsibility and authority for ensuring that the QMS conforms to the requirements of this International Standard?"),
    createQuestion("9001-5.3-3", "5. Leadership", "Has top management assigned the responsibility and authority for reporting on the performance of the QMS and on opportunities for improvement?"),

    // Clause 6: Planning
    createQuestion("9001-6.1-1", "6. Planning", "Has the organization determined the risks and opportunities that need to be addressed to give assurance that the QMS can achieve its intended result(s)?"),
    createQuestion("9001-6.1-2", "6. Planning", "Has the organization planned actions to address these risks and opportunities?"),
    createQuestion("9001-6.1-3", "6. Planning", "Has the organization planned how to integrate and implement the actions into its QMS processes?"),
    createQuestion("9001-6.1-4", "6. Planning", "Has the organization planned how to evaluate the effectiveness of these actions?"),
    createQuestion("9001-6.2-1", "6. Planning", "Are the quality objectives established at relevant functions, levels and processes needed for the QMS?"),
    createQuestion("9001-6.2-2", "6. Planning", "Are the quality objectives consistent with the quality policy?"),
    createQuestion("9001-6.2-3", "6. Planning", "Are the quality objectives measurable?"),
    createQuestion("9001-6.2-4", "6. Planning", "Are the quality objectives monitored, communicated and updated as appropriate?"),
    createQuestion("9001-6.3-1", "6. Planning", "Are changes to the QMS carried out in a planned manner?"),
    createQuestion("9001-6.3-2", "6. Planning", "Does the organization consider the purpose of the changes and their potential consequences?"),

    // Clause 7: Support
    createQuestion("9001-7.1-1", "7. Support", "Has the organization determined and provided the resources needed for the establishment, implementation, maintenance and continual improvement of the QMS?"),
    createQuestion("9001-7.1-2", "7. Support", "Has the organization determined and provided the people necessary for the effective implementation of its QMS and for the operation and control of its processes?"),
    createQuestion("9001-7.1-3", "7. Support", "Is the infrastructure necessary for the operation of its processes and to achieve conformity of products and services determined, provided and maintained?"),
    createQuestion("9001-7.1-4", "7. Support", "Is the environment for the operation of its processes determined, provided and maintained?"),
    createQuestion("9001-7.1-5", "7. Support", "Are the resources suitable and fit for their purpose?"),
    createQuestion("9001-7.2-1", "7. Support", "Has the organization determined the necessary competence of person(s) doing work under its control that affects the performance and effectiveness of the QMS?"),
    createQuestion("9001-7.2-2", "7. Support", "Are these persons competent on the basis of appropriate education, training, or experience?"),
    createQuestion("9001-7.3-1", "7. Support", "Are persons doing work under the organization’s control aware of the quality policy and relevant quality objectives?"),
    createQuestion("9001-7.4-1", "7. Support", "Has the organization determined the internal and external communications relevant to the QMS?"),
    createQuestion("9001-7.5-1", "7. Support", "Does the organization’s QMS include documented information required by this International Standard?"),

    // Clause 8: Operation
    createQuestion("9001-8.1-1", "8. Operation", "Does the organization plan, implement and control the processes needed to meet the requirements for the provision of products and services?"),
    createQuestion("9001-8.2-1", "8. Operation", "Are the requirements for products and services defined?"),
    createQuestion("9001-8.2-2", "8. Operation", "Can the organization meet the claims for the products and services it offers?"),
    createQuestion("9001-8.3-1", "8. Operation", "Is a design and development process established, implemented and maintained?"),
    createQuestion("9001-8.4-1", "8. Operation", "Does the organization ensure that externally provided processes, products and services conform to requirements?"),
    createQuestion("9001-8.5-1", "8. Operation", "Is the provision of products and services implemented under controlled conditions?"),
    createQuestion("9001-8.5-2", "8. Operation", "Is the identification and traceability ensured?"),
    createQuestion("9001-8.5-3", "8. Operation", "Is property belonging to customers or external providers cared for?"),
    createQuestion("9001-8.6-1", "8. Operation", "Is the release of products and services verified?"),
    createQuestion("9001-8.7-1", "8. Operation", "Are outputs that do not conform to their requirements identified and controlled?"),

    // Clause 9: Performance Evaluation
    createQuestion("9001-9.1-1", "9. Performance", "Does the organization determine what needs to be monitored and measured?"),
    createQuestion("9001-9.1-2", "9. Performance", "Are the methods for monitoring, measurement, analysis and evaluation determined?"),
    createQuestion("9001-9.1-3", "9. Performance", "Does the organization monitor customers' perceptions of the degree to which their needs and expectations have been fulfilled?"),
    createQuestion("9001-9.2-1", "9. Performance", "Are internal audits conducted at planned intervals?"),
    createQuestion("9001-9.2-2", "9. Performance", "Is an audit program planned, established, implemented and maintained?"),
    createQuestion("9001-9.2-3", "9. Performance", "Are the results of audits reported to relevant management?"),
    createQuestion("9001-9.3-1", "9. Performance", "Does top management review the organization's QMS at planned intervals?"),
    createQuestion("9001-9.3-2", "9. Performance", "Does the management review include inputs such as status of actions from previous management reviews?"),
    createQuestion("9001-9.3-3", "9. Performance", "Does the management review include inputs such as changes in external and internal issues?"),
    createQuestion("9001-9.3-4", "9. Performance", "Does the management review include information on the performance and effectiveness of the QMS?"),

    // Clause 10: Improvement
    createQuestion("9001-10.1-1", "10. Improvement", "Does the organization determine and select opportunities for improvement?"),
    createQuestion("9001-10.1-2", "10. Improvement", "Does the organization implement any necessary actions to meet customer requirements and enhance customer satisfaction?"),
    createQuestion("9001-10.2-1", "10. Improvement", "When a nonconformity occurs, does the organization react to the nonconformity and take action to control and correct it?"),
    createQuestion("9001-10.2-2", "10. Improvement", "Does the organization evaluate the need for action to eliminate the cause(s) of the nonconformity?"),
    createQuestion("9001-10.2-3", "10. Improvement", "Does the organization implement any action needed?"),
    createQuestion("9001-10.2-4", "10. Improvement", "Does the organization review the effectiveness of any corrective action taken?"),
    createQuestion("9001-10.2-5", "10. Improvement", "Is documented information retained as evidence of the nature of the nonconformities and any subsequent actions taken?"),
    createQuestion("9001-10.3-1", "10. Improvement", "Does the organization continually improve the suitability, adequacy and effectiveness of the QMS?"),
    createQuestion("9001-10.3-2", "10. Improvement", "Does the organization consider the results of analysis and evaluation, and the outputs from management review?"),
    createQuestion("9001-10.3-3", "10. Improvement", "Are needs or opportunities addressed as part of continual improvement?")
];

export const ISO_14001_QUESTIONS: AuditQuestion[] = [
    // Clause 4: Context of the organization
    createQuestion("14001-4.1-1", "4. Context", "Has the organization determined external and internal issues relevant to its purpose and that affect its ability to achieve the intended outcomes of its EMS?"),
    createQuestion("14001-4.1-2", "4. Context", "Does the organization consider environmental conditions being affected by or capable of affecting the organization?"),
    createQuestion("14001-4.2-1", "4. Context", "Has the organization determined the interested parties that are relevant to the EMS?"),
    createQuestion("14001-4.2-2", "4. Context", "Has the organization determined the relevant needs and expectations (i.e. requirements) of these interested parties?"),
    createQuestion("14001-4.2-3", "4. Context", "Which of these needs and expectations become compliance obligations?"),
    createQuestion("14001-4.3-1", "4. Context", "Has the organization determined the boundaries and applicability of the EMS to establish its scope?"),
    createQuestion("14001-4.3-2", "4. Context", "Has the organization considered the external and internal issues engaged with the scope?"),
    createQuestion("14001-4.3-3", "4. Context", "Has the organization considered the compliance obligations?"),
    createQuestion("14001-4.3-4", "4. Context", "Has the organization considered its organizational units, functions and physical boundaries?"),
    createQuestion("14001-4.4-1", "4. Context", "Does the organization achieve the intended outcomes of its EMS, including enhancing its environmental performance, fulfilling its compliance obligations and achieving its environmental objectives?"),

    // Clause 5: Leadership
    createQuestion("14001-5.1-1", "5. Leadership", "Does top management demonstrate leadership and commitment with respect to the EMS?"),
    createQuestion("14001-5.1-2", "5. Leadership", "Is the environmental policy and environmental objectives established and are they compatible with the strategic direction and the context of the organization?"),
    createQuestion("14001-5.1-3", "5. Leadership", "Are the integration of the EMS requirements into the organization’s business processes ensured?"),
    createQuestion("14001-5.1-4", "5. Leadership", "Are the resources needed for the EMS available?"),
    createQuestion("14001-5.2-1", "5. Leadership", "Is the environmental policy established, implemented and maintained?"),
    createQuestion("14001-5.2-2", "5. Leadership", "Is the environmental policy appropriate to the purpose and context of the organization, including the nature, scale and environmental impacts of its activities, products and services?"),
    createQuestion("14001-5.2-3", "5. Leadership", "Does the environmental policy provide a framework for setting environmental objectives?"),
    createQuestion("14001-5.2-4", "5. Leadership", "Does the environmental policy include a commitment to the protection of the environment, including prevention of pollution?"),
    createQuestion("14001-5.3-1", "5. Leadership", "Are the responsibilities and authorities for relevant roles assigned and communicated within the organization?"),
    createQuestion("14001-5.3-2", "5. Leadership", "Has top management assigned the responsibility and authority for ensuring that the EMS conforms to the requirements of this International Standard?"),

    // Clause 6: Planning
    createQuestion("14001-6.1-1", "6. Planning", "Does the organization determine the risks and opportunities, related to its environmental aspects?"),
    createQuestion("14001-6.1-2", "6. Planning", "Does the organization determine the environmental aspects of its activities, products and services that it can control and those that it can influence?"),
    createQuestion("14001-6.1-3", "6. Planning", "Does the organization determine those aspects that have or can have a significant environmental impact?"),
    createQuestion("14001-6.1-4", "6. Planning", "Have the compliance obligations been determined and have access to the compliance obligations related to its environmental aspects?"),
    createQuestion("14001-6.1-5", "6. Planning", "Does the organization plan to take actions to address its significant environmental aspects, compliance obligations, and risks and opportunities?"),
    createQuestion("14001-6.2-1", "6. Planning", "Are environmental objectives established at relevant functions and levels?"),
    createQuestion("14001-6.2-2", "6. Planning", "Are the environmental objectives consistent with the environmental policy?"),
    createQuestion("14001-6.2-3", "6. Planning", "Are the environmental objectives measurable (if practicable)?"),
    createQuestion("14001-6.2-4", "6. Planning", "Are the environmental objectives monitored?"),
    createQuestion("14001-6.2-5", "6. Planning", "Are the environmental objectives communicated?"),

    // Clause 7: Support
    createQuestion("14001-7.1-1", "7. Support", "Has the organization determined and provided the resources needed for the establishment, implementation, maintenance and continual improvement of the EMS?"),
    createQuestion("14001-7.2-1", "7. Support", "Has the organization determined the necessary competence of person(s) doing work under its control that affects its environmental performance and its ability to fulfill its compliance obligations?"),
    createQuestion("14001-7.2-2", "7. Support", "Are these persons competent on the basis of appropriate education, training or experience?"),
    createQuestion("14001-7.3-1", "7. Support", "Are persons doing work under the organization’s control aware of the environmental policy?"),
    createQuestion("14001-7.3-2", "7. Support", "Are persons doing work under the organization’s control aware of the significant environmental aspects and related actual or potential environmental impacts associated with their work?"),
    createQuestion("14001-7.4-1", "7. Support", "Has the organization established, implemented and maintained the process(es) needed for internal and external communications relevant to the EMS?"),
    createQuestion("14001-7.4-2", "7. Support", "Has the organization determined what it will communicate, when to communicate, with whom to communicate, and how to communicate?"),
    createQuestion("14001-7.5-1", "7. Support", "Does the organization’s EMS include documented information required by this International Standard?"),
    createQuestion("14001-7.5-2", "7. Support", "Is documented information created and updated ensuring appropriate identification and description?"),
    createQuestion("14001-7.5-3", "7. Support", "Is document control ensured for distribution, access, retrieval and use?"),

    // Clause 8: Operation
    createQuestion("14001-8.1-1", "8. Operation", "Does the organization establish, implement, control and maintain the processes needed to meet environmental management system requirements?"),
    createQuestion("14001-8.1-2", "8. Operation", "Does the organization control planned changes and review the consequences of unintended changes, taking action to mitigate any adverse effects?"),
    createQuestion("14001-8.1-3", "8. Operation", "Does the organization ensure that outsourced processes are controlled or influenced?"),
    createQuestion("14001-8.1-4", "8. Operation", "Consistent with a life cycle perspective, does the organization establish controls to ensure that its environmental requirement(s) is (are) addressed in the design and development process?"),
    createQuestion("14001-8.1-5", "8. Operation", "Consistent with a life cycle perspective, does the organization determine its environmental requirement(s) for the procurement of products and services?"),
    createQuestion("14001-8.1-6", "8. Operation", "Does the organization communicate its relevant environmental requirement(s) to external providers, including contractors?"),
    createQuestion("14001-8.1-7", "8. Operation", "Does the organization consider the need to provide information about potential significant environmental impacts associated with the transportation or delivery, use, end-of-life treatment and final disposal of its products and services?"),
    createQuestion("14001-8.2-1", "8. Operation", "Has the organization established, implemented and maintained the process(es) needed to prepare for and respond to potential emergency situations?"),
    createQuestion("14001-8.2-2", "8. Operation", "Does the organization prepare to respond by planning actions to prevent or mitigate adverse environmental impacts from emergency situations?"),
    createQuestion("14001-8.2-3", "8. Operation", "Does the organization respond to actual emergency situations?"),

    // Clause 9: Performance Evaluation
    createQuestion("14001-9.1-1", "9. Performance", "Does the organization monitor, measure, analyze and evaluate its environmental performance?"),
    createQuestion("14001-9.1-2", "9. Performance", "Does the organization determine what needs to be monitored and measured?"),
    createQuestion("14001-9.1-3", "9. Performance", "Does the organization evaluate its environmental performance and the effectiveness of the EMS?"),
    createQuestion("14001-9.1-4", "9. Performance", "Does the organization evaluate fulfillment of its compliance obligations?"),
    createQuestion("14001-9.2-1", "9. Performance", "Are internal audits conducted at planned intervals to provide information on whether the EMS conforms to the organization’s own requirements for its EMS?"),
    createQuestion("14001-9.2-2", "9. Performance", "Is an audit program established, implemented and maintained?"),
    createQuestion("14001-9.3-1", "9. Performance", "Does top management review the organization's EMS at planned intervals?"),
    createQuestion("14001-9.3-2", "9. Performance", "Does the management review include changes in external and internal issues that are relevant to the EMS?"),
    createQuestion("14001-9.3-3", "9. Performance", "Does the management review include information on the organization’s environmental performance?"),
    createQuestion("14001-9.3-4", "9. Performance", "Are the outputs of the management review consistent with the organization’s strategic direction?"),

    // Clause 10: Improvement
    createQuestion("14001-10.1-1", "10. Improvement", "Does the organization determine opportunities for improvement and implement necessary actions to achieve the intended outcomes of its EMS?"),
    createQuestion("14001-10.2-1", "10. Improvement", "When a nonconformity occurs, does the organization react to the nonconformity and as applicable take action to control and correct it?"),
    createQuestion("14001-10.2-2", "10. Improvement", "Does the organization evaluate the need for action to eliminate the causes of the nonconformity, in order that it does not recur or occur elsewhere?"),
    createQuestion("14001-10.2-3", "10. Improvement", "Does the organization implement any action needed?"),
    createQuestion("14001-10.2-4", "10. Improvement", "Does the organization review the effectiveness of any corrective action taken?"),
    createQuestion("14001-10.2-5", "10. Improvement", "Does the organization make changes to the environmental management system, if necessary?"),
    createQuestion("14001-10.3-1", "10. Improvement", "Does the organization continually improve the suitability, adequacy and effectiveness of the EMS to enhance environmental performance?"),
    createQuestion("14001-10.3-2", "10. Improvement", "Are the results of analysis and evaluation, and the outputs from management review considered?"),
    createQuestion("14001-10.3-3", "10. Improvement", "Are needs or opportunities addressed as part of continual improvement?"),
    createQuestion("14001-10.3-4", "10. Improvement", "Is documented information retained as evidence of the results of improvement?"),
];

export const ISO_45001_QUESTIONS: AuditQuestion[] = [
    // Clause 4: Context of the organization
    createQuestion("45001-4.1-1", "4. Context", "Has the organization determined external and internal issues that are relevant to its purpose and that affect its ability to achieve the intended outcome(s) of its OH&S management system?"),
    createQuestion("45001-4.1-2", "4. Context", "Does the organization understand the needs and expectations of workers and other interested parties?"),
    createQuestion("45001-4.2-1", "4. Context", "Has the organization determined the other interested parties, in addition to workers, that are relevant to the OH&S management system?"),
    createQuestion("45001-4.2-2", "4. Context", "Has the organization determined the relevant needs and expectations (i.e. requirements) of workers and other interested parties?"),
    createQuestion("45001-4.2-3", "4. Context", "Which of these needs and expectations are or could become legal requirements and other requirements?"),
    createQuestion("45001-4.3-1", "4. Context", "Has the organization determined the boundaries and applicability of the OH&S management system to establish its scope?"),
    createQuestion("45001-4.3-2", "4. Context", "Has the organization considered the external and internal issues referred to in 4.1?"),
    createQuestion("45001-4.3-3", "4. Context", "Has the organization taken into account the requirements of workers and other interested parties?"),
    createQuestion("45001-4.3-4", "4. Context", "Has the organization taken into account the planned or performed work-related activities?"),
    createQuestion("45001-4.4-1", "4. Context", "Does the organization establish, implement, maintain and continually improve an OH&S management system, including the processes needed and their interactions?"),

    // Clause 5: Leadership
    createQuestion("45001-5.1-1", "5. Leadership", "Does top management demonstrate leadership and commitment with respect to the OH&S management system?"),
    createQuestion("45001-5.1-2", "5. Leadership", "Is top management taking overall responsibility and accountability for the prevention of work-related injury and ill health?"),
    createQuestion("45001-5.1-3", "5. Leadership", "Is the OH&S policy and related OH&S objectives established and are they compatible with the strategic direction of the organization?"),
    createQuestion("45001-5.1-4", "5. Leadership", "Is the integration of the OH&S management system requirements into the organization’s business processes ensured?"),
    createQuestion("45001-5.2-1", "5. Leadership", "Is the OH&S policy established, implemented and maintained?"),
    createQuestion("45001-5.2-2", "5. Leadership", "Does the OH&S policy include a commitment to provide safe and healthy working conditions for the prevention of work-related injury and ill health?"),
    createQuestion("45001-5.3-1", "5. Leadership", "Are the responsibilities and authorities for relevant roles within the OH&S management system assigned and communicated at all levels within the organization?"),
    createQuestion("45001-5.3-2", "5. Leadership", "Do workers assume responsibility for those aspects of the OH&S management system over which they have control?"),
    createQuestion("45001-5.4-1", "5. Leadership", "Has the organization established, implemented and maintained a process(es) for consultation and participation of workers at all applicable levels and functions?"),
    createQuestion("45001-5.4-2", "5. Leadership", "Are there any barriers to participation and have they been removed or minimized?"),

    // Clause 6: Planning
    createQuestion("45001-6.1-1", "6. Planning", "Has the organization determined the risks and opportunities that need to be addressed?"),
    createQuestion("45001-6.1-2", "6. Planning", "Has the organization established, implemented and maintained a process(es) for hazard identification that is ongoing and proactive?"),
    createQuestion("45001-6.1-3", "6. Planning", "Does the organization assess OH&S risks from the identified hazards, while taking into account the effectiveness of existing controls?"),
    createQuestion("45001-6.1-4", "6. Planning", "Does the organization assess other risks related to the establishment, implementation, operation and maintenance of the OH&S management system?"),
    createQuestion("45001-6.1-5", "6. Planning", "Does the organization assess OH&S opportunities to enhance OH&S performance?"),
    createQuestion("45001-6.1-6", "6. Planning", "Does the organization determine and have access to up-to-date legal requirements and other requirements that are applicable to its hazards, OH&S risks and OH&S management system?"),
    createQuestion("45001-6.1-7", "6. Planning", "Does the organization plan actions to address these risks and opportunities and address legal requirements?"),
    createQuestion("45001-6.2-1", "6. Planning", "Are OH&S objectives established at relevant functions and levels?"),
    createQuestion("45001-6.2-2", "6. Planning", "Are the OH&S objectives consistent with the OH&S policy?"),
    createQuestion("45001-6.2-3", "6. Planning", "Are the OH&S objectives measurable (if practicable) or capable of performance evaluation?"),

    // Clause 7: Support
    createQuestion("45001-7.1-1", "7. Support", "Has the organization determined and provided the resources needed for the establishment, implementation, maintenance and continual improvement of the OH&S management system?"),
    createQuestion("45001-7.2-1", "7. Support", "Has the organization determined the necessary competence of workers that affects or can affect its OH&S performance?"),
    createQuestion("45001-7.2-2", "7. Support", "Are workers competent on the basis of appropriate education, training or experience?"),
    createQuestion("45001-7.3-1", "7. Support", "Are workers made aware of the OH&S policy and OH&S objectives?"),
    createQuestion("45001-7.3-2", "7. Support", "Are workers aware of their contribution to the effectiveness of the OH&S management system?"),
    createQuestion("45001-7.3-3", "7. Support", "Are workers aware of the implications and potential consequences of not conforming to the OH&S management system requirements?"),
    createQuestion("45001-7.4-1", "7. Support", "Has the organization established, implemented and maintained the process(es) needed for the internal and external communications relevant to the OH&S management system?"),
    createQuestion("45001-7.5-1", "7. Support", "Does the organization’s OH&S management system include documented information required by this document?"),
    createQuestion("45001-7.5-2", "7. Support", "Is the documented information determined by the organization as being necessary for the effectiveness of the OH&S management system included?"),
    createQuestion("45001-7.5-3", "7. Support", "Is documented information controlled to ensure it is available and suitable for use, where and when it is needed?"),

    // Clause 8: Operation
    createQuestion("45001-8.1-1", "8. Operation", "Does the organization plan, implement, control and maintain the processes needed to meet requirements of the OH&S management system?"),
    createQuestion("45001-8.1-2", "8. Operation", "Does the organization establish criteria for the processes?"),
    createQuestion("45001-8.1-3", "8. Operation", "Does the organization eliminate hazards and reduce OH&S risks using the hierarchy of controls?"),
    createQuestion("45001-8.1-4", "8. Operation", "Does the organization establish a process(es) for the implementation and control of planned temporary and permanent changes that impact OH&S performance?"),
    createQuestion("45001-8.1-5", "8. Operation", "Does the organization establish, implement and maintain a process(es) to control the procurement of products and services in order to ensure their conformity to its OH&S management system?"),
    createQuestion("45001-8.1-6", "8. Operation", "Does the organization coordinate its procurement process(es) with its contractors, in order to identify hazards and to assess and control the OH&S risks?"),
    createQuestion("45001-8.1-7", "8. Operation", "Does the organization ensure that the requirements of its OH&S management system are met by contractors and their workers?"),
    createQuestion("45001-8.2-1", "8. Operation", "Does the organization establish, implement and maintain a process(es) needed to prepare for and respond to potential emergency situations?"),
    createQuestion("45001-8.2-2", "8. Operation", "Does the organization provide training for the planned response?"),
    createQuestion("45001-8.2-3", "8. Operation", "Does the organization periodically test and exercise the planned response capability?"),

    // Clause 9: Performance Evaluation
    createQuestion("45001-9.1-1", "9. Performance", "Does the organization establish, implement and maintain a process(es) for monitoring, measurement, analysis and performance evaluation?"),
    createQuestion("45001-9.1-2", "9. Performance", "Does the organization determine what needs to be monitored and measured?"),
    createQuestion("45001-9.1-3", "9. Performance", "Does the organization evaluate the performance and the effectiveness of the OH&S management system?"),
    createQuestion("45001-9.1-4", "9. Performance", "Does the organization establish, implement and maintain a process(es) for evaluating compliance with legal requirements and other requirements?"),
    createQuestion("45001-9.2-1", "9. Performance", "Does the organization conduct internal audits at planned intervals?"),
    createQuestion("45001-9.2-2", "9. Performance", "Does the audit program ensure objectivity and impartiality of the audit process?"),
    createQuestion("45001-9.3-1", "9. Performance", "Does top management review the organization's OH&S management system at planned intervals?"),
    createQuestion("45001-9.3-2", "9. Performance", "Does the management review include changes in external and internal issues that are relevant to the OH&S management system?"),
    createQuestion("45001-9.3-3", "9. Performance", "Does the management review include information on the OH&S performance?"),
    createQuestion("45001-9.3-4", "9. Performance", "Does the management review include relevant communication(s) with interested parties?"),

    // Clause 10: Improvement
    createQuestion("45001-10.1-1", "10. Improvement", "Does the organization determine opportunities for improvement and implement necessary actions to achieve the intended outcomes of its OH&S management system?"),
    createQuestion("45001-10.2-1", "10. Improvement", "Does the organization establish, implement and maintain a process(es), including reporting, investigating and taking action, to determine and manage incidents and nonconformities?"),
    createQuestion("45001-10.2-2", "10. Improvement", "When an incident or nonconformity occurs, does the organization react in a timely manner to the incident or nonconformity?"),
    createQuestion("45001-10.2-3", "10. Improvement", "Does the organization take action to control and correct it?"),
    createQuestion("45001-10.2-4", "10. Improvement", "Does the organization evaluate, with the participation of workers and the involvement of other interested parties, the need for corrective action?"),
    createQuestion("45001-10.2-5", "10. Improvement", "Does the organization review the effectiveness of any corrective action taken?"),
    createQuestion("45001-10.2-6", "10. Improvement", "Does the organization make changes to the OH&S management system, if necessary?"),
    createQuestion("45001-10.3-1", "10. Improvement", "Does the organization continually improve the suitability, adequacy and effectiveness of the OH&S management system?"),
    createQuestion("45001-10.3-2", "10. Improvement", "Does the organization maintain and retain documented information as evidence of continual improvement?"),
    createQuestion("45001-10.3-3", "10. Improvement", "Does the organization communicate the results of continual improvement to workers?"),
];

export const getQuestionsForStandard = (standard: string): AuditQuestion[] => {
    switch (standard) {
        case "ISO 9001:2015": return JSON.parse(JSON.stringify(ISO_9001_QUESTIONS));
        case "ISO 14001:2015": return JSON.parse(JSON.stringify(ISO_14001_QUESTIONS));
        case "ISO 45001:2018": return JSON.parse(JSON.stringify(ISO_45001_QUESTIONS));
        default: return [];
    }
};
