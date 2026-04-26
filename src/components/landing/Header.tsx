import Link from "next/link";

import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--color-border)]/60 bg-[color:var(--color-background)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)] text-xs font-bold tracking-tighter">
            wh
          </span>
          <span className="text-sm font-semibold tracking-tight">wordhtml</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-[color:var(--color-muted-foreground)] sm:flex">
          <Link
            href="/help"
            className="transition-colors hover:text-[color:var(--color-foreground)]"
          >
            วิธีใช้
          </Link>
          <a
            href="https://github.com"
            className="transition-colors hover:text-[color:var(--color-foreground)]"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <Button asChild size="sm">
          <Link href="/app">เปิดโปรแกรมแก้ไข</Link>
        </Button>
      </div>
    </header>
  );
}
