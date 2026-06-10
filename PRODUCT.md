# Product

## Register

product

## Users

Thai office and government workers (เจ้าหน้าที่สารบรรณ, procurement/จัดซื้อจัดจ้าง staff, administrative clerks) who live in Microsoft Word and need to move documents to/from clean HTML, build official Thai letters (หนังสือราชการ), and run mail-merge over Thai data. They arrive task-focused, often mid-deadline, frequently fluent in Word but not in HTML. Primary context: desktop, Thai-language-first, producing print-accurate A4 documents that must look correct on paper.

## Product Purpose

A fully client-side (no server, privacy-by-design) Word ↔ HTML converter with a WYSIWYG A4-paper editor. It exists so users can clean Word's messy markup, edit in a faithful page-accurate view, and export to HTML/DOCX/PDF/Markdown without uploading sensitive documents anywhere. Success = a user trusts the page preview enough to ship the exported document unedited, and never thinks about the tool itself.

## Brand Personality

Trustworthy, precise, Thai-native. Voice is calm and exact, never playful or salesy. Thai labels lead, English follows in parentheses (`"ตัวหนา (Bold)"`). The interface should feel like a competent, quiet instrument: a Word user should sit down and immediately know where things are, while the chrome stays lighter and more modern than Office. Emotional goal: confidence and control, especially around accuracy (what you see on the page is what exports).

## Anti-references

- **Bloated legacy MS Office chrome**: cluttered ribbons crammed with rarely-used controls, heavy gradients, dated bevels. Keep the ribbon focused and quiet.
- **Dated Google-Docs grey**: flat, washed-out grey-on-grey toolbars with weak hierarchy.
- Generic AI/SaaS slop: gradient text, glassmorphism-by-default, identical icon-card grids, hero-metric templates.

## Design Principles

1. **The page is the source of truth.** Editor and export share typography so the on-screen A4 is a literal preview. Never let chrome contradict what prints.
2. **Thai-first, Word-fluent.** Thai labels lead; affordances match what a Word user already expects. Don't reinvent standard editing controls.
3. **Privacy is a feature, not a footnote.** Everything runs client-side; the document never persists. Design should make that trustworthiness legible.
4. **Quiet chrome, precise tools.** The accent (blue) marks action and selection only. Density where the task needs it, restraint everywhere else.
5. **Earned familiarity over surprise.** Consistent component vocabulary screen to screen. The tool disappears into the task.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Body and muted text must hold ≥4.5:1 on the warm stone backgrounds (the `muted-foreground` token is documented as AA-passing, audit verifies this in practice). Honor `prefers-reduced-motion` (already wired globally). Dark mode is supported and must hold the same contrast bar. Thai script legibility (IBM Plex Sans Thai / Sarabun) at body and dense-UI sizes is a first-class concern.
