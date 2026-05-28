"use client";

import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Ruler } from "./Ruler";
import { isLiveEditor } from "@/lib/editorLive";

function toNum(v: unknown): number {
  return typeof v === "number" && !isNaN(v) ? v : 0;
}

function readBlockIndent(editor: Editor): {
  marginLeft: number;
  textIndent: number;
} | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "paragraph" || node.type.name === "heading") {
      return {
        marginLeft: toNum(node.attrs.marginLeft),
        textIndent: toNum(node.attrs.textIndent),
      };
    }
  }
  return null;
}

interface IndentRulerProps {
  editor: Editor | null;
  cm: number;
  marginStart: number;
  marginEnd: number;
  marginLeftMm: number;
  marginRightMm: number;
  onMarginChange: (leftMm: number, rightMm: number) => void;
  onRulerActive?: (info: { label: string } | null) => void;
}

export function IndentRuler({
  editor,
  cm,
  marginStart,
  marginEnd,
  marginLeftMm,
  marginRightMm,
  onMarginChange,
  onRulerActive,
}: IndentRulerProps) {
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    if (!isLiveEditor(editor)) return;

    const bump = () => setSyncTick((t) => t + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  const blockIndent = isLiveEditor(editor) ? readBlockIndent(editor) : null;
  void syncTick;

  const currentIndent = blockIndent ?? { marginLeft: 0, textIndent: 0 };
  const indentInteractive = blockIndent !== null;

  const handleIndentChange = useCallback(
    (marginLeft: number, textIndent: number) => {
      if (!isLiveEditor(editor)) return;
      editor.commands.setIndent(marginLeft, textIndent);
    },
    [editor]
  );

  return (
    <Ruler
      orientation="horizontal"
      cm={cm}
      marginStart={marginStart}
      marginEnd={marginEnd}
      indentLeft={currentIndent.marginLeft}
      indentFirst={currentIndent.textIndent}
      onIndentChange={indentInteractive ? handleIndentChange : undefined}
      marginLeftMm={marginLeftMm}
      marginRightMm={marginRightMm}
      onMarginChange={onMarginChange}
      onRulerActive={onRulerActive}
    />
  );
}
