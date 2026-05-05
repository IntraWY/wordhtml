# Vertical Ruler Interactive Design

## Goal
Make the vertical ruler fully interactive with draggable margin handles, matching the horizontal ruler's UX.

## Changes

### 1. Ruler.tsx
- `marginInteractive`: change from `isH && !!onMarginChange` to `!!onMarginChange`
- `anyInteractive`: include vertical margin interactions
- Add vertical margin handle rendering (top + bottom)
- Handle style: 14x8px bar, 20x20px hit area, `#4b5563`, hover `scale-[1.15]`, active `scale-125`
- Cursor: `ns-resize`
- Add `marginTopMm` / `marginBottomMm` optional props
- Add `onRulerActive` support for vertical handles
- Tooltip: `"ขอบบน (Top): 25.0 มม."` / `"ขอบล่าง (Bottom): 25.0 มม."`
- Snap: 5mm (Shift to disable)
- Keyboard: ArrowUp/ArrowDown, 1mm step
- Clamp: top + bottom margins must leave >= 20mm content height
- Touch support via `clientY`

### 2. EditorShell.tsx
- Pass `marginTopMm`, `marginBottomMm`, `onMarginChange`, `onRulerActive` to vertical `Ruler`
- `handleMarginChange` already supports all 4 margins; just wire vertical values
- Add `handleRulerActive` to vertical ruler

### 3. StatusBar.tsx
- Already supports `rulerInfo` prop — no changes needed

## Verification
1. Hover top/bottom handles → scale + color change
2. Drag top handle → tooltip shows value, margin updates
3. Drag bottom handle → same
4. StatusBar shows ruler value during hover/drag
5. Keyboard ArrowUp/ArrowDown adjusts focused handle
6. Touch drag works
7. Build passes, tests pass
