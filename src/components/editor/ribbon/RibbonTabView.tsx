"use client";

import type { Editor } from "@tiptap/react";
import {
  Maximize,
  Minimize,
  Code,
  SpellCheck,
  Keyboard,
  BookOpen,
} from "lucide-react";

import { RibbonGroup } from "./RibbonGroup";
import { RibbonButton } from "./RibbonButton";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import {
  dispatchOpenSearch,
  dispatchOpenToc,
  dispatchOpenShortcuts,
} from "@/lib/events";

export function RibbonTabView({ editor }: { editor: Editor | null }) {
  const sourceOpen = useUiStore((s) => s.sourceOpen);
  const toggleSource = useUiStore((s) => s.toggleSource);
  const isFullscreen = useUiStore((s) => s.fullscreen);
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen);
  const spellcheckEnabled = useEditorStore((s) => s.spellcheckEnabled);
  const toggleSpellcheck = useEditorStore((s) => s.toggleSpellcheck);

  return (
    <>
      <RibbonGroup label="มุมมอง">
        <RibbonButton
          label="ซอร์ส HTML"
          onClick={toggleSource}
          active={sourceOpen}
        >
          <Code className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label={isFullscreen ? "ออกจากเต็มหน้าจอ" : "เต็มหน้าจอ"}
          onClick={toggleFullscreen}
          active={isFullscreen}
        >
          {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="เครื่องมือ">
        <RibbonButton label="ค้นหา/แทนที่" onClick={dispatchOpenSearch}>
          <span className="text-xs font-semibold">Ctrl+F</span>
        </RibbonButton>
        <RibbonButton label="สารบัญ" onClick={dispatchOpenToc} disabled={!editor}>
          <BookOpen className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="คีย์ลัด" onClick={dispatchOpenShortcuts}>
          <Keyboard className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="ตัวเลือก">
        <RibbonButton
          label="ตรวจสอบการสะกด"
          onClick={toggleSpellcheck}
          active={spellcheckEnabled}
        >
          <SpellCheck className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
