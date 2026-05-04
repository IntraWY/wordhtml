# wordhtml Code Audit Plan

## Objective
ตรวจสอบโค้ด repo wordhtml แบบละเอียดจากหลายมุมมองเพื่อหาปัญหาที่ทำให้การใช้งานไม่สมบูรณ์และไม่ smooth

## Stage 1 — Setup
- Clone repo IntraWY/wordhtml
- ติดตั้ง dependencies
- รัน tests เพื่อดูสถานะปัจจุบัน

## Stage 2 — Parallel Code Audits (5 มุมมอง)
ส่ง subagents พร้อมกัน ให้แต่ละคน focus ต่างกัน:

### Auditor A: UX & Interaction Flow Audit
- Focus: User journey, menu interactions, dialog patterns, keyboard navigation consistency, visual feedback
- ไฟล์หลัก: EditorShell, MenuBar, dialogs, toolbar components

### Auditor B: Performance & Rendering Audit
- Focus: Re-renders, Zustand selectors, ResizeObserver leaks, large document handling, image processing, memory leaks
- ไฟล์หลัก: store/editorStore.ts, EditorShell, Ruler, VisualEditor, image handling

### Auditor C: Code Quality & Bug Hunt
- Focus: Type safety, error handling, edge cases, race conditions, null checks, async/await patterns, test coverage gaps
- ไฟล์หลัก: lib/, conversion/, cleaning/, export/, tiptap extensions

### Auditor D: Architecture & State Management Audit
- Focus: Zustand store patterns, custom events vs props, Tiptap extension architecture, component boundaries, data flow
- ไฟล์หลัก: store/, components/, lib/tiptap/, event handling patterns

### Auditor E: Accessibility (a11y) & Polish Audit
- Focus: ARIA labels, focus traps, color contrast, reduced-motion, screen reader support, mobile experience, i18n consistency
- ไฟล์หลัก: ทุก component ที่มี UI interaction

## Stage 3 — Synthesis
- รวม findings จากทั้ง 5 auditors
- จัดลำดับความสำคัญ (Critical / High / Medium / Low)
- สร้างรายงานสรุปพร้อมแนวทางแก้ไข
