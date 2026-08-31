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
  const [state, setState] = useState<"connecting" | "waking" | "live" | "done" | "error">(
    "connecting",
  );
  const [attack, setAttack] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/stream`);
    esRef.current = es;

    // A cold Render instance can hold the connection open for 30–50s before the
    // first frame arrives. Say so instead of showing a bare inactive label.
    const wakeTimer = setTimeout(() => {
      setState((s) => (s === "connecting" ? "waking" : s));
    }, 4_000);

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
    es.addEventListener("done", () => {
      setState("done");
      // The run naturally ends after 30 steps — close so EventSource does not
      // auto-reconnect into a fresh run behind the user's back.
      es.close();
    });
    es.addEventListener("message", onStep as EventListener);
    es.onerror = () => setState((s) => (s === "done" ? s : "error"));

    // Always release the connection on unmount / route change.
    return () => {
      clearTimeout(wakeTimer);
      es.close();
      esRef.current = null;
    };
  }, []);


  const last = events[events.length - 1];
  const points = events.map((e) => e.peak_score ?? 0);
  const path = sparkline(points, 320, 26);

  return (
    <div className="border-y border-white/14 bg-black/75 backdrop-blur-md overflow-hidden">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 sm:gap-x-8 gap-y-2.5 px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{
              backgroundColor:
                state === "live"
                  ? "var(--color-defense)"
                  : state === "error"
                    ? "var(--color-attack)"
                    : "rgba(255, 255, 255, 0.4)",
            }}
          />
          <Mono className="text-white/80 font-medium text-[11px] sm:text-xs">
            stream ·{" "}
            {state === "error"
              ? "offline"
              : state === "waking"
                ? "waking engine…"
                : state}
          </Mono>

        </div>

        <svg width="200" height="24" className="shrink-0 hidden md:block" aria-hidden>
          <line x1="0" y1="23.5" x2="200" y2="23.5" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
          {path ? (
            <path d={path} fill="none" stroke="var(--color-attack)" strokeWidth="1.5" />
          ) : null}
        </svg>

        <div className="flex flex-wrap items-baseline gap-x-4 sm:gap-x-6 gap-y-1 text-xs">
          <Mono className="text-white/70 text-[11px] sm:text-xs">
            step <span className="text-white font-semibold">{last ? `${last.step}/${last.steps}` : "—"}</span>
          </Mono>
          <Mono className="text-white/70 text-[11px] sm:text-xs">
            normal <span className="text-white font-semibold tabular-nums">{last?.normal ?? "—"}</span>
          </Mono>
          <Mono className="text-white/70 text-[11px] sm:text-xs">
            fraud <span className="text-attack font-semibold tabular-nums">{last?.fraud ?? "—"}</span>
          </Mono>
          <Mono className="text-white/70 text-[11px] sm:text-xs">
            caught <span className="text-defense font-semibold tabular-nums">{last?.caught ?? "—"}</span>
          </Mono>
          <Mono className="text-white/70 text-[11px] sm:text-xs">
            peak{" "}
            <span className="text-white font-semibold tabular-nums">
              {last ? last.peak_score.toFixed(2) : "—"}
            </span>
          </Mono>
          {attack ? <Tag tone="attack">{attack}</Tag> : null}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Mono className="text-white/80 font-semibold text-[10px] sm:text-xs">inject</Mono>
          {["A1", "A3", "A4", "A6"].map((a) => (
            <Button key={a} tone="attack" onClick={() => void apiInject(a)} className="text-[10px] px-2 py-1">
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
