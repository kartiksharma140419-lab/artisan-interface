import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  apiGraph,
  apiNode,
  apiTrajectories,
  type GraphLink,
  type GraphNode,
  type GraphNodeType,
  type Trajectory,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { ArtifactState, Button, Mono, PanelHead, Panel, Tag, num } from "./Panel";

const W = 1000;
const H = 620;

/** Deterministic radial-by-type layout — flat, crisp, no physics jitter. */
const RINGS: Record<GraphNodeType, number> = {
  account: 0.42,
  merchant: 0.78,
  customer: 0.6,
  device: 0.92,
  ip: 1,
  wallet: 0.88,
};

const NODE_SHAPE: Record<GraphNodeType, "circle" | "square" | "diamond" | "triangle" | "cross" | "hex"> = {
  account: "circle",
  customer: "square",
  merchant: "diamond",
  device: "triangle",
  ip: "cross",
  wallet: "hex",
};

const EDGE_DASH: Record<string, string> = {
  TRANSACTION: "",
  OWNED_BY: "3 3",
  USES_DEVICE: "1 3",
  USES_IP: "5 3",
  HAS_WALLET: "2 2",
};

type Placed = GraphNode & { x: number; y: number };

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
    const r = (RINGS[type] ?? 0.7) * (H / 2 - 40);
    list.forEach((n, i) => {
      const phase = (type.charCodeAt(0) % 7) * 0.35;
      const a = (i / Math.max(1, list.length)) * Math.PI * 2 + phase;
      const jitter = ((n.id.charCodeAt(n.id.length - 1) % 9) - 4) * 3;
      placed.set(n.id, {
        ...n,
        x: cx + Math.cos(a) * (r + jitter) * 1.5,
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
  const [filter, setFilter] = useState<"overview" | "fraud" | "trajectory" | "all">("overview");
  const [selected, setSelected] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const trajId = fractureTrajectory ?? null;
  const effFilter = trajId ? "trajectory" : filter;

  const graph = useApi(
    ["graph", effFilter, trajId],
    () =>
      apiGraph({
        filter: effFilter,
        ...(trajId ? { trajectory_id: trajId } : {}),
        max_nodes: 150,
        max_edges: 250,
      }),
    { staleTime: 10_000 },
  );

  const trajectories = useApi(["trajectories"], apiTrajectories);
  const trajList: Trajectory[] = useMemo(() => {
    const t = trajectories.data;
    if (!t) return [];
    return Array.isArray(t) ? t : (t.trajectories ?? []);
  }, [trajectories.data]);

  const detail = useApi(["node", selected], () => apiNode(selected as string), {
    enabled: !!selected,
  });

  const placed = useMemo(() => layout(graph.data?.nodes ?? []), [graph.data]);

  // The Fracture: trace fraud links hop by hop along the real trajectory order.
  useEffect(() => {
    if (!playFracture || !svgRef.current) return;
    const paths = Array.from(
      svgRef.current.querySelectorAll<SVGPathElement>("path[data-fracture='1']"),
    );
    if (!paths.length) return;
    gsap.killTweensOf(paths);
    paths.forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
    });
    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 0.55,
      ease: "power2.out",
      stagger: 0.22,
    });
  }, [playFracture, graph.data]);

  const links = graph.data?.links ?? [];

  return (
    <Panel>
      <PanelHead
        eyebrow="GET /api/graph"
        title="Knowledge graph"
        note="Six entity types, five edge types, drawn exactly as the backend returns them. Click any node for its drill-down."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {(["overview", "fraud", "all"] as const).map((f) => (
              <Button
                key={f}
                onClick={() => {
                  onTrajectoryChange?.(null);
                  setFilter(f);
                }}
                className={effFilter === f ? "bg-accent" : ""}
              >
                {f}
              </Button>
            ))}
          </div>
        }
      />

      {trajList.length ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-3">
          <Mono className="text-muted-foreground">trajectory</Mono>
          {trajList.slice(0, 12).map((t) => (
            <Button
              key={t.trajectory_id}
              tone="attack"
              onClick={() => onTrajectoryChange?.(trajId === t.trajectory_id ? null : t.trajectory_id)}
              className={trajId === t.trajectory_id ? "bg-attack text-ink" : ""}
            >
              {t.attack_type} · {t.n_fraud_txs}/{t.n_txs}
            </Button>
          ))}
        </div>
      ) : null}

      <ArtifactState isLoading={graph.isLoading} error={graph.error} data={graph.data}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">
          <div className="border-b border-rule lg:border-b-0 lg:border-r">
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Knowledge graph">
              {links.map((l, i) => {
                const a = placed.get(String(l.source));
                const b = placed.get(String(l.target));
                if (!a || !b) return null;
                const fraud = !!l.is_fraud;
                const d = `M${a.x},${a.y} L${b.x},${b.y}`;
                return (
                  <g key={`${l.source}-${l.target}-${i}`}>
                    <path
                      d={d}
                      data-fracture={fraud ? "1" : undefined}
                      fill="none"
                      stroke={fraud ? "var(--color-attack)" : "var(--color-rule)"}
                      strokeWidth={fraud ? 1.4 : 0.8}
                      strokeDasharray={EDGE_DASH[l.type] || undefined}
                      opacity={fraud ? 1 : 0.7}
                    />
                  </g>
                );
              })}
              {Array.from(placed.values()).map((n) => (
                <NodeMark
                  key={n.id}
                  node={n}
                  selected={selected === n.id}
                  onSelect={() => setSelected(n.id === selected ? null : n.id)}
                />
              ))}
            </svg>
            <Legend />
          </div>

          <aside className="px-5 py-4">
            <Mono className="text-muted-foreground">stats</Mono>
            <dl className="mt-2 space-y-1 font-mono text-xs">
              {Object.entries(graph.data?.stats ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular-nums">{String(v)}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 border-t border-rule pt-4">
              <Mono className="text-muted-foreground">node inspector</Mono>
              {!selected ? (
                <p className="mt-2 text-sm text-muted-foreground">Select a node.</p>
              ) : detail.isLoading ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">reading…</p>
              ) : detail.error ? (
                <p className="mt-2 font-mono text-xs text-attack">{detail.error.message}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="font-mono text-sm">{selected}</p>
                  <Tag>{detail.data?.type}</Tag>
                  {detail.data?.risk_signals?.recent_peak_score !== undefined ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      recent peak score{" "}
                      <span className="text-attack">
                        {num(detail.data.risk_signals.recent_peak_score)}
                      </span>
                    </p>
                  ) : null}
                  <dl className="space-y-1 font-mono text-[11px]">
                    {Object.entries(detail.data?.details ?? {})
                      .slice(0, 12)
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="tabular-nums">{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                  {detail.data?.recent_transactions?.length ? (
                    <div className="pt-2">
                      <Mono className="text-muted-foreground">recent transactions</Mono>
                      <ul className="mt-1 space-y-1 font-mono text-[11px]">
                        {detail.data.recent_transactions.slice(0, 6).map((t, i) => (
                          <li key={i} className="text-muted-foreground">
                            {Object.values(t).slice(0, 3).map(String).join(" · ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </aside>
        </div>
      </ArtifactState>
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
  const stroke = node.is_fraud ? "var(--color-attack)" : "var(--color-muted-foreground)";
  const fill = selected
    ? "var(--color-ink)"
    : node.is_fraud
      ? "var(--color-attack-dim)"
      : "var(--color-paper)";
  const s = 4 + (node.risk_score ?? 0) * 4;
  const common = {
    stroke,
    fill,
    strokeWidth: 1,
    onClick: onSelect,
    style: { cursor: "pointer" as const },
  };
  return (
    <g>
      <title>{`${node.label} · ${node.type} · risk ${num(node.risk_score)}`}</title>
      {shape === "circle" && <circle cx={node.x} cy={node.y} r={s} {...common} />}
      {shape === "square" && (
        <rect x={node.x - s} y={node.y - s} width={s * 2} height={s * 2} {...common} />
      )}
      {shape === "diamond" && (
        <polygon
          points={`${node.x},${node.y - s} ${node.x + s},${node.y} ${node.x},${node.y + s} ${node.x - s},${node.y}`}
          {...common}
        />
      )}
      {shape === "triangle" && (
        <polygon
          points={`${node.x},${node.y - s} ${node.x + s},${node.y + s} ${node.x - s},${node.y + s}`}
          {...common}
        />
      )}
      {shape === "cross" && (
        <g {...common}>
          <line x1={node.x - s} y1={node.y} x2={node.x + s} y2={node.y} stroke={stroke} />
          <line x1={node.x} y1={node.y - s} x2={node.x} y2={node.y + s} stroke={stroke} />
        </g>
      )}
      {shape === "hex" && (
        <polygon
          points={[0, 1, 2, 3, 4, 5]
            .map((i) => {
              const a = (Math.PI / 3) * i;
              return `${node.x + Math.cos(a) * s},${node.y + Math.sin(a) * s}`;
            })
            .join(" ")}
          {...common}
        />
      )}
      {selected ? (
        <text
          x={node.x + s + 4}
          y={node.y + 3}
          fill="var(--color-ink)"
          className="font-mono"
          fontSize="9"
        >
          {node.label}
        </text>
      ) : null}
    </g>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-rule px-5 py-3">
      {(Object.keys(NODE_SHAPE) as GraphNodeType[]).map((t) => (
        <span key={t} className="flex items-center gap-2">
          <svg width="12" height="12" aria-hidden>
            <NodeMark
              node={{ id: t, type: t, label: t, risk_score: 0, is_fraud: false, x: 6, y: 6 }}
              selected={false}
              onSelect={() => {}}
            />
          </svg>
          <Mono className="text-muted-foreground">{t}</Mono>
        </span>
      ))}
      {Object.keys(EDGE_DASH).map((e) => (
        <span key={e} className="flex items-center gap-2">
          <svg width="20" height="8" aria-hidden>
            <line
              x1="0"
              y1="4"
              x2="20"
              y2="4"
              stroke="var(--color-muted-foreground)"
              strokeDasharray={EDGE_DASH[e] || undefined}
            />
          </svg>
          <Mono className="text-muted-foreground">{e}</Mono>
        </span>
      ))}
    </div>
  );
}
