"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

const NAV = [
  { href: "/", label: "Builder" },
  { href: "/about", label: "About" },   // docs/how-to
];

export default function AppHeader({
  model = "unknown",
  demo = false,
}: { model?: string; demo?: boolean }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="mx-auto max-w-7xl px-4 h-12 flex items-center gap-3">
        {/* Brand */}
        <Link href="/" className="font-semibold tracking-tight">
          Meta Template Builder for LLM Agents
        </Link>

        {/* Demo chip */}
        {demo && (
          <Badge variant="secondary" className="ml-1">Demo mode</Badge>
        )}

        {/* Nav */}
        <nav className="ml-4 hidden sm:flex items-center gap-2">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-1 rounded-md text-sm transition-colors
                  ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline">Model: {model ?? "unknown"}</Badge>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setTheme(next)}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}