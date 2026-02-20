import { describe, expect, it } from "vitest";

import {
  calculateWaterFootprint,
  tomatoGreenhouseExample,
  validateAndNormalizeStudy
} from "../lib/water-footprint";

describe("calculateWaterFootprint smoke", () => {
  it("computes blue, green, grey and total in L/kg", () => {
    const result = calculateWaterFootprint(tomatoGreenhouseExample);

    expect(result.blue_l_per_kg).toBe(550);
    expect(result.green_l_per_kg).toBe(220);
    expect(result.grey_l_per_kg).toBe(26.667);
    expect(result.total_l_per_kg).toBe(796.667);
  });

  it("warns when cnat is omitted and defaults to zero", () => {
    const validation = validateAndNormalizeStudy({
      production_total_kg: 1000,
      blue_m3: 100,
      green_m3: 50,
      grey: {
        enabled: true,
        pollutant: "Nitratos",
        load_kg: 1,
        cmax_mg_l: 10
      }
    });

    expect(validation.data?.grey.cnat_mg_l).toBe(0);
    expect(validation.issues.some((issue) => issue.field === "grey.cnat_mg_l" && issue.severity === "warning")).toBe(
      true
    );
  });
});
