import { useState } from "react";
import { Eyebrow, Mono, Panel, PanelHead, Stat, Tag, num } from "./Panel";

export interface DetectorChannel {
  id: string;
  name: string;
  weightKey: string;
  color: string;
  category: string;
  latencyMs: number;
  mathBasis: string;
  description: string;
  defaultWeight: number;
}

const DETECTORS: DetectorChannel[] = [
  {
    id: "xgb",
    name: "XGBoost Classifier",
    weightKey: "w_t",
    color: "#38bdf8", // Sky blue
    category: "Tabular / Velocity",
    latencyMs: 1.2,
    mathBasis: "Gradient boosted decision trees on temporal cadence, amount-ratio distributions, and count spikes.",
    description: "Evaluates atomic transaction velocity and account-level deviations from 30-day baseline spending profiles.",
    defaultWeight: 820.87,
  },
  {
    id: "gnn",
    name: "Graph Neural Network",
    weightKey: "w_g",
    color: "#818cf8", // Indigo
    category: "Relational Topology",
    latencyMs: 8.4,
    mathBasis: "2-hop Graph Convolutional Network (GCN) embedding node ego-nets and multi-account mule paths.",
    description: "Detects structural camouflage and shared entity footprints across merchant, device, IP, and wallet neighborhoods.",
    defaultWeight: 250.0,
  },
  {
    id: "meta",
    name: "Meta-Ensemble Aggregator",
    weightKey: "w_b",
    color: "#a78bfa", // Purple
    category: "Ensemble Voting",
    latencyMs: 0.8,
    mathBasis: "Constrained monotonic meta-regressor weighting tabular, graph, and spectral confidence vectors.",
    description: "Combines fast heuristic filters with deep structured inference scores into calibrated risk probabilities.",
    defaultWeight: 200.0,
  },
  {
    id: "manifold",
    name: "Manifold Distortion Probe",
    weightKey: "w_e",
    color: "#f472b6", // Pink
    category: "Feature Space Anomaly",
    latencyMs: 3.1,
    mathBasis: "Local tangent space alignment & UMAP projection distance from empirical normal transaction manifolds.",
    description: "Identifies subtle adversarial perturbation vectors that attempt to stay within 1D marginal bounds.",
    defaultWeight: 90.02,
  },
  {
    id: "spectral_cycle",
    name: "Spectral Cycle Detector",
    weightKey: "w_c",
    color: "#34d399", // Emerald
    category: "Laplacian Closed Loops",
    latencyMs: 5.6,
    mathBasis: "Graph Laplacian eigenvalue decomposition over directed circular flow matrices (A6 ring detection).",
    description: "Traces closed-loop wash trading and cyclic fund rotation through 3 to 12 intermediate intermediary hops.",
    defaultWeight: 90.02,
  },
  {
    id: "spectral_star",
    name: "Spectral Star Hub Detector",
    weightKey: "w_u",
    color: "#fbbf24", // Amber
    category: "Fan-In / Fan-Out Hubs",
    latencyMs: 4.2,
    mathBasis: "Adjacency matrix singular value decomposition identifying dense star-graph ingress/egress topologies.",
    description: "Catches scatter-gather structuring (A5) and smurfing pipelines converging on centralized settlement nodes.",
    defaultWeight: 0.92,
  },
];

export function SixArcWard() {
  const [selectedId, setSelectedId] = useState<string>("xgb");
  const selected: DetectorChannel =
    DETECTORS.find((d) => d.id === selectedId) ?? (DETECTORS[0] as DetectorChannel);

  const size = 320;
  const center = size / 2;
  const radius = 110;
  const strokeWidth = 14;

  return (
    <Panel>
      <PanelHead
        eyebrow="DETECTION LAYER // THE WARD"
        title="The Six-Arc Defense Ward"
        note="Six-detector orthogonal defense ensemble. Each arc monitors a distinct mathematical manifold (tabular velocity, graph convolution, manifold distance, and spectral topology)."
        right={
          <div className="flex items-center gap-2">
            <Tag tone="defense">6 ORTHOGONAL LAYERS</Tag>
            <Tag tone="muted">SUB-10MS INFERENCE</Tag>
          </div>
        }
      />

      <div className="grid grid-cols-1 divide-y divide-rule lg:grid-cols-[1.3fr_1fr] lg:divide-y-0 lg:divide-x">
        {/* Visual Radial Arc Canvas */}
        <div className="p-6 flex flex-col items-center justify-center space-y-6">
          <div className="relative flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="overflow-visible"
              role="img"
              aria-label="Six-Arc Defense Ward Visualization"
            >
              {/* Outer Decorative Target Ring */}
              <circle
                cx={center}
                cy={center}
                r={radius + 32}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />

              {/* Inner Core Shield Circle */}
              <circle
                cx={center}
                cy={center}
                r={radius - 40}
                fill="rgba(10, 10, 16, 0.8)"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="1.5"
              />

              {/* 6 Radial Arcs */}
              {DETECTORS.map((detector, i) => {
                const totalArcs = DETECTORS.length;
                const arcAngle = (2 * Math.PI) / totalArcs;
                const gap = 0.09; // gap in radians
                const startAngle = i * arcAngle + gap / 2 - Math.PI / 2;
                const endAngle = (i + 1) * arcAngle - gap / 2 - Math.PI / 2;

                const x1 = center + radius * Math.cos(startAngle);
                const y1 = center + radius * Math.sin(startAngle);
                const x2 = center + radius * Math.cos(endAngle);
                const y2 = center + radius * Math.sin(endAngle);

                const isSelected = selectedId === detector.id;
                const pathD = `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;

                return (
                  <g
                    key={detector.id}
                    onClick={() => setSelectedId(detector.id)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    {/* Background track */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                    />
                    {/* Colored Arc */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={detector.color}
                      strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                      strokeLinecap="round"
                      opacity={isSelected ? 1 : 0.65}
                      className="transition-all duration-300 hover:opacity-100"
                      style={{
                        filter: isSelected ? `drop-shadow(0 0 8px ${detector.color})` : undefined,
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Central Badge Overlay */}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Active Ward
              </span>
              <span
                className="font-display text-2xl font-bold transition-colors duration-300"
                style={{ color: selected.color }}
              >
                {selected.id.toUpperCase()}
              </span>
              <span className="font-mono text-[10px] text-white/80 tabular-nums">
                {selected.latencyMs}ms
              </span>
            </div>
          </div>

          {/* Detector Channel Selectors */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
            {DETECTORS.map((d) => {
              const isSelected = selectedId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider border transition-all duration-200 ${
                    isSelected
                      ? "border-defense bg-defense/15 text-white font-bold"
                      : "border-rule bg-black/40 text-white/70 hover:text-white hover:border-rule/80"
                  }`}
                  style={{
                    borderColor: isSelected ? d.color : undefined,
                    color: isSelected ? d.color : undefined,
                  }}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: d.color }} />
                  {d.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Detector Channel Deep-Dive */}
        <div className="p-6 space-y-5 bg-paper/30">
          <div className="flex items-baseline justify-between">
            <Eyebrow>Detector Specification</Eyebrow>
            <Tag tone="defense">Layer {DETECTORS.findIndex((d) => d.id === selected.id) + 1} of 6</Tag>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: selected.color }} />
              <h3 className="font-display text-2xl text-white">{selected.name}</h3>
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{selected.category}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Stat label="decision coefficient" value={selected.weightKey} tone="defense" hint="fitted weight term" />
            <Stat label="inference latency" value={`${selected.latencyMs}ms`} hint="p95 execution" />
          </div>

          <div className="border-t border-rule pt-4 space-y-2">
            <p className="label">Mathematical Basis</p>
            <p className="font-mono text-xs text-white/90 leading-relaxed bg-black/50 p-3 border border-rule">
              {selected.mathBasis}
            </p>
          </div>

          <div className="border-t border-rule pt-4 space-y-2">
            <p className="label">Operational Role</p>
            <p className="text-xs text-white/80 leading-relaxed font-normal">
              {selected.description}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
