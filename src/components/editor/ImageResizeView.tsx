"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

interface DragState {
  handle: "bl" | "br";
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  ratio: number;
}

export function ImageResizeView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [liveShift, setLiveShift] = useState(false);

  const { src, alt, width, height, align } = node.attrs as {
    src: string;
    alt?: string;
    width?: string | null;
    height?: string | null;
    align?: string | null;
  };

  // --- Drag resize logic ---
  useEffect(() => {
    if (!drag) return;

    let rafId: number | null = null;
    const onMove = (e: MouseEvent) => {
      setLiveShift(e.shiftKey);
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        // BL handle: dragging LEFT = increasing width (invert dx)
        const dx =
          drag.handle === "br"
            ? e.clientX - drag.startX
            : drag.startX - e.clientX;
        const dy = e.clientY - drag.startY;
        const locked = !e.shiftKey;

        const newW = Math.max(50, Math.round(drag.startW + dx));
        const newH = locked
          ? Math.max(50, Math.round(newW / drag.ratio))
          : Math.max(50, Math.round(drag.startH + dy));

        updateAttributes({ width: String(newW), height: String(newH) });
      });
    };

    const onUp = () => {
      setDrag(null);
      setLiveShift(false);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [drag, updateAttributes]);

  const startDrag = useCallback(
    (handle: "bl" | "br") => (e: React.MouseEvent) => {
      e.preventDefault();
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      setDrag({
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
        ratio: rect.width / Math.max(1, rect.height),
      });
    },
    []
  );

  const applyPreset = (preset: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    updateAttributes({ width: preset, height: null });
  };

  // --- Alignment wrapper style (mirrors CSS for A4Preview) ---
  const wrapperStyle: React.CSSProperties =
    align === "left"
      ? { float: "left", margin: "0.5em 1em 0.5em 0", clear: "left" }
      : align === "right"
        ? { float: "right", margin: "0.5em 0 0.5em 1em", clear: "right" }
        : align === "center"
          ? { display: "block", margin: "1em auto", textAlign: "center", clear: "both" }
          : { display: "block", margin: "1em 0" };

  // --- Img element styles ---
  const isPx = width && !width.includes("%");
  const imgStyle: React.CSSProperties = {
    display: "block",
    maxWidth: "100%",
    width: width ? (isPx ? `${width}px` : width) : undefined,
    height: isPx && height ? `${height}px` : "auto",
    outline: selected ? "2px solid var(--color-accent)" : undefined,
    outlineOffset: selected ? "2px" : undefined,
    userSelect: "none",
    cursor: "default",
  };

  // --- Handle appearance ---
  const isDragging = !!drag;
  const handleColor = liveShift ? "#f59e0b" : "#2563eb";

  const handleStyle = (which: "bl" | "br"): React.CSSProperties => ({
    position: "absolute",
    width: 11,
    height: 11,
    background: drag?.handle === which ? handleColor : "white",
    border: `2px solid ${handleColor}`,
    borderRadius: 2,
    boxShadow: "0 1px 4px rgba(0,0,0,.25)",
    zIndex: 10,
    cursor: which === "bl" ? "sw-resize" : "se-resize",
    bottom: -5,
    ...(which === "bl" ? { left: -5 } : { right: -5 }),
  });

  // --- Size bar label ---
  const sizeLabel = (() => {
    if (!isDragging) return width ?? "ต้นฉบับ";
    return `${width ?? "?"} × ${height ?? "?"}${liveShift ? " · free" : " · locked"}`;
  })();

  return (
    <NodeViewWrapper as="div" style={wrapperStyle}>
      {/* Image + handles */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt ?? ""}
          draggable={false}
          style={imgStyle}
        />
        {selected && (
          <>
            <div onMouseDown={startDrag("bl")} style={handleStyle("bl")} />
            <div onMouseDown={startDrag("br")} style={handleStyle("br")} />
          </>
        )}
      </div>

      {/* Size bar — rendered below image, only when selected */}
      {selected && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 6,
            padding: "3px 10px",
            background: isDragging ? "#1e1e1e" : "white",
            border: isDragging ? "none" : "1px solid #e5e7eb",
            borderRadius: 7,
            boxShadow: "0 2px 10px rgba(0,0,0,.1)",
            fontSize: 11,
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: isDragging
                ? liveShift
                  ? "#f59e0b"
                  : "white"
                : "#111",
            }}
          >
            {sizeLabel}
          </span>
          {!isDragging && (
            <>
              <span style={{ color: "#d1d5db" }}>·</span>
              {(["25%", "50%", "75%", "100%"] as const).map((p) => (
                <button
                  key={p}
                  onMouseDown={applyPreset(p)}
                  style={{
                    padding: "2px 6px",
                    border: `1px solid ${width === p ? "#93c5fd" : "#e5e7eb"}`,
                    background: width === p ? "#dbeafe" : "#f9fafb",
                    color: width === p ? "#1d4ed8" : "#555",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}
