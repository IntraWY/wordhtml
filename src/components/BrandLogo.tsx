"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_VERSION, APP_VERSION_LABEL } from "@/lib/version";

export interface BrandLogoProps {
  className?: string;
  showVersion?: boolean;
  asLink?: boolean;
  size?: "sm" | "md";
  wordmark?: string;
}

export function BrandLogo({
  className,
  showVersion = false,
  asLink = true,
  size = "md",
  wordmark = "wordhtml",
}: BrandLogoProps) {
  const markSize = size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs";
  const wordSize = size === "sm" ? "text-xs" : "text-sm";

  const content = (
    <>
      <span
        className={cn(
          "grid place-items-center rounded-md border bg-[color:var(--color-surface)] font-display font-semibold tracking-[-0.04em] text-[color:var(--color-foreground)]",
          markSize
        )}
        style={{
          borderColor: "color-mix(in srgb, var(--color-accent) 45%, var(--color-border))",
          boxShadow: "0 1px 0 rgba(255,255,255,0.55) inset",
        }}
        aria-hidden
      >
        wh
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-[-0.02em] text-[color:var(--color-foreground)]",
          wordSize
        )}
      >
        {wordmark}
      </span>
      {showVersion && (
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium text-[color:var(--color-muted-foreground)] bg-[color:var(--color-muted)]"
          title={APP_VERSION_LABEL}
          aria-label={`เวอร์ชัน (Version) ${APP_VERSION}`}
        >
          v{APP_VERSION}
        </span>
      )}
    </>
  );

  const wrapperClass = cn("flex items-center gap-2", className);

  if (asLink) {
    return (
      <Link href="/" className={wrapperClass}>
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
