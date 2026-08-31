import { API_BASE, TIMEOUTS } from "./api-config";

export class ApiError extends Error {
  status: number;
  detail?: unknown;
  isColdStart: boolean;

  constructor(message: string, status = 0, options?: { detail?: unknown; isColdStart?: boolean }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = options?.detail;
    this.isColdStart = Boolean(
      options?.isColdStart || status === 502 || status === 503 || status === 504 || status === 0,
    );
  }
}

export interface ApiFetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Unified fetch wrapper with:
 * 1. AbortController-driven timeouts
 * 2. Content-Type inspection to avoid crashing on Render HTML 502/503 responses
 * 3. FastAPI { "detail": ... } error structure normalization
 * 4. Cold-start error tagging
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { timeout = TIMEOUTS.reads, headers, ...restInit } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...restInit,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(restInit.body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(
        `Request to ${path} timed out after ${timeout / 1000}s (Render may be waking up)`,
        408,
        { isColdStart: true },
      );
    }
    throw new ApiError(
      `Backend unreachable at ${API_BASE} (${err instanceof Error ? err.message : "network error"})`,
      0,
      { isColdStart: true },
    );
  } finally {
    clearTimeout(timer);
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let errorDetail: unknown = null;
    let message = `${res.status} ${res.statusText}`;

    if (isJson) {
      try {
        const body = (await res.json()) as Record<string, unknown>;
        errorDetail = body;
        const detail = body["detail"];
        const messageVal = body["message"];
        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail
            .map((d: unknown) =>
              d && typeof d === "object"
                ? String((d as Record<string, unknown>)["msg"] ?? JSON.stringify(d))
                : String(d),
            )
            .join(", ");
        } else if (typeof messageVal === "string") {
          message = messageVal;
        }
      } catch {
        /* fallback to status text */
      }
    } else {
      const text = await res.text().catch(() => "");
      if (text) {
        message = `${message} — ${text.slice(0, 160)}`;
      }
    }

    const isColdStart = res.status === 502 || res.status === 503 || res.status === 504;
    throw new ApiError(message, res.status, { detail: errorDetail, isColdStart });
  }

  if (res.status === 204) {
    return {} as T;
  }

  if (isJson) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}

export const get = <T>(path: string, timeout: number = TIMEOUTS.reads) =>
  apiFetch<T>(path, { method: "GET", timeout });

export const post = <T>(path: string, body?: unknown, timeout: number = TIMEOUTS.compute) =>
  apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    timeout,
  });

/**
 * Pre-warm and health probe.
 * Probes GET /api/status. If it fails on a cold start, retries once with a 60s timeout window.
 */
export async function apiHealthz(): Promise<{ ready: boolean; coldStartWoken?: boolean }> {
  try {
    const res = await apiFetch<{ ready: boolean }>("/api/status", {
      method: "GET",
      timeout: TIMEOUTS.health,
    });
    return { ready: Boolean(res.ready) };
  } catch (err) {
    if (err instanceof ApiError && err.isColdStart) {
      // Retry once with longer 60s timeout for cold start spin-up
      const retryRes = await apiFetch<{ ready: boolean }>("/api/status", {
        method: "GET",
        timeout: TIMEOUTS.init,
      });
      return { ready: Boolean(retryRes.ready), coldStartWoken: true };
    }
    throw err;
  }
}
