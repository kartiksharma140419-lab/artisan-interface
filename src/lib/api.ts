/**
 * PROMETHEUS backend contract.
 * Every shape here is transcribed from the verified endpoint contract.
 * Base URL and timeouts are centralized in ./api-config and routed via ./api-client.
 */

import { API_BASE, TIMEOUTS, TIMEOUT } from "./api-config";
import { ApiError, apiFetch, apiHealthz, get, post } from "./api-client";

export { API_BASE, TIMEOUTS, TIMEOUT, ApiError, apiFetch, apiHealthz, get, post };

/* ---------- shared ---------- */

export type Artifact<T> = (T & { present?: true }) | { present: false; note?: string };

export function isMissing<T>(a: Artifact<T> | undefined): a is { present: false; note?: string } {
  return !!a && (a as { present?: boolean }).present === false;
}

/* ---------- setup / status ---------- */

export interface InitResponse {
  status: string;
  transactions: number;
  features: number;
  fraud_ratio: number;
  graph_nodes: number;
  sample_tx_id: string;
}

export interface StatusResponse {
  ready: boolean;
  events?: number;
  report?: unknown;
}

export const apiInit = (body?: { seed?: number; num_accounts?: number; num_steps?: number }) =>
  post<InitResponse>("/api/init", body ?? {}, TIMEOUTS.init);

export const apiStatus = () => get<StatusResponse>("/api/status", TIMEOUTS.health);

/* ---------- ambient stream ---------- */

export interface StepEvent {
  type: "step";
  step: number;
  steps: number;
  normal: number;
  fraud: number;
  peak_score: number;
  caught: number;
  attack_type: string | null;
  total_volume: number;
  sample_tx_id: string;
}

export const apiInject = (attack_type: string) =>
  post<unknown>("/api/stream/inject", { attack_type }, TIMEOUTS.reads);

/* ---------- demo run ---------- */

export interface AttackResult {
  instances: boolean[];
  caught: number;
  total: number;
  recall: number;
  score: number;
}

export interface Beat {
  recall: number;
  results?: Record<string, AttackResult>;
  blind_spot?: string;
}

export interface DemoRunResponse {
  status: string;
  beat1: Beat;
  beat2: Beat;
  beat3: Beat;
  report: {
    blind_spot: string;
    recall_before: number;
    recall_after: number;
    improved: boolean;
    generated_fixes: number;
    retrain_rounds_used: number;
    max_retrain_rounds: number;
    generalization_recall_unseen_generator: number;
    evidence_ids: string[];
  };
}

export const apiDemoRun = () => post<DemoRunResponse>("/api/demo/run", {}, TIMEOUTS.demo_run);

/* ---------- knowledge graph ---------- */

export type GraphNodeType = "account" | "customer" | "merchant" | "device" | "ip" | "wallet";
export type GraphEdgeType =
  | "TRANSACTION"
  | "OWNED_BY"
  | "USES_DEVICE"
  | "USES_IP"
  | "HAS_WALLET";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  risk_score: number;
  is_fraud: boolean;
  properties?: Record<string, number | string | boolean | null>;
}

export interface GraphLink {
  source: string;
  target: string;
  type: GraphEdgeType;
  tx_id?: string;
  amount?: number;
  is_fraud?: boolean;
  attack_id?: string | null;
  trajectory_id?: string | null;
  label?: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    total_nodes: number;
    total_links: number;
    accounts_count: number;
    fraud_nodes_count: number;
    fraud_links_count: number;
  };
  filter: { type: string; trajectory_id: string | null; node_id: string | null };
}

export interface Trajectory {
  trajectory_id: string;
  attack_type: string;
  n_actions: number;
  n_txs: number;
  n_fraud_txs: number;
  total_amount: number;
  min_step: number;
  max_step: number;
}

export const apiGraph = (params: {
  filter?: "overview" | "fraud" | "trajectory" | "ego" | "all" | undefined;
  trajectory_id?: string | undefined;
  node_id?: string | undefined;
  max_nodes?: number | undefined;
  max_edges?: number | undefined;
}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && q.set(k, String(v)));
  return get<GraphResponse>(`/api/graph?${q.toString()}`, TIMEOUTS.reads);
};

export const apiTrajectories = () =>
  get<{ trajectories: Trajectory[] } | Trajectory[]>("/api/graph/trajectories", TIMEOUTS.reads);

export interface NodeDetail {
  id?: string;
  type: string;
  details: Record<string, number | string | boolean | null>;
  recent_transactions?: Array<Record<string, number | string | boolean | null>>;
  risk_signals?: { recent_peak_score?: number };
}

export const apiNode = (id: string) =>
  get<NodeDetail>(`/api/graph/node/${encodeURIComponent(id)}`, TIMEOUTS.reads);

/* ---------- investigator ---------- */

export interface CaseFile {
  schema: string;
  case_id: string;
  n_rows: number;
  evidence: Record<string, { kind: string; summary: string } & Record<string, unknown>>;
  missing_agents: string[];
  sender_accounts: string[];
  narrative_mode: "llm" | "fallback" | "blocked";
  narrative: string;
  structured: {
    score: number;
    band: string;
    p_fraud: number;
    top_reason_column: string;
    counterfactual: string;
    reason_evidence_ids: Record<string, string>;
  };
  delegate_log: Array<Record<string, unknown>>;
  delegates_used: number;
  delegates_left: number;
  watch_hit_count: number;
  manifest?: Record<string, unknown>;
  closed_at?: number;
}

export const apiInvestigate = (case_id: string, tx_ids: string[]) =>
  post<CaseFile>("/api/investigate", { case_id, tx_ids }, TIMEOUTS.compute);

/* ---------- T9 / PCAT ---------- */

export interface CheckoutRequest {
  merchant_id: string;
  amount: number;
  agent_id: string;
  caller_identity: string | null;
  defense: "pcat" | "naive";
  rc_class: "RC-1" | "RC-2" | "RC-3" | "RC-4" | "RC-5" | null;
  n_authorizations: number;
  leak_credential: boolean;
  attacker_controlled_payout: string | null;
}

export interface CheckoutResponse {
  status: string;
  defense: string;
  decision: {
    allowed: boolean;
    reason: string;
    p_blocks?: unknown;
    payments?: unknown;
    payout?: unknown;
    credential_leaked?: boolean;
  };
  judged_attack_success: boolean;
  defense_note?: string;
}

export const apiCheckout = (body: CheckoutRequest) =>
  post<CheckoutResponse>("/api/agentic/checkout", body, TIMEOUTS.compute);

export interface AgenticStatus {
  agents?: unknown;
  credentials?: unknown;
  merchants?: unknown;
  certified_payouts?: unknown;
  leaked_credentials?: unknown;
  session_log_lines?: number;
  world_transactions?: number;
  events?: Array<Record<string, unknown>>;
}

export const apiAgenticStatus = () => get<AgenticStatus>("/api/agentic/status", TIMEOUTS.reads);

export interface ProtocolArtifact {
  per_rc?: Record<string, Record<string, unknown>>;
  benign_fp_probe?: Record<string, unknown>;
  holdout_fingerprint?: string;
  citations?: string[];
  note?: string;
}

export const apiProtocol = () => get<Artifact<ProtocolArtifact>>("/api/protocol", TIMEOUTS.reads);

/* ---------- proof layer ---------- */

export interface OodArtifact {
  rates: Record<string, Record<string, number>> | number[][];
  types: string[];
  mechanisms: string[];
  note?: string;
}
export const apiOod = () => get<Artifact<OodArtifact>>("/api/ood", TIMEOUTS.reads);

export interface RlStretch {
  episodes_run: number;
  rl_best_mean_evasion: number;
  heuristic_baseline: number;
  shipped: boolean;
  honest_negative: boolean;
  pre_registered_criterion: string | Record<string, unknown>;
  note?: string;
}
export const apiRlStretch = () => get<Artifact<RlStretch>>("/api/rl-stretch", TIMEOUTS.reads);

export interface Attribution {
  exhibit?: {
    matrix?: Record<string, Record<string, number>> | number[][];
    mechanisms?: string[];
    sources?: string[];
    rates?: Record<string, Record<string, number>>;
  };
  live?: {
    matrix?: Record<string, Record<string, number>> | number[][];
    mechanisms?: string[];
    sources?: string[];
    rates?: Record<string, Record<string, number>>;
  };
  sources?: string[];
  mechanisms?: string[];
  matrix?: Record<string, Record<string, number>> | number[][];
  note?: string;
}
export const apiAttribution = () => get<Artifact<Attribution>>("/api/attribution", TIMEOUTS.reads);

export interface StructuredWeights {
  fitted?: Record<string, number>;
  baseline?: Record<string, number>;
  weights?: Record<string, number>;
  formula?: string;
  note?: string;
  [k: string]: unknown;
}
export const apiStructuredWeights = () =>
  get<Artifact<StructuredWeights>>("/api/structured-weights", TIMEOUTS.reads);

export interface TimelineEntry {
  [k: string]: unknown;
}
export interface TimelineArtifact {
  cycles?: TimelineEntry[];
  entries?: TimelineEntry[];
  timeline?: TimelineEntry[];
  note?: string;
}
export const apiTimeline = () => get<Artifact<TimelineArtifact>>("/api/timeline", TIMEOUTS.reads);

/* ---------- combo ---------- */

export interface ComboResponse {
  status: string;
  trajectory_id: string;
  n_stages: number;
  stages_caught: number;
  fully_detected: boolean;
  stages: Array<{
    stage: number;
    n_txs: number;
    caught: boolean;
    peak_score: number;
    mean_score: number;
    tx_ids: string[];
  }>;
  stage_names: string[];
}

export const apiCombo = () => post<ComboResponse>("/api/combo", {}, TIMEOUTS.compute);

/* ---------- scoring ---------- */

export interface SampleTxs {
  benign?: string[] | Array<Record<string, unknown>>;
  fraud?: string[] | Array<Record<string, unknown>>;
  samples?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}
export const apiSampleTxs = () => get<SampleTxs>("/api/sample-txs", TIMEOUTS.reads);

export interface ScoreResponse {
  tx_id: string;
  signals?: Record<string, number>;
  signal_columns?: string[];
  structured_score?: number;
  band?: string;
  top_reason_column?: string;
  counterfactual?: string;
  weights_source?: string;
  weights_formula?: string;
  weights_vs_baseline?: unknown;
  [k: string]: unknown;
}
export const apiScore = (tx_id: string) =>
  get<ScoreResponse>(`/api/score?tx_id=${encodeURIComponent(tx_id)}`, TIMEOUTS.reads);

export const SIGNAL_KEYS = [
  "xgb",
  "gnn",
  "meta",
  "manifold",
  "spectral_cycle",
  "spectral_star",
] as const;
export type SignalKey = (typeof SIGNAL_KEYS)[number];
