import path from "path";
import { buildFromPlan } from "./index";

(async () => {
  const planPath = path.resolve("meta-planner/plan.json");
  const outDir   = path.resolve("generated-templates/search-bid-guardian");

  const res = await buildFromPlan({
    planPath,
    outDir,
    title: "Search Bid Guardian (Generated)",
  });

  console.log("✅ Generated:", res);
})();