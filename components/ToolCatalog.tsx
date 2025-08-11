"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchTools } from "@/lib/api";
import { ToolCatalogItem, Channel } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Search, Info } from "lucide-react";

type Props = {
  /** Optional preselected channels to seed the tag chips */
  selectedChannels?: Channel[];
  /** Called when the user clicks “Insert” on a tool row */
  onInsertTool?: (tool: { id: string; title: string }) => void;
};

// chips we show above the results – adjust/add if you have more channels
const CHANNEL_TAGS: Channel[] = ["Search", "DV360", "Meta", "AMC", "Generic"] as const;

export default function ToolCatalog({ selectedChannels = [], onInsertTool }: Props) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ToolCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set(selectedChannels));

  // seed active tags when prop changes
  useEffect(() => {
    if (selectedChannels.length) {
      setActiveTags(new Set(selectedChannels));
    }
  }, [selectedChannels]);

  // fetch on query change; request all channels and filter client-side
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTools(q, undefined as any)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [q]);

  const toggleTag = (tag: string) =>
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });

  const clearFilters = () => {
    setActiveTags(new Set());
    setQ("");
  };

  // filter + group for the right pane
  const filtered = useMemo(() => {
    const byTag = (t: ToolCatalogItem) => (activeTags.size ? activeTags.has(t.channel ?? "Generic") : true);
    return items.filter(byTag);
  }, [items, activeTags]);

  const grouped = useMemo(() => {
    const g: Record<string, ToolCatalogItem[]> = {};
    for (const t of filtered) (g[t.channel ?? "Generic"] ||= []).push(t);
    return g;
  }, [filtered]);

  return (
    <Card className="rounded-2xl border bg-card text-card-foreground shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" />
          Browse tools (optional)
        </CardTitle>
        <CardDescription>
          Search or filter by channel, then <b>Insert</b>. You’ll compose the final ask in “Describe task”.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 2-pane layout: filters | results */}
        <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
          {/* Left: search + tag chips */}
          <div className="space-y-3">
            <Input
              placeholder="Search the catalog…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mb-1"
            />
            <div className="flex flex-wrap gap-2">
              {CHANNEL_TAGS.map((tag) => {
                const on = activeTags.has(tag);
                return (
                  <Button
                    key={tag}
                    size="sm"
                    variant={on ? "default" : "secondary"}
                    className="rounded-full"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Button>
                );
              })}
              {(q || activeTags.size) ? (
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {/* Right: results */}
          <ScrollArea className="h-[420px] rounded-xl border p-2">
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading tools…</div>
            ) : !filtered.length ? (
              <div className="p-3 text-sm text-muted-foreground">No tools match.</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([channel, tools]) => (
                  <div key={channel}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {channel}
                    </div>
                    <div className="space-y-2">
                      {tools.map((t) => (
                        <ToolRow key={t.id} t={t} onInsertTool={onInsertTool} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolRow({
  t,
  onInsertTool,
}: {
  t: ToolCatalogItem;
  onInsertTool?: (tool: { id: string; title: string }) => void;
}) {
  return (
    <div className="flex items-start justify-between rounded-xl border p-3 hover:bg-accent transition">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium truncate">{t.title}</div>
          <Badge variant="outline" className="shrink-0">
            {t.channel ?? "Generic"}
          </Badge>

          {t.examples?.length ? (
            <HoverCard openDelay={150}>
              <HoverCardTrigger asChild>
                <button
                  className="inline-flex items-center text-muted-foreground hover:text-foreground"
                  aria-label="Examples"
                >
                  <Info className="h-4 w-4" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent
                side="right"
                align="start"
                sideOffset={8}
                collisionPadding={16}
                className="z-50 w-96 rounded-lg border bg-popover text-popover-foreground shadow-md p-3"
              >
                <div className="text-xs font-medium text-muted-foreground mb-1">Examples</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {t.examples.slice(0, 6).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </HoverCardContent>
            </HoverCard>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {onInsertTool ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onInsertTool({ id: t.id, title: t.title })}
          >
            Insert
          </Button>
        ) : null}

        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">Details</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {t.title} <Badge variant="outline">{t.channel ?? "Generic"}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="text-sm space-y-3">
              <p className="text-muted-foreground">{t.description}</p>
              <Separator />
              {t.inputs_hint && (
                <div>
                  <div className="text-xs font-semibold mb-1">Inputs</div>
                  <HintBlock hint={t.inputs_hint} />
                </div>
              )}
              {t.outputs_hint && (
                <div>
                  <div className="text-xs font-semibold mb-1">Outputs</div>
                  <HintBlock hint={t.outputs_hint} />
                </div>
              )}
              {t.examples?.length ? (
                <div>
                  <div className="text-xs font-semibold mb-1">Examples</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {t.examples.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function HintBlock({ hint }: { hint: Record<string, string> | string }) {
  if (typeof hint === "string") return <div className="text-foreground/90">{hint}</div>;
  return (
    <ul className="space-y-1">
      {Object.entries(hint).map(([k, v]) => (
        <li key={k} className="flex gap-2">
          <span className="text-muted-foreground">{k}:</span>
          <span>{v}</span>
        </li>
      ))}
    </ul>
  );
}

