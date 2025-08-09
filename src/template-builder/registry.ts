import type { ToolBinding } from "./types";

const TOOLS_BARREL_PATH = "../../src/tools";

export const TOOL_REGISTRY: Record<string, ToolBinding> = {
  // Search
  "ga4.pull": {
    id: "ga4.pull",
    importName: "ga4Pull",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await ga4Pull(${inputs})`,
  },
  "compute.check": {
    id: "compute.check",
    importName: "computeCheck",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await computeCheck.execute({ context: ${inputs} })`,
  },
  "gAds.updateBid": {
    id: "gAds.updateBid",
    importName: "gAdsUpdateBid",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await gAdsUpdateBid.execute({ context: ${inputs} })`,
  },

  // DV360
  "dv360.fetchStats": {
    id: "dv360.fetchStats",
    importName: "dv360FetchStats",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await dv360FetchStats.execute({ context: ${inputs} })`,
  },
  "compute.deltaCpm": {
    id: "compute.deltaCpm",
    importName: "computeDeltaCpm",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await computeDeltaCpm.execute({ context: ${inputs} })`,
  },
  "compute.checkInflation": {
    id: "compute.checkInflation",
    importName: "computeCheckInflation",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await computeCheckInflation.execute({ context: ${inputs} })`,
  },
  "dv360.patchDealBid": {
    id: "dv360.patchDealBid",
    importName: "dv360PatchDealBid",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await dv360PatchDealBid.execute({ context: ${inputs} })`,
  },
  "bigquery.logDealPatch": {
    id: "bigquery.logDealPatch",
    importName: "bigqueryLogDealPatch",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await bigqueryLogDealPatch.execute({ context: ${inputs} })`,
  },

  // Meta
  "meta.pullAdsetMetrics": {
    id: "meta.pullAdsetMetrics",
    importName: "metaPullAdsetMetrics",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await metaPullAdsetMetrics.execute({ context: ${inputs} })`,
  },
  "compute.checkFatigue": {
    id: "compute.checkFatigue",
    importName: "computeCheckFatigue",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await computeCheckFatigue.execute({ context: ${inputs} })`,
  },
  "meta.swapCreative": {
    id: "meta.swapCreative",
    importName: "metaSwapCreative",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await metaSwapCreative.execute({ context: ${inputs} })`,
  },

  // AMC
  "amc.fetchPurchasers": {
    id: "amc.fetchPurchasers",
    importName: "amcFetchPurchasers",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await amcFetchPurchasers.execute({ context: ${inputs} })`,
  },
  "compute.seedFormatter": {
    id: "compute.seedFormatter",
    importName: "computeSeedFormatter",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await computeSeedFormatter.execute({ context: ${inputs} })`,
  },
  "amc.createLookAlike": {
    id: "amc.createLookAlike",
    importName: "amcCreateLookAlike",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await amcCreateLookAlike.execute({ context: ${inputs} })`,
  },
  "amc.exportToAdsConsole": {
    id: "amc.exportToAdsConsole",
    importName: "amcExportToAdsConsole",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await amcExportToAdsConsole.execute({ context: ${inputs} })`,
  },
  "bigquery.logLookalikeBuild": {
    id: "bigquery.logLookalikeBuild",
    importName: "bigqueryLogLookalikeBuild",
    importPath: TOOLS_BARREL_PATH,
    invoke: (inputs) => `await bigqueryLogLookalikeBuild.execute({ context: ${inputs} })`,
  },
};