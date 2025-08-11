import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    DEMO_MODE: !!process.env.DEMO_MODE,
    LLM_MODEL: process.env.LLM_MODEL ?? "unknown",
  });
}
