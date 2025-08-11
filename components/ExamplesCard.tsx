"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

// --- minimal example data wiring (replace with your source if you already have one) ---
type Example = {
  id: string;
  title: string;
  tagline: string;
  channel: "Search" | "DV360" | "Meta" | "AMC";
  // a JSON blob per example to download/preview:
  spec: unknown;
};

const EXAMPLES: Example[] = [
  {
    id: "search_bid_guardian",
    title: "Search Bid Guardian",
    tagline: "Lower Google Ads bids whenever ROAS falls below a KPI threshold.",
    channel: "Search",
    spec: { /* …your example spec object… */ },
  },
  {
    id: "dv360_deal_optimiser",
    title: "DV360 Deal Optimiser",
    tagline: "Patch DV360 deal bids when CPM deviates > 15 % from baseline.",
    channel: "DV360",
    spec: { /* … */ },
  },
  {
    id: "meta_fatigue_swapper",
    title: "Meta Fatigue Swapper",
    tagline: "Rotate creatives when frequency > 6 or audience < 50 k.",
    channel: "Meta",
    spec: { /* … */ },
  },
  {
    id: "amc_lookalike_builder",
    title: "AMC Look-Alike Builder",
    tagline: "Weekly pipeline that builds SKU-seeded look-alikes in AMC.",
    channel: "AMC",
    spec: { /* … */ },
  },
];

type Props = {
  onPreviewSpec: (spec: unknown) => void;
  className?: string;
};

export default function ExamplesCard({ onPreviewSpec, className }: Props) {
  const [filter, setFilter] = useState<Example["channel"] | "">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () => (filter ? EXAMPLES.filter((e) => e.channel === filter) : EXAMPLES),
    [filter]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function downloadSelected() {
    if (!selected.size) return;
    const payload: Record<string, unknown> = {};
    for (const e of EXAMPLES) if (selected.has(e.id)) payload[e.id] = e.spec;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agent-specs.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className={cn("rounded-2xl shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Examples (optional)</CardTitle>
      </CardHeader>

      {/* Content has regular bottom padding now so the footer never overlaps */}
      <CardContent className="pt-0 space-y-3">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {(["Search", "DV360", "Meta", "AMC"] as const).map((ch) => (
            <Badge
              key={ch}
              variant={filter === ch ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter(filter === ch ? "" : ch)}
            >
              {ch}
            </Badge>
          ))}
          <button
            className="text-sm text-muted-foreground hover:text-foreground ml-2"
            onClick={() => setFilter("")}
          >
            Clear
          </button>
        </div>

        {/* Example rows */}
        <div className="space-y-2">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border p-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Checkbox
                  checked={selected.has(e.id)}
                  onCheckedChange={() => toggle(e.id)}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{e.title}</div>
                    <Badge variant="secondary" className="shrink-0">
                      {e.channel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {e.tagline}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreviewSpec(e.spec)}
                  className="gap-1"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify({ [e.id]: e.spec }, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${e.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Proper footer — no sticky, no overlap */}
      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Selected: {selected.size}
        </div>
        <Button onClick={downloadSelected} disabled={!selected.size}>
          Download selected (.json)
        </Button>
      </CardFooter>
    </Card>
  );
}