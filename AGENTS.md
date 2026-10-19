# Project rules

- Keep OCR media encoding and its MIME allowlist together inside the OCR function so all upload callers use the same server-side document contract.
- Use the assessment upload response helper for script imports so failed or unreadable uploads cannot become ready to mark.