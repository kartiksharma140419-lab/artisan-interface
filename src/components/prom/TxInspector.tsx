import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  SIGNAL_KEYS,
  apiSampleTxs,
  apiScore,
  type ScoreResponse,
  type SampleTxs,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Button, Eyebrow, Mono, Panel, PanelHead, Tag, num } from "./Panel";

function firstIds(s: SampleTxs | undefined): string[] {
  const pick = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .map((x) =>
            typeof x === "string"
              ? x
              : x && typeof x === "object"
                ? String((x as Record<string, unknown>)["tx_id"] ?? "")
                : "",
          )
          .filter(Boolean)
      : [];
  if (!s) return [];
  return [...pick(s.fraud), ...pick(s.benign), ...pick(s.samples)];
}

export function TxInspector() {
  const samples = useApi(["sample-txs"], apiSampleTxs);
  const ids = useMemo(() => firstIds(samples.data), [samples.data]);
  const [txId, setTxId] = useState("");
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);

  const load = async (id: string) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      setScore(await apiScore(id));
    } catch (e) {
      setError(e instanceof Error ? e : new Error("score failed"));
      setScore(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!score || !barsRef.current) return;
    const bars = barsRef.current.querySelectorAll("[data-bar]");
    gsap.fromTo(
      bars,
      { scaleX: 0 },
      { scaleX: 1, transformOrigin: "left center", duration: 0.6, ease: "expo.out", stagger: 0.05 },
    );
  }, [score]);

  const signals = score?.signals ?? {};
  const keys = (score?.signal_columns?.length ? score.signal_columns : [...SIGNAL_KEYS]).filter(
    (k) => k in signals || SIGNAL_KEYS.includes(k as (typeof SIGNAL_KEYS)[number]),
  );

  return (
    <Panel>
      <PanelHead
        eyebrow="GET /api/score"
        title="Transaction inspector"
        note="Six detector signals, the fitted structured weights they feed, and the counterfactual the backend computes for the winning column."
        right={
          <div className="flex items-center gap-2">
            <input
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load(txId)}
              placeholder="tx id"
              className="w-44 border border-rule bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-defense"
            />
            <Button onClick={() => void load(txId)} disabled={busy || !txId}>
              {busy ? "scoring…" : "score"}
            </Button>
          </div>
        }
      />

      {ids.length ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-3">
          <Mono className="text-muted-foreground">samples</Mono>
          {ids.slice(0, 10).map((id) => (
            <Button
              key={id}
              onClick={() => {
                setTxId(id);
                void load(id);
              }}
              className={score?.tx_id === id ? "bg-accent" : ""}
            >
              {id.slice(0, 14)}
            </Button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="px-5 py-6 font-mono text-xs text-attack">{error.message}</p>
      ) : !score ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          Enter or pick a transaction id. Nothing is precomputed here — the score is read live.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.2fr_1fr]">
          <div ref={barsRef} className="border-b border-rule px-5 py-5 lg:border-b-0 lg:border-r">
            <Eyebrow>Signals</Eyebrow>
            <ul className="mt-3 space-y-3">
              {keys.map((k) => {
                const v = Number(signals[k] ?? 0);
                const top = score.top_reason_column === k;
                return (
                  <li key={k}>
                    <div className="flex items-baseline justify-between">
                      <Mono className={top ? "text-attack" : ""}>{k}</Mono>
                      <Mono className="tabular-nums text-muted-foreground">{num(v, 3)}</Mono>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-muted">
                      <div
                        data-bar
                        className="h-1.5"
                        style={{
                          width: `${Math.min(100, Math.max(0, v * 100))}%`,
                          backgroundColor: top ? "var(--color-attack)" : "var(--color-defense)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="px-5 py-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="font-display text-5xl tabular-nums">{num(score.structured_score)}</p>
              {score.band ? (
                <Tag tone={score.band === "HIGH" ? "attack" : score.band === "LOW" ? "defense" : "warn"}>
                  {score.band}
                </Tag>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{score.tx_id}</p>

            {score.counterfactual ? (
              <p className="mt-4 max-w-prose text-sm text-muted-foreground">
                <span className="label mr-2">counterfactual</span>
                {score.counterfactual}
              </p>
            ) : null}

            <dl className="mt-4 space-y-1 border-t border-rule pt-3 font-mono text-[11px]">
              {score.weights_source ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">weights source</dt>
                  <dd>{String(score.weights_source)}</dd>
                </div>
              ) : null}
              {score.weights_formula ? (
                <div>
                  <dt className="text-muted-foreground">formula</dt>
                  <dd className="mt-1 break-words">{String(score.weights_formula)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      )}
    </Panel>
  );
}
