import React from "react";
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
  IonList,
  IonSkeletonText,
  useIonRouter,
  IonButton,
  IonIcon,
  IonAlert,
} from "@ionic/react";
import {
  create,
  trash,
  businessOutline,
  mailOutline,
  callOutline,
  phonePortraitOutline,
  locationOutline,
  cardOutline,
  pricetagOutline,
} from "ionicons/icons";
import { useParams } from "react-router-dom";
import { useContactById, useDeleteContact } from "../../../hooks/useContacts";
import { useToast } from "../../../hooks/useToast";
import "./styles.css";

interface ContactDetailParams {
  id: string;
}

const ContactDetailsPage: React.FC = () => {
  const { id } = useParams<ContactDetailParams>();
  const router = useIonRouter();
  const { showToast } = useToast();
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

  const { data, isLoading, isError, error } = useContactById(id);
  const contact = data?.data;

  const deleteMutation = useDeleteContact();

  // Handle contact deletion
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      showToast("Contact verwijderd", "success");
      router.push("/contacts", "back");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Fout bij verwijderen";
      showToast(`Fout: ${errorMessage}`, "error");
    }
  };

  // Navigate to edit page
  const handleEdit = () => {
    router.push(`/contacts/edit/${id}`);
  };

  if (isError) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/contacts" text="" />
            </IonButtons>
            <IonTitle>Fout</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonCard color="danger">
            <IonCardHeader>
              <IonCardTitle>Fout bij ophalen contact</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {error?.message || "Onbekende fout"}
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/contacts" text="" />
          </IonButtons>
          <IonTitle>
            {isLoading ? (
              <IonSkeletonText animated style={{ width: "60%" }} />
            ) : (
              `${contact?.firstName} ${contact?.lastName}`
            )}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleEdit}>
              <IonIcon slot="icon-only" icon={create} />
            </IonButton>
            <IonButton onClick={() => setShowDeleteAlert(true)}>
              <IonIcon slot="icon-only" icon={trash} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {isLoading ? (
          // Loading skeleton
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonSkeletonText animated style={{ width: "70%" }} />
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {[...Array(6)].map((_, i) => (
                  <IonItem key={i}>
                    <IonLabel>
                      <h3>
                        <IonSkeletonText animated style={{ width: "40%" }} />
                      </h3>
                      <p>
                        <IonSkeletonText animated style={{ width: "70%" }} />
                      </p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        ) : contact ? (
          <>
            {/* Basic Information */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>{contact.companyName}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem lines="none">
                    <IonIcon
                      icon={pricetagOutline}
                      slot="start"
                      color="primary"
                    />
                    <IonLabel>
                      <h2>Klant/Leverancier</h2>
                      <p>{contact.typeOfContact}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="none">
                    <IonIcon
                      icon={pricetagOutline}
                      slot="start"
                      color="primary"
                    />
                    <IonLabel>
                      <h2>Particulier/Bedrijf</h2>
                      <p>{contact.typeName}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="none">
                    <IonIcon
                      icon={businessOutline}
                      slot="start"
                      color="primary"
                    />
                    <IonLabel>
                      <h2>Contactpersoon</h2>
                      <p>
                        {contact.firstName} {contact.lastName}
                      </p>
                    </IonLabel>
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>

            {/* Contact Information */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Contactgegevens</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  {contact.emailAddress && (
                    <IonItem
                      href={`mailto:${contact.emailAddress}`}
                      lines="full"
                    >
                      <IonIcon
                        icon={mailOutline}
                        slot="start"
                        color="primary"
                      />
                      <IonLabel>
                        <h2>Email</h2>
                        <p>{contact.emailAddress}</p>
                      </IonLabel>
                    </IonItem>
                  )}

                  {contact.phoneNumber && (
                    <IonItem href={`tel:${contact.phoneNumber}`} lines="full">
                      <IonIcon
                        icon={callOutline}
                        slot="start"
                        color="primary"
                      />
                      <IonLabel>
                        <h2>Telefoon</h2>
                        <p>{contact.phoneNumber}</p>
                      </IonLabel>
                    </IonItem>
                  )}

                  {contact.mobilePhoneNumber && (
                    <IonItem
                      href={`tel:${contact.mobilePhoneNumber}`}
                      lines="full"
                    >
                      <IonIcon
                        icon={phonePortraitOutline}
                        slot="start"
                        color="primary"
                      />
                      <IonLabel>
                        <h2>Mobiel</h2>
                        <p>{contact.mobilePhoneNumber}</p>
                      </IonLabel>
                    </IonItem>
                  )}
                </IonList>
              </IonCardContent>
            </IonCard>

            {/* Address Information */}
            {(contact.street || contact.city || contact.postalCode) && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Adresgegevens</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    {/* Main Address */}
                    <IonItem lines="full">
                      <IonIcon
                        icon={locationOutline}
                        slot="start"
                        color="primary"
                      />
                      <IonLabel>
                        <h2>Postadres</h2>
                        {contact.street && contact.houseNumber && (
                          <p>
                            {contact.street} {contact.houseNumber}
                          </p>
                        )}
                        {contact.postalCode && contact.city && (
                          <p>
                            {contact.postalCode} {contact.city}
                          </p>
                        )}
                        {contact.country && <p>{contact.country}</p>}
                      </IonLabel>
                    </IonItem>

                    {/* Visiting Address (if different) */}
                    {(contact.visitingStreet || contact.visitingCity) && (
                      <IonItem lines="none">
                        <IonIcon
                          icon={locationOutline}
                          slot="start"
                          color="primary"
                        />
                        <IonLabel>
                          <h2>Bezoekadres</h2>
                          {contact.visitingStreet &&
                            contact.visitingHouseNumber && (
                              <p>
                                {contact.visitingStreet}{" "}
                                {contact.visitingHouseNumber}
                              </p>
                            )}
                          {contact.visitingPostalCode &&
                            contact.visitingCity && (
                              <p>
                                {contact.visitingPostalCode}{" "}
                                {contact.visitingCity}
                              </p>
                            )}
                          {contact.visitingCountry && (
                            <p>{contact.visitingCountry}</p>
                          )}
                        </IonLabel>
                      </IonItem>
                    )}
                  </IonList>
                </IonCardContent>
              </IonCard>
            )}

            {/* Banking Information */}
            {(contact.bankIBAN || contact.bankPersonName) && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Bankgegevens</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    {contact.bankIBAN && (
                      <IonItem lines="full">
                        <IonIcon
                          icon={cardOutline}
                          slot="start"
                          color="primary"
                        />
                        <IonLabel>
                          <h2>IBAN</h2>
                          <p>{contact.bankIBAN}</p>
                        </IonLabel>
                      </IonItem>
                    )}

                    {contact.bankPersonName && (
                      <IonItem lines="none">
                        <IonIcon
                          icon={cardOutline}
                          slot="start"
                          color="primary"
                        />
                        <IonLabel>
                          <h2>Ten name van</h2>
                          <p>{contact.bankPersonName}</p>
                        </IonLabel>
                      </IonItem>
                    )}
                  </IonList>
                </IonCardContent>
              </IonCard>
            )}
          </>
        ) : (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Contact niet gevonden</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              Dit contact bestaat niet of is verwijderd.
            </IonCardContent>
          </IonCard>
        )}

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          header="Contact verwijderen"
          message={`Weet je zeker dat je ${contact?.firstName} ${contact?.lastName} wilt verwijderen?`}
          buttons={[
            {
              text: "Annuleren",
              role: "cancel",
              handler: () => {
                setShowDeleteAlert(false);
              },
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

export default ContactDetailsPage;
