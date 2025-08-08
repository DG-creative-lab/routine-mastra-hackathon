## Tools definitions

## Search bid guardian

| Step | Routine **tool** id            | Purpose                                                                                                                |
|------|--------------------------------|------------------------------------------------------------------------------------------------------------------------|
| ①    | ga4.pull                       | Fetch yesterday’s ROAS per campaign (already created in `ga4Pull.ts`).                                                |
| ②    | compute.check                  | Compare ROAS ↔ threshold and emit a flag (`"low"` or `"ok"`).                                                         |
| ③    | gAds.updateBid                 | Nudge bids by ± % when flag === `"low"` (or `"high"` if you add an upper guard).                                       |


## DV360 deal ptimiser
| Step | Routine tool id | Purpose |
|------|----------------|---------|
| ④ | dv360.fetchStats | Pull last N-day average CPM for each DV360 deal ID (via Display & Video 360 API). |
| ⑤ | compute.deltaCpm | Compute percent change between new and baseline CPM (ΔCPM = (current–baseline)/baseline × 100). |
| ⑥ | compute.checkInflation | Flag if ΔCPM exceeds the given inflation threshold (`"inflated"` or `"ok"`). |
| ⑦ | dv360.patchDealBid | Adjust a DV360 line-item's fixed CPM by the specified percent change. |
| ⑧ | bigquery.logDealPatch | Log every DV360 patch operation (deal ID, oldMicros, newMicros, timestamp) to BigQuery for off-policy evaluation. |


## Meta Fatigue Swapper — Tool Breakdown

| Step | Routine **tool** id         | Purpose                                                                                     |
|------|------------------------------|---------------------------------------------------------------------------------------------|
| ①    | meta.pullAdsetMetrics        | Pull each AdSet’s frequency and remaining audience size via the Meta Marketing API.        |
| ②    | compute.checkFatigue         | Compare `frequency` > threshold **OR** `audienceSize` < threshold; emit flag (`"fatigued"`/`"ok"`). |
| ③    | meta.swapCreative            | Swap in an existing creative for the given Ad via Meta Marketing API. |



## AMC Look-Alike Builder agent
| Step | Routine tool id | Purpose |
|------|----------------|---------|
| ① | amc.fetchPurchasers | Query AMC for the last 30 days' purchaser SKUs for each seed SKU. |
| ② | compute.seedFormatter | Normalize & dedupe the raw purchaser lists into a clean seed-audience payload. |
| ③ | amc.createLookAlike | Call AMC's Look-Alike API to spin up an audience ~2× the seed size. |
| ④ | amc.exportToAdsConsole | Push the newly created audience into Amazon Ads (Sponsored Products / DSP). |
| ⑤ | bigquery.logLookAlikeBuild | (Optional) Log seed size, final audience size & metadata to BigQuery for back-testing. |