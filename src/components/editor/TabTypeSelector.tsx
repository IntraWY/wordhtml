"use client";

import { useUiStore } from "@/store/uiStore";
import { TAB_TYPE_GLYPH, TAB_TYPE_LABEL } from "@/lib/tiptap/tabStopLayout";

/**
 * Word-style tab-type selector that lives in the ruler corner. Clicking cycles
 * the active alignment (left → center → right → decimal → bar); clicking the
 * ruler track then drops a stop of that type. Mirrors Word's corner box.
 */
export function TabTypeSelector() {
  const currentTabType = useUiStore((s) => s.currentTabType);
  const cycleTabType = useUiStore((s) => s.cycleTabType);

  return (
    <button
      type="button"
      onClick={cycleTabType}
      title={`ชนิดแท็บ (Tab type): ${TAB_TYPE_LABEL[currentTabType]} — คลิกเพื่อสลับ`}
      aria-label={`ชนิดแท็บ (Tab type): ${TAB_TYPE_LABEL[currentTabType]}`}
      className="grid h-full w-full place-items-center text-[11px] font-bold leading-none text-[color:var(--color-accent)] hover:bg-[color:var(--color-canvas)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-ring)]"
    >
      {TAB_TYPE_GLYPH[currentTabType]}
    </button>
  );
}
