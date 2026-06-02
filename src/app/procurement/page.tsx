"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";

import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import { downloadDocx } from "@/lib/export/exportDocx";

type Stage = 1 | 2 | 3;

interface ProcurementForm {
  subject: string;
  department: string;
  items: string;
  vendor: string;
  receiptDate: string;
}

const STAGE_LABELS: Record<Stage, string> = {
  1: "รายงานขอจัดซื้อ/จัดจ้าง",
  2: "รายงานผลการพิจารณา",
  3: "ตรวจรับพัสดุ",
};

function buildStageHtml(stage: Stage, form: ProcurementForm): string {
  const itemsList = form.items
    .split("\n")
    .filter(Boolean)
    .map((line) => `<li>${line}</li>`)
    .join("");

  const header = `<p><strong>${STAGE_LABELS[stage]}</strong></p>
<p>เรื่อง ${form.subject || "—"}</p>
<p>หน่วยงาน ${form.department || "—"}</p>`;

  if (stage === 1) {
    return `${header}<p>รายการ:</p><ul>${itemsList || "<li>—</li>"}</ul>`;
  }
  if (stage === 2) {
    return `${header}<p>ผู้ขาย/ผู้รับจ้าง: ${form.vendor || "—"}</p><ul>${itemsList || "<li>—</li>"}</ul>`;
  }
  return `${header}<p>วันที่ตรวจรับ: ${form.receiptDate || "—"}</p><ul>${itemsList || "<li>—</li>"}</ul>`;
}


export default function ProcurementPage() {
  const [stage, setStage] = useState<Stage>(1);
  const [form, setForm] = useState<ProcurementForm>({
    subject: "",
    department: "",
    items: "",
    vendor: "",
    receiptDate: "",
  });

  const update = (partial: Partial<ProcurementForm>) =>
    setForm((f) => ({ ...f, ...partial }));

  const exportStage = async () => {
    const body = buildStageHtml(stage, form);
    await downloadDocx(body, { title: STAGE_LABELS[stage] });
  };

  return (
    <>
      <Header active="procurement" />
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-4" />
          กลับไปตัวแก้ไข (Editor)
        </Link>

        <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            เอกสารจัดซื้อ (Procurement builder)
          </h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            ฟอร์ม 3 ขั้น — ข้อมูลไหลต่อกัน ส่งออกเป็น DOCX ฝั่งเบราว์เซอร์
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {([1, 2, 3] as Stage[]).map((s) => {
                const active = stage === s;
                const done = stage > s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    aria-current={active ? "step" : undefined}
                    className={[
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-[color:var(--color-accent)] bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-background)] text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className={[
                        "h-2 w-2 rounded-full",
                        active
                          ? "bg-[color:var(--color-accent)]"
                          : done
                            ? "bg-[color:var(--color-accent)]/50"
                            : "bg-[color:var(--color-border-strong)]",
                      ].join(" ")}
                    />
                    ขั้น {s}
                  </button>
                );
              })}
            </div>

            <Button onClick={() => void exportStage()}>
              <FileDown className="size-4" />
              ส่งออก DOCX — {STAGE_LABELS[stage]}
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium">เรื่อง</span>
              <input
                className="mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent)] focus:ring-2 focus:ring-[color:var(--color-ring)]"
                value={form.subject}
                onChange={(e) => update({ subject: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="font-medium">หน่วยงาน</span>
              <input
                className="mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent)] focus:ring-2 focus:ring-[color:var(--color-ring)]"
                value={form.department}
                onChange={(e) => update({ department: e.target.value })}
              />
            </label>
            {stage >= 2 && (
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">ผู้ขาย/ผู้รับจ้าง</span>
                <input
                  className="mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent)] focus:ring-2 focus:ring-[color:var(--color-ring)]"
                  value={form.vendor}
                  onChange={(e) => update({ vendor: e.target.value })}
                />
              </label>
            )}
            {stage >= 3 && (
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">วันที่ตรวจรับ</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent)] focus:ring-2 focus:ring-[color:var(--color-ring)]"
                  value={form.receiptDate}
                  onChange={(e) => update({ receiptDate: e.target.value })}
                />
              </label>
            )}
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">รายการ (หนึ่งบรรทัดต่อรายการ)</span>
              <textarea
                rows={6}
                className="mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm font-mono outline-none focus:border-[color:var(--color-accent)] focus:ring-2 focus:ring-[color:var(--color-ring)]"
                value={form.items}
                onChange={(e) => update({ items: e.target.value })}
              />
            </label>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
