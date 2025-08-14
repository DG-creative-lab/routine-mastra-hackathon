import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "@/components/theme-provider"; // default import
import AppHeader from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Meta Template Builder",
  description: "Generate Mastra-ready templates from natural-language specs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Prefer public (if provided) so previews can override, otherwise fall back to server envs
  const model =
    process.env.NEXT_PUBLIC_LLM_MODEL ||
    process.env.LLM_MODEL ||
    process.env.OPENAI_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "unknown";

  // Demo flag: accept either public or server var
  const rawDemo =
    process.env.NEXT_PUBLIC_DEMO_MODE ?? process.env.DEMO_MODE ?? "false";
  const demo =
    typeof rawDemo === "string"
      ? rawDemo.toLowerCase() === "true"
      : Boolean(rawDemo);

  // Optional: auto-enable demo when no LLM key is configured
  const noKeys =
    !process.env.LLM_API_KEY &&
    !process.env.OPENAI_API_KEY &&
    !process.env.OPENROUTER_API_KEY;
  const effectiveDemo = demo || noKeys;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AppHeader model={model} demo={effectiveDemo} />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
