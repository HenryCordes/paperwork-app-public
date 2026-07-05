import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { renderHookWithClient, makeTestQueryClient } from "../test-utils";
import useAuth from "../../hooks/useAuth";
import authService from "../../api/services/authService";
import QueryKeys from "../../api/queryKeys";
import { LoginRequest, LoginResponse, User } from "../../api/types";

// Mock the auth service module
vi.mock("../../api/services/authService");

// Mock capacitor-secure-storage-plugin so we don't need native Capacitor in jsdom
vi.mock("capacitor-secure-storage-plugin", () => ({
  SecureStoragePlugin: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ value: null }),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock AuthContext: expose controllable state so we can verify setAuthenticated calls
const mockSetAuthenticated = vi.fn();
const mockCheckAuthentication = vi.fn(() => false);
let mockIsAuthenticated = false;

vi.mock("../../contexts/AuthContext", () => ({
  useAuthContext: () => ({
    isAuthenticated: mockIsAuthenticated,
    setAuthenticated: mockSetAuthenticated,
    checkAuthentication: mockCheckAuthentication,
    requiresManualLogin: true,
  }),
}));

const mockedAuthService = vi.mocked(authService, true);

// Realistic resolved LoginResponse matching the real type
const fakeUser: User = { id: "user-1", email: "test@example.com", name: "Test User" };
const fakeLoginResponse: LoginResponse = { token: "tok-abc", user: fakeUser };

// Realistic LoginRequest
const fakeCredentials: LoginRequest = { email: "test@example.com", password: "secret" };

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAuthenticated = false;
});

describe("useAuth — login mutation", () => {
  it("calls authService.login with the provided credentials", async () => {
    mockedAuthService.login.mockResolvedValue(fakeLoginResponse);
    const { result } = renderHookWithClient(() => useAuth());

    await act(async () => {
      await result.current.login.mutateAsync(fakeCredentials);
    });

    expect(mockedAuthService.login).toHaveBeenCalledWith(fakeCredentials);
    expect(mockedAuthService.login).toHaveBeenCalledTimes(1);
  });

  it("marks the context as authenticated on success", async () => {
    mockedAuthService.login.mockResolvedValue(fakeLoginResponse);
    const { result } = renderHookWithClient(() => useAuth());

    await act(async () => {
      await result.current.login.mutateAsync(fakeCredentials);
    });

    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
  });

  it("writes user data into the query cache on success", async () => {
    mockedAuthService.login.mockResolvedValue(fakeLoginResponse);
    // setQueryData creates this query with zero observers (nothing here
    // calls useQuery for it), so makeTestQueryClient's gcTime: 0 schedules
    // it for garbage collection on the same tick it's written. Reading it
    // back races that GC under contention. A short-lived gcTime override
    // keeps the entry around long enough for this test's own read.
    const client = makeTestQueryClient();
    client.setDefaultOptions({ queries: { retry: false, gcTime: 1000 } });
    const { result } = renderHookWithClient(() => useAuth(), { client });

    await act(async () => {
      await result.current.login.mutateAsync(fakeCredentials);
    });

    await waitFor(() => {
      const cached = client.getQueryData<User>(QueryKeys.auth.user());
      expect(cached).toEqual(fakeUser);
    });
  });

  it("invalidates the auth base query key on success", async () => {
    mockedAuthService.login.mockResolvedValue(fakeLoginResponse);
    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHookWithClient(() => useAuth(), { client });

    await act(async () => {
      await result.current.login.mutateAsync(fakeCredentials);
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.auth.base,
      })
    );
  });

  it("surfaces an error when the service rejects", async () => {
    const serviceError = new Error("Login mislukt");
    mockedAuthService.login.mockRejectedValue(serviceError);
    const { result } = renderHookWithClient(() => useAuth());

    await expect(
      act(async () => {
        await result.current.login.mutateAsync(fakeCredentials);
      })
    ).rejects.toThrow("Login mislukt");

    await waitFor(() => {
      expect(result.current.login.isError).toBe(true);
      expect(result.current.login.error?.message).toBe("Login mislukt");
    });
  });
});

describe("useAuth — logout", () => {
  it("calls authService.logout", async () => {
    mockedAuthService.logout.mockReturnValue(undefined);
    const { result } = renderHookWithClient(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockedAuthService.logout).toHaveBeenCalledTimes(1);
  });

  it("marks the context as unauthenticated", async () => {
    mockedAuthService.logout.mockReturnValue(undefined);
    const { result } = renderHookWithClient(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSetAuthenticated).toHaveBeenCalledWith(false);
  });

  it("invalidates auth and expenses query keys", async () => {
    mockedAuthService.logout.mockReturnValue(undefined);
    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHookWithClient(() => useAuth(), { client });

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.auth.base,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.expenses.base,
      });
    });
  });

  it("removes the user query data from the cache", async () => {
    mockedAuthService.logout.mockReturnValue(undefined);
    const client = makeTestQueryClient();
    // Pre-populate user cache to confirm it is removed
    client.setQueryData(QueryKeys.auth.user(), fakeUser);

    const { result } = renderHookWithClient(() => useAuth(), { client });

    await act(async () => {
      await result.current.logout();
    });

    const cached = client.getQueryData<User>(QueryKeys.auth.user());
    expect(cached).toBeUndefined();
  });
});

describe("useAuth — isAuthenticated", () => {
  it("returns false when the context says unauthenticated", () => {
    mockIsAuthenticated = false;
    const { result } = renderHookWithClient(() => useAuth());
    expect(result.current.isAuthenticated()).toBe(false);
  });

  it("returns true when the context says authenticated", () => {
    mockIsAuthenticated = true;
    const { result } = renderHookWithClient(() => useAuth());
    expect(result.current.isAuthenticated()).toBe(true);
  });
});

describe("useAuth — checkAuthentication", () => {
  it("delegates to the context's checkAuthentication and returns its value", () => {
    mockCheckAuthentication.mockReturnValue(true);
    const { result } = renderHookWithClient(() => useAuth());
    expect(result.current.checkAuthentication()).toBe(true);
    expect(mockCheckAuthentication).toHaveBeenCalledTimes(1);
  });
});

describe("useAuth — getCurrentUser", () => {
  it("returns undefined when no user is cached", () => {
    const { result } = renderHookWithClient(() => useAuth());
    expect(result.current.getCurrentUser()).toBeUndefined();
  });

  it("returns the cached user when present", () => {
    const client = makeTestQueryClient();
    client.setQueryData(QueryKeys.auth.user(), fakeUser);
    const { result } = renderHookWithClient(() => useAuth(), { client });
    expect(result.current.getCurrentUser()).toEqual(fakeUser);
  });
});
