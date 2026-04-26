"use client";

import { useDeferredValue } from "react";

import { useEditorStore } from "@/store/editorStore";

import { Ruler } from "./Ruler";

const PX_PER_CM = 794 / 21; // 96 DPI: 21cm = 794px
const A4 = { wMm: 210, hMm: 297 };
const LETTER = { wMm: 215.9, hMm: 279.4 };

function mmToPx(mm: number): number {
  return (mm / 10) * PX_PER_CM; // mm → cm → px
}

export function A4Preview() {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  // Defer preview re-renders so typing in the editor stays responsive on long documents.
  const deferredHtml = useDeferredValue(documentHtml);

  const base = pageSetup.size === "Letter" ? LETTER : A4;
  const isLandscape = pageSetup.orientation === "landscape";
  const widthMm = isLandscape ? base.hMm : base.wMm;
  const heightMm = isLandscape ? base.wMm : base.hMm;

  const widthPx = Math.round(mmToPx(widthMm));
  const heightPx = Math.round(mmToPx(heightMm));
  const marginTopPx = Math.round(mmToPx(pageSetup.marginMm.top));
  const marginRightPx = Math.round(mmToPx(pageSetup.marginMm.right));
  const marginBottomPx = Math.round(mmToPx(pageSetup.marginMm.bottom));
  const marginLeftPx = Math.round(mmToPx(pageSetup.marginMm.left));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[color:var(--color-muted)]">
      <div className="shrink-0 border-b border-[color:var(--color-border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        A4 preview
      </div>
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto" style={{ width: widthPx + 18 }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `18px ${widthPx}px`,
              gridTemplateRows: `18px auto`,
            }}
          >
            {/* corner */}
            <div className="border-b border-r border-[color:var(--color-border)] bg-[color:var(--color-muted)]" />
            {/* horizontal ruler */}
            <Ruler
              orientation="horizontal"
              cm={widthMm / 10}
              marginStart={marginLeftPx}
              marginEnd={marginRightPx}
            />
            {/* vertical ruler */}
            <Ruler
              orientation="vertical"
              cm={heightMm / 10}
              marginStart={marginTopPx}
              marginEnd={marginBottomPx}
            />
            {/* paper */}
            <article
              className="paper printable-paper bg-white shadow-sm"
              style={{
                minHeight: heightPx,
                width: widthPx,
                paddingTop: marginTopPx,
                paddingRight: marginRightPx,
                paddingBottom: marginBottomPx,
                paddingLeft: marginLeftPx,
              }}
              // The user-provided HTML is already from their own paste/edit flow.
              // It is sanitized at the conversion boundary (paste handler / mammoth output).
              dangerouslySetInnerHTML={{ __html: deferredHtml || "" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
