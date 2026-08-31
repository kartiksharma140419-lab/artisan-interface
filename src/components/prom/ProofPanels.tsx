import { useState } from "react";
import {
  apiAttribution,
  apiOod,
  apiProtocol,
  apiRlStretch,
  apiStructuredWeights,
  apiTimeline,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  ArtifactState,
  Button,
  Eyebrow,
  Mono,
  Panel,
  PanelHead,
  Stat,
  Tag,
  num,
  pct,
} from "./Panel";

/**
 * Flexible lookup for OOD rates table:
 * Supports Record<mechanism, Record<type, number>>, Record<type, Record<mechanism, number>>, or 2D array.
 */
function lookupOodRate(
  rates: unknown,
  mechanism: string,
  attackType: string,
  rowIdx: number,
  colIdx: number,
): number | undefined {
  if (!rates || typeof rates !== "object") return undefined;
  if (Array.isArray(rates)) {
    const row = rates[rowIdx];
    return Array.isArray(row) ? row[colIdx] : undefined;
  }
  const dict = rates as Record<string, Record<string, number>>;
  if (dict[mechanism]?.[attackType] !== undefined) return dict[mechanism][attackType];
  if (dict[attackType]?.[mechanism] !== undefined) return dict[attackType][mechanism];
  return undefined;
}

/**
 * Flexible lookup for Attribution matrix:
 * Supports Record<mechanism, Record<source, number>>, Record<source, Record<mechanism, number>>, or 2D array.
 */
function lookupAttrValue(
  matrix: unknown,
  mechanism: string,
  source: string,
  rowIdx: number,
  colIdx: number,
): number | undefined {
  if (!matrix || typeof matrix !== "object") return undefined;
  if (Array.isArray(matrix)) {
    const row = matrix[rowIdx];
    return Array.isArray(row) ? row[colIdx] : undefined;
  }
  const dict = matrix as Record<string, Record<string, number>>;
  if (dict[mechanism]?.[source] !== undefined) return dict[mechanism][source];
  if (dict[source]?.[mechanism] !== undefined) return dict[source][mechanism];
  return undefined;
}

/**
 * Out-of-Distribution (OOD) Generalization Matrix Panel.
 * Evaluates defense mechanism recall against generator attack types.
 */
export function OodPanel() {
  const ood = useApi(["ood"], apiOod);

  const mechanisms = (ood.data && "mechanisms" in ood.data ? ood.data.mechanisms : undefined) ?? [];
  const types = (ood.data && "types" in ood.data ? ood.data.types : undefined) ?? [];
  const rates = ood.data && "rates" in ood.data ? ood.data.rates : undefined;

  return (
    <Panel>
      <PanelHead
        eyebrow="GET /api/ood"
        title="OOD Generalization matrix"
        note="Measures recall across attack families vs defense detection mechanisms under zero-shot transfer."
      />
      <ArtifactState isLoading={ood.isLoading} error={ood.error} data={ood.data}>
        {rates && types.length && mechanisms.length ? (
          <div className="overflow-x-auto p-5">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th className="pb-2 font-normal text-muted-foreground">Attack Type</th>
                  {mechanisms.map((m) => (
                    <th key={m} className="pb-2 text-right font-normal text-muted-foreground">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/40">
                {types.map((t, rowIdx) => (
                  <tr key={t} className="hover:bg-accent/40">
                    <td className="py-2.5 font-medium text-ink flex items-center gap-2">
                      <span>{t}</span>
                      {t === "A2" || t === "A5" ? (
                        <Tag tone="defense">held out</Tag>
                      ) : null}
                    </td>
                    {mechanisms.map((m, colIdx) => {
                      const val = lookupOodRate(rates, m, t, rowIdx, colIdx);
                      const isHigh = val !== undefined && val >= 0.8;
                      const isLow = val !== undefined && val < 0.5;
                      return (
                        <td
                          key={m}
                          className="py-2.5 text-right tabular-nums"
                          style={{
                            color:
                              val === undefined
                                ? "var(--color-muted-foreground)"
                                : isHigh
                                  ? "var(--color-defense)"
                                  : isLow
                                    ? "var(--color-attack)"
                                    : "var(--color-ink)",
                          }}
                        >
                          {pct(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ArtifactState>
    </Panel>
  );
}

/**
 * RL Stretch Evasion Benchmark Panel.
 * Reports reinforcement learning adversarial search results vs heuristic baseline.
 */
export function RlStretchPanel() {
  const rl = useApi(["rl-stretch"], apiRlStretch);

  const rawCrit = rl.data && "pre_registered_criterion" in rl.data ? rl.data.pre_registered_criterion : undefined;
  const critText =
    typeof rawCrit === "string"
      ? rawCrit
      : rawCrit && typeof rawCrit === "object"
        ? Object.entries(rawCrit)
            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`)
            .join(" · ")
        : "RL search capped by reward threshold.";

  return (
    <Panel>
      <PanelHead
        eyebrow="GET /api/rl-stretch"
        title="RL Adversarial stretch benchmark"
        note="Pre-registered evaluation measuring whether reinforcement learning agents find blind spots in the ensemble."
      />
      <ArtifactState isLoading={rl.isLoading} error={rl.error} data={rl.data}>
        {rl.data && "episodes_run" in rl.data ? (
          <div className="divide-y divide-rule">
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <Stat label="episodes run" value={rl.data.episodes_run.toLocaleString()} />
              <Stat
                label="RL best evasion"
                value={pct(rl.data.rl_best_mean_evasion)}
                tone="attack"
                hint="mean evasion rate"
              />
              <Stat
                label="heuristic baseline"
                value={pct(rl.data.heuristic_baseline)}
                hint="rule-based attacker"
              />
              <Stat
                label="shipped defense"
                value={rl.data.shipped ? "shipped" : "in progress"}
                tone={rl.data.shipped ? "defense" : "warn"}
              />
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Eyebrow>Pre-registered criterion</Eyebrow>
                <Tag tone={rl.data.honest_negative ? "defense" : "warn"}>
                  {rl.data.honest_negative ? "honest negative verified" : "standard"}
                </Tag>
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{critText}</p>
            </div>
          </div>
        ) : null}
      </ArtifactState>
    </Panel>
  );
}

/**
 * Attribution Matrix Panel (Exhibit vs Live).
 * Displays feature signal attribution per defense mechanism.
 */
export function AttributionPanel() {
  const [view, setView] = useState<"live" | "exhibit">("exhibit");
  const attr = useApi(["attribution"], apiAttribution);

  const payload =
    attr.data && "live" in attr.data
      ? view === "live"
        ? attr.data.live
        : attr.data.exhibit
      : undefined;

  const sources =
    payload?.sources ?? (attr.data && "sources" in attr.data ? attr.data.sources : []) ?? [];
  const mechanisms =
    payload?.mechanisms ?? (attr.data && "mechanisms" in attr.data ? attr.data.mechanisms : []) ?? [];
  const matrix = payload?.matrix ?? (attr.data && "matrix" in attr.data ? attr.data.matrix : undefined);

  return (
    <Panel>
      <PanelHead
        eyebrow="GET /api/attribution"
        title="Signal attribution matrix"
        note="Proportion of detection signals supplied by each data source and detector layer."
        right={
          <div className="flex items-center gap-1">
            {(["exhibit", "live"] as const).map((v) => (
              <Button
                key={v}
                onClick={() => setView(v)}
                className={view === v ? "bg-accent" : ""}
              >
                {v}
              </Button>
            ))}
          </div>
        }
      />
      <ArtifactState isLoading={attr.isLoading} error={attr.error} data={attr.data}>
        {matrix && sources.length && mechanisms.length ? (
          <div className="overflow-x-auto p-5">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th className="pb-2 font-normal text-muted-foreground">Signal Source</th>
                  {mechanisms.map((m) => (
                    <th key={m} className="pb-2 text-right font-normal text-muted-foreground">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/40">
                {sources.map((s, rowIdx) => (
                  <tr key={s} className="hover:bg-accent/40">
                    <td className="py-2.5 font-medium text-ink">{s}</td>
                    {mechanisms.map((m, colIdx) => {
                      const val = lookupAttrValue(matrix, m, s, rowIdx, colIdx);
                      return (
                        <td key={m} className="py-2.5 text-right tabular-nums text-muted-foreground">
                          {val !== undefined ? (typeof val === "number" && val > 1 ? val : num(val, 3)) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 font-mono text-xs text-muted-foreground">
            {view === "live" ? "No live session attribution recorded yet." : "No exhibit attribution available."}
          </p>
        )}
      </ArtifactState>
    </Panel>
  );
}

/**
 * Structured Weights Panel.
 * Details the deep-path formula and fitted weights vs baseline.
 */
export function StructuredWeightsPanel() {
  const weights = useApi(["structured-weights"], apiStructuredWeights);

  const fitted = weights.data && "fitted" in weights.data ? weights.data.fitted : undefined;
  const baseline = weights.data && "baseline" in weights.data ? weights.data.baseline : undefined;
  const rawWeights = weights.data && "weights" in weights.data ? weights.data.weights : undefined;

  const displayWeights = fitted ?? rawWeights ?? {};
  const formula =
    (weights.data && "formula" in weights.data && weights.data.formula
      ? weights.data.formula
      : undefined) ?? "R = w_t·T + w_g·G + w_b·B + w_e·E + w_c·C - w_u·U";

  return (
    <Panel>
      <PanelHead
        eyebrow="GET /api/structured-weights"
        title="Fitted structured weights"
        note="Constrained regression coefficients for the deep-path decision score R = w_t·T + w_g·G + w_b·B + w_e·E + w_c·C - w_u·U."
      />
      <ArtifactState isLoading={weights.isLoading} error={weights.error} data={weights.data}>
        <div className="divide-y divide-rule">
          <div className="bg-paper/40 p-5">
            <Eyebrow>Formula</Eyebrow>
            <p className="mt-1 font-mono text-sm text-ink">{formula}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(displayWeights).map(([k, v]) => {
              const baseVal = baseline?.[k];
              return (
                <Stat
                  key={k}
                  label={k}
                  value={num(v, 2)}
                  hint={baseVal !== undefined ? `baseline: ${num(baseVal, 2)}` : undefined}
                />
              );
            })}
          </div>
        </div>
      </ArtifactState>
    </Panel>
  );
}

/**
 * Timeline / Simulation Cycle Log Panel.
 * Displays chronological cycle progression and simulation timestamps.
 */
export function TimelinePanel() {
  const timeline = useApi(["timeline"], apiTimeline);

  const rawEntries =
    (timeline.data && "entries" in timeline.data ? timeline.data.entries : undefined) ??
    (timeline.data && "cycles" in timeline.data ? timeline.data.cycles : undefined) ??
    (timeline.data && "timeline" in timeline.data ? timeline.data.timeline : undefined) ??
    [];

  const entries = Array.isArray(rawEntries) ? rawEntries : [];

  return (
    <Panel>
      <PanelHead
        eyebrow="GET /api/timeline"
        title="Simulation cycle timeline"
        note="Audit log of state transitions, retraining steps, and benchmark iterations."
      />
      <ArtifactState isLoading={timeline.isLoading} error={timeline.error} data={timeline.data}>
        <div className="max-h-96 overflow-y-auto p-5">
          {entries.length ? (
            <ol className="space-y-3 font-mono text-xs">
              {entries.map((entry, idx) => {
                const blindSpot = entry["blind_spot"] ? String(entry["blind_spot"]) : null;
                const recallBefore = typeof entry["recall_before"] === "number" ? entry["recall_before"] : undefined;
                const recallAfter = typeof entry["recall_after"] === "number" ? entry["recall_after"] : undefined;
                const improved = Boolean(entry["improved"]);
                const seed = entry["seed_used"] ?? entry["step"] ?? idx;

                return (
                  <li key={idx} className="border-l-2 border-rule pl-4 hover:border-defense py-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">Cycle #{idx + 1}</span>
                        {blindSpot && blindSpot !== "none" ? (
                          <Tag tone="warn">{blindSpot}</Tag>
                        ) : (
                          <Tag tone="defense">clean</Tag>
                        )}
                        {improved ? <Tag tone="defense">improved</Tag> : null}
                      </div>
                      <span className="text-muted-foreground text-[11px]">seed: {String(seed)}</span>
                    </div>
                    {recallBefore !== undefined && recallAfter !== undefined ? (
                      <p className="mt-1.5 text-muted-foreground">
                        Recall: <span className="text-attack">{pct(recallBefore)}</span> →{" "}
                        <span className="text-defense">{pct(recallAfter)}</span>
                        {entry["generated_fixes"] ? ` · ${String(entry["generated_fixes"])} fixes` : ""}
                        {entry["retrain_rounds_used"] ? ` · ${String(entry["retrain_rounds_used"])} retrain rounds` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-muted-foreground">
                        {Object.entries(entry)
                          .filter(([k]) => !["event", "name", "timestamp", "step"].includes(k))
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="font-mono text-xs text-muted-foreground">No cycle entries logged yet.</p>
          )}
        </div>
      </ArtifactState>
    </Panel>
  );
}

/**
 * Protocol Risk Class Matrix Panel.
 * Outlines the formal specifications for RC-1 through RC-5 and security guarantees.
 */
export function ProtocolMatrixPanel() {
  const protocol = useApi(["protocol"], apiProtocol);

  const perRc = protocol.data && "per_rc" in protocol.data ? protocol.data.per_rc : undefined;
  const citations = protocol.data && "citations" in protocol.data ? protocol.data.citations : undefined;
  const holdoutFp = protocol.data && "holdout_fingerprint" in protocol.data ? protocol.data.holdout_fingerprint : undefined;

  return (
    <Panel>
      <PanelHead
        eyebrow="GET /api/protocol"
        title="PCAT Protocol & Risk Class Matrix"
        note="Formal security parameters, benign false-positive bounds, and cryptographic holdout commitments."
        right={holdoutFp ? <Tag tone="defense">FP: {holdoutFp.slice(0, 10)}…</Tag> : null}
      />
      <ArtifactState isLoading={protocol.isLoading} error={protocol.error} data={protocol.data}>
        <div className="divide-y divide-rule">
          {perRc ? (
            <div className="p-5">
              <Eyebrow>Risk Class Specifications</Eyebrow>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(perRc).map(([rc, spec]) => {
                  const specObj = (spec && typeof spec === "object" ? spec : {}) as Record<string, unknown>;
                  const naive = specObj["naive"] as Record<string, unknown> | undefined;
                  const pcat = specObj["pcat"] as Record<string, unknown> | undefined;

                  return (
                    <div key={rc} className="border border-rule p-3">
                      <div className="flex items-baseline justify-between">
                        <Mono className="text-sm font-semibold">{rc}</Mono>
                        <Tag tone="defense">Verified</Tag>
                      </div>
                      <dl className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                        {naive?.["attacker_received_total"] !== undefined ? (
                          <div className="flex justify-between gap-2">
                            <dt>Naive rail payout</dt>
                            <dd className="text-attack font-semibold">
                              ${num(Number(naive["attacker_received_total"]), 2)}
                            </dd>
                          </div>
                        ) : null}
                        {pcat?.["attacker_received_total"] !== undefined ? (
                          <div className="flex justify-between gap-2">
                            <dt>PCAT rail payout</dt>
                            <dd className="text-defense font-semibold">
                              ${num(Number(pcat["attacker_received_total"]), 2)}
                            </dd>
                          </div>
                        ) : null}
                        {specObj["mechanism_block"] ? (
                          <div className="flex justify-between gap-2">
                            <dt>Mechanism</dt>
                            <dd className="text-ink">{String(specObj["mechanism_block"])}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {citations?.length ? (
            <div className="p-5">
              <Eyebrow>References & Formal Citations</Eyebrow>
              <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-xs text-muted-foreground">
                {citations.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </ArtifactState>
    </Panel>
  );
}
