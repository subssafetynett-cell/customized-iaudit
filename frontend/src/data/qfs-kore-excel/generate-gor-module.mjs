import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const items = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_gor-parsed.json"), "utf8"),
);

const contentLines = items
  .map((i) =>
    JSON.stringify(
      {
        clause: i.clause,
        question: i.question,
        findings: "",
        evidence: "",
        ofi: "",
      },
      null,
      2,
    )
      .split("\n")
      .map((line, idx) => (idx === 0 ? `            ${line}` : `            ${line}`))
      .join("\n"),
  )
  .join(",\n");

const file = `// Auto-generated from QFS KORE Audit Checklist.xlsx — General Operating Requirements
// Question numbers corrected where Excel duplicated #12; question text copied exactly from Excel.
import type { AuditTemplate } from "./auditTemplateTypes";

export const QFS_KORE_EXCEL_MODULE_META = [
    {
        id: "qfs-kore-general-operating-requirements-checklist",
        layout: "requirement",
        scoreMode: "compliance-noncompliance",
        moduleLabel: "MODULE:General Operating Requirements PRP-RQ-001",
        sectionTitle: "General Operating Requirements",
    },
] as const;

export const QFS_KORE_EXCEL_MODULE_TEMPLATES: AuditTemplate[] = [
    {
        id: "qfs-kore-general-operating-requirements-checklist",
        title: "KORE QFS Internal Audit Checklist — General Operating Requirements",
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description:
            "KORE QFS internal audit checklist for General Operating Requirements. Score findings as Compliance / Non Compliance.",
        content: [
${contentLines}
        ],
    },
];
`;

const out = path.join(__dirname, "..", "qfsKoreExcelModuleTemplates.ts");
fs.writeFileSync(out, file);
console.log("Wrote", out, "questions=", items.length);
