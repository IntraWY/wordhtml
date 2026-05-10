"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { RibbonTabHome } from "./RibbonTabHome";
import { RibbonTabInsert } from "./RibbonTabInsert";
import { RibbonTabLayout } from "./RibbonTabLayout";
import { RibbonTabClean } from "./RibbonTabClean";
import { RibbonTabView } from "./RibbonTabView";

const TABS = [
  { key: "home" as const, label: "หน้าแรก (Home)" },
  { key: "insert" as const, label: "แทรก (Insert)" },
  { key: "layout" as const, label: "เค้าโครง (Layout)" },
  { key: "clean" as const, label: "ล้าง (Clean)" },
  { key: "view" as const, label: "มุมมอง (View)" },
];

export function Ribbon({ editor }: { editor: Editor | null }) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("home");

  return (
    <div className="flex flex-col border-b border-[color:var(--color-border)] bg-gradient-to-b from-slate-50 to-white shadow-sm shadow-slate-200/50">
      {/* Tab strip */}
      <div className="flex items-end gap-1 px-3 pt-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "relative rounded-t-md px-4 py-1.5 text-[11px] font-semibold transition-all",
              activeTab === tab.key
                ? "bg-white text-[color:var(--color-accent)] shadow-[0_-1px_2px_rgba(0,0,0,0.05)]"
                : "text-[color:var(--color-muted-foreground)] hover:bg-white/60 hover:text-[color:var(--color-foreground)]"
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex min-h-[72px] items-stretch overflow-x-auto">
        {activeTab === "home" && <RibbonTabHome editor={editor} />}
        {activeTab === "insert" && <RibbonTabInsert editor={editor} />}
        {activeTab === "layout" && <RibbonTabLayout editor={editor} />}
        {activeTab === "clean" && <RibbonTabClean />}
        {activeTab === "view" && <RibbonTabView editor={editor} />}
      </div>
    </div>
  );
}
