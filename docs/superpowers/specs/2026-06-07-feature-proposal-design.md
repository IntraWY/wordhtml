# wordhtml — Feature Proposal Design (Word-themed HTML deliverable)

> Brainstorming output. The deliverable is a read-only, self-contained HTML proposal styled like Microsoft Word (`wordhtml-feature-proposal.html` at repo root). This markdown is the committed design record.

**Goal:** Survey the whole codebase and propose features/functions/systems worth adding, as a polished Word-themed HTML document the user can open and print.

**Scope:** Comprehensive across three angles — (A) finish half-built work, (B) Microsoft Word parity, (C) Thai government-document systems. Read-only document (no JS, no server).

## Grounding (verified via 3 Explore agents)

- **Already built (NOT proposed):** TOC, word/char count, Find & Replace, header/footer config + content, multilevel lists, outline panel, 5 export formats, mail-merge, Thai helpers (baht/Thai digits/Buddhist dates), cloud templates, draft recovery, KaTeX, project save (`.json`), slash-commands, variable badges, intra-paragraph pagination (v0.1.28).
- **Half-built (propose "finish"):** header/footer rich-text editing (`pageHeader.ts`/`pageFooter.ts` exist, not wired into `pageNode` schema / no toolbar); different-first-page & odd/even *layout* (config in `HeaderFooterDialog.tsx` + `headerFooterResolve.ts`, layout not applied); table/image splitting across pages (currently atomic).
- **Genuinely missing:** comments, track changes, footnotes/endnotes, multi-column, named paragraph styles/style gallery, bookmarks/cross-refs, figure/table captions, watermark, text boxes, citations.

## Proposed roadmap

### A — Finish half-built
| ID | Feature | Priority | Effort | Entry |
|----|---------|----------|--------|-------|
| A1 | Header/Footer rich-text editing | P1 | ★★ | `pageNode.ts`, `RibbonTabLayout`, `HeaderFooterDialog` |
| A2 | Different first / odd-even **layout** | P2 | ★★ | `pageNode.ts`, pagination layout |
| A3 | Table/Image splitting across pages | P3 | ★★★ (risky) | `pagination/splitter.ts`, `engine.ts` |

### B — Word parity
| ID | Feature | Priority | Effort | Notes |
|----|---------|----------|--------|-------|
| B1 | Footnotes / Endnotes | P1 | ★★ | new Tiptap node + export |
| B2 | Figure/Table captions + auto-number + cross-ref | P1 | ★★ | extends `imageWithAlign.ts` |
| B3 | Named paragraph styles / Style gallery | P1 | ★★ | extends `paragraphFormat.ts` |
| B4 | Watermark ("ร่าง/สำเนา/ลับ") | P1 | ★ (smallest, high value) | page setup + print/PDF CSS |
| B5 | Comments / annotations | P2 | ★★★ | stored in `project.ts` JSON (no server) |
| B6 | Multi-column layout | P2 | ★★ | CSS columns per section |
| B7 | Bookmarks / cross-references | P2 | ★★ | extends `headingWithId.ts`, `toc.ts` |
| B8 | Track changes | P3 | ★★★ | ambitious/complex |
| B9 | Citations/bibliography · text boxes | P3 | ★★–★★★ | lowest priority |

### C — Thai government documents
| ID | Feature | Priority | Effort | Entry |
|----|---------|----------|--------|-------|
| C1 | Thai official-letter wizard (สารบรรณ) | P1 | ★★ (highest value) | `templateGallery.ts`, `/procurement`, mergeFields |
| C2 | Signature block + running document-number token | P1 | ★★ | `pageTokens.ts`, placeholderField |
| C3 | Distribution list / "สำเนาเรียน" batch | P2 | ★★ | `exportMailMerge.ts` |
| C4 | Thai page numbers "หน้า ๑/๕" + auto baht-text in tables | P2 | ★ | `thai/*`, `mergeFields.ts` |

## Recommended start

P1, low-risk first: **C1 (Thai letter wizard)** and **B4 (watermark)** give the fastest visible payoff for this user's work; then **A1**, then **B1/B2/B3**.

## Next step

This document is a menu. Once the user picks features (by ID), each gets its own spec → plan → implementation cycle. No app code touched yet.
