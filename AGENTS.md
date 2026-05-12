# AGENTS.md — wordhtml

> Agent orchestration rules and project-specific context for Claude Code sub-agents.

## Project Context

- **Name:** wordhtml
- **Type:** Static Next.js 16 web app (client-side only)
- **Stack:** TypeScript, Tailwind CSS v4, Tiptap v3, Zustand, Vitest
- **Repo:** `IntraWY/wordhtml` (private)
- **Deploy:** `wordhtml.vercel.app` (auto-deploy on `master` push)

## Agent Selection Rules

When spawning sub-agents for this project, use these mappings:

| Context | Agent(s) |
|---------|----------|
| `.ts`, `.tsx` files | `typescript-reviewer` |
| Editor/Tiptap logic | `typescript-reviewer` + `code-reviewer` |
| Paste/cleanup/conversion | `typescript-reviewer` + `debugger` |
| Security-sensitive (auth, input) | `security-reviewer` |
| New feature | `tdd-guide` (enforce tests-first) |
| Build failure | `build-error-resolver` |
| CSS/design changes | `typescript-reviewer` (Tailwind/TSX) |

## Critical Project Rules

1. **No server code** — everything is client-side (`'use client'`). Never add API routes or Server Actions.
2. **Immutable patterns** — never mutate existing objects; always return new copies.
3. **Test coverage ≥ 80%** — unit tests for pure libs; E2E manual verification via `npm run dev`.
4. **TDD for new features** — write tests first (RED → GREEN → IMPROVE).
5. **No hardcoded secrets** — this is a client-side app; no API keys or tokens should exist in source.
6. **Thai i18n** — Thai labels primary, English in parentheses.

## Known Issues (Active)

### Bug: Paste + Enter Behavior
- **File:** `src/components/editor/VisualEditor.tsx` (`transformPastedHTML`)
- **File:** `src/lib/conversion/pasteCleanup.ts` (`cleanPastedHtml`)
- **Symptom:** After pasting external text, pressing Enter causes entire content to "move together" instead of inserting a clean line break.
- **Suspects:** Malformed paste HTML creating single wrapper nodes; cursor inside non-splittable container.

## File Patterns

| Pattern | Meaning |
|---------|---------|
| `src/components/editor/*.tsx` | Editor UI components |
| `src/components/editor/menu/*.tsx` | Menu bar items |
| `src/lib/tiptap/*.ts` | Tiptap custom extensions |
| `src/lib/conversion/*.ts` | docx/HTML/paste conversion |
| `src/lib/cleaning/*.ts` | HTML cleaning pipeline |
| `src/lib/export/*.ts` | Export formats |
| `src/store/editorStore.ts` | Zustand global state |
| `*.test.ts` | Vitest unit tests |

## Parallel Execution

For independent tasks, always spawn agents in parallel:
- Security review + TypeScript review
- Multiple file analyses
- Test writing + implementation

## Conflict Resolution

If multiple agents produce conflicting recommendations, escalate to `architect` agent for final decision.
