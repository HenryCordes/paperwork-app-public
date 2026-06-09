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
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonLoading,
  IonAlert,
  IonToggle,
  IonDatetime,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  isPlatform,
} from "@ionic/react";
import { chevronBackCircleOutline, saveOutline } from "ionicons/icons";
import "tinymce/tinymce";
import "tinymce/models/dom";
import "tinymce/icons/default";
import "tinymce/themes/silver";
//import "tinymce/plugins/paste";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/table";
import "tinymce/skins/ui/oxide-dark/skin.min.css";
import "tinymce/skins/ui/oxide-dark/content.min.css";
import "tinymce/skins/content/default/content.min.css";
import { Editor } from "@tinymce/tinymce-react";
import {
  useEmailById,
  useCreateOrUpdateEmail,
  useSendEmail,
} from "../../../hooks/useEmails";
import { EmailCreateUpdateRequest } from "../../../api/types/emails";
import { useContactsList } from "../../../hooks/useContacts";
import { useInvoicesList } from "../../../hooks/useInvoices";
import "./styles.css";
import Select from "../../../components/Select";
import { MIN_SCREEN_WIDTH } from "../../../common/versionConstants";

interface EmailEditParams {
  id: string;
}

const EmailEditPage: React.FC = () => {
  const { id } = useParams<EmailEditParams>();
  const isCreateMode = id === "create";
  const pageTitle = isCreateMode ? "Nieuwe Email" : "Email Bewerken";
  const history = useHistory();
  const [darkMode, setDarkMode] = useState(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const { data: emailResponse, isLoading: isLoadingEmail } = useEmailById(id);
  const createOrUpdateEmail = useCreateOrUpdateEmail();
  const sendEmail = useSendEmail();

  const { data: contactsData } = useContactsList({ offset: 0 });
  const { data: invoicesData } = useInvoicesList({ offset: 0, limit: 100 });
  const contacts = contactsData?.data.docs;
  const invoices = invoicesData?.data.docs;

  const [formData, setFormData] = useState<EmailCreateUpdateRequest>({
    send: false,
    emailDate: new Date().toISOString(),
    subject: "",
    body: "",
    contactId: "",
    contactName: "",
    contactEmail: "",
    emailNumber: 0,
  });

  const [saving, setSaving] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initialize form with existing email data when editing
  useEffect(() => {
    if (!isCreateMode && emailResponse?.data) {
      const email = emailResponse.data;
      setFormData({
        _id: email._id,
        send: email.send,
        emailDate: email.emailDate,
        subject: email.subject,
        body: email.body,
        invoiceId: email.invoiceId,
        contactId: email.contactId,
        contactName: email.contactName,
        contactEmail: email.contactEmail,
        emailNumber: email.emailNumber,
      });
    } else if (isCreateMode) {
      // Generate a new email number for new emails
      // In a real app, you might fetch this from the backend
      const nextEmailNumber = Math.floor(1000 + Math.random() * 9000);
      setFormData((prev) => ({
        ...prev,
        emailNumber: nextEmailNumber,
      }));
    }
  }, [isCreateMode, emailResponse]);

  const handleInputChange = (
    e: CustomEvent,
    field: keyof EmailCreateUpdateRequest
  ) => {
    const value = e.detail.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field if it exists
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBodyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      body: value,
    }));

    // Clear error for this field if it exists
    if (formErrors.body) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.body;
        return newErrors;
      });
    }
  };

  const handleToggleChange = (field: keyof EmailCreateUpdateRequest) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleContactChange = (e: CustomEvent) => {
    const contactId = e.detail.value;
    const selectedContact = contacts?.find(
      (contact) => contact._id === contactId
    );

    if (selectedContact) {
      setFormData((prev) => ({
        ...prev,
        contactId,
        contactName:
          selectedContact.typeName === "Particulier"
            ? `${selectedContact.lastName}, ${selectedContact.firstName}`
            : selectedContact.companyName,
        contactEmail: selectedContact.emailAddress || "",
      }));

      // Clear errors
      if (formErrors.contactId) {
        setFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.contactId;
          return newErrors;
        });
      }
    }
  };

  // Handle invoice selection
  const handleInvoiceChange = (e: CustomEvent) => {
    const invoiceId = e.detail.value;
    setFormData((prev) => ({
      ...prev,
      invoiceId,
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      errors.subject = "Onderwerp is verplicht";
    }

    if (!formData.contactId) {
      errors.contactId = "Contactpersoon is verplicht";
    }

    if (!formData.emailDate) {
      errors.emailDate = "Datum is verplicht";
    }

    if (!formData.body.trim()) {
      errors.body = "Email inhoud is verplicht";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // Prepare final form data
      const finalFormData: EmailCreateUpdateRequest = {
        ...formData,
      };

      await createOrUpdateEmail.mutateAsync(finalFormData);

      // Navigate back to email details page
      history.push(isCreateMode ? "/emails" : `/emails/${id}`);
    } catch (error) {
      console.error("Error saving email:", error);
      setAlertMessage(
        `Fout bij ${isCreateMode ? "aanmaken" : "bewerken"} van email: ${
          (error as Error).message || "Onbekende fout"
        }`
      );
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // Prepare final form data
      const finalFormData: EmailCreateUpdateRequest = {
        ...formData,
      };

      await sendEmail.mutateAsync(finalFormData);

      // Navigate back to email details page
      history.push(isCreateMode ? "/emails" : `/emails/${id}`);
    } catch (error) {
      console.error("Error sending email:", error);
      setAlertMessage(
        `Fout bij ${isCreateMode ? "aanmaken" : "bewerken"} van email: ${
          (error as Error).message || "Onbekende fout"
        }`
      );
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      console.log(`${e.matches ? "Dark" : "Light"} mode detected`);
      setDarkMode(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/emails" />
          </IonButtons>
          <IonTitle>{pageTitle}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSubmit}>
              <IonIcon slot="icon-only" icon={saveOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {isLoadingEmail && !isCreateMode && (
          <IonLoading isOpen={true} message="Email laden..." />
        )}

        <div className="email-form-container">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Email Informatie</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked" className="required-field">
                    Email Nummer
                  </IonLabel>
                  <IonInput
                    type="number"
                    value={formData.emailNumber}
                    onIonChange={(e) => handleInputChange(e, "emailNumber")}
                    placeholder="Email nummer"
                    readonly
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked" className="required-field">
                    Onderwerp
                  </IonLabel>
                  <IonInput
                    value={formData.subject}
                    onIonChange={(e) => handleInputChange(e, "subject")}
                    placeholder="Onderwerp van de email"
                  />
                  {formErrors.subject && (
                    <div className="form-error">{formErrors.subject}</div>
                  )}
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked" className="required-field">
                    Contactpersoon
                  </IonLabel>

                  <Select
                    label="Contactpersoon"
                    placeholder="Selecteer contactpersoon"
                    options={
                      contacts?.map((contact) => ({
                        value: contact._id,
                        label:
                          contact.typeName === "Particulier"
                            ? `${contact.lastName}, ${contact.firstName}`
                            : contact.companyName,
                      })) || []
                    }
                    value={formData.contactId}
                    onIonChange={handleContactChange}
                  />
                  {formErrors.contactId && (
                    <div className="form-error">{formErrors.contactId}</div>
                  )}
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked" className="required-field">
                    Datum
                  </IonLabel>
                  <IonDatetime
                    presentation="date"
                    value={formData.emailDate}
                    onIonChange={(e) => handleInputChange(e, "emailDate")}
                  />
                  {formErrors.emailDate && (
                    <div className="form-error">{formErrors.emailDate}</div>
                  )}
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">
                    Gekoppelde Factuur (Optioneel)
                  </IonLabel>

                  <Select
                    label="Gekoppelde Factuur"
                    placeholder="Selecteer factuur"
                    options={[{ value: "", label: "Geen factuur" }].concat(
                      invoices?.map((invoice) => ({
                        value: invoice._id,
                        label: `#${invoice.invoiceNumber} - ${invoice.contactName}`,
                      })) || []
                    )}
                    value={formData.invoiceId}
                    onIonChange={handleInvoiceChange}
                  />
                </IonItem>

                <IonItem className="status-toggle">
                  <IonLabel>Verzonden</IonLabel>
                  <IonToggle
                    checked={formData.send}
                    onIonChange={() => handleToggleChange("send")}
                  />
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Email Inhoud</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel position="stacked" className="required-field">
                  Bericht
                </IonLabel>
                {isPlatform("android") && <div className="divider" />}
                <Editor
                  key={`editor-${darkMode ? "dark" : "light"}`}
                  apiKey={import.meta.env.VITE_APP_TINYMCE_API_KEY}
                  value={formData.body ? formData.body : ""}
                  init={{
                    // @ts-expect-error - TinyMCE types don't include license_key
                    license_key: "gpl",
                    skin: false,
                    content_css: false,
                    height: 300,
                    //  width: 405,
                    content_style: `body { font-family: 'Lato','Helvetica Neue',Helvetica,Arial,sans-serif; background-color:${
                      darkMode ? "#1C1C1D" : "#ffffff"
                    }; color:${darkMode ? "#ffffff" : "#1C1C1D"};}`,
                    menubar: false,
                    plugins: "link image table",
                    toolbar:
                      "undo redo | formatselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist | link image table | removeformat",
                  }}
                  onEditorChange={(value: string) => {
                    handleBodyChange(value);
                  }}
                />
                {formErrors.body && (
                  <div className="form-error">{formErrors.body}</div>
                )}
              </IonItem>
            </IonCardContent>
          </IonCard>

          <div className="form-actions">
            <IonButton fill="outline" onClick={() => history.goBack()}>
              {window.innerWidth < MIN_SCREEN_WIDTH ? (
                <IonIcon slot="icon-only" icon={chevronBackCircleOutline} />
              ) : (
                "Annuleren"
              )}
            </IonButton>
            <IonButton onClick={handleSubmit} strong disabled={saving}>
              {saving ? "Opslaan..." : "Opslaan"}
            </IonButton>
            <IonButton onClick={handleSendEmail} strong disabled={saving}>
              {saving ? "Verzenden..." : "Verzenden"}
            </IonButton>
          </div>
        </div>

        {/* Error alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Error"
          message={alertMessage}
          buttons={["OK"]}
        />

        {/* Loading overlay while saving */}
        <IonLoading isOpen={saving} message="Email opslaan..." />
      </IonContent>
    </IonPage>
  );
};

export default EmailEditPage;
