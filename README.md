# MSE ModelOps

ModelOps is a local-first control plane for AI product lifecycle evidence. It keeps a versioned inventory, deterministic evaluation records, explicit release criteria and aggregate production-monitoring observations together without pretending to call a model provider or ingest production telemetry.

## Workflows

- Register model versions with immutable references, owner, intended use and risk class.
- Score supplied test cases for normalized exact match, syntactic JSON validity, mean latency, human review coverage and safety flags.
- Configure release-gate thresholds; promotion to production is blocked until every gate passes.
- Record aggregate success, P95 latency, refusal and drift signals; raise alerts against configurable limits.
- Export and import a versioned JSON archive; records are stored in this browser only.

## Evaluation interpretation

Exact match normalizes case and whitespace; it does not measure semantic correctness. JSON validity checks syntax only, not schema conformance. Scores are calculated locally from user-supplied expected/actual outputs. No inference endpoint, provider API, red-team corpus, safety classifier or telemetry agent is connected. Add your own evaluation methodology, test population definition, safety review and monitoring pipeline before using the workspace as a production governance process.

## Data and security boundary

The app calls no model provider and sends no evaluation or monitoring records to a server. Browser local storage is not encrypted; avoid storing secrets, personal data or restricted prompts. Export archives for backup and protect them according to your organization's data policy. A production multi-user deployment requires an authenticated backend, tenant isolation, retention controls and audit logging.

## Local development

Requirements: Node.js 22 or newer.

```bash
npm ci
npm test
npm run lint
npm run build
npm run dev
```

## Deployment

The application is deployed at [mse-ai-lifecycle.vercel.app](https://mse-ai-lifecycle.vercel.app). It is a local-first evidence workspace and does not require Supabase to function.
