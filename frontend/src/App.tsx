import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Watermark from "@/components/Watermark";
import Index from "./pages/Index";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Users from "./pages/Users";
import AuditPrograms from "./pages/AuditPrograms";
import AuditProgramPage from "./pages/AuditProgramPage";
import CreateAuditPlanPage from "./pages/CreateAuditPlanPage";
import AuditList from "./pages/AuditList";
import SelfAssessment from "./pages/SelfAssessment";
import GapAnalysis from "./pages/GapAnalysis";
import AuditTemplates from "./pages/AuditTemplates";
import ExecuteAuditTemplate from "./pages/ExecuteAuditTemplate";
import AuditExecute from "./pages/AuditExecute";
import AuditFindings from "./pages/AuditFindings";
import Subscription from "./pages/Subscription";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionDetails from "./pages/SubscriptionDetails";
import Feedback from "./pages/Feedback";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProfileSettings from "./pages/ProfileSettings";
import AccountSettings from "./pages/AccountSettings";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminLogin from "./pages/SuperAdminLogin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Watermark />
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/companies" element={<Companies />} />
                    <Route path="/company/:id" element={<CompanyDetail />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/audits" element={<AuditPrograms />} />
                    <Route path="/audit-program" element={<AuditProgramPage />} />
                    <Route path="/audit-program/create-plan" element={<CreateAuditPlanPage />} />
                    <Route path="/audit" element={<AuditList />} />
                    <Route path="/self-assessment" element={<SelfAssessment />} />
                    <Route path="/gap-analysis" element={<GapAnalysis />} />
                    <Route path="/audit-templates" element={<AuditTemplates />} />
                    <Route path="/audit-templates/:id/execute" element={<ExecuteAuditTemplate />} />
                    <Route path="/audit/execute/:id" element={<AuditExecute />} />
                    <Route path="/audit-findings" element={<AuditFindings />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/subscription-details" element={<SubscriptionDetails />} />
                    <Route path="/subscription/success" element={<SubscriptionSuccess />} />
                    <Route path="/profile-settings" element={<ProfileSettings />} />
                    <Route path="/account-settings" element={<AccountSettings />} />
                    <Route path="/super-admin" element={<SuperAdmin />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/super-admin-login" element={<SuperAdminLogin />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
