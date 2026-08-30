import { createFileRoute } from "@tanstack/react-router";
import { Eyebrow, Mono, Tag } from "@/components/prom/Panel";
import {
  AttributionPanel,
  OodPanel,
  ProtocolMatrixPanel,
  RlStretchPanel,
  StructuredWeightsPanel,
  TimelinePanel,
} from "@/components/prom/ProofPanels";

export const Route = createFileRoute("/protocol")({
  head: () => ({
    meta: [
      { title: "Protocol & Proofs — PROMETHEUS Fraud Twin" },
      {
        name: "description",
        content:
          "Formal protocol specifications, mathematical formulations, PCAT security guarantees, and empirical proof artifacts.",
      },
    ],
  }),
  component: ProtocolPage,
});

function ProtocolPage() {
  return (
    <div className="space-y-8 pb-16">
      {/* Editorial Header */}
      <section className="border-b border-white/14 bg-black/75 backdrop-blur-md px-4 sm:px-6 py-6 sm:py-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Eyebrow className="text-defense font-semibold">FORMAL PROTOCOL // PROOF LAYER</Eyebrow>
            <div className="flex items-center gap-2">
              <Tag tone="defense">CRYPTOGRAPHIC HOLDOUT</Tag>
              <Tag tone="muted">PROVABLE BOUNDS</Tag>
            </div>
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl text-white leading-tight">
            Mathematical foundations & security guarantees.
          </h1>
          <p className="mt-3 max-w-2xl text-xs sm:text-sm text-white/85 leading-relaxed font-normal">
            Every specification on this page is backed by verifiable mathematical formulas,
            pre-registered empirical criteria, and cryptographic holdout commitments ensuring strict
            evaluation integrity.
          </p>
        </div>
      </section>

      {/* Main Protocol Proofs */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 space-y-8 sm:space-y-10">
        {/* Protocol Specifications & Risk Class Matrix */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>PCAT Threat Specification</Eyebrow>
            <Mono className="text-muted-foreground">RC-1 through RC-5 matrix</Mono>
          </div>
          <ProtocolMatrixPanel />
        </section>

        {/* Deep-Path Scoring Formula & Weights */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Deep-Path Decision Formulation</Eyebrow>
            <Mono className="text-muted-foreground">constrained regression</Mono>
          </div>
          <StructuredWeightsPanel />
        </section>

        {/* OOD & RL Evasion Proofs */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Generalization Bounds</Eyebrow>
              <Mono className="text-muted-foreground">OOD transfer matrix</Mono>
            </div>
            <OodPanel />
          </div>
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Empirical Search Upper Bounds</Eyebrow>
              <Mono className="text-muted-foreground">RL adversarial evasion</Mono>
            </div>
            <RlStretchPanel />
          </div>
        </section>

        {/* Attribution & Timeline Panels */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Signal Decomposition Matrix</Eyebrow>
              <Mono className="text-muted-foreground">source provenance</Mono>
            </div>
            <AttributionPanel />
          </div>
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Audit & Cycle Ledger</Eyebrow>
              <Mono className="text-muted-foreground">chronological audit trace</Mono>
            </div>
            <TimelinePanel />
          </div>
        </section>
      </div>
    </div>
  );
}
