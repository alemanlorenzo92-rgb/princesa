import { SupabaseClient } from "@supabase/supabase-js";

import { STUDY_FILES_BUCKET, sanitizeFileName } from "@/lib/services/storage-files";

async function uploadGeneratedImageBlob(
  supabase: SupabaseClient,
  blob: Blob,
  userId: string,
  subjectId?: string,
  title?: string,
) {
  const safeTitle = sanitizeFileName(title || "imagen-explicativa");
  const folder = subjectId || "unassigned";
  const filePath = `${userId}/${folder}/generated-images/${Date.now()}-${safeTitle}.png`;

  const { error } = await supabase.storage.from(STUDY_FILES_BUCKET).upload(filePath, blob, {
    cacheControl: "3600",
    contentType: "image/png",
    upsert: false,
  });

  if (error) {
    throw new Error(`No se pudo subir la imagen generada: ${error.message}`);
  }

  return filePath;
}

export async function uploadGeneratedMaterialImage(
  supabase: SupabaseClient,
  imageDataUrl: string,
  userId: string,
  subjectId?: string,
  title?: string,
) {
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();

  return uploadGeneratedImageBlob(supabase, blob, userId, subjectId, title);
}
