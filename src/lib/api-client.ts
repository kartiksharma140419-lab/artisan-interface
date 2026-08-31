import { API_BASE, TIMEOUT } from "./api-config";

/**
 * The one and only network wrapper. Cold-start handling, timeouts, non-JSON
 * (Render HTML 502/503) detection and FastAPI {"detail": ...} normalization all
 * live here so no component has to reimplement them.
 */

export class ApiError extends Error {
  status: number;
  /** true when the failure looks like a Render cold start rather than a real error */
  coldStart: boolean;
  constructor(message: string, status: number, coldStart = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.coldStart = coldStart;
  }
}

export interface FetchOpts {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
}

export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = TIMEOUT.read } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      // No credentials: the backend allows origin "*", and "*" + credentials is
      // rejected by browsers outright. There is no auth layer to carry.
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === "AbortError";
    if (aborted) {
      throw new ApiError(
        `${path} timed out after ${Math.round(timeoutMs / 1000)}s — the backend may be waking up from a cold start.`,
        0,
        true,
      );
    }
    throw new ApiError(
      `Network error calling ${path}: ${err instanceof Error ? err.message : "unknown"}`,
      0,
      true,
    );
  }
  clearTimeout(timer);

  // Render serves an HTML error page during cold start / crash — never blindly res.json().
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new ApiError(
      `Expected JSON from ${path}, got ${contentType || "unknown"} (status ${res.status}). ${text.slice(0, 120)}`,
      res.status,
      res.status === 502 || res.status === 503 || res.status === 504,
    );
  }

  const data = (await res.json()) as unknown;
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    throw new ApiError(
      typeof detail === "string" ? detail : `${path} failed with status ${res.status}`,
      res.status,
      res.status >= 502,
    );
  }
  return data as T;
}

/* ---------- cold-start pre-warm ---------- */

export interface HealthResult {
  ok: boolean;
  retried: boolean;
}

/**
 * GET /healthz. Cold start looks like a timeout, so retry exactly once before
 * reporting failure. Never blocks the UI — callers fire this in the background.
 */
export async function apiHealthz(onWaking?: () => void): Promise<HealthResult> {
  try {
    await apiFetch<unknown>("/healthz", { timeoutMs: TIMEOUT.health });
    return { ok: true, retried: false };
  } catch (err) {
    if (err instanceof ApiError && err.coldStart) {
      onWaking?.();
      await apiFetch<unknown>("/healthz", { timeoutMs: 60_000 });
      return { ok: true, retried: true };
    }
    throw err;
  }
}
