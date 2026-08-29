import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { API_BASE, apiInit, apiStatus } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Button, Mono, Tag } from "./Panel";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/attack", label: "Attack" },
  { to: "/defense", label: "Defense" },
  { to: "/protocol", label: "Protocol" },
  { to: "/evidence", label: "Evidence Room" },
] as const;

export function SiteHeader() {
  const status = useApi(["status"], apiStatus, { staleTime: 5_000 });
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
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-none">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl leading-none">Prometheus</span>
          <Mono className="text-muted-foreground">fraud twin</Mono>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-200 hover:text-ink"
              activeProps={{ className: "text-ink" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Tag tone={ready ? "defense" : status.error ? "attack" : "warn"}>
            {status.isLoading
              ? "checking"
              : status.error
                ? "backend offline"
                : ready
                  ? "twin ready"
                  : "not initialised"}
          </Tag>
          <Button onClick={runInit} disabled={initializing}>
            {initializing ? "building twin…" : "Run /api/init"}
          </Button>
        </div>
      </div>
      {initNote ? (
        <p className="mx-auto max-w-[1400px] px-6 pb-2 font-mono text-[11px] text-muted-foreground">
          {initNote}
        </p>
      ) : null}
      {status.error ? (
        <p className="mx-auto max-w-[1400px] px-6 pb-2 font-mono text-[11px] text-muted-foreground">
          No backend at {API_BASE} — set VITE_API_BASE_URL to point elsewhere.
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
