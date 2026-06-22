import { SupabaseClient } from "@supabase/supabase-js";

import { MAX_STUDY_PDF_SIZE_BYTES } from "@/lib/pdf-config";

export const STUDY_FILES_BUCKET = "study-files";
const SIGNED_URL_EXPIRATION_SECONDS = 60 * 10;

function normalizeStudyFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "archivo.pdf";
}

export function sanitizeFileName(fileName: string) {
  const normalized = normalizeStudyFileName(fileName);
  return normalized.endsWith(".pdf") ? normalized : `${normalized}.pdf`;
}

export function validatePdfFile(file: File) {
  if (!file) {
    throw new Error("Selecciona un archivo PDF antes de continuar.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Solo se permiten archivos PDF con tipo application/pdf.");
  }

  if (file.size > MAX_STUDY_PDF_SIZE_BYTES) {
    throw new Error("El PDF supera el limite de 10 MB permitido por ahora.");
  }
}

async function getAuthenticatedUserId(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error("No se pudo validar la sesion antes de operar con Storage.");
  }

  if (!user) {
    throw new Error("Necesitas iniciar sesion para subir o abrir archivos.");
  }

  return user.id;
}

function ensureOwnStudyFilePath(filePath: string, userId: string) {
  if (!filePath.startsWith(`${userId}/`)) {
    throw new Error("No tienes permiso para operar con este archivo.");
  }
}

export async function uploadStudyPdf(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  subjectId?: string,
) {
  validatePdfFile(file);

  const sessionUserId = await getAuthenticatedUserId(supabase);
  if (sessionUserId !== userId) {
    throw new Error("La sesion actual no coincide con el usuario del archivo.");
  }

  const safeFileName = sanitizeFileName(file.name);
  const folder = subjectId || "unassigned";
  const filePath = `${sessionUserId}/${folder}/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from(STUDY_FILES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(`No se pudo subir el PDF a Supabase Storage: ${error.message}`);
  }

  return {
    filePath,
    originalFileName: file.name,
    fileType: "pdf",
  };
}

export async function deleteStudyPdf(supabase: SupabaseClient, filePath: string) {
  const sessionUserId = await getAuthenticatedUserId(supabase);
  ensureOwnStudyFilePath(filePath, sessionUserId);

  const { error } = await supabase.storage.from(STUDY_FILES_BUCKET).remove([filePath]);

  if (error) {
    throw new Error(`No se pudo eliminar el PDF de Supabase Storage: ${error.message}`);
  }
}

export async function getSignedStudyPdfUrl(
  supabase: SupabaseClient,
  filePath: string,
) {
  const sessionUserId = await getAuthenticatedUserId(supabase);
  ensureOwnStudyFilePath(filePath, sessionUserId);

  const { data, error } = await supabase.storage
    .from(STUDY_FILES_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRATION_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(
      `No se pudo generar una URL firmada para el PDF: ${error?.message || "URL vacia."}`,
    );
  }

  return data.signedUrl;
}
