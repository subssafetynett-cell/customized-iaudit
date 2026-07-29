import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const xlsxPath = path.join(__dirname, "QFS KORE Audit Checklist.xlsx");
const outPath = path.join(__dirname, "..", "qfsKoreExcelModuleTemplates.ts");
const wb = XLSX.readFile(xlsxPath, { cellStyles: true, sheetStubs: true });

function cellText(ws, R, C) {
  const c = ws[XLSX.utils.encode_cell({ r: R, c: C })];
  if (!c || c.v == null || c.t === "z") return "";
  return String(c.v)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Strip Excel control / soft-hyphen junk that sometimes appears mid-word.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD]/g, "");
}

function cellStyle(ws, R, C) {
  const c = ws[XLSX.utils.encode_cell({ r: R, c: C })];
  return c?.s || null;
}

/** Excel light/medium grey solid fills mark section subheadings (not checklist questions). */
function isGreySectionFill(style) {
  if (!style || style.patternType !== "solid") return false;
  const fg = style.fgColor || {};
  const rgb = String(fg.rgb || "")
    .replace(/^FF/i, "")
    .toUpperCase();
  // Score / header column colors — never treat as section fills
  if (
    rgb === "92D050" ||
    rgb === "FF0000" ||
    rgb === "FFC000" ||
    rgb === "D9E2F3" ||
    rgb === "C9A227"
  ) {
    return false;
  }
  if (rgb.length === 6) {
    const R = parseInt(rgb.slice(0, 2), 16);
    const G = parseInt(rgb.slice(2, 4), 16);
    const B = parseInt(rgb.slice(4, 6), 16);
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    // Near-grey medium/light fills used for subheadings in this workbook
    if (max - min <= 30 && R >= 100 && R <= 235) return true;
  }
  // Theme greys (theme 0/1 with tint, theme 2 → E7E6E6, etc.)
  if (fg.theme === 0 || fg.theme === 1 || fg.theme === 2) return true;
  return false;
}

/** Excel often pads bullets/sub-items with spaces instead of newlines — normalize for readable UI. */
function normalizeRequirementLayout(text) {
  if (!text) return text;
  let t = String(text);
  // Each • / ▪ / ○ bullet on its own line
  t = t.replace(/[ \t]*[•▪][ \t]*/g, "\n• ");
  t = t.replace(/[ \t]*○[ \t]*/g, "\n○ ");
  // Open-circle sub-bullets written as "o " in Excel (after . : ) ; / heavy padding / single space before capital)
  t = t.replace(/([.:;\)])\s+o\s+/g, "$1\no ");
  t = t.replace(/[ \t]{2,}o\s+/g, "\no ");
  t = t.replace(/([a-z).])\s+o\s+(?=[A-Z])/g, "$1\no ");
  // Excel sometimes omits the space after "o" (e.g. "oEstablish", "oChanges")
  t = t.replace(/([.:;\)])\s+o(?=[A-Z])/g, "$1\no");
  t = t.replace(/[ \t]{2,}o(?=[A-Z])/g, "\no");
  t = t.replace(/([a-z).])\s+o(?=[A-Z])/g, "$1\no");
  // Dashed list items padded with 2+ spaces (e.g. readiness checklist under ETP-6)
  t = t.replace(/[ \t]{2,}-[ \t]+/g, "\n- ");
  // Lettered sub-items a. / b. / … (Excel may omit the space after the letter, e.g. "d.Each")
  t = t.replace(/[ \t]{2,}([a-z]\.\s*)/gi, "\n$1");
  // Numbered sub-items 1.1 / 8.3.1 / 20.1 — not decimal values like "Cpk values > 1.33"
  t = t.replace(/([.!?])[ \t]+(\d+(?:\.\d+)+\s+)/g, "$1\n$2");
  t = t.replace(/[ \t]{2,}(\d+(?:\.\d+)+\s+)/g, "\n$1");
  t = t.replace(/[ \t](\d+\.\d+\.\d+\s+)/g, "\n$1");
  // Trim each line; drop leading blank line; collapse blank lines before bullets; collapse 3+ blank lines
  t = t
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, "").replace(/^[ \t]+/, ""))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n{2,}([•\-○])/g, "\n$1")
    .replace(/\n{3,}/g, "\n\n");
  return t;
}

function parseModule(sheetName, { numCol, reqCol, prefix, skipHeaderPred, inferUnnumberedRequirements = false, treatNumberedSectionTitles = false, numberedSectionMaxWords = 6, sequentialQuestionNumbers = true }) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Missing sheet: ${sheetName}`);
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const raw = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    let num = cellText(ws, R, numCol).trim();
    let req = cellText(ws, R, reqCol);
    const greySection = isGreySectionFill(cellStyle(ws, R, reqCol));
    if (!num && !req.trim()) continue;
    // Empty numbered stub rows (padding at bottom of some sheets) — skip.
    if (/^\d+$/.test(num) && !req.trim()) continue;
    // Header row may carry the first section title in the Requirement column
    // (e.g. GMP Facility Design: "#" + "Construction and Layout of Buildings").
    if (num === "#" && req.trim() && !/^requirement$/i.test(req.trim())) {
      raw.push({
        num: "",
        question: normalizeRequirementLayout(req),
        greySection: greySection || true,
      });
      continue;
    }
    // Some sheets put the requirement text in the # column (e.g. HACCP training row).
    if (num && !/^\d+$/.test(num) && num !== "#") {
      const question = normalizeRequirementLayout(req.trim() || num);
      if (skipHeaderPred("", question)) continue;
      raw.push({ num: "", question, greySection });
      continue;
    }
    if (skipHeaderPred(num, req)) continue;
    raw.push({ num, question: normalizeRequirementLayout(req), greySection });
  }

  const items = [];
  let pending = null;
  let sec = 0;

  const looksLikeSectionHeader = (text) => {
    const t = text.trim();
    if (!t || t.length > 110) return false;
    if (t.startsWith("•") || t.startsWith("-") || t.startsWith("▪")) return false;
    if (/^[a-z]/.test(t)) return false;
    // Requirement sentences — never section titles
    if (
      /\b(must|shall|should|ensure|perform|conduct|implement|include|maintain|establish|verify|protect|develop|deliver|prepare|store|take|isolate|contact|discuss|remove|deface|provide|comply|manage|prevent|monitor|improve|handle|follow|initiate|authorize|register|investigate|creation|require|requires|required|enclose)\b/i.test(
        t,
      )
    ) {
      return false;
    }
    // Title-like: few words, no long sentence punctuation clusters
    // Ignore abbreviation dots in e.g. / i.e. / etc.
    const tNoAbbrev = t.replace(/\b(e\.g\.|i\.e\.|etc\.)/gi, "");
    if ((tNoAbbrev.match(/\./g) || []).length >= 1) return false;
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length > 16) return false;
    return true;
  };

  const looksLikeStandaloneRequirement = (text) => {
    const t = text.trim();
    if (t.length < 40) return false;
    if (t.startsWith("•") || t.startsWith("-") || t.startsWith("▪")) return false;
    if (!/^[A-Z]/.test(t)) return false;
    return /\b(must|shall|should|ensure|implement|conduct|include|maintain|protect|develop|establish|deliver|prepare|perform|verify|store|take|isolate|contact|discuss|controls?|procedures?|mechanisms?|safeguards?|reference materials|equipment)\b/i.test(
      t,
    );
  };

  const lastNumericSuffix = (clause) => {
    // Only plain question ids (PREFIX-12), never section ids (PREFIX-SEC-1) or placeholder ids (PREFIX-U1).
    if (/-SEC-\d+$/i.test(String(clause))) return null;
    if (/-U\d+$/i.test(String(clause))) return null;
    const m = String(clause).match(/-(\d+)$/);
    return m ? Number(m[1]) : null;
  };

  const lastNumericFromItems = () => {
    if (pending) {
      const n = lastNumericSuffix(pending.clause);
      if (n != null) return n;
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const n = lastNumericSuffix(items[i].clause);
      if (n != null) return n;
    }
    return null;
  };

  const nextUpcomingExcelNumber = (fromIndex) => {
    for (let i = fromIndex + 1; i < raw.length; i++) {
      if (/^\d+$/.test(String(raw[i].num || "").trim())) {
        return Number(raw[i].num);
      }
    }
    return null;
  };

  let unnumberedPlaceholder = 0;
  let questionSeq = 0;

  const nextQuestionClause = (excelNum = 0) => {
    if (sequentialQuestionNumbers) {
      questionSeq += 1;
      return `${prefix}-${questionSeq}`;
    }
    return `${prefix}-${excelNum}`;
  };

  const pushSection = (title) => {
    if (pending) items.push(pending);
    sec += 1;
    items.push({
      clause: `${prefix}-SEC-${sec}`,
      question: title.trim(),
      findings: "",
      evidence: "",
      ofi: "",
    });
    pending = null;
  };

  // Continuations of the previous requirement (not new checklist items).
  const looksLikeContinuation = (text) => {
    const t = text.trim();
    // Calibration #9 supplier note sits in its own row without a #
    if (/^Verify from equipment supplier whether re-calibration/i.test(t)) {
      return true;
    }
    // Control and Destruction — supporting note under wastewater storage requirement
    if (/^This is to prevent disruption of stabilized biological treatment/i.test(t)) {
      return true;
    }
    return false;
  };

  for (let ri = 0; ri < raw.length; ri++) {
    const r = raw[ri];
    // Excel grey-fill rows are subheadings — but numbered Excel rows are always questions
    // (e.g. PFR #11 has grey fill in Excel but is not a section title).
    if (
      r.greySection &&
      r.question.trim() &&
      !/^\d+\s*$/.test(String(r.num || "").trim())
    ) {
      pushSection(r.question);
      continue;
    }
    if (!r.num) {
      if (looksLikeSectionHeader(r.question)) {
        pushSection(r.question);
        continue;
      }
      if (pending && looksLikeContinuation(r.question)) {
        pending.question += "\n" + r.question;
        continue;
      }
      // Opt-in: some sheets omit a # for a full requirement (e.g. Security, Calibration, Warehouse).
      if (
        inferUnnumberedRequirements &&
        r.question.trim().length >= 40 &&
        /^[A-Z]/.test(r.question.trim()) &&
        !r.question.trim().startsWith("•") &&
        !r.question.trim().startsWith("-") &&
        !r.question.trim().startsWith("▪")
      ) {
        if (pending) items.push(pending);
        pending = {
          clause: sequentialQuestionNumbers
            ? nextQuestionClause()
            : `${prefix}-U${++unnumberedPlaceholder}`,
          question: r.question,
          findings: "",
          evidence: "",
          ofi: "",
        };
        continue;
      }
      if (pending) {
        const add = r.question.trim();
        // Skip duplicate overflow rows (e.g. Pest Control UV-lights line already in #56).
        if (add && !pending.question.includes(add.slice(0, Math.min(80, add.length)))) {
          pending.question += "\n" + r.question;
        }
        continue;
      }
      continue;
    }
    // Numbered section titles (opt-in; e.g. PPE #29 "Workwear and Protective clothing")
    if (
      treatNumberedSectionTitles &&
      looksLikeSectionHeader(r.question) &&
      r.question.trim().split(/\s+/).filter(Boolean).length <= numberedSectionMaxWords
    ) {
      pushSection(r.question);
      continue;
    }
    // Excel sometimes wraps one requirement across two numbered rows (e.g. "spread" / "pread via the air").
    if (pending && /^[a-z(]/.test(r.question.trim())) {
      const prev = pending.question.trimEnd();
      let next = r.question.trim();
      // Drop duplicated tail from previous row when Excel repeats it on the next line.
      for (let len = Math.min(40, next.length); len >= 6; len--) {
        const head = next.slice(0, len);
        if (prev.toLowerCase().endsWith(head.toLowerCase())) {
          next = next.slice(len).trimStart();
          break;
        }
      }
      if (!next) continue;
      pending.question =
        !/\s$/.test(prev) && /^[a-z]/.test(next) ? prev + next : `${prev}\n${next}`;
      continue;
    }
    if (pending) items.push(pending);
    const excelNum = parseInt(String(r.num).trim(), 10);
    pending = {
      clause: nextQuestionClause(excelNum),
      question: r.question,
      findings: "",
      evidence: "",
      ofi: "",
    };
  }
  if (pending) items.push(pending);
  return items;
}

const commonSkip = (num, req) => {
  const t = req.trim();
  if (num === "#") return true;
  if (/^requirement$/i.test(t)) return true;
  if (t.includes("Compliance status")) return true;
  if (/^KORE QFS/i.test(t)) return true;
  if (/^MODULE:/i.test(t)) return true;
  if (/^AUDITEE/i.test(t)) return true;
  if (/^AUDIT DONE BY/i.test(t)) return true;
  if (/^Doc Number:/i.test(t)) return true;
  if (/^Title:/i.test(t)) return true;
  if (/^Revision\b/i.test(t)) return true;
  if (/^Issue\s*date\b/i.test(t)) return true;
  return false;
};

const gor = parseModule("General Operating Requirements", {
  numCol: 0,
  reqCol: 1,
  prefix: "GOR",
  skipHeaderPred: commonSkip,
});

const imcr = parseModule("IMCR", {
  numCol: 1,
  reqCol: 2,
  prefix: "IMCR",
  skipHeaderPred: commonSkip,
});

const gmp = parseModule("GMP Facility Design", {
  numCol: 0,
  reqCol: 1,
  prefix: "GMP",
  skipHeaderPred: commonSkip,
});

const security = parseModule("Security", {
  numCol: 0,
  reqCol: 1,
  prefix: "SEC",
  skipHeaderPred: commonSkip,
  inferUnnumberedRequirements: true,
});

const maint = parseModule("Maintenance Program", {
  numCol: 0,
  reqCol: 1,
  prefix: "MAINT",
  skipHeaderPred: commonSkip,
});

const cal = parseModule("Calibration and Verification", {
  numCol: 1,
  reqCol: 2,
  prefix: "CAL",
  skipHeaderPred: commonSkip,
  // Excel only numbers 2–9; remaining requirements have blank # cells.
  inferUnnumberedRequirements: true,
});

const pest = parseModule("Pest Control", {
  numCol: 0,
  reqCol: 1,
  prefix: "PEST",
  skipHeaderPred: commonSkip,
});

const ppe = parseModule("PPE and Personnel Hygiene", {
  numCol: 0,
  reqCol: 1,
  prefix: "PPE",
  skipHeaderPred: commonSkip,
  treatNumberedSectionTitles: true,
});

const ctrl = parseModule("Control and Destruction", {
  numCol: 0,
  reqCol: 1,
  prefix: "CTRL",
  skipHeaderPred: commonSkip,
  // Excel stops numbering after #15; remaining requirements have blank # cells.
  inferUnnumberedRequirements: true,
});

const records = parseModule("Records Management ", {
  numCol: 0,
  reqCol: 1,
  prefix: "REC",
  skipHeaderPred: commonSkip,
});

const consumer = parseModule("Consumer Engagement ", {
  numCol: 0,
  reqCol: 1,
  prefix: "CE",
  skipHeaderPred: commonSkip,
  // Excel #1 is the section title "General"
  treatNumberedSectionTitles: true,
});

const retention = parseModule("Retention Samples", {
  numCol: 0,
  reqCol: 1,
  prefix: "RET",
  skipHeaderPred: commonSkip,
  // Excel #24 is the section title "Finished Product Retention samples"
  treatNumberedSectionTitles: true,
});

const haccp = parseModule("HACCP", {
  numCol: 0,
  reqCol: 1,
  prefix: "HACCP",
  skipHeaderPred: commonSkip,
  // Unnumbered full requirements sit between numbered rows (and one # cell holds the question text).
  inferUnnumberedRequirements: true,
});

const labelling = parseModule("Labelling, Coding and Traceabil", {
  numCol: 0,
  reqCol: 1,
  prefix: "LCT",
  skipHeaderPred: commonSkip,
});

const incoming = parseModule("Incoming ,Receipt and Handling", {
  numCol: 0,
  reqCol: 1,
  prefix: "IRH",
  skipHeaderPred: commonSkip,
  // Blank-# full requirements (tamper devices, CoA, unloading checks, wall space).
  inferUnnumberedRequirements: true,
  // Excel #28 is the section title "Storing and Handling Ingredients"
  treatNumberedSectionTitles: true,
});

const packageHandling = parseModule("Package Handling and Preparatio", {
  numCol: 0,
  reqCol: 1,
  prefix: "PHP",
  skipHeaderPred: commonSkip,
  // Blank-# requirements (new crates; ACL absence/loss under glass defects).
  inferUnnumberedRequirements: true,
  // Excel #72 is the section title "Disposition of Rejected Bottles"
  treatNumberedSectionTitles: true,
});

const mixing = parseModule("Mixing and Blending ", {
  numCol: 0,
  reqCol: 1,
  prefix: "MB",
  skipHeaderPred: commonSkip,
  // Blank-# requirements (screens/magnets, yield targets, flow-meter calibration).
  inferUnnumberedRequirements: true,
});

const processingFilling = parseModule("Processing and Filling Req", {
  numCol: 0,
  reqCol: 1,
  prefix: "PFR",
  skipHeaderPred: commonSkip,
});

const carbonated = parseModule("Carbonated processing", {
  numCol: 0,
  reqCol: 1,
  prefix: "CARB",
  skipHeaderPred: commonSkip,
});

const equipmentTech = parseModule("Equipment technology and proces", {
  numCol: 0,
  reqCol: 1,
  prefix: "ETP",
  skipHeaderPred: commonSkip,
});

const ice = parseModule("Immediate Consumption Equipment", {
  numCol: 0,
  reqCol: 1,
  prefix: "ICE",
  skipHeaderPred: commonSkip,
});

const envMonitoring = parseModule("Enviromental Monitoring", {
  numCol: 0,
  reqCol: 1,
  prefix: "ENVM",
  skipHeaderPred: commonSkip,
  // Unnumbered full requirements (e.g. zoning definition, intrinsic factors intro).
  inferUnnumberedRequirements: true,
  // Excel #10 "Target Microorganisms", #34 "Verification of sampling", etc.
  treatNumberedSectionTitles: true,
});

const emp = parseModule("Environmental Monitoring Prog", {
  numCol: 0,
  reqCol: 1,
  prefix: "EMP",
  skipHeaderPred: commonSkip,
  // Excel numbers section titles (Requirements, Zoning, Target Microorganisms, …).
  // Dual #6: first is section "Zoning", second is the zoning requirement.
  treatNumberedSectionTitles: true,
});

const productionProcess = parseModule("Production Process and Monitori", {
  numCol: 0,
  reqCol: 1,
  prefix: "PPM",
  skipHeaderPred: commonSkip,
});

const marketplace = parseModule("Marketplace Monitoring ", {
  numCol: 0,
  reqCol: 1,
  prefix: "MM",
  skipHeaderPred: commonSkip,
});

const sensory = parseModule("Sensory Testing ", {
  numCol: 0,
  reqCol: 1,
  prefix: "ST",
  skipHeaderPred: commonSkip,
  // Excel omits # for requirement between 5 and 7 (should be #6).
  inferUnnumberedRequirements: true,
  // Excel #16 is the section title "Sensory Evaluation Test Protocols".
  treatNumberedSectionTitles: true,
});

const cleaning = parseModule("Cleaning and Sanitation ", {
  numCol: 0,
  reqCol: 1,
  prefix: "CS",
  skipHeaderPred: commonSkip,
  // Excel omits # for requirement between 5 and 7, and all items after #19.
  inferUnnumberedRequirements: true,
  // Excel #8 is the section title "Cleaning Effectiveness Validation".
  treatNumberedSectionTitles: true,
});

const foodAllergen = parseModule("Food Allergen and Control", {
  numCol: 0,
  reqCol: 1,
  prefix: "FAC",
  skipHeaderPred: commonSkip,
  // Excel omits # for requirements between 5→7 and 8→10.
  inferUnnumberedRequirements: true,
  // Excel #14 is the section title "Receipt, Storage and Handling".
  treatNumberedSectionTitles: true,
});

const warehouse = parseModule("Warehouse and Distrubution", {
  numCol: 0,
  reqCol: 1,
  prefix: "WD",
  skipHeaderPred: commonSkip,
  // Excel omits # for requirement between 5 and 7, and nearly all items after #10.
  inferUnnumberedRequirements: true,
});

const packagingSpecs = parseModule("Packaging Specifications", {
  numCol: 0,
  reqCol: 1,
  prefix: "PS",
  skipHeaderPred: commonSkip,
});

const waterProductMfg = parseModule("Water for Product Manufacturing", {
  numCol: 0,
  reqCol: 1,
  prefix: "WPM",
  skipHeaderPred: commonSkip,
  // Excel #1/#9/#15/#20/#24/#27/#28/#30 are section titles.
  treatNumberedSectionTitles: true,
});

const waterMonitoring = parseModule("Water Monitoring Requirements ", {
  numCol: 0,
  reqCol: 1,
  prefix: "WMR",
  skipHeaderPred: commonSkip,
  // Excel #1/#5/#8/#13/#15/#17 are section titles (incl. longer OOS title).
  treatNumberedSectionTitles: true,
  numberedSectionMaxWords: 8,
});

const designWater = parseModule("Design and Operation of Water ", {
  numCol: 0,
  reqCol: 1,
  prefix: "DOW",
  skipHeaderPred: commonSkip,
  // Many numbered rows are section titles (Requirements, Municipal Supply, Well Design, …).
  treatNumberedSectionTitles: true,
});

// All modules: scoreable questions numbered 1..N in checklist order (Excel # is not used for display).
const modules = [
  {
    id: "qfs-kore-general-operating-requirements-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:General Operating Requirements PRP-RQ-001",
    sectionTitle: "General Operating Requirements",
    title: "KORE QFS Internal Audit Checklist — General Operating Requirements",
    description:
      "KORE QFS internal audit checklist for General Operating Requirements. Score findings as Compliance / Non Compliance.",
    content: gor,
  },
  {
    id: "qfs-kore-imcr-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE:Incident Management & Crisis Resolution (IMCR) for Operations PRP-RQ-005",
    sectionTitle: "Incident Management & Crisis Resolution (IMCR)",
    title:
      "KORE QFS Internal Audit Checklist — Incident Management & Crisis Resolution (IMCR)",
    description:
      "KORE QFS internal audit checklist for Incident Management & Crisis Resolution (IMCR). Score findings as Compliance / Non Compliance.",
    content: imcr,
  },
  {
    id: "qfs-kore-gmp-facility-design-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE:PRP-RQ-010 Good Manufacturing Practices Facility Design",
    sectionTitle: "GMP Facility Design",
    title: "KORE QFS Internal Audit Checklist — GMP Facility Design",
    description:
      "KORE QFS internal audit checklist for Good Manufacturing Practices Facility Design. Score findings as Compliance / Non Compliance.",
    content: gmp,
  },
  {
    id: "qfs-kore-security-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE: PRP-RQ-012 Security, Asset Protection, and Cybersecurity of Facilities and Information",
    sectionTitle: "Security",
    title: "KORE QFS Internal Audit Checklist — Security",
    description:
      "KORE QFS internal audit checklist for Security, Asset Protection, and Cybersecurity. Score findings as Compliance / Non Compliance.",
    content: security,
  },
  {
    id: "qfs-kore-maintenance-program-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:PRP-RQ-014 Maintenance Program",
    sectionTitle: "Maintenance Program",
    title: "KORE QFS Internal Audit Checklist — Maintenance Program",
    description:
      "KORE QFS internal audit checklist for Maintenance Program. Score findings as Compliance / Non Compliance.",
    content: maint,
  },
  {
    id: "qfs-kore-calibration-and-verification-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:PRP-RQ-016 Calibration and Verification Program",
    sectionTitle: "Calibration and Verification",
    title: "KORE QFS Internal Audit Checklist — Calibration and Verification",
    description:
      "KORE QFS internal audit checklist for Calibration and Verification Program. Score findings as Compliance / Non Compliance.",
    content: cal,
  },
  {
    id: "qfs-kore-pest-control-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:PRP-RQ-018 Good Manufacturing Practices Pest Control",
    sectionTitle: "Pest Control",
    title: "KORE QFS Internal Audit Checklist — Pest Control",
    description:
      "KORE QFS internal audit checklist for Good Manufacturing Practices Pest Control. Score findings as Compliance / Non Compliance.",
    content: pest,
  },
  {
    id: "qfs-kore-ppe-and-personnel-hygiene-checklist",
    layout: "requirement",
    scoreMode: "compliance-exception-noncompliance",
    moduleLabel:
      "MODULE: PRP-RQ-020 Good Manufacturing Practices Personnel Practices/ Personal Hygiene",
    sectionTitle: "PPE and Personnel Hygiene",
    title: "KORE QFS Internal Audit Checklist — PPE and Personnel Hygiene",
    description:
      "KORE QFS internal audit checklist for PPE and Personnel Hygiene. Score findings as Compliance (2) / Meet with Exceptions (1) / Non Compliance (0).",
    content: ppe,
  },
  {
    id: "qfs-kore-control-and-destruction-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE: PRP-RQ-030 Control, Destruction and Disposal of Trademarked Materials and Nonconforming Products",
    sectionTitle: "Control and Destruction",
    title: "KORE QFS Internal Audit Checklist — Control and Destruction",
    description:
      "KORE QFS internal audit checklist for Control, Destruction and Disposal of Trademarked Materials and Nonconforming Products. Score findings as Compliance / Non Compliance.",
    content: ctrl,
  },
  {
    id: "qfs-kore-records-management-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE: PRP-RQ-060 Records Management",
    sectionTitle: "Records Management",
    title: "KORE QFS Internal Audit Checklist — Records Management",
    description:
      "KORE QFS internal audit checklist for Records Management. Score findings as Compliance / Non Compliance.",
    content: records,
  },
  {
    id: "qfs-kore-consumer-engagement-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE: PRP-RQ-070 Customer and Consumer Engagement and Response",
    sectionTitle: "Consumer Engagement",
    title: "KORE QFS Internal Audit Checklist — Consumer Engagement",
    description:
      "KORE QFS internal audit checklist for Customer and Consumer Engagement and Response. Score findings as Compliance / Non Compliance.",
    content: consumer,
  },
  {
    id: "qfs-kore-retention-samples-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE: QFS-RQ-050 Retention Samples",
    sectionTitle: "Retention Samples",
    title: "KORE QFS Internal Audit Checklist — Retention Samples",
    description:
      "KORE QFS internal audit checklist for Retention Samples. Score findings as Compliance / Non Compliance.",
    content: retention,
  },
  {
    id: "qfs-kore-haccp-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE: QFS-RQ-080 Hazard Analysis and Critical Control Points",
    sectionTitle: "HACCP",
    title: "KORE QFS Internal Audit Checklist — HACCP",
    description:
      "KORE QFS internal audit checklist for Hazard Analysis and Critical Control Points (HACCP). Score findings as Compliance / Non Compliance.",
    content: haccp,
  },
  {
    id: "qfs-kore-labeling-coding-and-traceability-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE: QFS-RQ-090 Labeling, Coding, and Traceability",
    sectionTitle: "Labeling, Coding, and Traceability",
    title: "KORE QFS Internal Audit Checklist — Labeling, Coding, and Traceability",
    description:
      "KORE QFS internal audit checklist for Labeling, Coding, and Traceability. Score findings as Compliance / Non Compliance.",
    content: labelling,
  },
  {
    id: "qfs-kore-incoming-receipt-and-handling-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE: QFS-RQ-100 Incoming Receipt, Storage and Handling of Ingredients and Packaging Materials",
    sectionTitle: "Incoming Receipt and Handling",
    title: "KORE QFS Internal Audit Checklist — Incoming Receipt and Handling",
    description:
      "KORE QFS internal audit checklist for Incoming Receipt, Storage and Handling of Ingredients and Packaging Materials. Score findings as Compliance / Non Compliance.",
    content: incoming,
  },
  {
    id: "qfs-kore-package-handling-and-preparation-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE: QFS-RQ-200 Package Handling and Preparation",
    sectionTitle: "Package Handling and Preparation",
    title: "KORE QFS Internal Audit Checklist — Package Handling and Preparation",
    description:
      "KORE QFS internal audit checklist for Package Handling and Preparation. Score findings as Compliance / Non Compliance.",
    content: packageHandling,
  },
  {
    id: "qfs-kore-mixing-and-blending-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:QFS-RQ-205 Mixing and Blending",
    sectionTitle: "Mixing and Blending",
    title: "KORE QFS Internal Audit Checklist — Mixing and Blending",
    description:
      "KORE QFS internal audit checklist for Mixing and Blending. Score findings as Compliance / Non Compliance.",
    content: mixing,
  },
  {
    id: "qfs-kore-processing-and-filling-requirements-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE:QFS-RQ-300 Processing and Filling General Requirements",
    sectionTitle: "Processing and Filling Requirements",
    title:
      "KORE QFS Internal Audit Checklist — Processing and Filling Requirements",
    description:
      "KORE QFS internal audit checklist for Processing and Filling General Requirements. Score findings as Compliance / Non Compliance.",
    content: processingFilling,
  },
  {
    id: "qfs-kore-carbonated-processing-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:QFS-RQ-308 Carbonated processing",
    sectionTitle: "Carbonated processing",
    title: "KORE QFS Internal Audit Checklist — Carbonated processing",
    description:
      "KORE QFS internal audit checklist for Carbonated processing. Score findings as Compliance / Non Compliance.",
    content: carbonated,
  },
  {
    id: "qfs-kore-equipment-technology-and-process-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE:QFS-RQ-400 Equipment Technology and Process Change validation",
    sectionTitle: "Equipment Technology and Process",
    title:
      "KORE QFS Internal Audit Checklist — Equipment Technology and Process",
    description:
      "KORE QFS internal audit checklist for Equipment Technology and Process Change validation. Score findings as Compliance / Non Compliance.",
    content: equipmentTech,
  },
  {
    id: "qfs-kore-immediate-consumption-equipment-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:QFS-RQ-500 Immediate Consumption Equipment (ICE)",
    sectionTitle: "Immediate Consumption Equipment",
    title:
      "KORE QFS Internal Audit Checklist — Immediate Consumption Equipment",
    description:
      "KORE QFS internal audit checklist for Immediate Consumption Equipment (ICE). Score findings as Compliance / Non Compliance.",
    content: ice,
  },
  {
    id: "qfs-kore-environmental-monitoring-program-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:QFS-RQ-440 Environmental Monitoring Program",
    sectionTitle: "Environmental Monitoring Program",
    title: "KORE QFS Internal Audit Checklist — Environmental Monitoring Program",
    description:
      "KORE QFS internal audit checklist for Environmental Monitoring Program (detailed requirements). Score findings as Compliance / Non Compliance.",
    content: envMonitoring,
  },
  {
    id: "qfs-kore-environmental-monitoring-programme-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE: QFS-RQ-440 Environmental Monitoring Programme",
    sectionTitle: "Environmental Monitoring Programme",
    title:
      "KORE QFS Internal Audit Checklist — Environmental Monitoring Programme",
    description:
      "KORE QFS internal audit checklist for Environmental Monitoring Programme (audit checklist). Score findings as Compliance / Non Compliance.",
    content: emp,
  },
  {
    id: "qfs-kore-production-process-and-monitoring-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE:QFS-RQ-600 Production Process Monitoring and Control",
    sectionTitle: "Production Process and Monitoring",
    title:
      "KORE QFS Internal Audit Checklist — Production Process and Monitoring",
    description:
      "KORE QFS internal audit checklist for Production Process Monitoring and Control. Score findings as Compliance / Non Compliance.",
    content: productionProcess,
  },
  {
    id: "qfs-kore-marketplace-monitoring-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:QFS-RQ-605 Marketplace Monitoring",
    sectionTitle: "Marketplace Monitoring",
    title: "KORE QFS Internal Audit Checklist — Marketplace Monitoring",
    description:
      "KORE QFS internal audit checklist for Marketplace Monitoring. Score findings as Compliance / Non Compliance.",
    content: marketplace,
  },
  {
    id: "qfs-kore-sensory-testing-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE:QFS-RQ-650 Sensory Testing for Manufacturing Facilities",
    sectionTitle: "Sensory Testing",
    title: "KORE QFS Internal Audit Checklist — Sensory Testing",
    description:
      "KORE QFS internal audit checklist for Sensory Testing. Score findings as Compliance / Non Compliance.",
    content: sensory,
  },
  {
    id: "qfs-kore-cleaning-and-sanitation-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:QFS-RQ-750 Cleaning and Sanitizing",
    sectionTitle: "Cleaning and Sanitation",
    title: "KORE QFS Internal Audit Checklist — Cleaning and Sanitation",
    description:
      "KORE QFS internal audit checklist for Cleaning and Sanitation. Score findings as Compliance / Non Compliance.",
    content: cleaning,
  },
  {
    id: "qfs-kore-food-allergen-and-control-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:QFS-RQ-760 Food Allergen Management and Control",
    sectionTitle: "Food Allergen and Control",
    title: "KORE QFS Internal Audit Checklist — Food Allergen and Control",
    description:
      "KORE QFS internal audit checklist for Food Allergen Management and Control. Score findings as Compliance / Non Compliance.",
    content: foodAllergen,
  },
  {
    id: "qfs-kore-warehouse-and-distribution-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:QFS-RQ-900 Warehouse and Distribution",
    sectionTitle: "Warehouse and Distribution",
    title: "KORE QFS Internal Audit Checklist — Warehouse and Distribution",
    description:
      "KORE QFS internal audit checklist for Warehouse and Distribution. Score findings as Compliance / Non Compliance.",
    content: warehouse,
  },
  {
    id: "qfs-kore-packaging-specifications-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE:QFS-SP-960 Packaging Specifications",
    sectionTitle: "Packaging Specifications",
    title: "KORE QFS Internal Audit Checklist — Packaging Specifications",
    description:
      "KORE QFS internal audit checklist for Packaging Specifications. Score findings as Compliance / Non Compliance.",
    content: packagingSpecs,
  },
  {
    id: "qfs-kore-water-for-product-manufacturing-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE: QFS-RQ-180 Water for Product Manufacturing",
    sectionTitle: "Water for Product Manufacturing",
    title:
      "KORE QFS Internal Audit Checklist — Water for Product Manufacturing",
    description:
      "KORE QFS internal audit checklist for Water for Product Manufacturing. Score findings as Compliance / Non Compliance.",
    content: waterProductMfg,
  },
  {
    id: "qfs-kore-water-monitoring-requirements-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel:
      "MODULE: QFS-RQ-185 Water Monitoring Requirements and Specifications",
    sectionTitle: "Water Monitoring Requirements",
    title:
      "KORE QFS Internal Audit Checklist — Water Monitoring Requirements",
    description:
      "KORE QFS internal audit checklist for Water Monitoring Requirements and Specifications. Score findings as Compliance / Non Compliance.",
    content: waterMonitoring,
  },
  {
    id: "qfs-kore-design-and-operation-of-water-checklist",
    layout: "requirement",
    scoreMode: "compliance-noncompliance",
    moduleLabel: "MODULE: QFS-RQ-197 Design and Operation of Water Sources",
    sectionTitle: "Design and Operation of Water",
    title:
      "KORE QFS Internal Audit Checklist — Design and Operation of Water",
    description:
      "KORE QFS internal audit checklist for Design and Operation of Water Sources. Score findings as Compliance / Non Compliance.",
    content: designWater,
  },
];

const metaLines = modules
  .map(
    (m) => `    {
        id: ${JSON.stringify(m.id)},
        layout: ${JSON.stringify(m.layout)},
        scoreMode: ${JSON.stringify(m.scoreMode)},
        moduleLabel: ${JSON.stringify(m.moduleLabel)},
        sectionTitle: ${JSON.stringify(m.sectionTitle)},
    }`,
  )
  .join(",\n");

const templateBlocks = modules
  .map((m) => {
    const content = m.content
      .map((c) => "            " + JSON.stringify(c, null, 2).replace(/\n/g, "\n            "))
      .join(",\n");
    return `    {
        id: ${JSON.stringify(m.id)},
        title: ${JSON.stringify(m.title)},
        standard: "ISO 22000",
        type: "checklist",
        alwaysAvailableInPlan: true,
        module: "QFS KORE",
        description: ${JSON.stringify(m.description)},
        content: [
${content}
        ],
    }`;
  })
  .join(",\n");

const file = `// Auto-generated from QFS KORE Audit Checklist.xlsx
// Question text copied exactly from Excel. Clause ids use sequential question numbers (1..N per module);
// section subheadings use PREFIX-SEC-* and show as — in execute/preview.
import type { AuditTemplate } from "./auditTemplateTypes";

export const QFS_KORE_EXCEL_MODULE_META = [
${metaLines}
] as const;

export const QFS_KORE_EXCEL_MODULE_TEMPLATES: AuditTemplate[] = [
${templateBlocks}
];
`;

fs.writeFileSync(outPath, file);
console.log("Wrote", outPath);
for (const m of modules) {
  const qs = m.content.filter((c) => !String(c.clause).includes("-SEC-")).length;
  const secs = m.content.filter((c) => String(c.clause).includes("-SEC-")).length;
  console.log(m.id, "items", m.content.length, "questions", qs, "sections", secs);
  let expected = 0;
  for (const c of m.content) {
    if (String(c.clause).includes("-SEC-")) continue;
    expected += 1;
    const suffix = Number(String(c.clause).replace(/^[A-Za-z0-9]+-/i, ""));
    if (suffix !== expected) {
      console.warn("  numbering gap:", m.id, "expected", expected, "got", c.clause);
    }
  }
  if (m.id === "qfs-kore-environmental-monitoring-program-checklist") {
    const text = m.content.map((c) => c.question).join("\n");
    if (text.includes("1.1 Obtain Operating Unit")) {
      console.warn("  PROGRAMME text leaked into Environmental Monitoring Program:", m.id);
    }
    if (!text.includes("General requirements")) {
      console.warn("  missing General requirements section:", m.id);
    }
  }
  if (m.id === "qfs-kore-environmental-monitoring-programme-checklist") {
    const text = m.content.map((c) => c.question).join("\n");
    if (!text.includes("1.1 Obtain Operating Unit")) {
      console.warn("  missing Programme combined requirement 1.1:", m.id);
    }
    if (text.includes("General requirements")) {
      console.warn("  PROGRAM text leaked into Environmental Monitoring Programme:", m.id);
    }
  }
}
