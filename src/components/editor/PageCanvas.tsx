"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface PageCanvasProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const PageCanvas = forwardRef<HTMLDivElement, PageCanvasProps>(
  function PageCanvas({ children, className, id }, ref) {
    return (
      <div
        ref={ref}
        id={id}
        className={cn(
          "page-canvas flex flex-col items-center gap-5 py-6",
          className
        )}
      >
        {children}
      </div>
    );
  }
);
