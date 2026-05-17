"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VariableSuggestionListProps {
  items: string[];
  command: (props: { name: string }) => void;
}

export const VariableSuggestionList = forwardRef((props: VariableSuggestionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ name: item });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-2 shadow-md">
        <p className="text-[10px] text-[color:var(--color-muted-foreground)]">ไม่พบตัวแปร</p>
      </div>
    );
  }

  return (
    <div className="z-50 min-w-[12rem] overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-1 shadow-md animate-in fade-in-0 zoom-in-95">
      {props.items.map((item, index) => (
        <button
          key={item}
          onClick={() => selectItem(index)}
          className={cn(
            "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none transition-colors",
            index === selectedIndex
              ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
              : "text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]"
          )}
        >
          <Database className="mr-2 h-3 w-3 opacity-70" />
          <span className="truncate">{item}</span>
        </button>
      ))}
    </div>
  );
});

VariableSuggestionList.displayName = "VariableSuggestionList";
