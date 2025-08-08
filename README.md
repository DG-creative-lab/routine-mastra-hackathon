## ✨ Meta-Template-Builder


### 📂 Repo layout


```bash
routine-mastra-hackathon/
├─ src/                  # ← all runtime code lives here
│  ├─ cli/               # wrapper commands (exposed via pnpm scripts)
│  │   └─ index.ts
│  ├─ parser/
│  │   ├─ agents_spec.json   # ← editable by humans
│  │   ├─ schema.ts          # zod schema
│  │   ├─ normalize.ts
│  │   └─ index.ts           # exports parseAndNormalize()
│  ├─ meta-planner/
│  │   ├─ planner.ts         # orchestrator
│  │   ├─ prompt.ts          # system + few-shot builder
│  │   ├─ plan.json          # auto-generated (git-ignored ✅)
│  │   └─ plan.example.json  # miniature reference (checked-in)
│  ├─ template-builder/
│  │   ├─ scaffold.ts        # wrappers for mastra.scaffold, docs, etc.
│  │   └─ index.ts
│  ├─ tools/                 # reusable SDK wrappers (GA4, DV360, etc.)
│  │   ├─ ga4.pull.ts
│  │   ├─ gAds.updateBid.ts
│  │   └─ …
│  ├─ types/                 # shared TypeScript interfaces
│  │   └─ canonical.ts
│  └─ utils/                 # misc helpers (fs, logger, etc.)
│      └─ logger.ts
│
├─ generated-templates/  # ← created at runtime; **git-ignored**
│   └─ search-monitoring-prediction/ … 
│
├─ .vscode/              # editor settings (optional)
├─ .gitignore
├─ .eslintrc.json
├─ .prettierrc
├─ .env.example
├─ mastrarc.js
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
└─ README.md
```

---

Goal: Auto-generate Mastra templates from structured marketing needs.

| Folder | Why it belongs in src/ |
|--------|------------------------|
| cli/ | Thin façade so "pnpm cli my-command" imports internal modules without ugly relative paths (import { parse } from "@/parser"). |
| parser/ | Pure data-prep ♥ type-safe → owned by your runtime, not the repo root. |
| meta-planner/ | Generates the top-level **plan.json** but is itself application code. |
| template-builder/ | Runtime that stitches Routine → Mastra. Keeps src the single import root. |
| tools/ | SDK adaptors are code, not config. Living inside src means TS paths/aliases work. |
| types/ | Co-locate shared interfaces so all modules can import { CanonicalSpec } from "@/types". |
| utils/ | Logger, tiny FS helpers, etc. go here to avoid duplication. |



---

## Quick Start
```bash
git clone https://github.com/ai-knowledge-hub/all-hands/tree/main/routine-powered-performance-agents/meta-template-builder
cd meta-template-builder
pnpm install

# Build a template from the holistic_monitoring_prediction spec
pnpm meta-build ./specs/holistic_monitoring_prediction.json

# Run the workflow locally
pnpm meta-dev ./templates/holistic_monitoring_prediction
```

---

### 1 ️⃣ Parser (./parser/*)

Purpose

Guarantee every downstream component receives a strict, typed spec. 

```ts
// parser/schema.ts (excerpt)
export const Requirements = z.object({
  tagline: z.string(),
  required_features: z.object({
    core_capability: z.string(),
    data_visibility: z.array(z.string()),
    actions: z.array(z.string()),
    insights: z.array(z.string())
  }),
  success_metrics: z.record(z.any()),
  timeline: z.record(z.any())
});

// parser/index.ts
export function parseSpec(path: string) {
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  return Requirements.parse(raw);      // throws if invalid
}
```
before testing ensure that you have vaalid JSON file wit hthe user requirements specifications 
Once you build the parser to test quickly:

```bash
# inside meta-template-builder/
pnpm ts-node parser/index.ts specs/agents_spec.json
```
You should see a colourised, fully-normalised object (with numeric deltas parsed, feature keys canonicalised, timeline values forced to arrays).
Any structural errors throw immediately with a Zod-powered explanation.

---

### 2 ️⃣ Meta-Planner (./meta-planner)

Large model + few-shot examples → Routine plan.json.

```ts
// meta-planner/planner.ts
import { openai } from "../utils/llm";
import { parseSpec } from "../parser";

export async function makePlan(specPath: string) {
  const spec = parseSpec(specPath);
  const { content } = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(spec) }
    ],
    functions: [routineSchemaFunction]  // JSON mode
  });
  fs.writeFileSync("plan.json", content);
  return content;
}
```
SYSTEM_PROMPT gently forces Routine structure & strict JSON.

##### How meta-planner/planner.ts. workks 

It does four things:
	1.	Load & normalise the raw agents spec JSON.
	2.	Call an LLM (Horizon β via OpenRouter) to cluster the requirements into
Routine-style agent buckets.
	3.	Generate a Routine plan (array of ordered steps).
	4.	Persist that plan to plan.json so the Mastra Executor can pick it up.

Note – we only build the Planner here.
The individual tool wrappers (tools/…/*.ts) still execute inside Mastra
when the plan runs.
For local testing run pnpm ts-node meta-planner/planner.ts.

---

### 3 ️⃣ Template-Builder (./template-builder)

Converts plan.json into a Mastra template directory:

How to run the template builder

```bash
# 1) Ensure meta-planner/plan.json exists
pnpm ts-node meta-planner/planner.ts

# 2) Generate a template folder from the plan
pnpm build:template

# 3) Inspect generated-templates/<name>/
tree generated-templates/search-bid-guardian

# 4) (Optional) Replace workflow.ts with Mastra’s createWorkflow once you’re ready

```
---

### 4 ️⃣ Tool wrappers (./tools)

Each file exports a Mastra component.

```ts
// tools/ga4.pull.ts
export const ga4Pull = defineTool({
  name: "ga4.pull",
  inputs: { lookback: z.string(), metrics: z.array(z.string()) },
  outputs: { roas: z.number() },
  handler: async ({ lookback, metrics }) => {
    const res = await ga4Api.query({ lookback, metrics });
    return { roas: res.roas };
  }
});

//Add to a registry in nodes.ts:

export const Components = {
  ga4Pull,
  // …
};
```
---

### 5 ️⃣ CLI helpers (./cli)

```ts
// cli/meta-build.ts
import { makePlan } from "../meta-planner/planner";
import { buildTemplate } from "../template-builder";

const spec = process.argv[2];
const plan = await makePlan(spec);
await buildTemplate(plan);
console.log("✅ Template ready in ./templates/");

pnpm meta-dev <templateDir> simply runs mastra dev inside that folder.
```
---

### 🔒 Critics Library

Placed in template-builder/critics and auto-attached via workflow.useMiddleware.

```ts
export const budgetGuard = (ctx) => {
  if (ctx.deltaBidPct && Math.abs(ctx.deltaBidPct) > 25) {
    throw new Error("Bid change >25% not allowed.");
  }
};
```

---

## 🧪 Unit Tests
```bash
pnpm test       # Vitest – validates schema & plan round-trip
```
---
## 🔩 Architecture (Next.js App Router on Vercel)

```bash
/app
  /page.tsx                 ← UI: upload JSON, set variables, Generate button, results browser
  /api/generate/route.ts    ← POST: orchestrates parse → plan → scaffold, returns runId + tree
  /api/runs/[id]/tree/route.ts  ← GET: returns file tree for that run
  /api/runs/[id]/file/route.ts  ← GET: streams a single file
  /api/runs/[id]/zip/route.ts   ← GET: zips & streams whole run

/src
  /parser/...               ← your existing parser code (exported as lib functions)
  /meta-planner/...         ← your planner + prompt (export functions, no top-level side effects)
  /template-builder/...     ← your scaffolder (export buildFromPlan)
  /utils/fsTree.ts          ← helper to read dir → JSON tree
  /utils/zip.ts             ← helper to zip a dir
```

## 🙌 Contributing / Hackathon Checklist
	•	Add a new specs/*.json
	•	pnpm meta-build <spec> – ensure template compiles
	•	pnpm meta-dev ./templates/<name> – manual smoke test
	•	Commit, push & PR with label #hackathon

----

Useful Links
	•	📰 Routine News Brief – https://performics.ai/news/routine-structured-llm-planning
	•	📊 Deep Analysis – https://performics.ai/analysis/routine-agentic-marketing-framework
	•	🛠 Mastra Docs – https://mastra.ai/en/docs
	•	🎥 Templates Walk-through – https://www.youtube.com/watch?v=MbSXBLWAhy0

----

Happy building – see you in the #mastra-build Slack & on demo day!
— Performics Labs