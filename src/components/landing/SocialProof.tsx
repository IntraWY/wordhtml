import { Code2, PenLine, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface UseCase {
  icon: LucideIcon;
  role: string;
  quote: string;
  detail: string;
}

const useCases: UseCase[] = [
  {
    icon: Code2,
    role: "นักพัฒนาเว็บ",
    quote: "เอา HTML จาก CMS มาทำความสะอาดได้เลย ไม่ต้องเขียน regex เอง",
    detail: "ลบ inline styles + class ที่ไม่จำเป็นออกในคลิกเดียว",
  },
  {
    icon: PenLine,
    role: "นักเขียน Content",
    quote: "พิมพ์ใน Word แล้วแปลงเป็น HTML สะอาดสำหรับ blog ได้ทันที",
    detail: "ฟอร์แมตยังอยู่ครบ ไม่มีขยะ mso-* ติดมาด้วย",
  },
  {
    icon: Users,
    role: "ทีม Marketing",
    quote: "ส่ง .docx ให้ลูกค้าได้เลยหลังแก้ใน editor — ไม่ต้องเปิด Word",
    detail: "export เป็น .docx ที่เปิดได้บน Word และ Google Docs",
  },
];

export function SocialProof() {
  return (
    <section className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            ใครใช้บ้าง
          </p>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            เหมาะกับทุกคนที่ทำงานกับ HTML
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {useCases.map(({ icon: Icon, role, quote, detail }) => (
            <figure
              key={role}
              className="flex flex-col gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-6 shadow-sm shadow-black/5 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/5"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]">
                  <Icon className="size-5" />
                </span>
                <figcaption className="text-sm font-semibold">{role}</figcaption>
              </div>
              <blockquote className="text-sm leading-relaxed text-[color:var(--color-foreground)]">
                &ldquo;{quote}&rdquo;
              </blockquote>
              <p className="mt-auto text-xs text-[color:var(--color-muted-foreground)]">
                {detail}
              </p>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
