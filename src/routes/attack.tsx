import { createFileRoute } from "@tanstack/react-router";
import { AmbientStrip } from "@/components/prom/AmbientStrip";
import { ComboStrip } from "@/components/prom/ComboStrip";
import { DemoNarrative } from "@/components/prom/DemoNarrative";
import { Eyebrow, Mono, Tag } from "@/components/prom/Panel";
import { OodPanel, RlStretchPanel } from "@/components/prom/ProofPanels";

export const Route = createFileRoute("/attack")({
  head: () => ({
    meta: [
      { title: "Attack Arena — PROMETHEUS Fraud Twin" },
      {
        name: "description",
        content:
          "Red Team adversarial simulation, 3-beat decontaminated cycles, held-out generalization testing, and multi-stage laundering trajectories.",
      },
    ],
  }),
  component: AttackPage,
});

function AttackPage() {
  return (
    <div className="space-y-8 pb-16">
      {/* Editorial Header */}
      <section className="border-b border-white/14 bg-black/75 backdrop-blur-md px-4 sm:px-6 py-6 sm:py-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Eyebrow className="text-attack font-semibold">RED TEAM // ADVERSARIAL OPERATIONS</Eyebrow>
            <div className="flex items-center gap-2">
              <Tag tone="attack">6 BENCHMARK ATTACKS</Tag>
              <Tag tone="defense">A2 & A5 HELD OUT</Tag>
            </div>
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl text-white leading-tight">
            Decontaminated attacks & evasion benchmarks.
          </h1>
          <p className="mt-3 max-w-2xl text-xs sm:text-sm text-white/85 leading-relaxed font-normal">
            The Red Team synthesizes AMLSim typologies and adversarial evasion variants. To guarantee
            honest scientific measurement, attack types A2 (Synthetic Identity) and A5 (Scatter-Gather)
            are strictly locked out from training data.
          </p>
        </div>
      </section>

      {/* Live Stream & Injection */}
      <AmbientStrip />

      {/* Main Attack Workspace */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 space-y-8 sm:space-y-10">
        {/* The 3-Beat Decontaminated Cycle */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>The 3-Beat Retraining Cycle</Eyebrow>
            <Mono className="text-muted-foreground">synchronous batch evaluation</Mono>
          </div>
          <DemoNarrative />
        </section>

        {/* Multi-Stage Laundering Trajectories */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Multi-Stage Laundering Trajectories</Eyebrow>
            <Mono className="text-muted-foreground">chain-level visibility test</Mono>
          </div>
          <ComboStrip />
        </section>

        {/* Evasion & OOD Proofs */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Out-of-Distribution Transfer</Eyebrow>
              <Mono className="text-muted-foreground">zero-shot generalization</Mono>
            </div>
            <OodPanel />
          </div>
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Adversarial RL Search</Eyebrow>
              <Mono className="text-muted-foreground">reinforcement learning stretch</Mono>
            </div>
            <RlStretchPanel />
          </div>
        </section>
      </div>
    </div>
  );
}
