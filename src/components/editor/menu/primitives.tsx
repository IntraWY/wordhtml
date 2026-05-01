"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronRight, Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MenuDropdownProps {
  label: string;
  children: ReactNode;
}

export function MenuDropdown({ label, children }: MenuDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "cursor-pointer rounded px-2 py-1 text-xs font-medium text-[color:var(--color-foreground)]",
          "hover:bg-[color:var(--color-border)] data-[state=open]:bg-[color:var(--color-border)]",
          "transition-colors duration-150 outline-none select-none",
          "focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1"
        )}
      >
        {label}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={2}
          className={cn(
            "z-50 min-w-52 rounded-lg border border-[color:var(--color-border)]",
            "bg-[color:var(--color-background)] py-1 shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

interface MenuItemProps {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  checked?: boolean;
  onClick?: () => void;
}

export function MenuItem({
  label,
  shortcut,
  disabled,
  danger,
  checked,
  onClick,
}: MenuItemProps) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs outline-none select-none",
        "transition-colors duration-150 text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
        danger && "text-[color:var(--color-danger)] hover:bg-red-50",
        disabled && "cursor-default opacity-40"
      )}
    >
      <span className="flex items-center gap-2">
        {checked !== undefined && (
          <Check
            className={cn("size-3", checked ? "opacity-100" : "opacity-0")}
          />
        )}
        {label}
      </span>
      {shortcut && (
        <span className="ml-8 text-[10px] text-[color:var(--color-muted-foreground)]">
          {shortcut}
        </span>
      )}
    </DropdownMenu.Item>
  );
}

interface MenuSubProps {
  label: string;
  children: ReactNode;
}

export function MenuSub({ label, children }: MenuSubProps) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger
        className={cn(
          "flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs outline-none select-none",
          "transition-colors duration-150 text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
          "data-[state=open]:bg-[color:var(--color-muted)]"
        )}
      >
        {label}
        <ChevronRight className="size-3 text-[color:var(--color-muted-foreground)]" />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent
          sideOffset={2}
          className={cn(
            "z-50 min-w-40 rounded-lg border border-[color:var(--color-border)]",
            "bg-[color:var(--color-background)] py-1 shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          {children}
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
}

export function Sep() {
  return (
    <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--color-border)]" />
  );
}
