import { createFileRoute } from "@tanstack/react-router";
import { Eyebrow, Mono, Tag } from "@/components/prom/Panel";
import { Pcat } from "@/components/prom/Pcat";
import { AttributionPanel, StructuredWeightsPanel } from "@/components/prom/ProofPanels";
import { SixArcWard } from "@/components/prom/SixArcWard";
import { TxInspector } from "@/components/prom/TxInspector";

export const Route = createFileRoute("/defense")({
  head: () => ({
    meta: [
      { title: "Defense & PCAT — PROMETHEUS Fraud Twin" },
      {
        name: "description",
        content:
          "Blue Team detection ensemble, 6-channel detector signal decomposition, and Payment-Constrained Agent Token (PCAT) defense arena.",
      },
    ],
  }),
  component: DefensePage,
});

function DefensePage() {
  return (
    <div className="space-y-8 pb-16">
      {/* Editorial Header */}
      <section className="border-b border-white/14 bg-black/75 backdrop-blur-md px-4 sm:px-6 py-6 sm:py-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Eyebrow className="text-defense font-semibold">BLUE TEAM // DEFENSE & AGENTIC RAILS</Eyebrow>
            <div className="flex items-center gap-2">
              <Tag tone="defense">PCAT PROTOCOL</Tag>
              <Tag tone="muted">6-SIGNAL ENSEMBLE</Tag>
              <Tag tone="muted">DEEP-PATH SCORING</Tag>
            </div>
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl text-white leading-tight">
            Constrained agent tokens & multi-signal defense.
          </h1>
          <p className="mt-3 max-w-2xl text-xs sm:text-sm text-white/85 leading-relaxed font-normal">
            Mitigate agentic payment exploits across five threat classes using cryptographic
            Payment-Constrained Agent Tokens (PCAT), backed by a six-detector ensemble (XGBoost, GNN,
            manifold, and spectral topology).
          </p>
        </div>
      </section>

      {/* Main Defense Workspace */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 space-y-8 sm:space-y-10">
        {/* Six-Arc Ward Multi-Detector Visualization */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Ensemble Architecture</Eyebrow>
            <Mono className="text-muted-foreground">orthogonal detection manifolds</Mono>
          </div>
          <SixArcWard />
        </section>

        {/* PCAT vs Naive Rails Arena */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Agentic Commerce Arena</Eyebrow>
            <Mono className="text-muted-foreground">dual-lane checkout evaluation</Mono>
          </div>
          <Pcat />
        </section>

        {/* Transaction Signal Inspector */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Transaction Signal Decomposition</Eyebrow>
            <Mono className="text-muted-foreground">six-detector live scoring</Mono>
          </div>
          <TxInspector />
        </section>

        {/* Attribution & Weights Panels */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Signal Provenance</Eyebrow>
              <Mono className="text-muted-foreground">source vs detector attribution</Mono>
            </div>
            <AttributionPanel />
          </div>
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Structured Weights</Eyebrow>
              <Mono className="text-muted-foreground">fitted regression coefficients</Mono>
            </div>
            <StructuredWeightsPanel />
          </div>
        </section>
      </div>
    </div>
  );
}
