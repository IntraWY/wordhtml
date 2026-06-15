import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  nextStop,
  computeTabWidth,
  decimalPrefix,
  zipTabStops,
  shouldDispatchTabDecorations,
  type TabStopSpec,
} from "./tabStopLayout";

// ── ProseMirror plugin: render per-position Word-style tab stops ─────────────
//
// Paragraphs/headings carry `tabStops` (cm positions) + `tabStopTypes`
// (alignment per stop). Native CSS `tab-size` can only express a single uniform
// interval, so we replace each `\t`'s rendered advance with an inline
// Decoration whose explicit width lands the following text on the right stop.
//
// The decoration sets `width` + `tab-size:0` + `white-space:pre` on a span
// wrapping the `\t`; a spike confirmed this overrides the native tab advance
// exactly. The document model is untouched — `\t` stays a literal character, so
// all existing tab machinery (preserveWhitespace, Shift-Tab delete,
// collapseSpaces) keeps working.
//
// Because the widths depend on rendered layout (coordsAtPos + text measurement),
// decorations are rebuilt in the plugin's `view.update` (after layout) and
// stored via a meta transaction — the standard "decoration that needs layout"
// pattern. A ResizeObserver forces a rebuild when the page width or fonts change.

export const tabStopPluginKey = new PluginKey<DecorationSet>("tabStopLayout");

/** Default uniform fallback grid (cm) — matches globals.css `tab-size: 1.27cm`. */
const DEFAULT_TAB_CM = 1.27;

const TARGET_TYPES = new Set(["paragraph", "heading"]);

// Reused offscreen canvas for text measurement.
let measureCtx: CanvasRenderingContext2D | null = null;
function measureText(text: string, font: string): number {
  if (!text) return 0;
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d");
  }
  if (!measureCtx) return 0;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

function fontFor(el: Element | null): string {
  if (!el) return "13px sans-serif";
  const cs = getComputedStyle(el as HTMLElement);
  // `font` shorthand is usually populated; fall back to composing it.
  if (cs.font) return cs.font;
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
}

interface TabHit {
  /** absolute doc position of the `\t` */
  pos: number;
  /** text following the tab up to the next tab / end of text node */
  run: string;
}

/** Collect every `\t` in a textblock with the run that follows it. */
function tabHits(block: PMNode, blockPos: number): TabHit[] {
  const hits: TabHit[] = [];
  block.descendants((child, offset) => {
    if (!child.isText || !child.text) return;
    const text = child.text;
    for (let j = 0; j < text.length; j++) {
      if (text[j] === "\t") {
        const rest = text.slice(j + 1);
        const nextTab = rest.indexOf("\t");
        const run = nextTab >= 0 ? rest.slice(0, nextTab) : rest;
        hits.push({ pos: blockPos + 1 + offset + j, run });
      }
    }
  });
  return hits;
}

function buildDecorations(view: EditorView): { set: DecorationSet; sig: string } {
  const decos: Decoration[] = [];
  const sigParts: string[] = [];
  const { doc } = view.state;

  doc.descendants((node, pos) => {
    if (!TARGET_TYPES.has(node.type.name)) return;
    const positions = (node.attrs.tabStops as number[] | undefined) ?? [];
    if (!positions.length) return;
    const stops: TabStopSpec[] = zipTabStops(
      positions,
      node.attrs.tabStopTypes as TabStopSpec["type"][] | undefined
    );

    let contentLeft: number;
    try {
      contentLeft = view.coordsAtPos(pos + 1).left;
    } catch {
      return;
    }

    for (const hit of tabHits(node, pos)) {
      try {
        const tabStartXpx = view.coordsAtPos(hit.pos).left - contentLeft;
        const target = nextStop(tabStartXpx, stops, DEFAULT_TAB_CM);
        if (!target) continue;

        let runW = 0;
        let prefixW = 0;
        if (
          target.type === "center" ||
          target.type === "right" ||
          target.type === "decimal"
        ) {
          const domNode = view.domAtPos(hit.pos).node;
          const el =
            domNode.nodeType === 3 ? domNode.parentElement : (domNode as Element);
          const font = fontFor(el);
          runW = measureText(hit.run, font);
          prefixW =
            target.type === "decimal"
              ? measureText(decimalPrefix(hit.run), font)
              : 0;
        }

        const width = computeTabWidth(tabStartXpx, target, runW, prefixW);
        decos.push(
          Decoration.inline(hit.pos, hit.pos + 1, {
            nodeName: "span",
            class: "pm-tab",
            style: `display:inline-block;width:${width.toFixed(2)}px;tab-size:0;white-space:pre`,
          })
        );
        // Fingerprint by position+width so a re-layout pass (each decoration
        // shifts later tabs) keeps re-dispatching until the widths converge.
        sigParts.push(`${hit.pos}:${width.toFixed(1)}`);
      } catch {
        // coordsAtPos can throw at boundaries — skip this tab.
      }
    }
  });

  return { set: DecorationSet.create(doc, decos), sig: sigParts.join("|") };
}

export function createTabStopPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: tabStopPluginKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, old) {
        const meta = tr.getMeta(tabStopPluginKey) as DecorationSet | undefined;
        if (meta) return meta;
        return old.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return tabStopPluginKey.getState(state);
      },
    },
    view(view) {
      let raf = 0;
      let lastSig = "";
      let prevSig = "";
      const hasRaf = typeof requestAnimationFrame === "function";
      const rebuild = () => {
        raf = 0;
        if (view.isDestroyed) return;
        const { set, sig } = buildDecorations(view);
        // Re-dispatch while widths still change (each pass relays out later
        // tabs); converges in 1–2 frames. Stop on convergence (sig stable) or a
        // 2-cycle (a wrap-flip oscillation) so we can never loop unbounded.
        if (shouldDispatchTabDecorations(sig, lastSig, prevSig)) {
          prevSig = lastSig;
          lastSig = sig;
          view.dispatch(view.state.tr.setMeta(tabStopPluginKey, set));
        }
      };
      const schedule = () => {
        if (!hasRaf) return; // non-DOM env (tests) — no layout to measure
        if (!raf) raf = requestAnimationFrame(rebuild);
      };

      // Initial pass + react to layout changes that PM transactions miss.
      schedule();
      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(schedule);
        ro.observe(view.dom);
      }
      const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
      if (fonts?.ready) fonts.ready.then(schedule).catch(() => {});

      return {
        update: schedule,
        destroy() {
          if (raf && typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(raf);
          }
          ro?.disconnect();
        },
      };
    },
  });
}
