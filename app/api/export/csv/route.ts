import { NextResponse } from "next/server";

import { escapeCsvValue } from "@/lib/csv";
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

    const rows = [
      ["metric", "value"],
      ["production_total_kg", validation.data.production_total_kg],
      ["blue_m3", validation.data.blue_m3],
      ["green_m3", validation.data.green_m3],
      ["grey_enabled", validation.data.grey.enabled],
      ["grey_pollutant", validation.data.grey.pollutant],
      ["grey_load_kg", validation.data.grey.load_kg],
      ["grey_cmax_mg_l", validation.data.grey.cmax_mg_l],
      ["grey_cnat_mg_l", validation.data.grey.cnat_mg_l],
      ["wf_blue_l_per_kg", result.blue_l_per_kg],
      ["wf_green_l_per_kg", result.green_l_per_kg],
      ["wf_grey_l_per_kg", result.grey_l_per_kg],
      ["wf_total_l_per_kg", result.total_l_per_kg]
    ];

    const csv = rows
      .map((row) => row.map((item) => escapeCsvValue(item as string | number | boolean)).join(","))
      .join("\n");

    return new NextResponse(`${csv}\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="afp-results.csv"',
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        issues: [
          {
            field: "export.csv",
            message: "No se pudo exportar el CSV.",
            severity: "error"
          }
        ]
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
