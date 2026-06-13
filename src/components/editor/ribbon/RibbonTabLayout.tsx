"use client";

import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  FileText,
  RotateCcw,
  Maximize,
  Minimize,
  MoveHorizontal,
  Ruler,
  PanelTop,
  PanelBottom,
} from "lucide-react";

import { RibbonGroup } from "./RibbonGroup";
import { RibbonButton } from "./RibbonButton";
import { RibbonSelect } from "./RibbonSelect";
import { useEditorStore } from "@/store/editorStore";
import { dispatchOpenPageSetup, dispatchOpenHeaderFooter } from "@/lib/events";
import { isLiveEditor } from "@/lib/editorLive";
import { pageHasHeader, pageHasFooter } from "@/lib/tiptap/pageHeaderFooter";
import type { PageSetup } from "@/types";

export function RibbonTabLayout({ editor }: { editor: Editor | null }) {
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const setPageSetup = useEditorStore((s) => s.setPageSetup);

  // Reactive header/footer presence for the current page. Direct
  // editor.isActive()/pageHasHeader() calls in JSX are NOT reactive (per
  // CLAUDE.md "Editor reactivity for ribbon buttons") — consolidate into one
  // useEditorState selector that re-runs on every editor transaction.
  const hf = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      hasHeader: e ? pageHasHeader(e.state) : false,
      hasFooter: e ? pageHasFooter(e.state) : false,
    }),
  }) ?? { hasHeader: false, hasFooter: false };

  const toggleHeader = useCallback(() => {
    if (!isLiveEditor(editor)) return;
    if (pageHasHeader(editor.state)) {
      editor.chain().focus().removePageHeader().run();
    } else {
      editor.chain().focus().insertPageHeader().run();
    }
  }, [editor]);

  const toggleFooter = useCallback(() => {
    if (!isLiveEditor(editor)) return;
    if (pageHasFooter(editor.state)) {
      editor.chain().focus().removePageFooter().run();
    } else {
      editor.chain().focus().insertPageFooter().run();
    }
  }, [editor]);

  const handleColumnsChange = useCallback(
    (value: string) => {
      if (!isLiveEditor(editor)) return;
      const n = parseInt(value, 10);
      if (n >= 2) editor.chain().focus().setColumnLayout(n).run();
      else editor.chain().focus().unsetColumnLayout().run();
    },
    [editor]
  );

  const handleSizeChange = useCallback((size: string) => {
    setPageSetup({ size: size as PageSetup["size"] });
  }, [setPageSetup]);

  const handleOrientationChange = useCallback((orientation: string) => {
    setPageSetup({ orientation: orientation as PageSetup["orientation"] });
  }, [setPageSetup]);

  return (
    <>
      <RibbonGroup label="ขนาดกระดาษ" data-tour="layout">
        <RibbonSelect
          label="ขนาด (Size)"
          value={pageSetup.size}
          onChange={handleSizeChange}
          options={[
            { label: "A4", value: "A4" },
            { label: "Letter", value: "Letter" },
          ]}
        />
        <RibbonSelect
          label="แนว (Orientation)"
          value={pageSetup.orientation}
          onChange={handleOrientationChange}
          options={[
            { label: "แนวตั้ง (Portrait)", value: "portrait" },
            { label: "แนวนอน (Landscape)", value: "landscape" },
          ]}
        />
      </RibbonGroup>

      <RibbonGroup label="คอลัมน์ (Columns)">
        <RibbonSelect
          label="คอลัมน์ (Columns)"
          value=""
          onChange={handleColumnsChange}
          options={[
            { label: "คอลัมน์…", value: "" },
            { label: "1 คอลัมน์ (ยกเลิก)", value: "1" },
            { label: "2 คอลัมน์", value: "2" },
            { label: "3 คอลัมน์", value: "3" },
          ]}
          disabled={!isLiveEditor(editor)}
        />
      </RibbonGroup>

      <RibbonGroup label="ระยะขอบ">
        <RibbonButton label="ตั้งค่าหน้ากระดาษ…" onClick={dispatchOpenPageSetup}>
          <Ruler className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="หัวกระดาษ/ท้ายกระดาษ…" onClick={dispatchOpenHeaderFooter}>
          <FileText className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="หัว/ท้ายกระดาษ">
        <RibbonButton
          label={
            hf.hasHeader
              ? "ลบหัวกระดาษ (Remove header)"
              : "เพิ่มหัวกระดาษ (Add header)"
          }
          onClick={toggleHeader}
          active={hf.hasHeader}
          disabled={!isLiveEditor(editor)}
        >
          <PanelTop className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label={
            hf.hasFooter
              ? "ลบท้ายกระดาษ (Remove footer)"
              : "เพิ่มท้ายกระดาษ (Add footer)"
          }
          onClick={toggleFooter}
          active={hf.hasFooter}
          disabled={!isLiveEditor(editor)}
        >
          <PanelBottom className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="เยื้องด่วน">
        <RibbonButton
          label="ไม่มีระยะขอบ"
          onClick={() =>
            setPageSetup({
              marginMm: { top: 0, right: 0, bottom: 0, left: 0 },
            })
          }
        >
          <Minimize className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label="ระยะขอบปกติ"
          onClick={() =>
            setPageSetup({
              marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
            })
          }
        >
          <Maximize className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label="ระยะขอบกว้าง"
          onClick={() =>
            setPageSetup({
              marginMm: { top: 30, right: 30, bottom: 30, left: 30 },
            })
          }
        >
          <MoveHorizontal className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label="คืนค่าเริ่มต้น"
          onClick={() =>
            setPageSetup({
              size: "A4",
              orientation: "portrait",
              marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
            })
          }
        >
          <RotateCcw className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
