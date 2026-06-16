"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Image as ImageIcon,
  Layers,
  SquareStack,
} from "lucide-react";
import {
  formatImageWidthLabel,
  imageWidthMatchesPreset,
  normalizeImagePercentWidths,
  resolveImagePresetWidth,
} from "@/lib/imageScale";
import {
  attrsForLayoutMode,
  isFloatingMode,
  layoutModeFromAttrs,
  type ImageLayoutMode,
} from "@/lib/imageLayout";
import {
  getPageContentWidthPx,
  measurePageBodyWidthFromDom,
} from "@/lib/pageContentWidth";
import { unwrapPageNode } from "@/lib/unwrapPageNode";
import { useEditorStore } from "@/store/editorStore";

interface DragState {
  handle: "bl" | "br";
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  ratio: number;
}

interface MoveState {
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
  /** Upper clamp so the image can't be dragged fully off the page (lost). */
  maxX: number;
  maxY: number;
}

/** Word-style layout modes shown in the size-bar "จัดวาง (Layout)" menu. */
const LAYOUT_MODES: {
  mode: ImageLayoutMode;
  label: string;
  Icon: typeof ImageIcon;
}[] = [
  { mode: "block", label: "เต็มความกว้าง (Block)", Icon: ImageIcon },
  { mode: "wrapLeft", label: "ล้อมซ้าย (Wrap left)", Icon: AlignLeft },
  { mode: "wrapRight", label: "ล้อมขวา (Wrap right)", Icon: AlignRight },
  { mode: "center", label: "กึ่งกลาง บน-ล่าง (Top & bottom)", Icon: AlignCenter },
  { mode: "front", label: "หน้าข้อความ (In front)", Icon: Layers },
  { mode: "behind", label: "หลังข้อความ (Behind text)", Icon: SquareStack },
];

export function ImageResizeView({
  node,
  updateAttributes,
  selected,
  getPos,
  editor,
}: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const layoutWrapRef = useRef<HTMLSpanElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [moveDrag, setMoveDrag] = useState<MoveState | null>(null);
  const [liveShift, setLiveShift] = useState(false);
  const [bodyWidthPx, setBodyWidthPx] = useState(0);
  const [layoutOpen, setLayoutOpen] = useState(false);

  const { src, alt, width, height, align, float, posX, posY, zIndex } =
    node.attrs as {
      src: string;
      alt?: string;
      width?: string | null;
      height?: string | null;
      align?: string | null;
      float?: boolean | null;
      posX?: number | null;
      posY?: number | null;
      zIndex?: number | null;
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

  // Close the layout menu on an outside click.
  useEffect(() => {
    if (!layoutOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (!layoutWrapRef.current?.contains(e.target as Node)) setLayoutOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [layoutOpen]);

  useEffect(() => {
    const body = imgRef.current?.closest(".page-body");
    if (!body) return;
    const update = () => setBodyWidthPx(body.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(body);
    return () => ro.disconnect();
  }, [src]);

  const startDrag = useCallback(
    (handle: "bl" | "br") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // don't let a handle drag also start a move drag
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

  // --- Free-positioning move-drag (only when float === true) ---
  useEffect(() => {
    if (!moveDrag) return;

    let rafId: number | null = null;
    const onMove = (e: MouseEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const rawX = Math.round(moveDrag.startPosX + (e.clientX - moveDrag.startX));
        const rawY = Math.round(moveDrag.startPosY + (e.clientY - moveDrag.startY));
        // Clamp to [0, max] so the image stays at least partly on the page.
        const newX = Math.min(moveDrag.maxX, Math.max(0, rawX));
        const newY = Math.min(moveDrag.maxY, Math.max(0, rawY));
        updateAttributes({ posX: newX, posY: newY });
      });
    };
    const onUp = () => setMoveDrag(null);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [moveDrag, updateAttributes]);

  const startMove = useCallback(
    (e: React.MouseEvent) => {
      if (!float) return; // inline images keep normal click-to-select
      e.preventDefault();
      // Select this node so the resize handles + toolbar (incl. Float toggle) show.
      const pos = getPos();
      if (typeof pos === "number") editor.commands.setNodeSelection(pos);
      // Compute the upper drag clamp from the page size, keeping a 24px sliver
      // of the image always on the page so it can never be dragged out of reach.
      const img = imgRef.current;
      const page = img?.closest(".page-node");
      const KEEP_VISIBLE = 24;
      let maxX = Number.POSITIVE_INFINITY;
      let maxY = Number.POSITIVE_INFINITY;
      if (page) {
        const pr = page.getBoundingClientRect();
        maxX = Math.max(0, Math.round(pr.width - KEEP_VISIBLE));
        maxY = Math.max(0, Math.round(pr.height - KEEP_VISIBLE));
      }
      setMoveDrag({
        startX: e.clientX,
        startY: e.clientY,
        startPosX: Number(posX) || 0,
        startPosY: Number(posY) || 0,
        maxX,
        maxY,
      });
    },
    [float, posX, posY, getPos, editor]
  );

  const currentMode = layoutModeFromAttrs({ align, float, zIndex });

  // Apply a Word-style layout mode. In-flow modes (block/wrap/center) just set
  // align + clear float; floating modes (front/behind) additionally seed a start
  // position from the image's current spot on the page so it doesn't jump to the
  // corner when it first becomes free-floating.
  const applyLayout = useCallback(
    (mode: ImageLayoutMode) => (e: React.MouseEvent) => {
      e.preventDefault();
      setLayoutOpen(false);
      const patch = attrsForLayoutMode(mode);
      if (isFloatingMode(mode)) {
        // Seed posX/posY only when transitioning from non-floating; if already
        // floating, keep the user's dragged position.
        let posPatch: { posX?: number; posY?: number } = {};
        if (!float) {
          const img = imgRef.current;
          const page = img?.closest(".page-node");
          let initX = 0;
          let initY = 0;
          if (img && page) {
            const ir = img.getBoundingClientRect();
            const pr = page.getBoundingClientRect();
            initX = Math.max(0, Math.round(ir.left - pr.left));
            initY = Math.max(0, Math.round(ir.top - pr.top));
          }
          posPatch = { posX: initX, posY: initY };
        }
        updateAttributes({ ...patch, ...posPatch });
      } else {
        // Back to the flow — reset the free position so a later float starts fresh.
        updateAttributes({ ...patch, posX: 0, posY: 0 });
      }
    },
    [float, updateAttributes]
  );

  const applyPreset = (preset: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const body = imgRef.current?.closest(".page-body");
    const measuredW = body?.getBoundingClientRect().width ?? bodyWidthPx;
    const pageSetup = useEditorStore.getState().pageSetup;
    const fallbackW = getPageContentWidthPx(pageSetup);
    const resolved = resolveImagePresetWidth(preset, measuredW, fallbackW);
    updateAttributes({ width: resolved, height: null });
    // Sync store immediately so Preview never reads stale debounced HTML.
    const html = normalizeImagePercentWidths(
      unwrapPageNode(editor.getHTML()),
      pageSetup,
      measuredW > 0 ? Math.round(measuredW) : measurePageBodyWidthFromDom()
    );
    useEditorStore.getState().setHtml(html);
  };

  const focusAfterImage = useCallback(() => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const after = pos + node.nodeSize;
    editor.chain().focus().setTextSelection(after).run();
  }, [editor, getPos, node.nodeSize]);

  const handleWrapperClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const clickedBelowImage = e.clientY > rect.bottom + 4;
      const clickedSizeBar = (e.target as HTMLElement).closest("button") !== null;
      if (clickedBelowImage && !clickedSizeBar) {
        e.preventDefault();
        focusAfterImage();
      }
    },
    [focusAfterImage]
  );

  // --- Wrapper style ---
  // Floating: position:absolute anchored to the page (.page-node, the nearest
  // positioned ancestor). This both places the image freely and removes it from
  // the flow (zero footprint), so pagination measurement ignores it.
  // Inline: alignment wrapper (mirrors CSS for A4Preview).
  const baseZ = Number(zIndex) || 5;
  const wrapperStyle: React.CSSProperties = float
    ? {
        position: "absolute",
        left: Number(posX) || 0,
        top: Number(posY) || 0,
        // While selected, force the image (and therefore its handles + size bar)
        // to the front so a "behind text" image stays editable; the stored
        // z-index (e.g. -1) re-applies once the selection clears.
        zIndex: selected ? Math.max(50, baseZ) : baseZ,
        margin: 0,
      }
    : align === "left"
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
    cursor: float ? (moveDrag ? "grabbing" : "grab") : "default",
  };

  // --- Handle appearance ---
  const isDragging = !!drag;
  const handleColor = liveShift ? "var(--color-warning)" : "var(--color-accent)";

  const handleStyle = (which: "bl" | "br"): React.CSSProperties => ({
    position: "absolute",
    width: 11,
    height: 11,
    background: drag?.handle === which ? handleColor : "var(--color-surface)",
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
    if (!isDragging) {
      return formatImageWidthLabel(width, bodyWidthPx);
    }
    return `${width ?? "?"} × ${height ?? "?"}${liveShift ? " · free" : " · locked"}`;
  })();

  return (
    <NodeViewWrapper
      as="div"
      style={wrapperStyle}
      onClick={handleWrapperClick}
      // Marker so the pagination engine can detect a floating (out-of-flow) image
      // in O(1) via el.matches('[data-float="true"]') — the inner <img> also carries
      // data-float for serialization, but the wrapper is what pagination iterates.
      data-float={float ? "true" : undefined}
    >
      {/* Image + handles */}
      <div style={{ position: "relative", display: "inline-block" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt ?? ""}
          draggable={false}
          onMouseDown={startMove}
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
            background: isDragging ? "var(--color-foreground)" : "var(--color-surface)",
            border: isDragging ? "none" : "1px solid var(--color-border)",
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
                  ? "var(--color-warning)"
                  : "var(--color-background)"
                : "var(--color-foreground)",
            }}
          >
            {sizeLabel}
          </span>
          {!isDragging && (
            <>
              <span style={{ color: "var(--color-border-strong)" }}>·</span>
              <span
                ref={layoutWrapRef}
                style={{ position: "relative", display: "inline-flex" }}
              >
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setLayoutOpen((o) => !o);
                  }}
                  title="จัดวางรูปภาพ / ตัดข้อความ (Layout / Wrap text)"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    border: `1px solid ${float ? "color-mix(in srgb, var(--color-accent) 50%, var(--color-border))" : "var(--color-border)"}`,
                    background: float
                      ? "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))"
                      : "var(--color-muted)",
                    color: float ? "var(--color-accent)" : "var(--color-muted-foreground)",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <Layers className="size-3" />
                  จัดวาง (Layout)
                </button>
                {layoutOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      zIndex: 60,
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 196,
                      padding: 4,
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      boxShadow: "0 6px 20px rgba(0,0,0,.16)",
                    }}
                  >
                    {LAYOUT_MODES.map(({ mode, label, Icon }) => {
                      const active = mode === currentMode;
                      return (
                        <button
                          key={mode}
                          onMouseDown={applyLayout(mode)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "5px 8px",
                            border: "none",
                            borderRadius: 5,
                            background: active
                              ? "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))"
                              : "transparent",
                            color: active
                              ? "var(--color-accent)"
                              : "var(--color-foreground)",
                            fontSize: 11,
                            fontWeight: active ? 600 : 500,
                            cursor: "pointer",
                            textAlign: "left",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Icon className="size-3.5" style={{ flexShrink: 0 }} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </span>
              <span style={{ color: "var(--color-border-strong)" }}>·</span>
              {(["25%", "50%", "75%", "100%"] as const).map((p) => (
                <button
                  key={p}
                  onMouseDown={applyPreset(p)}
                  style={{
                    padding: "2px 6px",
                    border: `1px solid ${imageWidthMatchesPreset(width, p, bodyWidthPx) ? "color-mix(in srgb, var(--color-accent) 50%, var(--color-border))" : "var(--color-border)"}`,
                    background: imageWidthMatchesPreset(width, p, bodyWidthPx) ? "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))" : "var(--color-muted)",
                    color: imageWidthMatchesPreset(width, p, bodyWidthPx) ? "var(--color-accent)" : "var(--color-muted-foreground)",
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
