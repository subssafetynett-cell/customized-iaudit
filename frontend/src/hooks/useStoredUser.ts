import { useCallback, useEffect, useState } from "react";
import { dispatchUserUpdated } from "@/lib/trialUtils";

function readStoredUser(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useStoredUser() {
  const [user, setUserState] = useState<Record<string, unknown> | null>(readStoredUser);

  useEffect(() => {
    const refresh = () => setUserState(readStoredUser());
    window.addEventListener("user-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("user-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const setUser = useCallback((next: Record<string, unknown> | null) => {
    if (next) {
      localStorage.setItem("user", JSON.stringify(next));
    } else {
      localStorage.removeItem("user");
    }
    setUserState(next);
    dispatchUserUpdated();
  }, []);

  return { user, setUser };
}
