"use client";

import { useEffect } from "react";

const STORAGE_KEY = "wordhtml-theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#09090b" : "#ffffff");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
      if (stored) {
        applyTheme(stored);
      }
    } catch {
      // ignore localStorage errors
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        applyTheme(e.newValue as "light" | "dark");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <>{children}</>;
}

export function getStoredTheme(): "light" | "dark" | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
  } catch {
    return null;
  }
}

export function setStoredTheme(theme: "light" | "dark") {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore localStorage errors
  }
  applyTheme(theme);
}
