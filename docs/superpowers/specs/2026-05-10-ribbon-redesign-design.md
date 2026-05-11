# Design Spec: Ribbon UI Redesign for wordhtml Editor

## Context

wordhtml is a client-side document editor (Next.js 16 + Tiptap) that currently uses a traditional menu bar (7 dropdown menus) + formatting toolbar layout. The audit found 6 pain points:

1. Toolbar clutter — 20+ buttons with no grouping
2. No "Clean Now" — cleaners only accessible via Export dialog
3. 7 Menus are excessive — overlap with toolbar functionality
4. Missing UI feedback — no loading states, minimal undo/redo indicators
5. Cleaners are hidden deep — requires opening Export dialog
6. Mobile blocker is poor — blocks screens < 768px with no fallback

## Goals

- Reduce UI complexity while maintaining all current features
- Surface cleaning functionality prominently
- Add clear UI feedback for all user actions
- Provide a usable mobile experience

## Design Direction: Professional Ribbon (Direction B)

Replace the 7-menu + toolbar layout with a 5-tab ribbon interface inspired by Microsoft Word / Google Docs. Each tab groups related functionality into labeled sections.

## Tab Structure

| Tab | Contents | Replaces |
|-----|----------|----------|
| **Home** | Clipboard, Font, Paragraph, Styles, Edit groups | FormattingToolbar + FileMenu/EditMenu/FormatMenu |
| **Insert** | Image, Table, Link, HR, Page Break, TOC, Variable, Template | InsertMenu |
| **Layout** | Margins, Page Size, Orientation, Header/Footer, Ruler | PageSetupDialog + TableMenu |
| **Clean** | Clean Now, Preview, Reset, all 9 cleaners with checkboxes | CleaningToolbar (was buried in ExportDialog) |
| **View** | Fullscreen, Zoom, Dark Mode, Source HTML, Multi-page | ViewMenu |

### Home Tab Detail

Groups (left to right):

1. **Clipboard**: Paste, Cut, Copy, Select All
2. **Font**: Font family dropdown, Font size dropdown, Bold, Italic, Underline, Strikethrough, Text color, Highlight color
3. **Paragraph**: Align left/center/right/justify, Line spacing, Bullets, Numbering, Indent in/out
4. **Styles**: H1, H2, H3, Blockquote, Code block, Clear formatting
5. **Edit**: Undo, Redo, Find/Replace shortcut

### Clean Tab Detail

This is the most important new tab. It surfaces cleaning functionality that was previously buried in the Export dialog.

Groups:

1. **Actions**: Clean Now (primary button), Preview toggle, Reset to original
2. **Cleaners**: All 9 cleaners as labeled checkboxes with visual on/off state
3. **Result**: Before/After preview panels showing the effect of selected cleaners

**Clean Now behavior**: Applies enabled cleaners directly to the editor content (not just at export). Shows a toast with summary: "12 inline styles removed, 3 empty tags removed".

## UI Feedback Improvements

### Status Bar (Enhanced)

Current status bar shows: Pages, Words, Chars, Paper size, Orientation.

Enhanced status bar adds:
- **Save indicator**: "● Saved" (green) / "○ Unsaved" (amber) with timestamp
- **Action feedback**: Brief text for last action ("Cleaned", "Snapshot saved")
- **Progress**: Small progress bar during import/export operations

### Toast Notifications

Replace basic toasts with richer, longer-lasting notifications:

- **Success**: Green border, checkmark icon, descriptive text ("Document cleaned — 12 styles removed")
- **Info**: Blue border, info icon ("Snapshot saved")
- **Warning**: Amber border ("Large document — may take longer to process")
- **Duration**: 4 seconds (up from current ~2 seconds)
- **Action**: Optional "Undo" button in toast for destructive actions

### Loading States

Add explicit loading indicators for:

- **Importing DOCX**: Progress bar with "Importing... 45%"
- **Cleaning**: Spinner with "Applying cleaners..."
- **Exporting**: Progress bar for ZIP packaging (can take time with many images)
- **Pagination**: Subtle spinner in status bar when recalculating page breaks

## Mobile Adaptation

Replace the current `< MobileBlock />` (which shows a blocking overlay) with a responsive collapsed ribbon:

- **Screen < 768px**: Show a single horizontal scrollable toolbar row
- **Most-used actions**: Bold, Italic, Font, Size, Clean button (always visible)
- **More button**: "⋯" opens a bottom sheet with remaining actions organized by category
- **Paper**: Full-width with reduced margins (16px instead of calculated A4 margins)
- **Ruler**: Hidden on mobile

## Component Changes

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Ribbon.tsx` | `src/components/editor/Ribbon.tsx` | Main ribbon container with tabs |
| `RibbonTabHome.tsx` | `src/components/editor/ribbon/` | Home tab content |
| `RibbonTabInsert.tsx` | `src/components/editor/ribbon/` | Insert tab content |
| `RibbonTabLayout.tsx` | `src/components/editor/ribbon/` | Layout tab content |
| `RibbonTabClean.tsx` | `src/components/editor/ribbon/` | Clean tab content + Clean Now logic |
| `RibbonTabView.tsx` | `src/components/editor/ribbon/` | View tab content |
| `RibbonGroup.tsx` | `src/components/editor/ribbon/` | Reusable group wrapper with label |
| `MobileToolbar.tsx` | `src/components/editor/MobileToolbar.tsx` | Collapsed mobile toolbar |

### Modified Components

| Component | Changes |
|-----------|---------|
| `EditorShell.tsx` | Replace MenuBar + FormattingToolbar with `<Ribbon />` + `<MobileToolbar />` |
| `CleaningToolbar.tsx` | Extract cleaner toggle logic to share with RibbonTabClean |
| `ExportDialog.tsx` | Remove cleaners from export dialog (now in Clean tab). Keep format selection + download buttons only. |
| `StatusBar.tsx` | Add save indicator, action feedback text |
| `MobileBlock.tsx` | Remove or repurpose as fallback for screens < 360px |

### Removed Components

| Component | Reason |
|-----------|--------|
| `MenuBar.tsx` | Replaced by Ribbon tabs |
| `FormattingToolbar.tsx` | Replaced by Home tab |
| `menu/FileMenu.tsx` | Replaced by Home tab + Export button in title bar |
| `menu/EditMenu.tsx` | Replaced by Home tab |
| `menu/FormatMenu.tsx` | Replaced by Home tab |
| `menu/InsertMenu.tsx` | Replaced by Insert tab |
| `menu/ViewMenu.tsx` | Replaced by View tab |
| `menu/TableMenu.tsx` | Replaced by Insert tab |
| `menu/ToolsMenu.tsx` | Replaced by Clean tab |

## State Management

No new Zustand stores needed. Reuse existing:

- `editorStore.enabledCleaners` — shared between Clean tab and ExportDialog
- `editorStore.documentHtml` — Clean Now applies cleaners to this directly
- `uiStore` — tab active state can be local to Ribbon component

## File Structure After Changes

```
src/components/editor/
├── Ribbon.tsx              # NEW — main ribbon container
├── ribbon/
│   ├── RibbonTabHome.tsx   # NEW
│   ├── RibbonTabInsert.tsx # NEW
│   ├── RibbonTabLayout.tsx # NEW
│   ├── RibbonTabClean.tsx  # NEW
│   ├── RibbonTabView.tsx   # NEW
│   └── RibbonGroup.tsx     # NEW — reusable group wrapper
├── MobileToolbar.tsx       # NEW — mobile collapsed toolbar
├── EditorShell.tsx         # MODIFIED
├── StatusBar.tsx           # MODIFIED
├── ExportDialog.tsx        # MODIFIED — remove cleaners
├── CleaningToolbar.tsx     # MODIFIED — extract shared logic
└── (remove MenuBar.tsx, FormattingToolbar.tsx, menu/ directory)
```

## Design Tokens

Use existing Tailwind tokens from `globals.css`. Ribbon-specific additions:

- **Ribbon height**: 96px (tabs 32px + content 64px)
- **Tab active**: `bg-white border-t-2 border-primary`
- **Tab inactive**: `bg-slate-50 text-slate-500`
- **Group separator**: `border-r border-slate-200`
- **Group label**: `text-[9px] uppercase tracking-wider text-slate-400`
- **Button size**: `h-7 px-2` (compact ribbon buttons)

## Accessibility

- Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"`
- Arrow keys navigate between tabs
- Home/End jump to first/last tab
- All ribbon buttons have `aria-label` in Thai + English
- Focus trap within ribbon when using keyboard
- Reduced motion: disable ribbon slide animations

## Testing Strategy

1. **Visual regression**: Screenshot ribbon at 1024px and 1440px widths
2. **E2E**: Test tab switching, Clean Now button, mobile toolbar collapse
3. **Unit**: RibbonGroup renders children correctly
4. **Manual**: Verify all 7 original menus' functionality exists in new tabs

## Migration Notes

- This is a breaking UI change. Existing users will need to relearn where features are.
- Mitigation: First-time tooltip tour on load showing "Clean is now in its own tab"
- Keyboard shortcuts remain unchanged — power users unaffected
- `beforeunload` warning and auto-save behavior unchanged

## Out of Scope

- New cleaning algorithms (use existing 9 cleaners)
- New export formats (keep existing 4)
- New Tiptap extensions
- Backend/server changes (remains client-side only)

## Success Criteria

- [ ] All 7 original menu functions accessible within 5 tabs
- [ ] Clean Now button visible without opening export dialog
- [ ] Mobile < 768px shows usable editor (not blocking overlay)
- [ ] Status bar shows save state and recent action
- [ ] Toasts last 4+ seconds with descriptive text
- [ ] No console errors after migration
- [ ] Build passes (`npm run build`)
