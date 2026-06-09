import { describe, it, expect } from "vitest";
import {
  detectDecimalSeparator,
  parseNumberFromString,
  isLikelySuspiciouslyRound,
} from "../../utils/numberUtils";

describe("detectDecimalSeparator", () => {
  it.each([
    ["", null],
    ["123,45", ","],
    ["123.45", "."],
  ])("detects separator in %j -> %j", (input, expected) => {
    expect(detectDecimalSeparator(input)).toBe(expected);
  });

  it("defaults to comma (Dutch) when ambiguous", () => {
    expect(detectDecimalSeparator("abc")).toBe(",");
  });
});

describe("parseNumberFromString", () => {
  it("parses Dutch format with thousands separators", () => {
    expect(parseNumberFromString("1.234,56")).toBe(1234.56);
  });

  it("strips a euro sign and whitespace", () => {
    expect(parseNumberFromString("€ 12,34")).toBe(12.34);
  });

  it("parses English format when preferDutchFormat is false", () => {
    expect(parseNumberFromString("1,234.56", false)).toBe(1234.56);
  });

  it("returns null for non-string / empty input", () => {
    expect(parseNumberFromString("")).toBeNull();
  });
});

describe("isLikelySuspiciouslyRound", () => {
  it.each([
    [10, true],
    [4, false],
    [12.5, false],
  ])("flags %j -> %j", (value, expected) => {
    expect(isLikelySuspiciouslyRound(value)).toBe(expected);
  });
});
