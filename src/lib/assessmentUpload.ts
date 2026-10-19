export function assessmentAuthHeaders(accessToken?: string): Record<string, string> {
  if (!accessToken) throw new Error("Please sign in before reading or marking a script.");
  return { Authorization: `Bearer ${accessToken}` };
}

export async function readOcrResponse(response: Response): Promise<string> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not read the file. Please try uploading it again.");
  if (typeof data.extractedText !== "string" || !data.extractedText.trim() || data.extractedText.trim() === "[UNREADABLE]") {
    throw new Error("No readable text found. Upload a clearer copy or enter the text manually.");
  }
  return data.extractedText.trim();
}