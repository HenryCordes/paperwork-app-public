import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient, makeTestQueryClient } from "../test-utils";
import {
  useContactsList,
  useContactById,
  useCreateOrUpdateContact,
  useDeleteContact,
} from "../../hooks/useContacts";
import contactsService from "../../api/services/contactsService";
import QueryKeys from "../../api/queryKeys";
import type { Contact, ContactsResponse, ContactCreateUpdateRequest } from "../../api/types/contacts";

vi.mock("../../api/services/contactsService");

const mockedService = vi.mocked(contactsService, true);

const makeContact = (overrides: Partial<Contact> = {}): Contact => ({
  _id: "c1",
  contactNumber: 1,
  companyName: "Acme Inc",
  typeOfContact: "business",
  lastName: "Doe",
  firstName: "John",
  initials: "JD",
  gender: "male",
  emailAddress: "john@acme.com",
  phoneNumber: "+31201234567",
  mobilePhoneNumber: "+31612345678",
  street: "Main St",
  houseNumber: "1",
  postalCode: "1234AB",
  city: "Amsterdam",
  country: "NL",
  visitingStreet: "Main St",
  visitingHouseNumber: "1",
  visitingPostalCode: "1234AB",
  visitingCity: "Amsterdam",
  visitingCountry: "NL",
  bankIBAN: "NL91ABNA0417164300",
  bankPersonName: "John Doe",
  channel: "web",
  history: "",
  typeName: "Business",
  owner: "owner1",
  createdAt: "2024-01-01T00:00:00.000Z",
  tenantId: "tenant1",
  id: "c1",
  ...overrides,
});

const makeContactsResponse = (docs: Contact[] = [makeContact()]): ContactsResponse => ({
  success: true,
  data: {
    docs,
    totalDocs: docs.length,
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
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useContactsList", () => {
  it("returns contacts list with default offset 0", async () => {
    const response = makeContactsResponse();
    mockedService.getContacts.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() => useContactsList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(mockedService.getContacts).toHaveBeenCalledWith({ offset: 0 });
  });

  it("passes the offset param to the service", async () => {
    const response = makeContactsResponse();
    mockedService.getContacts.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() =>
      useContactsList({ offset: 20 })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.getContacts).toHaveBeenCalledWith({ offset: 20 });
  });
});

describe("useContactById", () => {
  it("fetches and returns a contact when given a valid id", async () => {
    const contact = makeContact();
    const response = { success: true, data: contact };
    mockedService.getContactById.mockResolvedValue(response as never);

    const { result } = renderHookWithClient(() => useContactById("c1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(mockedService.getContactById).toHaveBeenCalledWith("c1");
  });

  it("is disabled when id is undefined", async () => {
    const { result } = renderHookWithClient(() => useContactById(undefined));

    // Query should be in pending/idle state — service must not be called
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedService.getContactById).not.toHaveBeenCalled();
  });

  it('is disabled when id is "create"', async () => {
    const { result } = renderHookWithClient(() => useContactById("create"));

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedService.getContactById).not.toHaveBeenCalled();
  });
});

describe("useCreateOrUpdateContact", () => {
  const contactPayload: ContactCreateUpdateRequest = {
    companyName: "Acme Inc",
    typeOfContact: "business",
    typeName: "Business",
    lastName: "Doe",
    firstName: "John",
    initials: "JD",
    emailAddress: "john@acme.com",
  };

  it("calls the service with the provided data on mutate", async () => {
    const response = { success: true, data: makeContact() };
    mockedService.createOrUpdateContact.mockResolvedValue(response as never);

    const client = makeTestQueryClient();
    const { result } = renderHookWithClient(() => useCreateOrUpdateContact(), {
      client,
    });

    await result.current.mutateAsync(contactPayload);

    expect(mockedService.createOrUpdateContact).toHaveBeenCalledWith(
      contactPayload
    );
  });

  it("invalidates contacts.base after a successful create/update", async () => {
    const response = { success: true, data: makeContact() };
    mockedService.createOrUpdateContact.mockResolvedValue(response as never);

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useCreateOrUpdateContact(), {
      client,
    });

    await result.current.mutateAsync(contactPayload);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.contacts.base,
      })
    );
  });

  it("also invalidates the detail key for the returned contact id", async () => {
    const contact = makeContact({ _id: "c42" });
    const response = { success: true, data: contact };
    mockedService.createOrUpdateContact.mockResolvedValue(response as never);

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useCreateOrUpdateContact(), {
      client,
    });

    await result.current.mutateAsync(contactPayload);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.contacts.detail("c42"),
      })
    );
  });
});

describe("useDeleteContact", () => {
  it("calls the service with the contact id", async () => {
    mockedService.deleteContact.mockResolvedValue({ success: true } as never);

    const client = makeTestQueryClient();
    const { result } = renderHookWithClient(() => useDeleteContact(), { client });

    await result.current.mutateAsync("c1");

    expect(mockedService.deleteContact).toHaveBeenCalledWith("c1");
  });

  it("invalidates contacts.base after a successful delete", async () => {
    mockedService.deleteContact.mockResolvedValue({ success: true } as never);

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useDeleteContact(), { client });

    await result.current.mutateAsync("c1");

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.contacts.base,
      })
    );
  });
});
