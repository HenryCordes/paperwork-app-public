import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient, makeTestQueryClient } from "../test-utils";
import {
  useInvoicesList,
  useInvoiceById,
  useCreateOrUpdateInvoice,
  useDeleteInvoice,
} from "../../hooks/useInvoices";
import invoicesService from "../../api/services/invoicesService";
import QueryKeys from "../../api/queryKeys";
import type { Invoice, InvoicesResponse, InvoiceCreateUpdateRequest } from "../../api/types/invoices";

vi.mock("../../api/services/invoicesService");

const mockedService = vi.mocked(invoicesService, true);

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  _id: "inv-1",
  state: "open",
  contactId: "contact-1",
  contactName: "ACME Corp",
  invoiceNumber: 1001,
  invoiceDate: "2024-01-01",
  payDate: "2024-01-31",
  priceIncludingTax: 121,
  invoiceLines: [
    {
      _id: "line-1",
      description: "Consulting",
      numberOfItems: 1,
      priceIncludingTax: 121,
      taxRate: 21,
      totalLinePrice: 121,
    },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const makeInvoicesResponse = (offset = 0): InvoicesResponse => ({
  success: true,
  data: {
    docs: [makeInvoice()],
    totalDocs: 1,
    offset,
    limit: 10,
    totalPages: 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useInvoicesList", () => {
  it("returns the data the service resolves when called with default params", async () => {
    const response = makeInvoicesResponse();
    mockedService.getInvoices.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() => useInvoicesList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(mockedService.getInvoices).toHaveBeenCalledWith({});
  });

  it("passes provided params through to the service", async () => {
    const response = makeInvoicesResponse(10);
    mockedService.getInvoices.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() =>
      useInvoicesList({ offset: 10, limit: 10 })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(mockedService.getInvoices).toHaveBeenCalledWith({ offset: 10, limit: 10 });
  });
});

describe("useInvoiceById", () => {
  it("is disabled and does not call the service when id is undefined", () => {
    const { result } = renderHookWithClient(() => useInvoiceById(undefined));

    // fetchStatus is "idle" when the query is disabled
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedService.getInvoiceById).not.toHaveBeenCalled();
  });

  it("fetches the invoice when a valid id is provided", async () => {
    const invoice = makeInvoice({ _id: "inv-42" });
    const response = { success: true, data: invoice };
    mockedService.getInvoiceById.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() => useInvoiceById("inv-42"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(mockedService.getInvoiceById).toHaveBeenCalledWith("inv-42");
  });
});

describe("useCreateOrUpdateInvoice", () => {
  const payload: InvoiceCreateUpdateRequest = {
    contactId: "contact-1",
    contactName: "ACME Corp",
    invoiceNumber: 1001,
    invoiceDate: "2024-01-01",
    payDate: "2024-01-31",
    priceIncludingTax: 121,
    invoiceLines: [
      {
        _id: "line-1",
        description: "Consulting",
        numberOfItems: 1,
        priceIncludingTax: 121,
        taxRate: 21,
        totalLinePrice: 121,
      },
    ],
  };

  it("calls the service with the correct payload and invalidates the invoices list", async () => {
    const invoice = makeInvoice();
    mockedService.createOrUpdateInvoice.mockResolvedValue({
      success: true,
      data: invoice,
    } as never);

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useCreateOrUpdateInvoice(), {
      client,
    });

    await result.current.mutateAsync(payload);

    expect(mockedService.createOrUpdateInvoice).toHaveBeenCalledWith(payload);
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.invoices.list(),
      })
    );
  });

  it("updates an existing invoice when _id is included in the payload", async () => {
    const existingId = "inv-99";
    const invoice = makeInvoice({ _id: existingId });
    mockedService.createOrUpdateInvoice.mockResolvedValue({
      success: true,
      data: invoice,
    } as never);

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useCreateOrUpdateInvoice(), {
      client,
    });

    await result.current.mutateAsync({ ...payload, _id: existingId });

    expect(mockedService.createOrUpdateInvoice).toHaveBeenCalledWith({
      ...payload,
      _id: existingId,
    });
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.invoices.list(),
      })
    );
  });
});

describe("useDeleteInvoice", () => {
  it("calls the service with the correct id and invalidates the invoices list", async () => {
    mockedService.deleteInvoice.mockResolvedValue({ success: true } as never);

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useDeleteInvoice(), {
      client,
    });

    await result.current.mutateAsync("inv-1");

    expect(mockedService.deleteInvoice).toHaveBeenCalledWith("inv-1");
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.invoices.list(),
      })
    );
  });
});
