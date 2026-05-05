"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";

const BREAKPOINT_PX = 768;

/**
 * True blocker overlay shown on screens narrower than 768px.
 *
 * The editor requires desktop-sized viewport for a usable experience.
 * This overlay prevents interaction with the editor on mobile devices.
 */
export function MobileBlock() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT_PX - 1}px)`);
    const update = () => setVisible(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mobile-block-title"
      aria-describedby="mobile-block-desc"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-[color:var(--color-background)] p-6 text-center"
    >
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-[color:var(--color-muted)]">
        <Monitor className="size-6 text-[color:var(--color-muted-foreground)]" />
      </div>
      <h2 id="mobile-block-title" className="text-lg font-semibold">
        ต้องใช้งานบนเดสก์ท็อป (Desktop Only)
      </h2>
      <p
        id="mobile-block-desc"
        className="max-w-xs text-sm text-[color:var(--color-muted-foreground)]"
      >
        โปรแกรมแก้ไขเอกสารนี้ออกแบบสำหรับหน้าจอขนาดใหญ่
        กรุณาใช้งานบนคอมพิวเตอร์หรือแท็บเล็ตในแนวนอน
      </p>
    </div>
  );
}
