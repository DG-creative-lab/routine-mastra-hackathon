import { NextRequest, NextResponse } from "next/server";
import { TOOL_REGISTRY } from "@/template-builder/registry";

export const dynamic = "force-dynamic";

/** What we expose to the client */
export type ToolCatalogItem = {
  id: string;
  title: string;
  channel: "Search" | "DV360" | "Meta" | "AMC" | "Generic";
  description: string;
  examples?: string[];
  inputs_hint?: Record<string, string> | string;
  outputs_hint?: Record<string, string> | string;
};

const CHANNEL_OF: Record<string, ToolCatalogItem["channel"]> = {
  "ga4.pull": "Search",
  "gAds.updateBid": "Search",
  "dv360.fetchStats": "DV360",
  "dv360.patchDealBid": "DV360",
  "bigquery.logDealPatch": "DV360",
  "meta.pullAdsetMetrics": "Meta",
  "meta.swapCreative": "Meta",
  "amc.fetchPurchasers": "AMC",
  "compute.seedFormatter": "AMC",
  "amc.createLookAlike": "AMC",
  "amc.exportToAdsConsole": "AMC",
  "bigquery.logLookalikeBuild": "AMC",
};

const DESCRIPTIONS: Record<string, string> = {
  "ga4.pull": "Query GA4 via the Data API (metrics & dimensions; optional ROAS aggregate).",
  "gAds.updateBid": "Adjust a Google Ads campaign budget/bid by a % delta.",
  "dv360.fetchStats": "Fetch last-N-day average CPM per DV360 deal (BQ or demo fixtures).",
  "dv360.patchDealBid": "Patch a DV360 line item’s fixed CPM by %.",
  "bigquery.logDealPatch": "Log DV360 bid patches to BigQuery (or local demo logs).",
  "meta.pullAdsetMetrics": "Pull Meta ad set insights (frequency & reach) for fatigue checks.",
  "meta.swapCreative": "Swap the creative for a specific Ad (treated as AdSet in the plan).",
  "amc.fetchPurchasers": "Fetch purchaser IDs per SKU from AMC (or demo fixtures).",
  "compute.seedFormatter": "Normalize + hash/dedupe purchaser rows for AMC seed lists.",
  "amc.createLookAlike": "Create a look-alike audience from seed IDs in AMC (or demo fixture).",
  "amc.exportToAdsConsole": "Create a deep-link to Amazon Ads Console for the audience.",
  "bigquery.logLookalikeBuild": "Log AMC look-alike builds to BigQuery (or local demo logs).",
};

/** Allow either object hints or a single string shape (e.g. array item type) */
type IOHint = { inputs?: Record<string, string> | string; outputs?: Record<string, string> | string };

const IO_HINTS: Record<string, IOHint> = {
  "ga4.pull": {
    inputs: {
      lookbackDays: "number (1–30)",
      metrics: "string[] (optional)",
      dimensions: "string[] (optional)",
      computeRoas: "{ revenueMetric: string, costMetric: string } (optional)",
    },
    outputs: {
      headers: "string[]",
      rows: "Record<string, string|number|null>[]",
      roas: "number (optional)",
    },
  },
  "gAds.updateBid": {
    inputs: { campaignId: "number", percent: "number (-100..100)" },
    outputs: { oldMicros: "number", newMicros: "number" },
  },
  "dv360.fetchStats": {
    inputs: { dealIds: "string[]", lookbackDays: "number (1–90)" },
    outputs: "{ dealId: string, avgCpm: number }[]",
  },
  "dv360.patchDealBid": {
    inputs: { dealId: "string", percent: "number (-100..100)" },
    outputs: { oldMicros: "number", newMicros: "number" },
  },
  "bigquery.logDealPatch": {
    inputs: { lineItemId: "string", oldMicros: "number", newMicros: "number" },
    outputs: { success: "boolean" },
  },
  "meta.pullAdsetMetrics": {
    inputs: { adSetIds: "string[]" },
    outputs: "{ adSetId: string, frequency: number, audienceSize: number }[]",
  },
  "meta.swapCreative": {
    inputs: { adSetId: "string (treated as Ad ID)", creativeId: "string" },
    outputs: { success: "boolean" },
  },
  "amc.fetchPurchasers": {
    inputs: { skus: "string[]", lookbackDays: "number (1–90)" },
    outputs: "{ sku: string, purchaserIds: string[] }[]",
  },
  "compute.seedFormatter": {
    inputs: {
      purchasers: "array of rows (email/hashedEmail/deviceId/userId, etc.)",
      idField: "hashedEmail|email|deviceId|userId (default hashedEmail)",
      hashEmails: "boolean (default true)",
      dedupe: "boolean (default true)",
      minSeed: "number (default 100)",
      takeTopBy: "revenue|quantity (optional)",
      topN: "number (optional)",
    },
    outputs: {
      seedIds: "string[]",
      count: "number",
      stats: "object",
      preview: "string[]",
    },
  },
  "amc.createLookAlike": {
    inputs: {
      seedIds: "string[]",
      audienceName: "string",
      sizeMultiplier: "number (>=1)",
    },
    outputs: { audienceId: "string", status: "CREATING|READY|FAILED" },
  },
  "amc.exportToAdsConsole": {
    inputs: { audienceId: "string" },
    outputs: { exportUrl: "string (url)" },
  },
  "bigquery.logLookalikeBuild": {
    inputs: {
      audienceId: "string",
      seedCount: "number",
      lookalikeSize: "number (optional)",
      source: "string (default amc)",
      status: "created|exported|failed (default created)",
      advertiserId: "string (optional)",
      campaignId: "string (optional)",
      meta: "Record<string, any> (optional)",
      dryRun: "boolean (default false)",
    },
    outputs: { table: "string", insertId: "string", row: "object" },
  },
};

const EXAMPLES: Record<string, string[]> = {
  "ga4.pull": [
    "Pull last 7 days of totalRevenue by date and compute ROAS vs advertiserAdCost.",
    "Fetch sessions and purchases by source/medium for the last 3 days.",
  ],
  "gAds.updateBid": [
    "Lower campaign 123456 budget by 20%.",
    "Increase campaign 999999 budget by 10% if ROAS > 4.",
  ],
  "dv360.fetchStats": [
    "Get 7-day avg CPM for deals d-100, d-200, d-300.",
    "Fetch 30-day avg CPM per deal for dashboards.",
  ],
  "dv360.patchDealBid": [
    "Reduce fixed CPM for deal LI-123 by 15%.",
    "Raise fixed CPM for deal 987654 by 5%.",
  ],
  "meta.pullAdsetMetrics": [
    "Pull frequency and reach for ad sets 123, 456, 789.",
    "Get last hour reach/frequency for ad set 555.",
  ],
  "meta.swapCreative": [
    "Swap creative C-9999 into Ad 123456789.",
    "Rotate to backup creative C-B for Ad 321.",
  ],
  "amc.fetchPurchasers": [
    "Fetch 30-day purchasers for SKUs A123 and B456.",
    "Get 14-day purchasers for SKU Z999.",
  ],
  "compute.seedFormatter": [
    "Normalize purchaser rows to hashed emails (dedupe, minSeed 200).",
    "Build seed list by deviceId, take top 500 by revenue.",
  ],
  "amc.createLookAlike": [
    "Create a 2× look-alike named 'LAL_Summer_Promo' from provided seed IDs.",
  ],
  "amc.exportToAdsConsole": [
    "Generate Ads Console link for audience aud_12345.",
  ],
  "bigquery.logDealPatch": [
    "Log a DV360 patch: lineItem 123, from 2,000,000 → 1,800,000 micros.",
  ],
  "bigquery.logLookalikeBuild": [
    "Record LAL built for aud_123 with 150 seeds, status created.",
  ],
};

function toCatalogItem(regItem: (typeof TOOL_REGISTRY)[string]): ToolCatalogItem {
  const id = regItem.id;
  return {
    id,
    title: regItem.importName,
    channel: CHANNEL_OF[id] ?? "Generic",
    description: DESCRIPTIONS[id] ?? id,
    examples: EXAMPLES[id],
    inputs_hint: IO_HINTS[id]?.inputs,
    outputs_hint: IO_HINTS[id]?.outputs,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const channelFilter = (searchParams.get("channel") || "").trim();

  const all = Object.values(TOOL_REGISTRY).map(toCatalogItem);

  const filtered = all.filter((t) => {
    const matchQ =
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q);
    const matchChannel = !channelFilter || t.channel === channelFilter;
    return matchQ && matchChannel;
  });

  filtered.sort((a, b) =>
    a.channel === b.channel ? a.id.localeCompare(b.id) : a.channel.localeCompare(b.channel)
  );

  return NextResponse.json({ tools: filtered });
}

export async function HEAD() {
  return new Response(null, { status: 204 });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Allow": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    },
  });
}