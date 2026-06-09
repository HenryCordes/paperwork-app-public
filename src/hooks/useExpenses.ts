import {
  useQuery,
  UseQueryResult,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ExpensesResponse,
  ExpensesQueryParams,
  ExpenseDetailResponse,
  ExpenseCreateUpdateRequest,
} from "../api/types/expenses";
import expensesService from "../api/services/expensesService";
import documentsService from "../api/services/documentsService";
import QueryKeys from "../api/queryKeys";

export const useExpensesList = (
  params: ExpensesQueryParams = { offset: 0 }
): UseQueryResult<ExpensesResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.expenses.list(params.offset),
    queryFn: () => expensesService.getExpenses(params),
  });
};

export const useExpenseById = (
  id?: string
): UseQueryResult<ExpenseDetailResponse> => {
  return useQuery({
    queryKey: QueryKeys.expenses.detail(id),
    queryFn: async () => {
      if (!id || id === "create") {
        return new Promise<ExpenseDetailResponse>((_, reject) => {
          reject(new Error("No valid expense ID provided"));
        });
      }
      return expensesService.getExpenseById(id);
    },
    enabled: !!id && id !== "create",
    retry: (failureCount, error: Error) => {
      if (error?.message === "No valid expense ID provided") {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useCreateOrUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: ExpenseCreateUpdateRequest | { data: ExpenseCreateUpdateRequest }
    ) => {
      const expenseData = "data" in data ? data.data : data;
      return expensesService.createOrUpdateExpense(expenseData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.expenses.list() });

      const expenseData = "data" in variables ? variables.data : variables;
      const id = expenseData._id;

      if (id) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.expenses.detail(id),
        });
      }
    },
  });
};

export const useUploadDocument = () => {
  return useMutation({
    mutationFn: (file: File) => documentsService.uploadReceiptDocument(file),
  });
};

export const useDeleteExpense = (): UseMutationResult<
  { success: boolean },
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expensesService.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.expenses.list() });
    },
  });
};
