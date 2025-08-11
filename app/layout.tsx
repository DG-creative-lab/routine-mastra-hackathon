import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import AppHeader from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Meta Template Builder",
  description: "Generate Mastra-ready templates from natural-language specs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const model = process.env.NEXT_PUBLIC_LLM_MODEL ?? "unknown";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AppHeader model={model} demo={demo} />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}

