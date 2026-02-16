// ============================================================
// /api/health — Simple healthcheck endpoint for Railway
// Always returns 200 OK without any external dependencies
// ============================================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
