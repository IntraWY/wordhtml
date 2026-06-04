"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const faqs: FAQItem[] = [
  {
    q: "ข้อมูลของฉันไปที่ไหน?",
    a: "ไม่ไปที่ไหนเลย — การแปลงทั้งหมดเกิดขึ้นในเบราว์เซอร์ของคุณ ไฟล์ไม่ถูกอัปโหลดไปยังเซิร์ฟเวอร์ใดทั้งสิ้น เหมาะสำหรับเอกสารที่มีข้อมูลส่วนตัวหรือเป็นความลับ",
  },
  {
    q: "รองรับภาษาไทยไหม?",
    a: "รองรับเต็มรูปแบบ — editor ใช้ฟอนต์ TH Sarabun PSK เป็นค่าเริ่มต้น รองรับการพิมพ์ภาษาไทย และ export ออกมาเป็น HTML, .docx, หรือ PDF ที่แสดงผลภาษาไทยได้ถูกต้อง",
  },
  {
    q: "ต้องสมัครสมาชิกหรือเสียเงินไหม?",
    a: "ฟรีทั้งหมด ไม่ต้องสมัครสมาชิก ไม่มีการเก็บข้อมูล ไม่มีโฆษณา ใช้ได้ทันทีในเบราว์เซอร์",
  },
  {
    q: "ส่งออกได้รูปแบบอะไรบ้าง?",
    a: "ส่งออกได้ 5 รูปแบบ: HTML ที่สะอาด, ZIP พร้อมรูปภาพแยกไฟล์, .docx (Word), Markdown, และ PDF — เลือกตามการใช้งานจริงได้เลย",
  },
  {
    q: "ใช้ออฟไลน์ได้ไหม?",
    a: "ได้ — หลังจากโหลดครั้งแรก แอปจะ cache ไว้ในเบราว์เซอร์ สามารถใช้งานได้แม้ไม่มีอินเทอร์เน็ต",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            FAQ
          </p>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            คำถามที่พบบ่อย
          </h2>
        </div>
        <dl className="divide-y divide-[color:var(--color-border)]">
          {faqs.map(({ q, a }, i) => (
            <div key={q} className="py-4">
              <dt>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-sm font-semibold transition-colors duration-150 hover:text-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2"
                >
                  {q}
                  <ChevronDown
                    className={`size-4 shrink-0 text-[color:var(--color-muted-foreground)] transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                  />
                </button>
              </dt>
              {open === i && (
                <dd className="mt-3 text-sm leading-relaxed text-[color:var(--color-muted-foreground)]">
                  {a}
                </dd>
              )}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
