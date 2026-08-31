import { useEffect, useState } from "react";

import { apiHealthz } from "./api-client";

export type BackendPhase = "checking" | "waking" | "ready" | "offline";

/**
 * Fires a background GET /healthz on mount to pre-warm the Render instance
 * (free tier sleeps after ~15min; the first wake can take 30–50s). Never blocks
 * rendering — it only reports a phase so the UI can say "waking up" instead of
 * spinning silently.
 */
export function useBackendHealth() {
  const [phase, setPhase] = useState<BackendPhase>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await apiHealthz(() => {
          if (!cancelled) setPhase("waking");
        });
        if (!cancelled) {
          setPhase("ready");
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setPhase("offline");
          setError(e instanceof Error ? e.message : "backend unreachable");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { phase, error };
}
