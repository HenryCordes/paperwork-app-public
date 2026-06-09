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
  IonItem,
  IonLabel,
  IonNote,
  IonLoading,
  IonAlert,
  IonCard,
  IonCardContent,
} from "@ionic/react";
import { create, trash } from "ionicons/icons";
import {
  useEmailById,
  useDeleteEmail,
  useSendEmail,
} from "../../../hooks/useEmails";
import { Email, EmailCreateUpdateRequest } from "../../../api/types/emails";
import "./styles.css";

interface EmailDetailsParams {
  id: string;
}

const EmailDetailsPage: React.FC = () => {
  const { id } = useParams<EmailDetailsParams>();
  const history = useHistory();
  const deleteEmailMutation = useDeleteEmail();
  const sendEmail = useSendEmail();

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const { data: emailResponse, isLoading, isError, error } = useEmailById(id);

  const email: Email | undefined = emailResponse?.data;

  // Format date to a human-readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL");
  };

  // Handle delete email
  const handleDelete = async () => {
    try {
      await deleteEmailMutation.mutateAsync(id);
      // Navigate back to the emails list after successful deletion
      history.push("/emails");
    } catch (error) {
      console.error("Error deleting email:", error);
    }
  };

  // Handle edit email
  const handleEdit = () => {
    history.push(`/emails/edit/${id}`);
  };

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);

      const finalFormData: EmailCreateUpdateRequest = {
        _id: email?._id || "",
        send: email?.send || false,
        emailDate: email?.emailDate || "",
        subject: email?.subject || "",
        body: email?.body || "",
        invoiceId: email?.invoiceId || "",
        contactId: email?.contactId || "",
        contactName: email?.contactName || "",
        contactEmail: email?.contactEmail || "",
        emailNumber: email?.emailNumber || 0,
      };

      await sendEmail.mutateAsync(finalFormData);
      setAlertMessage(`Email successvol verstuurd!`);
      setShowAlert(true);
    } catch (error) {
      setAlertMessage(
        `Fout bij versturen van email: ${
          (error as Error).message || "Onbekende fout"
        }`
      );
      setShowAlert(true);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/emails" text="" />
          </IonButtons>
          <IonTitle>Email Details</IonTitle>
          {email && (
            <IonButtons slot="end">
              <IonButton onClick={handleEdit}>
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
        {isLoading && <IonLoading isOpen={true} message="Email laden..." />}

        {isError && (
          <div className="error-container">
            <p>Fout bij laden email: {error?.message}</p>
          </div>
        )}

        {email && (
          <div className="email-details-container">
            <div className="email-header">
              <h1 className="email-title">
                #{email.emailNumber} - {email.subject}
              </h1>
              <p className="email-meta">
                Gemaakt op: {formatDate(email.createdAt)}
                <span
                  className={`email-status ${
                    email.send ? "status-sent" : "status-draft"
                  }`}
                >
                  {email.send ? "Verzonden" : "Concept"}
                </span>
              </p>
            </div>

            <IonCard>
              <IonCardContent>
                <IonItem lines="full" className="detail-item">
                  <IonLabel>Ontvanger</IonLabel>
                  <IonNote slot="end">{email.contactName || "-"}</IonNote>
                </IonItem>
                <IonItem lines="full" className="detail-item">
                  <IonLabel>Email</IonLabel>
                  <IonNote slot="end">{email.contactEmail || "-"}</IonNote>
                </IonItem>
                <IonItem lines="full" className="detail-item">
                  <IonLabel>Datum</IonLabel>
                  <IonNote slot="end">{formatDate(email.emailDate)}</IonNote>
                </IonItem>
                {email.invoiceId && (
                  <IonItem lines="full" className="detail-item">
                    {/* <IonLabel>Factuur</IonLabel>
                    <IonNote slot="end">{email.invoiceNumber}</IonNote> */}
                    <IonButton
                      slot="end"
                      fill="clear"
                      size="small"
                      onClick={() =>
                        history.push(`/invoices/${email.invoiceId}`)
                      }
                    >
                      Bekijk factuur
                    </IonButton>
                  </IonItem>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardContent>
                <IonItem lines="none" className="detail-item value-below">
                  <IonLabel>Email inhoud</IonLabel>
                </IonItem>
                <div
                  className="email-body"
                  dangerouslySetInnerHTML={{ __html: email.body }}
                />
              </IonCardContent>
            </IonCard>
          </div>
        )}

        <div className="form-actions">
          <IonButton onClick={handleSendEmail} strong disabled={sendingEmail}>
            {sendingEmail ? "Verzenden..." : "Verzenden"}
          </IonButton>
        </div>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Error"
          message={alertMessage}
          buttons={["OK"]}
        />

        {/* Delete confirmation alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Email verwijderen"
          message="Weet je zeker dat je deze email wilt verwijderen?"
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

export default EmailDetailsPage;
