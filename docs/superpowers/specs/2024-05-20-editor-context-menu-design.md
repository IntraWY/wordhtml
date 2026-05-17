# 2024-05-20 Table & Image Context Menus Design

**Goal:** Implement specific context menu actions for tables and images in the WordHTML editor.

**Architecture:**
- Rename `ParagraphContextMenu.tsx` to `EditorContextMenu.tsx`.
- Detect active node types using Tiptap's `editor.isActive()` and `editor.getAttributes()`.
- Dynamically generate menu items based on the selection.

**Menu Sections:**

1. **Table Section (if inside table):**
   - Insert Row Above
   - Insert Row Below
   - Insert Column Before
   - Insert Column After
   - (Divider)
   - Merge Cells
   - Split Cell
   - (Divider)
   - Delete Row
   - Delete Column
   - Delete Table

2. **Image Section (if image selected):**
   - Align Left
   - Align Center
   - Align Right
   - (Divider)
   - Delete Image

3. **Paragraph Section (always shown or contextually):**
   - Keep existing paragraph formatting items.

**Implementation Details:**
- Use `editor.chain().focus()...run()` for all actions.
- Use `editor.can()...` to disable items like Merge/Split when not applicable.
- Handle event target detection to ensure the menu doesn't show up in invalid places.

**Accessibility:**
- Maintain `role="menu"`, `role="menuitem"`, and `role="separator"`.
- Ensure buttons have clear labels.
