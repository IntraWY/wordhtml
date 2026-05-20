/**
 * Condition evaluation engine for conditional blocks in templates.
 *
 * Supports:
 *   {{var}} == 'value'
 *   {{var}} != 'value'
 *   {{var}} > 1000
 *   {{var}} < 1000
 *   {{var}} contains 'substring'
 */

function parseLiteral(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function getContextValue(name: string, context: Record<string, string>): string {
  return context[name] ?? "";
}

/**
 * Evaluate a single condition string against a variable context.
 * Returns true if the condition passes, false otherwise.
 * Invalid conditions default to true (visible) to avoid data loss.
 */
export function evaluateCondition(
  condition: string,
  context: Record<string, string>
): boolean {
  const str = condition.trim();
  if (!str) return true;

  // Match: {{varName}} <operator> <rightOperand>
  const match = str.match(/^\{\{([^}]+)\}\}\s*(==|!=|<|>|contains)\s*(.*)$/);
  if (!match) return true;

  const [, varName, operator, rightRaw] = match;
  const leftValue = getContextValue(varName, context);
  const rightValue = parseLiteral(rightRaw);

  switch (operator) {
    case "==":
      return leftValue === rightValue;
    case "!=":
      return leftValue !== rightValue;
    case ">": {
      const leftNum = parseFloat(leftValue.replace(/,/g, ""));
      const rightNum = parseFloat(rightValue.replace(/,/g, ""));
      if (Number.isNaN(leftNum) || Number.isNaN(rightNum)) return false;
      return leftNum > rightNum;
    }
    case "<": {
      const leftNum = parseFloat(leftValue.replace(/,/g, ""));
      const rightNum = parseFloat(rightValue.replace(/,/g, ""));
      if (Number.isNaN(leftNum) || Number.isNaN(rightNum)) return false;
      return leftNum < rightNum;
    }
    case "contains":
      return leftValue.includes(rightValue);
    default:
      return true;
  }
}

/**
 * Evaluate all conditional blocks in an HTML string.
 * Blocks with a false condition are removed.
 * Blocks with a true condition keep their content but have the condition attribute stripped.
 */
export function evaluateConditions(
  html: string,
  context: Record<string, string>
): string {
  if (typeof DOMParser === "undefined") {
    // Fallback: regex-based stripping for pure Node environments
    return html.replace(/\s*data-condition="[^"]*"/gi, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements = doc.querySelectorAll("[data-condition]");

  elements.forEach((el) => {
    const condition = el.getAttribute("data-condition");
    if (condition && !evaluateCondition(condition, context)) {
      el.remove();
    } else {
      el.removeAttribute("data-condition");
    }
  });

  return doc.body.innerHTML;
}
