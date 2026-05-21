import { Node } from "@tiptap/core";

/**
 * PagedDocument – custom top-level document node that contains one or
 * more `pageNode`s.
 *
 * This replaces StarterKit's default `doc` node (which expects `block+`).
 * StarterKit must be configured with `document: false` when this is used.
 */
export const PagedDocument = Node.create({
  name: "doc",

  topNode: true,

  content: "page+",
});
