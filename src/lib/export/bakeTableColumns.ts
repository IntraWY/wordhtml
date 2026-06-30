// ── Export-time baking of table column widths ────────────────────────────────
//
// Tiptap v3 already serializes resized column widths into getHTML() as
// `<table style="width:Npx"><colgroup><col style="width:130px">…` PLUS a
// redundant `colwidth` attribute on every cell. The export cleaning pipeline
// deletes the (text-empty) `<colgroup>` in removeEmptyTags, so on export the
// columns lose their widths and `table-layout: fixed` redistributes them
// equally → visible reflow.
//
// This pure transform reconstructs the `<colgroup>` from the durable per-cell
// `colwidth` attributes (whitelisted in cleaners.ts) AFTER cleaning runs, so
// widths survive HTML / PDF / DOCX export and the live Preview. Unlike
// bakeTabStops it needs no live DOM — the source data is in the HTML string
// itself, so the zero-width / virtualized-page caveat does not apply.

function parse(html: string): Document {
  return new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    "text/html"
  );
}

/**
 * Per-column pixel widths for one table, derived from the first row's cells
 * (expanding `colspan`, reading the comma-separated `colwidth`). Entries are
 * `null` where the width is unknown. Returns null when there is no row.
 */
function columnWidths(table: Element): (number | null)[] | null {
  const firstRow = table.querySelector("tr");
  if (!firstRow) return null;
  const cells = Array.from(firstRow.children).filter(
    (el) => el.tagName === "TD" || el.tagName === "TH"
  );
  const widths: (number | null)[] = [];
  for (const cell of cells) {
    const colspan = Math.max(
      1,
      parseInt(cell.getAttribute("colspan") ?? "1", 10) || 1
    );
    const raw = cell.getAttribute("colwidth");
    const parts = raw ? raw.split(",") : [];
    for (let i = 0; i < colspan; i++) {
      const w = parts[i] != null ? parseInt(parts[i], 10) : NaN;
      widths.push(Number.isFinite(w) && w > 0 ? w : null);
    }
  }
  return widths;
}

/** Remove the now-redundant `colwidth` attribute from every cell in a table. */
function stripColwidthAttrs(table: Element): boolean {
  let removed = false;
  table.querySelectorAll("td[colwidth], th[colwidth]").forEach((cell) => {
    cell.removeAttribute("colwidth");
    removed = true;
  });
  return removed;
}

/** Pin the table's inline width, replacing any existing width/min-width. */
function setTableWidth(table: Element, totalPx: number): void {
  const style = table.getAttribute("style") ?? "";
  const cleaned = style
    .replace(/(?:^|;)\s*(?:min-)?width\s*:[^;]*/gi, "")
    .replace(/^;+|;+$/g, "")
    .trim();
  const parts = [cleaned, `width:${totalPx}px`].filter(Boolean);
  table.setAttribute("style", parts.join("; "));
}

/**
 * Bake table column widths from per-cell `colwidth` attributes into a real
 * `<colgroup>` (and a pinned table width when every column is known). Pure and
 * idempotent: `bakeTableColumns(bakeTableColumns(x)) === bakeTableColumns(x)`.
 * Returns the input unchanged when there are no tables or no width data.
 */
export function bakeTableColumns(html: string): string {
  if (!html || !html.includes("<table")) return html;
  const doc = parse(html);
  let changed = false;

  doc.body.querySelectorAll("table").forEach((table) => {
    const widths = columnWidths(table);
    if (!widths || widths.length === 0) return;

    // No usable width info: leave the table responsive (width:100%), but tidy
    // any stray colwidth attrs.
    if (widths.every((w) => w === null)) {
      if (stripColwidthAttrs(table)) changed = true;
      return;
    }

    // Rebuild the colgroup as the first child (removing any existing one first,
    // so the step self-heals even after removeEmptyTags ate it, and stays
    // idempotent).
    table.querySelector(":scope > colgroup")?.remove();
    const colgroup = doc.createElement("colgroup");
    for (const w of widths) {
      const col = doc.createElement("col");
      if (w !== null) col.setAttribute("style", `width:${w}px`);
      colgroup.appendChild(col);
    }
    table.insertBefore(colgroup, table.firstChild);

    // Every column known → pin the table width so it overrides wrap.ts's
    // width:100% and reproduces the editor exactly. Partial widths leave the
    // table width to CSS; the explicit <col> widths still pin those columns
    // under table-layout: fixed.
    if (widths.every((w) => w !== null)) {
      const total = widths.reduce<number>((sum, w) => sum + (w as number), 0);
      setTableWidth(table, total);
    }

    stripColwidthAttrs(table);
    changed = true;
  });

  return changed ? doc.body.innerHTML : html;
}
