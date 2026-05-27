"use client";

export function SkipLink() {
  return (
    <a
      href="#editor-main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[color:var(--color-foreground)] focus:px-4 focus:py-2 focus:text-sm focus:text-[color:var(--color-background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
    >
      ข้ามไปเนื้อหาหลัก (Skip to editor)
    </a>
  );
}
