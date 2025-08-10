// Base64 GA key on Vercel: file paths are awkward in serverless hence this helper
export function resolveKeyFile(v?: string): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("base64:")) {
    const raw = Buffer.from(v.slice(7), "base64").toString("utf8");
    const p = "/tmp/ga-sa.json";
    require("fs").writeFileSync(p, raw, "utf8");
    return p;
  }
  return v; // assume path
}