import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "ความเป็นส่วนตัว",
  description:
    "wordhtml ประมวลผลเอกสารทั้งหมดในเบราว์เซอร์ของคุณ ไม่มีการอัปโหลด ไม่มี tracker — นี่คือคำอธิบายว่าข้อมูลของคุณอยู่ที่ไหน",
};

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-muted-foreground)]">
        {children}
      </p>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">
        <section className="border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] py-16">
          <div className="mx-auto max-w-3xl px-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1 text-xs font-medium text-[color:var(--color-muted-foreground)]">
              <ShieldCheck className="size-3.5 text-[color:var(--color-success)]" />
              ทุกอย่างทำงานในเบราว์เซอร์ของคุณ
            </span>
            <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              ความเป็นส่วนตัว (Privacy)
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[color:var(--color-muted-foreground)]">
              wordhtml ออกแบบให้เป็นเครื่องมือที่เคารพความเป็นส่วนตัว — เอกสารของคุณไม่เคยถูกส่งออกจากเครื่อง
            </p>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
          <Item title="การประมวลผลทั้งหมดอยู่ในเบราว์เซอร์">
            การแปลง Word ↔ HTML, การทำความสะอาด และการส่งออก (.html, .zip, .docx, Markdown, PDF)
            ทำงานในเครื่องของคุณทั้งหมด ไม่มีเซิร์ฟเวอร์ ไม่มี API ที่รับเอกสาร — ไฟล์ที่คุณเปิดหรือวาง
            ไม่ถูกอัปโหลดไปที่ใด
          </Item>

          <Item title="ไม่มีการติดตามและไม่มีบัญชีผู้ใช้ที่บังคับ">
            ไม่มี analytics, ไม่มี cookie เพื่อการโฆษณา และไม่มี third-party tracker
            การใช้งานหลักไม่ต้องลงทะเบียนหรือเข้าสู่ระบบ
          </Item>

          <Item title="ประวัติเอกสาร (History) เก็บเฉพาะในเครื่องนี้">
            สแน็ปช็อตของเอกสาร (สูงสุด 20 รายการ) ถูกเก็บใน <code>localStorage</code> ของเบราว์เซอร์เครื่องนี้เท่านั้น
            ไม่ซิงก์ข้ามอุปกรณ์ และจะหายหากคุณล้างข้อมูลเบราว์เซอร์ ตัวเอกสารที่กำลังแก้ไขจะหายเมื่อรีโหลด
            โดยตั้งใจ เพื่อความเป็นส่วนตัว — ใช้ปุ่มส่งออกหรือบันทึกเป็น Template เพื่อเก็บงาน
          </Item>

          <Item title="Templates บนคลาวด์ (เมื่อเปิดใช้ Firebase และเข้าสู่ระบบ)">
            หากผู้ดูแลตั้งค่า Firebase ไว้ คุณสามารถบันทึกเอกสารเป็น Template บนคลาวด์ได้
            โดยจะถูกเก็บแยกตามผู้ใช้ที่เส้นทาง <code>users/&#123;uid&#125;/templates</code> หลังเข้าสู่ระบบด้วย Google
            เฉพาะคุณเท่านั้นที่อ่าน/เขียน Template ของตนเองได้ หากไม่ตั้งค่า Firebase ฟีเจอร์นี้จะถูกปิด
            และทุกอย่างยังคงเป็น local-only
          </Item>

          <Item title="คุณควบคุมข้อมูลของคุณ">
            ล้างประวัติได้จากแผงประวัติ, ลบ Template ได้จากแผง Template และส่งออก/นำเข้าเป็น JSON
            เพื่อสำรองหรือย้ายงานได้ตลอดเวลา
          </Item>

          <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
            <div className="mb-4 border-l-2 border-[color:var(--color-accent)] pl-4">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                พร้อมเริ่มใช้งานแล้ว
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
                เปิดโปรแกรมแก้ไขแล้วเริ่มทำงานได้ทันที — ไม่ต้องสมัคร ไม่ต้องอัปโหลด
              </p>
            </div>
            <div className="mt-4">
              <Button asChild>
                <Link href="/">
                  เปิดโปรแกรมแก้ไข
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
