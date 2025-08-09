### Demo Flow — Meta-Template-Builder

tl;dr: upload → parse → plan → scaffold → download

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant UI as Web UI (Next.js)
    participant G as POST /api/generate
    participant P as Parser (Zod)
    participant M as Meta-Planner (LLM)
    participant T as Template-Builder
    participant FS as .runs/<runId> (disk)
    participant TR as GET /api/runs/:id/tree
    participant F as GET /api/runs/:id/file
    participant Z as GET /api/runs/:id/zip

    U->>UI: Upload requirements.json + variables
    UI->>G: multipart/form-data (file + JSON vars)
    G->>FS: mkdir .runs/<runId>;
    G->>P: parseSpec(rawJson)
    P-->>G: CanonicalSpec (validated) or error
    G->>M: categoriseWithLLM(CanonicalSpec)
    M-->>G: Bucket map → Routine plan (steps)
    G->>T: buildFromPlan(plan.json)
    T->>FS: scaffold generated-templates/ (nodes.ts, workflow.ts, docs…)
    G-->>UI: { runId, tree }
    UI->>TR: poll /api/runs/<runId>/tree
    TR-->>UI: JSON file tree (ready)
    U->>UI: Click a file or “Download ZIP”
    UI->>F: GET /api/runs/<runId>/file?path=...
    F-->>UI: file stream
    UI->>Z: GET /api/runs/<runId>/zip
    Z-->>UI: zip stream

```

## What happens at each step
1. User uploads a marketing requirements JSON (+ optional env vars).
2.	/api/generate creates a runId folder under .runs/, saving inputs.
3.	Parser (Zod) validates + normalizes to a CanonicalSpec.
4.	Meta-Planner (LLM) buckets needs and returns a Routine plan of steps.
5.	Template-Builder scaffolds a full Mastra-style template (nodes, workflow, critics, docs).
6.	API responds with { runId, tree }; the UI polls the tree endpoint.
7.	User downloads a single file or the whole ZIP.

## Notes
* Disk at .runs/<runId> is ephemeral on Vercel (perfect for demo runs).
* For DV360/Meta/AMC creds you can stub tool handlers; GA4 or pure compute steps work fine.
* Replace the minimal workflow.ts with Mastra’s typed workflow when you’re ready.