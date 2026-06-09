import React from "react";
import { IonButton, IonIcon } from "@ionic/react";
import { logOutOutline } from "ionicons/icons";
import { useAuth } from "../hooks/useAuth";
import { useHistory } from "react-router-dom";

interface LogoutButtonProps {
  slot?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ slot }) => {
  const { logout } = useAuth();
  const history = useHistory();

  const handleLogout = async () => {
    await logout();
    history.push("/login");
  };

  return (
    <IonButton onClick={handleLogout} fill="clear" color="medium" slot={slot}>
      <IonIcon slot="icon-only" icon={logOutOutline} />
    </IonButton>
  );
};

export default LogoutButton;
