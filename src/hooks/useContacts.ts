import {
  useQuery,
  useMutation,
  UseQueryResult,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ContactsResponse,
  ContactsQueryParams,
  Contact,
  ContactCreateUpdateRequest,
} from "../api/types/contacts";
import contactsService from "../api/services/contactsService";
import QueryKeys from "../api/queryKeys";

export const useContactsList = (
  params: ContactsQueryParams = { offset: 0 }
): UseQueryResult<ContactsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.contacts.list(params.offset),
    queryFn: () => contactsService.getContacts(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useContactById = (
  id?: string
): UseQueryResult<{ success: boolean; data: Contact }, Error> => {
  return useQuery({
    queryKey: QueryKeys.contacts.detail(id),
    queryFn: () => {
      if (!id || id === "create") {
        throw new Error("No valid contact ID provided");
      }
      return contactsService.getContactById(id);
    },
    enabled: !!id && id !== "create",
    retry: (failureCount, error: Error) => {
      if (error?.message === "No valid contact ID provided") {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateOrUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactData: ContactCreateUpdateRequest) => {
      return contactsService.createOrUpdateContact(contactData);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.contacts.base });

      if (response.data._id) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.contacts.detail(response.data._id),
        });
      }
    },
  });
};

export const useDeleteContact = (): UseMutationResult<
  { success: boolean },
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsService.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.contacts.base });
    },
  });
};
