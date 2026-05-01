# Image Resize Design

## Problem

The current image system only supports preset percentage widths (25/50/75/100%) via toolbar buttons. Users cannot visually resize images by dragging — the interaction is indirect and imprecise.

## Solution: Drag Handles + Size Bar (Option C)

When an image is selected in the editor, show:
- **2 corner handles** (bottom-left, bottom-right) for drag resizing
- **Size bar** floating below the image showing `W × H px` + preset buttons

### Resize Behavior

| Action | Result |
|--------|--------|
| Drag BL/BR handle | Resize locked to original aspect ratio |
| Shift + drag | Free resize (width/height independent) |
| Click 25/50/75/100% preset | Set width as % of content area |
| Click outside image | Deselect — handles and size bar disappear |
| Min size | 50 × 50 px |
| Max size | 100% of content area width |

### States

1. **Selected (idle)**: blue outline + 2 handles + size bar with presets
2. **Dragging (locked)**: active handle turns dark blue, badge shows live px dimensions
3. **Shift+dragging (free)**: handle turns amber, badge shows "free"

## HTML Output

```html
<!-- After drag → stored as px -->
<img src="..." width="320" height="200" data-align="center" />

<!-- After preset → stored as % -->
<img src="..." width="50%" data-align="center" />
```

`height` attribute is only written when set via drag (not for %-based preset).

## Architecture

### New file: `src/components/editor/ImageResizeView.tsx`
React NodeView component. Renders the image with:
- Wrapper `div` (position: relative)
- `<img>` element with current width/height attrs
- Two handle `div`s (BL, BR corners) — visible only when `selected`
- Size bar `div` — visible only when `selected`

**Drag logic (inside NodeView):**
```
mousedown on handle
  → capture startX, startY, startW, startH (from img.getBoundingClientRect())
  → capture naturalW/H ratio

mousemove (global, while dragging)
  → dx = e.clientX - startX
  → newW = max(50, startW + dx)
  → if locked: newH = round(newW / ratio)
  → if Shift: newH = max(50, startH + dy)
  → updateAttributes({ width: String(newW), height: locked ? String(newH) : String(newH) })

mouseup → clear drag state
```

### Modified: `src/lib/tiptap/imageWithAlign.ts`
- Add `height` attribute (default: null, parseHTML reads `height` attr, renderHTML writes `height` attr)
- Add `addNodeView()` → returns `ReactNodeViewRenderer(ImageResizeView)`

### Modified: `src/app/globals.css`
- Add `img[width]` style to apply width correctly in `.prose-editor` and `.paper`
- Ensure `height: auto` is overridden when height attr is present

### Modified: `src/components/editor/FormattingToolbar.tsx`
- Remove the image width preset buttons section (lines ~231-273) — presets now live in the size bar
- Keep alignment buttons (left/center/right) — those remain in the toolbar

## Self-Review

- ✅ No TBD sections
- ✅ Architecture is consistent with existing NodeView patterns in Tiptap v3
- ✅ Backward compatible: existing `width="50%"` images continue to render correctly
- ✅ `height` attr only written when set by drag, not breaking existing HTML
- ✅ FormattingToolbar cleanup scoped — only removes width presets, keeps alignment
- ✅ Focused: no unrelated refactoring
