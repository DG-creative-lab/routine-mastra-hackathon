"use client";
import { useRef, useState } from "react";
import { postGenerateUpload } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

type Props = {
  onGenerated: (res: { runId: string; tree: any }) => void;
  onPreviewSpec?: (spec: unknown) => void;
};

export default function UploadSpec({ onGenerated, onPreviewSpec }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [variables, setVariables] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a requirements.json");
      return;
    }

    const form = new FormData();
    form.append("requirements", file);
    if (variables.trim()) form.append("variables", variables.trim());

    setLoading(true);
    try {
      if (onPreviewSpec) {
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          onPreviewSpec(json);
        } catch {
          /* ignore preview parse errors */
        }
      }

      const res = await postGenerateUpload(form);
      toast.success("Template ready • download or explore files");
      onGenerated(res);
    } catch (e) {
      toast.error("Generate failed", { description: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="glass soft-shadow">
      <CardHeader className="pb-3">
        <div className="text-base font-medium">Upload spec</div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white hover:file:bg-slate-800"
        />
        <Textarea
          placeholder='Optional variables JSON (e.g. {"GOOGLE_ADS_CUSTOMER_ID":"..."} )'
          value={variables}
          onChange={(e) => setVariables(e.target.value)}
          className="min-h-[100px]"
        />
        <Button onClick={onSubmit} disabled={loading} className="w-full">
          <UploadCloud className="h-4 w-4 mr-2" />
          {loading ? "Generating…" : "Generate from file"}
        </Button>
      </CardContent>
    </Card>
  );
}
