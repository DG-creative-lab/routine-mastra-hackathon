
import dv360_low_impressions from "./dv360.fetchStats/low_impressions.json";

import meta_healthy  from "./meta.pullAdsetMetrics/healthy.json";
import meta_fatigues from "./meta.pullAdsetMetrics/fatigues.json";

import amc_create_baseline from "./amc.createLookAlike/baseline.json";
import amc_create_ok       from "./amc.createLookAlike/ok.json";

import amc_fetch_batch_small from "./amc.fetchPurchasers/batch_small.json";

import ga4_roas_day from "./ga4.pull/roas_day.json";

/**
 * Tool-id → variant-name → JSON payload
 * Keys here must match the tool ids used in your plan / tools.
 */
export const FIXTURES = {
  "dv360.fetchStats": {
    low_impressions: dv360_low_impressions,
  },
  "meta.pullAdsetMetrics": {
    healthy:  meta_healthy,
    fatigues: meta_fatigues,
  },
  "amc.createLookAlike": {
    baseline: amc_create_baseline,
    ok:       amc_create_ok,
  },
  "amc.fetchPurchasers": {
    batch_small: amc_fetch_batch_small,
  },
  "ga4.pull": {
    roas_day: ga4_roas_day,
  },
} as const;

export type FixtureToolId = keyof typeof FIXTURES;

export function listFixtureNames(toolId: FixtureToolId): string[] {
  return Object.keys(FIXTURES[toolId] ?? {});
}

export async function loadFixture<T = unknown>(
  toolId: FixtureToolId,
  variant: string
): Promise<T> {
  return (FIXTURES as any)[toolId]?.[variant];
}