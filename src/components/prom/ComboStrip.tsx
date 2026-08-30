import { useState } from "react";
import { apiCombo, type ComboResponse } from "@/lib/api";
import { Button, Eyebrow, Mono, Panel, PanelHead, Stat, Tag, num } from "./Panel";

/**
 * POST /api/combo runs one multi-stage laundering trajectory and reports which
 * stages the twin caught. Partial detection is the point: the interesting result
 * is "we saw stage 2 and 4 but missed stage 1".
 */
export function ComboStrip() {
  const [data, setData] = useState<ComboResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await apiCombo());
    } catch (e) {
      setError(e instanceof Error ? e : new Error("combo failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <PanelHead
        eyebrow="POST /api/combo"
        title="Multi-stage laundering"
        note="One trajectory, several stages. Detection is per stage — the strip below shows exactly where the chain became visible."
        right={
          <Button tone="attack" onClick={run} disabled={busy}>
            {busy ? "running chain…" : data ? "run again" : "run the chain"}
          </Button>
        }
      />

      {error ? (
        <p className="px-5 py-6 font-mono text-xs text-attack">{error.message}</p>
      ) : !data ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          Not run yet. A combo attack chains placement, layering and integration steps through the
          same graph.
        </p>
      ) : (
        <div className="divide-y divide-rule">
          <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-4">
            <Stat label="trajectory" value={<span className="text-sm">{data.trajectory_id}</span>} />
            <Stat label="stages" value={data.n_stages} />
            <Stat label="stages caught" value={data.stages_caught} tone="defense" />
            <Stat
              label="fully detected"
              value={data.fully_detected ? "yes" : "no"}
              tone={data.fully_detected ? "defense" : "attack"}
            />
          </div>

          <div className="px-5 py-5">
            <Eyebrow>Stage chain</Eyebrow>
            <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.stages.map((s, i) => (
                <li
                  key={s.stage}
                  className="border px-3 py-3"
                  style={{
                    borderColor: s.caught ? "var(--color-defense)" : "var(--color-attack)",
                    background: s.caught ? "var(--color-defense-dim)" : "transparent",
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <Mono>stage {s.stage}</Mono>
                    <Tag tone={s.caught ? "defense" : "attack"}>{s.caught ? "caught" : "missed"}</Tag>
                  </div>
                  <p className="mt-2 text-sm">{data.stage_names[i] ?? "—"}</p>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {s.n_txs} tx · peak {num(s.peak_score)} · mean {num(s.mean_score)}
                  </p>
                  <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                    {s.tx_ids.slice(0, 3).join(" ")}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Panel>
  );
}
