"use client";
import { useEffect, useState } from "react";
import { getEnv } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export default function GlobalBanner() {
  const [demo, setDemo] = useState(false);
  const [model, setModel] = useState<string>("");

  useEffect(() => {
    getEnv()
      .then((env) => {
        setDemo(!!env.DEMO_MODE);
        setModel(env.LLM_MODEL);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between">
        <div className="font-medium">Meta Template Builder</div>
        <div className="flex items-center gap-2">
          {demo && <Badge variant="secondary">Demo Mode</Badge>}
          {model && <Badge variant="outline">Model: {model}</Badge>}
        </div>
      </div>
    </div>
  );
}
