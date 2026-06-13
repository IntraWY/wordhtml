"use client";

import { cn } from "@/lib/utils";
import type { ExportHealthIssue } from "@/lib/export/exportHealthCheck";

interface ExportHealthListProps {
  issues: ExportHealthIssue[];
}

/**
 * Export health-check issue list. Behaviour-identical extraction from
 * `ExportDialog` — pure presentation, parent computes the issues.
 */
export function ExportHealthList({ issues }: ExportHealthListProps) {
  if (issues.length === 0) return null;
  return (
    <ul className="space-y-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-xs">
      {issues.map((issue) => (
        <li
          key={issue.code}
          className={cn(
            issue.severity === "error" && "text-[color:var(--color-danger)]",
            issue.severity === "warning" && "text-[color:var(--color-warning-foreground)]",
            issue.severity === "info" && "text-[color:var(--color-muted-foreground)]"
          )}
        >
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
