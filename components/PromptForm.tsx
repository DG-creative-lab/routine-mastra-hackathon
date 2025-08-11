"use client";

import { useState } from "react";
import { postSpecify } from "@/lib/api";
import type { Channel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";

type Props = {
  onSpecified: (res: { runId: string; spec: unknown }) => void;
  /** Optional controlled text props */
  text?: string;
  setText?: React.Dispatch<React.SetStateAction<string>>;
  /** Allow parent to pass layout classes (we add h-full/min-h) */
  className?: string;
};

const ALL_CHANNELS: Channel[] = ["Search", "DV360", "Meta", "AMC"];

export default function PromptForm({
  onSpecified,
  text: textProp,
  setText: setTextProp,
  className,
}: Props) {
  const [textUncontrolled, setTextUncontrolled] = useState("");
  const text = textProp ?? textUncontrolled;
  const setText = setTextProp ?? setTextUncontrolled;

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleChannel(c: Channel) {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function onSubmit() {
    if (!text.trim()) {
      toast.error("Enter a description");
      return;
    }
    setLoading(true);
    try {
      const res = await postSpecify({
        text: text.trim(),
        channels: channels.length ? channels : undefined,
      });
      toast.success("Spec created • review & generate");
      onSpecified(res);
    } catch (err: any) {
      if (err?.message === "RATE_LIMIT") {
        const remaining = err.remaining ?? "—";
        const reset = err.reset
          ? new Date(err.reset).toLocaleTimeString()
          : "later";
        toast.error(`Rate limit hit. Remaining: ${remaining} • Resets: ${reset}`);
      } else {
        toast.error(`Failed to create spec: ${String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className={`rounded-2xl shadow-sm h-full min-h-[240px] ${className ?? ""}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Describe task</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe what you want to automate…"
          className="min-h-[140px] resize-y"
        />
        <div className="flex flex-wrap gap-4">
          {ALL_CHANNELS.map((c) => (
            <label key={c} className="flex items-center gap-2">
              <Checkbox
                checked={channels.includes(c)}
                onCheckedChange={() => toggleChannel(c)}
                id={`ch-${c}`}
              />
              <Label htmlFor={`ch-${c}`} className="cursor-pointer">
                {c}
              </Label>
            </label>
          ))}
        </div>
        <Button onClick={onSubmit} disabled={loading} className="w-full">
          <Wand2 className="h-4 w-4 mr-2" />
          {loading ? "Creating spec…" : "Create Spec"}
        </Button>
      </CardContent>
    </Card>
  );
}

