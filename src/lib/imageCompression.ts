import imageCompression from "browser-image-compression";

export interface CompressionOptions {
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
  useWebWorker?: boolean;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidthOrHeight: 1920,
  maxSizeMB: 1.0,
  useWebWorker: true,
};

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return imageCompression(file, opts);
}

export async function compressImageIfEnabled(
  file: File,
  enabled: boolean,
  options?: CompressionOptions
): Promise<File> {
  if (!enabled) return file;
  try {
    return await compressImage(file, options);
  } catch (e) {
    console.error("Image compression failed, using original:", e);
    return file;
  }
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read file as data URL"));
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}
