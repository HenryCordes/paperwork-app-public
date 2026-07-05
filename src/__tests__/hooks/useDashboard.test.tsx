import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient, makeTestQueryClient } from "../test-utils";
import { useDashboardStats, DASHBOARD_STATS_KEY } from "../../hooks/useDashboard";
import dashboardService from "../../api/services/dashboardService";
import type {
  DashboardStatsResponse,
  RawDataPoint,
  PeriodInfo,
} from "../../api/types/dashboard";

vi.mock("../../api/services/dashboardService");

const mockedService = vi.mocked(dashboardService, true);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

const makeRawDataPoint = (period: string): RawDataPoint => ({
  period,
  periodKey: period,
  periodType: "monthly",
  totalRevenue: 1000,
  paidRevenue: 800,
  invoiceCount: 5,
  taxCollected: 200,
  totalExpenses: 400,
  expenseCount: 3,
  taxPaid: 80,
  netProfit: 600,
});

const makePeriodInfo = (): PeriodInfo => ({
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  groupingLevel: "monthly",
});

const makeSuccessResponse = (): DashboardStatsResponse => ({
  success: true,
  data: {
    labels: ["Jan", "Feb"],
    turnover: [1000, 1200],
    expenses: [400, 500],
    rawData: [makeRawDataPoint("Jan"), makeRawDataPoint("Feb")],
  },
  source: "pre-calculated",
  periodInfo: makePeriodInfo(),
  summary: {
    totalRevenue: 2200,
    paidRevenue: 1800,
    unpaidRevenue: 400,
    totalExpenses: 900,
    paidExpenses: 700,
    unpaidExpenses: 200,
    netProfit: 1300,
    invoiceCount: 10,
    expenseCount: 6,
  },
  revenueByCategory: [{ category: "Consulting", amount: 2200, percentage: 100 }],
  expensesByCategory: [{ category: "Software", amount: 900, percentage: 100 }],
});

// ---------------------------------------------------------------------------
// useDashboardStats — query tests
// ---------------------------------------------------------------------------

describe("useDashboardStats", () => {
  describe("called with no params (defaults)", () => {
    it("returns the data the service resolves and calls service with an empty params object", async () => {
      const response = makeSuccessResponse();
      mockedService.getDashboardStats.mockResolvedValue(response as never);

      const { result } = renderHookWithClient(() => useDashboardStats());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(response);
      // Hook builds params by only setting truthy keys; with no args params = {}
      expect(mockedService.getDashboardStats).toHaveBeenCalledWith({});
    });

    it("exposes isLoading=true before the service resolves", () => {
      // Never-resolving promise keeps hook in loading state
      mockedService.getDashboardStats.mockReturnValue(new Promise(() => {}) as never);

      const { result } = renderHookWithClient(() => useDashboardStats());

      expect(result.current.isLoading).toBe(true);
    });

    it("exposes isError=true when the service rejects", async () => {
      mockedService.getDashboardStats.mockRejectedValue(new Error("network error"));

      const { result } = renderHookWithClient(() => useDashboardStats());

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("called with specific params", () => {
    const cases: Array<{
      label: string;
      params: Parameters<typeof useDashboardStats>[0];
      expectedServiceArgs: Record<string, string>;
    }> = [
      {
        label: "periodType only",
        params: { periodType: "monthly" },
        expectedServiceArgs: { periodType: "monthly" },
      },
      {
        label: "periodPreset only",
        params: { periodPreset: "last-3-months" },
        expectedServiceArgs: { periodPreset: "last-3-months" },
      },
      {
        label: "year only",
        params: { year: "2024" },
        expectedServiceArgs: { year: "2024" },
      },
      {
        label: "custom date range",
        params: { periodPreset: "custom", startDate: "2024-01-01", endDate: "2024-06-30" },
        expectedServiceArgs: {
          periodPreset: "custom",
          startDate: "2024-01-01",
          endDate: "2024-06-30",
        },
      },
      {
        label: "all params supplied",
        params: {
          periodType: "yearly",
          periodPreset: "this-year",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
        },
        expectedServiceArgs: {
          periodType: "yearly",
          periodPreset: "this-year",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
        },
      },
    ];

    it.each(cases)(
      "passes only the supplied params to the service ($label)",
      async ({ params, expectedServiceArgs }) => {
        const response = makeSuccessResponse();
        mockedService.getDashboardStats.mockResolvedValue(response as never);

        const { result } = renderHookWithClient(() => useDashboardStats(params));

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mockedService.getDashboardStats).toHaveBeenCalledWith(expectedServiceArgs);
      }
    );

    it("surfaces the resolved data correctly for a parameterised call", async () => {
      const response = makeSuccessResponse();
      mockedService.getDashboardStats.mockResolvedValue(response as never);

      const { result } = renderHookWithClient(() =>
        useDashboardStats({ periodPreset: "last-12-months" })
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(response);
    });
  });

  describe("queryKey shape", () => {
    it("uses DASHBOARD_STATS_KEY as the first segment and the params object as the second", async () => {
      const response = makeSuccessResponse();
      mockedService.getDashboardStats.mockResolvedValue(response as never);

      // Verify the exported constant itself has the expected value so that
      // any consumer building a manual invalidation key can rely on it.
      expect(DASHBOARD_STATS_KEY).toBe("dashboardStats");

      const client = makeTestQueryClient();
      const { result } = renderHookWithClient(
        () => useDashboardStats({ periodType: "monthly" }),
        { client }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert the REAL runtime query key stored in the QueryClient cache,
      // not just the constant. This confirms the hook wires the key correctly.
      const queries = client.getQueryCache().getAll();
      expect(queries).toHaveLength(1);
      expect(queries[0].queryKey).toEqual([
        DASHBOARD_STATS_KEY,
        { periodType: "monthly" },
      ]);
    });
  });

  describe("undefined/falsy params are excluded from the service call", () => {
    it("does not forward undefined values", async () => {
      const response = makeSuccessResponse();
      mockedService.getDashboardStats.mockResolvedValue(response as never);

      const { result } = renderHookWithClient(() =>
        useDashboardStats({ periodType: undefined, year: "2024" })
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // periodType was undefined so it should not appear in the call args
      expect(mockedService.getDashboardStats).toHaveBeenCalledWith({ year: "2024" });
    });
  });
});
