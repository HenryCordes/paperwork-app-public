import { describe, it, expect } from "vitest";
import { getCurrentReviewPeriod } from "../../utils/btwPeriodUtils";

describe("getCurrentReviewPeriod", () => {
  it("in July reviews Q2 of the same year", () => {
    expect(getCurrentReviewPeriod(new Date(2026, 6, 10))).toEqual({
      period: "Q2",
      year: 2026,
    });
  });

  it("in January reviews Q4 of the previous year", () => {
    expect(getCurrentReviewPeriod(new Date(2026, 0, 15))).toEqual({
      period: "Q4",
      year: 2025,
    });
  });

  it("in May reviews Q1 of the same year", () => {
    expect(getCurrentReviewPeriod(new Date(2026, 4, 5))).toEqual({
      period: "Q1",
      year: 2026,
    });
  });

  it("in October reviews Q3 of the same year", () => {
    expect(getCurrentReviewPeriod(new Date(2026, 9, 1))).toEqual({
      period: "Q3",
      year: 2026,
    });
  });

  it("defaults to the current date when no argument is given", () => {
    const result = getCurrentReviewPeriod();
    expect(["Q1", "Q2", "Q3", "Q4"]).toContain(result.period);
    expect(typeof result.year).toBe("number");
  });
});
