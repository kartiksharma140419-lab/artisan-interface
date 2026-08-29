import { useEffect, useRef, useState } from "react";
import { API_BASE, apiInject, type StepEvent } from "@/lib/api";
import { Button, Mono, Tag } from "./Panel";

/**
 * Ambient background pulse from GET /api/stream (SSE).
 * Deliberately quiet: a thin sparkline of peak_score plus rolling counts.
 * This is atmosphere, never the main narrative — the main narrative is
 * POST /api/demo/run on the Attack page.
 */
export function AmbientStrip() {
  const [events, setEvents] = useState<StepEvent[]>([]);
  const [state, setState] = useState<"connecting" | "live" | "done" | "error">("connecting");
  const [attack, setAttack] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/stream`);
    esRef.current = es;

    const onStep = (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data) as StepEvent;
        // heartbeat comments never reach here; still guard on type
        if (d.type && d.type !== "step") return;
        setState("live");
        setAttack(d.attack_type ?? null);
        setEvents((prev) => [...prev.slice(-119), d]);
      } catch {
        /* ignore malformed frame */
      }
    };

    es.addEventListener("step", onStep as EventListener);
    es.addEventListener("init", () => setState("live"));
    es.addEventListener("done", () => setState("done"));
    es.addEventListener("message", onStep as EventListener);
    es.onerror = () => setState((s) => (s === "done" ? s : "error"));

    return () => es.close();
  }, []);

  const last = events[events.length - 1];
  const points = events.map((e) => e.peak_score ?? 0);
  const path = sparkline(points, 320, 26);

  return (
    <div className="border-y border-rule bg-card/40">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-1.5 w-1.5"
            style={{
              backgroundColor:
                state === "live"
                  ? "var(--color-defense)"
                  : state === "error"
                    ? "var(--color-attack)"
                    : "var(--color-muted-foreground)",
            }}
          />
          <Mono className="text-muted-foreground">
            ambient stream · {state === "error" ? "no connection" : state}
          </Mono>
        </div>

        <svg width="320" height="26" className="shrink-0" aria-hidden>
          <line x1="0" y1="25.5" x2="320" y2="25.5" stroke="var(--color-rule)" strokeWidth="1" />
          {path ? (
            <path d={path} fill="none" stroke="var(--color-attack)" strokeWidth="1" />
          ) : null}
        </svg>

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Mono className="text-muted-foreground">
            step <span className="text-ink">{last ? `${last.step}/${last.steps}` : "—"}</span>
          </Mono>
          <Mono className="text-muted-foreground">
            normal <span className="text-ink tabular-nums">{last?.normal ?? "—"}</span>
          </Mono>
          <Mono className="text-muted-foreground">
            fraud <span className="text-attack tabular-nums">{last?.fraud ?? "—"}</span>
          </Mono>
          <Mono className="text-muted-foreground">
            caught <span className="text-defense tabular-nums">{last?.caught ?? "—"}</span>
          </Mono>
          <Mono className="text-muted-foreground">
            peak{" "}
            <span className="text-ink tabular-nums">
              {last ? last.peak_score.toFixed(2) : "—"}
            </span>
          </Mono>
          {attack ? <Tag tone="attack">{attack}</Tag> : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Mono className="text-muted-foreground">inject</Mono>
          {["A1", "A3", "A4", "A6"].map((a) => (
            <Button key={a} tone="attack" onClick={() => void apiInject(a)}>
              {a}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function sparkline(values: number[], w: number, h: number) {
  if (values.length < 2) return "";
  const max = Math.max(1, ...values);
  const step = w / (values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (v / max) * (h - 2)).toFixed(1)}`)
    .join(" ");
}
