import React, { useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonNote,
  IonSkeletonText,
  useIonRouter,
  IonButton,
  IonIcon,
  IonAlert,
} from "@ionic/react";
import { useParams, useHistory } from "react-router-dom";
import { useExpenseById, useDeleteExpense } from "../../../hooks/useExpenses";
import { useDocuments } from "../../../hooks/useDocuments";
import { useToast } from "../../../hooks/useToast";
import { create, document, trash } from "ionicons/icons";
import "./styles.css";

interface ExpenseDetailParams {
  id: string;
}

const ExpenseDetailsPage: React.FC = () => {
  const { id } = useParams<ExpenseDetailParams>();
  const router = useIonRouter();
  const history = useHistory();
  const { showToast } = useToast();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const { openDocument, getDocumentUrl } = useDocuments();

  const { data, isLoading, isError, error } = useExpenseById(id);
  const expense = data?.data;

  const deleteMutation = useDeleteExpense();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteMutation.mutateAsync(id);
      showToast("Kosten succesvol verwijderd", "success");
      history.push("/expenses", "back");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Fout bij verwijderen";
      showToast(`Fout: ${errorMessage}`, "error");
    }
  };

  const renderSkeleton = () => {
    return (
      <IonCard>
        <IonCardHeader>
          <IonSkeletonText animated style={{ width: "70%" }} />
        </IonCardHeader>
        <IonCardContent>
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <IonItem key={i} lines="none">
                <IonLabel>
                  <IonSkeletonText animated style={{ width: "40%" }} />
                </IonLabel>
                <IonNote slot="end">
                  <IonSkeletonText animated style={{ width: "100px" }} />
                </IonNote>
              </IonItem>
            ))}
        </IonCardContent>
      </IonCard>
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/expenses" text="" />
          </IonButtons>
          <IonTitle>Kosten details</IonTitle>

          {expense && (
            <IonButtons slot="end">
              <IonButton onClick={() => router.push(`/expenses/edit/${id}`)}>
                <IonIcon slot="icon-only" icon={create} />
              </IonButton>
              <IonButton onClick={() => setShowDeleteAlert(true)}>
                <IonIcon slot="icon-only" icon={trash} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {isError && (
          <div className="error-container">
            <p>Fout bij laden van kosten details: {error?.message}</p>
          </div>
        )}

        {isLoading ? (
          renderSkeleton()
        ) : expense ? (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  #{expense.expenseNumber} - {expense.info || "Bon"}
                </IonCardTitle>
                {/* <div className="status-badge-container">
                  <IonBadge color={getBadgeColor(expense.state)}>
                    {expense.state}
                  </IonBadge>
                </div> */}
              </IonCardHeader>

              <IonCardContent>
                <IonItem lines="none">
                  <IonLabel>Contact</IonLabel>
                  <IonNote slot="end">{expense.contactName}</IonNote>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>Datum</IonLabel>
                  <IonNote slot="end">
                    {formatDate(expense.expenseDate)}
                  </IonNote>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>BTW 21%</IonLabel>
                  <IonNote slot="end">
                    {formatCurrency(expense.tax || 0)}
                  </IonNote>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>BTW 9%</IonLabel>
                  <IonNote slot="end">
                    {formatCurrency(expense.taxLow || 0)}
                  </IonNote>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>
                    <strong>Totaal</strong>
                  </IonLabel>
                  <IonNote slot="end" className="total-amount">
                    {formatCurrency(expense.price)}
                  </IonNote>
                </IonItem>
              </IonCardContent>
            </IonCard>

            {expense.expenseFile && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Document</IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="document-content">
                  <div className="document-container">
                    {/* Document shown directly as image */}
                    <div
                      className="document-preview"
                      onClick={() => openDocument(expense.expenseFile || "")}
                    >
                      <img
                        src={getDocumentUrl(expense.expenseFile)}
                        alt="Document bekijken"
                        className="document-thumbnail"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                      <div className="document-fallback hidden">
                        <p>Document preview niet beschikbaar</p>
                        <IonButton
                          expand="block"
                          fill="outline"
                          className="document-button"
                          onClick={() =>
                            openDocument(expense.expenseFile || "")
                          }
                        >
                          <IonIcon slot="start" icon={document} />
                          Document openen in browser
                        </IonButton>
                      </div>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            )}
          </>
        ) : (
          <div className="error-container">
            <p>Geen kosten gevonden met ID: {id}</p>
          </div>
        )}

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Kosten verwijderen"
          message="Weet je zeker dat je deze kosten wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
          buttons={[
            {
              text: "Annuleren",
              role: "cancel",
            },
            {
              text: "Verwijderen",
              role: "destructive",
              handler: handleDelete,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ExpenseDetailsPage;
