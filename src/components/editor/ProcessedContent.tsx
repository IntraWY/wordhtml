"use client";

import { cn } from "@/lib/utils";
import { A4, LETTER, mmToPx } from "@/lib/page";
import type { PageSetup } from "@/store/editorStore";

interface ProcessedContentProps {
  html: string;
  pageSetup: PageSetup;
  className?: string;
  style?: React.CSSProperties;
  exactHeight?: boolean;
}

export function ProcessedContent({
  html,
  pageSetup,
  className,
  style,
  exactHeight = false,
}: ProcessedContentProps) {
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
    <article
      className={cn("paper printable-paper bg-white shadow-sm", className)}
      style={{
        minHeight: heightPx,
        height: exactHeight ? heightPx : undefined,
        width: widthPx,
        paddingTop: marginTopPx,
        paddingRight: marginRightPx,
        paddingBottom: marginBottomPx,
        paddingLeft: marginLeftPx,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
