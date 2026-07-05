import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonNote,
  IonBadge,
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
  IonItem,
  IonLabel,
} from "@ionic/react";
import { add } from "ionicons/icons";
import LogoutButton from "../../../components/LogoutButton";
import MenuButton from "../../../components/MenuButton";
import { useInvoicesList } from "../../../hooks/useInvoices";
import { useQueryClient } from "@tanstack/react-query";
import { Invoice } from "../../../api/types/invoices";
import QueryKeys from "../../../api/queryKeys";
import invoicesService from "../../../api/services/invoicesService";
import { getInvoiceBadgeColor } from "../helpers";
import { formatDateForDisplay } from "../../../utils/dateUtils";
import "./styles.css";

const InvoiceListPage: React.FC = () => {
  const [limit] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const queryClient = useQueryClient();
  const history = useHistory();

  const { data, isLoading, isError, error } = useInvoicesList({
    offset: 0,
    limit,
  });

  // Define a function to filter invoices by search text
  const filterInvoices = (invoices: Invoice[], search: string) => {
    if (search.trim() === "") {
      return invoices;
    }

    const lowercaseSearch = search.toLowerCase();
    return invoices.filter((invoice) => {
      return (
        // Search in various invoice properties
        (invoice.contactName &&
          invoice.contactName.toLowerCase().includes(lowercaseSearch)) ||
        invoice.invoiceNumber?.toString().includes(lowercaseSearch) ||
        invoice.invoiceDate?.toString().includes(lowercaseSearch) ||
        (invoice.state && invoice.state.toLowerCase().includes(lowercaseSearch))
      );
    });
  };

  // Load initial page of invoices and track pagination info
  useEffect(() => {
    if (data?.data.docs) {
      setAllInvoices(data.data.docs);
      setFilteredInvoices(filterInvoices(data.data.docs, searchText));
      setHasNextPage(data.data.hasNextPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: searchText omitted so a data refresh doesn't override active search; second effect handles search-driven filtering
  }, [data]);

  // Handle search filtering whenever searchText or allInvoices changes
  useEffect(() => {
    const filtered = filterInvoices(allInvoices, searchText);
    setFilteredInvoices(filtered);
  }, [searchText, allInvoices]);

  // Handle refresh (pull to refresh)
  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    // Reset page to 0 for a fresh start
    setPage(0);
    
    // Invalidate the invoices query to trigger a refetch
    // This will update the data through the React Query hook
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.invoices.list(),
    });
    
    // Complete the refresh event
    event.detail.complete();
    
    // Note: We no longer clear existing invoices manually
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

        console.log(`Loading more invoices with offset ${offset}...`);

        // Fetch the next page of invoices
        const response = await invoicesService.getInvoices({ offset, limit });

        if (response && response.data) {
          // Update pagination info
          setHasNextPage(response.data.hasNextPage);

          if (response.data.docs && response.data.docs.length > 0) {
            console.log(`Loaded ${response.data.docs.length} more invoices`);

            // Combine existing invoices with new ones
            const combinedInvoices = [...allInvoices, ...response.data.docs];

            // Update our states
            setAllInvoices(combinedInvoices);
            setFilteredInvoices(filterInvoices(combinedInvoices, searchText));

            // Update page for next load
            setPage(nextPage);
          } else {
            console.log("No more invoices to load or empty response");
            setHasNextPage(false);
          }
        }
      } catch (error) {
        console.error("Error loading more invoices:", error);
      }
    } else {
      console.log("No more pages available");
    }

    // Complete the infinite scroll event
    setTimeout(() => {
      (event.target as HTMLIonInfiniteScrollElement).complete();
    }, 300);
  };

  // Format price for display
  const formatPrice = (price?: number) => {
    if (price === undefined) return "-";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  // Render a single invoice item
  const renderInvoiceItem = (invoice: Invoice) => (
    <IonCard
      key={invoice._id}
      onClick={() => history.push(`/invoices/${invoice._id}`)}
    >
      <div className="invoice-card-container">
        <IonCardHeader>
          <IonCardTitle>
            #{invoice.invoiceNumber} - {invoice.contactName}
          </IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem lines="none">
            <IonLabel>Datum</IonLabel>
            <IonNote slot="end">
              {formatDateForDisplay(invoice.invoiceDate)}
            </IonNote>
          </IonItem>

          <IonItem lines="none">
            <IonLabel>Betalen</IonLabel>
            <IonNote slot="end">
              {formatDateForDisplay(invoice.payDate)}
            </IonNote>
          </IonItem>

          <IonItem lines="none">
            <IonLabel>Bedrag</IonLabel>
            <IonNote slot="end">
              {formatPrice(invoice.priceIncludingTax || 0)}
            </IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonBadge color={getInvoiceBadgeColor(invoice.state)}>
              {invoice.state || "Onbekend"}
            </IonBadge>
          </IonItem>
        </IonCardContent>
      </div>
    </IonCard>
  );

  // Render loading skeleton
  const renderSkeleton = () => (
    <div>
      {[...Array(3)].map((_, i) => (
        <IonCard key={i}>
          <IonCardHeader>
            <IonSkeletonText animated style={{ width: "70%" }} />
            <IonSkeletonText animated style={{ width: "40%" }} />
          </IonCardHeader>
          <IonCardContent>
            <div className="invoice-details">
              <div className="invoice-detail-item">
                <IonSkeletonText animated style={{ width: "50%" }} />
                <IonSkeletonText animated style={{ width: "30%" }} />
              </div>
              <div className="invoice-detail-item">
                <IonSkeletonText animated style={{ width: "50%" }} />
                <IonSkeletonText animated style={{ width: "30%" }} />
              </div>
              <div className="invoice-detail-item">
                <IonSkeletonText animated style={{ width: "50%" }} />
                <IonSkeletonText animated style={{ width: "30%" }} />
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      ))}
    </div>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <MenuButton />
          <IonTitle>Facturen</IonTitle>
          <IonButtons slot="end">
            <LogoutButton />
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonChange={(e) => setSearchText(e.detail.value || "")}
            placeholder="Zoek facturen..."
            debounce={300}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton routerLink="/invoices/edit/create">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {isError && (
          <div className="error-container">
            <p>Fout bij laden van facturen: {error?.message}</p>
          </div>
        )}

        {isLoading ? (
          renderSkeleton()
        ) : (
          <>
            {filteredInvoices.length === 0 ? (
              <div className="empty-container">
                <p>Geen facturen gevonden</p>
              </div>
            ) : (
              <IonList>{filteredInvoices.map(renderInvoiceItem)}</IonList>
            )}

            <IonInfiniteScroll
              onIonInfinite={loadMore}
              threshold="100px"
              disabled={!hasNextPage}
            >
              <IonInfiniteScrollContent
                loadingSpinner="bubbles"
                loadingText="Meer facturen laden..."
              />
            </IonInfiniteScroll>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default InvoiceListPage;
