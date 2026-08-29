import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { API_BASE, isMissing, type Artifact } from "@/lib/api";

export function Panel({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <As className={cn("panel rounded-sm", className)}>{children}</As>;
}

export function PanelHead({
  eyebrow,
  title,
  right,
  note,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
  note?: string;
}) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule px-5 py-4">
      <div>
        {eyebrow ? <p className="label mb-1">{eyebrow}</p> : null}
        <h2 className="text-2xl leading-tight">{title}</h2>
        {note ? <p className="mt-1 max-w-prose text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </header>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label", className)}>{children}</p>;
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-xs tracking-tight", className)}>{children}</span>;
}

export function Stat({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "ink" | "attack" | "defense" | "muted";
}) {
  const toneClass =
    tone === "attack"
      ? "text-attack"
      : tone === "defense"
        ? "text-defense"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-ink";
  return (
    <div className="border-l border-rule pl-3">
      <p className="label">{label}</p>
      <p className={cn("mt-1 font-mono text-xl tabular-nums", toneClass)}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  tone = "ink",
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "ink" | "attack" | "defense";
  className?: string;
  type?: "button" | "submit";
}) {
  const toneClass =
    tone === "attack"
      ? "border-attack text-attack hover:bg-attack hover:text-ink"
      : tone === "defense"
        ? "border-defense text-defense hover:bg-defense hover:text-ink"
        : "border-rule text-ink hover:bg-accent";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.14em] border px-3 py-2 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40",
        toneClass,
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Honest state renderer: loading, backend-unreachable, or artifact `present: false`. */
export function ArtifactState({
  isLoading,
  error,
  data,
  children,
  emptyNote,
}: {
  isLoading: boolean;
  error: Error | null;
  data: unknown;
  children: ReactNode;
  emptyNote?: string;
}) {
  if (isLoading) {
    return (
      <p className="px-5 py-6 font-mono text-xs text-muted-foreground">Reading backend…</p>
    );
  }
  if (error) {
    return (
      <div className="px-5 py-6">
        <p className="font-mono text-xs text-attack">Backend unavailable</p>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          {error.message}. Start the Prometheus API and reload; nothing on this page is
          simulated, so it stays empty until real data arrives.
        </p>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">base {API_BASE}</p>
      </div>
    );
  }
  if (data === undefined || data === null) {
    return (
      <p className="px-5 py-6 font-mono text-xs text-muted-foreground">
        {emptyNote ?? "No data yet."}
      </p>
    );
  }
  if (isMissing(data as Artifact<unknown>)) {
    const note = (data as { note?: string }).note;
    return (
      <div className="px-5 py-6">
        <p className="font-mono text-xs text-warn">Artifact not generated on this machine</p>
        <p className="mt-2 max-w-prose font-mono text-sm text-muted-foreground">
          {note ?? "present: false"}
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "attack" | "defense" | "warn";
}) {
  const toneClass =
    tone === "attack"
      ? "border-attack text-attack"
      : tone === "defense"
        ? "border-defense text-defense"
        : tone === "warn"
          ? "border-warn text-warn"
          : "border-rule text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-block border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

export const pct = (n: number | undefined) =>
  n === undefined || Number.isNaN(n) ? "—" : `${Math.round(n * 100)}%`;
export const num = (n: number | undefined, d = 2) =>
  n === undefined || n === null || Number.isNaN(n) ? "—" : n.toFixed(d);
