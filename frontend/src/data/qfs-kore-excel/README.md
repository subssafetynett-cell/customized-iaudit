# QFS KORE Excel source files

Drop the QFS KORE Audit Checklist Excel workbook here:

`QFS KORE Audit Checklist.xlsx`

## Status

| Module | Status |
|--------|--------|
| General Operating Requirements | Converted |
| IMCR | Converted |
| GMP Facility Design | Converted |
| Security | Converted |
| Maintenance Program | Converted |
| Calibration and Verification | Converted |
| Pest Control | Converted |
| PPE and Personnel Hygiene | Converted |
| Control and Destruction | Converted |
| Records Management | Converted |
| Consumer Engagement | Converted |
| Retention Samples | Converted |
| HACCP | Converted |
| Labeling, Coding, and Traceability | Converted |
| Incoming Receipt and Handling | Converted |
| Package Handling and Preparation | Converted |
| Mixing and Blending | Converted |
| Processing and Filling Requirements | Converted |
| Carbonated processing | Converted |
| Equipment Technology and Process | Converted |
| Immediate Consumption Equipment | Converted |
| Environmental Monitoring Programme | Converted |
| Production Process and Monitoring | Converted |
| Marketplace Monitoring | Converted |
| Sensory Testing | Converted |
| Cleaning and Sanitation | Converted |
| Food Allergen and Control | Converted |
| Warehouse and Distribution | Converted |
| Packaging Specifications | Converted |
| Water for Product Manufacturing | Converted |
| Water Monitoring Requirements | Converted |
| Design and Operation of Water | Converted |
| Remaining sheets | None — all unique checklist modules converted |

Regenerate templates from the workbook:

```bash
node src/data/qfs-kore-excel/generate-qfs-modules.mjs
```

Question text is copied exactly from Excel (sample answers / evidence / auditor names / revision / issue date are not imported). Excel grey-fill rows are imported as section subheadings (`PREFIX-SEC-N`) — not scoreable questions — and render as a full-width grey bar in execute/preview. Execute/preview show numeric `#` only (section headers and Excel-unnumbered rows show as —); plan “view selected checklist” shows internal ids (`GOR-1`, `IMCR-1`, `GMP-1`, `SEC-1`, `MAINT-2`, `CAL-2`, `PEST-2`, `PPE-2`, `CTRL-2`, `REC-2`, `CE-2`, `RET-2`, `HACCP-2`, `LCT-2`, `IRH-2`, `PHP-2`, `MB-2`, `PFR-1`, `CARB-1`, `ETP-1`, `ICE-1`, `EMP-3`, `PPM-1`, `MM-1`, `ST-1`, `CS-1`, `FAC-2`, `WD-1`, `PS-1`, `WPM-2`, `WMR-2`, `DOW-3`, …). Most modules use Compliance / Non Compliance; PPE and Personnel Hygiene uses Compliance (2) / Meet with Exceptions (1) / Non Compliance (0) as in Excel.
