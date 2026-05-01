# Image Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-to-resize handles on selected images with a floating size bar showing live dimensions and preset buttons.

**Architecture:** Replace the current plain `<img>` rendering in the Tiptap editor with a React NodeView (`ImageResizeView`) that wraps the image with two corner drag handles (BL/BR) and a size bar. The NodeView only runs in the editor — A4Preview and export still use `renderHTML`. Sizes are stored as `width`/`height` node attributes: px strings after drag (`"320"`, `"200"`), or `%` strings after preset (`"50%"`, null height).

**Tech Stack:** Tiptap v3, `@tiptap/react` (ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps), React 19, TypeScript strict, Tailwind v4, Next.js 16 App Router.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/tiptap/imageWithAlign.ts` | Modify | Add `height` attr, wire `ReactNodeViewRenderer`, update `renderHTML` |
| `src/components/editor/ImageResizeView.tsx` | **Create** | React NodeView: drag handles, size bar, aspect ratio logic |
| `src/app/globals.css` | Modify | Update image CSS for NodeView wrapper + preserve height |
| `src/components/editor/FormattingToolbar.tsx` | Modify | Remove width preset buttons (lines 231–273) |
| `src/lib/cleaning/cleaners.ts` | Modify | Preserve `width` + `height` in `removeInlineStyles` |

---

## Task 1: Add `height` attribute and NodeView to `imageWithAlign.ts`

**Files:**
- Modify: `src/lib/tiptap/imageWithAlign.ts`

- [ ] **Step 1: Replace the file with height attr + NodeView wiring**

```typescript
// src/lib/tiptap/imageWithAlign.ts
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageResizeView } from "@/components/editor/ImageResizeView";

export const ImageWithAlign = Image.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      align: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-align"),
        renderHTML: (attrs) =>
          attrs.align ? { "data-align": attrs.align as string } : {},
      },
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute("width") ?? el.style.width ?? null,
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          const w = attrs.width as string;
          // % widths: just the attribute; px widths: also inline style
          return w.includes("%")
            ? { width: w }
            : { width: w, style: `width:${w}px` };
        },
      },
      height: {
        default: null,
        parseHTML: (el) => el.getAttribute("height") ?? null,
        renderHTML: (attrs) => {
          if (!attrs.height) return {};
          const h = attrs.height as string;
          return { height: h, style: `height:${h}px` };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageResizeView);
  },
}).configure({
  inline: false,
  allowBase64: true,
});
```

- [ ] **Step 2: Verify TypeScript compiles (no ImageResizeView yet — expect import error)**

```bash
cd C:\Users\510273\Desktop\Webhtml && npx tsc --noEmit 2>&1 | head -10
```

Expected: error about missing `ImageResizeView` module — that's fine, we create it next.

---

## Task 2: Create `ImageResizeView.tsx` — React NodeView

**Files:**
- Create: `src/components/editor/ImageResizeView.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/components/editor/ImageResizeView.tsx
"use client";

import { useEffect, useRef, useState } from "react";
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

    const onMove = (e: MouseEvent) => {
      setLiveShift(e.shiftKey);
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
    };

    const onUp = () => {
      setDrag(null);
      setLiveShift(false);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [drag, updateAttributes]);

  const startDrag =
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
    };

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
  const handleColor = isDragging && liveShift ? "#f59e0b" : "#2563eb";

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
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
cd C:\Users\510273\Desktop\Webhtml && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (clean).

- [ ] **Step 3: Check dev server compiled**

```bash
cat "C:\Users\510273\AppData\Local\Temp\claude\C--Users-510273-Desktop-Webhtml\fb09c80d-4bef-4a2e-be9d-91313f00feb6\tasks\bi5fu27ew.output" | tail -5
```

Expected: `✓ Compiled` with no errors.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\510273\Desktop\Webhtml && git add src/lib/tiptap/imageWithAlign.ts src/components/editor/ImageResizeView.tsx && git commit -m "feat(editor): image resize NodeView with drag handles and size bar"
```

---

## Task 3: Update `globals.css` for NodeView wrapper

The NodeView renders a wrapper `div` instead of a bare `<img>` in the editor. Old CSS selectors `.prose-editor img[data-align="..."]` won't match anymore. Update selectors so both the editor (NodeView div) and A4Preview (plain img) work.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace image alignment CSS block**

Find and replace this block (lines ~200–237):

**Old:**
```css
.prose-editor img,
.paper img {
  max-width: 100%;
  height: auto;
}

/* Default block image (no alignment): center-ish stack */
.prose-editor img:not([data-align]),
.paper img:not([data-align]) {
  display: block;
  margin: 1em 0;
}

.prose-editor img[data-align="left"],
.paper img[data-align="left"] {
  float: left;
  margin: 0.5em 1em 0.5em 0;
  clear: left;
}
.prose-editor img[data-align="center"],
.paper img[data-align="center"] {
  display: block;
  margin: 1em auto;
  clear: both;
  float: none;
}
.prose-editor img[data-align="right"],
.paper img[data-align="right"] {
  float: right;
  margin: 0.5em 0 0.5em 1em;
  clear: right;
}

/* Selected image (Tiptap adds .ProseMirror-selectednode to selected node) */
.prose-editor img.ProseMirror-selectednode {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

**New:**
```css
/* Base image styles */
.prose-editor img,
.paper img {
  max-width: 100%;
  height: auto;
}

/* A4Preview / export: alignment via data-align on <img> */
.paper img:not([data-align]) { display: block; margin: 1em 0; }
.paper img[data-align="left"]   { float: left;  margin: 0.5em 1em 0.5em 0; clear: left; }
.paper img[data-align="center"] { display: block; margin: 1em auto; clear: both; float: none; }
.paper img[data-align="right"]  { float: right; margin: 0.5em 0 0.5em 1em; clear: right; }

/* Editor NodeView: alignment handled inline by ImageResizeView,
   but keep a fallback for any non-NodeView img (e.g. paste before extension loads) */
.prose-editor img:not([data-align]) { display: block; margin: 1em 0; }
.prose-editor img[data-align="left"]   { float: left;  margin: 0.5em 1em 0.5em 0; clear: left; }
.prose-editor img[data-align="center"] { display: block; margin: 1em auto; clear: both; float: none; }
.prose-editor img[data-align="right"]  { float: right; margin: 0.5em 0 0.5em 1em; clear: right; }
```

- [ ] **Step 2: Verify dev server still compiles**

```bash
cat "C:\Users\510273\Desktop\Webhtml\.superpowers\brainstorm\3690-1777644382\state\server-info" 2>/dev/null && echo "server alive"
```

- [ ] **Step 3: Commit**

```bash
cd C:\Users\510273\Desktop\Webhtml && git add src/app/globals.css && git commit -m "fix(css): update image alignment selectors for NodeView wrapper"
```

---

## Task 4: Preserve `width` and `height` in `removeInlineStyles` cleaner

`imageWithAlign.ts` now emits `style="width:320px;height:200px"` for pixel-sized images. The `removeInlineStyles` cleaner would strip these. Preserve them alongside `margin-left` and `text-indent`.

**Files:**
- Modify: `src/lib/cleaning/cleaners.ts`

- [ ] **Step 1: Replace `removeInlineStyles` function**

```typescript
// Replace the existing removeInlineStyles function (lines 44–49):
// ---------- 1. Remove inline styles ----------
// Preserves structural layout properties: margin-left, text-indent (paragraph indent),
// and width/height (image drag-resize). Everything else (Word mso-* junk) is stripped.
export function removeInlineStyles(html: string): string {
  if (!html) return html;
  const doc = parse(html);
  const KEEP = ["margin-left", "text-indent", "width", "height"];
  doc.body.querySelectorAll("[style]").forEach((el) => {
    const s = (el as HTMLElement).style;
    const saved: [string, string][] = KEEP
      .map((p) => [p, s.getPropertyValue(p)] as [string, string])
      .filter(([, v]) => v);
    el.removeAttribute("style");
    for (const [prop, val] of saved) {
      (el as HTMLElement).style.setProperty(prop, val);
    }
  });
  return serialize(doc);
}
```

- [ ] **Step 2: Run existing tests to verify cleaner behavior is still correct**

```bash
cd C:\Users\510273\Desktop\Webhtml && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|removeInlineStyles)"
```

Expected: all tests pass. The existing test for `removeInlineStyles` checks that `style` attributes are stripped; it should still pass because non-preserved styles are still removed.

- [ ] **Step 3: Commit**

```bash
cd C:\Users\510273\Desktop\Webhtml && git add src/lib/cleaning/cleaners.ts && git commit -m "fix(cleaner): preserve width/height inline styles (image resize)"
```

---

## Task 5: Remove width presets from `FormattingToolbar.tsx`

The preset buttons (S/M/L/XL/Reset at lines 231–273) now live in the ImageResizeView size bar. Remove the duplicate from the toolbar.

**Files:**
- Modify: `src/components/editor/FormattingToolbar.tsx`

- [ ] **Step 1: Remove the image width section and its related helpers**

Remove these lines entirely from `FormattingToolbar.tsx`:

Lines to delete — the `setImageWidth` function (lines 59–61):
```typescript
const setImageWidth = (width: string | null) => {
  editor.chain().focus().updateAttributes("image", { width }).run();
};
```

Lines to delete — the `isImageWidth` function (lines 67–69):
```typescript
const isImageWidth = (width: string): boolean => {
  return imageAttrs.width === width;
};
```

Lines to delete — the `{/* ขนาดรูปภาพ */}` conditional block (lines 231–273):
```typescript
{/* ขนาดรูปภาพ (แสดงเฉพาะตอนเลือกรูป) */}
{isImage && (
  <>
    <Divider />
    <ToolGroup>
      <ToolButton label="ขนาดเล็ก (25%)" onClick={() => setImageWidth("25%")} active={isImageWidth("25%")}>
        <span className="text-[10px] font-bold leading-none">S</span>
      </ToolButton>
      <ToolButton label="ขนาดกลาง (50%)" onClick={() => setImageWidth("50%")} active={isImageWidth("50%")}>
        <span className="text-[10px] font-bold leading-none">M</span>
      </ToolButton>
      <ToolButton label="ขนาดใหญ่ (75%)" onClick={() => setImageWidth("75%")} active={isImageWidth("75%")}>
        <span className="text-[10px] font-bold leading-none">L</span>
      </ToolButton>
      <ToolButton label="ขนาดเต็ม (100%)" onClick={() => setImageWidth("100%")} active={isImageWidth("100%")}>
        <span className="text-[10px] font-bold leading-none">XL</span>
      </ToolButton>
      <ToolButton label="ขนาดต้นฉบับ" onClick={() => setImageWidth(null)} active={!imageAttrs.width}>
        <RotateCcw />
      </ToolButton>
    </ToolGroup>
  </>
)}
```

Also remove the now-unused `imageAttrs.width` destructure — update the `imageAttrs` type:
```typescript
// Change from:
const imageAttrs = editor.getAttributes("image") as {
  align?: string;
  width?: string | null;
};
// To:
const imageAttrs = editor.getAttributes("image") as {
  align?: string;
};
```

And remove the `RotateCcw` import from lucide-react (line 33) if it's no longer used anywhere else in the file.

- [ ] **Step 2: Verify TypeScript clean**

```bash
cd C:\Users\510273\Desktop\Webhtml && npx tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 3: Run tests**

```bash
cd C:\Users\510273\Desktop\Webhtml && npm test 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\510273\Desktop\Webhtml && git add src/components/editor/FormattingToolbar.tsx && git commit -m "refactor(toolbar): remove image width presets (moved to size bar)"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Start dev server (if not running)**

```bash
cd C:\Users\510273\Desktop\Webhtml && npm run dev
```

Open http://localhost:3000/app

- [ ] **Step 2: Insert an image**

Insert → Image → URL → use `https://picsum.photos/400/300`

Expected: image appears in editor with no errors.

- [ ] **Step 3: Click image → handles appear**

Click the image. Expected:
- Blue outline around image
- Two corner handles (bottom-left, bottom-right)
- Size bar below with `ต้นฉบับ` label and 25%/50%/75%/100% buttons

- [ ] **Step 4: Click a preset**

Click `50%` in the size bar. Expected: image width changes to 50% of content width, `50%` button highlights blue.

- [ ] **Step 5: Drag BR handle (locked AR)**

Drag the BR handle right. Expected:
- Image resizes proportionally
- Size bar shows live `W × H · locked` in dark bg
- Handle turns dark blue

- [ ] **Step 6: Drag BR handle with Shift (free)**

Hold Shift while dragging. Expected:
- Size bar shows `W × H · free` in amber text
- Handle turns amber
- Width and height resize independently

- [ ] **Step 7: Drag BL handle**

Drag the BL handle left. Expected: image gets larger (dragging outward = increase).

- [ ] **Step 8: Min size constraint**

Drag to make the image very small. Expected: stops at ~50px and doesn't go smaller.

- [ ] **Step 9: Click outside**

Click outside the image. Expected: handles and size bar disappear.

- [ ] **Step 10: Export HTML and verify output**

File → Export HTML. Expected:
- After preset: `<img src="..." width="50%" data-align="...">`
- After drag: `<img src="..." width="320" height="200" style="width:320px;height:200px" ...>`

- [ ] **Step 11: Export with removeInlineStyles cleaner ON**

Enable "สไตล์ inline" cleaner, export again. Expected: `width` and `height` style properties survive; other inline styles removed.

- [ ] **Step 12: Test in A4 Preview**

Open A4 Preview (View → A4 Preview). Insert and resize an image. Expected: A4 Preview shows the correct size (via renderHTML output), not NodeView.

---

## Self-Review

**Spec coverage:**
- ✅ Drag BL/BR handles → Task 2
- ✅ Lock aspect ratio (default) → Task 2 `locked = !e.shiftKey`
- ✅ Shift = free resize → Task 2 `liveShift` state
- ✅ 25/50/75/100% presets in size bar → Task 2 `applyPreset`
- ✅ Live W×H display during drag → Task 2 `sizeLabel`
- ✅ Min size 50px → Task 2 `Math.max(50, ...)`
- ✅ HTML output px attrs after drag → Task 1 `renderHTML`
- ✅ HTML output % attr after preset → Task 2 `applyPreset` sets `height: null`
- ✅ `removeInlineStyles` preserves width/height → Task 4
- ✅ FormattingToolbar presets removed → Task 5
- ✅ A4Preview still works (renderHTML unchanged in behavior) → Task 3

**Placeholder scan:** No TBD, no "implement later", all steps have complete code.

**Type consistency:**
- `DragState.handle: "bl" | "br"` — used consistently in Task 2
- `updateAttributes({ width: String(newW), height: String(newH) })` — matches attr types (string | null)
- `node.attrs` cast matches attr definitions in Task 1
