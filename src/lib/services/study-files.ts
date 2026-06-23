import { SupabaseClient } from "@supabase/supabase-js";

import {
  ExtractStudyFileTextResponse,
  StudyDocument,
  StudyFileRecord,
} from "@/types";
import { getStoredStudyFileType } from "@/lib/study-file-config";
import {
  deleteStudyFile,
  getSignedStudyFileUrl,
} from "@/lib/services/storage-files";

function mapStudyFile(record: StudyFileRecord): StudyDocument {
  return {
    id: record.id,
    userId: record.user_id,
    subjectId: record.subject_id || "",
    title: record.title,
    description: record.description || "",
    fileName: record.original_filename || undefined,
    fileDataUrl: record.file_url || undefined,
    filePath: record.file_path || undefined,
    fileType: record.file_type || undefined,
    sourceText: record.manual_text || undefined,
    extractedText: record.extracted_text || undefined,
    createdAt: record.created_at,
  };
}

export async function getAllStudyFiles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("study_files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((entry) => mapStudyFile(entry as StudyFileRecord));
}

export async function getStudyFileById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("study_files")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapStudyFile(data as StudyFileRecord) : null;
}

export async function getFilesBySubject(supabase: SupabaseClient, subjectId: string) {
  const { data, error } = await supabase
    .from("study_files")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((entry) => mapStudyFile(entry as StudyFileRecord));
}

export async function createStudyFile(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<StudyDocument, "id" | "userId" | "createdAt">,
) {
  const { data, error } = await supabase
    .from("study_files")
    .insert({
      user_id: userId,
      subject_id: input.subjectId || null,
      title: input.title,
      description: input.description,
      file_url: input.fileDataUrl || null,
      file_path: input.filePath || null,
      original_filename: input.fileName || null,
      extracted_text: input.extractedText || null,
      manual_text: input.sourceText || null,
      file_type: input.fileType
        || getStoredStudyFileType({
          fileName: input.fileName,
          mimeType: input.fileDataUrl ? "application/octet-stream" : null,
        })
        || (input.fileDataUrl ? "file" : "text"),
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapStudyFile(data as StudyFileRecord);
}

export async function updateStudyFile(
  supabase: SupabaseClient,
  id: string,
  input: Omit<StudyDocument, "id" | "userId" | "createdAt">,
) {
  const { data, error } = await supabase
    .from("study_files")
    .update({
      subject_id: input.subjectId || null,
      title: input.title,
      description: input.description,
      file_url: input.fileDataUrl || null,
      file_path: input.filePath || null,
      original_filename: input.fileName || null,
      file_type: input.fileType || null,
      extracted_text: input.extractedText || null,
      manual_text: input.sourceText || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapStudyFile(data as StudyFileRecord);
}

export async function updateExtractedText(
  supabase: SupabaseClient,
  id: string,
  extractedText: string,
) {
  const { data, error } = await supabase
    .from("study_files")
    .update({
      extracted_text: extractedText || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data ? mapStudyFile(data as StudyFileRecord) : null;
}

export function hasExtractedText(
  file: Pick<StudyDocument, "extractedText"> | null | undefined,
) {
  return Boolean(file?.extractedText?.trim());
}

export async function removeStudyFile(supabase: SupabaseClient, id: string) {
  const studyFile = await getStudyFileById(supabase, id);

  if (studyFile?.filePath) {
    await deleteStudyFile(supabase, studyFile.filePath);
  }

  const { error } = await supabase.from("study_files").delete().eq("id", id);
  if (error) throw error;
}

export async function getStudyFileSignedUrl(supabase: SupabaseClient, id: string) {
  const studyFile = await getStudyFileById(supabase, id);

  if (!studyFile) {
    throw new Error("No se encontro el archivo solicitado.");
  }

  if (studyFile.filePath) {
    return getSignedStudyFileUrl(supabase, studyFile.filePath);
  }

  return studyFile.fileDataUrl || null;
}

export async function extractTextForStudyFile(fileId: string) {
  const response = await fetch("/api/files/extract-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(errorPayload?.error || "No se pudo extraer texto del archivo.");
  }

  return (await response.json()) as ExtractStudyFileTextResponse;
}
