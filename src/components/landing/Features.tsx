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
    body: "การแปลงไฟล์ทำงานทั้งหมดในเบราว์เซอร์โดยใช้ mammoth.js และ html-docx-js เอกสารไม่เคยส่งถึงเซิร์ฟเวอร์",
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
    <section className="border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            ความสามารถ
          </p>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            เครื่องมือเฉพาะทาง ไม่ใช่โปรแกรมแก้ไขทั่วไป
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-muted-foreground)]">
            ออกแบบมาเพื่อ “แปลง + ทำความสะอาด” โดยเฉพาะ ด้วยการควบคุมที่ละเอียด และผลลัพธ์ที่นำไปใช้งานจริงได้ทันที
          </p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-border)] sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group flex flex-col gap-3 bg-[color:var(--color-background)] p-7 transition-[background-color,transform] duration-200 ease-out hover:bg-[color:var(--color-surface)] hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] shadow-sm shadow-black/5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
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
