interface FaqItem {
  question: string;
  answer: string;
}

const items: FaqItem[] = [
  {
    question: "มีการอัปโหลดข้อมูลไปยังเซิร์ฟเวอร์หรือไม่?",
    answer:
      "ไม่. wordhtml ทำงานทั้งหมดในเบราว์เซอร์ของคุณ เอกสาร เนื้อหาที่วาง และไฟล์ที่ส่งออกไม่เคยออกจากเครื่องของคุณ เว็บไซต์นี้เป็น static bundle — เมื่อโหลดครั้งแรกแล้วสามารถใช้งานออฟไลน์ได้",
  },
  {
    question: "รองรับไฟล์ประเภทใดบ้าง?",
    answer:
      "นำเข้า: ไฟล์ Microsoft Word .docx และ .html รวมถึงการวางจาก Word, Google Docs หรือแหล่งอื่น ๆ ส่งออก: .html ที่สะอาด, .zip พร้อมรูปภาพที่แยก หรือ .docx สำหรับ Microsoft Word และ LibreOffice",
  },
  {
    question: "ทำไมเนื้อหาที่วางจาก Word ดูแตกต่างไปบ้าง?",
    answer:
      "เมื่อวางจาก Word หรือ Google Docs เบราว์เซอร์จะได้รับ HTML ที่มี mso-* styles, span wrappers และ conditional comments จำนวนมาก wordhtml จะลบสิ่งเหล่านี้ออกเมื่อวาง เพื่อให้คุณเริ่มต้นด้วย semantic markup ที่สะอาด",
  },
  {
    question: "ตัวทำความสะอาดทำงานระหว่างแก้ไขหรือไม่?",
    answer:
      "ไม่ — ตัวทำความสะอาดจะทำงานเฉพาะเมื่อคุณกด ส่งออก เท่านั้น ซึ่งทำให้การแก้ไขเร็ว และให้คุณสลับตัวเลือกได้โดยไม่กระทบงาน",
  },
  {
    question: "การตั้งค่าตัวทำความสะอาดถูกบันทึกไว้ที่ไหน?",
    answer:
      "การตั้งค่าตัวทำความสะอาดและโหมดรูปภาพถูกบันทึกใน localStorage ของเบราว์เซอร์ เพื่อให้คืนค่าในการใช้งานครั้งต่อไป ตัวเอกสารไม่ถูกบันทึก (ตั้งใจออกแบบเพื่อความเป็นส่วนตัว)",
  },
  {
    question: "ทำไมไฟล์ .docx ที่ส่งออกบางครั้งดูเรียบง่ายใน Google Docs?",
    answer:
      "wordhtml ใช้เทคนิค altchunks เพื่อห่อ HTML ไว้ในเอกสาร Word Microsoft Word และ LibreOffice แสดงผลได้สมบูรณ์ แต่ Google Docs จะแสดงเนื้อหาพร้อมใช้ style ของตัวเอง สำหรับผลลัพธ์ที่ดีที่สุดใน Google Docs ให้ส่งออกเป็น .html แล้ว import เข้า Docs",
  },
];

export function FAQ() {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">คำถามที่พบบ่อย</h2>
      <div className="mt-6 divide-y divide-[color:var(--color-border)] rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)]">
        {items.map(({ question, answer }) => (
          <details
            key={question}
            className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold tracking-tight">
              {question}
              <span
                aria-hidden
                className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)] transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-muted-foreground)]">
              {answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
