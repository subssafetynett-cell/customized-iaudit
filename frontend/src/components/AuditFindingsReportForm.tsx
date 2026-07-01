import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  emptyCustomField,
  emptyKeyPersonnelRow,
  getFieldLabel,
  getSectionLabel,
  isFieldVisible,
  type FindingsReportCustomField,
  type FindingsReportCustomFieldSection,
  type FindingsReportFieldKey,
  type FindingsReportForm,
} from "@/lib/findingsReportForm";
import { SignatureInput } from "./SignatureInput";
import { EditableFindingsField } from "./EditableFindingsField";

interface AuditFindingsReportFormProps {
  value: FindingsReportForm;
  onChange: (next: FindingsReportForm) => void;
  section?: "header" | "footer" | "all";
  nonConformances?: { id?: string; statement?: string }[];
}

export function AuditFindingsReportForm({
  value,
  onChange,
  section = "all",
  nonConformances = [],
}: AuditFindingsReportFormProps) {
  const patch = (partial: Partial<FindingsReportForm>) =>
    onChange({ ...value, ...partial });

  const patchAck = (partial: Partial<FindingsReportForm["acknowledgement"]>) =>
    onChange({
      ...value,
      acknowledgement: { ...value.acknowledgement, ...partial },
    });

  const updatePersonnel = (
    index: number,
    field: keyof FindingsReportForm["keyPersonnel"][number],
    fieldValue: string,
  ) => {
    const keyPersonnel = value.keyPersonnel.map((row, i) =>
      i === index ? { ...row, [field]: fieldValue } : row,
    );
    onChange({ ...value, keyPersonnel });
  };

  const addPersonnelRow = () =>
    onChange({
      ...value,
      keyPersonnel: [...value.keyPersonnel, emptyKeyPersonnelRow()],
    });

  const removePersonnelRow = (index: number) => {
    if (value.keyPersonnel.length <= 1) return;
    onChange({
      ...value,
      keyPersonnel: value.keyPersonnel.filter((_, i) => i !== index),
    });
  };

  const setFieldLabel = (key: FindingsReportFieldKey, label: string) =>
    patch({ fieldLabels: { ...value.fieldLabels, [key]: label } });

  const hideField = (key: FindingsReportFieldKey) =>
    patch({ hiddenFields: [...(value.hiddenFields || []), key] });

  const setSectionLabel = (
    key: keyof FindingsReportForm["sectionLabels"],
    label: string,
  ) => patch({ sectionLabels: { ...value.sectionLabels, [key]: label } });

  const hideSection = (fieldKey: FindingsReportFieldKey) => hideField(fieldKey);

  const addCustomField = (section: FindingsReportCustomFieldSection) =>
    patch({ customFields: [...(value.customFields || []), emptyCustomField(section)] });

  const updateCustomField = (
    id: string,
    partial: Partial<FindingsReportCustomField>,
  ) =>
    patch({
      customFields: (value.customFields || []).map((field) =>
        field.id === id ? { ...field, ...partial } : field,
      ),
    });

  const removeCustomField = (id: string) =>
    patch({
      customFields: (value.customFields || []).filter((field) => field.id !== id),
    });

  const renderEditableField = (
    key: FindingsReportFieldKey,
    fieldValue: string,
    onValueChange: (next: string) => void,
    options?: { placeholder?: string; multiline?: boolean },
  ) => {
    if (!isFieldVisible(value, key)) return null;
    return (
      <EditableFindingsField
        key={key}
        inputId={`fr-${key}`}
        label={getFieldLabel(value, key)}
        value={fieldValue}
        onLabelChange={(label) => setFieldLabel(key, label)}
        onValueChange={onValueChange}
        onDelete={() => hideField(key)}
        placeholder={options?.placeholder}
        multiline={options?.multiline}
      />
    );
  };

  const renderCustomFields = (section: FindingsReportCustomFieldSection) =>
    (value.customFields || [])
      .filter((field) => field.section === section)
      .map((field) => (
        <EditableFindingsField
          key={field.id}
          inputId={`fr-custom-${field.id}`}
          label={field.label}
          value={field.value}
          onLabelChange={(label) => updateCustomField(field.id, { label })}
          onValueChange={(next) => updateCustomField(field.id, { value: next })}
          onDelete={() => removeCustomField(field.id)}
        />
      ));

  const documentHeaderFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderEditableField("docNumber", value.docNumber, (next) =>
          patch({ docNumber: next }),
          { placeholder: "e.g. SH-CP-FM-11" },
        )}
        {renderEditableField("reportTitle", value.reportTitle, (next) =>
          patch({ reportTitle: next }),
          { placeholder: "Audit Findings Report" },
        )}
        {renderEditableField("revisionNo", value.revisionNo, (next) =>
          patch({ revisionNo: next }),
          { placeholder: "e.g. 03" },
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
        {renderEditableField("issueDate", value.issueDate, (next) =>
          patch({ issueDate: next }),
          { placeholder: "dd/mm/yy" },
        )}
      </div>
      {renderCustomFields("document")}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => addCustomField("document")}
      >
        <Plus className="h-4 w-4" /> Add Field
      </Button>
    </div>
  );

  const managementFieldKeys: FindingsReportFieldKey[] = [
    "managementSystem",
    "department",
    "auditDate",
    "auditors",
    "auditees",
  ];

  const showManagementSection =
    managementFieldKeys.some((key) => isFieldVisible(value, key)) ||
    (value.customFields || []).some((field) => field.section === "management");

  const managementSystemSection = showManagementSection ? (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={getSectionLabel(value, "managementSystem")}
          onChange={(e) => setSectionLabel("managementSystem", e.target.value)}
          className="text-base font-bold text-slate-900 underline border-0 shadow-none px-0 h-auto flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-red-600 shrink-0"
          title="Remove section"
          onClick={() => {
            patch({
              hiddenFields: Array.from(
                new Set([...(value.hiddenFields || []), ...managementFieldKeys]),
              ),
            });
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {renderEditableField("managementSystem", value.managementSystem, (next) =>
          patch({ managementSystem: next }))}
        {renderEditableField("department", value.department, (next) =>
          patch({ department: next }))}
        {renderEditableField("auditDate", value.auditDate, (next) =>
          patch({ auditDate: next }),
          { placeholder: "dd/mm/yy" },
        )}
        {renderEditableField("auditors", value.auditors, (next) =>
          patch({ auditors: next }))}
        {renderEditableField("auditees", value.auditees, (next) =>
          patch({ auditees: next }))}
        {renderCustomFields("management")}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => addCustomField("management")}
      >
        <Plus className="h-4 w-4" /> Add Field
      </Button>
    </section>
  ) : null;

  const nonConformitiesSummarySection = (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={getSectionLabel(value, "nonConformitiesSummary")}
          onChange={(e) => setSectionLabel("nonConformitiesSummary", e.target.value)}
          className="text-base font-bold text-slate-900 underline border-0 shadow-none px-0 h-auto flex-1"
        />
      </div>
      <p className="text-xs text-slate-500">
        Pulled from your Non-conformances table above. Add or edit findings there to update this section in the report.
      </p>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="font-bold w-20">Number</TableHead>
              <TableHead className="font-bold">Statement of nonconformity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nonConformances.filter((nc) => nc.statement?.trim()).length > 0 ? (
              nonConformances
                .filter((nc) => nc.statement?.trim())
                .map((nc, idx) => (
                  <TableRow key={nc.id || idx}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>{nc.statement}</TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-slate-400 text-sm italic py-6 text-center">
                  No non-conformities recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );

  const keyPersonnelSection = (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={getSectionLabel(value, "keyPersonnel")}
          onChange={(e) => setSectionLabel("keyPersonnel", e.target.value)}
          className="text-base font-bold text-slate-900 underline border-0 shadow-none px-0 h-auto flex-1"
        />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="font-bold">Name</TableHead>
              <TableHead className="font-bold">Position</TableHead>
              <TableHead className="font-bold">Department</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.keyPersonnel.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="p-1">
                  <Input
                    className="border-0 shadow-none focus-visible:ring-1"
                    value={row.name}
                    onChange={(e) => updatePersonnel(idx, "name", e.target.value)}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    className="border-0 shadow-none focus-visible:ring-1"
                    value={row.position}
                    onChange={(e) =>
                      updatePersonnel(idx, "position", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    className="border-0 shadow-none focus-visible:ring-1"
                    value={row.department}
                    onChange={(e) =>
                      updatePersonnel(idx, "department", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                    onClick={() => removePersonnelRow(idx)}
                    disabled={value.keyPersonnel.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={addPersonnelRow}
      >
        <Plus className="h-4 w-4" /> Add Row
      </Button>
    </section>
  );

  const acknowledgementSection = (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={getSectionLabel(value, "acknowledgement")}
          onChange={(e) => setSectionLabel("acknowledgement", e.target.value)}
          className="text-base font-bold text-slate-900 underline border-0 shadow-none px-0 h-auto flex-1"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <SignatureInput
            id="fr-auditee-sig"
            label="Auditee Signature"
            value={value.acknowledgement.auditeeSignature}
            onChange={(val) => patchAck({ auditeeSignature: val })}
          />
          <div className="space-y-2">
            <Label htmlFor="fr-auditee-date">Date</Label>
            <Input
              id="fr-auditee-date"
              placeholder="dd/mm/yy"
              value={value.acknowledgement.auditeeDate}
              onChange={(e) => patchAck({ auditeeDate: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-4">
          <SignatureInput
            id="fr-auditor-sig"
            label="Auditor Signature"
            value={value.acknowledgement.auditorSignature}
            onChange={(val) => patchAck({ auditorSignature: val })}
          />
          <div className="space-y-2">
            <Label htmlFor="fr-auditor-date">Date</Label>
            <Input
              id="fr-auditor-date"
              placeholder="dd/mm/yy"
              value={value.acknowledgement.auditorDate}
              onChange={(e) => patchAck({ auditorDate: e.target.value })}
            />
          </div>
        </div>
      </div>
    </section>
  );

  const auditScopeSection = isFieldVisible(value, "auditScope") ? (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={getSectionLabel(value, "auditScope")}
          onChange={(e) => setSectionLabel("auditScope", e.target.value)}
          className="text-base font-bold text-slate-900 underline border-0 shadow-none px-0 h-auto flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-red-600"
          onClick={() => hideSection("auditScope")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        rows={4}
        value={value.auditScope}
        onChange={(e) => patch({ auditScope: e.target.value })}
        placeholder="Describe the scope of the audit..."
      />
      {renderCustomFields("content")}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => addCustomField("content")}
      >
        <Plus className="h-4 w-4" /> Add Field
      </Button>
    </section>
  ) : null;

  const auditCriteriaSection = isFieldVisible(value, "auditCriteriaAndMethod") ? (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={getSectionLabel(value, "auditCriteria")}
          onChange={(e) => setSectionLabel("auditCriteria", e.target.value)}
          className="text-base font-bold text-slate-900 underline border-0 shadow-none px-0 h-auto flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-red-600"
          onClick={() => hideSection("auditCriteriaAndMethod")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        rows={4}
        value={value.auditCriteriaAndMethod}
        onChange={(e) => patch({ auditCriteriaAndMethod: e.target.value })}
        placeholder="Audit criteria, standards, and methods used..."
      />
    </section>
  ) : null;

  const generalCommentSection = isFieldVisible(value, "generalComment") ? (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={getSectionLabel(value, "generalComment")}
          onChange={(e) => setSectionLabel("generalComment", e.target.value)}
          className="text-base font-bold text-slate-900 underline border-0 shadow-none px-0 h-auto flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-red-600"
          onClick={() => hideSection("generalComment")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        rows={4}
        value={value.generalComment}
        onChange={(e) => patch({ generalComment: e.target.value })}
        placeholder="Overall audit comments and summary..."
      />
    </section>
  ) : null;

  if (section === "header") {
    return (
      <Card className="border border-slate-200 shadow-md mb-8">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-lg font-bold text-slate-900">
            Audit Findings Report
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Complete these fields before starting the audit. Section 4.1
            non-conformities are taken from your findings table below.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {documentHeaderFields}
          {managementSystemSection}
          {auditScopeSection}
          {auditCriteriaSection}
        </CardContent>
      </Card>
    );
  }

  if (section === "footer") {
    return (
      <Card className="border border-slate-200 shadow-md mb-8">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-lg font-bold text-slate-900">
            Report Summary &amp; Sign-off
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Complete sections 4 and 5 before exporting. Signatures appear at the bottom of the downloaded report.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2">
            <Input
              value={getSectionLabel(value, "auditSummary")}
              onChange={(e) => setSectionLabel("auditSummary", e.target.value)}
              className="text-base font-bold text-blue-900 border-0 shadow-none px-0 h-auto bg-transparent"
            />
          </div>
          {nonConformitiesSummarySection}
          {generalCommentSection}
          {keyPersonnelSection}
          {acknowledgementSection}
        </CardContent>
      </Card>
    );
  }

  // default / "all"
  return (
    <Card className="border border-slate-200 shadow-md mb-8">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <CardTitle className="text-lg font-bold text-slate-900">
          Audit Findings Report
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Complete these fields before exporting PDF, Word, or Excel. Section 4.1
          non-conformities are taken from your findings table above.
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {documentHeaderFields}
        {managementSystemSection}
        {auditScopeSection}
        {auditCriteriaSection}
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2">
          <Input
            value={getSectionLabel(value, "auditSummary")}
            onChange={(e) => setSectionLabel("auditSummary", e.target.value)}
            className="text-base font-bold text-blue-900 border-0 shadow-none px-0 h-auto bg-transparent"
          />
        </div>
        {nonConformitiesSummarySection}
        {generalCommentSection}
        {keyPersonnelSection}
        {acknowledgementSection}
      </CardContent>
    </Card>
  );
}
