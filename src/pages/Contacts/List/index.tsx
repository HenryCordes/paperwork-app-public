import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonSkeletonText,
  IonText,
  IonIcon,
  IonButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonRefresher,
  IonRefresherContent,
  useIonToast,
} from "@ionic/react";
import {
  personCircleOutline,
  businessOutline,
  mailOutline,
  callOutline,
  addCircleOutline,
} from "ionicons/icons";
import { useContactsList } from "../../../hooks/useContacts";
import { Contact } from "../../../api/types/contacts";
import { IconTextContainer, IconWrapper, TruncatedText } from "./styled";
import MenuButton from "../../../components/MenuButton";

const ContactsList: React.FC = () => {
  const [presentToast] = useIonToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  const {
    data: contactsData,
    isError,
    error,
    refetch,
  } = useContactsList({ offset: 0 });

  // Define a function to filter contacts by search text
  const filterContacts = (contactsList: Contact[], search: string) => {
    if (search.trim() === "") {
      return contactsList;
    }

    const lowercaseSearch = search.toLowerCase();
    return contactsList.filter((contact) => {
      return (
        contact.firstName.toLowerCase().includes(lowercaseSearch) ||
        contact.lastName.toLowerCase().includes(lowercaseSearch) ||
        contact.companyName.toLowerCase().includes(lowercaseSearch) ||
        contact.emailAddress.toLowerCase().includes(lowercaseSearch)
      );
    });
  };

  // Load initial contacts
  useEffect(() => {
    if (contactsData) {
      setContacts(contactsData.data.docs);
      setFilteredContacts(filterContacts(contactsData.data.docs, searchText));
      setHasMore(contactsData.data.hasNextPage);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactsData]);

  // Handle search filtering using the filterContacts function
  useEffect(() => {
    const filtered = filterContacts(contacts, searchText);
    setFilteredContacts(filtered);
  }, [searchText, contacts]);

  // Display error toast if fetch fails
  useEffect(() => {
    if (isError) {
      presentToast({
        message: `Fout bij ophalen contacten: ${
          error?.message || "Onbekende fout"
        }`,
        duration: 3000,
        color: "danger",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  // Load more contacts when scrolling
  const loadMoreContacts = async (event: CustomEvent<void>) => {
    const target = event.target as HTMLIonInfiniteScrollElement;
    if (!hasMore) {
      target.complete();
      return;
    }

    try {
      // Calculate next page and offset
      const nextPage = page + 1;
      const offset = nextPage * 10; // Assuming limit is 10

      console.log(`Loading more contacts with offset ${offset}...`);

      // Fetch the next page of contacts directly from the service
      const contactsService = (
        await import("../../../api/services/contactsService")
      ).default;
      // The ContactsQueryParams type only has offset, limit is handled internally
      const response = await contactsService.getContacts({ offset });

      if (response && response.data) {
        // Update pagination info
        setHasMore(response.data.hasNextPage);

        if (response.data.docs && response.data.docs.length > 0) {
          console.log(`Loaded ${response.data.docs.length} more contacts`);

          // Combine existing contacts with new ones
          const combinedContacts = [...contacts, ...response.data.docs];

          // Update our states
          setContacts(combinedContacts);
          setFilteredContacts(filterContacts(combinedContacts, searchText));

          // Update page for next load
          setPage(nextPage);
        } else {
          console.log("No more contacts to load or empty response");
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Error loading more contacts:", error);
      presentToast({
        message: "Fout bij laden van meer contacten",
        duration: 3000,
        color: "danger",
      });
    }

    setTimeout(() => {
      target.complete();
    }, 300);
  };

  // Handle pull-to-refresh
  const handleRefresh = async (event: CustomEvent) => {
    const target = event.target as HTMLIonRefresherElement;
    try {
      // Reset page to 0 for a fresh start
      setPage(0);

      // Clear existing contacts
      setContacts([]);

      const result = await refetch();
      if (result.data) {
        setContacts(result.data.data.docs);
        setFilteredContacts(filterContacts(result.data.data.docs, searchText));
        setHasMore(result.data.data.hasNextPage);
      }
    } catch {
      presentToast({
        message: "Fout bij vernieuwen van contacten",
        duration: 3000,
        color: "danger",
      });
    }
    target.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <MenuButton />
          <IonTitle>Contacten</IonTitle>
          <IonButton slot="end" fill="clear" routerLink="/contacts/edit/create">
            <IonIcon slot="icon-only" icon={addCircleOutline} />
          </IonButton>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonChange={(e) => setSearchText(e.detail.value || "")}
            placeholder="Zoek contact..."
            debounce={300}
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading ? (
          <div className="ion-padding">
            {[...Array(10)].map((_, i) => (
              <IonItem key={i}>
                <IonAvatar slot="start">
                  <IonSkeletonText animated />
                </IonAvatar>
                <IonLabel>
                  <h2>
                    <IonSkeletonText animated style={{ width: "70%" }} />
                  </h2>
                  <div>
                    <IonSkeletonText animated style={{ width: "40%" }} />
                  </div>
                </IonLabel>
              </IonItem>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="ion-padding ion-text-center">
            <IonText color="medium">
              <p>Geen contacten gevonden</p>
            </IonText>
          </div>
        ) : (
          <IonList className="ion-padding">
            {filteredContacts.map((contact) => (
              <IonItem
                key={contact._id}
                routerLink={`/contacts/${contact._id}`}
                detail
              >
                <IonAvatar slot="start">
                  <IonIcon
                    icon={
                      contact.typeName === "Persoon"
                        ? personCircleOutline
                        : businessOutline
                    }
                    style={{
                      fontSize: "40px",
                      color: "var(--ion-color-primary)",
                    }}
                  />
                </IonAvatar>
                <IonLabel>
                  <h2>{`${contact.firstName} ${contact.lastName}`}</h2>
                  <IconTextContainer>
                    <IconWrapper>
                      <IonIcon icon={businessOutline} size="small" />
                    </IconWrapper>
                    <TruncatedText>{contact.companyName || "—"}</TruncatedText>
                  </IconTextContainer>
                  {contact.emailAddress && (
                    <IconTextContainer>
                      <IconWrapper>
                        <IonIcon icon={mailOutline} size="small" />
                      </IconWrapper>
                      <TruncatedText>{contact.emailAddress}</TruncatedText>
                    </IconTextContainer>
                  )}
                  {contact.phoneNumber && (
                    <IconTextContainer>
                      <IconWrapper>
                        <IonIcon icon={callOutline} size="small" />
                      </IconWrapper>
                      <TruncatedText>{contact.phoneNumber}</TruncatedText>
                    </IconTextContainer>
                  )}
                </IonLabel>
                {/* {contact.typeName && (
                  <IonNote slot="end" color="medium">
                    {contact.typeName}
                  </IonNote>
                )} */}
              </IonItem>
            ))}
          </IonList>
        )}

        <IonInfiniteScroll
          threshold="100px"
          disabled={!hasMore || searchText.trim() !== ""}
          onIonInfinite={loadMoreContacts}
        >
          <IonInfiniteScrollContent
            loadingSpinner="bubbles"
            loadingText="Meer contacten laden..."
          />
        </IonInfiniteScroll>
      </IonContent>
    </IonPage>
  );
};

export default ContactsList;
