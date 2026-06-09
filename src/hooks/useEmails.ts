import {
  useQuery,
  UseQueryResult,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import {
  EmailsResponse,
  EmailsQueryParams,
  EmailDetailResponse,
  EmailCreateUpdateRequest,
} from "../api/types/emails";
import emailsService from "../api/services/emailsService";
import QueryKeys from "../api/queryKeys";

export const useEmailsList = (
  params: EmailsQueryParams = { offset: 0 }
): UseQueryResult<EmailsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.emails.list(params.offset),
    queryFn: () => emailsService.getEmails(params),
  });
};

export const useEmailById = (
  id?: string
): UseQueryResult<EmailDetailResponse> => {
  return useQuery({
    queryKey: QueryKeys.emails.detail(id),
    queryFn: async () => {
      if (!id || id === "create") {
        return new Promise<EmailDetailResponse>((_, reject) => {
          reject(new Error("No valid email ID provided"));
        });
      }
      return emailsService.getEmailById(id);
    },
    enabled: !!id && id !== "create",
    retry: (failureCount, error: Error) => {
      if (error?.message === "No valid email ID provided") {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useCreateOrUpdateEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: EmailCreateUpdateRequest | { data: EmailCreateUpdateRequest }
    ) => {
      const emailData = "data" in data ? data.data : data;
      return emailsService.createOrUpdateEmail(emailData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emails.list() });

      const emailData = "data" in variables ? variables.data : variables;
      const id = emailData._id;

      if (id) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.emails.detail(id),
        });
      }
    },
  });
};

export const useDeleteEmail = (): UseMutationResult<
  { success: boolean },
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => emailsService.deleteEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emails.list() });
    },
  });
};

export const useSendEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmailCreateUpdateRequest) => {
      return emailsService.useSendEmail(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emails.list() });
    },
  });
};
