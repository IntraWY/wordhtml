/** DOM-side check: page body has no meaningful text (matches PM empty heuristic). */
export function isDomPageBodyEffectivelyEmpty(el: HTMLElement): boolean {
  const proseMirror = el.querySelector<HTMLElement>(".ProseMirror");
  const container = proseMirror ?? el;
  const text = container.textContent?.trim() ?? "";
  if (text !== "") return false;

  const children = Array.from(container.children) as HTMLElement[];
  for (const child of children) {
    const tag = child.tagName.toLowerCase();
    if (tag === "div" && child.classList.contains("page-break")) continue;
    if (tag === "p" && (child.textContent?.trim() ?? "") === "") continue;
    if ((child.textContent?.trim() ?? "") === "") continue;
    return false;
  }

  return true;
}
