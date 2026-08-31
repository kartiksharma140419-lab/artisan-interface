import { API_BASE, TIMEOUTS, TIMEOUT } from "./api-config";

export class ApiError extends Error {
  status: number;
  detail?: unknown;
  isColdStart: boolean;
  coldStart: boolean;

  constructor(message: string, status = 0, options?: { detail?: unknown; isColdStart?: boolean } | boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (typeof options === "boolean") {
      this.isColdStart = options;
      this.coldStart = options;
    } else {
      this.detail = options?.detail;
      const cold = Boolean(
        options?.isColdStart || status === 502 || status === 503 || status === 504 || status === 0,
      );
      this.isColdStart = cold;
      this.coldStart = cold;
    }
  }
}

export interface ApiFetchOptions extends RequestInit {
  timeout?: number;
  timeoutMs?: number;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: BodyInit | null;
}

export type FetchOpts = ApiFetchOptions;

/**
 * Unified fetch wrapper with:
 * 1. AbortController-driven timeouts
 * 2. Content-Type inspection to avoid crashing on Render HTML 502/503 responses
 * 3. FastAPI { "detail": ... } error structure normalization
 * 4. Cold-start error tagging
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const timeout = options.timeout ?? options.timeoutMs ?? TIMEOUTS.reads;
  const { headers, ...restInit } = options;

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
        ...(restInit.body && typeof restInit.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(
        `Request to ${path} timed out after ${Math.round(timeout / 1000)}s (Render may be waking up)`,
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

export interface HealthResult {
  ok: boolean;
  ready: boolean;
  retried: boolean;
  coldStartWoken?: boolean;
}

/**
 * Pre-warm and health probe.
 * Probes GET /api/status. If it fails on a cold start, retries once with a 60s timeout window.
 */
export async function apiHealthz(onWaking?: () => void): Promise<HealthResult> {
  try {
    const res = await apiFetch<{ ready?: boolean }>("/api/status", {
      method: "GET",
      timeout: TIMEOUT.health,
    });
    return { ok: true, ready: Boolean(res.ready), retried: false };
  } catch (err) {
    if (err instanceof ApiError && (err.isColdStart || err.coldStart)) {
      onWaking?.();
      const retryRes = await apiFetch<{ ready?: boolean }>("/api/status", {
        method: "GET",
        timeout: TIMEOUT.init,
      });
      return { ok: true, ready: Boolean(retryRes.ready), retried: true, coldStartWoken: true };
    }
    throw err;
  }
}
