import { NextResponse } from "next/server";

import { getSafeRuntimeConfigMessage } from "@/lib/server/runtime-config";

export async function GET() {
  return NextResponse.json(await getSafeRuntimeConfigMessage());
}
