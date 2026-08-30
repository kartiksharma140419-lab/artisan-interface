import { useState } from "react";
import {
  apiAgenticStatus,
  apiCheckout,
  type CheckoutRequest,
  type CheckoutResponse,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { ArtifactState, Button, Eyebrow, Mono, Panel, PanelHead, Stat, Tag } from "./Panel";

const RC = ["RC-1", "RC-2", "RC-3", "RC-4", "RC-5"] as const;

const RC_NOTE: Record<string, string> = {
  "RC-1": "Confused deputy — the agent is talked into paying the wrong party.",
  "RC-2": "Credential replay beyond the authorised scope.",
  "RC-3": "Payout substitution to an attacker-controlled destination.",
  "RC-4": "Authorisation inflation — one consent, many charges.",
  "RC-5": "Identity blur between caller and acting agent.",
};

export function Pcat() {
  const status = useApi(["agentic-status"], apiAgenticStatus, { staleTime: 5_000 });
  const [rc, setRc] = useState<(typeof RC)[number]>("RC-1");
  const [naive, setNaive] = useState<CheckoutResponse | null>(null);
  const [pcat, setPcat] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  const base = (defense: "pcat" | "naive"): CheckoutRequest => ({
    merchant_id: "m_demo_1",
    amount: 420.5,
    agent_id: "agent_shopper_1",
    caller_identity: rc === "RC-5" ? null : "user_1",
    defense,
    rc_class: rc,
    n_authorizations: rc === "RC-4" ? 4 : 1,
    leak_credential: rc === "RC-2",
    attacker_controlled_payout: rc === "RC-3" ? "acct_attacker_9" : null,
  });

  const run = async () => {
    setBusy(true);
    setError(null);
    setNaive(null);
    setPcat(null);
    try {
      const [n, p] = await Promise.all([
        apiCheckout(base("naive")),
        apiCheckout(base("pcat")),
      ]);
      setNaive(n);
      setPcat(p);
      await status.refetch();
    } catch (e) {
      setError(e instanceof Error ? e : new Error("checkout failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <PanelHead
        eyebrow="POST /api/agentic/checkout"
        title="PCAT vs naive rails"
        note="The same attack is run twice against the same world: once on naive rails, once through the payment-constrained agent token. The verdict is the backend's own judged_attack_success."
        right={
          <Button tone="defense" onClick={run} disabled={busy}>
            {busy ? "running both…" : "run the pair"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-3">
        <Mono className="text-muted-foreground">risk class</Mono>
        {RC.map((r) => (
          <Button
            key={r}
            tone="attack"
            onClick={() => setRc(r)}
            className={rc === r ? "bg-attack text-ink" : ""}
          >
            {r}
          </Button>
        ))}
      </div>
      <p className="border-b border-rule px-5 py-3 text-sm text-muted-foreground">{RC_NOTE[rc]}</p>

      {error ? (
        <p className="px-5 py-6 font-mono text-xs text-attack">{error.message}</p>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-rule md:grid-cols-2 md:divide-x md:divide-y-0">
          <Lane label="Naive rails" tone="attack" res={naive} />
          <Lane label="PCAT" tone="defense" res={pcat} />
        </div>
      )}

      <div className="border-t border-rule">
        <PanelHead eyebrow="GET /api/agentic/status" title="World state" />
        <ArtifactState isLoading={status.isLoading} error={status.error} data={status.data}>
          <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-4">
            <Stat label="world transactions" value={status.data?.world_transactions ?? "—"} />
            <Stat label="session log lines" value={status.data?.session_log_lines ?? "—"} />
            <Stat
              label="leaked credentials"
              value={countOf(status.data?.leaked_credentials)}
              tone="attack"
            />
            <Stat
              label="certified payouts"
              value={countOf(status.data?.certified_payouts)}
              tone="defense"
            />
          </div>
          {status.data?.events?.length ? (
            <div className="px-5 pb-5">
              <Eyebrow>Recent events</Eyebrow>
              <ol className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                {status.data.events.slice(-8).map((e, i) => (
                  <li key={i} className="border-l border-rule pl-3">
                    {Object.entries(e)
                      .slice(0, 5)
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join("  ")}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </ArtifactState>
      </div>
    </Panel>
  );
}

function countOf(v: unknown): string | number {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") return Object.keys(v).length;
  if (typeof v === "number") return v;
  return "—";
}

function Lane({
  label,
  tone,
  res,
}: {
  label: string;
  tone: "attack" | "defense";
  res: CheckoutResponse | null;
}) {
  return (
    <div className="px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>{label}</Eyebrow>
        {res ? (
          <Tag tone={res.judged_attack_success ? "attack" : "defense"}>
            {res.judged_attack_success ? "attack succeeded" : "attack blocked"}
          </Tag>
        ) : (
          <Tag>idle</Tag>
        )}
      </div>

      {!res ? (
        <p className="mt-3 text-sm text-muted-foreground">Not run yet.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <p
            className="font-display text-3xl leading-tight"
            style={{
              color: res.decision.allowed
                ? tone === "attack"
                  ? "var(--color-attack)"
                  : "var(--color-ink)"
                : "var(--color-defense)",
            }}
          >
            {res.decision.allowed ? "payment allowed" : "payment refused"}
          </p>
          <p className="max-w-prose text-sm text-muted-foreground">{res.decision.reason}</p>
          {res.defense_note ? (
            <p className="font-mono text-[11px] text-muted-foreground">{res.defense_note}</p>
          ) : null}
          {res.decision.credential_leaked ? <Tag tone="attack">credential leaked</Tag> : null}
          <pre className="max-h-52 overflow-auto border border-rule bg-paper/60 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
            {JSON.stringify(
              {
                p_blocks: res.decision.p_blocks,
                payments: res.decision.payments,
                payout: res.decision.payout,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
