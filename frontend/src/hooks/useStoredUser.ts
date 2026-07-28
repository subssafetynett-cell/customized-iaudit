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
    const refresh = () => {
      const next = readStoredUser();
      setUserState((prev) => {
        try {
          if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        } catch {
          /* fall through */
        }
        return next;
      });
    };
    window.addEventListener("user-updated", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("user-updated", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
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
