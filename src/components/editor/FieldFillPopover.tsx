"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { TextCursorInput } from "lucide-react";

import {
  addEventListener,
  removeEventListener,
  EVENT_NAMES,
  type FillFieldDetail,
} from "@/lib/events";
import { isLiveEditor } from "@/lib/editorLive";

const POPOVER_WIDTH = 240;

/** Clamp the popover's top-left so it stays inside the viewport. */
function clampAnchor(rect: { left: number; bottom: number }) {
  return {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8)),
    top: Math.min(rect.bottom + 6, window.innerHeight - 100),
  };
}

/**
 * Fill popover for content-control ช่องกรอก (placeholderField nodes).
 * The value is written into the node's `value` attribute, so it lives in the
 * document HTML and survives save/reload/template/export for free.
 */
export function FieldFillPopover({ editor }: { editor?: Editor | null }) {
  const [target, setTarget] = useState<FillFieldDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const detail = e.detail as FillFieldDetail;
      setDraft(detail.value);
      // null pos → render anchors from the freshly captured rect until a
      // scroll/resize repositions it (setState here is fine: it's an event cb).
      setPos(null);
      setTarget(detail);
    };
    addEventListener(EVENT_NAMES.fillField, handler);
    return () => removeEventListener(EVENT_NAMES.fillField, handler);
  }, []);

  // Re-anchor to the field's live position so the popover tracks the editor
  // when the canvas scrolls (the captured rect goes stale otherwise).
  const reposition = useCallback(() => {
    if (!target) return;
    let rect: { left: number; bottom: number } = target.rect;
    if (isLiveEditor(editor)) {
      try {
        const c = editor.view.coordsAtPos(target.pos);
        rect = { left: c.left, bottom: c.bottom };
      } catch {
        /* pos no longer addressable — keep the captured rect */
      }
    }
    setPos(clampAnchor(rect));
  }, [target, editor]);

  useEffect(() => {
    if (!target) return;
    inputRef.current?.focus();
    inputRef.current?.select();
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setTarget(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTarget(null);
    };
    const onReflow = () => reposition();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [target, reposition]);

  const commit = useCallback(
    (value: string) => {
      if (!target || !isLiveEditor(editor)) return;
      const { state, view } = editor;
      const node = state.doc.nodeAt(target.pos);
      if (node?.type.name !== "placeholderField") return;
      view.dispatch(
        state.tr.setNodeMarkup(target.pos, undefined, { ...node.attrs, value })
      );
    },
    [target, editor]
  );

  if (!target) return null;

  // Initial render uses the captured rect; once the user scrolls, `pos` holds
  // the re-anchored coordinates.
  const { left, top } = pos ?? clampAnchor(target.rect);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={`กรอกค่า ${target.label} (Fill field)`}
      className="fixed z-[90] rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-2.5 shadow-lg"
      style={{ left, top, width: POPOVER_WIDTH }}
    >
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-foreground)]">
        <TextCursorInput className="size-3 text-[color:var(--color-accent)]" />
        {target.label}
      </p>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            setTarget(null);
          }
        }}
        placeholder="ค่า (value)"
        className="w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1 text-xs outline-none focus:border-[color:var(--color-accent)]"
      />
      <p className="mt-1.5 text-[10px] text-[color:var(--color-muted-foreground)]">
        Enter = บันทึก · Esc = ปิด — ค่าเก็บในเอกสาร (รอด reload)
      </p>
    </div>
  );
}
