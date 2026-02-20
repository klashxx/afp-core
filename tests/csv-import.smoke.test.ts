import { describe, expect, it } from "vitest";

import { validateCsvStudy } from "../lib/csv";

describe("validateCsvStudy smoke", () => {
  it("validates template-like CSV and provides preview", () => {
    const csv = [
      "production_total_kg,blue_m3,green_m3,grey_enabled,grey_pollutant,grey_load_kg,grey_cmax_mg_l,grey_cnat_mg_l",
      "10000,5500,2200,true,Nitratos,12,50,"
    ].join("\n");

    const result = validateCsvStudy(csv);

    expect(result.ok).toBe(true);
    expect(result.preview).not.toBeNull();
    expect(result.issues.some((issue) => issue.field === "grey.cnat_mg_l" && issue.severity === "warning")).toBe(
      true
    );
  });
});
