import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-border)] py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 sm:grid-cols-2 sm:items-start">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--color-accent)] text-[11px] font-bold text-[color:var(--color-accent-foreground)]">
            wh
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold tracking-tight">
              wordhtml
            </p>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              แปลง Word ↔ HTML ในเบราว์เซอร์
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:justify-self-end">
          <nav className="flex flex-col gap-2 text-sm text-[color:var(--color-muted-foreground)]">
            <Link
              href="/"
              className="transition-colors hover:text-[color:var(--color-foreground)]"
            >
              โปรแกรมแก้ไข
            </Link>
            <Link
              href="/help"
              className="transition-colors hover:text-[color:var(--color-foreground)]"
            >
              วิธีใช้
            </Link>
          </nav>
          <nav className="flex flex-col gap-2 text-sm text-[color:var(--color-muted-foreground)]">
            <a
              href="https://github.com"
              className="transition-colors hover:text-[color:var(--color-foreground)]"
              rel="noreferrer"
            >
              GitHub
            </a>
            <span className="text-xs text-[color:var(--color-muted-foreground)]">
              ไม่มีการติดตาม · ไม่มี Cookie · ไม่มีการอัปโหลด
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
