import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { FAQ } from "@/components/help/FAQ";
import { CleanerExplainers } from "@/components/help/CleanerExplainers";
import { PasteTips } from "@/components/help/PasteTips";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "วิธีใช้",
  description:
    "วิธีการทำงานของ wordhtml — อธิบายตัวทำความสะอาด 8 แบบ เคล็ดลับการวาง และคำถามที่พบบ่อย",
};

export default function HelpPage() {
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
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              วิธีการทำงานของ wordhtml
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[color:var(--color-muted-foreground)]">
              อ้างอิงสำหรับตัวทำความสะอาด 8 แบบ พฤติกรรมการวาง และคำถามที่พบบ่อย หากไม่พบคำตอบที่นี่ อาจเป็น edge case ใหม่ — แจ้งได้ที่ GitHub
            </p>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-16 px-6 py-16">
          <CleanerExplainers />
          <PasteTips />
          <FAQ />

          <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              พร้อมลองใช้งานแล้วหรือยัง?
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
              เปิดโปรแกรมแก้ไขและวางเอกสาร ตัวทำความสะอาดทำงานเฉพาะเมื่อส่งออก จึงปลอดภัยที่จะทดลอง
            </p>
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
