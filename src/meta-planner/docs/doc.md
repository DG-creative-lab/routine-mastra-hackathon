
🗺️  End-to-End Workflow ― Meta-Planner → Routine Plan → Mastra Templates


Human (you)                    Meta-Planner (code)                       Outputs
──────────────────────────────────────────────────────────────────────────────────────────
1. Edit  parser/agents_spec.json   ──┐
                                    │
2. Run  pnpm dev   (alias to       ─┘
   ts-node src/meta-planner/planner.ts)

           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  🟢  Step 1  loadAndNormaliseSpec()                                       │
│       • Reads raw requirements (YAML/JSON)                               │
│       • Normalises → CanonicalSpec[] → in-memory                         │
├───────────────────────────────────────────────────────────────────────────┤
│  🟢  Step 2  categoriseWithLLM()                                          │
│       • SYSTEM_PROMPT  + buildUserPrompt()                               │
│       • Horizon-β buckets each spec-ID → {planner | executor | …}        │
│       • Returns **agentBuckets** JSON                                    │
├───────────────────────────────────────────────────────────────────────────┤
│  🟢  Step 3  buildRoutinePlan()                                          │
│       • Programmatically assembles an **array< RoutineStep >**           │
│       • Inserts a `constant.set` node that hard-codes agentBuckets       │
│       • Adds steps to call `routine.planMaker` & `mastra.scaffold`       │
├───────────────────────────────────────────────────────────────────────────┤
│  🟢  Step 4  fs.writeFile(plan.json)                                     │
│       • Serialises the RoutineStep[] → meta-planner/plan.json            │
└───────────────────────────────────────────────────────────────────────────┘
           │
           │  (executor phase – happens later)
           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  🟣  routine.planMaker  – takes agentBuckets                              │
│       • Generates one *Routine Plan* per bucket / agent-family           │
│                                                                         │
│  🟣  mastra.scaffold  – takes those plans                                 │
│       • Spits out **ready-to-fill template folders** inside              │
│         /generated-templates/ …                                         │
│       • Each folder: planner.prompt, workflow.ts, nodes.ts, etc.         │
│                                                                         │
│  🟣  docs.generateSummary                                                │
│       • Creates README.md combining spec highlights + file tree          │
└───────────────────────────────────────────────────────────────────────────┘

🎉  **Artifacts on disk**

generated-templates/
  ├─ search-monitoring-prediction/
  │   ├─ planner.prompt
  │   ├─ workflow.ts
  │   ├─ nodes.ts
  │   └─ …etc
  ├─ search-analytics/
  └─ …

meta-planner/plan.json            ← deterministic Routine plan
meta-planner/plan.example.json    ← the tiny hand-written sample