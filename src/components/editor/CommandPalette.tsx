"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import type { Editor } from "@tiptap/react";

import { buildCommandRegistry } from "@/lib/commands/registry";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  editor: Editor | null;
}

export function CommandPalette({ editor }: CommandPaletteProps) {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const close = useUiStore((s) => s.closeCommandPalette);
  const [query, setQuery] = useState("");

  const commands = useMemo(() => buildCommandRegistry(), []);
  const fuse = useMemo(
    () =>
      new Fuse(commands, {
        keys: ["label", "labelEn", "keywords", "shortcut"],
        threshold: 0.4,
      }),
    [commands]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return fuse.search(query).map((r) => r.item);
  }, [query, commands, fuse]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k" && !e.shiftKey) {
        const target = e.target as HTMLElement | null;
        if (
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        useUiStore.getState().openCommandPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runCommand = useCallback(
    (id: string) => {
      const cmd = commands.find((c) => c.id === id);
      cmd?.run(editor);
      setQuery("");
      close();
    },
    [commands, editor, close]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onClick={() => {
        setQuery("");
        close();
      }}
    >
      <Command
        className="w-[min(520px,92vw)] overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        label="คำสั่ง (Command palette)"
        shouldFilter={false}
      >
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="ค้นหาคำสั่ง… (Search commands)"
          className="w-full border-b border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm outline-none"
          autoFocus
        />
        <Command.List className="max-h-[min(360px,50vh)] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-[color:var(--color-muted-foreground)]">
            ไม่พบคำสั่ง
          </Command.Empty>
          {filtered.map((cmd) => (
            <Command.Item
              key={cmd.id}
              value={cmd.id}
              onSelect={() => runCommand(cmd.id)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
                "aria-selected:bg-[color:var(--color-muted)] aria-selected:text-[color:var(--color-foreground)]"
              )}
            >
              <span>
                {cmd.label}{" "}
                <span className="text-[color:var(--color-muted-foreground)]">
                  ({cmd.labelEn})
                </span>
              </span>
              {cmd.shortcut && (
                <kbd className="shrink-0 rounded border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--color-muted-foreground)]">
                  {cmd.shortcut}
                </kbd>
              )}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
