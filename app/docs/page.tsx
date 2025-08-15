import type { Metadata } from "next";
import Link from "next/link";
import {
  Wand2,
  Search,
  Puzzle,
  Eye,
  FolderTree,
  ClipboardCopy,
  FileUp,
  ListChecks,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Docs — Meta Template Builder",
  description: "Quickstart, outputs, and tips for using the Meta Template Builder.",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14 space-y-12">
      {/* Hero */}
      <section className={card()}>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Using the <span className="text-emerald-300">Meta Template Builder</span>
        </h1>
        <p className="text-lg mt-2 max-w-3xl text-zinc-700 dark:text-zinc-300">
          Turn a plain-English description into a runnable{" "}
          <span className="text-emerald-300">Mastra</span> template using{" "}
          <span className="text-emerald-300">Routine-style</span> planning. This guide covers the
          flow, outputs, and common gotchas.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-emerald-500 text-emerald-950 px-4 py-2 font-medium shadow-lg shadow-emerald-500/25 hover:brightness-110 transition"
          >
            Open the Builder
          </Link>
          <Link
            href="/about"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-zinc-200 hover:bg-white/7 transition"
          >
            About the project
          </Link>
        </div>
      </section>

      {/* Quickstart */}
      <section className={card()}>
        <h2 className="text-xl font-semibold mb-5 text-zinc-900 dark:text-white">Quickstart</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <Step
            icon={<Search className="h-5 w-5" />}
            title="1) Describe"
            body='Type what you want to automate (e.g., “Lower bids 20% when ROAS < 3”). Optionally tick channels (Search, DV360, Meta, AMC).'
          />
          <Step
            icon={<Puzzle className="h-5 w-5" />}
            title="2) Browse tools (optional)"
            body="Search or filter by channel; click Insert to drop a tool hint into your prompt. You’ll compose the final ask in the Describe box."
          />
          <Step
            icon={<Wand2 className="h-5 w-5" />}
            title="3) Create Spec"
            body="Click Create Spec. The planner returns a Routine-style plan + agents preview."
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <Step
            icon={<Eye className="h-5 w-5" />}
            title="4) Review the spec"
            body="Use Spec preview to sanity-check steps, inputs and outputs before generation."
          />
          <Step
            icon={<FolderTree className="h-5 w-5" />}
            title="5) Generate & explore"
            body="Click Generate. Browse the file tree in Results to preview each file."
          />
          <Step
            icon={<ClipboardCopy className="h-5 w-5" />}
            title="6) Preview / copy"
            body="Open files in Results and copy content into your Mastra workspace. (ZIP export is disabled in this build.)"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          Tip: already have a JSON spec? Switch to <span className="font-medium">Upload spec</span>{" "}
          to import a file and optional variables JSON, then generate directly.
        </div>
      </section>

      {/* Sample prompt */}
      <section className={card()}>
        <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Sample prompt</h2>
        <p className="mb-3 text-zinc-700 dark:text-zinc-300">
          Paste this into <em>Describe task</em> to see an end-to-end plan:
        </p>
        <pre className={pre()}>
{`Lower Google Ads bids by 20% for campaigns where yesterday's ROAS < 3.
Pull GA4 metrics, compare to threshold, then patch bids. Log changes.`}
        </pre>
        <p className="text-xs mt-2 text-zinc-600 dark:text-zinc-400">
          You can add tool hints like <code>Use tool: ga4Pull</code>,{" "}
          <code>Use tool: computeCheck</code>, or <code>Use tool: gAdsUpdateBid</code>—the planner
          will adapt.
        </p>
      </section>

      {/* Outputs */}
      <section className={card()}>
        <h2 className="text-xl font-semibold mb-5 text-zinc-900 dark:text-white">
          What the builder generates
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <OutputFile
            name="plan.json"
            desc="Routine-style ordered steps with typed inputs/outputs and optional conditions."
          />
          <OutputFile
            name="agents.json"
            desc="Planner / Executor / Critic / Observer roles and tool permissions."
          />
          <OutputFile
            name="workflow.ts"
            desc="Mastra workflow scaffolding that runs the plan and wraps tool calls."
          />
          <OutputFile
            name="nodes.ts"
            desc="Typed nodes for each step; easy to extend with your custom logic."
          />
          <OutputFile
            name="critics/*"
            desc="Stubs for guardrails (e.g., Δbid ≤ 25%, brand safety)."
          />
          <OutputFile
            name="README.md"
            desc="Short runbook with setup steps, env vars, and usage."
          />
        </div>
      </section>

      {/* Upload flow */}
      <section className={card()}>
        <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Upload spec flow</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Mini
            icon={<FileUp className="h-4 w-4" />}
            title="Choose file"
            body="Select your JSON spec. The parser will validate & normalize."
          />
          <Mini
            icon={<ListChecks className="h-4 w-4" />}
            title="Vars (optional)"
            body={`Provide a JSON object for env-like values, e.g.
{"GOOGLE_ADS_CUSTOMER_ID":"..."}
            `}
          />
          <Mini
            icon={<ClipboardCopy className="h-4 w-4" />}
            title="Generate & preview"
            body="Same outputs as the describe flow — open files in Results and copy into your workspace."
          />
        </div>
      </section>

      {/* Troubleshooting */}
      <section className={card()}>
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">Troubleshooting</h2>
        <ul className="space-y-3 text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-zinc-900 dark:text-white">No tools visible?</span>{" "}
              Clear the search box, or click a channel chip (Search, DV360, Meta, AMC) to filter
              quickly.
            </div>
          </li>
          <li className="flex gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-zinc-900 dark:text-white">Rate-limited?</span> Try
              again in a minute. If it persists, shorten the prompt or remove extra examples.
            </div>
          </li>
          <li className="flex gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-zinc-900 dark:text-white">Dark/light theme?</span>{" "}
              Use the toggle in the top bar. The UI uses system fonts and Tailwind utilities.
            </div>
          </li>
        </ul>
      </section>

      {/* Footer CTA */}
      <section className="flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-emerald-500 text-emerald-950 px-4 py-2 font-medium shadow-lg shadow-emerald-500/25 hover:brightness-110 transition"
        >
          Start building
        </Link>
        <Link
          href="/about"
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-zinc-200 hover:bg-white/7 transition"
        >
          Read about the vision
        </Link>
      </section>
    </div>
  );
}

/* ---------- helpers ---------- */

function card(extra?: string) {
  return cn(
    "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8 shadow-sm",
    extra
  );
}

function pre() {
  return cn(
    "rounded-xl border border-white/10 bg-black/40 text-zinc-200 p-4 overflow-x-auto text-sm"
  );
}

function Step({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-emerald-300">
        {icon}
        <div className="font-medium text-zinc-900 dark:text-white">{title}</div>
      </div>
      <p className="text-sm mt-2 text-zinc-700 dark:text-zinc-300">{body}</p>
    </div>
  );
}

function OutputFile({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="font-mono text-sm text-zinc-900 dark:text-white">{name}</div>
      <p className="text-sm mt-1 text-zinc-700 dark:text-zinc-300">{desc}</p>
    </div>
  );
}

function Mini({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-emerald-300">
        {icon}
        <div className="font-medium text-zinc-900 dark:text-white">{title}</div>
      </div>
      <p className="text-sm mt-2 whitespace-pre-line text-zinc-700 dark:text-zinc-300">{body}</p>
    </div>
  );
}
