"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useToastStore } from "@/store/toastStore";
import { processTemplate } from "@/lib/templateEngine";
import { MultiPagePreview } from "./MultiPagePreview";

interface TemplatePreviewProps {
  widthPx: number;
}

export function TemplatePreview({ widthPx }: TemplatePreviewProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const templateMode = useEditorStore((s) => s.templateMode);
  const previewMode = useEditorStore((s) => s.previewMode);
  const variables = useEditorStore((s) => s.variables);
  const dataSet = useEditorStore((s) => s.dataSet);

  const processedHtml = useMemo(() => {
    if (previewMode !== "preview" || !templateMode) return "";
    try {
      const dataRow = dataSet?.rows[dataSet.currentRowIndex] ?? {};
      const variableFallback = Object.fromEntries(
        variables.map((v) => [v.name, v.isList ? (v.listValues ?? []).join(", ") : v.value])
      );
      const mergedRow = { ...variableFallback, ...dataRow };
      return processTemplate(documentHtml, variables, mergedRow).html;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Template processing failed";
      useToastStore.getState().show(`ตัวอย่าง Template ล้มเหลว: ${message}`, "error");
      return documentHtml;
    }
  }, [previewMode, templateMode, documentHtml, variables, dataSet]);

  if (previewMode !== "preview" || !templateMode) return null;
  return (
    <div className="mx-auto" style={{ width: widthPx }}>
      <MultiPagePreview html={processedHtml} pageSetup={pageSetup} />
    </div>
  );
}
