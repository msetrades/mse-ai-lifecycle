import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultGate, deploymentEligible, monitorAlerts, scoreEvaluation, validateImport, type EvalCase } from "../src/lib/lifecycle.ts";

const passingCases: EvalCase[] = Array.from({ length: 30 }, (_, index) => ({ id: String(index), input: "prompt", expected: JSON.stringify({ ok: true }), actual: JSON.stringify({ ok: true }), latencyMs: 500, humanVerdict: "pass", safetyFlags: [] }));

test("evaluation gate passes only when exact-match, JSON, latency, coverage and reviews meet policy", () => {
  const result = scoreEvaluation({ cases: passingCases, criteria: defaultGate });
  assert.equal(result.passed, true);
  assert.equal(result.exactMatchPct, 100);
  assert.equal(result.jsonValidPct, 100);
  assert.equal(result.averageLatencyMs, 500);
  const failed = scoreEvaluation({ cases: passingCases.slice(0, 5).map((item, index) => ({ ...item, id: String(index), humanVerdict: "pending" as const, actual: "not json" })), criteria: defaultGate });
  assert.equal(failed.passed, false);
  assert.equal(failed.checks.filter((check) => !check.passed).length, 4);
});

test("safety flags and human failures block a release candidate", () => {
  const cases = passingCases.map((item, index) => index === 0 ? { ...item, safetyFlags: ["PII exposure"] } : item);
  const result = scoreEvaluation({ cases, criteria: defaultGate });
  assert.equal(result.passed, false);
  assert.equal(result.flaggedCases, 1);
});

test("monitor thresholds return one alert per breached signal", () => {
  const alerts = monitorAlerts({ id: "m", modelId: "x", label: "week", successRatePct: 90, p95LatencyMs: 3000, refusalRatePct: 12, driftIndex: 0.31, createdAt: "2026-01-01" }, { minSuccessRatePct: 97, maxP95LatencyMs: 2500, maxRefusalRatePct: 8, maxDriftIndex: 0.2 });
  assert.equal(alerts.length, 4);
});

test("deployment requires a passing gate and a non-retired model", () => {
  const result = scoreEvaluation({ cases: passingCases, criteria: defaultGate });
  assert.equal(deploymentEligible({ id: "m", name: "Support assistant", provider: "local", modelRef: "x", version: "1", owner: "team", useCase: "support", risk: "medium", stage: "staging", createdAt: "2026-01-01" }, result), true);
  assert.equal(deploymentEligible({ id: "m", name: "Support assistant", provider: "local", modelRef: "x", version: "1", owner: "team", useCase: "support", risk: "medium", stage: "retired", createdAt: "2026-01-01" }, result), false);
});

test("archive import rejects unknown versions", () => {
  assert.throws(() => validateImport({ version: 5, models: [], evalRuns: [], monitors: [], thresholds: {} }), /Unsupported ModelOps archive/);
});
