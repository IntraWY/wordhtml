"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredTheme, setStoredTheme } from "./ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme();
    if (stored) {
      setTheme(stored);
    }
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    setStoredTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "light" ? "โหมดมืด (Dark mode)" : "โหมดสว่าง (Light mode)"}
      aria-label={theme === "light" ? "โหมดมืด (Dark mode)" : "โหมดสว่าง (Light mode)"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
        className
      )}
    >
      {mounted ? (
        theme === "light" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )
      ) : (
        <Sun className="size-4" />
      )}
    </button>
  );
}
