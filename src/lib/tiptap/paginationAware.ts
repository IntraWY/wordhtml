import { Extension } from "@tiptap/core";

/**
 * PaginationAware – Phase 1 (simplified)
 *
 * Keyboard shortcuts that dispatch custom events when the cursor is at
 * document boundaries, allowing the parent UI to handle actual page
 * navigation (e.g. scroll-to-page, focus next editable region).
 *
 * Custom events dispatched:
 *   - "wordhtml:page-next"  → ArrowDown at end of doc, or PageDown
 *   - "wordhtml:page-prev"  → ArrowUp at start of doc, or PageUp
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paginationAware: {
      goToNextPage: () => ReturnType;
      goToPreviousPage: () => ReturnType;
    };
  }
}

export const PaginationAware = Extension.create({
  name: "paginationAware",

  addCommands() {
    return {
      goToNextPage:
        () =>
        ({ editor }): boolean => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("wordhtml:page-next"));
          }
          return true;
        },
      goToPreviousPage:
        () =>
        ({ editor }): boolean => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("wordhtml:page-prev"));
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      ArrowDown: () => {
        const { state } = this.editor;
        const { selection, doc } = state;
        // Phase 1 simplified: treat end of document as last line of current page
        if (selection.to >= doc.content.size - 1) {
          this.editor.commands.goToNextPage();
          return true;
        }
        return false; // let default behaviour
      },

      ArrowUp: () => {
        const { state } = this.editor;
        const { selection } = state;
        // Phase 1 simplified: treat start of document as first line of current page
        if (selection.from <= 1) {
          this.editor.commands.goToPreviousPage();
          return true;
        }
        return false; // let default behaviour
      },

      PageDown: () => {
        this.editor.commands.goToNextPage();
        return true;
      },

      PageUp: () => {
        this.editor.commands.goToPreviousPage();
        return true;
      },
    };
  },
});
