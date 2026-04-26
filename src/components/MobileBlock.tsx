"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor } from "lucide-react";

import { Button } from "@/components/ui/Button";

const BREAKPOINT_PX = 768;

/**
 * Full-viewport overlay shown on screens narrower than 768px.
 *
 * The editor needs both panes side-by-side to be useful, so on mobile we
 * direct users back to the marketing pages and ask them to come back on a
 * desktop browser.
 */
export function MobileBlock() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT_PX - 1}px)`);
    const update = () => setBlocked(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-[color:var(--color-background)] px-8 text-center">
      <Monitor className="size-12 text-[color:var(--color-muted-foreground)]" />
      <div className="max-w-sm">
        <h2 className="text-2xl font-semibold tracking-tight">
          wordhtml works best on desktop
        </h2>
        <p className="mt-3 text-[color:var(--color-muted-foreground)]">
          The visual editor and A4 preview need a wider screen than your phone has. Open this page on a desktop or laptop browser to use the editor.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="secondary">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild>
          <Link href="/help">Read the docs</Link>
        </Button>
      </div>
    </div>
  );
}
