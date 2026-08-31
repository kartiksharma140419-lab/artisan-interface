import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { apiDemoRun, type AttackResult, type DemoRunResponse } from "@/lib/api";
import { ArtifactState, Button, Eyebrow, Mono, Panel, PanelHead, Stat, Tag, pct } from "./Panel";

/**
 * POST /api/demo/run is SYNCHRONOUS. It blocks and returns the whole
 * three-beat result at once — there is no progress feed and nothing to poll.
 * The paced reveal below is therefore choreographed client-side from data we
 * already hold. Do NOT "fix" this into a polling loop; there is no endpoint
 * that reports intermediate progress.
 */
const BEAT_MS = 2600;

type Phase = 0 | 1 | 2 | 3 | 4; // 0 idle, 1 beat1, 2 diagnosis, 3 beat2, 4 beat3

export function DemoNarrative({
  onTrajectoryHint,
}: {
  onTrajectoryHint?: () => void;
}) {
  const [data, setData] = useState<DemoRunResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const run = async () => {
    setRunning(true);
    setError(null);
    setData(null);
    setPhase(0);
    timers.current.forEach(window.clearTimeout);
    try {
      const r = await apiDemoRun();
      setData(r);
      onTrajectoryHint?.();
      ([1, 2, 3, 4] as Phase[]).forEach((p, i) => {
        timers.current.push(
          window.setTimeout(() => setPhase(p), i * BEAT_MS + 200),
        );
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error("demo run failed"));
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!phase || !stageRef.current) return;
    const el = stageRef.current.querySelector(`[data-beat="${phase}"]`);
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.7, ease: "expo.out" },
    );
  }, [phase]);

  return (
    <Panel>
      <PanelHead
        eyebrow="POST /api/demo/run"
        title="The decontaminated cycle"
        note="One synchronous call returns all three beats. The pacing below is a client-side reveal of a result the backend already computed — not a progress feed."
        right={
          <Button tone="attack" onClick={run} disabled={running}>
            {running ? "running cycle…" : data ? "run again" : "run the cycle"}
          </Button>
        }
      />

      {error ? (
        <div className="px-5 py-6">
          <p className="font-mono text-xs text-attack">Cycle did not run</p>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">{error.message}</p>
        </div>
      ) : !data ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          {running
            ? "The backend is training, attacking and retraining. This call blocks until the full cycle finishes."
            : "Nothing has run yet. The cycle measures recall before the fix, names the blind spot, retrains, and re-measures against a generator it has never seen."}
        </p>
      ) : (
        <div ref={stageRef} className="divide-y divide-rule">
          <BeatRow
            n={1}
            visible={phase >= 1}
            title="Beat 1 — the attack lands"
            recall={data.beat1.recall}
            results={data.beat1.results}
            tone="attack"
          />

          <div
            data-beat="2"
            className="px-5 py-5"
            style={{ opacity: phase >= 2 ? 1 : 0 }}
          >
            <Eyebrow>Diagnosis</Eyebrow>
            <p className="mt-2 font-display text-3xl leading-tight">
              {data.report.blind_spot || data.beat2.blind_spot || "—"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="generated fixes" value={data.report.generated_fixes} />
              <Stat
                label="retrain rounds"
                value={`${data.report.retrain_rounds_used}/${data.report.max_retrain_rounds}`}
                hint="hard cap"
              />
              <Stat label="evidence ids" value={data.report.evidence_ids.length} />
              <Stat
                label="improved"
                value={data.report.improved ? "yes" : "no"}
                tone={data.report.improved ? "defense" : "attack"}
              />
            </div>
          </div>

          <BeatRow
            n={3}
            visible={phase >= 3}
            title="Beat 2 — after the fix"
            recall={data.beat2.recall}
            results={data.beat2.results}
            tone="defense"
          />

          <div
            data-beat="4"
            className="px-5 py-5"
            style={{ opacity: phase >= 4 ? 1 : 0 }}
          >
            <Eyebrow>Beat 3 — held out</Eyebrow>
            <div className="mt-3 flex flex-wrap items-end gap-8">
              <div>
                <p className="font-display text-5xl tabular-nums">{pct(data.beat3.recall)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  recall on A2 / A5, never trained on
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Stat label="recall before" value={pct(data.report.recall_before)} tone="attack" />
                <Stat label="recall after" value={pct(data.report.recall_after)} tone="defense" />
                <Stat
                  label="unseen generator"
                  value={pct(data.report.generalization_recall_unseen_generator)}
                />
              </div>
            </div>
            <p className="mt-4 max-w-prose text-sm text-muted-foreground">
              Trainable attacks are A1, A3, A4 and A6. A2 and A5 are held out — beat 3 is the only
              number here that says anything about generalisation.
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}

function BeatRow({
  n,
  visible,
  title,
  recall,
  results,
  tone,
}: {
  n: number;
  visible: boolean;
  title: string;
  recall: number;
  results?: Record<string, AttackResult> | undefined;
  tone: "attack" | "defense";
}) {
  return (
    <div data-beat={n} className="px-5 py-5" style={{ opacity: visible ? 1 : 0 }}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <Eyebrow>{title}</Eyebrow>
        <p className={`font-mono text-sm ${tone === "attack" ? "text-attack" : "text-defense"}`}>
          recall {pct(recall)}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(results ?? {}).map(([id, r]) => (
          <div key={id} className="border border-rule px-3 py-2">
            <div className="flex items-baseline justify-between">
              <Mono>{id}</Mono>
              <Mono className="text-muted-foreground">
                {r.caught}/{r.total}
              </Mono>
            </div>
            <div className="mt-2 flex gap-1">
              {r.instances.map((hit, i) => (
                <span
                  key={i}
                  className="h-3 w-3 border"
                  style={{
                    borderColor: hit ? "var(--color-defense)" : "var(--color-attack)",
                    backgroundColor: hit ? "var(--color-defense)" : "transparent",
                  }}
                  title={hit ? "caught" : "missed"}
                />
              ))}
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              recall {pct(r.recall)} · peak {r.score.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      {!results ? (
        <p className="mt-2 text-sm text-muted-foreground">
          This beat reports recall only. <Tag>no per-attack breakdown</Tag>
        </p>
      ) : null}
    </div>
  );
}
