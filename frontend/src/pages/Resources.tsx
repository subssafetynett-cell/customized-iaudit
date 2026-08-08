import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VIDEOS = [
  {
    id: "getting-started",
    title: "User Management",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786170103/iAudit_User_1_b5hnyl.mp4",
  },
  {
    id: "self-assessment",
    title: "Self Assessment",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786170151/iAudit_Self_assessment_gkxcps.mp4",
  },
  {
    id: "gap-analysis",
    title: "Gap Analysis",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786170144/iAudit_Gap_analysis_ppyawc.mp4",
  },
  {
    id: "audit-program",
    title: "Audit Program Overview",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786200664/iAudit_audit_prgrm_module_final_1_eptcni.mp4",
  },
  {
    id: "audit-program-final",
    title: "Audit Program Detail",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786202466/iAudit_audit_program_Final_Compressed_hnbeed.mp4",
  },
  {
    id: "audit-plan",
    title: "Audit Plan",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786201160/iAudit_audit_plan_1_jardpy.mp4",
  },
  {
    id: "audit-templates",
    title: "Audit Templates",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786170131/iAudit_Audit_templates_irmzfs.mp4",
  },
  {
    id: "audit-final",
    title: "Audit Execution",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786201773/iAudit_Audit_Final_Compressed_jmrcdm.mp4",
  },
  {
    id: "findings",
    title: "Audit Findings",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786170176/iAudit_Findings_F_bi2fnz.mp4",
  },
  {
    id: "findings-dashboard",
    title: "Findings Dashboard",
    url: "https://res.cloudinary.com/dntdqpato/video/upload/v1786170133/iAudit_Findings_Dashboard_rbuoqo.mp4",
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
                  <source src={video.url} type="video/mp4" />
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
