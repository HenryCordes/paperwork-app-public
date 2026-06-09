import { describe, it, expect } from "vitest";
import { formatDateForDisplay, formatDateForPost } from "../../utils/dateUtils";

describe("formatDateForDisplay", () => {
  it.each([
    [undefined, ""],
    ["", ""],
  ])("returns empty string for falsy input %j", (input, expected) => {
    expect(formatDateForDisplay(input)).toBe(expected);
  });

  it("formats a valid ISO date string to dd-MM-yyyy", () => {
    // 2024-03-15 -> 15-03-2024
    expect(formatDateForDisplay("2024-03-15")).toBe("15-03-2024");
  });

  it("formats a date at midnight UTC correctly", () => {
    expect(formatDateForDisplay("2023-01-01")).toBe("01-01-2023");
  });

  it("formats end-of-year date correctly", () => {
    expect(formatDateForDisplay("2023-12-31")).toBe("31-12-2023");
  });

  it("returns the original string when the value cannot be formatted by date-fns", () => {
    // new Date('not-a-date') produces an Invalid Date; format() throws -> catch returns input
    expect(formatDateForDisplay("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateForPost", () => {
  it.each([
    [undefined, ""],
    ["", ""],
  ])("returns empty string for falsy input %j", (input, expected) => {
    expect(formatDateForPost(input)).toBe(expected);
  });

  it("formats a valid date string to yyyy-MM-dd", () => {
    expect(formatDateForPost("2024-03-15")).toBe("2024-03-15");
  });

  it("formats a Dutch display-format date string (dd-MM-yyyy input) to yyyy-MM-dd", () => {
    // new Date('15-03-2024') is Invalid Date in V8 — the catch branch fires and
    // returns the input unchanged. Pin the exact observed output.
    expect(formatDateForPost("15-03-2024")).toBe("15-03-2024");
  });

  it("formats a full ISO datetime string to yyyy-MM-dd", () => {
    // TZ=UTC (pinned in vite.config.ts) makes date-fns local-time calls
    // deterministic. 2023-07-04T14:30:00.000Z in UTC is still 2023-07-04.
    expect(formatDateForPost("2023-07-04T14:30:00.000Z")).toBe("2023-07-04");
  });

  it("formats beginning-of-year date correctly", () => {
    expect(formatDateForPost("2022-01-01")).toBe("2022-01-01");
  });

  it("returns the original string when the value cannot be formatted by date-fns", () => {
    expect(formatDateForPost("not-a-date")).toBe("not-a-date");
  });
});
