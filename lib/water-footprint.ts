import { z } from "zod";

export const greyInputSchema = z.object({
  enabled: z.boolean().default(false),
  pollutant: z.string().trim().default(""),
  load_kg: z.coerce.number().finite().nonnegative().default(0),
  cmax_mg_l: z.coerce.number().finite().nonnegative().default(0),
  cnat_mg_l: z.coerce.number().finite().nonnegative().optional()
});

export const studySchema = z.object({
  production_total_kg: z.coerce.number().finite().positive(),
  blue_m3: z.coerce.number().finite().nonnegative(),
  green_m3: z.coerce.number().finite().nonnegative(),
  grey: greyInputSchema
});

export type StudyInput = z.infer<typeof studySchema>;

export type ValidationIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type ValidatedStudy = StudyInput & {
  grey: StudyInput["grey"] & { cnat_mg_l: number };
};

export type WaterFootprintResult = {
  blue_l_per_kg: number;
  green_l_per_kg: number;
  grey_l_per_kg: number;
  total_l_per_kg: number;
  blue_m3_total: number;
  green_m3_total: number;
  grey_m3_total: number;
  total_m3: number;
};

export const tomatoGreenhouseExample: ValidatedStudy = {
  production_total_kg: 10000,
  blue_m3: 5500,
  green_m3: 2200,
  grey: {
    enabled: true,
    pollutant: "Nitratos (NO3-)",
    load_kg: 12,
    cmax_mg_l: 50,
    cnat_mg_l: 5
  }
};

function round(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function validateAndNormalizeStudy(input: unknown): {
  data: ValidatedStudy | null;
  issues: ValidationIssue[];
} {
  const parsed = studySchema.safeParse(input);

  if (!parsed.success) {
    const issues: ValidationIssue[] = parsed.error.issues.map((issue) => ({
      field: issue.path.join(".") || "study",
      message: issue.message,
      severity: "error"
    }));

    return { data: null, issues };
  }

  const data = parsed.data;
  const issues: ValidationIssue[] = [];

  let cnat = data.grey.cnat_mg_l;
  if (cnat === undefined) {
    cnat = 0;
    if (data.grey.enabled) {
      issues.push({
        field: "grey.cnat_mg_l",
        message:
          "Cnat no informado. Se aplica valor por defecto de 0 mg/L (revisalo para no infra/sobreestimar la componente gris).",
        severity: "warning"
      });
    }
  }

  if (data.grey.enabled) {
    if (!data.grey.pollutant.trim()) {
      issues.push({
        field: "grey.pollutant",
        message: "Debes indicar el contaminante principal para la huella gris.",
        severity: "error"
      });
    }

    if (data.grey.load_kg <= 0) {
      issues.push({
        field: "grey.load_kg",
        message: "La carga contaminante (kg) debe ser mayor que 0 cuando gris esta habilitada.",
        severity: "error"
      });
    }

    if (data.grey.cmax_mg_l <= 0) {
      issues.push({
        field: "grey.cmax_mg_l",
        message: "Cmax (mg/L) debe ser mayor que 0 cuando gris esta habilitada.",
        severity: "error"
      });
    }

    if (data.grey.cmax_mg_l <= cnat) {
      issues.push({
        field: "grey.cmax_mg_l",
        message: "Cmax debe ser estrictamente mayor que Cnat para calcular la huella gris.",
        severity: "error"
      });
    }
  }

  return {
    data: {
      ...data,
      grey: {
        ...data.grey,
        cnat_mg_l: cnat
      }
    },
    issues
  };
}

export function calculateWaterFootprint(study: ValidatedStudy): WaterFootprintResult {
  const blue_l_per_kg = (study.blue_m3 * 1000) / study.production_total_kg;
  const green_l_per_kg = (study.green_m3 * 1000) / study.production_total_kg;

  let grey_m3_total = 0;
  let grey_l_per_kg = 0;

  if (study.grey.enabled) {
    const concentrationGap = study.grey.cmax_mg_l - study.grey.cnat_mg_l;

    // Manual WFA: V_grey = L / (Cmax - Cnat). L in mg and concentration in mg/L => volume in L.
    const grey_l_total = (study.grey.load_kg * 1_000_000) / concentrationGap;
    grey_m3_total = grey_l_total / 1000;
    grey_l_per_kg = grey_l_total / study.production_total_kg;
  }

  const total_l_per_kg = blue_l_per_kg + green_l_per_kg + grey_l_per_kg;
  const total_m3 = study.blue_m3 + study.green_m3 + grey_m3_total;

  return {
    blue_l_per_kg: round(blue_l_per_kg),
    green_l_per_kg: round(green_l_per_kg),
    grey_l_per_kg: round(grey_l_per_kg),
    total_l_per_kg: round(total_l_per_kg),
    blue_m3_total: round(study.blue_m3),
    green_m3_total: round(study.green_m3),
    grey_m3_total: round(grey_m3_total),
    total_m3: round(total_m3)
  };
}

export function hasBlockingErrors(issues: ValidationIssue[]) {
  return issues.some((issue) => issue.severity === "error");
}
