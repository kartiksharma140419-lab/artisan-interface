import { useCallback, useEffect, useState } from "react";
import { API_BASE, TIMEOUTS } from "./api-config";
import { ApiError, apiFetch } from "./api-client";
import type { StatusResponse } from "./api";

export type BackendHealthState = "checking" | "waking" | "ready" | "uninitialized" | "offline";
export type BackendPhase = "checking" | "waking" | "ready" | "offline";

export interface BackendHealth {
  state: BackendHealthState;
  phase: BackendHealthState;
  ready: boolean;
  status: StatusResponse | null;
  error: ApiError | Error | string | null;
  baseUrl: string;
  wakingSeconds: number;
  refetch: () => Promise<void>;
}

export function useBackendHealth(): BackendHealth {
  const [state, setState] = useState<BackendHealthState>("checking");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<ApiError | Error | string | null>(null);
  const [wakingSeconds, setWakingSeconds] = useState(0);

  const checkHealth = useCallback(async () => {
    setError(null);

    // Initial probe with quick health timeout
    try {
      setState("checking");
      const res = await apiFetch<StatusResponse>("/api/status", {
        method: "GET",
        timeout: TIMEOUTS.health,
      });
      setStatus(res);
      setState(res.ready ? "ready" : "uninitialized");
      return;
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : new ApiError(String(err), 0);

      // If error indicates a cold start, transition to waking state and retry with 60s timeout
      if (apiErr.isColdStart || apiErr.coldStart) {
        setState("waking");
        setError(apiErr);

        try {
          const retryRes = await apiFetch<StatusResponse>("/api/status", {
            method: "GET",
            timeout: TIMEOUTS.init,
          });
          setStatus(retryRes);
          setState(retryRes.ready ? "ready" : "uninitialized");
          setError(null);
          return;
        } catch (retryErr: unknown) {
          const finalErr = retryErr instanceof ApiError ? retryErr : new ApiError(String(retryErr), 0);
          setError(finalErr);
          setState("offline");
          return;
        }
      }

      setError(apiErr);
      setState("offline");
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  // Elapsed timer when in "waking" state
  useEffect(() => {
    if (state !== "waking") {
      setWakingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setWakingSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  return {
    state,
    phase: state,
    ready: state === "ready",
    status,
    error,
    baseUrl: API_BASE,
    wakingSeconds,
    refetch: checkHealth,
  };
}
