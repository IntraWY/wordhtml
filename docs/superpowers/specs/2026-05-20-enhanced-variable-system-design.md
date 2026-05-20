# Enhanced Variable/Placeholder System Design

**Date:** 2026-05-20
**Project:** wordhtml
**Approach:** A — Progressive Enhancement

## Goal

ปรับปรุงระบบตัวแปร (`{{name}}`) ให้รองรับลักษณะงานเอกสารราชการ จัดซื้อจัดจ้าง และใบตัดงบค่าแรง โดยคง syntax เดิมไว้ ไม่ breaking existing documents และสามารถทยอย implement ได้ทีละ phase.

## Context

- **Existing:** VariableMark (Tiptap mark), VariablePanel, TemplatePreview, templateEngine.ts
- **Document types:** ใบตัดงบค่าแรง, รายงานจัดซื้อจัดจ้าง, หนังสือราชการ
- **Constraints:** Static site (Next.js export), client-side only, privacy-first
- **User needs:** Batch import, auto-format (money, dates), computed fields, conditional blocks

## Phase 1: Variable Types & Formatting

### Changes

1. **TemplateVariable interface** adds `type` and `format`:
   ```ts
   type VariableType = "text" | "number" | "currency" | "date" | "percent";
   interface TemplateVariable {
     name: string;
     value: string;
     type: VariableType;
     format?: string;
     isList: boolean;
     delimiter?: string;
     listValues?: string[];
   }
   ```

2. **VariablePanel** adds per-variable controls:
   - Type dropdown (default: `text`)
   - Format dropdown (options depend on type):
     - `date`: `short` | `long` | `iso`
     - `currency`: `THB` | `USD`
     - `number`: `integer` | `decimal(2)`
     - `percent`: `0-100` | `0.0-1.0`

3. **templateEngine.ts** — `replaceVariables` formats output based on `type` + `format`:
   - `currency` + `THB`: `"1234.5"` → `"1,234.50 บาท"`
   - `date` + `long`: `"2026-05-20"` → `"20 พฤษภาคม 2568"`
   - `percent` + `0-100`: `"0.15"` → `"15%"`

4. **Migration:** persisted variables default to `type: "text"`, `format: undefined`.

## Phase 2: Batch Import (Excel / CSV / Sheets)

### Changes

1. **New module:** `src/lib/importData.ts`
   - Parse `.xlsx` via `xlsx` library (dynamic import, ~200KB)
   - Parse `.csv` via native split + header detection
   - Output: `DataSet` (headers + rows)

2. **VariablePanel** adds dropzone:
   - Drag-drop `.xlsx` / `.csv`
   - Paste from Sheets (existing flow, enhanced)
   - Preview first 5 rows before confirm

3. **Auto-mapping:**
   - Case-insensitive header → variable name matching
   - Fuzzy match for Thai/English pairs (e.g., `จำนวน` → `qty`)
   - Unmatched columns auto-create new variables with type inference:
     - numeric string → `number`
     - date-like string → `date`
     - otherwise → `text`

4. **Type inference from cell format:** read Excel cell format hints when available.

## Phase 3: Computed Fields

### Changes

1. **TemplateVariable** adds computed fields:
   ```ts
   isComputed: boolean;
   expression?: string; // e.g. "{{amount}} * {{qty}} * 1.07"
   ```

2. **New module:** `src/lib/expressionEngine.ts`
   - Operators: `+`, `-`, `*`, `/`, `(`, `)`
   - Functions: `sum()`, `count()`, `avg()`, `min()`, `max()`
   - Variable references via `{{name}}`
   - Left-to-right evaluation with standard precedence
   - Cycle detection (A references B references A → error)

3. **VariablePanel:**
   - Computed variables have a "computed" badge (blue)
   - Read-only value input with live preview
   - Expression editor (simple text input with validation)

4. **Evaluation order:**
   ```
   1. expandRepeatingRows
   2. evaluateComputeds     (Phase 3)
   3. evaluateConditions    (Phase 4)
   4. replaceVariables      (Phase 1 enhanced)
   ```
   
   **Rationale:** Computed variables must be resolved before conditions can evaluate them (e.g. `{{total}} > 1000`).

### Example

```
{{amount}} = 1000
{{qty}} = 3
{{subtotal}} = {{amount}} * {{qty}}      → 3000
{{vat}} = {{subtotal}} * 0.07             → 210
{{total}} = {{subtotal}} + {{vat}}        → 3210
```

## Phase 4: Conditional Blocks

### Changes

1. **New Tiptap extension:** `ConditionalBlockExtension`
   - Node attribute: `condition: string` (e.g. `docType == 'จ้าง'`)
   - Applies to `paragraph`, `heading`, `table` nodes
   - Visual indicator in editor (yellow border + condition badge)

2. **UI:**
   - FormatMenu or context menu: "ตั้งเงื่อนไข (Set Condition)"
   - Dialog: select variable, operator (`==`, `!=`, `<`, `>`, `contains`), value
   - Badge shows condition summary on the block

3. **templateEngine.ts** adds `evaluateConditions` step:
   - Parse condition string
   - Evaluate against current variable values
   - If false: remove node from output (keep in editor)
   - If true: keep node, strip condition attribute from export

4. **Condition syntax (internal):**
   - Simple: `varName == 'value'`
   - Numeric: `amount > 1000`
   - List: `items contains 'name'`
   - UI generates this string; advanced users can edit raw

## Architecture

```
Editor (Tiptap)
├── VariableMark (existing)          → {{name}} inline
├── ConditionalBlockExtension (new)  → hide/show blocks
└── PageNode / PageBody (existing)   → pagination

VariablePanel (enhanced)
├── Variable list + type/format editor  (Phase 1)
├── Dropzone / paste import             (Phase 2)
└── Computed variable editor            (Phase 3)

templateEngine.ts (enhanced pipeline)
1. expandRepeatingRows    (existing)
2. evaluateComputeds      (Phase 3)
3. evaluateConditions     (Phase 4)
4. replaceVariables       (Phase 1 enhanced)
```

## Data Flow

1. User defines variables + types in VariablePanel
2. User inserts `{{name}}` into document (or drags from panel)
3. User imports data (Phase 2) or sets values manually
4. User sets computed expressions (Phase 3)
5. User sets conditions on blocks (Phase 4)
6. Preview: templateEngine runs full pipeline → formatted HTML
7. Export: same pipeline, then strip pagination wrappers

## Error Handling

| Error | Behavior |
|-------|----------|
| Computed cycle (A→B→A) | Show error badge in VariablePanel; fallback to raw expression |
| Invalid expression | Show warning toast; fallback to raw string |
| Missing variable in condition | Treat as false (hide block) |
| XLSX parse error | Show detailed message; fallback to CSV paste |
| Type mismatch (text → number calc) | NaN/undefined handled gracefully; show warning |
| Division by zero | Return "0" or "#DIV/0!" style indicator |

## Testing Strategy

| Layer | Coverage |
|-------|----------|
| Unit | expressionEngine (operators, functions, cycle detection), importData (xlsx/csv parsers), type formatters (currency, date, percent) |
| Integration | templateEngine full pipeline with all 4 phases |
| E2E | Drag-drop xlsx, set computed field, toggle condition, preview accuracy, export correctness |

## Migration Plan

1. **localStorage variables:** on load, migrate missing `type` to `"text"`
2. **editor documents:** existing `{{name}}` syntax unchanged; auto-detect continues to work
3. **DataSet:** no schema change; Phase 2 only enhances import path
4. **Backward compat:** Phase 1-4 are additive; old docs work without modification

## Future Enhancements

1. **Cross-row aggregation:** `sum({{items.price}})` across repeating rows — out of scope for Phase 3; requires repeating-row context in expression engine.
2. **Else branches:** Phase 4 supports `if` only; `else` can be added later via paired block nodes.
3. **Boolean variable type:** Not needed for Phase 1; text values `"true"` / `"false"` work with conditions.

## Notes

- **Fuzzy match Thai/English headers** (Phase 2) is a best-effort enhancement; exact match is the baseline.
- **Excel cell format hints** (Phase 2) depend on `xlsx` library capabilities; fallback to content-based inference always applies.

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-20 | Use Approach A (Progressive Enhancement) | Preserves existing syntax, no breaking changes, matches static-site constraints |
| 2026-05-20 | Keep `{{name}}` syntax; no filters/pipes | Reduces cognitive load for government document users |
| 2026-05-20 | No Thai numeral conversion | User confirmed Arabic numerals are sufficient |
