"use client";

import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { Ruler } from "./Ruler";
import { isLiveEditor } from "@/lib/editorLive";
import { useUiStore } from "@/store/uiStore";
import { remapTabStopTypes, type TabType } from "@/lib/tiptap/tabStopLayout";

function toNum(v: unknown): number {
  return typeof v === "number" && !isNaN(v) ? v : 0;
}

interface BlockIndent {
  marginLeft: number;
  textIndent: number;
  marginRight: number;
}

function indentFromBlock(node: ProseMirrorNode): BlockIndent | null {
  if (node.type.name === "paragraph" || node.type.name === "heading") {
    return {
      marginLeft: toNum(node.attrs.marginLeft),
      textIndent: toNum(node.attrs.textIndent),
      marginRight: toNum(node.attrs.marginRight),
    };
  }
  return null;
}

function indentFromListItem(listItem: ProseMirrorNode): BlockIndent | null {
  for (let i = 0; i < listItem.childCount; i++) {
    const ind = indentFromBlock(listItem.child(i));
    if (ind) return ind;
  }
  return null;
}

function indentFromSiblingBlocks(
  parent: ProseMirrorNode,
  index: number
): BlockIndent | null {
  for (let i = index - 1; i >= 0; i--) {
    const child = parent.child(i);
    const ind =
      indentFromBlock(child) ??
      (child.type.name === "listItem" ? indentFromListItem(child) : null);
    if (ind) return ind;
  }
  for (let i = index + 1; i < parent.childCount; i++) {
    const child = parent.child(i);
    const ind =
      indentFromBlock(child) ??
      (child.type.name === "listItem" ? indentFromListItem(child) : null);
    if (ind) return ind;
  }
  return null;
}

function tabStopsFromBlock(node: ProseMirrorNode): number[] | null {
  if (node.type.name === "paragraph" || node.type.name === "heading") {
    const stops = node.attrs.tabStops;
    return Array.isArray(stops) ? (stops as number[]) : [];
  }
  return null;
}

function tabStopsFromListItem(listItem: ProseMirrorNode): number[] | null {
  for (let i = 0; i < listItem.childCount; i++) {
    const stops = tabStopsFromBlock(listItem.child(i));
    if (stops) return stops;
  }
  return null;
}

function tabStopTypesFromBlock(node: ProseMirrorNode): TabType[] | null {
  if (node.type.name === "paragraph" || node.type.name === "heading") {
    const types = node.attrs.tabStopTypes;
    return Array.isArray(types) ? (types as TabType[]) : [];
  }
  return null;
}

function tabStopTypesFromListItem(listItem: ProseMirrorNode): TabType[] | null {
  for (let i = 0; i < listItem.childCount; i++) {
    const types = tabStopTypesFromBlock(listItem.child(i));
    if (types) return types;
  }
  return null;
}

/** Read the current block's custom tab stops (cm). Mirrors readBlockIndent. */
function readBlockTabStops(editor: Editor): number[] {
  const { selection } = editor.state;
  const { $from } = selection;
  if (!$from) return [];
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "listItem") {
      return tabStopsFromListItem(node) ?? [];
    }
    const stops = tabStopsFromBlock(node);
    if (stops) return stops;
  }
  return [];
}

/** Read the current block's tab-stop alignment types (index-aligned). */
function readBlockTabStopTypes(editor: Editor): TabType[] {
  const { selection } = editor.state;
  const { $from } = selection;
  if (!$from) return [];
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "listItem") {
      return tabStopTypesFromListItem(node) ?? [];
    }
    const types = tabStopTypesFromBlock(node);
    if (types) return types;
  }
  return [];
}

function readBlockIndent(editor: Editor): BlockIndent | null {
  const { selection, doc } = editor.state;

  if (selection instanceof NodeSelection) {
    const node = selection.node;
    if (node.type.name === "image") {
      const $pos = doc.resolve(selection.from);
      const parent = $pos.parent;
      const index = $pos.index();
      return (
        indentFromSiblingBlocks(parent, index) ?? {
          marginLeft: 0,
          textIndent: 0,
          marginRight: 0,
        }
      );
    }
  }

  const { $from } = selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "listItem") {
      return (
        indentFromListItem(node) ?? { marginLeft: 0, textIndent: 0, marginRight: 0 }
      );
    }
    const ind = indentFromBlock(node);
    if (ind) return ind;
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

  const currentIndent = blockIndent ?? {
    marginLeft: 0,
    textIndent: 0,
    marginRight: 0,
  };
  const indentInteractive = blockIndent !== null;
  const currentTabStops =
    isLiveEditor(editor) && indentInteractive ? readBlockTabStops(editor) : [];
  const currentTabStopTypes =
    isLiveEditor(editor) && indentInteractive
      ? readBlockTabStopTypes(editor)
      : [];

  const handleIndentChange = useCallback(
    (marginLeft: number, textIndent: number) => {
      if (!isLiveEditor(editor)) return;
      editor.commands.setIndent(marginLeft, textIndent);
    },
    [editor]
  );

  const handleIndentRightChange = useCallback(
    (marginRight: number) => {
      if (!isLiveEditor(editor)) return;
      editor.commands.setParagraphFormat({ marginRight });
    },
    [editor]
  );

  const handleOpenParagraphDialog = useCallback(() => {
    useUiStore.getState().openParagraph();
  }, []);

  const handleOpenPageSetup = useCallback(() => {
    window.dispatchEvent(new CustomEvent("wordhtml:open-page-setup"));
  }, []);

  const handleTabStopsChange = useCallback(
    (stops: number[]) => {
      if (!isLiveEditor(editor)) return;
      // Re-derive types for the new positions (drag keeps a stop's type by
      // value identity; a newly added stop gets the corner selector's type).
      const oldStops = readBlockTabStops(editor);
      const oldTypes = readBlockTabStopTypes(editor);
      const defaultType = useUiStore.getState().currentTabType;
      const types = remapTabStopTypes(oldStops, oldTypes, stops, defaultType);
      editor.commands.setTabStops(stops, types);
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
      indentRight={currentIndent.marginRight}
      onIndentChange={indentInteractive ? handleIndentChange : undefined}
      onIndentRightChange={indentInteractive ? handleIndentRightChange : undefined}
      tabStops={currentTabStops}
      tabStopTypes={currentTabStopTypes}
      onTabStopsChange={indentInteractive ? handleTabStopsChange : undefined}
      onOpenPageSetup={handleOpenPageSetup}
      onOpenParagraphDialog={indentInteractive ? handleOpenParagraphDialog : undefined}
      marginLeftMm={marginLeftMm}
      marginRightMm={marginRightMm}
      onMarginChange={onMarginChange}
      onRulerActive={onRulerActive}
    />
  );
}
