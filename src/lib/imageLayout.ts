/**
 * Word-style image layout (Layout Options / Wrap Text).
 *
 * Maps the editor's primitive image attributes (`align` + CSS float, and
 * `float`/`zIndex` for absolute free-positioning) onto a single set of named
 * placement modes mirroring Microsoft Word. UI surfaces (the image size bar and
 * the right-click menu) both drive the image through these helpers so the two
 * stay in sync and the mapping is unit-testable.
 *
 * Stacking note: "behind" uses a negative z-index. `.page-body` is transparent
 * (only `.page-node` paints the white page), so a `z-index:-1` absolute image
 * renders behind the in-flow text yet above the page background — i.e. the text
 * stays readable on top (Word "Behind Text").
 */

export type ImageLayoutMode =
  | "block" // เต็มความกว้าง — in-flow block, text above/below
  | "wrapLeft" // ล้อมซ้าย — float:left, text wraps on the right
  | "wrapRight" // ล้อมขวา — float:right, text wraps on the left
  | "center" // กึ่งกลาง บน-ล่าง — centered block
  | "front" // หน้าข้อความ — absolute, in front of text
  | "behind"; // หลังข้อความ — absolute, behind text (readable)

/** The subset of image-node attributes that determine the layout mode. */
export interface ImageLayoutAttrs {
  align?: string | null;
  float?: boolean | null;
  zIndex?: number | null;
}

/** Attributes a mode writes back onto the image node via `updateAttributes`. */
export interface ImageLayoutPatch {
  align: string | null;
  float: boolean | null;
  zIndex: number;
}

/** Default stacking for a floating image placed in front of text. */
export const FRONT_Z_INDEX = 5;
/** Stacking for a floating image sent behind text (negative → under in-flow text). */
export const BEHIND_Z_INDEX = -1;

/** Derive the current Word-style layout mode from raw image attributes. */
export function layoutModeFromAttrs(attrs: ImageLayoutAttrs): ImageLayoutMode {
  if (attrs.float) {
    const z = Number(attrs.zIndex);
    return Number.isFinite(z) && z < 0 ? "behind" : "front";
  }
  switch (attrs.align) {
    case "left":
      return "wrapLeft";
    case "right":
      return "wrapRight";
    case "center":
      return "center";
    default:
      return "block";
  }
}

/**
 * The attribute patch for a target mode. Floating modes (`front`/`behind`) leave
 * `posX`/`posY` to the caller (they need a DOM measurement to seed a sensible
 * start position); in-flow modes always clear `float` and reset `zIndex` so a
 * later switch back to floating starts cleanly in front.
 */
export function attrsForLayoutMode(mode: ImageLayoutMode): ImageLayoutPatch {
  switch (mode) {
    case "front":
      return { align: null, float: true, zIndex: FRONT_Z_INDEX };
    case "behind":
      return { align: null, float: true, zIndex: BEHIND_Z_INDEX };
    case "wrapLeft":
      return { align: "left", float: null, zIndex: FRONT_Z_INDEX };
    case "wrapRight":
      return { align: "right", float: null, zIndex: FRONT_Z_INDEX };
    case "center":
      return { align: "center", float: null, zIndex: FRONT_Z_INDEX };
    case "block":
    default:
      return { align: null, float: null, zIndex: FRONT_Z_INDEX };
  }
}

/** True when the mode positions the image absolutely (free-floating). */
export function isFloatingMode(mode: ImageLayoutMode): boolean {
  return mode === "front" || mode === "behind";
}
