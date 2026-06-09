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
} from "@ionic/react";
import { add } from "ionicons/icons";
import LogoutButton from "../../../components/LogoutButton";
import MenuButton from "../../../components/MenuButton";
import { useExpensesList } from "../../../hooks/useExpenses";
import { useQueryClient } from "@tanstack/react-query";
import { Expense } from "../../../api/types/expenses";
import QueryKeys from "../../../api/queryKeys";
import expensesService from "../../../api/services/expensesService";
import "./styles.css";

const ExpenseListPage: React.FC = () => {
  const [limit] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const queryClient = useQueryClient();
  const history = useHistory();

  const [showError, setShowError] = useState(false);

  const { data, isLoading, isError, error } = useExpensesList({ offset: 0, limit });

  // Define a function to filter expenses by search text
  const filterExpenses = (expenses: Expense[], search: string) => {
    if (search.trim() === "") {
      return expenses;
    }

    const lowercaseSearch = search.toLowerCase();
    return expenses.filter((expense) => {
      return (
        // Search in various expense properties
        (expense.info &&
          expense.info.toLowerCase().includes(lowercaseSearch)) ||
        (expense.contactName &&
          expense.contactName.toLowerCase().includes(lowercaseSearch)) ||
        expense.expenseNumber?.toString().includes(lowercaseSearch) ||
        expense.price?.toString().includes(lowercaseSearch) ||
        expense.priceWOTaxes?.toString().includes(lowercaseSearch)
      );
    });
  };

  // Load initial page of expenses and track pagination info
  useEffect(() => {
    if (data?.data.docs) {
      setAllExpenses(data.data.docs);
      setFilteredExpenses(filterExpenses(data.data.docs, searchText));
      setHasNextPage(data.data.hasNextPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: searchText changes are handled by the separate search effect below
  }, [data]);

  // Handle search filtering whenever searchText or allExpenses changes
  useEffect(() => {
    const filtered = filterExpenses(allExpenses, searchText);
    setFilteredExpenses(filtered);
  }, [searchText, allExpenses]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isError) {
      timer = setTimeout(() => setShowError(true), 700);
    } else {
      setShowError(false);
    }
    return () => clearTimeout(timer);
  }, [isError]);

  // Handle refresh (pull to refresh)
  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    // Reset page to 0 for a fresh start
    setPage(0);

    // Invalidate the expenses query to trigger a refetch
    // This will update the data through the React Query hook
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.expenses.list(),
    });

    // Complete the refresh event
    event.detail.complete();

    // Note: We no longer clear existing expenses manually
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

        console.log(`Loading more expenses with offset ${offset}...`);

        // Fetch the next page of expenses directly from the service
        const response = await expensesService.getExpenses({ offset, limit });

        if (response && response.data) {
          // Update pagination info
          setHasNextPage(response.data.hasNextPage);

          if (response.data.docs && response.data.docs.length > 0) {
            console.log(`Loaded ${response.data.docs.length} more expenses`);

            // Combine existing expenses with new ones
            const combinedExpenses = [...allExpenses, ...response.data.docs];

            // Update our states
            setAllExpenses(combinedExpenses);
            setFilteredExpenses(filterExpenses(combinedExpenses, searchText));

            // Update page for next load
            setPage(nextPage);
          } else {
            console.log("No more expenses to load or empty response");
            setHasNextPage(false);
          }
        }
      } catch (error) {
        console.error("Error loading more expenses:", error);
      }
    } else {
      console.log("No more pages available");
    }

    // Complete the infinite scroll event
    setTimeout(() => {
      (event.target as HTMLIonInfiniteScrollElement).complete();
    }, 300);
  };

  // Format date string to local date format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Render skeleton loading view
  const renderSkeleton = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <IonCard key={`skeleton-${index}`}>
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

  // Handle navigation to expense details
  const navigateToDetails = (expenseId: string) => {
    history.push(`/expenses/${expenseId}`);
  };

  // Render a single expense item
  const renderExpenseItem = (expense: Expense) => {
    return (
      <IonCard
        key={expense._id}
        onClick={() => navigateToDetails(expense._id)}
        className="expense-card"
      >
        <IonCardHeader>
          <IonCardTitle>
            #{expense.expenseNumber} - {expense.info}
          </IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem lines="none">
            <IonLabel>Contact</IonLabel>
            <IonNote slot="end">{expense.contactName || "-"}</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Datum</IonLabel>
            <IonNote slot="end">{formatDate(expense.expenseDate)}</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Bedrag</IonLabel>
            <IonNote slot="end" className="expense-amount">
              {formatCurrency(expense.price || 0)}
            </IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>BTW 21%</IonLabel>
            <IonNote slot="end">{formatCurrency(expense.tax || 0)}</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>BTW 9%</IonLabel>
            <IonNote slot="end">{formatCurrency(expense.taxLow || 0)}</IonNote>
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
          <IonTitle>Kosten</IonTitle>
          <IonButtons slot="end">
            <LogoutButton />
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonChange={(e) => setSearchText(e.detail.value || "")}
            placeholder="Zoek kosten..."
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
              // Navigate to the dedicated create expense route
              history.push("/expenses/edit/create");
            }}
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {showError && (
          <div className="error-container">
            <p>Fout bij laden van kosten: {error?.message}</p>
          </div>
        )}

        {isLoading ? (
          renderSkeleton()
        ) : (
          <>
            {filteredExpenses.length === 0 ? (
              <div className="empty-container">
                <p>Geen kosten gevonden</p>
              </div>
            ) : (
              <IonList>{filteredExpenses.map(renderExpenseItem)}</IonList>
            )}

            <IonInfiniteScroll
              threshold="100px"
              disabled={!hasNextPage}
              onIonInfinite={loadMore}
            >
              <IonInfiniteScrollContent
                loadingSpinner="bubbles"
                loadingText="Meer kosten laden..."
              />
            </IonInfiniteScroll>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ExpenseListPage;
