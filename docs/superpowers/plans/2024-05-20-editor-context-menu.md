# Editor Context Menu Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement context menu for tables and images in the WordHTML editor.

**Architecture:**
- Rename `ParagraphContextMenu.tsx` to `EditorContextMenu.tsx`.
- Add conditional rendering for Table and Image specific actions.
- Update `EditorShell.tsx` to use the renamed component.

**Tech Stack:** React, Tiptap, Tailwind CSS, Lucide React.

---

### Task 1: Rename and Basic Refactor

**Files:**
- Rename: `src/components/editor/ParagraphContextMenu.tsx` → `src/components/editor/EditorContextMenu.tsx`
- Modify: `src/components/editor/EditorShell.tsx`

- [ ] **Step 1: Rename the file**
  Run: `mv src/components/editor/ParagraphContextMenu.tsx src/components/editor/EditorContextMenu.tsx`

- [ ] **Step 2: Update Component name and exports**
  Update `EditorContextMenu.tsx` to use the new name.

- [ ] **Step 3: Update EditorShell.tsx import and usage**
  Update `EditorShell.tsx` to import and render `EditorContextMenu`.

- [ ] **Step 4: Verify basic menu still works**
  Run existing tests if any, or manually verify paragraph context menu still appears.

### Task 2: Implement Table Context Menu Actions

**Files:**
- Modify: `src/components/editor/EditorContextMenu.tsx`

- [ ] **Step 1: Add Table detection logic**
  Check if `editor.isActive('table')`.

- [ ] **Step 2: Define Table menu items**
  Add logic to include table items in the `menuItems` array if `isTable` is true.

- [ ] **Step 3: Implement Table actions**
  Use `editor.chain().focus()...run()` for table commands.

- [ ] **Step 4: Add Merge/Split logic with `can()` checks**
  Disable merge/split if not applicable.

### Task 3: Implement Image Context Menu Actions

**Files:**
- Modify: `src/components/editor/EditorContextMenu.tsx`

- [ ] **Step 1: Add Image detection logic**
  Check if `editor.isActive('image')`.

- [ ] **Step 2: Define Image menu items**
  Add logic to include image items (Alignment, Delete) in the `menuItems` array if `isImage` is true.

- [ ] **Step 3: Implement Image actions**
  Update image attributes for alignment.

### Task 4: UI Polish and Icons

**Files:**
- Modify: `src/components/editor/EditorContextMenu.tsx`

- [ ] **Step 1: Add icons to menu items**
  Use Lucide icons for better UX.

- [ ] **Step 2: Verify accessibility**
  Ensure correct aria labels and keyboard navigation.

- [ ] **Step 3: Final Verification**
  Manually test all menu items for tables and images.
