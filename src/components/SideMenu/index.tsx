import React from "react";
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle,
  IonAvatar,
  IonText,
} from "@ionic/react";
import {
  // settingsOutline,
  documentTextOutline,
  personCircleOutline,
  logOutOutline,
  walletOutline,
  peopleOutline,
  mailOutline,
  statsChart,
  calculatorOutline,
  notificationsOutline,
} from "ionicons/icons";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import "./styles.css";
import { APP_VERSION } from "../../common/versionConstants";
import { useHistory } from "react-router-dom";

interface MenuItemProps {
  title: string;
  icon: string;
  path: string;
  onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ title, icon, path, onClick }) => {
  return (
    <IonMenuToggle autoHide={true}>
      <IonItem
        button
        routerLink={path}
        routerDirection="root"
        lines="none"
        detail={false}
        className="menu-item"
        onClick={onClick}
      >
        <IonIcon slot="start" icon={icon} />
        <IonLabel>{title}</IonLabel>
      </IonItem>
    </IonMenuToggle>
  );
};

const SideMenu: React.FC = () => {
  const { logout } = useAuth();
  const { data: profile } = useProfile();
  const history = useHistory();

  const handleLogout = () => {
    logout();
  };

  return (
    <IonMenu contentId="main" type="overlay" className="side-menu">
      <IonHeader>
        <IonToolbar className="menu-header">
          <div className="menu-header-content">
            <div className="app-icon-container">
              <img
                src="assets/img/paperwork-logo.png"
                alt="Paperwork App"
                className="app-icon"
              />
            </div>
            <div className="toolbar-title">
              <div className="title">Paperwork</div>
              <div className="version">
                v.{APP_VERSION}
                {/* {isPlatform("ios") && (
                  <span className="build-number"> ({APP_BUILD_NUMBER})</span>
                )} */}
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonList lines="none" className="menu-list">
          <IonMenuToggle autoHide={true}>
            <IonItem
              button
              routerLink={"/profile"}
              routerDirection="root"
              lines="none"
              detail={false}
            >
              <div
                className="user-profile-section"
                onClick={() => history.push("/profile")}
              >
                <IonAvatar className="user-avatar">
                  <IonIcon icon={personCircleOutline} size="large" />
                </IonAvatar>
                <div className="user-info">
                  <IonText className="user-name">
                    {profile?.name || "Profiel"}
                  </IonText>
                  <IonText className="user-company">
                    {profile?.companyName || ""}
                  </IonText>
                </div>
              </div>
            </IonItem>
          </IonMenuToggle>

          {/* <IonList lines="none" className="menu-list"> */}
          {/* <MenuItem
            title="Profiel"
            icon={personCircleOutline}
            path="/profile"
          /> */}
          <MenuItem title="Dashboard" icon={statsChart} path="/dashboard" />
          <MenuItem title="Kosten" icon={walletOutline} path="/expenses" />
          <MenuItem
            title="Facturen"
            icon={documentTextOutline}
            path="/invoices"
          />
          <MenuItem title="Emails" icon={mailOutline} path="/emails" />
          <MenuItem title="Contacten" icon={peopleOutline} path="/contacts" />
          <MenuItem title="Belasting" icon={calculatorOutline} path="/taxes" />
          <MenuItem
            title="Notificaties"
            icon={notificationsOutline}
            path="/notifications"
          />
          {/* <MenuItem
            title="Instellingen"
            icon={settingsOutline}
            path="/settings"
          /> */}
        </IonList>

        <div className="logout-section">
          <IonItem
            button
            onClick={handleLogout}
            lines="none"
            detail={false}
            className="logout-button"
          >
            <IonIcon slot="start" icon={logOutOutline} />
            <IonLabel>Uitloggen</IonLabel>
          </IonItem>
        </div>
      </IonContent>
    </IonMenu>
  );
};

export default SideMenu;
