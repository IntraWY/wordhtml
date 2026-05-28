import type { Node as PMNode } from "@tiptap/pm/model";

/** True when a page body has no meaningful text (only empty blocks / page breaks). */
export function isPageBodyEffectivelyEmpty(pageBody: PMNode): boolean {
  if (pageBody.type.name !== "pageBody") return false;

  if (pageBody.textContent.trim() !== "") {
    return false;
  }

  for (let i = 0; i < pageBody.childCount; i++) {
    const child = pageBody.child(i);
    if (child.type.name === "pageBreak") continue;
    if (child.type.name === "paragraph" && child.textContent.trim() === "") {
      continue;
    }
    return false;
  }

  return true;
}
