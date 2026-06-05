# Full Code Audit — Design Spec

**Date:** 2026-06-04  
**Project:** wordhtml (Next.js 16 Word↔HTML editor)  
**Requested by:** User  
**Output:** `docs/audit-report.html` (Thai language, styled)

---

## Context

The wordhtml project has grown to ~365 tests across 51 files, 55+ editor components, 100+ lib files, 9 parallel Tiptap agents, and a complex pagination engine. The user wants a comprehensive audit confirming all functions work correctly, covering automated tooling (tests, TypeScript, lint) and manual agent-based deep review of each subsystem. The findings should be delivered as a standalone styled HTML report in Thai.

---

## Architecture

### Phase 1 — Automated Checks (sequential)

Run three commands and capture structured output:

1. `npm test -- --reporter=json` → parse pass/fail/skipped counts, failing test names
2. `npx tsc --noEmit 2>&1` → collect type error lines (file:line:col message)
3. `npm run lint -- --format json 2>&1` → collect ESLint violations with severity

### Phase 2 — Parallel Deep Audit (9 agents simultaneously)

Each agent reads source files and reports structured findings with severity, file path, and suggested fix. Agents are:

| Agent | Subsystem | Key files |
|---|---|---|
| A1 | Export pipeline | `src/lib/export/*.ts` |
| A2 | Pagination engine + splitter | `src/lib/pagination/*.ts` |
| A3 | Hooks | `src/hooks/*.ts` |
| A4 | Tiptap — page structure | `pageNode, pageBody, pageCommands, pageBreak, pageHeader, pageFooter` |
| A5 | Tiptap — content marks/nodes | `variableMark, paragraphFormat, fontSize, mathEquation, imageWithAlign, slashCommands` |
| A6 | Conversion + cleaning | `src/lib/conversion/*.ts`, `src/lib/cleaning/*.ts` |
| A7 | Store | `src/store/*.ts` |
| A8 | Key components | `EditorShell.tsx`, `VisualEditor.tsx`, `Ribbon*.tsx` |
| A9 | Placeholders + lib utilities | `src/lib/placeholders/`, `src/lib/page.ts`, `src/lib/text.ts`, `src/lib/templateEngine.ts` |

### Phase 3 — HTML Report Synthesis

Combine Phase 1 results + Phase 2 agent findings into a single `docs/audit-report.html` file:

- Full Thai language
- Styled with embedded CSS (no external dependencies — opens in any browser without network)
- Severity system: 🔴 วิกฤต / 🟡 ควรแก้ไข / 🟢 ผ่าน / ℹ️ ข้อมูล
- Per-subsystem sections with collapsible details
- Summary dashboard at top (stats: tests, types, lint, manual findings)
- Each finding includes: file path, description, code snippet, suggested fix

---

## HTML Report Structure

```
<head> embedded fonts + CSS (zinc-based, dark header, card layout)

<body>
  <header>
    วันที่ตรวจสอบ | ชื่อ project | version
    
  <section id="dashboard">
    📊 สรุปภาพรวม
    ┌─────────┬──────────┬──────────┬──────────┐
    │ Tests   │ TypeScript│ Lint     │ Manual   │
    │ N/N pass│ N errors │ N warns  │ N issues │
    └─────────┴──────────┴──────────┴──────────┘
    
  <section id="critical"> 🔴 ปัญหาวิกฤต
  <section id="warnings"> 🟡 ควรแก้ไข
  <section id="passing">  🟢 ผ่านการตรวจสอบ
  <section id="info">     ℹ️ ข้อสังเกต
  
  Per finding card:
    [Severity badge] [File:line] หัวข้อปัญหา
    รายละเอียด
    <code> snippet </code>
    แนะนำ: วิธีแก้ไข
    
  <section id="raw-output">
    ผลลัพธ์ดิบ (tests/tsc/lint)
```

Output: `docs/audit-report.html` (self-contained, no external deps)

---

## Known Issues from Pre-Audit Exploration

These were found during brainstorming exploration and will be verified/expanded in Phase 2:

1. `src/lib/tiptap/indentExtension.ts` — dead code (not registered in VisualEditor.tsx)
2. `src/components/editor/VisualEditor.tsx` — Delete handler `nextPageBody` check could miss empty update inside `nodesBetween`
3. `src/lib/pagination/splitter.ts` — no post-renumber validation that page numbers remain sequential

---

## Verification

After the plan executes:
1. Open `docs/audit-report.html` in a browser — should render styled Thai report
2. Check that all 4 audit categories (tests/tsc/lint/manual) appear in the dashboard
3. Confirm known issues from exploration appear as findings in the correct severity sections
4. Run `npm test` and `npm run build` to confirm the audit process itself didn't modify source

---

## Files Modified

| File | Action |
|---|---|
| `docs/audit-report.html` | Created (new HTML report) |
| `docs/superpowers/specs/2026-06-04-full-code-audit-design.md` | Created (this file) |

No source files are modified by this audit. It is read-only.
