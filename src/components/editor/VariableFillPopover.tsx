"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ArrowDownToDot, Braces } from "lucide-react";

import { useEditorStore } from "@/store/editorStore";
import { extractVariables } from "@/lib/templateEngine";
import { jumpToMergeField } from "@/lib/placeholders";
import { nextEmptyVariableName } from "@/lib/placeholders/panelFilter";
import {
  addEventListener,
  removeEventListener,
  EVENT_NAMES,
  type FillVariableDetail,
} from "@/lib/events";
import type { TemplateVariable } from "@/types";

const POPOVER_WIDTH = 240;

/**
 * Inline fill popover: opens when the user clicks a {{variable}} badge in the
 * document (`wordhtml:fill-variable` from VisualEditor.handleClick). Edits the
 * same `variables[].value` the panel uses; "ถัดไป" jumps to the next unfilled
 * in-document variable and re-anchors there.
 */
export function VariableFillPopover({ editor }: { editor?: Editor | null }) {
  const [target, setTarget] = useState<FillVariableDetail | null>(null);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const detail = e.detail as FillVariableDetail;
      const current = useEditorStore
        .getState()
        .variables.find((v) => v.name === detail.name);
      setDraft(current?.value ?? "");
      setTarget(detail);
    };
    addEventListener(EVENT_NAMES.fillVariable, handler);
    return () => removeEventListener(EVENT_NAMES.fillVariable, handler);
  }, []);

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
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [target]);

  const commit = useCallback(
    (value: string) => {
      if (!target) return;
      const name = target.name;
      useEditorStore.getState().setVariables((prev: TemplateVariable[]) => {
        const exists = prev.some((v) => v.name === name);
        if (!exists) return [...prev, { name, value, isList: false }];
        return prev.map((v) =>
          v.name === name
            ? {
                ...v,
                value,
                // Keep list parsing consistent with the panel
                listValues: v.isList
                  ? value
                      .split(v.delimiter === "\n" ? /\r?\n/ : (v.delimiter ?? ","))
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : v.listValues,
              }
            : v
        );
      });
    },
    [target]
  );

  const handleNext = useCallback(() => {
    commit(draft);
    if (!editor) {
      setTarget(null);
      return;
    }
    const state = useEditorStore.getState();
    const docNames = new Set(extractVariables(state.getDocumentHtml()));
    const next = nextEmptyVariableName(state.variables, docNames);
    setTarget(null);
    if (next) {
      jumpToMergeField(editor, next);
      // Re-anchor on the now-selected badge after the scroll settles.
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(
          `.variable-badge[data-variable="${CSS.escape(next)}"]`
        );
        if (!el) return;
        const r = el.getBoundingClientRect();
        setDraft("");
        setTarget({
          name: next,
          rect: { left: r.left, top: r.top, bottom: r.bottom, width: r.width },
        });
      }, 120);
    }
  }, [commit, draft, editor]);

  if (!target) return null;

  const left = Math.max(
    8,
    Math.min(target.rect.left, window.innerWidth - POPOVER_WIDTH - 8)
  );
  const top = Math.min(target.rect.bottom + 6, window.innerHeight - 110);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={`กรอกค่า {{${target.name}}} (Fill variable)`}
      className="fixed z-[90] rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-2.5 shadow-lg"
      style={{ left, top, width: POPOVER_WIDTH }}
    >
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-foreground)]">
        <Braces className="size-3 text-[color:var(--color-accent)]" />
        {"{{"}
        {target.name}
        {"}}"}
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
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
          Enter = บันทึก · Esc = ปิด
        </span>
        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowDownToDot className="size-3" />
          ถัดไป (Next)
        </button>
      </div>
    </div>
  );
}
