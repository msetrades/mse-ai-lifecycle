export type RiskLevel = "low" | "medium" | "high" | "critical";
export type LifecycleStage = "development" | "evaluation" | "staging" | "production" | "retired";
export type ModelVersion = {
  id: string; name: string; provider: string; modelRef: string; version: string; owner: string;
  useCase: string; risk: RiskLevel; stage: LifecycleStage; createdAt: string;
};
export type EvalCase = {
  id: string; input: string; expected: string; actual: string; latencyMs: number;
  humanVerdict: "pass" | "fail" | "pending"; safetyFlags: string[];
};
export type EvalRun = {
  id: string; modelId: string; name: string; datasetVersion: string; createdAt: string;
  criteria: GateCriteria; cases: EvalCase[];
};
export type GateCriteria = { minExactMatchPct: number; minJsonValidPct: number; maxLatencyMs: number; minCases: number; requireHumanReview: boolean };
export type GateResult = {
  passed: boolean; exactMatchPct: number; jsonValidPct: number; averageLatencyMs: number;
  reviewedCases: number; totalCases: number; flaggedCases: number; checks: { label: string; passed: boolean; actual: string; target: string }[];
};
export type MonitorWindow = { id: string; modelId: string; label: string; successRatePct: number; p95LatencyMs: number; refusalRatePct: number; driftIndex: number; createdAt: string };
export type MonitorThresholds = { minSuccessRatePct: number; maxP95LatencyMs: number; maxRefusalRatePct: number; maxDriftIndex: number };

export const defaultGate: GateCriteria = { minExactMatchPct: 90, minJsonValidPct: 98, maxLatencyMs: 1800, minCases: 30, requireHumanReview: true };
export const defaultMonitor: MonitorThresholds = { minSuccessRatePct: 97, maxP95LatencyMs: 2500, maxRefusalRatePct: 8, maxDriftIndex: 0.2 };

const normalized = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
export function scoreEvaluation(run: Pick<EvalRun, "cases" | "criteria">): GateResult {
  const total = run.cases.length;
  const exact = total ? run.cases.filter((item) => normalized(item.actual) === normalized(item.expected)).length / total * 100 : 0;
  const json = total ? run.cases.filter((item) => { try { JSON.parse(item.actual); return true; } catch { return false; } }).length / total * 100 : 0;
  const averageLatency = total ? run.cases.reduce((sum, item) => sum + item.latencyMs, 0) / total : 0;
  const reviewed = run.cases.filter((item) => item.humanVerdict !== "pending").length;
  const flagged = run.cases.filter((item) => item.safetyFlags.length > 0 || item.humanVerdict === "fail").length;
  const checks = [
    { label: "Minimum evaluation cases", passed: total >= run.criteria.minCases, actual: String(total), target: String(run.criteria.minCases) },
    { label: "Exact match", passed: exact >= run.criteria.minExactMatchPct, actual: `${exact.toFixed(1)}%`, target: `${run.criteria.minExactMatchPct}%` },
    { label: "Valid JSON output", passed: json >= run.criteria.minJsonValidPct, actual: `${json.toFixed(1)}%`, target: `${run.criteria.minJsonValidPct}%` },
    { label: "Average latency", passed: averageLatency <= run.criteria.maxLatencyMs, actual: `${averageLatency.toFixed(0)} ms`, target: `≤ ${run.criteria.maxLatencyMs} ms` },
    { label: "Human review", passed: !run.criteria.requireHumanReview || reviewed === total, actual: `${reviewed}/${total} reviewed`, target: run.criteria.requireHumanReview ? "all cases" : "optional" },
    { label: "Safety failures", passed: flagged === 0, actual: String(flagged), target: "0" },
  ];
  return { passed: checks.every((check) => check.passed), exactMatchPct: exact, jsonValidPct: json, averageLatencyMs: averageLatency, reviewedCases: reviewed, totalCases: total, flaggedCases: flagged, checks };
}

export function monitorAlerts(window: MonitorWindow, thresholds: MonitorThresholds) {
  return [
    ...(window.successRatePct < thresholds.minSuccessRatePct ? [`Success rate ${window.successRatePct}% is below ${thresholds.minSuccessRatePct}%.`] : []),
    ...(window.p95LatencyMs > thresholds.maxP95LatencyMs ? [`P95 latency ${window.p95LatencyMs} ms exceeds ${thresholds.maxP95LatencyMs} ms.`] : []),
    ...(window.refusalRatePct > thresholds.maxRefusalRatePct ? [`Refusal rate ${window.refusalRatePct}% exceeds ${thresholds.maxRefusalRatePct}%.`] : []),
    ...(window.driftIndex > thresholds.maxDriftIndex ? [`Drift index ${window.driftIndex.toFixed(2)} exceeds ${thresholds.maxDriftIndex.toFixed(2)}.`] : []),
  ];
}

export function deploymentEligible(model: ModelVersion, result: GateResult | null) {
  return Boolean(model && result?.passed && model.stage !== "retired");
}

export function validateImport(value: unknown): { version: 1; models: ModelVersion[]; evalRuns: EvalRun[]; monitors: MonitorWindow[]; thresholds: MonitorThresholds } {
  if (!value || typeof value !== "object") throw new Error("Expected a ModelOps JSON archive.");
  const item = value as Partial<{ version: number; models: ModelVersion[]; evalRuns: EvalRun[]; monitors: MonitorWindow[]; thresholds: MonitorThresholds }>;
  if (item.version !== 1 || !Array.isArray(item.models) || !Array.isArray(item.evalRuns) || !Array.isArray(item.monitors) || !item.thresholds) throw new Error("Unsupported ModelOps archive version or structure.");
  if (item.models.some((model) => typeof model.id !== "string" || typeof model.name !== "string") || item.evalRuns.some((run) => typeof run.id !== "string" || !Array.isArray(run.cases))) throw new Error("The archive contains invalid model or evaluation records.");
  return item as { version: 1; models: ModelVersion[]; evalRuns: EvalRun[]; monitors: MonitorWindow[]; thresholds: MonitorThresholds };
}
