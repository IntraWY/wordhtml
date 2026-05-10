"use client";

import { useEffect, useState } from "react";
import { Monitor, X } from "lucide-react";

const BREAKPOINT_PX = 768;

/**
 * Non-blocking banner shown on screens narrower than 768px.
 * Replaces the old blocking overlay with a dismissible warning.
 */
export function MobileBlock() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT_PX - 1}px)`);
    const update = () => setVisible(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900"
    >
      <div className="flex items-center gap-2">
        <Monitor className="size-3.5 shrink-0" />
        <span>
          หน้าจอเล็ก — ประสบการณ์ใช้งานอาจไม่สมบูรณ์ แนะนำให้ใช้บนเดสก์ท็อป
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="ปิดข้อความ"
        className="rounded-md p-1 text-amber-700 transition-colors hover:bg-amber-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
