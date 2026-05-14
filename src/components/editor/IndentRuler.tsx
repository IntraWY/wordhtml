"use client";

import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Ruler } from "./Ruler";

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
    if (!editor) return;
    const update = () => {
      const { state } = editor;
      const nodeType = state.selection.$from.parent.type.name;
      const attrs =
        nodeType === "heading"
          ? editor.getAttributes("heading")
          : editor.getAttributes("paragraph");
      setCurrentIndent({
        marginLeft: (attrs.marginLeft as number) ?? 0,
        textIndent: (attrs.textIndent as number) ?? 0,
      });
    };
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  const handleIndentChange = useCallback(
    (marginLeft: number, textIndent: number) => {
      editor?.commands.setIndent(marginLeft, textIndent);
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
