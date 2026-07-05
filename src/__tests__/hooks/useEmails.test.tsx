import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient, makeTestQueryClient } from "../test-utils";
import {
  useEmailsList,
  useEmailById,
  useCreateOrUpdateEmail,
  useDeleteEmail,
  useSendEmail,
} from "../../hooks/useEmails";
import emailsService from "../../api/services/emailsService";
import QueryKeys from "../../api/queryKeys";
import type {
  EmailsResponse,
  EmailDetailResponse,
  EmailCreateUpdateRequest,
} from "../../api/types/emails";

vi.mock("../../api/services/emailsService");

const mockedService = vi.mocked(emailsService, true);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeEmail = (id: string) => ({
  _id: id,
  send: false,
  emailDate: "2024-01-01T00:00:00.000Z",
  subject: "Test subject",
  body: "Test body",
  contactId: "c1",
  contactName: "Test Contact",
  contactEmail: "test@example.com",
  owner: "owner1",
  createdAt: "2024-01-01T00:00:00.000Z",
  tenantId: "tenant1",
  emailNumber: 1,
});

const emailsListResponse: EmailsResponse = {
  success: true,
  data: {
    docs: [makeEmail("email1"), makeEmail("email2")],
    totalDocs: 2,
    offset: 0,
    limit: 10,
    totalPages: 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  },
};

const emailDetailResponse: EmailDetailResponse = {
  success: true,
  data: makeEmail("email1"),
};

const emailPayload: EmailCreateUpdateRequest = {
  send: false,
  emailDate: "2024-01-01T00:00:00.000Z",
  subject: "Test subject",
  body: "Test body",
  contactId: "c1",
  contactName: "Test Contact",
  contactEmail: "test@example.com",
  emailNumber: 1,
};

// ---------------------------------------------------------------------------
// useEmailsList
// ---------------------------------------------------------------------------

describe("useEmailsList", () => {
  it("returns the data the service resolves with default offset", async () => {
    mockedService.getEmails.mockResolvedValue(emailsListResponse as never);

    const { result } = renderHookWithClient(() => useEmailsList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(emailsListResponse);
    expect(mockedService.getEmails).toHaveBeenCalledWith({ offset: 0 });
  });

  it("passes custom offset to the service", async () => {
    mockedService.getEmails.mockResolvedValue(emailsListResponse as never);

    const { result } = renderHookWithClient(() =>
      useEmailsList({ offset: 20 })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedService.getEmails).toHaveBeenCalledWith({ offset: 20 });
  });

  it("surfaces an error when the service rejects", async () => {
    mockedService.getEmails.mockRejectedValue(
      new Error("Fout bij ophalen emails") as never
    );

    const { result } = renderHookWithClient(() => useEmailsList());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(
      "Fout bij ophalen emails"
    );
  });
});

// ---------------------------------------------------------------------------
// useEmailById
// ---------------------------------------------------------------------------

describe("useEmailById", () => {
  it("returns the email when given a valid id", async () => {
    mockedService.getEmailById.mockResolvedValue(emailDetailResponse as never);

    const { result } = renderHookWithClient(() => useEmailById("email1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(emailDetailResponse);
    expect(mockedService.getEmailById).toHaveBeenCalledWith("email1");
  });

  it("is disabled and never calls the service when id is undefined", async () => {
    const { result } = renderHookWithClient(() => useEmailById(undefined));

    // Query is disabled — stays in pending/idle, never loads
    expect(result.current.isPending).toBe(true);
    expect(result.current.isFetching).toBe(false);
    expect(mockedService.getEmailById).not.toHaveBeenCalled();
  });

  it("is disabled and never calls the service when id is 'create'", async () => {
    const { result } = renderHookWithClient(() => useEmailById("create"));

    expect(result.current.isPending).toBe(true);
    expect(result.current.isFetching).toBe(false);
    expect(mockedService.getEmailById).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useCreateOrUpdateEmail
// ---------------------------------------------------------------------------

describe("useCreateOrUpdateEmail", () => {
  it("calls the service with a flat EmailCreateUpdateRequest and invalidates emails list", async () => {
    mockedService.createOrUpdateEmail.mockResolvedValue(
      emailDetailResponse as never
    );
    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useCreateOrUpdateEmail(), {
      client,
    });

    await result.current.mutateAsync(emailPayload);

    expect(mockedService.createOrUpdateEmail).toHaveBeenCalledWith(
      emailPayload
    );

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.emails.list(),
      })
    );
  });

  it("unwraps the nested { data: ... } wrapper shape before calling the service", async () => {
    const emailPayloadWithId: EmailCreateUpdateRequest = {
      ...emailPayload,
      _id: "email1",
    };
    const updatedDetailResponse: EmailDetailResponse = {
      success: true,
      data: { ...makeEmail("email1") },
    };
    mockedService.createOrUpdateEmail.mockResolvedValue(
      updatedDetailResponse as never
    );
    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useCreateOrUpdateEmail(), {
      client,
    });

    await result.current.mutateAsync({ data: emailPayloadWithId });

    expect(mockedService.createOrUpdateEmail).toHaveBeenCalledWith(
      emailPayloadWithId
    );

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.emails.list(),
      })
    );
  });

  it("also invalidates the detail query when the payload carries an _id", async () => {
    const emailPayloadWithId: EmailCreateUpdateRequest = {
      ...emailPayload,
      _id: "email1",
    };
    mockedService.createOrUpdateEmail.mockResolvedValue(
      emailDetailResponse as never
    );
    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useCreateOrUpdateEmail(), {
      client,
    });

    await result.current.mutateAsync(emailPayloadWithId);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.emails.list(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.emails.detail("email1"),
      });
    });
  });

  it("does NOT invalidate the detail query when the payload has no _id", async () => {
    mockedService.createOrUpdateEmail.mockResolvedValue(
      emailDetailResponse as never
    );
    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useCreateOrUpdateEmail(), {
      client,
    });

    await result.current.mutateAsync(emailPayload);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.emails.list(),
      })
    );

    // detail invalidation should not have been called
    const detailCalls = invalidateSpy.mock.calls.filter(
      ([arg]) =>
        Array.isArray((arg as { queryKey?: unknown }).queryKey) &&
        ((arg as { queryKey: unknown[] }).queryKey as unknown[]).includes(
          "detail"
        )
    );
    expect(detailCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// useDeleteEmail
// ---------------------------------------------------------------------------

describe("useDeleteEmail", () => {
  it("calls deleteEmail with the given id and invalidates the emails list", async () => {
    mockedService.deleteEmail.mockResolvedValue({ success: true } as never);
    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useDeleteEmail(), { client });

    await result.current.mutateAsync("email1");

    expect(mockedService.deleteEmail).toHaveBeenCalledWith("email1");

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.emails.list(),
      })
    );
  });

  it("surfaces an error when the service rejects", async () => {
    mockedService.deleteEmail.mockRejectedValue(
      new Error("Fout bij verwijderen email") as never
    );

    const { result } = renderHookWithClient(() => useDeleteEmail());

    await expect(result.current.mutateAsync("email1")).rejects.toThrow(
      "Fout bij verwijderen email"
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useSendEmail
// ---------------------------------------------------------------------------

describe("useSendEmail", () => {
  it("calls useSendEmail on the service with the payload and invalidates the emails list", async () => {
    mockedService.useSendEmail.mockResolvedValue(emailDetailResponse as never);
    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useSendEmail(), { client });

    await result.current.mutateAsync(emailPayload);

    expect(mockedService.useSendEmail).toHaveBeenCalledWith(emailPayload);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.emails.list(),
      })
    );
  });

  it("surfaces an error when the service rejects", async () => {
    mockedService.useSendEmail.mockRejectedValue(
      new Error("Fout bij verzenden email") as never
    );

    const { result } = renderHookWithClient(() => useSendEmail());

    await expect(result.current.mutateAsync(emailPayload)).rejects.toThrow(
      "Fout bij verzenden email"
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
