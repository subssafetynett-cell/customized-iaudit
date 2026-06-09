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
  emptyKeyPersonnelRow,
  type FindingsReportForm,
} from "@/lib/findingsReportForm";
import { SignatureInput } from "./SignatureInput";

interface AuditFindingsReportFormProps {
  value: FindingsReportForm;
  onChange: (next: FindingsReportForm) => void;
  section?: "header" | "footer" | "all";
}

export function AuditFindingsReportForm({
  value,
  onChange,
  section = "all",
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

  if (section === "header") {
    return (
      <Card className="border border-slate-200 shadow-md mb-8">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-lg font-bold text-slate-900">
            Audit Findings Report (SH-CP-FM-11)
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Complete these fields before starting the audit. Section 4.1
            non-conformities are taken from your findings table below.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="fr-issue-date">Issue Date</Label>
              <Input
                id="fr-issue-date"
                placeholder="dd/mm/yy"
                value={value.issueDate}
                onChange={(e) => patch({ issueDate: e.target.value })}
              />
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 underline">
              1. MANAGEMENT SYSTEM
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fr-management-system">Management System</Label>
                <Input
                  id="fr-management-system"
                  value={value.managementSystem}
                  onChange={(e) => patch({ managementSystem: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fr-department">Department</Label>
                <Input
                  id="fr-department"
                  value={value.department}
                  onChange={(e) => patch({ department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fr-audit-date">Date of Audit</Label>
                <Input
                  id="fr-audit-date"
                  placeholder="dd/mm/yy"
                  value={value.auditDate}
                  onChange={(e) => patch({ auditDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fr-auditors">Auditors</Label>
                <Input
                  id="fr-auditors"
                  value={value.auditors}
                  onChange={(e) => patch({ auditors: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fr-auditees">Auditees</Label>
                <Input
                  id="fr-auditees"
                  value={value.auditees}
                  onChange={(e) => patch({ auditees: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 underline">
              2. AUDIT SCOPE
            </h3>
            <Textarea
              rows={4}
              value={value.auditScope}
              onChange={(e) => patch({ auditScope: e.target.value })}
              placeholder="Describe the scope of the audit..."
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 underline">
              3. AUDIT CRITERIA AND METHOD
            </h3>
            <Textarea
              rows={4}
              value={value.auditCriteriaAndMethod}
              onChange={(e) => patch({ auditCriteriaAndMethod: e.target.value })}
              placeholder="Audit criteria, standards, and methods used..."
            />
          </section>
        </CardContent>
      </Card>
    );
  }

  if (section === "footer") {
    return (
      <Card className="border border-slate-200 shadow-md mb-8">
        <CardContent className="p-6 space-y-8">
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 underline">
              5.2 General Comment
            </h3>
            <Textarea
              rows={4}
              value={value.generalComment}
              onChange={(e) => patch({ generalComment: e.target.value })}
              placeholder="Overall audit comments and summary..."
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 underline">
              5.3 Key Personnel Interviewed
            </h3>
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
                          onChange={(e) =>
                            updatePersonnel(idx, "name", e.target.value)
                          }
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

          <section className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 underline">
              6. ACKNOWLEDGEMENT OF FINDINGS
            </h3>
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
        </CardContent>
      </Card>
    );
  }

  // default / "all"
  return (
    <Card className="border border-slate-200 shadow-md mb-8">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <CardTitle className="text-lg font-bold text-slate-900">
          Audit Findings Report (SH-CP-FM-11)
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Complete these fields before exporting PDF, Word, or Excel. Section 4.1
          non-conformities are taken from your findings table above.
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="fr-issue-date">Issue Date</Label>
            <Input
              id="fr-issue-date"
              placeholder="dd/mm/yy"
              value={value.issueDate}
              onChange={(e) => patch({ issueDate: e.target.value })}
            />
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 underline">
            1. MANAGEMENT SYSTEM
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fr-management-system">Management System</Label>
              <Input
                id="fr-management-system"
                value={value.managementSystem}
                onChange={(e) => patch({ managementSystem: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-department">Department</Label>
              <Input
                id="fr-department"
                value={value.department}
                onChange={(e) => patch({ department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-audit-date">Date of Audit</Label>
              <Input
                id="fr-audit-date"
                placeholder="dd/mm/yy"
                value={value.auditDate}
                onChange={(e) => patch({ auditDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-auditors">Auditors</Label>
              <Input
                id="fr-auditors"
                value={value.auditors}
                onChange={(e) => patch({ auditors: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-auditees">Auditees</Label>
              <Input
                id="fr-auditees"
                value={value.auditees}
                onChange={(e) => patch({ auditees: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 underline">
            2. AUDIT SCOPE
          </h3>
          <Textarea
            rows={4}
            value={value.auditScope}
            onChange={(e) => patch({ auditScope: e.target.value })}
            placeholder="Describe the scope of the audit..."
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 underline">
            3. AUDIT CRITERIA AND METHOD
          </h3>
          <Textarea
            rows={4}
            value={value.auditCriteriaAndMethod}
            onChange={(e) => patch({ auditCriteriaAndMethod: e.target.value })}
            placeholder="Audit criteria, standards, and methods used..."
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 underline">
            4.2 General Comment
          </h3>
          <Textarea
            rows={4}
            value={value.generalComment}
            onChange={(e) => patch({ generalComment: e.target.value })}
            placeholder="Overall audit comments and summary..."
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 underline">
            4.3 Key Personnel Interviewed
          </h3>
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
                        onChange={(e) =>
                          updatePersonnel(idx, "name", e.target.value)
                        }
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

        <section className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 underline">
            5. ACKNOWLEDGEMENT OF FINDINGS
          </h3>
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
      </CardContent>
    </Card>
  );
}
