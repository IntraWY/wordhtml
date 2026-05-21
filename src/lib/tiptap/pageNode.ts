import { Node, mergeAttributes } from "@tiptap/core";
import type { PageSetup } from "@/types";
import { A4, LETTER, mmToPx } from "@/lib/page";

export interface PageNodeAttributes {
  pageNumber: number;
  pageSetup: PageSetup;
}

export type PageNodeOptions = object;

function defaultPageSetup(): PageSetup {
  return {
    size: "A4",
    orientation: "portrait",
    marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
  };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageNode: {
      insertPage: (attrs?: Partial<PageNodeAttributes>) => ReturnType;
      splitPage: () => ReturnType;
      mergePage: () => ReturnType;
      setPageSetup: (pageSetup: Partial<PageSetup>) => ReturnType;
    };
  }
}

export const PageNode = Node.create<PageNodeOptions>({
  name: "pageNode",

  group: "page",

  content: "pageBody",

  defining: true,

  isolating: true,

  addAttributes() {
    return {
      pageNumber: {
        default: 1,
        parseHTML: (el) => {
          const raw = el.getAttribute("data-page-number");
          if (!raw) return 1;
          const n = parseInt(raw, 10);
          return Number.isNaN(n) ? 1 : n;
        },
        renderHTML: (attrs) => {
          const n = (attrs.pageNumber as number) ?? 1;
          return { "data-page-number": String(n) };
        },
      },
      pageSetup: {
        default: defaultPageSetup(),
        parseHTML: (el) => {
          const raw = el.getAttribute("data-page-setup");
          if (!raw) return defaultPageSetup();
          try {
            const parsed = JSON.parse(raw) as unknown;
            if (parsed && typeof parsed === "object") {
              return { ...defaultPageSetup(), ...parsed } as PageSetup;
            }
          } catch {
            // ignore malformed JSON
          }
          return defaultPageSetup();
        },
        renderHTML: (attrs) => {
          const setup = attrs.pageSetup as PageSetup | undefined;
          if (!setup) return {};
          return { "data-page-setup": JSON.stringify(setup) };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.page-node",
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const setup = (node.attrs.pageSetup as PageSetup) ?? defaultPageSetup();
    const base = setup.size === "Letter" ? LETTER : A4;
    const isLandscape = setup.orientation === "landscape";
    const widthMm = isLandscape ? base.hMm : base.wMm;
    const heightMm = isLandscape ? base.wMm : base.hMm;
    const widthPx = Math.round(mmToPx(widthMm));
    const heightPx = Math.round(mmToPx(heightMm));
    const marginTopPx = Math.round(mmToPx(setup.marginMm.top));
    const marginRightPx = Math.round(mmToPx(setup.marginMm.right));
    const marginBottomPx = Math.round(mmToPx(setup.marginMm.bottom));
    const marginLeftPx = Math.round(mmToPx(setup.marginMm.left));

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "page-node",
        style: `width:${widthPx}px;height:${heightPx}px;--page-margin-top:${marginTopPx}px;--page-margin-right:${marginRightPx}px;--page-margin-bottom:${marginBottomPx}px;--page-margin-left:${marginLeftPx}px;`,
      }),
      0,
    ];
  },

});
