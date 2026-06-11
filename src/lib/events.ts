"use client";

/* ------------------------------------------------------------------ */
/* Typed custom-event helpers for wordhtml                            */
/* ------------------------------------------------------------------ */

export const EVENT_NAMES = {
  openFile: "wordhtml:open-file",
  openBatchConvert: "wordhtml:open-batch-convert",
  openTemplates: "wordhtml:open-templates",
  openSearch: "wordhtml:open-search",
  openPageSetup: "wordhtml:open-page-setup",
  openShortcuts: "wordhtml:open-shortcuts",
  openToc: "wordhtml:open-toc",
  openHeaderFooter: "wordhtml:open-header-footer",
  insertVariable: "wordhtml:insert-variable",
  fillVariable: "wordhtml:fill-variable",
  fillField: "wordhtml:fill-field",
  pageNext: "wordhtml:page-next",
  pagePrev: "wordhtml:page-prev",
  insertPageBreak: "wordhtml:insert-page-break",
  enterPreview: "wordhtml:enter-preview",
  paginationCooldown: "wordhtml:pagination-cooldown",
} as const;

export type WordhtmlEventName =
  (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

/* dispatch helpers */

export function dispatchOpenFile(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openFile));
  }
}

export function dispatchOpenBatchConvert(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openBatchConvert));
  }
}

export function dispatchOpenTemplates(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openTemplates));
  }
}

export function dispatchOpenSearch(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openSearch));
  }
}

export function dispatchOpenPageSetup(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openPageSetup));
  }
}

export function dispatchOpenShortcuts(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openShortcuts));
  }
}

export function dispatchOpenToc(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openToc));
  }
}

export function dispatchOpenHeaderFooter(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openHeaderFooter));
  }
}

export function dispatchInsertVariable(name: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAMES.insertVariable, { detail: name })
    );
  }
}

export interface FillVariableDetail {
  name: string;
  /** Viewport rect of the clicked badge — anchors the fill popover. */
  rect: { left: number; top: number; bottom: number; width: number };
}

export function dispatchFillVariable(detail: FillVariableDetail): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.fillVariable, { detail }));
  }
}

export interface FillFieldDetail {
  /** Document position of the placeholderField node. */
  pos: number;
  label: string;
  value: string;
  rect: { left: number; top: number; bottom: number; width: number };
}

export function dispatchFillField(detail: FillFieldDetail): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.fillField, { detail }));
  }
}

export function dispatchPageNext(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.pageNext));
  }
}

export function dispatchPagePrev(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.pagePrev));
  }
}

export function dispatchInsertPageBreak(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.insertPageBreak));
  }
}

export function dispatchEnterPreview(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.enterPreview));
  }
}

export function dispatchPaginationCooldown(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.paginationCooldown));
  }
}

/* listener helpers (small wrappers for add/remove consistency) */

export function addEventListener(
  name: WordhtmlEventName,
  handler: (e: CustomEvent) => void
): void {
  if (typeof window !== "undefined") {
    window.addEventListener(name, handler as EventListener);
  }
}

export function removeEventListener(
  name: WordhtmlEventName,
  handler: (e: CustomEvent) => void
): void {
  if (typeof window !== "undefined") {
    window.removeEventListener(name, handler as EventListener);
  }
}
