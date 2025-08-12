import type { Metadata } from "next";
import { Rocket, Users2, Workflow, ShieldCheck, BookOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About — Meta Template Builder",
  description:
    "Meet the team, the idea behind merging Routine-style planning with Mastra templates, and where this is going next.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14 space-y-12">
      {/* Hero */}
      <section>
        <div className={card()}>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
              Performics Labs — R&D
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              About the <span className="text-emerald-300">Meta Template Builder</span>
            </h1>
            <p className="text-lg max-w-3xl text-zinc-700 dark:text-zinc-300">
              A hackathon project that turns plain-English specs into runnable{" "}
              <em className="text-emerald-300 not-italic">Mastra</em> templates using{" "}
              <span className="text-emerald-300">Routine-style</span> planning. It’s our pragmatic
              path to collaborative, auditable agents for real marketing work.
            </p>
          </div>
        </div>
      </section>

      {/* The Idea */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className={card()}>
          <h2 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-white">
            Why merge Routine with Mastra?
          </h2>
          <ul className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <li>
              <span className="font-medium text-zinc-900 dark:text-white">
                Structured plans → real code.
              </span>{" "}
              Routine gives us JSON steps; Mastra gives us an ergonomic runtime and tool layer.
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-white">Bias for shipping.</span>{" "}
              You describe a task; we scaffold a working template: <code>plan.json</code>,{" "}
              <code>agents.json</code>, <code>workflow.ts</code>, and stubs.
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-white">
                Audit & guardrails ready.
              </span>{" "}
              Plans are explicit; critics and observers plug in cleanly.
            </li>
          </ul>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            We’re keeping the builder simple and the outputs opinionated—so teams can iterate in
            hours, not weeks.
          </p>
        </div>

        {/* Team */}
        <div className={card()}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-zinc-900 dark:text-white">
                <Users2 className="h-5 w-5" /> The team
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                We’re a small group of engineers, data scientists and media strategists inside{" "}
                <span className="text-emerald-300 font-medium">Performics Labs</span>—an
                experimentation unit focused on applied AI for marketing.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Engineering", "Data Science", "Media Strategy", "Design"].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-zinc-700 dark:text-zinc-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <Link
              href="https://ai-news-hub.performics-labs.com/about"
              target="_blank"
              className="shrink-0 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-400/15 transition"
            >
              Team site →
            </Link>
          </div>
        </div>
      </section>

      {/* How it fits / at a glance */}
      <section className={card()}>
        <h2 className="text-xl font-semibold mb-5 text-zinc-900 dark:text-white">At a glance</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Feature
            icon={<Workflow className="h-5 w-5" />}
            title="Plan → Template"
            body="Upload/describe a task → Routine-style JSON plan → Mastra template + agents + file tree."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Critics & Guardrails"
            body="Bounded actions (Δbid ≤ 25%, brand-safety), observers for logs/metrics, and audit-ready outputs."
          />
          <Feature
            icon={<Rocket className="h-5 w-5" />}
            title="Grows into multi-agent"
            body="Router + blackboard pattern lets planners, executors, critics and observers collaborate safely."
          />
        </div>
      </section>

      {/* Roadmap */}
      <section className={card()}>
        <h2 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-white">What’s next</h2>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          {ROADMAP.map((r) => (
            <div
              key={r.title}
              className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-emerald-300/40 transition"
            >
              <h3 className="font-medium text-zinc-900 dark:text-white">{r.title}</h3>
              <p className="text-sm mt-1 text-zinc-700 dark:text-zinc-300">{r.body}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-4 text-zinc-600 dark:text-zinc-400">
          Full vision: mailboxed agents on a message bus, shared blackboard state, critics as
          first-class citizens, and a clean audit log that doubles as a training set for
          bandits/offline RL.
        </p>
      </section>

      {/* Docs / CTA */}
      <section className="flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-emerald-500 text-emerald-950 px-4 py-2 font-medium shadow-lg shadow-emerald-500/25 hover:brightness-110 transition"
        >
          Open the Builder
        </Link>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-white/7 transition"
        >
          <BookOpen className="h-4 w-4" />
          Read the Docs
        </Link>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          — quickstart, file formats, and examples
        </span>
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

function Feature({
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

const ROADMAP = [
  {
    title: "Router + Blackboard",
    body:
      "Tiny orchestrator (Redis Streams) that validates messages, updates shared state, " +
      "and fans out tasks/observations.",
  },
  {
    title: "Critics as Policy",
    body:
      "Codify spend bounds, safety, and brand rules; veto and re-plan paths are first-class in the protocol.",
  },
  {
    title: "Observability by default",
    body:
      "Every tool call emits events; audit log → analytics → cost control. Ready for Langfuse/OpenTelemetry.",
  },
  {
    title: "Learning loop",
    body:
      "Start with bandit tuning for thresholds; move to offline RL once we have enough trajectories.",
  },
];
