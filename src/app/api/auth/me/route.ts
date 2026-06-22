import { NextResponse } from "next/server";

import { getCurrentAdminState } from "@/lib/server/admin-access";

export async function GET() {
  try {
    const state = await getCurrentAdminState();

    if (!state.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.json({
      userId: state.user.id,
      email: state.user.email || "",
      role: state.role,
      isAdmin: state.isAdmin,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el estado administrativo.",
      },
      { status: 500 },
    );
  }
}
