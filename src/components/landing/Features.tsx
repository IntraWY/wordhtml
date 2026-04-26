import { Lock, Sparkles, FileDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const features: Feature[] = [
  {
    icon: Lock,
    title: "ออกแบบมาเพื่อความเป็นส่วนตัว",
    body: "การแปลงไฟล์ทำงานทั้งหมดในเบราว์เซอร์โดยใช้ mammoth.js และ html-to-docx เอกสารไม่เคยส่งถึงเซิร์ฟเวอร์",
  },
  {
    icon: Sparkles,
    title: "ตัวทำความสะอาด 8 แบบ",
    body: "ลบ inline styles, แท็กว่าง, class & ID, คอมเมนต์, span wrapper, attributes, ช่องว่างซ้ำ — เปิดเฉพาะที่ต้องการ",
  },
  {
    icon: FileDown,
    title: "ส่งออกได้ 3 รูปแบบ",
    body: "ดาวน์โหลด HTML ที่สะอาด, ZIP พร้อมรูปภาพที่แยกออกมา หรือ .docx ใหม่ — เลือกแบบ inline base64 หรือแยกไฟล์รูปภาพ",
  },
];

export function Features() {
  return (
    <section className="border-b border-[color:var(--color-border)] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            ความสามารถ
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            เครื่องมือเฉพาะทาง ไม่ใช่โปรแกรมแก้ไขทั่วไป
          </h2>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-border)] sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col gap-3 bg-[color:var(--color-background)] p-7"
            >
              <Icon className="size-5 text-[color:var(--color-foreground)]" />
              <h3 className="text-base font-semibold tracking-tight">{title}</h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-muted-foreground)]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
