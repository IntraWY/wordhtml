"use client";

import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { X, MessageSquarePlus, Check, Trash2, MessageSquare } from "lucide-react";

import { useUiStore } from "@/store/uiStore";
import { useDialogStore } from "@/store/dialogStore";
import { isLiveEditor } from "@/lib/editorLive";
import { collectComments, type CommentEntry } from "@/lib/tiptap/commentMark";
import { makeCommentId } from "@/lib/comments";

/**
 * Comments side panel (B5). Lists comments anchored in the document (scanned
 * from comment marks), and supports add (on a text selection), resolve, delete.
 */
export function CommentsPanel({ editor }: { editor: Editor | null }) {
  const open = useUiStore((s) => s.commentsOpen);
  const close = useUiStore((s) => s.closeComments);

  const comments = useEditorState({
    editor,
    selector: ({ editor: e }): CommentEntry[] =>
      e ? collectComments(e.state.doc) : [],
  }) ?? [];

  if (!open) return null;

  const addComment = () => {
    if (!isLiveEditor(editor)) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      useDialogStore
        .getState()
        .openAlert("คอมเมนต์ (Comment)", "กรุณาเลือกข้อความที่ต้องการคอมเมนต์ก่อน");
      return;
    }
    useDialogStore.getState().openPrompt(
      "เพิ่มคอมเมนต์ (Add comment)",
      "ข้อความคอมเมนต์:",
      "",
      (text) => {
        const ed = editor;
        if (!isLiveEditor(ed) || !text || !text.trim()) return;
        const existing = collectComments(ed.state.doc).map((c) => ({
          id: c.commentId,
          text: c.text,
          quote: c.quote,
          resolved: c.resolved,
          createdAt: 0,
        }));
        const id = makeCommentId(existing);
        ed.chain().focus().setComment({ commentId: id, text: text.trim() }).run();
      }
    );
  };

  return (
    <aside
      className="fixed right-4 top-24 z-40 flex max-h-[70vh] w-[320px] flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-xl"
      role="complementary"
      aria-label="คอมเมนต์ (Comments)"
    >
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="size-4" />
          คอมเมนต์ ({comments.length})
        </div>
        <button
          type="button"
          aria-label="ปิด"
          onClick={close}
          className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="border-b border-[color:var(--color-border)] p-2">
        <button
          type="button"
          onClick={addComment}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[color:var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-accent-foreground)] hover:opacity-90"
        >
          <MessageSquarePlus className="size-3.5" />
          เพิ่มคอมเมนต์ (เลือกข้อความก่อน)
        </button>
      </div>

      <div className="overflow-y-auto p-2">
        {comments.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-[color:var(--color-muted-foreground)]">
            ยังไม่มีคอมเมนต์ — เลือกข้อความแล้วกด “เพิ่มคอมเมนต์”
          </p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li
                key={c.commentId}
                className={
                  "rounded-lg border p-2.5 text-xs " +
                  (c.resolved
                    ? "border-[color:var(--color-border)] opacity-60"
                    : "border-[color:var(--color-border)]")
                }
              >
                <p className="mb-1 line-clamp-2 italic text-[color:var(--color-muted-foreground)]">
                  “{c.quote}”
                </p>
                <p className={c.resolved ? "line-through" : ""}>{c.text}</p>
                <div className="mt-2 flex justify-end gap-1">
                  <button
                    type="button"
                    title={c.resolved ? "เปิดใหม่" : "ทำเครื่องหมายแก้แล้ว"}
                    onClick={() =>
                      editor
                        ?.chain()
                        .focus()
                        .setCommentResolved(c.commentId, !c.resolved)
                        .run()
                    }
                    className="grid h-6 w-6 place-items-center rounded text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    title="ลบคอมเมนต์"
                    onClick={() =>
                      editor?.chain().focus().removeCommentById(c.commentId).run()
                    }
                    className="grid h-6 w-6 place-items-center rounded text-[color:var(--color-danger)] hover:bg-[color:var(--color-muted)]"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
