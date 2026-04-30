import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, User, LogOut, Settings, UserCircle, ChevronRight, GraduationCap, X, Info, GraduationCap as GraduationCapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import createCompanyGuide from "@/assets/create_company_guide.png";
import editCompanyGuide from "@/assets/edit_company_guide.png";
import addSiteGuide from "@/assets/add_site_guide.png";
import addSiteFormGuide from "@/assets/add_site_form_guide.png";
import createUserGuide from "@/assets/create_user_guide.png";
import createUserFormGuide from "@/assets/create_user_form_guide.png";
import selfAssessmentGuide from "@/assets/self_assessment_guide.png";
import gapAnalysisGuide from "@/assets/gap_analysis_guide.png";
import auditProgramGuide from "@/assets/audit_program_guide.png";
import auditProgramFormGuide from "@/assets/audit_program_form_guide.png";
import auditProgramTimelineGuide from "@/assets/audit_program_timeline_guide.png";
import auditProgramCreateGuide from "@/assets/audit_program_create_guide.png";
import auditPlanGuide from "@/assets/audit_plan_guide.png";
import auditPlanFormGuide from "@/assets/audit_plan_form_guide.png";
import auditExecuteGuide from "@/assets/audit_execute_guide.png";
import auditProgressGuide from "@/assets/audit_progress_guide.png";
import auditFindingsGuide from "@/assets/audit_findings_guide.png";

export function TopNav() {
  const navigate = useNavigate();
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // State to hold the dynamic user
  const [user, setUser] = useState({
    firstName: "Audit",
    lastName: "User",
    email: "user@example.com"
  });

  const [isOpen, setIsOpen] = useState(false);

  // Load user from localStorage on mount and listen for updates
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Fallback to default if names are missing
          setUser({
            firstName: parsedUser.firstName || "Audit",
            lastName: parsedUser.lastName || "User",
            email: parsedUser.email || "user@example.com"
          });
        } catch (e) {
          console.error("Failed to parse user from local storage");
        }
      }
    };

    handleStorageChange(); // Initial load

    window.addEventListener('user-profile-updated', handleStorageChange);

    return () => {
      window.removeEventListener('user-profile-updated', handleStorageChange);
    }
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const initials = `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase();

  return (
    <header className="h-20 flex items-center justify-between px-4 shrink-0 overflow-hidden bg-white border-b border-border/40">
      <div className="flex items-center">
        <SidebarTrigger className="lg:hidden h-10 w-10 text-muted-foreground mr-2" />
      </div>
      <div className="flex items-center gap-4">
        {/* Learn Option */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLearnModal(true)}
          className="flex items-center gap-2 text-slate-600 hover:text-primary hover:bg-primary/5 rounded-xl px-4 h-11 transition-all duration-300 group"
        >
          <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary/10 transition-colors">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight">App Instructions</span>
        </Button>

        {/* Dedicated Learn Modal */}
        <Dialog open={showLearnModal} onOpenChange={setShowLearnModal}>
          <DialogContent className="sm:max-w-2xl border-none shadow-2xl p-0 overflow-hidden rounded-[28px] max-h-[90vh] flex flex-col">
            <div className="bg-[#213847] p-8 text-white flex flex-col items-center text-center space-y-4 relative shrink-0">
              {/* Added High-Visibility Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLearnModal(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 transition-all duration-300"
              >
                <X className="h-6 w-6" />
              </Button>

              <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold tracking-tight text-white">App Instructions</DialogTitle>
                <p className="text-slate-300 text-sm max-w-[280px]">
                  Follow these steps to get started with iAudit.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white custom-scrollbar">
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-bold text-lg">1</span>
                  </div>
                  <div className="space-y-1.5 pt-1 text-left">
                    <p className="text-xl font-bold text-slate-900 tracking-tight">Step 1: Create a Company</p>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>click create company button</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>fill all fields</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>create company</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Guide Image */}
                <div
                  className="relative group rounded-2xl overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 cursor-zoom-in"
                  onClick={() => setSelectedImage(createCompanyGuide)}
                >
                  <img
                    src={createCompanyGuide}
                    alt="Create Company Guide"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Edit Company Instruction */}
              <div className="space-y-6 pt-8 border-t border-slate-100">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold text-lg">
                      <ChevronRight className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <p className="text-base text-slate-600 leading-relaxed font-medium">
                      After creating the company clicking edit icon you can edit the company details
                    </p>
                  </div>
                </div>

                {/* Visual Guide Image Step 2 (Edit) */}
                <div
                  className="relative group rounded-2xl overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 cursor-zoom-in"
                  onClick={() => setSelectedImage(editCompanyGuide)}
                >
                  <img
                    src={editCompanyGuide}
                    alt="Edit Company Guide"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Step 2: Create Site */}
              <div className="space-y-6 pt-8 border-t border-slate-100">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-bold text-lg">2</span>
                  </div>
                  <div className="space-y-1.5 pt-1 text-left">
                    <p className="text-xl font-bold text-slate-900 tracking-tight">Step 2: Create Site</p>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>click the add site button</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>fill the site details</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>create the site</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Guide Image Step 2 (Add Site) */}
                <div
                  className="relative group rounded-2xl overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 cursor-zoom-in"
                  onClick={() => setSelectedImage(addSiteGuide)}
                >
                  <img
                    src={addSiteGuide}
                    alt="Add Site Guide"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Second Visual Guide Image Step 2 (Form Modal) */}
                <div
                  className="relative group rounded-2xl overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 cursor-zoom-in"
                  onClick={() => setSelectedImage(addSiteFormGuide)}
                >
                  <img
                    src={addSiteFormGuide}
                    alt="Add Site Form Guide"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Step 3: Create User */}
              <div className="space-y-6 pt-8 border-t border-slate-100">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-bold text-lg">3</span>
                  </div>
                  <div className="space-y-1.5 pt-1 text-left">
                    <p className="text-xl font-bold text-slate-900 tracking-tight">Step 3: Create User</p>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>click create user button</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>fill the fields</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>enable sent welcome email</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>create the user</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Guide Image Step 3 */}
                <div
                  className="relative group rounded-2xl overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 cursor-zoom-in"
                  onClick={() => setSelectedImage(createUserGuide)}
                >
                  <img
                    src={createUserGuide}
                    alt="Create User Guide"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Second Visual Guide Image Step 3 (Form Modal) */}
                <div
                  className="relative group rounded-2xl overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 cursor-zoom-in"
                  onClick={() => setSelectedImage(createUserFormGuide)}
                >
                  <img
                    src={createUserFormGuide}
                    alt="Create User Form Guide"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Step 4: Self Assessment */}
              <div className="space-y-6 pt-8 border-t border-slate-100">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-bold text-lg">4</span>
                  </div>
                  <div className="space-y-3 pt-1 text-left">
                    <p className="text-xl font-bold text-slate-900 tracking-tight">Step 4: Self Assessment</p>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Self Assessment was created for companies that are new to ISO Standards and not certified.
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        If you are already ISO certified use of the Self Assessment tool is optional and can be skipped.
                      </p>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>click new assessment button</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>fill all the fields</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>start the assessment</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Guide Image Step 4 */}
                <div
                  className="relative group rounded-2xl overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 cursor-zoom-in"
                  onClick={() => setSelectedImage(selfAssessmentGuide)}
                >
                  <img
                    src={selfAssessmentGuide}
                    alt="Self Assessment Guide"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Step 5: Gap Analysis */}
              <div className="space-y-6 pt-8 border-t border-slate-100">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-bold text-lg">5</span>
                  </div>
                  <div className="space-y-3 pt-1 text-left">
                    <p className="text-xl font-bold text-slate-900 tracking-tight">Step 5: Gap Analysis</p>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Gap Analysis was created for companies that are new to ISO Standards or in transition from old to new ISO Standard.
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Use of the Gap Analysis is optional for ISO Certified companies.
                      </p>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>click new analysis button</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>fill the fields</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-medium text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>start analysis</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Guide Image Step 5 */}
                <div
                  className="relative group rounded-2xl overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 cursor-zoom-in"
                  onClick={() => setSelectedImage(gapAnalysisGuide)}
                >
                  <img
                    src={gapAnalysisGuide}
                    alt="Gap Analysis Guide"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* How to start audits? Section */}
              <div className="space-y-6 pt-10 border-t border-slate-100 text-left">
                <div className="space-y-3 pt-1">
                  <p className="text-2xl font-black text-slate-900 tracking-tight leading-none bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    How to start audits?
                  </p>
                  <p className="text-base text-slate-600 leading-relaxed font-semibold">
                    To start audits, you first need to create an audit program.
                  </p>
                </div>

                {/* Visual Guide Images Audit Program */}
                <div className="space-y-6">
                  <div
                    className="relative group rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl bg-white p-1 cursor-zoom-in"
                    onClick={() => setSelectedImage(auditProgramGuide)}
                  >
                    <img
                      src={auditProgramGuide}
                      alt="Audit Program Guide"
                      className="w-full h-auto rounded-2xl object-cover transform transition-all duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <div
                    className="relative group rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl bg-white p-1 cursor-zoom-in"
                    onClick={() => setSelectedImage(auditProgramFormGuide)}
                  >
                    <img
                      src={auditProgramFormGuide}
                      alt="Audit Program Form Guide"
                      className="w-full h-auto rounded-2xl object-cover transform transition-all duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-700 font-bold text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                      <span>click the check boxes and select the month</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700 font-bold text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                      <span>click create button to create the selected program</span>
                    </div>
                    <div
                      className="relative group rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl bg-white p-1 mt-3 cursor-zoom-in"
                      onClick={() => setSelectedImage(auditProgramTimelineGuide)}
                    >
                      <img
                        src={auditProgramTimelineGuide}
                        alt="Audit Program Timeline Guide"
                        className="w-full h-auto rounded-2xl object-cover transform transition-all duration-700 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </div>

                  <div
                    className="relative group rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl bg-white p-1 cursor-zoom-in"
                    onClick={() => setSelectedImage(auditProgramCreateGuide)}
                  >
                    <img
                      src={auditProgramCreateGuide}
                      alt="Audit Program Create Guide"
                      className="w-full h-auto rounded-2xl object-cover transform transition-all duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>go to audit program page</span>
                  </div>
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>click create program button</span>
                  </div>
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>fill all the fields and click generate program button</span>
                  </div>
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>a program will be generated with the timeline according to the given ISO standard and frequency</span>
                  </div>
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>click create program button and generate the program</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Audit Plan Section */}
              <div className="space-y-6 pt-10 border-t border-slate-100 text-left">
                <div className="space-y-3 pt-1">
                  <p className="text-2xl font-black text-slate-900 tracking-tight leading-none bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    Step 2: Audit Plan
                  </p>
                  <p className="text-base text-slate-600 leading-relaxed font-semibold">
                    Created audit program will be listed on the audit plan page
                  </p>
                </div>

                {/* Visual Guide Images Audit Plan */}
                <div className="space-y-6">
                  <div
                    className="relative group rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl bg-white p-1 cursor-zoom-in"
                    onClick={() => setSelectedImage(auditPlanGuide)}
                  >
                    <img
                      src={auditPlanGuide}
                      alt="Audit Plan Guide"
                      className="w-full h-auto rounded-2xl object-cover transform transition-all duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <div
                    className="relative group rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl bg-white p-1 cursor-zoom-in"
                    onClick={() => setSelectedImage(auditPlanFormGuide)}
                  >
                    <img
                      src={auditPlanFormGuide}
                      alt="Audit Plan Form Guide"
                      className="w-full h-auto rounded-2xl object-cover transform transition-all duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>click create plan button to create the plan</span>
                  </div>
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>fill the fields</span>
                  </div>
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>select the template</span>
                  </div>
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>plan the daily itinerary</span>
                  </div>
                  <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                    <span>click save audit plan to save the plan</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Audit Section */}
              <div className="space-y-6 pt-10 border-t border-slate-100 text-left">
                <div className="space-y-3 pt-1">
                  <p className="text-2xl font-black text-slate-900 tracking-tight leading-none bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    Step 3: Audit
                  </p>
                  <p className="text-base text-slate-600 leading-relaxed font-semibold">
                    Created plans will be listed on the audit page
                  </p>
                </div>

                <div className="space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                      <span>click the eye icon to start the audit</span>
                    </div>
                    <div
                      className="relative group rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl bg-white p-1 cursor-zoom-in"
                      onClick={() => setSelectedImage(auditExecuteGuide)}
                    >
                      <img
                        src={auditExecuteGuide}
                        alt="Audit Execution Guide"
                        className="w-full h-auto rounded-2xl object-cover transform transition-all duration-700 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3.5 text-slate-700 font-medium text-lg">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                      <span>start the audit and click save audit progress button to save the audit</span>
                    </div>
                    <div
                      className="relative group rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl bg-white p-1 cursor-zoom-in"
                      onClick={() => setSelectedImage(auditProgressGuide)}
                    >
                      <img
                        src={auditProgressGuide}
                        alt="Audit Progress Guide"
                        className="w-full h-auto rounded-2xl object-cover transform transition-all duration-700 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Findings Section */}
              <div className="space-y-6 pt-10 border-t border-slate-100 text-left">
                <div className="space-y-3 pt-1">
                  <p className="text-2xl font-black text-slate-900 tracking-tight leading-none bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    Step 4: Findings
                  </p>
                  <p className="text-base text-slate-600 leading-relaxed font-semibold">
                    All findings will be listed on this findings page
                  </p>
                </div>

                {/* Visual Guide Image Audit Findings */}
                <div
                  className="relative group rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl bg-white p-1 cursor-zoom-in"
                  onClick={() => setSelectedImage(auditFindingsGuide)}
                >
                  <img
                    src={auditFindingsGuide}
                    alt="Audit Findings Guide"
                    className="w-full h-auto rounded-2xl object-cover transform transition-all duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  className="w-full h-14 bg-[#213847] hover:bg-[#1a2d39] text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 text-lg"
                  onClick={() => setShowLearnModal(false)}
                >
                  Got it, thanks!
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Preview Modal */}
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center group/preview">
              {/* Custom High-Visibility Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 md:top-4 md:right-4 z-[100] h-12 w-12 rounded-full bg-black/60 hover:bg-black/80 text-white border-2 border-white/30 shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-7 w-7" />
              </Button>

              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Enlarged view"
                  className="max-w-full max-h-[90vh] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-white/20 object-contain ring-1 ring-black/10"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

  <Sheet open={isOpen} onOpenChange={setIsOpen}>
    <SheetTrigger asChild>
      <Button variant="ghost" size="sm" className="h-12 w-12 p-0 rounded-full hover:bg-transparent focus-visible:ring-0 mr-6">
        <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center shadow-md cursor-pointer hover:bg-green-700 transition-colors">
          <span className="text-base font-bold text-white tracking-wider">{initials}</span>
        </div>
      </Button>
    </SheetTrigger>
    <SheetContent className="w-[320px] sm:w-[400px] border-l border-border/40 p-0 flex flex-col bg-white">
      <div className="px-6 py-8 bg-[#f8fafc] border-b border-border/40 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-xl mb-4">
          <span className="text-2xl font-bold text-primary tracking-wider">{initials}</span>
        </div>
        <h2 className="text-xl font-bold text-[#1e293b]">{user.firstName} {user.lastName}</h2>
        <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
      </div>

      <div className="flex-1 py-4 flex flex-col gap-1 px-3">
        <Button
          variant="ghost"
          onClick={() => {
            setIsOpen(false);
            navigate('/profile-settings');
          }}
          className="w-full justify-start h-14 px-4 text-[#475569] hover:text-[#1e293b] hover:bg-slate-100 rounded-xl group transition-all"
        >
          <UserCircle className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Profile Settings</span>
          <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setIsOpen(false);
            navigate('/account-settings');
          }}
          className="w-full justify-start h-14 px-4 text-[#475569] hover:text-[#1e293b] hover:bg-slate-100 rounded-xl group transition-all"
        >
          <Settings className="mr-3 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-medium">Account Settings</span>
          <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </div>

      <div className="p-4 border-t border-border/40 bg-slate-50 mt-auto">
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="w-full justify-center h-12 rounded-xl group font-semibold shadow-sm"
        >
          <LogOut className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          Logout
        </Button>
      </div>
    </SheetContent>
  </Sheet>
      </div >
    </header >
  );
}
