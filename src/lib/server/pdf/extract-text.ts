import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

import { MAX_EXTRACTED_PDF_TEXT_CHARACTERS } from "@/lib/pdf-config";

function normalizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export async function extractTextFromPdfBuffer(buffer: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const normalizedText = normalizeExtractedText(text);
  const wasTruncated = normalizedText.length > MAX_EXTRACTED_PDF_TEXT_CHARACTERS;

  return {
    text: wasTruncated
      ? normalizedText.slice(0, MAX_EXTRACTED_PDF_TEXT_CHARACTERS).trim()
      : normalizedText,
    wasTruncated,
  };
}
