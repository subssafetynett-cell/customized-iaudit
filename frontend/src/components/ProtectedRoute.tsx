import { Navigate, useLocation } from "react-router-dom";
import { useUserStatus } from "@/hooks/useUserStatus";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    // Periodically verify the user's status on the server.
    // This hook handles logout if the user is deleted or set to inactive.
    useUserStatus();

    // Check auth synchronously to prevent flash of unauthenticated content
    const userData = localStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;
    const isAuthenticated = !!user;

    if (!isAuthenticated) {
        // Redirect them to the /login page
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check trial expiration
    if (user.trialEndDate) {
        const remainingDays = Math.ceil(
            (new Date(user.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const isExpired = (user.subscriptionStatus === 'trial' && remainingDays <= 0) || user.subscriptionStatus === 'expired';
        const isSubscriptionActive = user.subscriptionStatus === 'active';

        if (isExpired && !isSubscriptionActive) {
            const allowedPaths = ['/', '/feedback', '/subscription', '/profile-settings', '/account-settings'];
            const isPathAllowed = allowedPaths.includes(location.pathname);

            if (!isPathAllowed) {
                // Redirect to dashboard (view-only) if trying to access restricted areas
                return <Navigate to="/" replace />;
            }
        }
    }

    return <>{children}</>;
}
