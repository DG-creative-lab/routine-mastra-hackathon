# Meta Template Builder

Generate Mastra-ready templates from natural-language marketing specs using a Routine-style planner (planner · executor · critic · observer), with first-class demo mode and fixtures.

## Repo Layout

```bash
routine-mastra-hackathon/
├─ app/                         # Next.js App Router (UI + APIs)
│  └─ api/generate/route.ts     # POST: parse → plan → scaffold → return file tree
├─ src/
│  ├─ cli/                      # Optional CLI shims
│  ├─ meta-planner/             # LLM planner → agent_specs + flatten → Routine plan
│  │  ├─ index.ts               # Barrel (exports makeAgentSpecs, flattenToRoutinePlan)
│  │  ├─ planner.ts             # OpenRouter call + parsers
│  │  └─ prompt.ts              # System + few-shot prompt builders
│  ├─ parser/                   # Parse & normalise agent specs
│  │  ├─ schema.ts              # Zod schemas
│  │  ├─ normalize.ts           # Canonicalisation helpers
│  │  └─ index.ts               # parseSpec(raw|obj) → CanonicalSpecMap
│  ├─ template-builder/         # Scaffolder: plan → template folder
│  │  ├─ index.ts               # buildFromPlan({ plan, agentSpecs, outDir, ... })
│  │  ├─ scaffolders.ts         # file_* renderers (workflow, critics, observer, ...)
│  │  └─ registry.ts            # Tool binding registry (tool id → import/invoke)
│  ├─ tools/                    # Production tools with demo augmentation
│  │  ├─ ga4.pull.ts            # GA4 wrapper
│  │  ├─ gAds.updateBid.ts      # Google Ads budget/bid patch
│  │  ├─ dv360.fetchStats.ts    # DV360 CPMs (BQ+fixtures)
│  │  ├─ dv360.patchDealBid.ts  # DV360 line item patch
│  │  ├─ meta.pullAdsetMetrics.ts
│  │  ├─ meta.swapCreative.ts
│  │  ├─ amc.fetchPurchasers.ts
│  │  ├─ amc.createLookAlike.ts
│  │  └─ amc.exportToAdsConsole.ts
│  ├─ fixtures/                 # Built-in demo fixtures (JSON)
│  │  ├─ dv360.fetchStats/*.json
│  │  ├─ meta.pullAdsetMetrics/*.json
│  │  ├─ ga4.pull/*.json
│  │  ├─ amc.fetchPurchasers/*.json
│  │  └─ amc.createLookAlike/*.json
│  ├─ utils/
│  │  ├─ demo.ts                # withDemo(real,fake) + rand/pick/sleep
│  │  ├─ fixtures.ts            # loadFixture(id,variant) / listFixtureNames(id)
│  │  ├─ fsTree.ts              # dir → JSON tree
│  │  ├─ zip.ts                 # zip helper
│  │  └─ logger.ts
│  └─ types/
│     ├─ canonical.ts           # CanonicalSpec, RoutineStep (unified)
│     └─ agents.ts              # Agent roles, PlannerOutput, CriticRule, ObserverSpec
├─ .runs/                       # Per-request outputs (UI) – **git-ignored**
│  └─ <uuid>/
│     ├─ agents.json
│     ├─ plan.json
│     └─ generated-templates/
├─ .env.example                 # See below
├─ package.json / pnpm-lock.yaml / tsconfig.json
└─ README.md
```

## Concepts (Routine-style)

- **Planner** – turns a normalised spec into an ordered Routine plan (steps).
- **Executor** – the generated workflow that calls bound tools with typed inputs.
- **Critic** – guard-rails expressed as rules (e.g., max bid change ≤ 25%). Emitted to critics.ts.
- **Observer** – telemetry (events, counters) emitted to observer.ts.
- **Demo mode** – tools call withDemo(real, fake) and optionally load JSON fixtures so the whole system works without external credentials.

### Data Flow

```
requirements.json → parser → CanonicalSpec[]
  → meta-planner (LLM) → agent_specs.json → flatten → plan.json
  → template-builder → generated-templates/(workflow.ts + critics.ts + observer.ts + ...)
```

## Quick Start

### UI Flow (Recommended)

```bash
pnpm install
pnpm dev       # Next.js dev server
```

1. Open http://localhost:3000
2. Upload requirements.json
3. (Optional) paste variables JSON for .env.example
4. Click Generate → see file tree + download

### CLI Flow (Optional)

```bash
# 1) Produce a plan from a spec (uses the meta-planner)
pnpm ts-node src/meta-planner/planner.ts   # or call makeAgentSpecs() from a script

# 2) Scaffold a template from an existing plan
pnpm ts-node src/template-builder/run.ts   # builds into ./.runs/<id>/generated-templates
```

The API route (`app/api/generate/route.ts`) performs parse → plan → scaffold in one POST.

## Environment

Copy `.env.example` to `.env` and fill what you have. For demos you can set:

```env
DEMO_MODE=true
DEMO_SEED=42
DEMO_LATENCY_MS=250
```

Real integrations use the usual keys (GA4, DV360, Google Ads, Meta, AMC, BigQuery). The tools are credential-lazy: if a required var is missing, the tool throws a helpful error in real mode and auto-falls back to fixtures in demo mode.

## Demo Mode & Fixtures

Every tool that hits an external API follows the pattern:

```typescript
return withDemo(
  () => realCall(input),
  () => fakeFromFixtureOrSynth(input)
);
```

- Fixtures live under `src/fixtures/<tool-id>/*.json` and are loaded with `loadFixture(id, variant)`.
- Add as many variants as you like (e.g., `low_impressions.json`, `healthy.json`).
- Tools that support fixtures will prefer fixtures and otherwise synthesize realistic values.

### Example Directory

```
src/fixtures/
  dv360.fetchStats/
    low_impressions.json
    healthy.json
  meta.pullAdsetMetrics/
    fatigues.json
    healthy.json
  ga4.pull/
    roas_day.json
```

## Template Builder Outputs

Given a `plan.json`, the scaffolder writes a minimal, framework-agnostic runtime:

- `plan.json` – Routine plan used by the runner
- `nodes.ts` – step descriptors (id, tool, inputs, condition)
- `workflow.ts` – tiny executor that resolves $ references and invokes bound tools
- `critics.ts` – emitted critic rules (if any were in the planner output)
- `observer.ts` – emitted observer spec/hooks (if present)
- `register.ts` – stub for future mastra deploy
- `README.md` – per-template doc

You can later replace `workflow.ts` with a Mastra `createWorkflow` implementation without changing the plan.

## Adding a New Tool

1. Create the tool under `src/tools/*.ts` with input/output Zod schemas and the `withDemo` wrapper.
2. Export it from your tools barrel (or ensure the file path is used by the registry).
3. Add an entry to `src/template-builder/registry.ts`:

```typescript
"myTool.id": {
  id: "myTool.id",
  importName: "myToolFn",
  importPath: "../../src/tools",
  invoke: (inputs) => `await myToolFn.execute({ context: ${inputs} })`,
},
```

4. Reference the tool ID in your specs; the planner can include it in steps.

## Critics & Observer

- **Critics**: the meta-planner can output guard-rail rules. The scaffolder renders them into `critics.ts`. The generated workflow calls these rules before committing side effects (e.g., a bid change > 25% throws).
- **Observer**: planner can also emit an observer spec (events/sinks). The scaffolder writes `observer.ts` and the runner publishes events like `plan_started`, `step_finished`, `tool_result`.

Both are no-ops in demo mode but keep the same interface, so you can switch to real sinks (OTLP/Langfuse/Webhooks) later.

## Troubleshooting

- **Type mismatch between planner and builder** – ensure you import shared types from `src/types/*` and use the `meta-planner/index.ts` barrel. We unify types here to avoid duplicate `PlannerOutput` shapes.
- **Tool errors in demo** – check `DEMO_MODE=true` and that a fixture exists under `src/fixtures/<tool-id>/`. Tools synthesize values if no fixture is found.
- **Real mode credential errors** – messages will name the exact env var(s) missing.

## License

MIT (or your team default).