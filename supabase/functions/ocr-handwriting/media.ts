const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"]);

export function ocrMediaPart(base64: string, mimeType: unknown) {
  const mime = mimeType === undefined || mimeType === null ? "image/jpeg" : mimeType;
  if (typeof mime !== "string" || !ALLOWED_MIME.has(mime.toLowerCase())) {
    throw new Error("Unsupported file type.");
  }
  const normalized = mime.toLowerCase();
  return normalized === "application/pdf"
    ? { type: "file", file: { filename: "upload.pdf", file_data: `data:application/pdf;base64,${base64}` } }
    : { type: "image_url", image_url: { url: `data:${normalized};base64,${base64}` } };
}