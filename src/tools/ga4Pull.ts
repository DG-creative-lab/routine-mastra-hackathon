import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GoogleAuth } from "google-auth-library";
import { z } from "zod";

/*──────────────────────────────────────────────────────────────┐
  Env vars expected (see .env.example)
 └──────────────────────────────────────────────────────────────*/
const PROPERTY_ID = process.env.GA4_PROPERTY_ID!;
const KEY_FILE    = process.env.GA4_KEY_FILE!;          
const DEFAULT_METRICS     = (process.env.GA4_DEFAULT_METRICS     ?? "totalRevenue").split(",");
const DEFAULT_DIMENSIONS  = (process.env.GA4_DEFAULT_DIMENSIONS  ?? "date").split(",");

/*──────────────────────────────────────────────────────────────┐
  Zod schema for runtime validation of tool inputs
 └──────────────────────────────────────────────────────────────*/
export const inputSchema = z.object({
  lookbackDays : z.number().int().min(1).max(30).default(1),
  metrics      : z.array(z.string()).optional(),
  dimensions   : z.array(z.string()).optional(),
});

export type Ga4PullInput = z.infer<typeof inputSchema>;

export type Ga4Row = Record<string, string | number>;

/*──────────────────────────────────────────────────────────────┐
  Helper – convert GA row → keyed object
 └──────────────────────────────────────────────────────────────*/
function rowToObject(headers: string[], row: any): Ga4Row {
  return headers.reduce((acc, key, idx) => {
    acc[key] = row.dimensionValues?.[idx]?.value
             ?? row.metricValues?.[idx]?.value
             ?? null;
    return acc;
  }, {} as Ga4Row);
}

/*──────────────────────────────────────────────────────────────┐
  The actual Mastra tool – *one function = one node*
 └──────────────────────────────────────────────────────────────*/
export async function ga4Pull(input: Ga4PullInput): Promise<Ga4Row[]> {
  // 1. Validate & fill defaults
  const { lookbackDays, metrics, dimensions } = inputSchema.parse(input);

  // 2. Date range
  const end   = new Date();
  const start = new Date();
  start.setDate(end.getDate() - lookbackDays);

  const fmt = (d: Date) => d.toISOString().substring(0, 10);

  // 3. Auth & client
  const auth    = new GoogleAuth({ keyFile: KEY_FILE, scopes: ["https://www.googleapis.com/auth/analytics.readonly"] });
  const client  = new BetaAnalyticsDataClient({ auth });

  // 4. Call GA Data API
  const [response] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
    metrics:    (metrics    ?? DEFAULT_METRICS).map(name => ({ name })),
    dimensions: (dimensions ?? DEFAULT_DIMENSIONS).map(name => ({ name })),
  });

  const headers: string[] = [
  ...(response.dimensionHeaders ?? []).map(h => h.name),
  ...(response.metricHeaders    ?? []).map(h => h.name),
].filter(Boolean) as string[];   

  // 5. Convert rows
  return (response.rows ?? []).map(r => rowToObject(headers, r));
}