// components/ExamplesCard.tsx
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type Channel = "Search" | "DV360" | "Meta" | "AMC";

type Example = {
  id: string;
  title: string;
  tagline: string;
  channel: Channel;
  // Use exactly one of these:
  prompt?: string;
  spec?: unknown;
};

const EXAMPLES: Example[] = [
  {
    id: "search_bid_guardian",
    title: "Search Bid Guardian",
    tagline: "Lower Google Ads bids whenever ROAS falls below a KPI threshold.",
    channel: "Search",
    prompt:
      "Lower Google Ads bids by 20% for campaigns where yesterday's ROAS < 3. Pull GA4 metrics, compare to threshold, then patch bids. Log changes.",
  },
  {
    id: "dv360_deal_optimiser",
    title: "DV360 Deal Optimiser",
    tagline: "Patch DV360 deal bids when CPM deviates > 15% from baseline.",
    channel: "DV360",
    prompt:
      "Reduce DV360 deal bids when CPM exceeds baseline by 15%. Use BigQuery export; write changes and log patches.",
  },
  {
    id: "meta_fatigue_swapper",
    title: "Meta Fatigue Swapper",
    tagline: "Rotate creatives when frequency > 6 or audience < 50k.",
    channel: "Meta",
    prompt:
      "Rotate Meta creatives when frequency > 6 or audience size < 50k. Include logging of swaps.",
  },
  {
    id: "amc_lookalike_builder",
    title: "AMC Look-Alike Builder",
    tagline: "Weekly pipeline that builds SKU-seeded look-alikes in AMC.",
    channel: "AMC",
    prompt:
      "Weekly pipeline: pull purchasers by SKU from AMC, normalise, build look-alike audiences; log outcomes.",
  },
];

type Props = {
  // New: for prompt-based examples (most common)
  onPreviewPrompt?: (text: string, channels?: string[]) => void;
  // Kept: for raw-spec examples if you add any later
  onPreviewSpec?: (spec: unknown) => void;
  className?: string;
};

export default function ExamplesCard({ onPreviewPrompt, onPreviewSpec, className }: Props) {
  const [filter, setFilter] = useState<Channel | "">("");
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
    for (const e of EXAMPLES) {
      if (selected.has(e.id)) {
        // If you only have prompts, you might skip including them,
        // or call your /api/specify here to pre-generate files.
        payload[e.id] = e.spec ?? { prompt: e.prompt };
      }
    }
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

      <CardContent className="pt-0 space-y-3">
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
          <button className="text-sm text-muted-foreground hover:text-foreground ml-2" onClick={() => setFilter("")}>
            Clear
          </button>
        </div>

        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border p-3">
              <div className="flex items-start gap-3 min-w-0">
                <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} className="mt-1" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{e.title}</div>
                    <Badge variant="secondary" className="shrink-0">
                      {e.channel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{e.tagline}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (e.spec && onPreviewSpec) onPreviewSpec(e.spec);
                    else if (e.prompt && onPreviewPrompt) onPreviewPrompt(e.prompt, [e.channel]);
                  }}
                  className="gap-1"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" onClick={downloadSelected}>
                  Download selected
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Selected: {selected.size}</div>
        <Button onClick={downloadSelected} disabled={!selected.size}>
          Download (.json)
        </Button>
      </CardFooter>
    </Card>
  );
}