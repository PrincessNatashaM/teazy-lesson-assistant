# Project rules

- Keep OCR media encoding and its MIME allowlist together inside the OCR function so all upload callers use the same server-side document contract.
- Use the assessment upload response helper for script imports so failed or unreadable uploads cannot become ready to mark.- Worksheets are structured data (one format per section) rendered by WorksheetDocument; PDF export captures its [data-ws-block] elements so preview and download match and questions never split from answer space.
