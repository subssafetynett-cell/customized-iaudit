import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminProtectedRoute } from "./components/SuperAdminProtectedRoute";
import { PageLoader } from "./components/PageLoader";
import Watermark from "./components/Watermark";

const Index = lazy(() => import("./pages/Index"));
const Companies = lazy(() => import("./pages/Companies"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const Users = lazy(() => import("./pages/Users"));
const AuditPrograms = lazy(() => import("./pages/AuditPrograms"));
const AuditProgramPage = lazy(() => import("./pages/AuditProgramPage"));
const CreateAuditPlanPage = lazy(() => import("./pages/CreateAuditPlanPage"));
const AuditList = lazy(() => import("./pages/AuditList"));
const SelfAssessment = lazy(() => import("./pages/SelfAssessment"));
const GapAnalysis = lazy(() => import("./pages/GapAnalysis"));
const AuditTemplates = lazy(() => import("./pages/AuditTemplates"));
const ExecuteAuditTemplate = lazy(() => import("./pages/ExecuteAuditTemplate"));
const AuditExecute = lazy(() => import("./pages/AuditExecute"));
const AuditFindings = lazy(() => import("./pages/AuditFindings"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const SubscriptionDetails = lazy(() => import("./pages/SubscriptionDetails"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const GettingStarted = lazy(() => import("./pages/GettingStarted"));
const InviteAuditee = lazy(() => import("./pages/InviteAuditee"));

const queryClient = new QueryClient();

function FindingAuditRedirect() {
  const { auditId } = useParams<{ auditId: string }>();
  if (!auditId) return <Navigate to="/audit-findings" replace />;
  return (
    <Navigate
      to={`/audit/execute/${auditId}`}
      replace
      state={{ focusFindings: true }}
    />
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Watermark />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            {/* Legacy URL — super admin signs in at /login (admin@iaudit.global) */}
            <Route path="/super-admin-login" element={<Navigate to="/login" replace />} />

            {/* Protected Super Admin Routes */}
            <Route
              path="/super-admin"
              element={
                <SuperAdminProtectedRoute>
                  <SuperAdmin />
                </SuperAdminProtectedRoute>
              }
            />

            {/* Protected User Routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/getting-started" element={<GettingStarted />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/company/:id" element={<CompanyDetail />} />
              <Route path="/users" element={<Users />} />
              <Route path="/invite-auditee" element={<InviteAuditee />} />
              <Route path="/audits" element={<AuditPrograms />} />
              <Route path="/audit-program" element={<AuditProgramPage />} />
              <Route path="/audit-program/create-plan" element={<CreateAuditPlanPage />} />
              <Route path="/audit" element={<AuditList />} />
              <Route path="/self-assessment" element={<SelfAssessment />} />
              <Route path="/gap-analysis" element={<GapAnalysis />} />
              <Route path="/audit-templates" element={<AuditTemplates />} />
              <Route path="/audit-templates/:id/execute" element={<ExecuteAuditTemplate />} />
              <Route path="/audit/execute/:id" element={<AuditExecute />} />
              <Route path="/audit-findings/:auditId/:findingId" element={<FindingAuditRedirect />} />
              <Route path="/audit-findings" element={<AuditFindings />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/subscription-details" element={<SubscriptionDetails />} />
              <Route path="/subscription/success" element={<SubscriptionSuccess />} />
              <Route path="/profile-settings" element={<ProfileSettings />} />
              <Route path="/account-settings" element={<AccountSettings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
