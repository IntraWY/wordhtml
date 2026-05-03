import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-border)] py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[color:var(--color-accent)] text-[10px] font-bold text-[color:var(--color-accent-foreground)]">
            wh
          </span>
          <p className="text-sm">
            <span className="font-semibold">wordhtml</span>
            <span className="ml-2 text-[color:var(--color-muted-foreground)]">
              · แปลง Word ↔ HTML ในเบราว์เซอร์
            </span>
          </p>
        </div>
        <nav className="flex items-center gap-6 text-sm text-[color:var(--color-muted-foreground)]">
          <Link
            href="/help"
            className="transition-colors hover:text-[color:var(--color-foreground)]"
          >
            วิธีใช้
          </Link>
          <Link
            href="/"
            className="transition-colors hover:text-[color:var(--color-foreground)]"
          >
            โปรแกรมแก้ไข
          </Link>
          <a
            href="https://github.com"
            className="transition-colors hover:text-[color:var(--color-foreground)]"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <p className="text-xs text-[color:var(--color-muted-foreground)]">
          ไม่มีการติดตาม · ไม่มี Cookie · ไม่มีการอัปโหลด
        </p>
      </div>
    </footer>
  );
}
