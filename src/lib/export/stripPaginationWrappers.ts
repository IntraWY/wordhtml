/**
 * Strip pagination wrappers (.page-node, .page-body, .page-header, .page-footer)
 * from exported HTML so the output looks like a normal document, and re-join
 * paragraphs that the paginator soft-split across pages (data-soft-split) back
 * into single paragraphs.
 *
 * Uses DOMParser so it works in both browser and jsdom test environments.
 */
export function stripPaginationWrappers(html: string): string {
  const hasWrappers =
    html.includes("page-node") || html.includes("page-body");
  const hasSoftSplit = html.includes("data-soft-split");
  const hasTableSplit = html.includes("data-repeat-source");
  const hasComments = html.includes("data-comment-id");
  const hasTrackChanges = html.includes("data-track");
  if (
    !hasWrappers &&
    !hasSoftSplit &&
    !hasTableSplit &&
    !hasComments &&
    !hasTrackChanges
  )
    return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const wrappers = doc.querySelectorAll(
    ".page-node, .page-body, .page-header, .page-footer"
  );
  wrappers.forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  });

  // Unwrap comment spans (B5) — review annotations never ship in exports.
  doc.querySelectorAll("span[data-comment-id]").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });

  // Resolve track changes (B8) on export: accept = keep insertions, drop deletions.
  doc.querySelectorAll("span[data-track]").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    if (el.getAttribute("data-track") === "deletion") {
      parent.removeChild(el);
    } else {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  });

  mergeSplitTables(doc.body);

  mergeSoftSplitParagraphs(doc.body);

  return doc.body.innerHTML;
}

/**
 * Reverse the A3 auto table-split: merge each run of consecutive `<table>`
 * pieces (produced by `splitTableAtRowBoundaries`) back into the first table.
 *
 * A continuation piece is identified by its FIRST row carrying
 * `data-repeat-source` — either `table-soft-split-header` (a repeated header
 * copy, which is DROPPED) or `table-soft-split` (the original first content row
 * of a header-less table, which is KEPT, marker stripped). All other rows of a
 * continuation piece are moved into the first table verbatim. Every original
 * row therefore lands in the merged table exactly once.
 */
function mergeSplitTables(root: HTMLElement): void {
  const tables = Array.from(root.querySelectorAll("table"));
  for (const table of tables) {
    // Skip a table already absorbed into an earlier run.
    if (!table.parentNode) continue;
    // A run starts only at a NON-continuation table (the first piece).
    if (isContinuationPiece(table)) continue;

    let next = table.nextElementSibling;
    while (
      next &&
      next.tagName === "TABLE" &&
      isContinuationPiece(next as HTMLTableElement)
    ) {
      absorbTablePiece(table, next as HTMLTableElement);
      const absorbed = next;
      next = next.nextElementSibling;
      absorbed.remove();
    }
  }
}

/** First row of the table carries a `data-repeat-source` marker. */
function isContinuationPiece(table: HTMLTableElement): boolean {
  const firstRow = table.querySelector("tr");
  return !!firstRow && firstRow.hasAttribute("data-repeat-source");
}

/** Move all rows of `piece` into `target`, dropping the repeated header copy. */
function absorbTablePiece(
  target: HTMLTableElement,
  piece: HTMLTableElement
): void {
  // Content rows must ALWAYS land in a `<tbody>` — never a `<thead>` (that
  // would produce invalid `<thead><tr>header</tr><tr>data</tr></thead>`). If
  // the target has no `<tbody>` yet (e.g. it only has a `<thead>`), create one
  // and append there. The single kept header stays in its original section.
  const dest =
    target.tBodies[target.tBodies.length - 1] ??
    target.appendChild(target.ownerDocument.createElement("tbody"));

  const rows = Array.from(piece.querySelectorAll("tr"));
  rows.forEach((row, idx) => {
    const marker = row.getAttribute("data-repeat-source");
    if (idx === 0 && marker === "table-soft-split-header") {
      // Repeated header copy — already present in the first piece. Drop it.
      return;
    }
    // Original content row (header-less continuation) — keep, strip marker.
    row.removeAttribute("data-repeat-source");
    dest.appendChild(row);
  });
}

/** Merge runs of adjacent `<p data-soft-split="true">` into a single paragraph. */
function mergeSoftSplitParagraphs(root: HTMLElement): void {
  const pieces = Array.from(
    root.querySelectorAll('p[data-soft-split="true"]')
  );
  for (const piece of pieces) {
    // Skip pieces already absorbed into a previous run.
    if (!piece.parentNode) continue;

    let next = piece.nextElementSibling;
    while (
      next &&
      next.tagName === "P" &&
      next.getAttribute("data-soft-split") === "true"
    ) {
      while (next.firstChild) piece.appendChild(next.firstChild);
      const absorbed = next;
      next = next.nextElementSibling;
      absorbed.remove();
    }
    piece.removeAttribute("data-soft-split");
  }
}
