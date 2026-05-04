"use client";

import { useEffect, useRef, useState } from "react";

export function useEditorResize() {
  const articleRef = useRef<HTMLElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.clientHeight;
        setContentHeight(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { articleRef, contentHeight };
}
