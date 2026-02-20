import { NextResponse } from "next/server";

import { buildCsvTemplate } from "@/lib/csv";

export async function GET() {
  return new NextResponse(buildCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="afp-template.csv"',
      "Cache-Control": "no-store"
    }
  });
}
