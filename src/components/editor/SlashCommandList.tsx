"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";
import type { SlashItem } from "@/lib/tiptap/slashCommandsConfig";

interface SlashCommandListProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export const SlashCommandList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  SlashCommandListProps
>(function SlashCommandList({ items, command }, ref) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelected((s) => (s + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selected];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-2 shadow-lg text-xs text-[color:var(--color-muted-foreground)]">
        ไม่พบคำสั่ง
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-1 shadow-lg">
      {items.map((item, i) => (
        <button
          key={item.titleEn}
          type="button"
          className={cn(
            "flex w-full rounded-md px-2 py-1.5 text-left text-xs",
            i === selected
              ? "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]"
              : "text-[color:var(--color-foreground)]"
          )}
          onMouseEnter={() => setSelected(i)}
          onClick={() => command(item)}
        >
          {item.title}{" "}
          <span className="text-[color:var(--color-muted-foreground)]">
            ({item.titleEn})
          </span>
        </button>
      ))}
    </div>
  );
});
