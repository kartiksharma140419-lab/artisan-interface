import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AmbientStrip } from "@/components/prom/AmbientStrip";
import { ComboStrip } from "@/components/prom/ComboStrip";
import { DemoNarrative } from "@/components/prom/DemoNarrative";
import { KnowledgeGraph } from "@/components/prom/KnowledgeGraph";
import { Eyebrow, Mono, Stat, Tag } from "@/components/prom/Panel";
import { TextLoop } from "@/components/reactbits/TextLoop";
import { apiStatus } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — PROMETHEUS Fraud Twin" },
      {
        name: "description",
        content:
          "Live overview of the Prometheus financial digital twin, real-time transaction streaming, knowledge graph, and closed-loop evaluation.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const status = useApi(["status"], apiStatus, { staleTime: 5_000 });
  const [fractureTraj, setFractureTraj] = useState<string | null>(null);
  const [playFracture, setPlayFracture] = useState<number>(0);

  const triggerFracture = (trajId: string | null) => {
    setFractureTraj(trajId);
    setPlayFracture(Date.now());
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Editorial Hero Section — Full Viewport Fold */}
      <section className="min-h-[calc(100vh-56px)] min-h-[calc(100svh-56px)] flex flex-col justify-between border-b border-white/14 bg-black/75 backdrop-blur-md overflow-hidden">
        <div className="mx-auto max-w-[1400px] w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 flex-1 flex flex-col justify-center">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Eyebrow className="text-defense font-semibold">PROMETHEUS // CORE INTELLIGENCE</Eyebrow>
            <div className="flex items-center gap-2">
              <Tag tone={status.data?.ready ? "defense" : "warn"}>
                {status.data?.ready ? "DIGITAL TWIN ONLINE" : "AWAITING INITIALIZATION"}
              </Tag>
              <Mono className="text-white/70">v2.0.0-PROMETHEUS</Mono>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:gap-10 lg:grid-cols-[1.6fr_1fr] items-center">
            <div>
              <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-5xl lg:text-6xl text-white">
                Adversarial twin for high-stakes fraud & agentic commerce.
              </h1>
              <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-white/85 leading-relaxed font-normal">
                A closed-loop platform pairing an AMLSim-verified financial digital twin with
                provably decontaminated Red Team evaluation, deep-path structured scoring, and
                payment-constrained agent tokens (PCAT).
              </p>
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <Link
                  to="/attack"
                  className="border border-attack/80 bg-attack/10 px-3.5 sm:px-4 py-2 sm:py-2.5 font-mono text-[11px] sm:text-xs uppercase tracking-widest text-attack font-semibold transition-all hover:bg-attack hover:text-white backdrop-blur-sm"
                >
                  Run Attack Cycle
                </Link>
                <Link
                  to="/defense"
                  className="border border-defense/80 bg-defense/10 px-3.5 sm:px-4 py-2 sm:py-2.5 font-mono text-[11px] sm:text-xs uppercase tracking-widest text-defense font-semibold transition-all hover:bg-defense hover:text-white backdrop-blur-sm"
                >
                  PCAT Agentic Arena
                </Link>
                <Link
                  to="/evidence"
                  className="border border-white/20 bg-black/50 px-3.5 sm:px-4 py-2 sm:py-2.5 font-mono text-[11px] sm:text-xs uppercase tracking-widest text-white font-semibold transition-all hover:bg-white/10 hover:border-white/40 backdrop-blur-sm"
                >
                  Evidence Room
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 border-t lg:border-t-0 lg:border-l border-white/14 pt-6 lg:pt-0 lg:pl-8">
              <Stat
                label="simulation status"
                value={status.data?.ready ? "Active" : "Uninitialized"}
                tone={status.data?.ready ? "defense" : "warn"}
                hint="financial twin world"
              />
              <Stat
                label="evaluation model"
                value="Decontaminated"
                tone="defense"
                hint="A2 / A5 locked out"
              />
              <Stat
                label="scoring path"
                value="Dual-Path"
                hint="fast ML + deep structured"
              />
              <Stat
                label="agentic rails"
                value="PCAT Token"
                tone="defense"
                hint="RC-1..RC-5 protected"
              />
            </div>
          </div>
        </div>

        {/* Full-width edge-to-edge interactive TextLoop ribbon seamlessly integrated inside hero section */}
        <div className="w-full overflow-hidden pb-3">
          <TextLoop
            text="Prometheus"
            shape="wave"
            speed={85}
            direction="forward"
            separator="✦"
            curviness={65}
            fontSize={32}
            fontWeight={800}
            letterSpacing={3}
            uppercase
            color="#ffffff"
            ribbon
            ribbonColor="#5227FF"
            ribbonWidth={66}
            pauseOnHover
            className="w-full"
          />
        </div>
      </section>

      {/* Ambient Real-Time Stream (revealed after scrolling hero fold) */}
      <AmbientStrip />

      {/* Main Content Modules */}
      <div className="mx-auto max-w-[1400px] px-6 space-y-10">
        {/* Knowledge Graph & The Fracture */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Entity Relational Topology</Eyebrow>
            <Mono className="text-muted-foreground">deterministic radial layout</Mono>
          </div>
          <KnowledgeGraph
            fractureTrajectory={fractureTraj}
            onTrajectoryChange={triggerFracture}
            playFracture={playFracture}
          />
        </section>

        {/* 3-Beat Decontaminated Narrative */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Decontaminated Evaluation Cycle</Eyebrow>
            <Mono className="text-muted-foreground">3-beat synchronous reveal</Mono>
          </div>
          <DemoNarrative onTrajectoryHint={() => setPlayFracture(Date.now())} />
        </section>

        {/* Multi-Stage Laundering Combo */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Multi-Stage Adversarial Trajectories</Eyebrow>
            <Mono className="text-muted-foreground">placement → layering → integration</Mono>
          </div>
          <ComboStrip />
        </section>
      </div>
    </div>
  );
}
