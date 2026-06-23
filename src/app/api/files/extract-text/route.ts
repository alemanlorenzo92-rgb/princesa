import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  MAX_EXTRACTED_PDF_TEXT_CHARACTERS,
  PDF_TEXT_PREVIEW_CHARACTERS,
} from "@/lib/pdf-config";
import {
  canExtractStoredFileText,
  extractTextFromStoredFile,
} from "@/lib/server/files/extract-text";
import {
  getStudyFileById,
  hasExtractedText,
  updateExtractedText,
} from "@/lib/services/study-files";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  fileId: z.string().uuid("Archivo no encontrado."),
});

export const runtime = "nodejs";

function getPreview(text: string) {
  return text.slice(0, PDF_TEXT_PREVIEW_CHARACTERS).trim();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json(
      { error: "No se pudo validar la sesion actual." },
      { status: 401 },
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "No se pudo identificar al usuario actual." },
      { status: 401 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es JSON valido." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Archivo no encontrado." },
      { status: 400 },
    );
  }

  const studyFile = await getStudyFileById(supabase, parsed.data.fileId);

  if (!studyFile) {
    return NextResponse.json(
      { error: "Archivo no encontrado." },
      { status: 404 },
    );
  }

  if (studyFile.userId !== user.id) {
    return NextResponse.json(
      { error: "No tenes permiso para procesar este archivo." },
      { status: 403 },
    );
  }

  if (!studyFile.filePath) {
    return NextResponse.json(
      { error: "Este material no tiene un archivo guardado en Storage." },
      { status: 404 },
    );
  }

  if (!canExtractStoredFileText(studyFile)) {
    return NextResponse.json(
      {
        error:
          "Este formato se puede subir y abrir, pero por ahora no se puede extraer texto automaticamente.",
      },
      { status: 400 },
    );
  }

  if (hasExtractedText(studyFile)) {
    return NextResponse.json({
      success: true,
      extractedTextLength: studyFile.extractedText?.length || 0,
      preview: studyFile.extractedText ? getPreview(studyFile.extractedText) : undefined,
    });
  }

  const { data, error } = await supabase.storage
    .from("study-files")
    .download(studyFile.filePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo descargar el archivo desde Storage." },
      { status: 502 },
    );
  }

  try {
    const arrayBuffer = await data.arrayBuffer();
    const { text, wasTruncated } = await extractTextFromStoredFile(
      studyFile,
      Buffer.from(arrayBuffer),
    );

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            "No se encontro texto util en el archivo. Puede ser un archivo escaneado, vacio o no compatible.",
        },
        { status: 422 },
      );
    }

    await updateExtractedText(supabase, studyFile.id, text);

    return NextResponse.json({
      success: true,
      extractedTextLength: text.length,
      preview: getPreview(text),
      warning: wasTruncated
        ? `El texto extraido fue recortado por seguridad a ${MAX_EXTRACTED_PDF_TEXT_CHARACTERS} caracteres.`
        : undefined,
    });
  } catch (extractError) {
    console.error("File text extraction failed", extractError);

    return NextResponse.json(
      { error: "No se pudo extraer texto del archivo." },
      { status: 500 },
    );
  }
}
