import "server-only";

import JSZip from "jszip";
import mammoth from "mammoth";

import { MAX_EXTRACTED_PDF_TEXT_CHARACTERS } from "@/lib/pdf-config";
import { extractTextFromPdfBuffer } from "@/lib/server/pdf/extract-text";
import { getFileExtension } from "@/lib/study-file-config";
import { StudyDocument } from "@/types";

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

function truncateExtractedText(text: string) {
  const normalizedText = normalizeExtractedText(text);
  const wasTruncated = normalizedText.length > MAX_EXTRACTED_PDF_TEXT_CHARACTERS;

  return {
    text: wasTruncated
      ? normalizedText.slice(0, MAX_EXTRACTED_PDF_TEXT_CHARACTERS).trim()
      : normalizedText,
    wasTruncated,
  };
}

async function extractTextFromPlainBuffer(buffer: Buffer) {
  return truncateExtractedText(buffer.toString("utf-8"));
}

async function extractTextFromDocxBuffer(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return truncateExtractedText(result.value);
}

async function extractTextFromPptxBuffer(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const slideTexts = await Promise.all(
    slidePaths.map(async (path) => {
      const xml = await zip.files[path].async("string");
      return xml
        .replace(/<a:br\s*\/>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }),
  );

  return truncateExtractedText(slideTexts.join("\n\n"));
}

export function canExtractStoredFileText(file: Pick<StudyDocument, "fileName" | "fileType">) {
  const extension = getFileExtension(file.fileName) || file.fileType?.toLowerCase() || "";

  return [
    "pdf",
    "txt",
    "md",
    "markdown",
    "csv",
    "tsv",
    "json",
    "jsonl",
    "xml",
    "html",
    "htm",
    "css",
    "js",
    "jsx",
    "ts",
    "tsx",
    "mjs",
    "cjs",
    "yml",
    "yaml",
    "rtf",
    "log",
    "ini",
    "env",
    "conf",
    "sql",
    "py",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "cs",
    "go",
    "rs",
    "php",
    "rb",
    "swift",
    "kt",
    "sh",
    "bat",
    "ps1",
    "docx",
    "pptx",
  ].includes(extension);
}

export async function extractTextFromStoredFile(
  file: Pick<StudyDocument, "fileName" | "fileType">,
  buffer: Buffer,
) {
  const extension = getFileExtension(file.fileName) || file.fileType?.toLowerCase() || "";

  if (extension === "pdf") {
    return extractTextFromPdfBuffer(buffer);
  }

  if (extension === "docx") {
    return extractTextFromDocxBuffer(buffer);
  }

  if (extension === "pptx") {
    return extractTextFromPptxBuffer(buffer);
  }

  if (canExtractStoredFileText(file)) {
    return extractTextFromPlainBuffer(buffer);
  }

  throw new Error("UNSUPPORTED_FILE_TYPE");
}
