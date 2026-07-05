import {
  useMutation,
  useQuery,
  UseQueryResult,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import {
  InvoiceCreateUpdateRequest,
  InvoicesQueryParams,
  InvoicesResponse,
  Invoice,
} from "../api/types/invoices";
import invoicesService from "../api/services/invoicesService";
import QueryKeys from "../api/queryKeys";

export const useInvoicesList = (
  params: InvoicesQueryParams = {}
): UseQueryResult<InvoicesResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.invoices.list(params.offset),
    queryFn: () => invoicesService.getInvoices(params),
  });
};

export const useInvoiceById = (
  id?: string
): UseQueryResult<{ success: boolean; data: Invoice }, Error> => {
  return useQuery({
    queryKey: QueryKeys.invoices.detail(id),
    queryFn: () => invoicesService.getInvoiceById(id as string),
    enabled: !!id,
  });
};

export const useCreateOrUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvoiceCreateUpdateRequest) =>
      invoicesService.createOrUpdateInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.invoices.list(),
      });
    },
  });
};

export const useDeleteInvoice = (): UseMutationResult<
  { success: boolean },
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.invoices.list(),
      });
    },
  });
};
