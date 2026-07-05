import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient } from "../test-utils";
import useProfile from "../../hooks/useProfile";
import authService from "../../api/services/authService";
import QueryKeys from "../../api/queryKeys";
import { UserProfile } from "../../api/types";

vi.mock("../../api/services/authService");

const mockedService = vi.mocked(authService, true);

const profile: UserProfile = {
  _id: "u1",
  name: "Jane Doe",
  companyName: "Acme BV",
  email: "jane@acme.nl",
  role: "admin",
  organization: "org-1",
  createdAt: "2024-01-01T00:00:00.000Z",
  __v: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useProfile — enabled guard", () => {
  it("does not call getProfile when the user is not authenticated", async () => {
    mockedService.isAuthenticated.mockReturnValue(false);
    mockedService.getProfile.mockResolvedValue(profile);

    const { result } = renderHookWithClient(() => useProfile());

    // The query is disabled, so it stays in 'pending' with fetchStatus 'idle'
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    expect(mockedService.getProfile).not.toHaveBeenCalled();
  });

  it("calls getProfile and surfaces data when the user is authenticated", async () => {
    mockedService.isAuthenticated.mockReturnValue(true);
    mockedService.getProfile.mockResolvedValue(profile);

    const { result } = renderHookWithClient(() => useProfile());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(profile);
    expect(mockedService.getProfile).toHaveBeenCalledOnce();
    // getProfile takes no arguments
    expect(mockedService.getProfile).toHaveBeenCalledWith();
  });
});

describe("useProfile — query key", () => {
  it("uses QueryKeys.auth.profile() as the query key", async () => {
    mockedService.isAuthenticated.mockReturnValue(true);
    mockedService.getProfile.mockResolvedValue(profile);

    const { result } = renderHookWithClient(() => useProfile());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Confirm the key is what the rest of the app expects
    expect(QueryKeys.auth.profile()).toEqual(["auth", "profile"]);
  });
});

describe("useProfile — error branch", () => {
  it("surfaces an error when getProfile rejects", async () => {
    mockedService.isAuthenticated.mockReturnValue(true);
    mockedService.getProfile.mockRejectedValue(
      new Error("Kon profielgegevens niet ophalen")
    );

    const { result } = renderHookWithClient(() => useProfile());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(
      "Kon profielgegevens niet ophalen"
    );
    expect(result.current.data).toBeUndefined();
  });
});
