/**
 * Single source of truth for the PROMETHEUS backend configuration.
 * Base URL defaults to the deployed Render origin (HTTPS, no port).
 * Override via VITE_API_BASE_URL for local dev or custom deployments.
 */

export const API_BASE =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ||
  "https://prometheus-backend-xhpd.onrender.com";

/**
 * Timeout registry (in ms) per workload category to accommodate
 * cloud compute latency and Render free-tier cold-start wakeups.
 */
export const TIMEOUTS = {
  health: 5_000,
  reads: 15_000,
  compute: 30_000,
  init: 60_000,
  demo_run: 90_000,
} as const;

export type TimeoutCategory = keyof typeof TIMEOUTS;
