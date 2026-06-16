import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Ensures every pageBody ends with a paragraph so users can click/type after
 * block atoms (images, tables, HR, etc.). StarterKit TrailingNode only covers
 * the document root — not nested pageBody containers.
 */
export const PageBodyTrailingParagraph = Extension.create({
  name: "pageBodyTrailingParagraph",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("pageBodyTrailingParagraph"),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((t) => t.docChanged)) return null;

          const paragraph = this.editor.schema.nodes.paragraph;
          if (!paragraph) return null;

          const { doc, tr } = newState;
          const insertPositions: number[] = [];

          doc.descendants((node, pos) => {
            if (node.type.name !== "pageBody") return;
            const last = node.lastChild;
            // Empty body (last === null) or one ending in a block atom both need a
            // trailing paragraph so the user can click/type there.
            if (last && last.type.name === "paragraph") return;
            insertPositions.push(pos + node.nodeSize - 1);
          });

          if (insertPositions.length === 0) return null;

          insertPositions.sort((a, b) => b - a);
          for (const insertPos of insertPositions) {
            tr.insert(insertPos, paragraph.create());
          }

          return tr;
        },
      }),
    ];
  },
});
