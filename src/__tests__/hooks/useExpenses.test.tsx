import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient, makeTestQueryClient } from "../test-utils";
import {
  useExpensesList,
  useCreateOrUpdateExpense,
} from "../../hooks/useExpenses";
import expensesService from "../../api/services/expensesService";
import QueryKeys from "../../api/queryKeys";

vi.mock("../../api/services/expensesService");
vi.mock("../../api/services/documentsService");

const mockedService = vi.mocked(expensesService, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useExpensesList", () => {
  it("returns the data the service resolves", async () => {
    // Real ExpensesResponse shape: { success, data: { docs, totalDocs, ... } }
    const response = {
      success: true,
      data: { docs: [{ _id: "e1" }], totalDocs: 1, offset: 0, limit: 10, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null },
    };
    mockedService.getExpenses.mockResolvedValue(response as never);
    const { result } = renderHookWithClient(() => useExpensesList({ offset: 0 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(mockedService.getExpenses).toHaveBeenCalledWith({ offset: 0 });
  });
});

describe("useCreateOrUpdateExpense", () => {
  it("calls the service and invalidates the expenses list on success", async () => {
    mockedService.createOrUpdateExpense.mockResolvedValue({ success: true, data: { _id: "e1" } } as never);
    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHookWithClient(() => useCreateOrUpdateExpense(), {
      client,
    });
    await result.current.mutateAsync({ _id: "e1", amount: 10 } as never);
    expect(mockedService.createOrUpdateExpense).toHaveBeenCalledWith({
      _id: "e1",
      amount: 10,
    });
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.expenses.list(),
      })
    );
  });
});
