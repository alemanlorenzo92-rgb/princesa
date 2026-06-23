export const MAX_STUDY_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const TEXT_LIKE_MIME_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "application/x-sh",
  "application/x-httpd-php",
  "application/x-yaml",
  "application/yaml",
  "application/rtf",
]);

const TEXT_LIKE_EXTENSIONS = new Set([
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
]);

export function getFileExtension(fileName?: string | null) {
  if (!fileName) return "";
  const normalized = fileName.trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf(".");

  if (lastDotIndex < 0 || lastDotIndex === normalized.length - 1) {
    return "";
  }

  return normalized.slice(lastDotIndex + 1);
}

export function getStoredStudyFileType(input: {
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const extension = getFileExtension(input.fileName);
  if (extension) return extension;
  if (!input.mimeType) return "file";
  return input.mimeType.toLowerCase();
}

export function getStudyFileDisplayLabel(input: {
  fileName?: string | null;
  fileType?: string | null;
  hasStoredFile?: boolean;
}) {
  if (!input.hasStoredFile) {
    return "Apunte manual";
  }

  const extension = getFileExtension(input.fileName) || input.fileType?.toLowerCase() || "archivo";
  return `Archivo ${extension.toUpperCase()}`;
}

export function canExtractTextFromStudyFile(input: {
  fileName?: string | null;
  mimeType?: string | null;
  fileType?: string | null;
}) {
  const extension = getFileExtension(input.fileName) || input.fileType?.toLowerCase() || "";
  const mimeType = input.mimeType?.toLowerCase() || "";

  if (["pdf", "docx", "pptx"].includes(extension)) {
    return true;
  }

  if (TEXT_LIKE_EXTENSIONS.has(extension)) {
    return true;
  }

  if (mimeType.startsWith("text/") || TEXT_LIKE_MIME_TYPES.has(mimeType)) {
    return true;
  }

  return false;
}
