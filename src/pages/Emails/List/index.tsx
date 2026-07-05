import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonFab,
  IonFabButton,
  IonIcon,
  IonButtons,
  RefresherEventDetail,
  IonSearchbar,
  IonBadge,
} from "@ionic/react";
import { add } from "ionicons/icons";
import LogoutButton from "../../../components/LogoutButton";
import MenuButton from "../../../components/MenuButton";
import { useEmailsList } from "../../../hooks/useEmails";
import { useQueryClient } from "@tanstack/react-query";
import { Email } from "../../../api/types/emails";
import QueryKeys from "../../../api/queryKeys";
import emailsService from "../../../api/services/emailsService";
import "./styles.css";

const EmailListPage: React.FC = () => {
  const [limit] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [allEmails, setAllEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const queryClient = useQueryClient();
  const history = useHistory();

  const { data, isLoading, isError, error } = useEmailsList({
    offset: 0,
    limit,
  });

  // Define a function to filter emails by search text
  const filterEmails = (emails: Email[], search: string) => {
    if (search.trim() === "") {
      return emails;
    }

    const lowercaseSearch = search.toLowerCase();
    return emails.filter((email) => {
      return (
        // Search in various email properties
        (email.subject &&
          email.subject.toLowerCase().includes(lowercaseSearch)) ||
        (email.contactName &&
          email.contactName.toLowerCase().includes(lowercaseSearch)) ||
        (email.contactEmail &&
          email.contactEmail.toLowerCase().includes(lowercaseSearch)) ||
        email.emailNumber?.toString().includes(lowercaseSearch)
      );
    });
  };

  // Load initial page of emails and track pagination info
  useEffect(() => {
    if (data?.data.docs) {
      setAllEmails(data.data.docs);
      setFilteredEmails(filterEmails(data.data.docs, searchText));
      setHasNextPage(data.data.hasNextPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: searchText changes are handled by the separate search effect below
  }, [data]);

  // Handle search filtering whenever searchText or allEmails changes
  useEffect(() => {
    const filtered = filterEmails(allEmails, searchText);
    setFilteredEmails(filtered);
  }, [searchText, allEmails]);

  // Handle refresh (pull to refresh)
  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    // Reset page to 0 for a fresh start
    setPage(0);

    // Invalidate the emails query to trigger a refetch
    // This will update the data through the React Query hook
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.emails.list(),
    });

    // Complete the refresh event
    event.detail.complete();

    // Note: We no longer clear existing emails manually
    // The data will update automatically when the query completes
  };

  // Handle load more (infinite scroll)
  const loadMore = async (event: CustomEvent<void>) => {
    // Check if we have more pages to load
    if (hasNextPage) {
      try {
        // Calculate next page and offset
        const nextPage = page + 1;
        const offset = nextPage * limit;

        console.log(`Loading more emails with offset ${offset}...`);

        // Fetch the next page of emails directly from the service
        const response = await emailsService.getEmails({ offset, limit });

        if (response && response.data) {
          // Update pagination info
          setHasNextPage(response.data.hasNextPage);

          if (response.data.docs && response.data.docs.length > 0) {
            console.log(`Loaded ${response.data.docs.length} more emails`);

            // Add new emails to the list
            setAllEmails((prevEmails) => [
              ...prevEmails,
              ...response.data.docs,
            ]);

            // Update page for next load
            setPage(nextPage);
          }
        }
      } catch (error) {
        console.error("Error loading more emails:", error);
      }
    }

    // Complete the infinite scroll event
    const ionInfiniteScroll = event.target as HTMLIonInfiniteScrollElement;
    ionInfiniteScroll.complete();
  };

  // Format date string to local date format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL");
  };

  // Render skeleton loading view
  const renderSkeleton = () => {
    // Return an array of skeleton items based on the limit
    return Array(limit)
      .fill(0)
      .map((_, index) => (
        <IonCard key={`skeleton-${index}`} className="email-card">
          <IonCardHeader>
            <IonSkeletonText animated style={{ width: "70%" }} />
          </IonCardHeader>
          <IonCardContent>
            <IonItem lines="none">
              <IonLabel>
                <IonSkeletonText animated style={{ width: "40%" }} />
              </IonLabel>
              <IonSkeletonText slot="end" animated style={{ width: "30%" }} />
            </IonItem>
            <IonItem lines="none">
              <IonLabel>
                <IonSkeletonText animated style={{ width: "60%" }} />
              </IonLabel>
            </IonItem>
          </IonCardContent>
        </IonCard>
      ));
  };

  // Handle navigation to email details
  const navigateToDetails = (emailId: string) => {
    history.push(`/emails/${emailId}`);
  };

  // Render a single email item
  const renderEmailItem = (email: Email) => {
    return (
      <IonCard
        key={email._id}
        onClick={() => navigateToDetails(email._id)}
        className="email-card"
      >
        <IonCardHeader>
          <IonCardTitle>
            #{email.emailNumber} - {email.subject}
          </IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem lines="none">
            <IonLabel>Ontvanger</IonLabel>
            <IonNote slot="end">{email.contactName || "-"}</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Email</IonLabel>
            <IonNote slot="end">{email.contactEmail || "-"}</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Onderwerp</IonLabel>
            <IonNote slot="end">{email.subject || "-"}</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Nummer</IonLabel>
            <IonNote slot="end">{email.emailNumber || "-"}</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Datum</IonLabel>
            <IonNote slot="end">{formatDate(email.emailDate)}</IonNote>
          </IonItem>
          <IonItem lines="none">
            {email.send ? (
              <IonBadge color="success">Verzonden</IonBadge>
            ) : (
              <IonBadge color="warning">Concept</IonBadge>
            )}
          </IonItem>
        </IonCardContent>
      </IonCard>
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <MenuButton />
          <IonTitle>Emails</IonTitle>
          <IonButtons slot="end">
            <LogoutButton />
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonChange={(e) => setSearchText(e.detail.value || "")}
            placeholder="Zoek emails..."
            debounce={300}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton
            onClick={() => {
              // Navigate to the dedicated create email route
              history.push("/emails/edit/create");
            }}
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {isError && (
          <div className="error-container">
            <p>Fout bij laden van emails: {error?.message}</p>
          </div>
        )}

        {isLoading ? (
          renderSkeleton()
        ) : (
          <>
            {filteredEmails.length === 0 ? (
              <div className="empty-container">
                <p>Geen emails gevonden</p>
              </div>
            ) : (
              <IonList>{filteredEmails.map(renderEmailItem)}</IonList>
            )}

            <IonInfiniteScroll
              threshold="100px"
              disabled={!hasNextPage}
              onIonInfinite={loadMore}
            >
              <IonInfiniteScrollContent
                loadingSpinner="bubbles"
                loadingText="Meer emails laden..."
              />
            </IonInfiniteScroll>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default EmailListPage;
