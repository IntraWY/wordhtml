"use client";

import { useEffect, useState } from "react";
import { Monitor, X } from "lucide-react";

const BREAKPOINT_PX = 768;

/**
 * Dismissible warning banner shown on screens narrower than 768px.
 *
 * The editor works best on desktop; on mobile we warn users but still
 * allow read-only access and basic interaction.
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
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[200] flex items-start justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
    >
      <div className="flex items-center gap-2">
        <Monitor className="size-4 shrink-0 text-amber-700" />
        <span>
          wordhtml ทำงานได้ดีที่สุดบนเดสก์ท็อป (Desktop) — การแก้ไขบนมือถืออาจไม่สะดวก
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-md px-2 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
        >
          เข้าใช้งานต่อ (Continue)
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="ปิดคำเตือน"
          className="shrink-0 rounded-md p-1 text-amber-700 transition-colors hover:bg-amber-100"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
