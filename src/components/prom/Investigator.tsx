import { useMemo, useState } from "react";
import {
  apiInvestigate,
  apiSampleTxs,
  type CaseFile,
  type SampleTxs,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Button, Eyebrow, Mono, Panel, PanelHead, Stat, Tag, num, pct } from "./Panel";

/** Pull a flat list of tx ids out of whatever shape /api/sample-txs returns. */
function extractIds(s: SampleTxs | undefined): { fraud: string[]; benign: string[] } {
  const pick = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) =>
        typeof x === "string"
          ? x
          : x && typeof x === "object"
            ? String(
                (x as Record<string, unknown>)["tx_id"] ??
                  (x as Record<string, unknown>)["id"] ??
                  "",
              )
            : "",
      )
      .filter(Boolean);
  };
  if (!s) return { fraud: [], benign: [] };
  const fraud = pick(s.fraud);
  const benign = pick(s.benign);
  if (fraud.length || benign.length) return { fraud, benign };
  const all = pick(s.samples);
  return { fraud: all.slice(0, 6), benign: all.slice(6, 12) };
}

export function Investigator() {
  const samples = useApi(["sample-txs"], apiSampleTxs);
  const ids = useMemo(() => extractIds(samples.data), [samples.data]);

  const [selected, setSelected] = useState<string[]>([]);
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeReason, setActiveReason] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const investigate = async () => {
    const tx = selected.length ? selected : ids.fraud.slice(0, 3);
    if (!tx.length) return;
    setBusy(true);
    setError(null);
    try {
      setCaseFile(await apiInvestigate(`case-${Date.now().toString(36)}`, tx));
    } catch (e) {
      setError(e instanceof Error ? e : new Error("investigation failed"));
    } finally {
      setBusy(false);
    }
  };

  const s = caseFile?.structured;
  const highlightedEvidence = activeReason
    ? s?.reason_evidence_ids?.[activeReason]
    : undefined;

  return (
    <Panel>
      <PanelHead
        eyebrow="POST /api/investigate"
        title="The Investigator"
        note="A case file, not a chat window. Every claim in the narrative resolves to an evidence id produced by a named agent."
        right={
          <Button tone="defense" onClick={investigate} disabled={busy}>
            {busy ? "opening case…" : caseFile ? "re-investigate" : "open a case"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-3">
        <Mono className="text-muted-foreground">GET /api/sample-txs</Mono>
        {samples.isLoading ? (
          <Mono className="text-muted-foreground">reading…</Mono>
        ) : samples.error ? (
          <Mono className="text-attack">{samples.error.message}</Mono>
        ) : (
          <>
            {ids.fraud.slice(0, 8).map((id) => (
              <Button
                key={id}
                tone="attack"
                onClick={() => toggle(id)}
                className={selected.includes(id) ? "bg-attack text-ink" : ""}
              >
                {id.slice(0, 14)}
              </Button>
            ))}
            {ids.benign.slice(0, 4).map((id) => (
              <Button
                key={id}
                onClick={() => toggle(id)}
                className={selected.includes(id) ? "bg-accent" : ""}
              >
                {id.slice(0, 14)}
              </Button>
            ))}
          </>
        )}
      </div>

      {error ? (
        <p className="px-5 py-6 font-mono text-xs text-attack">{error.message}</p>
      ) : !caseFile ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          Pick transactions above (red are labelled fraud in the twin) and open a case. If you pick
          none, the first three fraud rows are used.
        </p>
      ) : (
        <div className="divide-y divide-rule">
          <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-5">
            <Stat label="case id" value={<span className="text-sm">{caseFile.case_id}</span>} />
            <Stat label="rows" value={caseFile.n_rows} />
            <Stat
              label="score"
              value={num(s?.score)}
              hint={s?.band}
              tone={s?.band === "HIGH" ? "attack" : "ink"}
            />
            <Stat label="p(fraud)" value={pct(s?.p_fraud)} />
            <Stat
              label="delegates"
              value={`${caseFile.delegates_used}/${caseFile.delegates_used + caseFile.delegates_left}`}
              hint="budgeted"
            />
          </div>

          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.3fr_1fr]">
            <div className="border-b border-rule px-5 py-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2">
                <Eyebrow>Narrative</Eyebrow>
                <Tag tone={caseFile.narrative_mode === "llm" ? "defense" : "warn"}>
                  {caseFile.narrative_mode}
                </Tag>
                {caseFile.watch_hit_count ? (
                  <Tag tone="attack">{caseFile.watch_hit_count} watch hits</Tag>
                ) : null}
              </div>
              <p className="mt-3 max-w-prose whitespace-pre-line text-[15px] leading-relaxed">
                {caseFile.narrative}
              </p>

              <div className="mt-5 border-t border-rule pt-4">
                <Eyebrow>Claim → evidence</Eyebrow>
                <ul className="mt-2 space-y-1">
                  {Object.entries(s?.reason_evidence_ids ?? {}).map(([reason, evId]) => (
                    <li key={reason}>
                      <button
                        onMouseEnter={() => setActiveReason(reason)}
                        onMouseLeave={() => setActiveReason(null)}
                        onClick={() => setActiveReason(reason)}
                        className="flex w-full items-baseline justify-between gap-4 border-b border-rule/60 py-1.5 text-left transition-colors duration-200 hover:bg-accent/60"
                      >
                        <span className="font-mono text-xs">{reason}</span>
                        <span className="font-mono text-[11px] text-defense">{String(evId)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {s?.top_reason_column ? (
                  <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                    top reason <span className="text-ink">{s.top_reason_column}</span>
                  </p>
                ) : null}
                {s?.counterfactual ? (
                  <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                    <span className="label mr-2">counterfactual</span>
                    {s.counterfactual}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="px-5 py-5">
              <Eyebrow>Evidence ledger</Eyebrow>
              <ul className="mt-2 space-y-2">
                {Object.entries(caseFile.evidence).map(([id, e]) => (
                  <li
                    key={id}
                    className="border px-3 py-2 transition-colors duration-200"
                    style={{
                      borderColor:
                        highlightedEvidence === id ? "var(--color-defense)" : "var(--color-rule)",
                      background:
                        highlightedEvidence === id ? "var(--color-defense-dim)" : "transparent",
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <Mono>{id}</Mono>
                      <Tag>{e.kind}</Tag>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{e.summary}</p>
                  </li>
                ))}
              </ul>

              {caseFile.missing_agents.length ? (
                <div className="mt-4 border-t border-rule pt-3">
                  <Eyebrow>Agents that produced nothing</Eyebrow>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {caseFile.missing_agents.map((a) => (
                      <Tag key={a} tone="warn">
                        {a}
                      </Tag>
                    ))}
                  </div>
                </div>
              ) : null}

              {caseFile.sender_accounts.length ? (
                <div className="mt-4 border-t border-rule pt-3">
                  <Eyebrow>Sender accounts</Eyebrow>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {caseFile.sender_accounts.join(" · ")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {caseFile.delegate_log.length ? (
            <div className="px-5 py-5">
              <Eyebrow>Delegate log</Eyebrow>
              <ol className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                {caseFile.delegate_log.map((d, i) => (
                  <li key={i} className="border-l border-rule pl-3">
                    {Object.entries(d)
                      .slice(0, 4)
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join("  ")}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
