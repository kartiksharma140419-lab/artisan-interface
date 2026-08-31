/**
 * THE single source of truth for the backend origin.
 * No other file in this project may contain a backend URL string.
 *
 * Local dev:     VITE_API_BASE_URL=http://localhost:8000  (in .env.local)
 * Vercel prod:   VITE_API_BASE_URL=https://prometheus-backend-xhpd.onrender.com
 *
 * The fallback is the deployed HTTPS origin (no port, ever) so a build that
 * ships without the env var still talks to the live backend instead of dying
 * against localhost.
 */
const DEPLOYED_BACKEND = "https://prometheus-backend-xhpd.onrender.com";

export const API_BASE =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ||
  DEPLOYED_BACKEND;

/** Per-endpoint timeouts (ms). Slow-but-legitimate calls must not share a GET budget. */
export const TIMEOUT = {
  health: 5_000,
  read: 15_000,
  compute: 30_000,
  init: 60_000,
  demoRun: 90_000,
} as const;
