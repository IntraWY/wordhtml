// ── Export-time baking of per-position tab stops ────────────────────────────
//
// In the editor, Word-style tab stops are rendered by a ProseMirror plugin
// (tabStopPlugin.ts) as inline decorations with computed pixel widths. Those
// decorations are NOT part of `getHTML()`, so the exported HTML would otherwise
// fall back to a uniform `tab-size` and diverge from what the user sees.
//
// At export time the editor is still mounted, so we read the real rendered tab
// widths from the live `.ProseMirror` DOM and bake them into the exported HTML
// as fixed-width `<span class="tab-bake">` spacers — pixel-faithful to the
// editor. Blocks are paired by document order (the stored HTML and the live DOM
// derive from the same doc), and each `\t` is paired with the Nth `.pm-tab`
// width in that block. If counts don't line up (or a width is 0, e.g. a
// virtualized off-screen page), that block is left untouched and keeps its
// `\t` + `tab-size` fallback.

const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6";

/** Per-block list of rendered `.pm-tab` widths (px), in document order. */
function liveTabWidths(): number[][] | null {
  if (typeof document === "undefined") return null;
  const root = document.querySelector(".ProseMirror");
  if (!root) return null;
  const blocks = Array.from(root.querySelectorAll(BLOCK_SELECTOR));
  return blocks.map((b) =>
    Array.from(b.querySelectorAll(".pm-tab")).map(
      (s) => (s as HTMLElement).getBoundingClientRect().width
    )
  );
}

function bakeSpan(widthPx: number): string {
  return `<span class="tab-bake" style="display:inline-block;width:${widthPx.toFixed(
    2
  )}px;white-space:pre"></span>`;
}

/**
 * Replace each `\t` in `block` (in order) with a baked spacer of the matching
 * live width. Mutates the parsed block in place. Returns false (and leaves the
 * block untouched) when the tab count doesn't match the measured widths or any
 * width is non-positive.
 */
function bakeBlock(block: Element, widths: number[]): boolean {
  const doc = block.ownerDocument;
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const tabNodes: Text[] = [];
  let total = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const count = (t.data.match(/\t/g) || []).length;
    if (count) {
      tabNodes.push(t);
      total += count;
    }
  }
  if (total !== widths.length || widths.some((w) => !(w > 0))) return false;

  let k = 0;
  for (const textNode of tabNodes) {
    const parts = textNode.data.split("\t");
    const frag = doc.createDocumentFragment();
    parts.forEach((part, i) => {
      if (part) frag.appendChild(doc.createTextNode(part));
      if (i < parts.length - 1) {
        const span = doc.createElement("span");
        span.className = "tab-bake";
        span.setAttribute(
          "style",
          `display:inline-block;width:${widths[k].toFixed(2)}px;white-space:pre`
        );
        frag.appendChild(span);
        k++;
      }
    });
    textNode.parentNode?.replaceChild(frag, textNode);
  }
  return true;
}

/**
 * Bake per-position tab widths from the live editor into `html`. Returns the
 * baked HTML, or the original `html` unchanged when the live DOM is unavailable
 * or no block can be reliably paired (safe no-op fallback).
 */
export function bakeTabStops(html: string): string {
  if (!html.includes("data-tab-stops")) return html;
  const widthsByBlock = liveTabWidths();
  if (!widthsByBlock) return html;

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const blocks = Array.from(parsed.body.querySelectorAll(BLOCK_SELECTOR));
  if (blocks.length !== widthsByBlock.length) return html; // structure drift — bail

  let baked = false;
  blocks.forEach((block, i) => {
    const widths = widthsByBlock[i];
    if (!widths.length) return;
    if (!block.hasAttribute("data-tab-stops")) return;
    if (bakeBlock(block, widths)) baked = true;
  });

  return baked ? parsed.body.innerHTML : html;
}

// reference kept so the helper isn't tree-shaken when only bakeSpan is needed.
export { bakeSpan };
