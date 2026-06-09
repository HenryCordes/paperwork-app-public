import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  IonModal,
  IonDatetime,
  IonImg,
  IonList,
  IonListHeader,
  IonCard,
  IonCardContent,
  IonToast,
  IonText,
  IonNote,
  IonCheckbox,
  IonChip,
  // IonSelect,
  //  IonSelectOption,
} from "@ionic/react";
import {
  camera,
  trash,
  saveOutline,
  checkmarkCircle,
  informationCircle,
  close,
  document,
} from "ionicons/icons";
import {
  useExpenseById,
  useCreateOrUpdateExpense,
  useUploadDocument,
} from "../../../hooks/useExpenses";
import { useScan, ScanResult } from "../../../hooks/useScan";
import { useContactsList } from "../../../hooks/useContacts";
import { ExpenseCreateUpdateRequest } from "../../../api/types/expenses";
import { formatISO } from "date-fns";
import DOMPurify from "dompurify";
import useDocuments from "../../../hooks/useDocuments";
import "./styles.css";
import Select from "../../../components/Select";

// Default empty expense form values
const defaultExpense: ExpenseCreateUpdateRequest = {
  contactId: "",
  contactName: "",
  expenseNumber: 0,
  expenseDate: formatISO(new Date(), { representation: "date" }),
  info: "",
  tax: 0,
  taxLow: 0,
  priceWOTaxes: 0,
  price: 0,
};

const ExpenseEditPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const history = useHistory();
  const { openDocument, getDocumentUrl } = useDocuments();

  // States
  const [formData, setFormData] =
    useState<ExpenseCreateUpdateRequest>(defaultExpense);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Scan related states
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [, setScanImagePath] = useState<string | null>(null);
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [selectedValues, setSelectedValues] = useState<{
    date: boolean;
    total: boolean;
    taxLow: boolean;
    taxHigh: boolean;
  }>({ date: false, total: false, taxLow: false, taxHigh: false });

  // Debug mode receipt testing states
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [receiptName, setReceiptName] = useState("");
  const [expectedValues, setExpectedValues] = useState({
    total: 0,
    taxLow: 0,
    taxHigh: 0,
    date: new Date().toISOString().split("T")[0],
  });

  const createOrUpdateExpense = useCreateOrUpdateExpense();
  const uploadDocument = useUploadDocument();
  const { scanDocument, isScanning, logReceiptDataForTesting, debugMode } =
    useScan();

  const { data: contactsData, error: contactsError } = useContactsList();

  const {
    data: expenseData,
    isLoading: isLoadingExpense,
    error: expenseError,
  } = useExpenseById(id);

  // Handle any error silently if we're in create mode
  const hasExpenseError = expenseError && id === "create";

  // Set form data when expense data is loaded (edit mode only)
  useEffect(() => {
    // Reset form to default state when creating a new expense
    if (id === "create") {
      setFormData(defaultExpense);
      setPreviewUrl(null);
      setSelectedFile(null);
      return;
    }

    // Load expense data if in edit mode and data is available
    if (id !== "create" && expenseData && expenseData.data) {
      const expense = expenseData.data;
      setFormData({
        _id: expense._id,
        contactId: expense.contactId,
        contactName: expense.contactName,
        expenseNumber: expense.expenseNumber,
        expenseDate: expense.expenseDate,
        info: expense.info,
        tax: expense.tax,
        taxLow: expense.taxLow,
        priceWOTaxes: expense.priceWOTaxes,
        price: expense.price,
        expenseFile: expense.expenseFile,
      });

      // Set document preview if available
      if (expense.expenseFile) {
        setPreviewUrl(getDocumentUrl(expense.expenseFile));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseData, id]);

  // Handle form input changes
  const handleInputChange = (
    e: CustomEvent,
    field: keyof ExpenseCreateUpdateRequest
  ) => {
    const value = e.detail.value;

    setFormData((prev) => {
      // Handle numeric fields
      if (
        field === "tax" ||
        field === "price" ||
        field === "taxLow" ||
        field === "expenseNumber"
      ) {
        const numValue = parseFloat(value) || 0;
        const updatedData = { ...prev, [field]: numValue };

        // If price or tax changes, calculate priceWOTaxes or tax
        if (field === "price" || field === "tax" || field === "taxLow") {
          if (field === "price") {
            updatedData.price = numValue;
          } else if (field === "tax") {
            updatedData.tax = numValue;
          } else if (field === "taxLow") {
            updatedData.taxLow = numValue;
          }
        }

        return updatedData;
      }
      // Handle string fields
      return { ...prev, [field]: value };
    });
  };

  // Handle date selection
  const handleDateSelect = (value: string) => {
    setFormData((prev) => ({ ...prev, expenseDate: value }));
    setShowDatePicker(false);
  };

  // Remove selected document
  const handleRemoveDocument = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setScanImagePath(null);
    setFormData((prev) => ({ ...prev, expenseFile: undefined }));
  };

  // Handle document scanning
  const handleScan = async () => {
    try {
      const result = await scanDocument();

      if (result) {
        // Set scan result and show the modal for selecting data
        setScanResult(result);
        setPreviewUrl(result.imageUrl);
        setScanImagePath(result.imagePath);

        // For debug mode, show the debug modal first
        if (debugMode) {
          // Initialize the expected values with the detected values
          setExpectedValues({
            total: result.receiptInfo?.total || 0,
            taxLow: result.receiptInfo?.taxLow || 0,
            taxHigh: result.receiptInfo?.taxHigh || 0,
            date: result.receiptInfo?.date
              ? new Date(result.receiptInfo.date).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
          });
          setShowDebugModal(true);
        } else {
          setShowScanOptions(true);
        }

        // Reset selections to default (all selected)
        setSelectedValues({
          date: true,
          total: true,
          taxLow: true,
          taxHigh: true,
        });

        // Convert the scanned image to a File object for upload
        try {
          const response = await fetch(result.imageUrl);
          const blob = await response.blob();

          // Generate filename with vendor and date from OCR
          const vendor = result.rawText[0] || "onbekend";
          const date = result.receiptInfo?.date
            ? new Date(result.receiptInfo.date)
                .toISOString()
                .split("T")[0]
                .replace(/-/g, "")
            : new Date().toISOString().split("T")[0].replace(/-/g, "");
          const timestamp = new Date().getTime();

          // Sanitize vendor name for filename (remove special characters)
          const sanitizedVendor = vendor
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .substring(0, 30);

          const fileName = `bon_${sanitizedVendor}_${date}_${timestamp}.jpg`;
          const file = new File([blob], fileName, { type: "image/jpeg" });

          setSelectedFile(file);
        } catch (fileError) {
          console.error("Error converting scanned image to File:", fileError);
        }
      } else {
        setToastMessage("Kon niet scannen of geen document gevonden");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Scan error", error);
      setToastMessage("Er is een fout opgetreden tijdens het scannen");
      setShowToast(true);
    }
  };

  // Apply selected scanned values to the form
  const applyScannedValues = () => {
    if (scanResult && scanResult.receiptInfo) {
      const updates: Partial<ExpenseCreateUpdateRequest> = {};

      // Apply date if selected
      if (selectedValues.date) {
        updates.expenseDate = formatISO(scanResult.receiptInfo.date, {
          representation: "date",
        });
      }

      // Apply total amount if selected
      if (selectedValues.total) {
        updates.price = scanResult.receiptInfo.total;
      }

      // Apply taxLow if selected
      if (selectedValues.taxLow) {
        updates.taxLow = scanResult.receiptInfo.taxLow;
      }

      // Apply taxHigh if selected
      if (selectedValues.taxHigh) {
        updates.tax = scanResult.receiptInfo.taxHigh;
      }

      // Set description (info) with company name or "Bon" if not set already
      if (!formData.info || formData.info.trim() === "") {
        updates.info =
          scanResult.rawText.length > 0 ? scanResult.rawText[0] : "Bon";
      }

      // Update form data
      setFormData((prev) => ({
        ...prev,
        ...updates,
      }));

      // Close the scan options modal
      setShowScanOptions(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Upload document if selected
      let fileLocation = formData.expenseFile;
      if (selectedFile) {
        const result = await uploadDocument.mutateAsync(selectedFile);
        fileLocation = result;
      }

      // Prepare final form data with document location
      const finalFormData = {
        ...formData,
        expenseFile: fileLocation,
        // Include ID for updates but not for creates
        ...(id && id !== "create" ? { _id: id } : {}),
      };

      await createOrUpdateExpense.mutateAsync(finalFormData);

      if (id && id !== "create") {
        setToastMessage("Kosten bijgewerkt");
      } else {
        setToastMessage("Kosten aangemaakt");
      }

      setShowToast(true);

      // Navigate back to expenses list after short delay
      setTimeout(() => {
        history.goBack();
        // history.push("/expenses");
      }, 1500);
    } catch (error) {
      console.error("Error saving expense:", error);
      setToastMessage("Fout bij opslaan van kosten");
      setShowToast(true);
    }
  };

  // Show loading spinner only when in edit mode and still loading
  if (id !== "create" && isLoadingExpense) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/expenses" text="" />
            </IonButtons>
            <IonTitle>Kosten Bewerken</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner />
            <p>Kosten laden...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Show error page if we're in edit mode and have an error
  if (hasExpenseError) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/expenses" text="" />
            </IonButtons>
            <IonTitle>Kosten Bewerken</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="error-container">
            <IonText color="danger">
              <h2>Fout bij laden</h2>
              <p>De opgevraagde kosten konden niet worden geladen.</p>
            </IonText>
            <IonButton expand="block" onClick={() => history.push("/expenses")}>
              Terug naar overzicht
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/expenses" text="" />
          </IonButtons>
          <IonTitle>
            Kosten {id !== "create" ? "Bewerken" : "Toevoegen"}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={handleSubmit}
              disabled={createOrUpdateExpense.isPending}
            >
              <IonIcon slot="icon-only" icon={saveOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <form className="expense-form">
          {/* Document section - Moved to the top */}
          <div className="document-section">
            <IonText color="medium">
              <h2>Document</h2>
            </IonText>

            {previewUrl ? (
              <IonCard className="document-preview-card">
                <img
                  src={DOMPurify.sanitize(previewUrl)}
                  alt="Document preview"
                  className="document-preview"
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
                    onClick={() => openDocument(formData.expenseFile || "")}
                  >
                    <IonIcon slot="start" icon={document} />
                    Document openen in browser
                  </IonButton>
                </div>
                <div className="document-actions">
                  <IonButton
                    fill="clear"
                    color="danger"
                    onClick={handleRemoveDocument}
                  >
                    <IonIcon slot="icon-only" icon={trash} />
                  </IonButton>
                  {scanResult && scanResult.receiptInfo && (
                    <IonButton
                      fill="clear"
                      color="primary"
                      onClick={() => setShowScanOptions(true)}
                    >
                      <IonIcon slot="icon-only" icon={informationCircle} />
                    </IonButton>
                  )}
                </div>

                {scanResult && scanResult.receiptInfo && (
                  <div className="scan-info-chips">
                    {selectedValues.date && (
                      <IonChip>
                        <IonLabel>
                          Datum:{" "}
                          {new Date(
                            scanResult.receiptInfo.date
                          ).toLocaleDateString()}
                        </IonLabel>
                        <IonIcon icon={checkmarkCircle} color="success" />
                      </IonChip>
                    )}
                    {selectedValues.total && (
                      <IonChip>
                        <IonLabel>
                          Bedrag: €{scanResult.receiptInfo.total.toFixed(2)}
                        </IonLabel>
                        <IonIcon icon={checkmarkCircle} color="success" />
                      </IonChip>
                    )}
                    {selectedValues.taxLow &&
                      scanResult.receiptInfo.taxLow > 0 && (
                        <IonChip>
                          <IonLabel>
                            BTW Laag: €
                            {scanResult.receiptInfo.taxLow.toFixed(2)}
                          </IonLabel>
                          <IonIcon icon={checkmarkCircle} color="success" />
                        </IonChip>
                      )}
                    {selectedValues.taxHigh &&
                      scanResult.receiptInfo.taxHigh > 0 && (
                        <IonChip>
                          <IonLabel>
                            BTW Hoog: €
                            {scanResult.receiptInfo.taxHigh.toFixed(2)}
                          </IonLabel>
                          <IonIcon icon={checkmarkCircle} color="success" />
                        </IonChip>
                      )}
                  </div>
                )}
              </IonCard>
            ) : (
              <div className="document-upload">
                <div className="upload-buttons">
                  <IonButton
                    expand="block"
                    color="secondary"
                    onClick={handleScan}
                    disabled={isScanning}
                    className="full-width-button"
                  >
                    <IonIcon slot="start" icon={camera} />
                    {isScanning ? <IonSpinner name="dots" /> : "Bon Scannen"}
                  </IonButton>
                </div>
              </div>
            )}
          </div>

          {/* Basic expense information */}
          <div className="edit-expense-container">
            <IonItem>
              <IonLabel position="stacked">Omschrijving</IonLabel>
              <IonInput
                value={formData.info}
                onIonInput={(e) => handleInputChange(e, "info")}
                placeholder="Voer omschrijving in"
                required
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Contact</IonLabel>
              <Select
                label="Contact"
                placeholder="Selecteer een contact"
                options={
                  contactsData?.data.docs.map((contact) => ({
                    value: contact._id,
                    label: contact.companyName,
                  })) || []
                }
                value={formData.contactId}
                onIonChange={(e) => {
                  const selectedId = e.detail.value;
                  const selectedContact = contactsData?.data.docs.find(
                    (contact) => contact._id === selectedId
                  );
                  setFormData((prev) => ({
                    ...prev,
                    contactId: selectedId,
                    contactName: selectedContact?.companyName || "",
                  }));
                }}
              />
              {contactsError && (
                <IonNote color="danger">
                  Fout bij het laden van contacten
                </IonNote>
              )}
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Datum</IonLabel>
              <IonInput
                value={new Date(formData.expenseDate).toLocaleDateString()}
                readonly
                onClick={() => setShowDatePicker(true)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">BTW 21%</IonLabel>
              <IonInput
                type="number"
                value={formData.tax}
                onIonInput={(e) => handleInputChange(e, "tax")}
                placeholder="21"
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">BTW 9%</IonLabel>
              <IonInput
                type="number"
                value={formData.taxLow}
                onIonInput={(e) => handleInputChange(e, "taxLow")}
                placeholder="21"
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Bedrag (incl. BTW)</IonLabel>
              <IonInput
                type="number"
                value={formData.price}
                onIonInput={(e) => handleInputChange(e, "price")}
                placeholder="0.00"
              />
            </IonItem>
          </div>

          {/* Submit button */}
          {/* <div className="form-actions"> */}
          <IonButton
            expand="block"
            className="submit-button"
            onClick={handleSubmit}
            disabled={createOrUpdateExpense.isPending}
          >
            {createOrUpdateExpense.isPending ? (
              <IonSpinner name="dots" />
            ) : (
              <>
                <IonIcon slot="start" icon={saveOutline} />
                {id !== "create" ? "Opslaan" : "toevoegen"}
              </>
            )}
          </IonButton>
          {/* </div> */}
        </form>

        {/* Date picker modal */}
        <IonModal
          isOpen={showDatePicker}
          onDidDismiss={() => setShowDatePicker(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Kies een datum</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDatePicker(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonDatetime
              value={formData.expenseDate}
              onIonChange={(e) => handleDateSelect(e.detail.value as string)}
              presentation="date"
              locale="nl-NL"
            />
          </IonContent>
        </IonModal>

        {/* Scan options modal */}
        <IonModal
          isOpen={showScanOptions}
          onDidDismiss={() => setShowScanOptions(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Gescande gegevens</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowScanOptions(false)}>
                  <IonIcon slot="icon-only" icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {scanResult && scanResult.receiptInfo ? (
              <>
                <IonCard className="scan-preview-card">
                  <IonCardContent>
                    <IonImg
                      src={DOMPurify.sanitize(scanResult.imageUrl)}
                      alt="Scanned receipt"
                      className="scan-preview-image"
                    />
                  </IonCardContent>
                </IonCard>

                <IonListHeader>
                  <IonLabel>Kies gegevens om over te nemen</IonLabel>
                </IonListHeader>

                <IonList>
                  <IonItem>
                    <IonLabel>
                      <h2>Datum</h2>
                      <IonNote>
                        {new Date(
                          scanResult.receiptInfo.date
                        ).toLocaleDateString()}
                      </IonNote>
                    </IonLabel>
                    <IonCheckbox
                      checked={selectedValues.date}
                      onIonChange={(e) =>
                        setSelectedValues((prev) => ({
                          ...prev,
                          date: e.detail.checked,
                        }))
                      }
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel>
                      <h2>Totaalbedrag</h2>
                      <IonNote>
                        €{scanResult.receiptInfo.total.toFixed(2)}
                      </IonNote>
                    </IonLabel>
                    <IonCheckbox
                      checked={selectedValues.total}
                      onIonChange={(e) =>
                        setSelectedValues((prev) => ({
                          ...prev,
                          total: e.detail.checked,
                        }))
                      }
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel>
                      <h2>BTW Laag (9%)</h2>
                      <IonNote>
                        €{scanResult.receiptInfo.taxLow.toFixed(2)}
                      </IonNote>
                    </IonLabel>
                    <IonCheckbox
                      checked={selectedValues.taxLow}
                      onIonChange={(e) =>
                        setSelectedValues((prev) => ({
                          ...prev,
                          taxLow: e.detail.checked,
                        }))
                      }
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel>
                      <h2>BTW Hoog (21%)</h2>
                      <IonNote>
                        €{scanResult.receiptInfo.taxHigh.toFixed(2)}
                      </IonNote>
                    </IonLabel>
                    <IonCheckbox
                      checked={selectedValues.taxHigh}
                      onIonChange={(e) =>
                        setSelectedValues((prev) => ({
                          ...prev,
                          taxHigh: e.detail.checked,
                        }))
                      }
                    />
                  </IonItem>
                </IonList>

                <div className="scan-options-buttons">
                  <IonButton expand="block" onClick={applyScannedValues}>
                    Geselecteerde waarden toepassen
                  </IonButton>
                </div>
              </>
            ) : (
              <div className="scan-error-container">
                <IonText color="danger">
                  <h2>Geen gegevens gevonden</h2>
                  <p>
                    Het scannen heeft geen bruikbare gegevens opgeleverd.
                    Probeer opnieuw te scannen of voer de gegevens handmatig in.
                  </p>
                </IonText>
              </div>
            )}
          </IonContent>
        </IonModal>

        {/* Debug Modal for Receipt Testing */}
        <IonModal
          isOpen={showDebugModal}
          onDidDismiss={() => setShowDebugModal(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Receipt Debug Mode</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDebugModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <h2>Name this receipt for testing</h2>
            <IonItem>
              <IonLabel position="stacked">
                Receipt Name (e.g. store name)
              </IonLabel>
              <IonInput
                value={receiptName}
                onIonChange={(e) => setReceiptName(e.detail.value || "")}
                placeholder="e.g., Kwalitaria, Albert Heijn"
              />
            </IonItem>

            <h3 className="ion-padding-top">Expected Values (Ground Truth)</h3>
            <p>Enter the actual values from the paper receipt for testing:</p>

            <IonItem>
              <IonLabel position="stacked">Total Amount</IonLabel>
              <IonInput
                type="number"
                value={expectedValues.total}
                onIonChange={(e) => {
                  const value = parseFloat(e.detail.value || "0");
                  setExpectedValues((prev) => ({ ...prev, total: value }));
                }}
                placeholder="0.00"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Tax Low (9%)</IonLabel>
              <IonInput
                type="number"
                value={expectedValues.taxLow}
                onIonChange={(e) => {
                  const value = parseFloat(e.detail.value || "0");
                  setExpectedValues((prev) => ({ ...prev, taxLow: value }));
                }}
                placeholder="0.00"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Tax High (21%)</IonLabel>
              <IonInput
                type="number"
                value={expectedValues.taxHigh}
                onIonChange={(e) => {
                  const value = parseFloat(e.detail.value || "0");
                  setExpectedValues((prev) => ({ ...prev, taxHigh: value }));
                }}
                placeholder="0.00"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Date (YYYY-MM-DD)</IonLabel>
              <IonInput
                type="date"
                value={expectedValues.date}
                onIonChange={(e) => {
                  setExpectedValues((prev) => ({
                    ...prev,
                    date:
                      e.detail.value || new Date().toISOString().split("T")[0],
                  }));
                }}
              />
            </IonItem>

            <div className="ion-padding-top">
              <IonButton
                expand="block"
                onClick={() => {
                  // Log the receipt data in test-friendly format
                  if (scanResult && scanResult.rawTextElements) {
                    // Convert rawTextElements to expected TextDetections format
                    const textDetections = scanResult.rawTextElements.map(
                      (el) => ({
                        text: el.text || "",
                        topLeft: el.topLeft || [0, 0],
                        topRight: el.topRight || [0, 0],
                        bottomLeft: el.bottomLeft || [0, 0],
                        bottomRight: el.bottomRight || [0, 0],
                      })
                    );

                    logReceiptDataForTesting({ textDetections }, receiptName);

                    // Log the expected values for easier test creation
                    console.log(
                      `\n==BON== EXPECTED VALUES: ${receiptName} ==BON==`
                    );
                    console.log(
                      `const expectedTotal = ${expectedValues.total};`
                    );
                    console.log(
                      `const expectedTaxLow = ${expectedValues.taxLow};`
                    );
                    console.log(
                      `const expectedTaxHigh = ${expectedValues.taxHigh};`
                    );
                    console.log(
                      `const expectedDateStr = "${expectedValues.date}";`
                    );
                    console.log(`==BON== END EXPECTED VALUES ==BON==\n`);

                    // Close debug modal and show options
                    setShowDebugModal(false);
                    setShowScanOptions(true);

                    // Show confirmation toast
                    setToastMessage("Test data logged to console");
                    setShowToast(true);
                  }
                }}
              >
                Log Receipt Test Data
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* Direct scanning now, no action sheet */}

        {/* Toast messages */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default ExpenseEditPage;
