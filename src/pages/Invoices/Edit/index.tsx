import React, { useState, useEffect } from "react";
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
  IonItem,
  IonLabel,
  IonInput,
  IonDatetime,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonToast,
  IonItemDivider,
  IonTextarea,
  IonSpinner,
  IonPopover,
} from "@ionic/react";
import { add, calendar, saveOutline, trash } from "ionicons/icons";
import { useInvoiceById, useCreateOrUpdateInvoice } from "../../../hooks/useInvoices";
import { useContactsList } from "../../../hooks/useContacts";
import {
  InvoiceCreateUpdateRequest,
  InvoiceLine,
} from "../../../api/types/invoices";
import "./styles.css";
import {
  formatDateForDisplay,
  formatDateForPost,
} from "../../../utils/dateUtils";
import Select from "../../../components/Select";
import { MIN_SCREEN_WIDTH } from "../../../common/versionConstants";

const InvoiceEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const isNewInvoice = id === "create";
  const createOrUpdateMutation = useCreateOrUpdateInvoice();
  const { data: contactsData } = useContactsList({ offset: 0 });

  // State variables
  const [invoiceData, setInvoiceData] = useState<
    Partial<InvoiceCreateUpdateRequest>
  >({
    contactId: "",
    contactName: "",
    invoiceNumber: 0,
    invoiceDate: new Date().toISOString(),
    payDate: undefined,
    priceIncludingTax: 0,
    priceWithoutTaxes: 0,
    tax: 0,
    taxLow: 0,
    taxLowest: 0,
    invoiceLines: [
      {
        _id: `temp-${Date.now()}`,
        description: "",
        numberOfItems: 1,
        priceIncludingTax: 0,
        taxRate: 0,
        totalLinePrice: 0,
      },
    ],
    state: "Openstaand",
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showInvoiceDatePicker, setShowInvoiceDatePicker] = useState(false);
  const [showPayDatePicker, setShowPayDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: fetchedInvoiceData, isLoading } = useInvoiceById(
    isNewInvoice ? undefined : id
  );

  // Set form data when invoice data is loaded
  useEffect(() => {
    if (!isNewInvoice && fetchedInvoiceData?.data) {
      const invoice = fetchedInvoiceData.data;
      setInvoiceData({
        _id: invoice._id,
        contactId: invoice.contactId,
        contactName: invoice.contactName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        payDate: invoice.payDate,
        tax: invoice.tax,
        taxLow: invoice.taxLow,
        taxLowest: invoice.taxLowest,
        priceWithoutTaxes: invoice.priceWithoutTaxes,
        priceIncludingTax: invoice.priceIncludingTax,
        invoiceLines: invoice.invoiceLines.length
          ? invoice.invoiceLines
          : [
              {
                _id: `temp-${Date.now()}`,
                description: "",
                numberOfItems: 1,
                priceIncludingTax: 0,
                taxRate: 0,
                totalLinePrice: 0,
              },
            ],
        state: invoice.state,
      });
    }
  }, [isNewInvoice, fetchedInvoiceData]);

  // Handle contact selection
  const handleContactChange = (contactId: string) => {
    const selectedContact = contactsData?.data.docs.find(
      (c) => c._id === contactId
    );
    if (selectedContact) {
      setInvoiceData({
        ...invoiceData,
        contactId,
        contactName: `${selectedContact.firstName} ${selectedContact.lastName}`,
      });
    }
  };

  const getDateDaysLater = (days: number) => {
    const curr = new Date();
    curr.setDate(curr.getDate() + days);
    return curr.toISOString().substring(0, 10);
  };

  // Handle date selection
  const handleDateSelect = (
    dateValue: string,
    dateType: "invoiceDate" | "payDate"
  ) => {
    setInvoiceData({
      ...invoiceData,
      [dateType]: dateValue,
    });

    if (dateType === "invoiceDate") {
      setShowInvoiceDatePicker(false);
    } else {
      setShowPayDatePicker(false);
    }
  };

  // Add a new invoice line
  const addInvoiceLine = () => {
    const newInvoiceLines = [
      ...(invoiceData.invoiceLines || []),
      {
        _id: `temp-${Date.now()}-${invoiceData.invoiceLines?.length || 0}`,
        description: "",
        numberOfItems: 1,
        priceIncludingTax: 0,
        taxRate: 0,
        totalLinePrice: 0,
      },
    ];

    setInvoiceData({
      ...invoiceData,
      invoiceLines: newInvoiceLines,
    });
  };

  // Remove an invoice line
  const removeInvoiceLine = (index: number) => {
    if (!invoiceData.invoiceLines || invoiceData.invoiceLines.length <= 1) {
      return; // Keep at least one line
    }

    const newInvoiceLines = [...invoiceData.invoiceLines];
    newInvoiceLines.splice(index, 1);

    setInvoiceData({
      ...invoiceData,
      invoiceLines: newInvoiceLines,
    });

    // Recalculate totals after removing a line
    calculateTotals(newInvoiceLines);
  };

  // Update an invoice line field
  const updateInvoiceLine = (
    index: number,
    field: keyof InvoiceLine,
    value: InvoiceLine[keyof InvoiceLine]
  ) => {
    if (!invoiceData.invoiceLines) return;

    const newInvoiceLines = [...invoiceData.invoiceLines];
    newInvoiceLines[index] = {
      ...newInvoiceLines[index],
      [field]: value,
    };

    // Update line total
    if (field === "numberOfItems" || field === "priceIncludingTax") {
      const line = newInvoiceLines[index];
      const numberOfItems = Number(line.numberOfItems) || 0;
      const priceIncludingTax = Number(line.priceIncludingTax) || 0;
      line.totalLinePrice = numberOfItems * priceIncludingTax;
    }

    setInvoiceData({
      ...invoiceData,
      invoiceLines: newInvoiceLines,
    });

    // Recalculate totals after updating a line
    calculateTotals(newInvoiceLines);
  };

  // Calculate invoice totals based on invoice lines
  const calculateTotals = (invoiceLines: InvoiceLine[]) => {
    const priceIncludingTax = invoiceLines.reduce(
      (sum, line) =>
        sum + Number(line.priceIncludingTax) * Number(line.numberOfItems),
      0
    );

    const taxLowest = invoiceLines
      .filter((line) => line.taxRate === 6)
      .reduce((sum, line) => sum + Number(line.priceIncludingTax) * 0.06, 0);
    const taxLow = invoiceLines
      .filter((line) => line.taxRate === 12)
      .reduce((sum, line) => sum + Number(line.priceIncludingTax) * 0.12, 0);
    const tax = invoiceLines
      .filter((line) => line.taxRate === 21)
      .reduce((sum, line) => sum + Number(line.priceIncludingTax) * 0.21, 0);

    //
    // For simplicity, we're assuming a fixed tax rate (21%)
    // In a real app, you might want to make this configurable or handle different tax rates
    // const taxRate = 0.21;
    // const tax = priceIncludingTax * taxRate;
    const price = priceIncludingTax + tax + taxLow + taxLowest;

    setInvoiceData((prevData) => ({
      ...prevData,
      priceIncludingTax,
      tax,
      taxLow,
      taxLowest,
      price,
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Basic validation
    if (!invoiceData.contactId || !invoiceData.invoiceDate) {
      setToastMessage("Vul alle verplichte velden in");
      return;
    }
    if (invoiceData.invoiceNumber) {
      delete invoiceData.invoiceNumber;
    }
    if (invoiceData.payDate) {
      invoiceData.payDate = formatDateForPost(invoiceData.payDate);
    }
    if (invoiceData.invoiceDate) {
      invoiceData.invoiceDate = formatDateForPost(invoiceData.invoiceDate);
    }

    if (
      !invoiceData.invoiceLines?.length ||
      invoiceData.invoiceLines.some(
        (line) =>
          !line.description || line.numberOfItems <= 0 || !line.priceWOTaxes
      )
    ) {
      setToastMessage("Vul alle factuurregels volledig in");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare invoice lines for submission
      const invoiceLines = invoiceData.invoiceLines?.map((line) => {
        // For existing lines, keep the _id
        // For new lines (with temp IDs), let the server generate the _id
        if (line._id && line._id.startsWith("temp-")) {
          // Clone without the temporary _id
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- _id is destructured out intentionally to exclude temp IDs from submission payload
          const { _id, ...restLine } = line;
          return restLine;
        }
        return line;
      });

      // Create the final form data
      const finalFormData: InvoiceCreateUpdateRequest = {
        ...(invoiceData as InvoiceCreateUpdateRequest),
        // Type assertion to handle the _id requirement in the type
        // The API will handle new lines without _id correctly
        invoiceLines: invoiceLines as InvoiceLine[],
      };

      // Submit the form
      await createOrUpdateMutation.mutateAsync(finalFormData);

      // Navigate back to the invoices list on success
      history.goBack();
      // history.push("/invoices");
    } catch (error) {
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Er is een fout opgetreden bij het opslaan van de factuur"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/invoices" text="" />
          </IonButtons>
          <IonTitle>
            Factuur {id !== "create" ? "Bewerken" : "Toevoegen"}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <IonSpinner name="dots" />
              ) : (
                <IonIcon slot="icon-only" icon={saveOutline} />
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {isLoading && !isNewInvoice ? (
          <div className="loading-container">
            <IonSpinner />
            <p>Factuur laden...</p>
          </div>
        ) : (
          <form>
            {/* Basic invoice information */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Factuurgegevens</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonItem>
                  <IonLabel position="stacked">Factuurnummer *</IonLabel>
                  <IonInput
                    type="number"
                    value={invoiceData.invoiceNumber}
                    onIonInput={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        invoiceNumber: parseInt(e.detail.value || "0", 10),
                      })
                    }
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Klantnaam *</IonLabel>
                  <Select
                    label="Klantnaam"
                    placeholder="Selecteer een klant"
                    options={
                      contactsData?.data.docs.map((contact) => ({
                        value: contact._id,
                        label: `${contact.firstName} ${contact.lastName} ${
                          contact.companyName && ` (${contact.companyName})`
                        }`,
                      })) || []
                    }
                    value={invoiceData.contactId}
                    onIonChange={(e) => handleContactChange(e.detail.value)}
                  />
                </IonItem>

                <IonItem button onClick={() => setShowInvoiceDatePicker(true)}>
                  <IonLabel position="stacked">Factuurdatum *</IonLabel>
                  <IonInput
                    readonly
                    value={formatDateForDisplay(invoiceData.invoiceDate)}
                    placeholder="Selecteer een datum"
                  ></IonInput>
                  <IonIcon icon={calendar} slot="end" />
                </IonItem>

                <IonItem button onClick={() => setShowPayDatePicker(true)}>
                  <IonLabel position="stacked">Betaaldatum</IonLabel>
                  <IonInput
                    readonly
                    value={
                      invoiceData
                        ? formatDateForDisplay(invoiceData.payDate)
                        : getDateDaysLater(30)
                    }
                    placeholder="Selecteer een datum"
                  ></IonInput>
                  <IonIcon icon={calendar} slot="end" />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Status</IonLabel>
                  <Select
                    label="Status"
                    placeholder="Selecteer een status"
                    options={[
                      { value: "Open", label: "Open" },
                      { value: "Betaald", label: "Betaald" },
                      { value: "Te laat", label: "Te laat" },
                    ]}
                    value={invoiceData.state}
                    onIonChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        state: e.detail.value,
                      })
                    }
                  />
                </IonItem>
              </IonCardContent>
            </IonCard>

            {/* Invoice Lines */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Factuurregels</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {invoiceData.invoiceLines?.map((line, index) => (
                  <div key={line._id || index} className="invoice-line">
                    <div className="invoice-line-header">
                      <h3>Factuurregel {index + 1}</h3>
                      <IonButton
                        fill="clear"
                        color="danger"
                        onClick={() => removeInvoiceLine(index)}
                        disabled={invoiceData.invoiceLines?.length === 1}
                      >
                        <IonIcon icon={trash} slot="icon-only" />
                      </IonButton>
                    </div>

                    <IonItem className="line-item">
                      <IonLabel position="stacked">Omschrijving *</IonLabel>
                      <IonTextarea
                        value={line.description}
                        onIonInput={(e) =>
                          updateInvoiceLine(
                            index,
                            "description",
                            e.detail.value || ""
                          )
                        }
                        rows={2}
                      />
                    </IonItem>

                    <div className="invoice-line-row extra-bottom-margin">
                      <IonItem className="half-width">
                        <IonLabel position="stacked">Aantal *</IonLabel>
                        <IonInput
                          type="number"
                          value={line.numberOfItems}
                          min="1"
                          onIonInput={(e) =>
                            updateInvoiceLine(
                              index,
                              "numberOfItems",
                              parseInt(e.detail.value || "1", 10)
                            )
                          }
                        />
                      </IonItem>

                      <IonItem className="half-width">
                        <IonLabel position="stacked">
                          {window.innerWidth < MIN_SCREEN_WIDTH
                            ? "Prijs incl *"
                            : "Prijs (incl. BTW) *"}
                        </IonLabel>
                        <IonInput
                          type="number"
                          value={line.priceIncludingTax || 0}
                          min="0"
                          step="0.01"
                          onIonInput={(e) =>
                            updateInvoiceLine(
                              index,
                              "priceIncludingTax",
                              parseFloat(e.detail.value || "0")
                            )
                          }
                        />
                      </IonItem>
                    </div>

                    <div className="invoice-line-row">
                      <IonItem className="half-width">
                        <IonLabel position="stacked">BTW</IonLabel>
                        <Select
                          label="BTW"
                          placeholder="BTW %"
                          options={[
                            { value: 0, label: "0%" },
                            { value: 6, label: "6%" },
                            { value: 12, label: "12%" },
                            { value: 21, label: "21%" },
                          ]}
                          value={line.taxRate}
                          onIonChange={(e) =>
                            updateInvoiceLine(index, "taxRate", e.detail.value)
                          }
                        />
                      </IonItem>

                      <IonItem className="half-width">
                        <IonLabel position="stacked">
                          {window.innerWidth < MIN_SCREEN_WIDTH
                            ? "Totaal incl"
                            : "Totaal (incl. BTW)"}
                        </IonLabel>
                        <div className="total-line-price">
                          {(
                            (line.priceIncludingTax || 0) * line.numberOfItems
                          ).toFixed(2)}
                        </div>
                      </IonItem>
                    </div>
                    <IonItemDivider />
                  </div>
                ))}

                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={addInvoiceLine}
                  className="add-line-button"
                >
                  <IonIcon icon={add} slot="start" />
                  Factuurregel toevoegen
                </IonButton>

                {/* Invoice Summary */}
                <div className="invoice-summary">
                  <div className="summary-row">
                    <span>Subtotaal</span>
                    <span>
                      €
                      {(invoiceData.priceWithoutTaxes || 0).toLocaleString(
                        "nl-NL",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>
                  {invoiceData.tax && (
                    <div className="summary-row">
                      <span>BTW (21%)</span>
                      <span>
                        €
                        {(invoiceData.tax || 0).toLocaleString("nl-NL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {invoiceData.taxLow && (
                    <div className="summary-row">
                      <span>BTW (9%)</span>
                      <span>
                        €
                        {(invoiceData.taxLow || 0).toLocaleString("nl-NL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {invoiceData.taxLowest && (
                    <div className="summary-row">
                      <span>BTW (6%)</span>
                      <span>
                        €
                        {(invoiceData.taxLowest || 0).toLocaleString("nl-NL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span>Totaal (incl. BTW)</span>
                    <span>
                      €
                      {(invoiceData.priceIncludingTax || 0).toLocaleString(
                        "nl-NL",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          </form>
        )}

        {/* Date Pickers */}
        <IonPopover
          isOpen={showInvoiceDatePicker}
          onDidDismiss={() => setShowInvoiceDatePicker(false)}
        >
          <IonDatetime
            locale="nl-NL"
            value={invoiceData.invoiceDate}
            presentation="date"
            onIonChange={(e) =>
              handleDateSelect(e.detail.value as string, "invoiceDate")
            }
          />
        </IonPopover>

        <IonPopover
          isOpen={showPayDatePicker}
          onDidDismiss={() => setShowPayDatePicker(false)}
        >
          <IonDatetime
            locale="nl-NL"
            value={invoiceData.payDate}
            presentation="date"
            onIonChange={(e) =>
              handleDateSelect(e.detail.value as string, "payDate")
            }
          />
        </IonPopover>

        {/* Toast for error messages */}
        <IonToast
          isOpen={!!toastMessage}
          onDidDismiss={() => setToastMessage(null)}
          message={toastMessage || ""}
          duration={3000}
          color="danger"
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default InvoiceEditPage;
