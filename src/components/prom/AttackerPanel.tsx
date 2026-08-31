import { useState } from "react";
import { apiInject } from "@/lib/api";
import { Button, Eyebrow, Mono, Panel, PanelHead, Tag } from "./Panel";

export interface AttackTypology {
  id: string;
  name: string;
  category: string;
  heldOut: boolean;
  evasionTactics: string;
  description: string;
}

const ATTACK_FAMILIES: AttackTypology[] = [
  {
    id: "A1",
    name: "Fast Velocity Evasion",
    category: "Temporal / Rate Limit",
    heldOut: false,
    evasionTactics: "Burst frequency calibrated 2% below AML threshold",
    description: "Rapid sequence of high-velocity micro-payments designed to evade standard threshold alerting without triggering volume breakers.",
  },
  {
    id: "A2",
    name: "Synthetic Identity Infiltration",
    category: "Entity Masquerade",
    heldOut: true,
    evasionTactics: "Zero-shot holdout — fabricated graph credentials",
    description: "Cold-start synthetic identities established with clean historical transactions. Strictly held out from training data for decontaminated testing.",
  },
  {
    id: "A3",
    name: "Smurfing & Structuring",
    category: "Volume Partitioning",
    heldOut: false,
    evasionTactics: "Sub-threshold tranche splitting across multiple accounts",
    description: "Disperses large capital tranches into dozens of small transactions below mandatory reporting limits across auxiliary accounts.",
  },
  {
    id: "A4",
    name: "Layering & Mule Cascades",
    category: "Relational Camouflage",
    heldOut: false,
    evasionTactics: "Multi-hop graph paths with non-deterministic time delays",
    description: "Passes illicit funds through multi-tier intermediate mule nodes to dilute source-to-destination transaction links in the graph.",
  },
  {
    id: "A5",
    name: "Scatter-Gather Funneling",
    category: "Topological Concentration",
    heldOut: true,
    evasionTactics: "Zero-shot holdout — fan-in hub convergence",
    description: "Dispersed parallel micro-transfers converging simultaneously onto single merchant egress hubs. Strictly held out for blind-spot benchmarking.",
  },
  {
    id: "A6",
    name: "Cycle Laundering / Closed Rings",
    category: "Topological Loop",
    heldOut: false,
    evasionTactics: "Circular transaction rings with obfuscated wash return",
    description: "Circular fund routing through 4 to 8 hops that loops back to original entities under disguised merchant invoices.",
  },
];

export function AttackerPanel() {
  const [injecting, setInjecting] = useState<string | null>(null);
  const [injectNote, setInjectNote] = useState<string | null>(null);
  const [selectedAttack, setSelectedAttack] = useState<string>("A1");

  const handleInject = async (id: string) => {
    setInjecting(id);
    setInjectNote(null);
    try {
      await apiInject(id);
      setInjectNote(`Injected attack typology ${id} into live transaction stream`);
    } catch (e) {
      setInjectNote(e instanceof Error ? e.message : `Failed to inject attack ${id}`);
    } finally {
      setInjecting(null);
    }
  };

  const current: AttackTypology =
    ATTACK_FAMILIES.find((a) => a.id === selectedAttack) ?? (ATTACK_FAMILIES[0] as AttackTypology);

  return (
    <Panel>
      <PanelHead
        eyebrow="POST /api/stream/inject"
        title="Red Team Attack Typologies"
        note="AMLSim-compliant adversarial attack generators. Active attacks can be injected into the live simulation stream; held-out families (A2 & A5) are reserved strictly for decontaminated evaluation."
        right={
          <div className="flex items-center gap-2">
            <Tag tone="attack">4 ACTIVE GENERATORS</Tag>
            <Tag tone="defense">2 HELD-OUT BENCHMARKS</Tag>
          </div>
        }
      />

      <div className="grid grid-cols-1 divide-y divide-rule lg:grid-cols-[1.4fr_1fr] lg:divide-y-0 lg:divide-x">
        {/* Attack Typology Grid */}
        <div className="p-5 space-y-4">
          <Eyebrow>Benchmark Attack Families</Eyebrow>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ATTACK_FAMILIES.map((atk) => {
              const isSelected = selectedAttack === atk.id;
              return (
                <div
                  key={atk.id}
                  onClick={() => setSelectedAttack(atk.id)}
                  className={`cursor-pointer border p-3.5 transition-all duration-200 ${
                    isSelected
                      ? "border-attack bg-attack/10"
                      : "border-rule hover:border-rule/80 hover:bg-card/40"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">{atk.id}</span>
                      <span className="font-medium text-xs text-white/90">{atk.name}</span>
                    </div>
                    {atk.heldOut ? (
                      <Tag tone="defense">Held Out</Tag>
                    ) : (
                      <Tag tone="attack">Trainable</Tag>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-white/70 line-clamp-2 leading-relaxed">
                    {atk.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-rule/60">
                    <Mono className="text-[10px] text-muted-foreground">{atk.category}</Mono>
                    {!atk.heldOut ? (
                      <Button
                        tone="attack"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleInject(atk.id);
                        }}
                        disabled={injecting !== null}
                        className="text-[10px] py-1 px-2.5"
                      >
                        {injecting === atk.id ? "Injecting…" : "Inject"}
                      </Button>
                    ) : (
                      <span className="font-mono text-[10px] text-defense/80 font-medium">Evaluation Only</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {injectNote ? (
            <p className="font-mono text-xs text-attack border border-attack/40 bg-attack/10 px-3 py-2">
              ✦ {injectNote}
            </p>
          ) : null}
        </div>

        {/* Selected Attack Inspector */}
        <div className="p-5 space-y-4 bg-paper/30">
          <div className="flex items-baseline justify-between">
            <Eyebrow>Typology Deep-Dive</Eyebrow>
            <Mono className="text-white font-bold">{current.id}</Mono>
          </div>

          <div>
            <h3 className="font-display text-2xl text-white">{current.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Tag tone={current.heldOut ? "defense" : "attack"}>
                {current.heldOut ? "Decontaminated Zero-Shot" : "Trainable Generator"}
              </Tag>
              <Mono className="text-white/60 text-xs">{current.category}</Mono>
            </div>
          </div>

          <div className="border-t border-rule pt-3 space-y-2">
            <p className="label">Evasion Mechanics</p>
            <p className="font-mono text-xs text-white/90 leading-relaxed bg-black/40 p-2.5 border border-rule">
              {current.evasionTactics}
            </p>
          </div>

          <div className="border-t border-rule pt-3 space-y-2">
            <p className="label">Simulation Intent</p>
            <p className="text-xs text-white/80 leading-relaxed font-normal">
              {current.description}
            </p>
          </div>

          <div className="border-t border-rule pt-3">
            {!current.heldOut ? (
              <Button
                tone="attack"
                onClick={() => void handleInject(current.id)}
                disabled={injecting !== null}
                className="w-full py-2 text-xs"
              >
                {injecting === current.id ? "Injecting into Stream…" : `Inject ${current.id} into Twin Stream`}
              </Button>
            ) : (
              <div className="border border-defense/40 bg-defense/10 p-3 text-center">
                <p className="font-mono text-xs text-defense font-semibold">
                  Zero-Shot Holdout Safeguard Active
                </p>
                <p className="mt-1 text-[11px] text-white/70">
                  {current.id} cannot be injected into training to prevent evaluation contamination. Tested strictly during Beat 3.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
