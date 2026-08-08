import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VIDEOS = [
  {
    id: "getting-started",
    title: "User Management",
    filename: "iaudit_user_1.mp4",
  },
  {
    id: "self-assessment",
    title: "Self Assessment",
    filename: "iaudit_self_assessment.mp4",
  },
  {
    id: "gap-analysis",
    title: "Gap Analysis",
    filename: "iaudit_gap_analysis.mp4",
  },
  {
    id: "audit-program",
    title: "Audit Program Overview",
    filename: "iaudit_audit_prgrm_module_final.mp4",
  },
  {
    id: "audit-program-final",
    title: "Audit Program Detail",
    filename: "iaudit_audit_program_final.mp4",
  },
  {
    id: "audit-plan",
    title: "Audit Plan",
    filename: "iaudit_audit_plan.mp4",
  },
  {
    id: "audit-templates",
    title: "Audit Templates",
    filename: "iaudit_audit_templates.mp4",
  },
  {
    id: "audit-final",
    title: "Audit Execution",
    filename: "iaudit_audit_final.mp4",
  },
  {
    id: "findings",
    title: "Audit Findings",
    filename: "iaudit_findings_f.mp4",
  },
  {
    id: "findings-dashboard",
    title: "Findings Dashboard",
    filename: "iaudit_findings_dashboard.mp4",
  },
];

export default function Resources() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Resources
        </h1>
        <p className="text-muted-foreground text-lg">
          Watch these instructional videos to learn how to use the iAudit platform effectively.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {VIDEOS.map((video) => (
          <Card key={video.id} className="overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
              <CardTitle className="text-base font-semibold text-slate-800">
                {video.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="aspect-video bg-black/5 relative flex items-center justify-center">
                <video
                  className="w-full h-full object-contain bg-black"
                  controls
                  preload="metadata"
                >
                  <source src={`/videos/${video.filename}`} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
