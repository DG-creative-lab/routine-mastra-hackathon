# Meta Template Builder

Generate Mastra‑ready templates from **natural‑language marketing specs** using a Routine‑style architecture (**planner · executor · critic · observer**), with first‑class **demo mode** and **fixtures**.

---

## Repo Layout

```bash
routine-mastra-hackathon/
├─ app/                               # Next.js App Router (UI + APIs)
│  └─ api/
│     ├─ tools/route.ts               # GET: sanitized tool catalog (for UX + LLM nudges)
│     ├─ specify/route.ts             # POST: free‑text → agent_specs (validated & normalized)
│     ├─ generate/route.ts            # POST: (upload OR {runId}) → parse → plan → scaffold
│     └─ validate-spec/route.ts       # POST: validate pasted JSON against Zod schema
├─ middleware.ts                      # (optional) rate‑limit /api/specify on Edge
├─ src/
│  ├─ meta-planner/                   # LLM planner → agent_specs → flatten → Routine plan
│  │  ├─ index.ts                     # Barrel (makeAgentSpecs, flattenToRoutinePlan)
│  │  ├─ planner.ts                   # LLM call + JSON parse helpers
│  │  └─ prompt.ts                    # System + few‑shot prompt builders
│  ├─ parser/                         # Parse & normalize human specs
│  │  ├─ schema.ts                    # Zod schemas (AgentSpecFile)
│  │  ├─ normalize.ts                 # Canonicalisation helpers
│  │  └─ index.ts                     # parseSpec(raw|obj) → CanonicalSpecMap
│  ├─ template-builder/               # Scaffolder: plan → template folder
│  │  ├─ index.ts                     # buildFromPlan({ plan, agentSpecs, outDir, ... })
│  │  ├─ scaffolders.ts               # file_* renderers (workflow, critics, observer, ...)
│  │  └─ registry.ts                  # Tool binding registry (tool id → import/invoke)
│  ├─ tools/                          # Production tools with demo augmentation
│  │  ├─ ga4.pull.ts                  # GA4 wrapper
│  │  ├─ gAds.updateBid.ts            # Google Ads budget/bid patch
│  │  ├─ dv360.fetchStats.ts          # DV360 CPMs (BigQuery + fixtures)
│  │  ├─ dv360.patchDealBid.ts        # DV360 line item patch
│  │  ├─ meta.pullAdsetMetrics.ts
│  │  ├─ meta.swapCreative.ts
│  │  ├─ amc.fetchPurchasers.ts
│  │  ├─ amc.createLookAlike.ts
│  │  ├─ amc.exportToAdsConsole.ts
│  │  └─ (… plus logging tools under bigquery.*)
│  ├─ fixtures/                       # Built‑in demo fixtures (JSON)
│  │  ├─ dv360.fetchStats/*.json
│  │  ├─ meta.pullAdsetMetrics/*.json
│  │  ├─ ga4.pull/*.json
│  │  ├─ amc.fetchPurchasers/*.json
│  │  └─ amc.createLookAlike/*.json
│  ├─ utils/
│  │  ├─ llm.ts                       # Provider abstraction (baseURL, model, key)
│  │  ├─ demo.ts                      # withDemo(real,fake) + rand/pick/sleep
│  │  ├─ fixtures.ts                  # loadFixture(id,variant) / listFixtureNames(id)
│  │  ├─ rateLimit.ts                 # Upstash wrappers (optional)
│  │  ├─ fsTree.ts                    # dir → JSON tree
│  │  ├─ zip.ts                       # zip helper
│  │  └─ logger.ts
│  └─ types/
│     ├─ canonical.ts                 # CanonicalSpec, RoutineStep (unified)
│     └─ agents.ts                    # Agent roles, PlannerOutput, CriticRule, ObserverSpec
├─ .runs/                             # Per‑request outputs (UI) — **git‑ignored**
│  └─ <uuid>/
│     ├─ requirements.json            # normalized spec (from upload or /api/specify)
│     ├─ agents.json                  # meta‑planner output
│     ├─ plan.json                    # flattened Routine plan
│     └─ generated-templates/         # scaffolded template
├─ .env.example
├─ package.json / pnpm-lock.yaml / tsconfig.json
└─ README.md
```

---

## Concepts (Routine-style) · [Deep dive →](https://ai-news-hub.performics-labs.com/analysis/routine-agentic-marketing-framework)

* **Planner** – converts a normalized spec into an ordered **Routine plan** (steps).
* **Executor** – generated workflow that calls bound tools with typed inputs.
* **Critic** – guard‑rails (e.g., “max bid change ≤ 25%”). Emitted to `critics.ts`.
* **Observer** – telemetry (events, counters). Emitted to `observer.ts`.
* **Demo mode** – tools call `withDemo(real, fake)` and can load JSON fixtures so everything runs without external credentials.

### Data Flow (two entry points)

```
A) Upload flow:
requirements.json → parser → CanonicalSpec[]
  → meta‑planner (LLM) → agent_specs.json → flatten → plan.json
  → template‑builder → generated‑templates/(workflow.ts + critics.ts + observer.ts + ...)

B) Free‑text flow:
/user prompt → /api/specify → requirements.json (normalized)
  → same path as (A) via /api/generate { runId }
```

---

## Quick Start

### UI Flow (Recommended)

```bash
pnpm install
pnpm dev       # Next.js dev server
```

1. Open [http://localhost:3000](http://localhost:3000)
2. Either **upload** `requirements.json` **or** use the **free‑text** form
3. (Optional) paste variables JSON for `.env.example`
4. Click **Generate** → see file tree → download

### CLI Flow (Optional)

```bash
# 1) Produce a plan from a spec (uses the meta‑planner)
pnpm ts-node src/meta-planner/planner.ts   # or call makeAgentSpecs() programmatically

# 2) Scaffold a template from an existing plan
pnpm ts-node src/template-builder/run.ts   # builds into ./.runs/<id>/generated-templates
```

The `/api/generate` route performs **parse → plan → scaffold** in one POST.

---

## API Reference

### `GET /api/tools`

Returns a sanitized tool catalog for UX and for the LLM (ids, descriptions, IO hints, examples).

### `POST /api/specify`

Body: `{ text: string, channels?: string[] }` → returns `{ runId, spec }` and writes normalized `requirements.json` into `.runs/<runId>/`.

* Validated with Zod (`SpecFileSchema`) and normalized (keys, deltas, timelines).
* Rate‑limited via `middleware.ts` (optional; Upstash Redis).

### `POST /api/generate`

Accepts either **FormData** (with a `requirements` file) **or** JSON `{ runId }` created by `/api/specify`. Produces planner output and a scaffolded template under `.runs/<runId>/generated-templates/`.

### `POST /api/validate-spec`

Paste‑in JSON → returns `{ ok: true }` or a Zod error object.

---

## Environment

Copy `.env.example` to `.env` and fill what you have. For demos:

```env
DEMO_MODE=true
DEMO_SEED=42
DEMO_LATENCY_MS=250
```

### LLM Provider (swappable)

```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=openai/gpt-4o-mini
LLM_API_KEY=...
# optional fallbacks
OPENROUTER_API_KEY=
OPENAI_API_KEY=
```

### Rate Limiting (optional)

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
RL_SPECIFY_PER_MIN=5
RL_SPECIFY_PER_HOUR=60
RL_ALLOWLIST=127.0.0.1,::1
```

> If Redis is not configured, the app still works; `/api/specify` is simply not rate‑limited (a single startup warning is logged in production).

### Vendor Keys

Real integrations use the usual credentials (GA4, DV360, Google Ads, Meta, AMC, BigQuery). Tools are **credential‑lazy**: if a required var is missing, they throw a helpful error in real mode and auto‑fall back to fixtures in demo mode.

---

## Demo Mode & Fixtures

Tools that hit external APIs follow:

```ts
return withDemo(
  () => realCall(input),
  () => fakeFromFixtureOrSynth(input)
);
```

* Fixtures live under `src/fixtures/<tool-id>/*.json` and are loaded with `loadFixture(id, variant)`.
* Add as many variants as you like (e.g., `low_impressions.json`, `healthy.json`).
* When no fixture exists, tools synthesize realistic values using a seeded RNG.

**Example layout**

```
src/fixtures/
  dv360.fetchStats/
    low_impressions.json
    healthy.json
  meta.pullAdsetMetrics/
    fatigued.json
    healthy.json
  ga4.pull/
    roas_day.json
  amc.fetchPurchasers/
    batch_small.json
  amc.createLookAlike/
    baseline.json
```

---

## Template Builder Outputs

Given a `plan.json`, the scaffolder writes a minimal, framework‑agnostic runtime:

* `plan.json` – Routine plan used by the runner
* `nodes.ts` – step descriptors (id, tool, inputs, condition)
* `workflow.ts` – tiny executor that resolves `$` references and invokes bound tools
* `critics.ts` – emitted critic rules (if present)
* `observer.ts` – emitted observer spec/hooks (if present)
* `register.ts` – stub for future Mastra deploy
* `README.md` – per‑template doc

You can later replace `workflow.ts` with a Mastra `createWorkflow` implementation without changing the plan.

---

## Critics & Observer

* **Critics**: meta‑planner can output guard‑rail rules. The scaffolder renders these into `critics.ts`. The generated workflow runs rules before committing side‑effects (e.g., block bid change > 25%).
* **Observer**: meta‑planner can output an observer spec (events/sinks). The scaffolder writes `observer.ts`, and the runner publishes events like `plan_started`, `step_finished`, `tool_result`.

Both are no‑ops in demo mode but share the same interface, so you can switch to real sinks (OTLP/Langfuse/Webhooks) later.

---

## Adding a New Tool

1. Create the tool under `src/tools/*.ts` with input/output Zod schemas and the `withDemo` wrapper.
2. Export it from your tools barrel (or ensure the registry path points at the file).
3. Add an entry to `src/template-builder/registry.ts`:

```ts
"myTool.id": {
  id: "myTool.id",
  importName: "myToolFn",
  importPath: "../../src/tools",
  invoke: (inputs) => ` + "`await myToolFn.execute({ context: ${inputs} })`" + `,
},
```

4. Reference the tool id in your specs; the planner can include it in steps.

---

## Troubleshooting

* **Type mismatch (planner ↔ builder)** – import shared types from `src/types/*` and use the `meta-planner/index.ts` barrel; we unify types to avoid duplicate shapes.
* **Demo errors** – confirm `DEMO_MODE=true` and a fixture exists under `src/fixtures/<tool-id>/`. Tools synthesize values if no fixture is found.
* **Real‑mode credential errors** – messages name the missing env var(s) and suggest fixes.

---

## License

MIT (or your team default).
