// Back-compat wrapper so other modules can import from "scaffolder"
// without pulling the wrong types. Prefer importing from "./index".
export { buildFromPlan } from "./index";
export * from "./types";