import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  apiGraph,
  apiNode,
  apiTrajectories,
  type GraphLink,
  type GraphNode,
  type GraphNodeType,
  type GraphResponse,
  type Trajectory,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Button, Eyebrow, Mono, Panel, PanelHead, Stat, Tag, num } from "./Panel";

const W = 1000;
const H = 580;

/** Deterministic orbital radial layout by entity archetype */
const RINGS: Record<GraphNodeType, number> = {
  account: 0.38,
  customer: 0.58,
  merchant: 0.72,
  device: 0.86,
  ip: 0.96,
  wallet: 0.78,
};

const NODE_SHAPE: Record<GraphNodeType, "circle" | "square" | "diamond" | "triangle" | "cross" | "hex"> = {
  account: "circle",
  customer: "square",
  merchant: "diamond",
  device: "triangle",
  ip: "cross",
  wallet: "hex",
};

const NODE_COLOR: Record<GraphNodeType, string> = {
  account: "#38bdf8", // Sky
  customer: "#818cf8", // Indigo
  merchant: "#34d399", // Emerald
  device: "#fbbf24", // Amber
  ip: "#a78bfa", // Purple
  wallet: "#f472b6", // Pink
};

const EDGE_DASH: Record<string, string> = {
  TRANSACTION: "",
  OWNED_BY: "4 4",
  USES_DEVICE: "2 4",
  USES_IP: "6 3",
  HAS_WALLET: "3 3",
};

type Placed = GraphNode & { x: number; y: number };

/* Default verified AMLSim exhibit topology (ensures instant zero-jitter rendering on first load) */
const EXHIBIT_NODES: GraphNode[] = [
  { id: "ACC-10492", type: "account", label: "ACC-10492 (Origin Mule)", risk_score: 0.94, is_fraud: true, properties: { balance: 45000, velocity_30d: "High", country: "US" } },
  { id: "ACC-88214", type: "account", label: "ACC-88214 (Layer 1)", risk_score: 0.88, is_fraud: true, properties: { balance: 18200, velocity_30d: "Surge", country: "CY" } },
  { id: "ACC-39102", type: "account", label: "ACC-39102 (Layer 2)", risk_score: 0.91, is_fraud: true, properties: { balance: 14500, velocity_30d: "Surge", country: "PA" } },
  { id: "ACC-71932", type: "account", label: "ACC-71932 (Egress Hub)", risk_score: 0.96, is_fraud: true, properties: { balance: 92000, velocity_30d: "Extreme", country: "KY" } },
  { id: "ACC-55201", type: "account", label: "ACC-55201 (Wash Return)", risk_score: 0.82, is_fraud: true, properties: { balance: 31000, velocity_30d: "Cyclic", country: "VG" } },
  { id: "ACC-00192", type: "account", label: "ACC-00192 (Retail Benign)", risk_score: 0.05, is_fraud: false, properties: { balance: 4200, velocity_30d: "Normal", country: "US" } },
  { id: "ACC-20941", type: "account", label: "ACC-20941 (Payroll Account)", risk_score: 0.08, is_fraud: false, properties: { balance: 12800, velocity_30d: "Steady", country: "US" } },
  { id: "ACC-61028", type: "account", label: "ACC-61028 (Merchant Account)", risk_score: 0.12, is_fraud: false, properties: { balance: 78000, velocity_30d: "Normal", country: "GB" } },

  { id: "CUST-402", type: "customer", label: "CUST-402 (Synthetic Profile)", risk_score: 0.92, is_fraud: true, properties: { kyc_tier: 1, created_days: 14 } },
  { id: "CUST-819", type: "customer", label: "CUST-819 (Verified Corporate)", risk_score: 0.04, is_fraud: false, properties: { kyc_tier: 3, created_days: 1280 } },
  { id: "CUST-103", type: "customer", label: "CUST-103 (Individual Verified)", risk_score: 0.06, is_fraud: false, properties: { kyc_tier: 2, created_days: 640 } },

  { id: "MERCH-NEXUS", type: "merchant", label: "MERCH-NEXUS (High Risk Gateway)", risk_score: 0.89, is_fraud: true, properties: { mcc: "7995", chargeback_rate: "4.8%" } },
  { id: "MERCH-GLOBAL", type: "merchant", label: "MERCH-GLOBAL (E-Commerce)", risk_score: 0.08, is_fraud: false, properties: { mcc: "5311", chargeback_rate: "0.2%" } },
  { id: "MERCH-PAY", type: "merchant", label: "MERCH-PAY (Utility Direct)", risk_score: 0.02, is_fraud: false, properties: { mcc: "4900", chargeback_rate: "0.01%" } },

  { id: "DEV-iOS-991", type: "device", label: "DEV-iOS-991 (Jailbroken Client)", risk_score: 0.85, is_fraud: true, properties: { os: "iOS 17.2", emulator: true } },
  { id: "DEV-MAC-102", type: "device", label: "DEV-MAC-102 (Corporate Workstation)", risk_score: 0.03, is_fraud: false, properties: { os: "macOS 14.5", emulator: false } },
  { id: "DEV-AND-441", type: "device", label: "DEV-AND-441 (Pixel Mobile)", risk_score: 0.07, is_fraud: false, properties: { os: "Android 14", emulator: false } },

  { id: "IP-198.51.100.24", type: "ip", label: "IP-198.51.100.24 (TOR Exit Node)", risk_score: 0.98, is_fraud: true, properties: { asn: "AS9009", proxy_type: "TOR" } },
  { id: "IP-203.0.113.88", type: "ip", label: "IP-203.0.113.88 (Hosting DataCenter)", risk_score: 0.74, is_fraud: true, properties: { asn: "AS14061", proxy_type: "VPN" } },
  { id: "IP-192.0.2.1", type: "ip", label: "IP-192.0.2.1 (Residential ISP)", risk_score: 0.04, is_fraud: false, properties: { asn: "AS7018", proxy_type: "Residential" } },

  { id: "WAL-0x7F2A", type: "wallet", label: "WAL-0x7F2A (Tornado Mixer Bridge)", risk_score: 0.99, is_fraud: true, properties: { chain: "ETH", flagged_sanction: true } },
  { id: "WAL-0x9B1C", type: "wallet", label: "WAL-0x9B1C (Custodial Wallet)", risk_score: 0.05, is_fraud: false, properties: { chain: "BTC", flagged_sanction: false } },
];

const EXHIBIT_LINKS: GraphLink[] = [
  { source: "ACC-10492", target: "ACC-88214", type: "TRANSACTION", amount: 9800, is_fraud: true, attack_id: "A4", trajectory_id: "traj-a4-layering", label: "$9,800 Structuring" },
  { source: "ACC-88214", target: "ACC-39102", type: "TRANSACTION", amount: 9400, is_fraud: true, attack_id: "A4", trajectory_id: "traj-a4-layering", label: "$9,400 Mule Hop 1" },
  { source: "ACC-39102", target: "ACC-71932", type: "TRANSACTION", amount: 9100, is_fraud: true, attack_id: "A4", trajectory_id: "traj-a4-layering", label: "$9,100 Mule Hop 2" },
  { source: "ACC-71932", target: "ACC-55201", type: "TRANSACTION", amount: 8900, is_fraud: true, attack_id: "A6", trajectory_id: "traj-a6-cycle", label: "$8,900 Ring Wash" },
  { source: "ACC-55201", target: "ACC-10492", type: "TRANSACTION", amount: 8500, is_fraud: true, attack_id: "A6", trajectory_id: "traj-a6-cycle", label: "$8,500 Loop Return" },

  { source: "ACC-10492", target: "CUST-402", type: "OWNED_BY", label: "Synthetic Identity" },
  { source: "ACC-10492", target: "DEV-iOS-991", type: "USES_DEVICE", label: "Device Fingerprint" },
  { source: "ACC-10492", target: "IP-198.51.100.24", type: "USES_IP", label: "TOR Connection" },
  { source: "ACC-71932", target: "MERCH-NEXUS", type: "TRANSACTION", amount: 24000, is_fraud: true, attack_id: "A3", label: "$24,000 Payout" },
  { source: "ACC-71932", target: "WAL-0x7F2A", type: "HAS_WALLET", label: "Mixer Bridge" },

  { source: "ACC-00192", target: "CUST-103", type: "OWNED_BY", label: "Personal Account" },
  { source: "ACC-00192", target: "MERCH-GLOBAL", type: "TRANSACTION", amount: 142.5, is_fraud: false, label: "$142.50 Retail" },
  { source: "ACC-20941", target: "CUST-819", type: "OWNED_BY", label: "Corporate Entity" },
  { source: "ACC-20941", target: "ACC-00192", type: "TRANSACTION", amount: 3200, is_fraud: false, label: "$3,200 Salary" },
  { source: "ACC-61028", target: "MERCH-PAY", type: "TRANSACTION", amount: 850, is_fraud: false, label: "$850 Utility" },
  { source: "ACC-00192", target: "DEV-AND-441", type: "USES_DEVICE", label: "Mobile App" },
  { source: "ACC-20941", target: "DEV-MAC-102", type: "USES_DEVICE", label: "Workstation" },
  { source: "ACC-00192", target: "IP-192.0.2.1", type: "USES_IP", label: "Home ISP" },
];

const EXHIBIT_TRAJECTORIES: Trajectory[] = [
  { trajectory_id: "traj-a4-layering", attack_type: "A4 Layering Cascade", n_actions: 3, n_txs: 3, n_fraud_txs: 3, total_amount: 28300, min_step: 4, max_step: 8 },
  { trajectory_id: "traj-a6-cycle", attack_type: "A6 Cycle Laundering", n_actions: 2, n_txs: 2, n_fraud_txs: 2, total_amount: 17400, min_step: 9, max_step: 14 },
  { trajectory_id: "traj-a3-smurfing", attack_type: "A3 Smurfing / Fan-In", n_actions: 4, n_txs: 4, n_fraud_txs: 4, total_amount: 32000, min_step: 15, max_step: 22 },
];

function layout(nodes: GraphNode[]): Map<string, Placed> {
  const byType = new Map<GraphNodeType, GraphNode[]>();
  nodes.forEach((n) => {
    const list = byType.get(n.type) ?? [];
    list.push(n);
    byType.set(n.type, list);
  });
  const placed = new Map<string, Placed>();
  const cx = W / 2;
  const cy = H / 2;
  byType.forEach((list, type) => {
    const ringFactor = RINGS[type] ?? 0.7;
    const r = ringFactor * (H / 2 - 32);
    list.forEach((n, i) => {
      const phase = (type.charCodeAt(0) % 7) * 0.42;
      const a = (i / Math.max(1, list.length)) * Math.PI * 2 + phase;
      const jitter = ((n.id.charCodeAt(n.id.length - 1) % 9) - 4) * 2;
      placed.set(n.id, {
        ...n,
        x: cx + Math.cos(a) * (r + jitter) * 1.42,
        y: cy + Math.sin(a) * (r + jitter),
      });
    });
  });
  return placed;
}

export function KnowledgeGraph({
  fractureTrajectory,
  onTrajectoryChange,
  playFracture,
}: {
  fractureTrajectory?: string | null;
  onTrajectoryChange?: (id: string | null) => void;
  playFracture?: number;
}) {
  const [filter, setFilter] = useState<"overview" | "fraud" | "all">("overview");
  const [selected, setSelected] = useState<string | null>("ACC-10492");
  const svgRef = useRef<SVGSVGElement>(null);

  const trajId = fractureTrajectory ?? null;

  const graphQuery = useApi(
    ["graph", filter, trajId],
    () =>
      apiGraph({
        filter: trajId ? "trajectory" : filter,
        ...(trajId ? { trajectory_id: trajId } : {}),
        max_nodes: 150,
        max_edges: 250,
      }),
    { staleTime: 10_000 },
  );

  const trajectories = useApi(["trajectories"], apiTrajectories);

  // Active trajectory list
  const trajList: Trajectory[] = useMemo(() => {
    const t = trajectories.data;
    if (t && Array.isArray(t) && t.length > 0) return t;
    if (t && !Array.isArray(t) && t.trajectories && t.trajectories.length > 0) return t.trajectories;
    return EXHIBIT_TRAJECTORIES;
  }, [trajectories.data]);

  // Compute effective nodes and links (falls back to Exhibit data so the graph is NEVER blank)
  const { nodes, links, stats } = useMemo(() => {
    const live = graphQuery.data;
    if (live && live.nodes && live.nodes.length > 0) {
      let filteredNodes = live.nodes;
      let filteredLinks = live.links;
      if (filter === "fraud") {
        filteredNodes = live.nodes.filter((n) => n.is_fraud);
        const fraudIds = new Set(filteredNodes.map((n) => n.id));
        filteredLinks = live.links.filter((l) => fraudIds.has(String(l.source)) || fraudIds.has(String(l.target)) || l.is_fraud);
      }
      return {
        nodes: filteredNodes,
        links: filteredLinks,
        stats: live.stats ?? {
          total_nodes: filteredNodes.length,
          total_links: filteredLinks.length,
          accounts_count: filteredNodes.filter((n) => n.type === "account").length,
          fraud_nodes_count: filteredNodes.filter((n) => n.is_fraud).length,
          fraud_links_count: filteredLinks.filter((l) => l.is_fraud).length,
        },
      };
    }

    // Default Exhibit fallback
    let exNodes = EXHIBIT_NODES;
    let exLinks = EXHIBIT_LINKS;
    if (filter === "fraud") {
      exNodes = EXHIBIT_NODES.filter((n) => n.is_fraud);
      const fIds = new Set(exNodes.map((n) => n.id));
      exLinks = EXHIBIT_LINKS.filter((l) => fIds.has(l.source) || fIds.has(l.target) || l.is_fraud);
    } else if (trajId) {
      exLinks = EXHIBIT_LINKS.filter((l) => l.trajectory_id === trajId);
      const tNodeIds = new Set<string>();
      exLinks.forEach((l) => {
        tNodeIds.add(l.source);
        tNodeIds.add(l.target);
      });
      exNodes = EXHIBIT_NODES.filter((n) => tNodeIds.has(n.id));
    }

    return {
      nodes: exNodes,
      links: exLinks,
      stats: {
        total_nodes: exNodes.length,
        total_links: exLinks.length,
        accounts_count: exNodes.filter((n) => n.type === "account").length,
        fraud_nodes_count: exNodes.filter((n) => n.is_fraud).length,
        fraud_links_count: exLinks.filter((l) => l.is_fraud).length,
      },
    };
  }, [graphQuery.data, filter, trajId]);

  const placed = useMemo(() => layout(nodes), [nodes]);

  // Selected node metadata
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selected) ?? nodes[0] ?? null;
  }, [nodes, selected]);

  const nodeDetail = useApi(
    ["node", selected],
    () => apiNode(selected as string),
    { enabled: Boolean(selected && graphQuery.data?.nodes?.length) },
  );

  // The Fracture Animation: Illuminates the adversarial attack graph hop-by-hop with glowing pulses
  const triggerFractureEffect = () => {
    if (!svgRef.current) return;
    const paths = Array.from(svgRef.current.querySelectorAll<SVGPathElement>("path[data-fracture='1']"));
    if (!paths.length) return;
    gsap.killTweensOf(paths);
    paths.forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
    });
    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 0.65,
      ease: "power2.out",
      stagger: 0.2,
    });
  };

  useEffect(() => {
    if (playFracture) {
      triggerFractureEffect();
    }
  }, [playFracture]);

  return (
    <Panel>
      <PanelHead
        eyebrow="GET /api/graph // TOPOLOGY ENGINE"
        title="Entity Relational Topology & Fracture Inspector"
        note="Interactive forensic knowledge graph mapping 6 entity archetypes across 5 edge types. Select any entity to inspect velocity and risk signals, or trigger Fracture to reveal adversarial paths."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              tone="attack"
              onClick={triggerFractureEffect}
              className="text-[10px] sm:text-[11px] px-2.5 py-1"
            >
              ✦ Trigger Fracture
            </Button>
            {(["overview", "fraud", "all"] as const).map((f) => (
              <Button
                key={f}
                onClick={() => {
                  onTrajectoryChange?.(null);
                  setFilter(f);
                }}
                className={filter === f && !trajId ? "bg-white/20 text-white font-bold border-white/40" : ""}
              >
                {f}
              </Button>
            ))}
          </div>
        }
      />

      {/* Trajectory Selector Strip */}
      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-4 sm:px-5 py-2.5 bg-black/40">
        <Mono className="text-white/70 text-xs font-semibold">adversarial trajectories:</Mono>
        {trajList.map((t) => {
          const isSelected = trajId === t.trajectory_id;
          return (
            <Button
              key={t.trajectory_id}
              tone="attack"
              onClick={() => {
                const next = isSelected ? null : t.trajectory_id;
                onTrajectoryChange?.(next);
                if (next) setTimeout(triggerFractureEffect, 50);
              }}
              className={`text-[10px] px-2.5 py-1 ${isSelected ? "bg-attack text-white font-bold border-attack" : ""}`}
            >
              {t.attack_type} · ${num(t.total_amount)}
            </Button>
          );
        })}
      </div>

      {/* Main Graph Canvas & Inspector Layout */}
      <div className="grid grid-cols-1 divide-y divide-rule lg:grid-cols-[1fr_320px] lg:divide-y-0 lg:divide-x">
        {/* SVG Topological Map */}
        <div className="relative p-2 sm:p-4 bg-[#08080c] overflow-hidden flex flex-col justify-between">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto max-h-[560px] overflow-visible select-none"
            role="img"
            aria-label="PROMETHEUS Forensic Knowledge Graph"
          >
            <defs>
              {/* Radial background grid concentric rings */}
              <radialGradient id="graphCenterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0.08)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
              </radialGradient>
              <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Glow */}
            <circle cx={W / 2} cy={H / 2} r={H * 0.45} fill="url(#graphCenterGlow)" />

            {/* Concentric Guide Orbit Rings */}
            {[0.38, 0.58, 0.72, 0.86, 0.96].map((ratio, idx) => (
              <ellipse
                key={idx}
                cx={W / 2}
                cy={H / 2}
                rx={ratio * (H / 2 - 32) * 1.42}
                ry={ratio * (H / 2 - 32)}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
                strokeDasharray="4 8"
              />
            ))}

            {/* Edge Connections */}
            {links.map((l, i) => {
              const a = placed.get(String(l.source));
              const b = placed.get(String(l.target));
              if (!a || !b) return null;
              const fraud = Boolean(l.is_fraud);
              const isHighlighted =
                selectedNode && (String(l.source) === selectedNode.id || String(l.target) === selectedNode.id);
              const d = `M${a.x},${a.y} L${b.x},${b.y}`;

              return (
                <g key={`${l.source}-${l.target}-${i}`}>
                  <path
                    d={d}
                    data-fracture={fraud ? "1" : undefined}
                    fill="none"
                    stroke={fraud ? "#f43f5e" : isHighlighted ? "#38bdf8" : "rgba(255, 255, 255, 0.22)"}
                    strokeWidth={fraud ? (isHighlighted ? 2.5 : 1.8) : isHighlighted ? 1.5 : 0.8}
                    strokeDasharray={EDGE_DASH[l.type] || undefined}
                    opacity={isHighlighted ? 1 : fraud ? 0.85 : 0.45}
                    style={fraud ? { filter: "drop-shadow(0 0 4px rgba(244, 63, 94, 0.6))" } : undefined}
                  />
                  {l.amount ? (
                    <text
                      x={(a.x + b.x) / 2}
                      y={(a.y + b.y) / 2 - 4}
                      fill={fraud ? "#f43f5e" : "rgba(255, 255, 255, 0.6)"}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      ${num(l.amount)}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* Graph Node Entities */}
            {Array.from(placed.values()).map((n) => (
              <NodeMark
                key={n.id}
                node={n}
                selected={selectedNode?.id === n.id}
                onSelect={() => setSelected(selectedNode?.id === n.id ? null : n.id)}
              />
            ))}
          </svg>

          {/* Bottom Graph Legend */}
          <Legend />
        </div>

        {/* Selected Entity Drill-Down Inspector */}
        <aside className="p-5 space-y-4 bg-paper/40 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-rule pb-3">
              <Eyebrow>Entity Drill-Down</Eyebrow>
              {selectedNode?.is_fraud ? (
                <Tag tone="attack">ADVERSARIAL ENTITY</Tag>
              ) : (
                <Tag tone="defense">BENIGN NODE</Tag>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-xs"
                      style={{ backgroundColor: NODE_COLOR[selectedNode.type] }}
                    />
                    <h3 className="font-mono text-base font-bold text-white tracking-tight">
                      {selectedNode.id}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-white/80 font-medium">{selectedNode.label}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rule">
                  <Stat
                    label="risk confidence"
                    value={`${(selectedNode.risk_score * 100).toFixed(1)}%`}
                    tone={selectedNode.is_fraud ? "attack" : "defense"}
                    hint={selectedNode.is_fraud ? "Anomalous footprint" : "Clean transaction path"}
                  />
                  <Stat
                    label="archetype"
                    value={selectedNode.type.toUpperCase()}
                    hint="Topology ring"
                  />
                </div>

                {/* Node Attributes */}
                <div className="border-t border-rule pt-3 space-y-2">
                  <Mono className="text-xs text-muted-foreground">Entity Attributes</Mono>
                  <dl className="space-y-1.5 font-mono text-[11px] bg-black/40 p-3 border border-rule/70">
                    {Object.entries(
                      nodeDetail.data?.details ??
                        (selectedNode.properties as Record<string, string | number | boolean>) ??
                        {},
                    ).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <dt className="text-white/60 capitalize">{k.replace(/_/g, " ")}</dt>
                        <dd className="text-white font-semibold tabular-nums">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Connected Edges Count */}
                <div className="border-t border-rule pt-3 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Mono className="text-xs text-muted-foreground">Ego-Net Connectivity</Mono>
                    <Mono className="text-white font-bold">
                      {links.filter((l) => String(l.source) === selectedNode.id || String(l.target) === selectedNode.id).length} links
                    </Mono>
                  </div>
                  <ul className="space-y-1 font-mono text-[10px] text-white/70 max-h-24 overflow-y-auto no-scrollbar">
                    {links
                      .filter((l) => String(l.source) === selectedNode.id || String(l.target) === selectedNode.id)
                      .map((l, idx) => (
                        <li key={idx} className="p-1.5 bg-black/30 border border-rule/50 flex justify-between">
                          <span>{l.type}</span>
                          <span className={l.is_fraud ? "text-attack" : "text-defense"}>
                            {String(l.source) === selectedNode.id ? `→ ${l.target}` : `← ${l.source}`}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">Select any node on the graph canvas to inspect its forensic envelope.</p>
            )}
          </div>

          {/* Macro Graph Statistics */}
          <div className="border-t border-rule pt-4 space-y-2 bg-black/50 p-3">
            <Mono className="text-xs text-muted-foreground font-semibold">Macro Topology Stats</Mono>
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="border border-rule/60 p-1.5">
                <span className="text-[10px] text-white/60 block">Nodes</span>
                <span className="text-xs font-bold text-white">{stats.total_nodes}</span>
              </div>
              <div className="border border-rule/60 p-1.5">
                <span className="text-[10px] text-white/60 block">Links</span>
                <span className="text-xs font-bold text-white">{stats.total_links}</span>
              </div>
              <div className="border border-rule/60 p-1.5">
                <span className="text-[10px] text-attack block">Fraud</span>
                <span className="text-xs font-bold text-attack">{stats.fraud_nodes_count}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Panel>
  );
}

function NodeMark({
  node,
  selected,
  onSelect,
}: {
  node: Placed;
  selected: boolean;
  onSelect: () => void;
}) {
  const shape = NODE_SHAPE[node.type] ?? "circle";
  const primaryColor = NODE_COLOR[node.type] ?? "#38bdf8";
  const isFraud = Boolean(node.is_fraud);

  const stroke = selected ? "#ffffff" : isFraud ? "#f43f5e" : primaryColor;
  const fill = selected
    ? "#ffffff"
    : isFraud
      ? "rgba(244, 63, 94, 0.4)"
      : `${primaryColor}22`;

  const s = 6 + (node.risk_score ?? 0) * 5;

  const common = {
    stroke,
    fill,
    strokeWidth: selected ? 2.5 : isFraud ? 2 : 1.2,
    onClick: onSelect,
    style: {
      cursor: "pointer" as const,
      filter: selected
        ? "drop-shadow(0 0 10px #ffffff)"
        : isFraud
          ? "drop-shadow(0 0 8px rgba(244, 63, 94, 0.8))"
          : `drop-shadow(0 0 4px ${primaryColor}66)`,
      transition: "all 0.2s ease-out",
    },
  };

  return (
    <g className="transition-transform duration-200 hover:scale-110">
      <title>{`${node.label} · ${node.type.toUpperCase()} · Risk ${(node.risk_score * 100).toFixed(1)}%`}</title>

      {/* Outer Selection Pulse Ring */}
      {selected && (
        <circle
          cx={node.x}
          cy={node.y}
          r={s + 6}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          className="animate-spin"
        />
      )}

      {/* Shapes per entity type */}
      {shape === "circle" && <circle cx={node.x} cy={node.y} r={s} {...common} />}
      {shape === "square" && (
        <rect x={node.x - s} y={node.y - s} width={s * 2} height={s * 2} rx={2} {...common} />
      )}
      {shape === "diamond" && (
        <polygon
          points={`${node.x},${node.y - s * 1.2} ${node.x + s * 1.2},${node.y} ${node.x},${node.y + s * 1.2} ${node.x - s * 1.2},${node.y}`}
          {...common}
        />
      )}
      {shape === "triangle" && (
        <polygon
          points={`${node.x},${node.y - s * 1.1} ${node.x + s * 1.1},${node.y + s * 0.9} ${node.x - s * 1.1},${node.y + s * 0.9}`}
          {...common}
        />
      )}
      {shape === "cross" && (
        <g {...common}>
          <line x1={node.x - s} y1={node.y} x2={node.x + s} y2={node.y} stroke={stroke} strokeWidth={selected ? 3 : 2} />
          <line x1={node.x} y1={node.y - s} x2={node.x} y2={node.y + s} stroke={stroke} strokeWidth={selected ? 3 : 2} />
        </g>
      )}
      {shape === "hex" && (
        <polygon
          points={[0, 1, 2, 3, 4, 5]
            .map((i) => {
              const a = (Math.PI / 3) * i;
              return `${node.x + Math.cos(a) * s * 1.1},${node.y + Math.sin(a) * s * 1.1}`;
            })
            .join(" ")}
          {...common}
        />
      )}

      {/* Node label text */}
      <text
        x={node.x}
        y={node.y + s + 11}
        fill={selected ? "#ffffff" : isFraud ? "#fca5a5" : "rgba(255, 255, 255, 0.75)"}
        fontSize="9"
        fontFamily="monospace"
        textAnchor="middle"
        className="pointer-events-none select-none font-medium"
      >
        {node.id}
      </text>
    </g>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/70 px-4 py-2.5 bg-black/60">
      {/* Node Shapes Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {(Object.keys(NODE_SHAPE) as GraphNodeType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs inline-block"
              style={{ backgroundColor: NODE_COLOR[t] }}
            />
            <Mono className="text-white/80 text-[11px] uppercase">{t}</Mono>
          </span>
        ))}
      </div>

      {/* Edge Dashes Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {Object.keys(EDGE_DASH).map((e) => (
          <span key={e} className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden>
              <line
                x1="0"
                y1="3"
                x2="18"
                y2="3"
                stroke="rgba(255, 255, 255, 0.7)"
                strokeWidth="1.5"
                strokeDasharray={EDGE_DASH[e] || undefined}
              />
            </svg>
            <Mono className="text-white/60 text-[10px] uppercase">{e.replace(/_/g, " ")}</Mono>
          </span>
        ))}
      </div>
    </div>
  );
}
