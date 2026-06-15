import type { TemplateVariable } from "@/types";
import { applyMergeFilter } from "./mergeFields";
import { escapeHtml } from "./escapeHtml";
import { MERGE_FIELD_FILTERS } from "./constants";

/**
 * Conditional + loop control blocks for the merge-field pipeline (GAP 08).
 *
 * These are pure, export-time-only transforms. They run BEFORE plain
 * `{{var}}` substitution so that variables hidden inside a false branch are
 * physically removed from the HTML and never counted as "unset" by the
 * export health check.
 *
 * Supported syntax
 * ----------------
 *   {{#if name}}…{{/if}}
 *   {{#if name}}…{{else}}…{{/if}}
 *   {{#unless name}}…{{/unless}}            (with optional {{else}})
 *   {{#each listName}}… {{this}} …{{/each}}
 *
 * Truthiness rule (kept deliberately simple, documented):
 *   A variable is TRUE when its resolved value (dataRow first, then the
 *   variable default) is a non-empty, non-whitespace string. Empty, missing,
 *   or whitespace-only ⇒ FALSE. The literal strings "0" and "false" are
 *   treated as TRUE (they are non-empty) — callers wanting boolean semantics
 *   should store an empty string for false.
 *
 * Loop-item rule:
 *   `{{#each list}}` iterates a list variable's `listValues` (or, as a
 *   fallback, the variable's scalar `value` split on its `delimiter`).
 *   `{{this}}` resolves to the current item. If an item is a JSON object
 *   string, `{{this.field}}` resolves to that field. `{{this|filter}}` and
 *   `{{this.field|filter}}` apply merge filters. An empty/missing list
 *   renders nothing.
 *
 * Safety: malformed / unbalanced tags are left untouched (no throw, no
 * infinite loop) — see the matched-pair scan in `resolveControlBlocks`.
 */

const FILTER_ALT = MERGE_FIELD_FILTERS.join("|");

// Opening tags: {{#if x}}, {{#unless x}}, {{#each x}}
const OPEN_TAG_REGEX =
  /\{\{#(if|unless|each)\s+([A-Za-z_฀-๿][\w฀-๿_]*)\}\}/;
// Closing tags: {{/if}}, {{/unless}}, {{/each}}
const CLOSE_TAG_REGEX = /\{\{\/(if|unless|each)\}\}/;
const ELSE_TAG = "{{else}}";

type BlockKind = "if" | "unless" | "each";

interface MatchedBlock {
  kind: BlockKind;
  varName: string;
  /** Index in `src` where the opening tag starts. */
  start: number;
  /** Index in `src` just after the closing tag. */
  end: number;
  /** Inner body between the open and close tags. */
  body: string;
}

/**
 * Find the FIRST top-level balanced control block in `src`. Uses a depth
 * counter so nested same-or-other control tags pair correctly. Returns null
 * when there is no opening tag, or when the first opening tag is unbalanced
 * (no matching close) — in which case the caller leaves the text as-is.
 */
function findFirstBlock(src: string): MatchedBlock | null {
  const openAll = new RegExp(OPEN_TAG_REGEX.source, "g");
  const firstOpen = openAll.exec(src);
  if (!firstOpen) return null;

  const kind = firstOpen[1] as BlockKind;
  const varName = firstOpen[2];
  const start = firstOpen.index;
  const bodyStart = start + firstOpen[0].length;

  // Walk forward from bodyStart, tracking nesting depth across ALL control
  // tags, to find the matching close for this opener.
  const tokenRegex = new RegExp(
    `(${OPEN_TAG_REGEX.source})|(${CLOSE_TAG_REGEX.source})`,
    "g"
  );
  tokenRegex.lastIndex = bodyStart;
  let depth = 1;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = tokenRegex.exec(src)) !== null) {
    if (++guard > 100_000) return null; // defensive: never loop forever
    const isOpen = m[0].startsWith("{{#");
    if (isOpen) {
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0) {
        // m[0] is the full close tag, e.g. "{{/each}}" — derive its kind.
        const closeKind = m[0].replace(/\{\{\/|\}\}/g, "");
        // Mismatched kind (e.g. {{#if}} closed by {{/each}}) → treat as
        // unbalanced; leave as-is.
        if (closeKind !== kind) return null;
        return {
          kind,
          varName,
          start,
          end: m.index + m[0].length,
          body: src.slice(bodyStart, m.index),
        };
      }
    }
  }
  return null; // unbalanced: opener with no matching close
}

/** Split a body on the TOP-LEVEL {{else}} (ignoring else inside nested blocks). */
function splitElse(body: string): { truthy: string; falsy: string | null } {
  const openClose = new RegExp(
    `(${OPEN_TAG_REGEX.source})|(${CLOSE_TAG_REGEX.source})|(\\{\\{else\\}\\})`,
    "g"
  );
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = openClose.exec(body)) !== null) {
    if (m[0] === ELSE_TAG) {
      if (depth === 0) {
        return {
          truthy: body.slice(0, m.index),
          falsy: body.slice(m.index + ELSE_TAG.length),
        };
      }
    } else if (m[0].startsWith("{{#")) {
      depth += 1;
    } else {
      depth -= 1;
    }
  }
  return { truthy: body, falsy: null };
}

/**
 * Own-property lookup that returns a string only — never an inherited
 * prototype member (e.g. `__proto__`, `constructor`, `toString`). This guards
 * the whole export from throwing when a variable name collides with an
 * Object.prototype key.
 */
function ownString(
  obj: Record<string, string>,
  name: string
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(obj, name)) return undefined;
  const value = obj[name];
  return typeof value === "string" ? value : undefined;
}

function resolveScalar(
  name: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string>
): string {
  const fromRow = ownString(dataRow, name);
  if (fromRow !== undefined) return fromRow;
  return variables.find((v) => v.name === name)?.value ?? "";
}

/** Truthiness: non-empty, non-whitespace resolved string. */
function isTruthy(
  name: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string>
): boolean {
  return resolveScalar(name, variables, dataRow).trim() !== "";
}

/** Resolve the items a {{#each name}} iterates over. */
function resolveListItems(
  name: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string>
): string[] {
  const variable = variables.find((v) => v.name === name);
  if (variable?.isList && variable.listValues) {
    return variable.listValues;
  }
  // Fallback: split a scalar value (dataRow first, then default) on delimiter.
  const raw = ownString(dataRow, name) ?? variable?.value ?? "";
  if (raw.trim() === "") return [];
  const delimiter = variable?.delimiter || ",";
  const splitChar = delimiter === "\\n" ? "\n" : delimiter;
  return raw
    .split(splitChar)
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

/** Parse a list item that may be a JSON object string. Returns null on failure. */
function parseItemObject(item: string): Record<string, string> | null {
  const trimmed = item.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    /* not JSON — treat as scalar */
  }
  return null;
}

/**
 * Maximum control-block nesting depth resolved per call. Beyond this the
 * remaining (still well-formed) inner text is emitted verbatim instead of
 * recursing — this keeps the documented "never throws" guarantee for
 * pathologically deep input that would otherwise overflow the call stack.
 */
const MAX_NEST_DEPTH = 64;

const THIS_TOKEN_REGEX = new RegExp(
  `\\{\\{this(?:\\.([A-Za-z_\\u0E00-\\u0E7F][\\w\\u0E00-\\u0E7F_]*))?(?:\\|(${FILTER_ALT}))?\\}\\}`,
  "g"
);

/**
 * Substitute {{this}}, {{this.field}}, {{this|filter}} for one loop item.
 *
 * SECURITY: loop-item values come from untrusted data. They are HTML-escaped
 * exactly like plain `{{var}}` fields in `replaceMergeFields`, AFTER any filter
 * is applied. Escaping the substituted value (a) prevents `<img onerror=...>`
 * style markup injection, and (b) neutralizes `{{#if x}}` / `{{var}}` syntax
 * smuggled inside data — escaped braces survive the recursive re-parse in
 * `resolveControlBlocks` as inert text and can never be re-interpreted as a
 * directive (second-order injection) nor expanded by a later merge pass.
 */
function renderEachItem(body: string, item: string): string {
  const obj = parseItemObject(item);
  return body.replace(THIS_TOKEN_REGEX, (_m, field: string | undefined, filter: string | undefined) => {
    let value: string;
    if (field) {
      value =
        obj && Object.prototype.hasOwnProperty.call(obj, field)
          ? String(obj[field] ?? "")
          : "";
    } else {
      value = obj ? "" : item;
    }
    const filtered = filter ? applyMergeFilter(value, filter) : value;
    return escapeHtml(filtered);
  });
}

/**
 * Resolve all conditional + loop control blocks in `html`. Plain `{{var}}`
 * fields are left untouched for the downstream `replaceMergeFields` pass.
 *
 * Malformed / unbalanced tags are left exactly as-is (never throws).
 */
export function resolveControlBlocks(
  html: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string> = {},
  depth = 0
): string {
  if (!html) return html;
  // Depth cap: leave deeply-nested remaining text as-is rather than overflow
  // the stack (mirrors the iteration-guard bailout below).
  if (depth >= MAX_NEST_DEPTH) return html;

  let out = "";
  let rest = html;
  let guard = 0;

  // Strip a stray top-level {{else}} from a VERBATIM segment (text outside any
  // block). A legitimate {{else}} inside a block was already consumed by
  // splitElse; one left over here is meaningless. We only ever apply this to
  // literal source text — never to rendered loop output — so escaped loop data
  // containing a literal "{{else}}" stays inert (second-order-injection guard).
  const stripStrayElse = (s: string): string => s.split(ELSE_TAG).join("");

  while (true) {
    if (++guard > 100_000) return out + stripStrayElse(rest); // defensive
    const block = findFirstBlock(rest);
    if (!block) {
      out += stripStrayElse(rest);
      break;
    }

    // Emit text before the block verbatim (minus any stray else).
    out += stripStrayElse(rest.slice(0, block.start));

    let rendered: string;
    if (block.kind === "each") {
      const items = resolveListItems(block.varName, variables, dataRow);
      // Resolve nested control blocks in the (author-controlled) body template
      // FIRST, then substitute escaped loop-item values into the result. The
      // {{this}} substitution is NOT re-parsed, so a list item containing
      // `{{#if x}}` or markup can never be re-interpreted as a directive
      // (second-order injection) nor rendered as HTML.
      const resolvedBody = resolveControlBlocks(
        block.body,
        variables,
        dataRow,
        depth + 1
      );
      rendered = items
        .map((item) => renderEachItem(resolvedBody, item))
        .join("");
    } else {
      const { truthy, falsy } = splitElse(block.body);
      let cond = isTruthy(block.varName, variables, dataRow);
      if (block.kind === "unless") cond = !cond;
      const chosen = cond ? truthy : falsy ?? "";
      // Recurse so nested blocks inside the chosen branch resolve too.
      rendered = resolveControlBlocks(chosen, variables, dataRow, depth + 1);
    }

    out += rendered;
    rest = rest.slice(block.end);
  }

  return out;
}

/**
 * Health-check variant: resolves control blocks but STRIPS the body of every
 * `{{#each}}` (loop-local vars like {{this}} are not document variables) and
 * resolves if/unless by keeping only the live branch. The result is fed to
 * the unset-variable scan so that:
 *   - vars inside a FALSE branch are removed (not flagged), and
 *   - vars inside loop bodies are removed (not flagged).
 * Vars inside a TRUE branch survive and remain checkable.
 */
export function stripControlBlocksForHealth(
  html: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string> = {},
  depth = 0
): string {
  if (!html) return html;
  if (depth >= MAX_NEST_DEPTH) return html;

  let out = "";
  let rest = html;
  let guard = 0;

  while (true) {
    if (++guard > 100_000) return out + rest;
    const block = findFirstBlock(rest);
    if (!block) {
      out += rest;
      break;
    }
    out += rest.slice(0, block.start);

    if (block.kind === "each") {
      // Drop loop bodies entirely — their vars are loop-local.
      out += "";
    } else {
      const { truthy, falsy } = splitElse(block.body);
      let cond = isTruthy(block.varName, variables, dataRow);
      if (block.kind === "unless") cond = !cond;
      const chosen = cond ? truthy : falsy ?? "";
      out += stripControlBlocksForHealth(chosen, variables, dataRow, depth + 1);
    }

    rest = rest.slice(block.end);
  }

  return out;
}
