import OpenAI from "openai";

export const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";

export const LLM_MODEL =
  process.env.LLM_MODEL || "openrouter/auto"; // pick any default you like

export function getLLM(): OpenAI {
  // Prefer generic LLM_API_KEY, then OPENROUTER_API_KEY as fallback
  const apiKey =
    process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || "";

  if (!apiKey) {
    throw new Error(
      "Missing LLM_API_KEY (or OPENROUTER_API_KEY). Set an API key in your env."
    );
  }

  return new OpenAI({
    baseURL: LLM_BASE_URL,
    apiKey,
  });
}