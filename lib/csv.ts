import {
  hasBlockingErrors,
  tomatoGreenhouseExample,
  type ValidationIssue,
  type ValidatedStudy,
  validateAndNormalizeStudy
} from "@/lib/water-footprint";

export const CSV_TEMPLATE_HEADERS = [
  "production_total_kg",
  "blue_m3",
  "green_m3",
  "grey_enabled",
  "grey_pollutant",
  "grey_load_kg",
  "grey_cmax_mg_l",
  "grey_cnat_mg_l"
] as const;

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "si", "yes", "y", "verdadero"].includes(normalized);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsvText(text: string): {
  headers: string[];
  rows: string[][];
} {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);

  return { headers, rows };
}

export type CsvValidationResult = {
  ok: boolean;
  headers: string[];
  preview: ValidatedStudy | null;
  issues: ValidationIssue[];
};

export function validateCsvStudy(text: string): CsvValidationResult {
  const { headers, rows } = parseCsvText(text);
  const issues: ValidationIssue[] = [];

  if (headers.length === 0) {
    return {
      ok: false,
      headers: [],
      preview: null,
      issues: [
        {
          field: "csv",
          message: "El CSV esta vacio.",
          severity: "error"
        }
      ]
    };
  }

  const headerSet = new Set(headers);
  for (const required of CSV_TEMPLATE_HEADERS) {
    if (!headerSet.has(required)) {
      issues.push({
        field: "csv.headers",
        message: `Falta la columna requerida: ${required}`,
        severity: "error"
      });
    }
  }

  if (rows.length === 0) {
    issues.push({
      field: "csv",
      message: "No hay filas de datos para importar.",
      severity: "error"
    });
  }

  if (rows.length > 1) {
    issues.push({
      field: "csv",
      message: "Se detectaron varias filas. En P0 se usara solo la primera.",
      severity: "warning"
    });
  }

  if (hasBlockingErrors(issues)) {
    return {
      ok: false,
      headers,
      preview: null,
      issues
    };
  }

  const firstRow = rows[0];
  const rowMap = Object.fromEntries(headers.map((header, index) => [header, firstRow[index] ?? ""]));

  const parsedStudy = {
    production_total_kg: rowMap.production_total_kg,
    blue_m3: rowMap.blue_m3,
    green_m3: rowMap.green_m3,
    grey: {
      enabled: parseBoolean(rowMap.grey_enabled ?? "false"),
      pollutant: rowMap.grey_pollutant ?? "",
      load_kg: rowMap.grey_load_kg,
      cmax_mg_l: rowMap.grey_cmax_mg_l,
      cnat_mg_l: rowMap.grey_cnat_mg_l === "" ? undefined : rowMap.grey_cnat_mg_l
    }
  };

  const normalizedResult = validateAndNormalizeStudy(parsedStudy);
  const mergedIssues = [...issues, ...normalizedResult.issues];

  if (!normalizedResult.data || hasBlockingErrors(mergedIssues)) {
    return {
      ok: false,
      headers,
      preview: normalizedResult.data,
      issues: mergedIssues
    };
  }

  return {
    ok: true,
    headers,
    preview: normalizedResult.data,
    issues: mergedIssues
  };
}

export function buildCsvTemplate() {
  const header = CSV_TEMPLATE_HEADERS.join(",");
  const e = tomatoGreenhouseExample;

  const row = [
    e.production_total_kg,
    e.blue_m3,
    e.green_m3,
    e.grey.enabled,
    `"${e.grey.pollutant}"`,
    e.grey.load_kg,
    e.grey.cmax_mg_l,
    e.grey.cnat_mg_l
  ].join(",");

  return `${header}\n${row}\n`;
}

export function escapeCsvValue(value: string | number | boolean) {
  const raw = String(value);
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replace(/\"/g, '""')}"`;
  }
  return raw;
}
