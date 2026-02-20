import { NextResponse } from "next/server";

import { hasBlockingErrors } from "@/lib/water-footprint";
import { validateCsvStudy } from "@/lib/csv";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const csv = formData.get("csv");

    let text = "";

    if (typeof csv === "string") {
      text = csv;
    } else if (file instanceof File) {
      text = await file.text();
    }

    const result = validateCsvStudy(text);

    return NextResponse.json(result, {
      status: hasBlockingErrors(result.issues) ? 400 : 200,
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        preview: null,
        headers: [],
        issues: [
          {
            field: "csv",
            message: "No se pudo validar el CSV subido.",
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
