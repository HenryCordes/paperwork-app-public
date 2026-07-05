import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient, makeTestQueryClient } from "../test-utils";
import {
  useTaxPeriods,
  useTaxSummary,
  useTaxDeadline,
  useExportTaxReturn,
} from "../../hooks/useTaxes";
import taxesService from "../../api/services/taxesService";
import QueryKeys from "../../api/queryKeys";
import type {
  TaxPeriodsResponse,
  TaxSummaryResponse,
  TaxDeadlineResponse,
  TaxSummaryRequest,
  TaxExportRequest,
} from "../../api/types/taxes";

// ---------------------------------------------------------------------------
// Module mocks — declared before imports of the modules under test.
// ---------------------------------------------------------------------------

vi.mock("../../api/services/taxesService");

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
    getPlatform: vi.fn().mockReturnValue("web"),
  },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  Directory: {
    Documents: "DOCUMENTS",
  },
}));

vi.mock("../../utils/fileUtils", () => ({
  blobToBase64: vi.fn().mockResolvedValue("base64encodeddata"),
}));

// ---------------------------------------------------------------------------
// Imports of mocked modules so we can drive them from tests.
// ---------------------------------------------------------------------------

import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

const makePeriodsResponse = (): TaxPeriodsResponse => ({
  success: true,
  data: {
    periodTypes: [
      { value: "quarterly", label: "Kwartaal" },
      { value: "monthly", label: "Maandelijks" },
      { value: "yearly", label: "Jaarlijks" },
    ],
    periods: {
      monthly: [{ value: "01", label: "Januari" }],
      quarterly: [{ value: "Q1", label: "Q1" }],
      yearly: [{ value: 2024, label: "2024" }],
    },
    years: [2024, 2023],
  },
});

const makeSummaryResponse = (): TaxSummaryResponse => ({
  success: true,
  data: {
    period: {
      type: "quarterly",
      period: "Q1",
      year: 2024,
      dateRange: { start: "2024-01-01", end: "2024-03-31" },
    },
    omzet: {
      hoogTarief21: { basis: 1000, btw: 210 },
      laagTarief9: { basis: 0, btw: 0 },
      laagsteTarief6: { basis: 0, btw: 0 },
      overige: { basis: 0, btw: 0 },
    },
    voorbelasting: { totaal: 50 },
    teBetalen: 160,
    invoiceCount: 5,
    expenseCount: 3,
  },
});

const makeDeadlineResponse = (): TaxDeadlineResponse => ({
  success: true,
  data: {
    deadline: "2024-04-30",
    label: "30 april 2024",
    daysUntilDeadline: 14,
    periodType: "quarterly",
  },
});

const mockedService = vi.mocked(taxesService, true);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: web platform (non-native) so export path is predictable.
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// useTaxPeriods
// ---------------------------------------------------------------------------

describe("useTaxPeriods", () => {
  it("returns the data the service resolves", async () => {
    const response = makePeriodsResponse();
    mockedService.getTaxPeriods.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() => useTaxPeriods());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(mockedService.getTaxPeriods).toHaveBeenCalledOnce();
  });

  it("uses the correct query key", async () => {
    const response = makePeriodsResponse();
    mockedService.getTaxPeriods.mockResolvedValue(response as never);

    const client = makeTestQueryClient();
    renderHookWithClient(() => useTaxPeriods(), { client });

    await waitFor(() =>
      expect(
        client.getQueryState(QueryKeys.taxes.periods())?.status
      ).toBe("success")
    );
  });
});

// ---------------------------------------------------------------------------
// useTaxSummary
// ---------------------------------------------------------------------------

describe("useTaxSummary", () => {
  const params: TaxSummaryRequest = { periodType: "quarterly", period: "Q1", year: 2024 };

  it("fetches and returns summary data when params are valid and enabled", async () => {
    const response = makeSummaryResponse();
    mockedService.getTaxSummary.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() => useTaxSummary(params));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(mockedService.getTaxSummary).toHaveBeenCalledWith(params);
  });

  it("is disabled and does not call the service when period is empty", () => {
    const { result } = renderHookWithClient(() =>
      useTaxSummary({ ...params, period: "" })
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedService.getTaxSummary).not.toHaveBeenCalled();
  });

  it("is disabled when the enabled flag is explicitly false", () => {
    const { result } = renderHookWithClient(() =>
      useTaxSummary(params, false)
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedService.getTaxSummary).not.toHaveBeenCalled();
  });

  it("uses the correct query key including params", async () => {
    const response = makeSummaryResponse();
    mockedService.getTaxSummary.mockResolvedValue(response as never);

    const client = makeTestQueryClient();
    renderHookWithClient(() => useTaxSummary(params), { client });

    await waitFor(() =>
      expect(
        client.getQueryState(QueryKeys.taxes.summary(params))?.status
      ).toBe("success")
    );
  });
});

// ---------------------------------------------------------------------------
// useTaxDeadline
// ---------------------------------------------------------------------------

describe("useTaxDeadline", () => {
  it("fetches deadline with default periodType 'quarterly'", async () => {
    const response = makeDeadlineResponse();
    mockedService.getNextDeadline.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() => useTaxDeadline());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(mockedService.getNextDeadline).toHaveBeenCalledWith("quarterly");
  });

  it.each([
    ["monthly" as const],
    ["quarterly" as const],
    ["yearly" as const],
  ])("calls the service with periodType '%s'", async (periodType) => {
    const response: TaxDeadlineResponse = {
      success: true,
      data: {
        deadline: "2024-12-31",
        label: "31 december 2024",
        daysUntilDeadline: 60,
        periodType,
      },
    };
    mockedService.getNextDeadline.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() => useTaxDeadline(periodType));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.getNextDeadline).toHaveBeenCalledWith(periodType);
  });
});

// ---------------------------------------------------------------------------
// useExportTaxReturn
// ---------------------------------------------------------------------------

describe("useExportTaxReturn", () => {
  const makeExportParams = (overrides: Partial<TaxExportRequest> = {}): TaxExportRequest => ({
    periodType: "quarterly",
    period: "Q1",
    year: 2024,
    format: "excel",
    includeDetails: true,
    ...overrides,
  });

  it("calls exportTaxReturn and triggers browser download on web (non-native) platform", async () => {
    const blob = new Blob(["data"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    mockedService.exportTaxReturn.mockResolvedValue(blob as never);

    const mockUrl = "blob:http://localhost/fake-url";
    const createObjectURL = vi.fn().mockReturnValue(mockUrl);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    const params = makeExportParams();
    const { result } = renderHookWithClient(() => useExportTaxReturn());

    const mutationResult = await result.current.mutateAsync(params);

    expect(mockedService.exportTaxReturn).toHaveBeenCalledWith(params);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(mutationResult).toEqual({ success: true, message: "Bestand gedownload" });

    vi.unstubAllGlobals();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it.each([
    ["excel" as const, "quarterly" as const, "Q2", 2023, "btw-export-quarterly-Q2-2023.xlsx"],
    ["csv" as const, "monthly" as const, "01", 2024, "btw-export-monthly-01-2024.csv"],
  ])(
    "builds the correct filename for %s format (%s %s %s)",
    async (format, periodType, period, year, expectedFileName) => {
      const blob = new Blob(["data"]);
      mockedService.exportTaxReturn.mockResolvedValue(blob as never);

      // Capture the anchor element before appendChild mutates it in the DOM.
      let capturedAnchor: { download?: string; href?: string; click?: () => void } | null = null;
      const createElementOrig = document.createElement.bind(document);
      const createElementSpy = vi
        .spyOn(document, "createElement")
        .mockImplementation((tag: string) => {
          const el = createElementOrig(tag);
          if (tag === "a") {
            capturedAnchor = el as HTMLAnchorElement;
          }
          return el;
        });

      vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:fake"), revokeObjectURL: vi.fn() });
      vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
      vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

      const params = makeExportParams({ periodType, period, year, format });
      const { result } = renderHookWithClient(() => useExportTaxReturn());
      await result.current.mutateAsync(params);

      expect((capturedAnchor as HTMLAnchorElement | null)?.getAttribute("download")).toBe(expectedFileName);

      vi.unstubAllGlobals();
      createElementSpy.mockRestore();
    }
  );

  it("writes file to Filesystem and returns iOS message on native iOS platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");

    const blob = new Blob(["data"]);
    mockedService.exportTaxReturn.mockResolvedValue(blob as never);

    const params = makeExportParams({ periodType: "quarterly", period: "Q1", year: 2024, format: "excel" });
    const { result } = renderHookWithClient(() => useExportTaxReturn());
    const mutationResult = await result.current.mutateAsync(params);

    expect(vi.mocked(Filesystem.writeFile)).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "BTW aangifte/btw-export-quarterly-Q1-2024.xlsx",
        data: "base64encodeddata",
      })
    );
    expect(mutationResult).toEqual({
      success: true,
      message: "Bestand opgeslagen in Bestanden > Op mijn iPhone > Paperwork > BTW aangifte",
    });
  });

  it("writes file to Filesystem and returns Android message on native Android platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");

    const blob = new Blob(["data"]);
    mockedService.exportTaxReturn.mockResolvedValue(blob as never);

    const params = makeExportParams({ periodType: "monthly", period: "03", year: 2024, format: "csv" });
    const { result } = renderHookWithClient(() => useExportTaxReturn());
    const mutationResult = await result.current.mutateAsync(params);

    expect(vi.mocked(Filesystem.writeFile)).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "BTW aangifte/btw-export-monthly-03-2024.csv",
        data: "base64encodeddata",
      })
    );
    expect(mutationResult).toEqual({
      success: true,
      message: "Bestand opgeslagen in Documenten > BTW aangifte",
    });
  });

  it("continues successfully even when Filesystem.mkdir throws (folder already exists)", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    vi.mocked(Filesystem.mkdir).mockRejectedValueOnce(new Error("Directory exists"));

    const blob = new Blob(["data"]);
    mockedService.exportTaxReturn.mockResolvedValue(blob as never);

    const params = makeExportParams();
    const { result } = renderHookWithClient(() => useExportTaxReturn());

    // Should not throw — the hook catches mkdir errors
    await expect(result.current.mutateAsync(params)).resolves.toEqual(
      expect.objectContaining({ success: true })
    );
    expect(vi.mocked(Filesystem.writeFile)).toHaveBeenCalled();
  });
});
