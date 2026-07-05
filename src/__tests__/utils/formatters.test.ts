import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatPercentage } from "../../utils/formatters";

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  // nl-NL / EUR uses a period as thousands separator and a comma as decimal
  // separator. ICU may insert a non-breaking space (U+00A0) between the
  // currency symbol and the number, so we use toContain / regex rather than
  // strict equality.

  it.each([
    [0, "0,00"],
    [1, "1,00"],
    [1234.56, "1.234,56"],
    [-99.9, "-99,90"],
    [1000000, "1.000.000,00"],
  ])("formats %j (nl-NL/EUR) to contain %j", (value, fragment) => {
    expect(formatCurrency(value)).toContain(fragment);
  });

  it("includes the EUR symbol", () => {
    expect(formatCurrency(10)).toMatch(/€/);
  });

  it("respects a custom locale (en-US)", () => {
    // en-US formats 1234.56 as $1,234.56
    const result = formatCurrency(1234.56, "en-US", "USD");
    expect(result).toContain("1,234.56");
    expect(result).toMatch(/\$/);
  });

  it("respects a custom currency (GBP)", () => {
    const result = formatCurrency(10, "en-GB", "GBP");
    expect(result).toContain("10.00");
    expect(result).toMatch(/£/);
  });

  it("formats negative values correctly", () => {
    const result = formatCurrency(-1234.56);
    expect(result).toContain("1.234,56");
    // Negative sign (may be a minus or an en-dash depending on ICU version)
    expect(result).toMatch(/[-−]/);
  });

  it("always shows exactly two decimal places", () => {
    // 1.1 -> "1,10", 1.005 -> "1,01" (rounding behaviour)
    expect(formatCurrency(1.1)).toContain("1,10");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

// FIXME(tz): formatDate uses local-time getMonth()/getFullYear() on UTC-parsed
// ISO dates; quarterly/yearly results are wrong in timezones west of UTC (the
// Date object shifts to the previous calendar day). Tests are pinned to TZ=UTC
// (set in vite.config.ts env.TZ) to keep them deterministic. Tracked for
// source fix (use date-fns parseISO + UTC-safe helpers instead of new Date()).
describe("formatDate", () => {
  describe("quarterly", () => {
    it.each([
      ["2024-01-15", "Q1 2024"],
      ["2024-04-01", "Q2 2024"],
      ["2024-07-31", "Q3 2024"],
      ["2024-10-10", "Q4 2024"],
      ["2023-12-31", "Q4 2023"],
    ])("formats %j -> %j", (dateString, expected) => {
      expect(formatDate(dateString, "quarterly")).toBe(expected);
    });

    it("handles first day of year (boundary)", () => {
      expect(formatDate("2024-01-01", "quarterly")).toBe("Q1 2024");
    });
  });

  describe("yearly", () => {
    it.each([
      ["2024-06-15", "2024"],
      ["2000-01-01", "2000"],
      ["1999-12-31", "1999"],
    ])("formats %j -> %j", (dateString, expected) => {
      expect(formatDate(dateString, "yearly")).toBe(expected);
    });
  });

  describe("daily", () => {
    // nl-NL daily: "15 jun." or "15 jun" depending on ICU — use regex
    it("includes the two-digit day", () => {
      expect(formatDate("2024-06-15", "daily")).toMatch(/15/);
    });

    it("includes an abbreviated month token", () => {
      // 'jun' is the nl-NL abbreviation for June in most ICU versions
      expect(formatDate("2024-06-15", "daily")).toMatch(/jun/i);
    });

    it("does not include a year", () => {
      const result = formatDate("2024-06-15", "daily");
      expect(result).not.toContain("2024");
    });
  });

  describe("monthly", () => {
    // nl-NL monthly: "jun. 2024" or "jun 2024"
    it("includes an abbreviated month token", () => {
      expect(formatDate("2024-06-15", "monthly")).toMatch(/jun/i);
    });

    it("includes the year", () => {
      expect(formatDate("2024-06-15", "monthly")).toContain("2024");
    });

    it("does not include the day", () => {
      const result = formatDate("2024-06-15", "monthly");
      // "15" should not appear as a standalone number in a monthly format
      expect(result).not.toMatch(/\b15\b/);
    });
  });

  describe("quarter boundary edge cases", () => {
    it("March is still Q1", () => {
      expect(formatDate("2024-03-31", "quarterly")).toBe("Q1 2024");
    });

    it("April is Q2", () => {
      expect(formatDate("2024-04-01", "quarterly")).toBe("Q2 2024");
    });

    it("September is Q3", () => {
      expect(formatDate("2024-09-30", "quarterly")).toBe("Q3 2024");
    });

    it("October is Q4", () => {
      expect(formatDate("2024-10-01", "quarterly")).toBe("Q4 2024");
    });
  });
});

// ---------------------------------------------------------------------------
// formatPercentage
// ---------------------------------------------------------------------------

describe("formatPercentage", () => {
  // nl-NL percent uses a comma as decimal separator and a non-breaking space
  // before the % sign. Assert with toContain / regex.

  it.each([
    [0, "0,0"],
    [0.5, "50,0"],
    [1, "100,0"],
    [0.123, "12,3"],
    [0.999, "99,9"],
    [0.1234, "12,3"],
  ])("formats %j -> contains %j", (value, fragment) => {
    expect(formatPercentage(value)).toContain(fragment);
  });

  it("includes a percent sign", () => {
    expect(formatPercentage(0.5)).toContain("%");
  });

  it("always shows exactly one decimal place", () => {
    // 0.1 -> "10,0%", not "10%"
    expect(formatPercentage(0.1)).toMatch(/10,0/);
  });

  it("handles zero", () => {
    expect(formatPercentage(0)).toContain("0,0");
  });

  it("handles negative values", () => {
    const result = formatPercentage(-0.05);
    expect(result).toContain("5,0");
    expect(result).toMatch(/[-−]/);
  });

  it("handles values greater than 1", () => {
    // 1.5 -> "150,0%"
    expect(formatPercentage(1.5)).toContain("150,0");
  });
});
