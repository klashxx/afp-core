import type { WaterFootprintResult, ValidatedStudy, ValidationIssue } from "@/lib/water-footprint";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

export function buildStudyPdf(
  study: ValidatedStudy,
  result: WaterFootprintResult,
  warnings: ValidationIssue[]
) {
  const lines = [
    "AquaFootprint Copilot - Resultado de estudio",
    "",
    `Produccion total (kg): ${formatNumber(study.production_total_kg)}`,
    `Agua azul (m3): ${formatNumber(study.blue_m3)}`,
    `Agua verde (m3): ${formatNumber(study.green_m3)}`,
    `Gris habilitada: ${study.grey.enabled ? "Si" : "No"}`,
    `Contaminante: ${study.grey.pollutant || "N/A"}`,
    `Carga contaminante (kg): ${formatNumber(study.grey.load_kg)}`,
    `Cmax (mg/L): ${formatNumber(study.grey.cmax_mg_l)}`,
    `Cnat (mg/L): ${formatNumber(study.grey.cnat_mg_l)}`,
    "",
    `WF azul (L/kg): ${formatNumber(result.blue_l_per_kg)}`,
    `WF verde (L/kg): ${formatNumber(result.green_l_per_kg)}`,
    `WF gris (L/kg): ${formatNumber(result.grey_l_per_kg)}`,
    `WF total (L/kg): ${formatNumber(result.total_l_per_kg)}`,
    "",
    "Referencia metodologica base:",
    "- The Water Footprint Assessment Manual (formula componente gris)",
    "- Bases reguladoras Retos 2026 EDIH (contexto de agricultura intensiva)",
    ""
  ];

  if (warnings.length > 0) {
    lines.push("Advertencias:");
    for (const warning of warnings) {
      lines.push(`- ${warning.message}`);
    }
  }

  const textOperations = [
    "BT",
    "/F1 11 Tf",
    "50 790 Td",
    "14 TL",
    ...lines.map((line, index) =>
      index === 0 ? `(${escapePdfText(line)}) Tj` : `T* (${escapePdfText(line)}) Tj`
    ),
    "ET"
  ].join("\n");

  const stream = `${textOperations}\n`;

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  objects.push(`4 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream\nendobj\n`);
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i += 1) {
    const offset = String(offsets[i]).padStart(10, "0");
    pdf += `${offset} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
