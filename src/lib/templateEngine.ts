import type { TemplateVariable, ProcessedTemplate } from "@/types/template";

/**
 * Extract all {{variableName}} patterns from HTML.
 * Returns unique variable names in order of first appearance.
 */
export function extractVariables(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  const regex = /\{\{([\w\u0E00-\u0E7F_]+)\}\}/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      results.push(name);
    }
  }
  return results;
}

/**
 * Replace {{variableName}} with actual values from a data row.
 * Missing variables are replaced with a red placeholder span.
 */
export function replaceVariables(
  html: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string>
): string {
  return html.replace(/\{\{([\w\u0E00-\u0E7F_]+)\}\}/g, (match, name) => {
    const value = dataRow[name] ?? variables.find((v) => v.name === name)?.value;
    if (value === undefined || value === null || value === "") {
      return `<span style="color:#dc2626;background:#fee2e2;padding:0 4px;border-radius:2px;font-size:12px;">[${name}]</span>`;
    }
    return escapeHtml(value);
  });
}

/**
 * Expand repeating rows in tables based on list variables.
 *
 * Uses regex-based replacement for reliability in both browser and Node.js.
 */
export function expandRepeatingRows(
  html: string,
  variables: TemplateVariable[]
): string {
  const listVars = variables.filter(
    (v) => v.isList && v.listValues && v.listValues.length > 0
  );

  // Match <tr> tags with data-repeat="true"
  const rowRegex = /<tr\b[^>]*\bdata-repeat=["']true["'][^>]*>(.*?)<\/tr>/gi;

  return html.replace(rowRegex, (fullRowMatch) => {
    // Find which list variables are used in this row
    const usedVars = listVars.filter((v) => fullRowMatch.includes(`{{${v.name}}}`));

    if (usedVars.length === 0) {
      // No list vars in this row — just remove the data-repeat attribute
      return fullRowMatch.replace(/\s*data-repeat=["']true["']/i, "");
    }

    const maxCount = Math.max(...usedVars.map((v) => v.listValues!.length));

    // Generate N rows
    const generatedRows: string[] = [];
    for (let i = 0; i < maxCount; i++) {
      const newRow = fullRowMatch
        .replace(/\s*data-repeat=["']true["']/i, "")
        .replace(/\{\{([\w\u0E00-\u0E7F_]+)\}\}/g, (match: string, name: string) => {
          const variable = usedVars.find((v) => v.name === name);
          if (!variable || !variable.listValues) return match;
          return escapeHtml(variable.listValues[i] ?? "");
        });
      generatedRows.push(newRow);
    }

    return generatedRows.join("");
  });
}

/**
 * Full template processing pipeline:
 * 1. Expand repeating rows
 * 2. Replace variables with data
 */
export function processTemplate(
  templateHtml: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string>
): ProcessedTemplate {
  const warnings: string[] = [];

  // Check for missing variables before replacement
  const allVars = extractVariables(templateHtml);
  const missing = allVars.filter((name) => {
    const hasDataValue = dataRow[name] !== undefined && dataRow[name] !== "";
    const varValue = variables.find((v) => v.name === name)?.value;
    const hasVarValue = varValue !== undefined && varValue !== "";
    return !hasDataValue && !hasVarValue;
  });
  if (missing.length > 0) {
    warnings.push(`ตัวแปรที่ยังไม่มีค่า: ${missing.join(", ")}`);
  }

  // Step 1: expand repeating rows
  let html = expandRepeatingRows(templateHtml, variables);

  // Step 2: replace simple variables
  html = replaceVariables(html, variables, dataRow);

  return { html, warnings };
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
