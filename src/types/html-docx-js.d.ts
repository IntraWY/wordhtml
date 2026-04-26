/**
 * Minimal ambient types for `html-docx-js` (no official types ship).
 */
declare module "html-docx-js/dist/html-docx" {
  export function asBlob(html: string, options?: unknown): Blob;
  const _default: { asBlob: typeof asBlob };
  export default _default;
}
