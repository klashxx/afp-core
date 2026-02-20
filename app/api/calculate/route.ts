import { NextResponse } from "next/server";

import {
  calculateWaterFootprint,
  hasBlockingErrors,
  validateAndNormalizeStudy
} from "@/lib/water-footprint";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = body?.study ?? body;
    const validation = validateAndNormalizeStudy(input);

    if (!validation.data || hasBlockingErrors(validation.issues)) {
      return NextResponse.json(
        {
          ok: false,
          issues: validation.issues
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" }
        }
      );
    }

    const result = calculateWaterFootprint(validation.data);

    return NextResponse.json(
      {
        ok: true,
        study: validation.data,
        result,
        issues: validation.issues
      },
      {
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        issues: [
          {
            field: "request",
            message: "No se pudo procesar la solicitud de calculo.",
            severity: "error"
          }
        ]
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
