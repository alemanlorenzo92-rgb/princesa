import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD_LENGTH = 6;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("No se pudo leer la solicitud de registro.");
  }

  const payload = body as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  };

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  const password = String(payload.password || "");

  if (!name) {
    return badRequest("El nombre es obligatorio.");
  }

  if (!email) {
    return badRequest("El email es obligatorio.");
  }

  if (!password) {
    return badRequest("La contrasena es obligatoria.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return badRequest("La contrasena debe tener al menos 6 caracteres.");
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    });

    if (error) {
      const message = error.message.toLowerCase();

      if (message.includes("already")) {
        return badRequest("Ya existe una cuenta con ese email.");
      }

      return NextResponse.json(
        { error: "No se pudo crear la cuenta en Supabase Auth." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      needsEmailConfirmation: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Fallo la configuracion del servidor para registrar usuarios." },
      { status: 500 },
    );
  }
}
