import { ClipboardPaste, ListChecks, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    icon: ClipboardPaste,
    title: "วางหรืออัปโหลด",
    body: "วางจาก Word หรือ Google Docs หรือนำเข้าไฟล์ .docx / .html",
  },
  {
    icon: ListChecks,
    title: "เลือกตัวทำความสะอาด",
    body: "สลับเปิด/ปิดการแปลงที่ต้องการ — การตั้งค่าจะถูกจดจำไว้",
  },
  {
    icon: Download,
    title: "ส่งออกทุกที่",
    body: "รับ .html ที่สะอาด, .zip พร้อมรูปภาพที่แยก หรือ .docx ใหม่",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            วิธีใช้งาน
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            3 ขั้นตอน ง่ายมาก
          </h2>
        </div>
        <ol className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="relative flex flex-col gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[color:var(--color-accent)] text-xs font-semibold text-[color:var(--color-accent-foreground)]">
                  {index + 1}
                </span>
                <Icon className="size-5 text-[color:var(--color-muted-foreground)]" />
              </div>
              <h3 className="text-base font-semibold tracking-tight">{title}</h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-muted-foreground)]">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
