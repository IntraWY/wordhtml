---
name: wordhtml
description: Client-side Word ↔ HTML converter with a print-accurate A4 paper editor, Thai-first.
colors:
  ink-blue: "#3B82F6"
  ink-blue-hover: "#2563EB"
  warm-stone: "#faf8f5"
  espresso-ink: "#1c1917"
  sand: "#f0ebe3"
  slate-stone: "#57534e"
  border-stone: "#e7e0d6"
  border-stone-strong: "#d6cec3"
  desk-linen: "#e8e2d9"
  paper-white: "#ffffff"
  surface: "#fffefb"
  approved-green: "#16a34a"
  alert-red: "#dc2626"
  caution-amber: "#d97706"
  merge-field-amber: "#c2410c"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink-blue}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.ink-blue-hover}"
  button-secondary:
    backgroundColor: "{colors.warm-stone}"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.md}"
  ribbon-button:
    backgroundColor: "transparent"
    textColor: "{colors.slate-stone}"
    rounded: "{rounded.md}"
    height: "28px"
    padding: "0 8px"
  button-danger:
    backgroundColor: "{colors.alert-red}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.md}"
---

# Design System: wordhtml

## 1. Overview

**Creative North Star: "The Quiet Drafting Table"**

wordhtml is a calm, precise instrument for people who live in Microsoft Word and need to move
documents to clean HTML and back, build official Thai letters, and run mail-merge — without
ever uploading a sensitive file. The interface is a warm-stone *desk*; the white A4 page sits
on it like a real sheet of paper; Ink Blue is the pen you only pick up to act. Everything
that is not the page recedes so the document can be the subject.

It rejects the two failure modes its users already suffer: the **bloated legacy MS-Office
chrome** (cluttered ribbons, heavy gradients, dated bevels) and the **dated Google-Docs grey**
(washed-out grey-on-grey with no hierarchy). It is quieter than Office and warmer than Docs.
No generic AI/SaaS slop — no gradient text, no glassmorphism, no identical icon-card grids.

**Key Characteristics:**
- Warm stone neutrals, never cold grey or AI-cream.
- A single Ink-Blue accent for action/selection/focus — nothing decorative.
- The A4 page is the one hero surface; chrome is flat and quiet.
- Thai-first bilingual labels; Word-fluent affordances.
- WYSIWYG print fidelity: the on-screen page is a literal preview of the export.

## 2. Colors

A warm-stone neutral field with one decisive blue and a small, semantic status set.

### Primary
- **Ink Blue** (#3B82F6, dark #60A5FA): the only interactive accent — primary buttons,
  selection, focus ring, active ribbon state, page numbers, links. Hover deepens to
  **Ink Blue Hover** (#2563EB).

### Neutral
- **Warm Stone** (#faf8f5): app background / chrome field.
- **Espresso Ink** (#1c1917): body and heading text.
- **Sand** (#f0ebe3): muted surfaces, table headers, hover fills, code.
- **Slate Stone** (#57534e): secondary/muted text — AA-verified on Warm Stone.
- **Desk Linen** (#e8e2d9): editor canvas, carrying a faint dot grid + grain.
- **Paper White** (#ffffff): the A4 page — always white, in every theme.
- **Surface** (#fffefb): raised chrome (toolbars, popovers).
- **Border Stone** (#e7e0d6) / **Border Stone Strong** (#d6cec3): hairlines and table grid.

### Tertiary (status — semantic only)
- **Approved Green** (#16a34a), **Alert Red** (#dc2626), **Caution Amber** (#d97706):
  success / danger / warning. Never decorative.
- **Merge-Field Amber** (#c2410c on #fff7ed): `{{variable}}` badges — the one playful tint,
  reserved entirely for placeholders.

### Named Rules
**The Ink-Only Rule.** Ink Blue appears only where the user can act or where the system shows
state (selection, focus, active). It is never used to decorate. Its rarity is what makes it read.

**The Paper-Stays-White Rule.** Dark mode dims the desk (canvas #0c0a09, chrome #141210) but
the A4 page stays #ffffff. What you see on the page is exactly what prints.

## 3. Typography

**Display Font:** Plus Jakarta Sans (with system-ui fallback) — headings, brand, dialog titles.
**Body Font:** IBM Plex Sans Thai (with system-ui fallback) — all body, UI labels, ribbons.
**Mono Font:** ui-monospace / SFMono / Menlo / Consolas — page numbers, code, source view.

**Character:** A geometric Latin display paired against a humanist Thai-Latin body — a real
contrast axis, not two near-identical sans. Thai script legibility at body and dense-UI sizes
is a first-class concern; IBM Plex Sans Thai carries both scripts cleanly.

### Hierarchy
- **Display** (700, 2rem/32px, lh 1.2, -0.015em): page H1 / hero.
- **Headline** (700, 1.5rem/24px, lh 1.25, -0.01em): section H2.
- **Title** (600, 1.2rem/19.2px, lh 1.3): H3, dialog titles.
- **Body** (400, 16px, lh 1.7): document text; cap prose at 65–75ch.
- **Label** (600, 13px, lh 1.4): ribbon/UI labels; mono 10.5px for page numbers.

### Named Rules
**The Thai-First Rule.** Every label leads in Thai with English in parentheses —
`"ตัวหนา (Bold)"`, `"ไฟล์ (File)"`. Consistency here is the product's voice.

## 4. Elevation

Hybrid, and deliberately lopsided. Chrome is **flat** — separation comes from tonal layering
(Surface on Warm Stone on Desk Linen) and hairline Border Stone, not shadow. The **A4 page is
the single exception**: it carries a soft 4-layer shadow so it reads as a physical sheet
floating on the desk, and lifts 1px on hover (suppressed under `prefers-reduced-motion`).

### Shadow Vocabulary
- **Page rest** (`0 0 0 1px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.06), 0 12px 28px rgba(0,0,0,.04)`): the A4 sheet.
- **Popover / Dialog** (`shadow-lg`): transient overlays only.
- **Button** (`shadow-sm shadow-black/10` → `shadow-md` on hover): primary / danger only.

### Named Rules
**The Paper Floats, Chrome Is Flat Rule.** Only the document page earns layered elevation.
Toolbars, ribbons, panels, and cards are flat; if a chrome element needs a shadow, it's a
transient overlay (dialog, dropdown), nothing else.

## 5. Components

### Buttons
- **Shape:** gently rounded (8px / `rounded-md`); icon buttons are 36×36 square.
- **Primary:** Ink Blue fill, Paper-White text, `shadow-sm`; hover → Ink Blue Hover + `shadow-md` + `active:scale-[.98]`. Sizes sm/md/lg = 32/36/44px tall.
- **Secondary / Outline:** Border-Stone hairline on Warm Stone / transparent; hover fills Sand.
- **Ghost:** no chrome at rest; hover fills Sand. The ribbon default.
- **Danger:** Alert Red fill, white text — destructive only.

### Ribbon buttons
- 28px tall, 8px radius, 14px icon, Slate-Stone label. Hover → Sand fill + Espresso text.
  Active → 10%-Ink-Blue/Sand blend with a 30%-Ink-Blue ring. This is the workhorse control.

### Dialogs (Radix)
- Overlay `bg-black/40 backdrop-blur-sm`; content centered, `rounded-lg`, Border-Stone hairline,
  Warm-Stone bg, `shadow-lg`. Header is a bordered title row; body `space-y-5`. Open 120ms /
  close 100ms fade+scale. The Modal pattern (sm/md/lg = 460/640/880px) follows this.

### Inputs / Fields
- Border-Stone hairline, Surface bg, `rounded-md`. Focus = 2px Ink-Blue ring + offset.
  Placeholder must hold ≥4.5:1 (Slate Stone), not a faint grey.

### Signature: the A4 page (`.page-node`)
- Always Paper-White, 2px radius, the 4-layer page shadow, dot-grid Desk-Linen canvas behind.
  Page number is a mono pill in Ink Blue at bottom-center via `::after`. Margin guides are a
  faint dashed blue-grey inset. This is the soul of the product — treat it as the hero in any screen.

### Variable badge (signature)
- `{{merge-field}}` renders as a Merge-Field-Amber pill (#c2410c on #fff7ed, #fdba74 border).
  The only warm accent in the system; reserved entirely for placeholders.

## 6. Do's and Don'ts

### Do:
- **Do** keep Ink Blue rare — action, selection, focus, active only (The Ink-Only Rule).
- **Do** lead every label in Thai with English in parentheses (The Thai-First Rule).
- **Do** keep the A4 page #ffffff in every theme; it must match the print output exactly.
- **Do** convey chrome depth with tonal layering (Surface/Sand/Warm Stone) + hairlines, not shadow.
- **Do** verify body and placeholder text hold ≥4.5:1; bump toward Espresso Ink if close.
- **Do** honor `prefers-reduced-motion` — the page-hover lift and all reveals already gate on it.

### Don't:
- **Don't** rebuild bloated legacy MS-Office chrome — cluttered ribbons, heavy gradients, dated bevels.
- **Don't** drift to dated Google-Docs grey — flat grey-on-grey with weak hierarchy.
- **Don't** use gradient text, glassmorphism-by-default, identical icon-card grids, or hero-metric templates.
- **Don't** use Ink Blue (or any color) decoratively, or add a second accent hue.
- **Don't** use a `border-left`/`border-right` >1px colored stripe as accent (the editor's repeat-row inset stripe is the one sanctioned, editor-internal exception).
- **Don't** put a tiny uppercase tracked eyebrow above sections, or default 01/02/03 markers.
- **Don't** let the warm neutrals slide into AI-cream; they are stone, kept by hue not by warmth-by-default.
