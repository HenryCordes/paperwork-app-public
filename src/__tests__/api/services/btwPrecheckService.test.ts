import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../api/axiosInstance", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import axiosInstance from "../../../api/axiosInstance";
import btwPrecheckService, {
  BtwPrecheckAlreadyRunningError,
  BtwPrecheckDailyCapReachedError,
} from "../../../api/services/btwPrecheckService";
import type {
  BtwPrecheckReportResponse,
  RunBtwPrecheckResponse,
  BtwPrecheckPreferencesResponse,
} from "../../../api/types/btwPrecheck";

const mockedGet = vi.mocked(axiosInstance.get);
const mockedPost = vi.mocked(axiosInstance.post);
const mockedPut = vi.mocked(axiosInstance.put);

const makeReportResponse = (
  overrides: Partial<BtwPrecheckReportResponse["data"]> = {}
): BtwPrecheckReportResponse => ({
  success: true,
  data: {
    _id: "report-1",
    tenantId: "tenant-1",
    periodType: "quarterly",
    period: "Q2",
    year: 2026,
    status: "completed",
    trigger: "manual",
    findings: [],
    meta: { anomalyStatus: "completed" },
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  },
});

describe("btwPrecheckService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLatestReport", () => {
    it("fetches the latest report with period/year query params", async () => {
      const response = makeReportResponse();
      mockedGet.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.getLatestReport("Q2", 2026);

      expect(result).toEqual(response);
      expect(mockedGet).toHaveBeenCalledWith("/btw-precheck/latest", {
        params: { period: "Q2", year: 2026 },
      });
    });

    it("returns null when no report exists yet (404)", async () => {
      mockedGet.mockRejectedValue({ response: { status: 404 } });

      const result = await btwPrecheckService.getLatestReport("Q2", 2026);

      expect(result).toBeNull();
    });

    it("rethrows any other error", async () => {
      mockedGet.mockRejectedValue({ response: { status: 503 } });

      await expect(
        btwPrecheckService.getLatestReport("Q2", 2026)
      ).rejects.toMatchObject({ response: { status: 503 } });
    });
  });

  describe("getReport", () => {
    it("fetches a report by id", async () => {
      const response = makeReportResponse();
      mockedGet.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.getReport("report-1");

      expect(result).toEqual(response);
      expect(mockedGet).toHaveBeenCalledWith("/btw-precheck/report-1");
    });
  });

  describe("runPrecheck", () => {
    it("posts the period/year and returns the reportId", async () => {
      const response: RunBtwPrecheckResponse = {
        success: true,
        data: { reportId: "report-2", status: "running" },
      };
      mockedPost.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.runPrecheck({
        period: "Q2",
        year: 2026,
      });

      expect(result).toEqual(response);
      expect(mockedPost).toHaveBeenCalledWith("/btw-precheck/run", {
        period: "Q2",
        year: 2026,
      });
    });

    it("throws BtwPrecheckAlreadyRunningError on 409", async () => {
      mockedPost.mockRejectedValue({ response: { status: 409 } });

      await expect(
        btwPrecheckService.runPrecheck({ period: "Q2", year: 2026 })
      ).rejects.toThrow(BtwPrecheckAlreadyRunningError);
    });

    it("throws BtwPrecheckDailyCapReachedError on 429", async () => {
      mockedPost.mockRejectedValue({ response: { status: 429 } });

      await expect(
        btwPrecheckService.runPrecheck({ period: "Q2", year: 2026 })
      ).rejects.toThrow(BtwPrecheckDailyCapReachedError);
    });

    it("rethrows any other error unchanged", async () => {
      mockedPost.mockRejectedValue({ response: { status: 503 } });

      await expect(
        btwPrecheckService.runPrecheck({ period: "Q2", year: 2026 })
      ).rejects.toMatchObject({ response: { status: 503 } });
    });
  });

  describe("preferences", () => {
    it("gets preferences", async () => {
      const response: BtwPrecheckPreferencesResponse = {
        success: true,
        data: {
          _id: "pref-1",
          userId: "user-1",
          tenantId: "tenant-1",
          emailNotifications: true,
          inAppNotifications: true,
          pushNotifications: false,
          preferredLanguage: "nl",
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      };
      mockedGet.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.getPreferences();

      expect(result).toEqual(response);
      expect(mockedGet).toHaveBeenCalledWith("/btw-precheck/preferences");
    });

    it("updates preferences", async () => {
      const response: BtwPrecheckPreferencesResponse = {
        success: true,
        data: {
          _id: "pref-1",
          userId: "user-1",
          tenantId: "tenant-1",
          emailNotifications: false,
          inAppNotifications: true,
          pushNotifications: true,
          preferredLanguage: "nl",
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      };
      mockedPut.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.updatePreferences({
        emailNotifications: false,
        pushNotifications: true,
      });

      expect(result).toEqual(response);
      expect(mockedPut).toHaveBeenCalledWith("/btw-precheck/preferences", {
        emailNotifications: false,
        pushNotifications: true,
      });
    });
  });
});
