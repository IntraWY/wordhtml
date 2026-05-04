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
  pageNext: "wordhtml:page-next",
  pagePrev: "wordhtml:page-prev",
} as const;

export type WordhtmlEventName =
  (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

/* dispatch helpers */

export function dispatchOpenFile() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openFile));
  }
}

export function dispatchOpenBatchConvert() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openBatchConvert));
  }
}

export function dispatchOpenTemplates() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openTemplates));
  }
}

export function dispatchOpenSearch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openSearch));
  }
}

export function dispatchOpenPageSetup() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openPageSetup));
  }
}

export function dispatchOpenShortcuts() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openShortcuts));
  }
}

export function dispatchOpenToc() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openToc));
  }
}

export function dispatchOpenHeaderFooter() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.openHeaderFooter));
  }
}

export function dispatchInsertVariable(name: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAMES.insertVariable, { detail: name })
    );
  }
}

export function dispatchPageNext() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.pageNext));
  }
}

export function dispatchPagePrev() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.pagePrev));
  }
}

/* listener helpers (small wrappers for add/remove consistency) */

export function addEventListener(
  name: WordhtmlEventName,
  handler: (e: CustomEvent) => void
) {
  if (typeof window !== "undefined") {
    window.addEventListener(name, handler as EventListener);
  }
}

export function removeEventListener(
  name: WordhtmlEventName,
  handler: (e: CustomEvent) => void
) {
  if (typeof window !== "undefined") {
    window.removeEventListener(name, handler as EventListener);
  }
}
