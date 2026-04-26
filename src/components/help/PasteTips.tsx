import { Lightbulb } from "lucide-react";

interface Tip {
  title: string;
  body: string;
}

const tips: Tip[] = [
  {
    title: "วางจาก Word ได้เลย",
    body: "เนื้อหาที่คัดลอกจาก Word จะมี mso-* styles, MsoNormal classes, conditional comments และ XML namespaces ปะปนมา wordhtml จะลบสิ่งเหล่านี้ออกอัตโนมัติ",
  },
  {
    title: "วางจาก Google Docs รักษา heading ไว้",
    body: "Google Docs ให้ HTML ที่สะอาดกว่า Word มาก ผลลัพธ์มักต้องการตัวทำความสะอาดเพียง 1-2 ตัว (โดยทั่วไปคือ แท็กว่าง + class) ก่อนส่งออก",
  },
  {
    title: "รูปภาพติดมาด้วยเมื่อวาง",
    body: "รูปภาพ inline จะถูกเก็บเป็น base64 data URI ในโปรแกรมแก้ไข เลือก Inline เมื่อส่งออกเพื่อฝังรูป หรือ แยกไฟล์ เพื่อแยกรูปออกไปใน ZIP",
  },
  {
    title: "ตารางวางได้ แต่รูปแบบซับซ้อนอาจไม่ครบ",
    body: "ตารางธรรมดาแปลงได้ดี แต่ตารางที่มีสไตล์ซับซ้อน columns หรือ text boxes อาจสูญหาย — แนะนำให้จัดสไตล์เพิ่มเติมหลังส่งออกในสภาพแวดล้อมปลายทาง",
  },
  {
    title: "การ Round-trip HTML → DOCX → HTML",
    body: "การผ่าน Word จะลบ CSS ส่วนใหญ่ออก ถ้าวางแผน round-trip ให้ใช้ markup ที่มี semantic (h1, p, ul) และให้ปลายทางใส่ style เอง",
  },
];

export function PasteTips() {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">เคล็ดลับการวางและจัดรูปแบบ</h2>
      <ul className="mt-6 grid gap-3">
        {tips.map(({ title, body }) => (
          <li
            key={title}
            className="flex gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-5"
          >
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-[color:var(--color-foreground)]" />
            <div>
              <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--color-muted-foreground)]">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
