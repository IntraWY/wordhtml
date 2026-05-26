"use client";

import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Ruler } from "./Ruler";
import { isLiveEditor } from "@/lib/editorLive";

function toNum(v: unknown): number {
  return typeof v === "number" && !isNaN(v) ? v : 0;
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
  const [currentIndent, setCurrentIndent] = useState({ marginLeft: 0, textIndent: 0 });

  useEffect(() => {
    if (!isLiveEditor(editor)) return;
    const update = () => {
      if (!isLiveEditor(editor)) return;
      const { state } = editor;
      const nodeType = state.selection.$from.parent.type.name;
      const attrs =
        nodeType === "heading"
          ? editor.getAttributes("heading")
          : editor.getAttributes("paragraph");
      setCurrentIndent({
        marginLeft: toNum(attrs.marginLeft),
        textIndent: toNum(attrs.textIndent),
      });
    };
    editor.on("selectionUpdate", update);
    return () => {
      if (isLiveEditor(editor)) {
        editor.off("selectionUpdate", update);
      }
    };
  }, [editor]);

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
      onIndentChange={handleIndentChange}
      marginLeftMm={marginLeftMm}
      marginRightMm={marginRightMm}
      onMarginChange={onMarginChange}
      onRulerActive={onRulerActive}
    />
  );
}
