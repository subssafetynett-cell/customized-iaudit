import { useEffect, useState } from "react";

/**
 * Re-renders trial UI when user profile refreshes or every hour (day count stays in sync).
 */
export function useTrialCountdown(): void {
  const [, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("user-updated", bump);
    const hourly = setInterval(bump, 60 * 60 * 1000);
    return () => {
      window.removeEventListener("user-updated", bump);
      clearInterval(hourly);
    };
  }, []);
}
