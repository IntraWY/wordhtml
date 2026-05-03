import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[color:var(--color-border)]">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 pt-20 pb-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-20 lg:pt-28 lg:pb-32">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1 text-xs font-medium text-[color:var(--color-muted-foreground)]">
            <ShieldCheck className="size-3.5 text-[color:var(--color-success)]" />
            ทำงาน 100% ในเบราว์เซอร์ · ไม่มีการอัปโหลดข้อมูล
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            แปลง Word เป็น HTML สะอาด ในเบราว์เซอร์ของคุณ
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[color:var(--color-muted-foreground)]">
            วางจาก Word หรืออัปโหลดไฟล์ .docx แก้ไขในโปรแกรมแก้ไขแบบ Visual พร้อม A4 Preview แล้วส่งออกเป็น HTML ที่สะอาด, ZIP หรือ .docx — โดยไฟล์ไม่เคยออกจากเครื่องของคุณ
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/">
                เปิดโปรแกรมแก้ไข
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/help">อ่านคู่มือ</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-[color:var(--color-muted-foreground)]">
            ฟรี · ไม่ต้องสมัครสมาชิก · ใช้งานออฟไลน์ได้หลังโหลดครั้งแรก
          </p>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute inset-x-12 -bottom-6 h-12 rounded-full bg-zinc-900/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_30px_60px_-25px_rgba(24,24,27,0.18)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-[5px] bg-[color:var(--color-accent)] text-[10px] font-bold text-[color:var(--color-accent-foreground)]">
              wh
            </span>
            <span className="text-xs font-semibold">wordhtml</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-[color:var(--color-muted)] px-2 py-1 text-[10px] font-medium text-[color:var(--color-muted-foreground)]">
              อัปโหลด
            </span>
            <span className="rounded-md bg-[color:var(--color-accent)] px-2 py-1 text-[10px] font-medium text-[color:var(--color-accent-foreground)]">
              ส่งออก HTML
            </span>
          </div>
        </div>
        {/* Cleaning chips */}
        <div className="flex flex-wrap gap-1.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-4 py-2">
          {[
            ["สไตล์ inline", true],
            ["แท็กว่าง", true],
            ["ช่องว่าง", false],
            ["Attributes", false],
            ["Class", false],
          ].map(([label, on]) => (
            <span
              key={label as string}
              className={
                on
                  ? "rounded-full bg-[color:var(--color-accent)] px-2.5 py-0.5 text-[10px] font-medium text-[color:var(--color-accent-foreground)]"
                  : "rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2.5 py-0.5 text-[10px] font-medium text-[color:var(--color-muted-foreground)]"
              }
            >
              {label as string}
              {on ? " ✓" : ""}
            </span>
          ))}
        </div>
        {/* Two pane */}
        <div className="grid grid-cols-2 gap-px bg-[color:var(--color-border)]">
          <div className="bg-[color:var(--color-background)] p-4">
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
              โปรแกรมแก้ไข
            </p>
            <div className="space-y-1.5">
              <div className="h-2.5 w-3/4 rounded-sm bg-[color:var(--color-foreground)]" />
              <div className="h-1.5 rounded-sm bg-[color:var(--color-border-strong)]" />
              <div className="h-1.5 w-11/12 rounded-sm bg-[color:var(--color-border-strong)]" />
              <div className="h-1.5 w-3/4 rounded-sm bg-[color:var(--color-border-strong)]" />
              <div className="mt-3 h-2 w-1/3 rounded-sm bg-[color:var(--color-foreground)]" />
              <div className="h-1.5 rounded-sm bg-[color:var(--color-border-strong)]" />
              <div className="h-1.5 w-5/6 rounded-sm bg-[color:var(--color-border-strong)]" />
            </div>
          </div>
          <div className="flex justify-center bg-[color:var(--color-muted)] p-4">
            <div className="aspect-[0.707] w-full max-w-[140px] rounded-sm bg-white p-3 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.18)]">
              <div className="mb-1.5 h-2 w-4/5 rounded-sm bg-[color:var(--color-foreground)]" />
              <div className="h-1 w-full rounded-sm bg-[color:var(--color-border)]" />
              <div className="mt-1 h-1 w-11/12 rounded-sm bg-[color:var(--color-border)]" />
              <div className="mt-1 h-1 w-2/3 rounded-sm bg-[color:var(--color-border)]" />
              <div className="mt-3 h-1.5 w-1/3 rounded-sm bg-[color:var(--color-foreground)]" />
              <div className="mt-1 h-1 rounded-sm bg-[color:var(--color-border)]" />
              <div className="mt-1 h-1 w-3/4 rounded-sm bg-[color:var(--color-border)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
