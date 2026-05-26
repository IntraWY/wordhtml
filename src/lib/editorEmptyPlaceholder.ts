/** Updated from VisualEditor when empty-state config changes (read by Tiptap Placeholder). */
export let editorEmptyPlaceholderText =
  "พิมพ์ วางจาก Word หรืออัปโหลดไฟล์ .docx เพื่อเริ่มต้น…";

export function setEditorEmptyPlaceholderText(text: string): void {
  editorEmptyPlaceholderText = text;
}
