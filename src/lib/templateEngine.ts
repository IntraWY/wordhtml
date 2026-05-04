import type { TemplateVariable, ProcessedTemplate } from "@/types/template";

const VAR_REGEX = /\{\{([A-Za-z_\u0E00-\u0E7F][\w\u0E00-\u0E7F_]*)\}\}/;

/**
 * Extract all {{variableName}} patterns from HTML.
 * Returns unique variable names in order of first appearance.
 */
export function extractVariables(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  const regex = new RegExp(VAR_REGEX.source, "g");
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
  const regex = new RegExp(VAR_REGEX.source, "g");
  return html.replace(regex, (match, name) => {
    const value = dataRow[name] ?? variables.find((v) => v.name === name)?.value;
    if (value === undefined || value === null) {
      return `<span style="color:#dc2626;background:#fee2e2;padding:0 4px;border-radius:2px;font-size:12px;">[${name}]</span>`;
    }
    return escapeHtml(value);
  });
}

/**
 * Expand repeating rows in tables based on list variables.
 *
 * Uses DOM parsing when available (browser/jsdom) for robust handling of
 * nested tables and attribute formatting. Falls back to regex in pure Node.
 */
export function expandRepeatingRows(
  html: string,
  variables: TemplateVariable[]
): string {
  const listVars = variables.filter(
    (v) => v.isList && v.listValues && v.listValues.length > 0
  );

  if (listVars.length === 0) {
    // No list variables — just strip data-repeat attributes
    return html.replace(/\s*data-repeat=["']?true["']?/gi, "");
  }

  // Use DOM parsing when available for robustness
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const rows = doc.querySelectorAll('tr[data-repeat="true"]');

    rows.forEach((row) => {
      const rowHtml = row.outerHTML;
      const usedVars = listVars.filter((v) => rowHtml.includes(`{{${v.name}}}`));

      if (usedVars.length === 0) {
        row.removeAttribute("data-repeat");
        return;
      }

      const maxCount = Math.max(...usedVars.map((v) => v.listValues!.length));
      const parent = row.parentNode;
      if (!parent) return;

      for (let i = 0; i < maxCount; i++) {
        const clone = row.cloneNode(true) as Element;
        clone.removeAttribute("data-repeat");
        // Replace variables in the clone's HTML
        clone.innerHTML = clone.innerHTML.replace(
          new RegExp(VAR_REGEX.source, "g"),
          (_match: string, name: string) => {
            const variable = usedVars.find((v) => v.name === name);
            if (!variable || !variable.listValues) return `{{${name}}}`;
            return escapeHtml(variable.listValues[i] ?? "");
          }
        );
        parent.insertBefore(clone, row);
      }

      parent.removeChild(row);
    });

    // Return body innerHTML (DOMParser wraps in <html><body>)
    return doc.body.innerHTML;
  }

  // Fallback: regex-based for pure Node environments
  const rowRegex = /<tr\b[^>]*\bdata-repeat=["']true["'][^>]*>[\s\S]*?<\/tr>/gi;
  return html.replace(rowRegex, (fullRowMatch) => {
    const usedVars = listVars.filter((v) => fullRowMatch.includes(`{{${v.name}}}`));

    if (usedVars.length === 0) {
      return fullRowMatch.replace(/\s*data-repeat=["']true["']/i, "");
    }

    const maxCount = Math.max(...usedVars.map((v) => v.listValues!.length));
    const generatedRows: string[] = [];

    for (let i = 0; i < maxCount; i++) {
      const newRow = fullRowMatch
        .replace(/\s*data-repeat=["']true["']/i, "")
        .replace(new RegExp(VAR_REGEX.source, "g"), (match: string, name: string) => {
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
    const dataValue = dataRow[name];
    const hasDataValue = dataValue !== undefined && dataValue !== "";
    const v = variables.find((varDef) => varDef.name === name);
    const varValue = v?.value;
    const hasVarValue = v?.isList
      ? (v.listValues && v.listValues.length > 0)
      : (varValue !== undefined && varValue !== "");
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
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
