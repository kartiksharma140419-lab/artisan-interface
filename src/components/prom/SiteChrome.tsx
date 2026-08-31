import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { API_BASE, apiInit, apiStatus } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useBackendHealth } from "@/lib/use-backend-health";
import { Button, Mono, Tag } from "./Panel";


const NAV = [
  { to: "/", label: "Overview" },
  { to: "/attack", label: "Attack" },
  { to: "/defense", label: "Defense" },
  { to: "/protocol", label: "Protocol" },
  { to: "/evidence", label: "Evidence Room" },
] as const;

export function SiteHeader() {
  const health = useBackendHealth();
  const status = useApi(["status"], apiStatus, {
    staleTime: 5_000,
    enabled: health.phase === "ready",
  });

  const [initializing, setInitializing] = useState(false);
  const [initNote, setInitNote] = useState<string | null>(null);

  const runInit = async () => {
    setInitializing(true);
    setInitNote(null);
    try {
      const r = await apiInit({});
      setInitNote(
        `${r.transactions.toLocaleString()} tx · ${r.features} features · fraud ${(r.fraud_ratio * 100).toFixed(2)}% · ${r.graph_nodes} graph nodes`,
      );
      await status.refetch();
    } catch (e) {
      setInitNote(e instanceof Error ? e.message : "init failed");
    } finally {
      setInitializing(false);
    }
  };

  const ready = status.data?.ready;

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-x-6 gap-y-2.5 px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar py-0.5">
          <Link to="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-display text-xl leading-none text-white">Prometheus</span>
            <Mono className="text-white/60 text-[11px] hidden sm:inline">fraud twin</Mono>
          </Link>

          <nav className="flex items-center gap-x-4 sm:gap-x-6 shrink-0">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-white/70 transition-colors duration-200 hover:text-white"
                activeProps={{ className: "text-white font-semibold underline underline-offset-4 decoration-defense" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Tag
            tone={
              health.phase === "offline" || status.error
                ? "attack"
                : ready
                  ? "defense"
                  : "warn"
            }
          >
            {health.phase === "checking"
              ? "checking"
              : health.phase === "waking"
                ? "waking engine…"
                : health.phase === "offline"
                  ? "backend offline"
                  : status.isLoading
                    ? "checking"
                    : status.error
                      ? "backend error"
                      : ready
                        ? "twin ready"
                        : "not initialised"}
          </Tag>
          <Button onClick={runInit} disabled={initializing} className="text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-1.5 sm:py-2">
            {initializing ? "building…" : "Run /api/init"}
          </Button>
        </div>
      </div>
      {health.phase === "waking" ? (
        <p className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-2 font-mono text-[11px] text-muted-foreground">
          Backend is spinning up from cold start — this can take up to a minute on the first
          load. Nothing is broken.
        </p>
      ) : null}
      {initNote ? (
        <p className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-2 font-mono text-[11px] text-muted-foreground">
          {initNote}
        </p>
      ) : null}
      {health.phase === "offline" || status.error ? (
        <p className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-2 font-mono text-[11px] text-muted-foreground">
          No backend at {API_BASE} — {health.error ?? status.error?.message}
        </p>
      ) : null}

    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-baseline justify-between gap-4 px-6 py-8">
        <p className="max-w-prose text-sm text-muted-foreground">
          Every number on this site is read from the Prometheus API. Nothing is mocked. Panels
          backed by offline artifacts state so, and print the backend&rsquo;s own note when an
          artifact has not been generated.
        </p>
        <Mono className="text-muted-foreground">{API_BASE}</Mono>
      </div>
    </footer>
  );
}
