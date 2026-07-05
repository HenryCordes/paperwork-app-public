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
  IonList,
  IonToast,
  IonLoading,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonToggle,
} from "@ionic/react";
import { saveOutline } from "ionicons/icons";
import {
  useContactById,
  useCreateOrUpdateContact,
} from "../../../hooks/useContacts";
import { ContactCreateUpdateRequest } from "../../../api/types/contacts";
import "./styles.css";
import Select from "../../../components/Select";

// Default empty contact form values
const defaultContact: ContactCreateUpdateRequest = {
  companyName: "",
  typeOfContact: "client",
  typeName: "Particulier",
  lastName: "",
  firstName: "",
  initials: "",
  emailAddress: "",
  phoneNumber: "",
  mobilePhoneNumber: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "Nederland",
  visitingStreet: "",
  visitingHouseNumber: "",
  visitingPostalCode: "",
  visitingCity: "",
  visitingCountry: "Nederland",
  bankIBAN: "",
};

const ContactEditPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const history = useHistory();
  const createOrUpdateContact = useCreateOrUpdateContact();

  const [formData, setFormData] =
    useState<Partial<ContactCreateUpdateRequest>>(defaultContact);
  const [sameAddress, setSameAddress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: contactData,
    isLoading: isLoadingContact,
    error: contactError,
  } = useContactById(id);

  // Handle any error silently if we're in create mode
  const hasContactError = contactError && id === "create";

  const typeNameOptions = [
    { value: "Particulier", label: "Particulier" },
    { value: "Bedrijf", label: "Bedrijf" },
  ];

  const typeOfContactOptions = [
    { value: "Klant", label: "Klant" },
    { value: "Leverancier", label: "Leverancier" },
  ];

  // Initialize form with contact data or default values
  useEffect(() => {
    // Reset form to default state when creating a new contact
    if (id === "create") {
      setFormData(defaultContact);
      return;
    }

    // Load contact data if in edit mode and data is available
    if (contactData?.data) {
      const contact = contactData.data;
      // Set form data from contact
      setFormData({
        companyName: contact.companyName || "",
        typeOfContact: contact.typeOfContact || "Klant",
        typeName: contact.typeName || "Particulier",
        lastName: contact.lastName || "",
        firstName: contact.firstName || "",
        initials: contact.initials || "",
        gender: contact.gender,
        emailAddress: contact.emailAddress || "",
        phoneNumber: contact.phoneNumber || "",
        mobilePhoneNumber: contact.mobilePhoneNumber || "",
        street: contact.street || "",
        houseNumber: contact.houseNumber || "",
        postalCode: contact.postalCode || "",
        city: contact.city || "",
        country: contact.country || "Nederland",
        visitingStreet: contact.visitingStreet || "",
        visitingHouseNumber: contact.visitingHouseNumber || "",
        visitingPostalCode: contact.visitingPostalCode || "",
        visitingCity: contact.visitingCity || "",
        visitingCountry: contact.visitingCountry || "Nederland",
        bankIBAN: contact.bankIBAN || "",
        bankPersonName: contact.bankPersonName || "",
      });

      // Check if postal and visiting addresses are the same
      setSameAddress(
        contact.street === contact.visitingStreet &&
          contact.houseNumber === contact.visitingHouseNumber &&
          contact.postalCode === contact.visitingPostalCode &&
          contact.city === contact.visitingCity &&
          contact.country === contact.visitingCountry
      );
    }
  }, [id, contactData]);

  const handleInputChange = (
    field: keyof ContactCreateUpdateRequest,
    value: string
  ) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));

    if (
      sameAddress &&
      (field === "street" ||
        field === "houseNumber" ||
        field === "postalCode" ||
        field === "city" ||
        field === "country")
    ) {
      const visitingField = `visiting${
        field.charAt(0).toUpperCase() + field.slice(1)
      }` as keyof ContactCreateUpdateRequest;
      setFormData((prevData) => ({
        ...prevData,
        [visitingField]: value,
      }));
    }
  };

  const handleSameAddressToggle = (checked: boolean) => {
    setSameAddress(checked);

    if (checked) {
      setFormData((prevData) => ({
        ...prevData,
        visitingStreet: prevData.street,
        visitingHouseNumber: prevData.houseNumber,
        visitingPostalCode: prevData.postalCode,
        visitingCity: prevData.city,
        visitingCountry: prevData.country,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.companyName ||
      !formData.emailAddress
    ) {
      setErrorMessage(
        "Vul de verplichte velden in (voornaam, achternaam, bedrijfsnaam en e-mail)"
      );
      return;
    }

    try {
      const finalFormData = {
        ...formData,
        ...(id && id !== "create" ? { _id: id } : {}),
      } as ContactCreateUpdateRequest;

      await createOrUpdateContact.mutateAsync(finalFormData);

      history.goBack();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Er is een fout opgetreden bij het opslaan van het contact"
        );
      }
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/contacts" text="" />
          </IonButtons>
          <IonTitle>
            {id === "create" ? "Nieuw contact" : "Contact bewerken"}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton type="submit" onClick={handleSubmit}>
              <IonIcon slot="icon-only" icon={saveOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <form onSubmit={handleSubmit}>
          <IonLoading
            isOpen={isLoadingContact || createOrUpdateContact.isPending}
            message="Even geduld aub..."
          />

          {hasContactError && (
            <IonCard color="danger">
              <IonCardContent>
                <IonText color="light">
                  <p>
                    Er is een fout opgetreden bij het laden van het contact.
                    Probeer het later opnieuw.
                  </p>
                </IonText>
              </IonCardContent>
            </IonCard>
          )}

          {errorMessage && (
            <IonCard color="danger">
              <IonCardContent>
                <IonText color="light">
                  <p>{errorMessage}</p>
                </IonText>
              </IonCardContent>
            </IonCard>
          )}

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Bedrijfsgegevens</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">
                    Bedrijfsnaam <IonText color="danger">*</IonText>
                  </IonLabel>
                  <IonInput
                    placeholder="Voer bedrijfsnaam in"
                    value={formData.companyName}
                    onIonInput={(e) =>
                      handleInputChange("companyName", e.detail.value!)
                    }
                    required
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Klant/Leverancier</IonLabel>
                  <Select
                    label="Type contact"
                    placeholder="Selecteer een type contact"
                    value={formData.typeOfContact}
                    options={typeOfContactOptions}
                    onChange={(value) =>
                      handleInputChange("typeOfContact", value as string)
                    }
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Particulier/Bedrijf</IonLabel>
                  <Select
                    label="Type contact"
                    placeholder="Selecteer een type contact"
                    value={formData.typeName}
                    options={typeNameOptions}
                    onChange={(value) =>
                      handleInputChange("typeName", value as string)
                    }
                  />
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Persoonsgegevens</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">
                    Voornaam <IonText color="danger">*</IonText>
                  </IonLabel>
                  <IonInput
                    placeholder="Voer voornaam in"
                    value={formData.firstName}
                    onIonInput={(e) =>
                      handleInputChange("firstName", e.detail.value!)
                    }
                    required
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">
                    Achternaam <IonText color="danger">*</IonText>
                  </IonLabel>
                  <IonInput
                    placeholder="Voer achternaam in"
                    value={formData.lastName}
                    onIonInput={(e) =>
                      handleInputChange("lastName", e.detail.value!)
                    }
                    required
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Initialen</IonLabel>
                  <IonInput
                    placeholder="Bijv. J.D."
                    value={formData.initials}
                    onIonInput={(e) =>
                      handleInputChange("initials", e.detail.value!)
                    }
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Geslacht</IonLabel>
                  <Select
                    label="Geslacht"
                    placeholder="Selecteer een geslacht"
                    options={[
                      { value: "male", label: "Man" },
                      { value: "female", label: "Vrouw" },
                      { value: "other", label: "Anders" },
                    ]}
                    value={formData.gender}
                    onIonChange={(e) =>
                      handleInputChange("gender", e.detail.value)
                    }
                  />
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Contactgegevens</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">
                    E-mailadres <IonText color="danger">*</IonText>
                  </IonLabel>
                  <IonInput
                    type="email"
                    placeholder="Voer e-mailadres in"
                    value={formData.emailAddress}
                    onIonInput={(e) =>
                      handleInputChange("emailAddress", e.detail.value!)
                    }
                    required
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Telefoonnummer</IonLabel>
                  <IonInput
                    type="tel"
                    placeholder="Voer telefoonnummer in"
                    value={formData.phoneNumber}
                    onIonInput={(e) =>
                      handleInputChange("phoneNumber", e.detail.value!)
                    }
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Mobiel nummer</IonLabel>
                  <IonInput
                    type="tel"
                    placeholder="Voer mobiel nummer in"
                    value={formData.mobilePhoneNumber}
                    onIonInput={(e) =>
                      handleInputChange("mobilePhoneNumber", e.detail.value!)
                    }
                  />
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Postadres</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">Straat</IonLabel>
                  <IonInput
                    placeholder="Voer straatnaam in"
                    value={formData.street}
                    onIonInput={(e) =>
                      handleInputChange("street", e.detail.value!)
                    }
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Huisnummer</IonLabel>
                  <IonInput
                    placeholder="Voer huisnummer in"
                    value={formData.houseNumber}
                    onIonInput={(e) =>
                      handleInputChange("houseNumber", e.detail.value!)
                    }
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Postcode</IonLabel>
                  <IonInput
                    placeholder="Voer postcode in"
                    value={formData.postalCode}
                    onIonInput={(e) =>
                      handleInputChange("postalCode", e.detail.value!)
                    }
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Plaats</IonLabel>
                  <IonInput
                    placeholder="Voer plaats in"
                    value={formData.city}
                    onIonInput={(e) =>
                      handleInputChange("city", e.detail.value!)
                    }
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Land</IonLabel>
                  <IonInput
                    placeholder="Voer land in"
                    value={formData.country}
                    onIonInput={(e) =>
                      handleInputChange("country", e.detail.value!)
                    }
                  />
                </IonItem>

                <IonItem>
                  <IonLabel>Bezoekadres hetzelfde als postadres</IonLabel>
                  <IonToggle
                    checked={sameAddress}
                    onIonChange={(e) =>
                      handleSameAddressToggle(e.detail.checked)
                    }
                  />
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          {!sameAddress && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Bezoekadres</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonLabel position="stacked">Straat</IonLabel>
                    <IonInput
                      placeholder="Voer straatnaam in"
                      value={formData.visitingStreet}
                      onIonInput={(e) =>
                        handleInputChange("visitingStreet", e.detail.value!)
                      }
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Huisnummer</IonLabel>
                    <IonInput
                      placeholder="Voer huisnummer in"
                      value={formData.visitingHouseNumber}
                      onIonInput={(e) =>
                        handleInputChange(
                          "visitingHouseNumber",
                          e.detail.value!
                        )
                      }
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Postcode</IonLabel>
                    <IonInput
                      placeholder="Voer postcode in"
                      value={formData.visitingPostalCode}
                      onIonInput={(e) =>
                        handleInputChange("visitingPostalCode", e.detail.value!)
                      }
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Plaats</IonLabel>
                    <IonInput
                      placeholder="Voer plaats in"
                      value={formData.visitingCity}
                      onIonInput={(e) =>
                        handleInputChange("visitingCity", e.detail.value!)
                      }
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Land</IonLabel>
                    <IonInput
                      placeholder="Voer land in"
                      value={formData.visitingCountry}
                      onIonInput={(e) =>
                        handleInputChange("visitingCountry", e.detail.value!)
                      }
                    />
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>
          )}

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Bankgegevens</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">IBAN</IonLabel>
                  <IonInput
                    placeholder="Voer IBAN in"
                    value={formData.bankIBAN}
                    onIonInput={(e) =>
                      handleInputChange("bankIBAN", e.detail.value!)
                    }
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Ten name van</IonLabel>
                  <IonInput
                    placeholder="Voer naam rekeninghouder in"
                    value={formData.bankPersonName}
                    onIonInput={(e) =>
                      handleInputChange("bankPersonName", e.detail.value!)
                    }
                  />
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        </form>

        <IonToast
          isOpen={!!errorMessage}
          message={errorMessage || ""}
          duration={3000}
          color="danger"
          onDidDismiss={() => setErrorMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default ContactEditPage;
