import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Track-changes mark (B8). A reviewer marks a selected span as an insertion
 * (proposed addition) or deletion (proposed removal). Accept/Reject resolve all
 * marks across the document. This is explicit/manual markup — it does NOT
 * intercept live typing — which keeps it fully predictable and avoids touching
 * the editing transaction pipeline. Export resolves changes (accept).
 */
export type TrackChangeKind = "insertion" | "deletion";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    trackChange: {
      markInsertion: () => ReturnType;
      markDeletion: () => ReturnType;
      acceptAllChanges: () => ReturnType;
      rejectAllChanges: () => ReturnType;
    };
  }
}

export const TrackChange = Mark.create({
  name: "trackChange",

  inclusive: false,

  addAttributes() {
    return {
      kind: {
        default: "insertion",
        parseHTML: (el) =>
          el.getAttribute("data-track") === "deletion"
            ? "deletion"
            : "insertion",
        renderHTML: (attrs) => ({ "data-track": attrs.kind as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-track]" }];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const kind = mark.attrs.kind as TrackChangeKind;
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: kind === "deletion" ? "wh-track-del" : "wh-track-ins",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      markInsertion:
        () =>
        ({ commands }) =>
          commands.setMark(this.name, { kind: "insertion" }),

      markDeletion:
        () =>
        ({ commands }) =>
          commands.setMark(this.name, { kind: "deletion" }),

      // Accept: insertions become normal text; deletions are removed.
      acceptAllChanges:
        () =>
        ({ tr, state, dispatch }) =>
          resolveAllChanges(tr, state, dispatch, "accept"),

      // Reject: insertions are removed; deletions become normal text.
      rejectAllChanges:
        () =>
        ({ tr, state, dispatch }) =>
          resolveAllChanges(tr, state, dispatch, "reject"),
    };
  },
});

function resolveAllChanges(
  tr: import("@tiptap/pm/state").Transaction,
  state: import("@tiptap/pm/state").EditorState,
  dispatch: ((tr: import("@tiptap/pm/state").Transaction) => void) | undefined,
  action: "accept" | "reject"
): boolean {
  const markType = state.schema.marks.trackChange;
  if (!markType) return false;

  // Collect ranges first (positions shift as we edit, so map through tr).
  const ranges: { from: number; to: number; kind: TrackChangeKind }[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = node.marks.find((m) => m.type === markType);
    if (mark) {
      ranges.push({
        from: pos,
        to: pos + node.nodeSize,
        kind: mark.attrs.kind as TrackChangeKind,
      });
    }
  });
  if (ranges.length === 0) return false;

  // Whether each range's TEXT should be deleted under this action.
  const shouldDelete = (kind: TrackChangeKind) =>
    action === "accept" ? kind === "deletion" : kind === "insertion";

  // Process from the end so earlier positions stay valid.
  for (let i = ranges.length - 1; i >= 0; i--) {
    const r = ranges[i];
    const from = tr.mapping.map(r.from);
    const to = tr.mapping.map(r.to);
    if (shouldDelete(r.kind)) {
      tr.delete(from, to);
    } else {
      tr.removeMark(from, to, markType);
    }
  }

  if (dispatch) dispatch(tr);
  return true;
}

/**
 * Resolve track-change spans in export HTML (accept semantics): unwrap
 * insertions (keep text), remove deletions (drop text). Returns html unchanged
 * when there are no track-change spans.
 */
export function resolveTrackChangesForExport(html: string): string {
  if (!html.includes("data-track")) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("span[data-track]").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    if (el.getAttribute("data-track") === "deletion") {
      parent.removeChild(el);
    } else {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  });
  return doc.body.innerHTML;
}
