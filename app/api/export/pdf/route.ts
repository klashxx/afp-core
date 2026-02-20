import { NextResponse } from "next/server";

import { buildStudyPdf } from "@/lib/pdf";
import {
  calculateWaterFootprint,
  hasBlockingErrors,
  type WaterFootprintResult,
  validateAndNormalizeStudy
} from "@/lib/water-footprint";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateAndNormalizeStudy(body?.study);

    if (!validation.data || hasBlockingErrors(validation.issues)) {
      return NextResponse.json(
        { ok: false, issues: validation.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const result: WaterFootprintResult = body?.result ?? calculateWaterFootprint(validation.data);
    const buffer = buildStudyPdf(validation.data, result, validation.issues.filter((i) => i.severity === "warning"));

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="afp-results.pdf"',
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        issues: [
          {
            field: "export.pdf",
            message: "No se pudo exportar el PDF.",
            severity: "error"
          }
        ]
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
