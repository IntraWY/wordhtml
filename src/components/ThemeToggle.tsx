"use client";

import { useSyncExternalStore } from "react";
import { useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredTheme, setStoredTheme } from "./ThemeProvider";

function getServerSnapshot() {
  return false;
}

function getClientSnapshot() {
  return true;
}

function subscribe() {
  return () => {};
}

export function ThemeToggle({ className }: { className?: string }) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return getStoredTheme() ?? "light";
  });

  const toggle = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    setStoredTheme(next);
  }, [theme]);

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
