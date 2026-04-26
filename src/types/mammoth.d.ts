/**
 * Minimal type shim for `mammoth` (no official @types).
 * Covers only the surface this project uses.
 */
declare module "mammoth" {
  export interface ConvertMessage {
    type: "warning" | "error" | "info";
    message: string;
  }

  export interface ConvertResult {
    value: string;
    messages: ConvertMessage[];
  }

  export interface ConvertInput {
    arrayBuffer: ArrayBuffer;
  }

  export interface MammothImage {
    contentType: string;
    read(format?: "base64" | "binary"): Promise<string>;
  }

  export interface ImageElementAttrs {
    src: string;
    alt?: string;
  }

  export interface ConvertOptions {
    convertImage?: (image: MammothImage) => Promise<ImageElementAttrs>;
    styleMap?: string | string[];
  }

  export const images: {
    imgElement(
      transform: (image: MammothImage) => Promise<ImageElementAttrs>
    ): (image: MammothImage) => Promise<ImageElementAttrs>;
  };

  export function convertToHtml(
    input: ConvertInput,
    options?: ConvertOptions
  ): Promise<ConvertResult>;

  export function extractRawText(input: ConvertInput): Promise<ConvertResult>;

  const _default: {
    convertToHtml: typeof convertToHtml;
    extractRawText: typeof extractRawText;
    images: typeof images;
  };
  export default _default;
}
