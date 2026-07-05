import React, { useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonLabel,
  IonItem,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSkeletonText,
  IonBadge,
  IonAlert,
  IonSpinner,
} from "@ionic/react";
import {
  trash,
  personOutline,
  calendarOutline,
  cashOutline,
  create,
} from "ionicons/icons";
import { useInvoiceById, useDeleteInvoice } from "../../../hooks/useInvoices";
import { getInvoiceBadgeColor } from "../helpers";
import { formatDateForDisplay } from "../../../utils/dateUtils";
import { useToast } from "../../../hooks/useToast";
import "./styles.css";

const InvoiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { showToast } = useToast();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const { data, isLoading, isError, error } = useInvoiceById(id);
  const invoice = data?.data;

  const deleteMutation = useDeleteInvoice();

  // Format price for display
  const formatPrice = (price?: number) => {
    if (price === undefined) return "-";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  // Handle invoice deletion
  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteMutation.mutateAsync(id);
      showToast("Factuur succesvol verwijderd", "success");
      history.push("/invoices", "back");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Fout bij verwijderen";
      showToast(`Fout: ${errorMessage}`, "error");
    }
  };

  // If error, show error page
  if (isError) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/invoices" text="" />
            </IonButtons>
            <IonTitle>Fout</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>
            Er is een fout opgetreden bij het laden van de factuur:{" "}
            {error?.message || "Onbekende fout"}
          </p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/invoices" text="" />
          </IonButtons>
          <IonTitle>
            {isLoading ? (
              <IonSkeletonText animated style={{ width: "50%" }} />
            ) : (
              `Factuur #${invoice?.invoiceNumber}`
            )}
          </IonTitle>

          {!isLoading && (
            <IonButtons slot="end">
              <IonButton
                onClick={() => history.push(`/invoices/edit/${id}`)}
                color="primary"
              >
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
        {isLoading ? (
          <div className="loading-container">
            <IonSpinner name="circular" />
            <p>Factuur laden...</p>
          </div>
        ) : (
          invoice && (
            <>
              {/* Invoice Header Card */}
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>
                    #{invoice.invoiceNumber} -{" "}
                    {invoice.contactName || "Contact"}
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    <IonItem>
                      <IonIcon icon={personOutline} slot="start" />
                      <IonLabel>
                        <h2>Klant</h2>
                        <p>{invoice.contactName}</p>
                      </IonLabel>
                    </IonItem>

                    <IonItem>
                      <IonIcon icon={calendarOutline} slot="start" />
                      <IonLabel>
                        <h2>Factuurdatum</h2>
                        <p>{formatDateForDisplay(invoice.invoiceDate)}</p>
                      </IonLabel>
                    </IonItem>

                    {invoice.payDate && (
                      <IonItem>
                        <IonIcon icon={calendarOutline} slot="start" />
                        <IonLabel>
                          <h2>Betaaldatum</h2>
                          <p>{formatDateForDisplay(invoice.payDate)}</p>
                        </IonLabel>
                      </IonItem>
                    )}

                    <IonItem lines="none">
                      <IonIcon icon={cashOutline} slot="start" />
                      <IonLabel>
                        <h2>Totaalbedrag</h2>
                        <p className="price-value">
                          {formatPrice(invoice.priceIncludingTax || 0)}
                        </p>
                      </IonLabel>
                    </IonItem>
                    <IonItem lines="none">
                      <IonBadge color={getInvoiceBadgeColor(invoice.state)}>
                        {invoice.state || "Onbekend"}
                      </IonBadge>
                    </IonItem>
                  </IonList>
                </IonCardContent>
              </IonCard>

              {/* Invoice Lines */}
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Factuurregels</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {invoice.invoiceLines && invoice.invoiceLines.length > 0 ? (
                    <>
                      <IonList>
                        {invoice.invoiceLines.map((line, index) => {
                          line.totalLinePrice =
                            line.numberOfItems * line.priceIncludingTax;
                          return (
                            <IonItem
                              key={line._id || index}
                              lines={
                                index === invoice.invoiceLines.length - 1
                                  ? "none"
                                  : "inset"
                              }
                              className="invoice-line-item"
                            >
                              <div className="invoice-line-content">
                                <p>
                                  <span className="invoice-line-description">
                                    {line.description}
                                  </span>
                                  {line.numberOfItems > 0 && (
                                    <span className="invoice-line-quantity">
                                      {line.numberOfItems}x
                                    </span>
                                  )}
                                </p>
                                <p className="price-value">
                                  <span>
                                    {formatPrice(line.priceIncludingTax || 0)}
                                  </span>
                                  <span>{`${line.taxRate || 0}%`}</span>
                                  <span>
                                    {formatPrice(line.totalLinePrice || 0)}
                                  </span>
                                </p>
                              </div>
                            </IonItem>
                          );
                        })}
                      </IonList>

                      <div className="invoice-summary">
                        <div className="summary-row">
                          <span>Subtotaal</span>
                          <span>
                            {formatPrice(invoice.priceWithoutTaxes || 0)}
                          </span>
                        </div>
                        {invoice.tax && (
                          <div className="summary-row">
                            <span>BTW 21%</span>
                            <span>{formatPrice(invoice.tax)}</span>
                          </div>
                        )}
                        {invoice.taxLow && (
                          <div className="summary-row">
                            <span>BTW 9%</span>
                            <span>{formatPrice(invoice.taxLow)}</span>
                          </div>
                        )}
                        <div className="summary-row total">
                          <span>Totaal</span>
                          <span>
                            {formatPrice(invoice.priceIncludingTax || 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="no-lines-message">
                      Geen factuurregels gevonden
                    </p>
                  )}
                </IonCardContent>
              </IonCard>
            </>
          )
        )}

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Factuur verwijderen"
          message="Weet je zeker dat je deze factuur wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
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

export default InvoiceDetailsPage;
