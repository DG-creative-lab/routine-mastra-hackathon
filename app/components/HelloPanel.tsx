// components/HelloPanel.tsx
import Robot from "./Robot";

export default function HelloPanel() {
  return (
    <div className="relative h-full w-full bg-sun-100 overflow-hidden dots">
      {/* organic blob */}
      <div className="absolute -right-24 -top-24 w-[480px] h-[480px] bg-sun-200 animate-blob"></div>

      <div className="relative z-10 max-w-md p-10">
        <h2 className="font-display text-5xl font-bold text-ink-800 mb-3">hello</h2>
        <p className="text-ink-700 leading-relaxed">
          Drop your <strong>requirements JSON</strong>, add any env variables,
          and hit <strong>Generate</strong>. We’ll build a complete Mastra agent
          template you can download instantly.
        </p>

        <ul className="mt-4 text-sm text-ink-700 space-y-2">
          <li>• Validates the spec with Zod</li>
          <li>• Plans with Routine-style steps</li>
          <li>• Scaffolds nodes, workflow, critics & docs</li>
        </ul>

        <div className="mt-8">
          <Robot className="w-44 h-44 animate-float" />
        </div>
      </div>
    </div>
  );
}