import { describe, expect, it } from "vitest";
import { assessmentAuthHeaders, readOcrResponse } from "./assessmentUpload";
import { ocrMediaPart } from "../../supabase/functions/ocr-handwriting/media";

describe("assessment uploads", () => {
  it("includes the current sign-in token", () => {
    expect(assessmentAuthHeaders("test-token")).toEqual({ Authorization: "Bearer test-token" });
    expect(() => assessmentAuthHeaders()).toThrow("Please sign in");
  });
  it("rejects unsuccessful OCR instead of accepting blank text", async () => {
    await expect(readOcrResponse(new Response(JSON.stringify({ error: "Sign in required" }), { status: 401 }))).rejects.toThrow("Sign in required");
  });
  it("rejects blank or unreadable scripts", async () => {
    for (const extractedText of ["", "  ", "[UNREADABLE]"]) {
      await expect(readOcrResponse(new Response(JSON.stringify({ extractedText })))).rejects.toThrow("No readable text");
    }
  });
  it("returns successful extracted text", async () => {
    await expect(readOcrResponse(new Response(JSON.stringify({ extractedText: " Student answer " })))).resolves.toBe("Student answer");
  });
  it("sends PDFs as documents rather than images", () => {
    expect(ocrMediaPart("JVBERi0=", "application/pdf")).toEqual({ type: "file", file: { filename: "upload.pdf", file_data: "data:application/pdf;base64,JVBERi0=" } });
  });
  it("keeps image handling and rejects unsupported types", () => {
    expect(ocrMediaPart("aW1hZ2U=", "image/png")).toEqual({ type: "image_url", image_url: { url: "data:image/png;base64,aW1hZ2U=" } });
    expect(() => ocrMediaPart("data", "text/html")).toThrow("Unsupported file type");
  });
});