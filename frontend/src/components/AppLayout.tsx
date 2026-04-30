import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNav } from "@/components/TopNav";
import TrialExpiredModal from "@/components/TrialExpiredModal";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;
  const [showModal, setShowModal] = useState(false);

  // Calculate if trial is expired
  const isExpired = user?.trialEndDate && 
    Math.ceil((new Date(user.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 0;
  
  const shouldShowModal = (user?.subscriptionStatus === 'expired' || isExpired) && 
    user?.subscriptionStatus !== 'active' &&
    location.pathname !== '/subscription';

  useEffect(() => {
    if (shouldShowModal) {
      const hasSeenModal = sessionStorage.getItem("expiredModalSeen");
      if (!hasSeenModal) {
        setShowModal(true);
      }
    }
  }, [shouldShowModal]);

  const handleCloseModal = () => {
    setShowModal(false);
    sessionStorage.setItem("expiredModalSeen", "true");
  };
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
      <TrialExpiredModal 
        isOpen={showModal} 
        onClose={handleCloseModal}
      />
    </SidebarProvider>
  );
}
