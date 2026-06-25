import { SupabaseClient } from "@supabase/supabase-js";

import { getSignedStudyFileUrl } from "@/lib/services/storage-files";
import { GeneratedMaterialRecord, StudyMaterial } from "@/types";

async function mapGeneratedMaterial(
  supabase: SupabaseClient,
  record: GeneratedMaterialRecord,
): Promise<StudyMaterial> {
  const imagePath = record.image_path || undefined;
  let imageUrl: string | undefined;

  if (imagePath) {
    try {
      imageUrl = await getSignedStudyFileUrl(supabase, imagePath);
    } catch {
      imageUrl = undefined;
    }
  }

  return {
    id: record.id,
    userId: record.user_id,
    subjectId: record.subject_id || "",
    documentId: record.file_id || undefined,
    title: record.title,
    type: record.material_type || "short_summary",
    detailLevel: record.detail_level || "medium",
    style: record.style || "simple",
    content: record.content,
    imageUrl,
    imagePath,
    imagePrompt: record.image_prompt || undefined,
    createdAt: record.created_at,
  };
}

export async function getAllGeneratedMaterials(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("generated_materials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return Promise.all(
    (data || []).map((entry) =>
      mapGeneratedMaterial(supabase, entry as GeneratedMaterialRecord),
    ),
  );
}

export async function getGeneratedMaterialById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("generated_materials")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data
    ? mapGeneratedMaterial(supabase, data as GeneratedMaterialRecord)
    : null;
}

export async function getMaterialsBySubject(supabase: SupabaseClient, subjectId: string) {
  const { data, error } = await supabase
    .from("generated_materials")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return Promise.all(
    (data || []).map((entry) =>
      mapGeneratedMaterial(supabase, entry as GeneratedMaterialRecord),
    ),
  );
}

export async function getMaterialsByFile(supabase: SupabaseClient, fileId: string) {
  const { data, error } = await supabase
    .from("generated_materials")
    .select("*")
    .eq("file_id", fileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return Promise.all(
    (data || []).map((entry) =>
      mapGeneratedMaterial(supabase, entry as GeneratedMaterialRecord),
    ),
  );
}

export async function createGeneratedMaterial(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<StudyMaterial, "id" | "userId" | "createdAt"> & {
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  },
) {
  const { data, error } = await supabase
    .from("generated_materials")
    .insert({
      user_id: userId,
      subject_id: input.subjectId || null,
      file_id: input.documentId || null,
      title: input.title,
      material_type: input.type,
      detail_level: input.detailLevel,
      style: input.style,
      content: input.content,
      model: input.model || null,
      image_path: input.imagePath || null,
      image_prompt: input.imagePrompt || null,
      input_tokens: input.inputTokens || 0,
      output_tokens: input.outputTokens || 0,
      total_tokens: input.totalTokens || 0,
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapGeneratedMaterial(supabase, data as GeneratedMaterialRecord);
}

export async function updateGeneratedMaterial(
  supabase: SupabaseClient,
  id: string,
  input: Omit<StudyMaterial, "id" | "userId" | "createdAt">,
) {
  const { data, error } = await supabase
    .from("generated_materials")
    .update({
      subject_id: input.subjectId || null,
      file_id: input.documentId || null,
      title: input.title,
      material_type: input.type,
      detail_level: input.detailLevel,
      style: input.style,
      content: input.content,
      image_path: input.imagePath || null,
      image_prompt: input.imagePrompt || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapGeneratedMaterial(supabase, data as GeneratedMaterialRecord);
}

export async function removeGeneratedMaterial(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("generated_materials").delete().eq("id", id);
  if (error) throw error;
}
