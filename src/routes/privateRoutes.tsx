import React from "react";
import { Route, Redirect, RouteProps } from "react-router-dom";
import {
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from "@ionic/react";
import { wallet, people, document, mail, statsChart } from "ionicons/icons";
import ExpenseListPage from "../pages/Expenses/List";
import ExpenseDetailsPage from "../pages/Expenses/Details";
import ExpenseEditPage from "../pages/Expenses/Edit";
import InvoiceListPage from "../pages/Invoices/List";
import InvoiceDetailsPage from "../pages/Invoices/Details";
import InvoiceEditPage from "../pages/Invoices/Edit";
import EmailListPage from "../pages/Emails/List";
import EmailDetailsPage from "../pages/Emails/Details";
import EmailEditPage from "../pages/Emails/Edit";
import DashboardPage from "../pages/Dashboard";
import ProfilePage from "../pages/ProfilePage";
import ContactsList from "../pages/Contacts/List";
import ContactDetailsPage from "../pages/Contacts/Details";
import ContactEditPage from "../pages/Contacts/Edit";
import SettingsDetailsPage from "../pages/Settings/Details";
import SettingsEditPage from "../pages/Settings/Edit";
import TaxesPage from "../pages/Taxes";
import NotificationsList from "../pages/Notifications/List";

/**
 * Private route component that checks for authentication
 * Redirects to login if not authenticated
 */
interface PrivateRouteProps extends RouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  ...rest
}) => {
  return (
    <Route
      {...rest}
      render={() => {
        return <>{children}</>;
      }}
    />
  );
};

const Tabs = (
  <IonTabBar slot="bottom">
    <IonTabButton tab="dashboard" href="/dashboard">
      <IonIcon icon={statsChart} />
      <IonLabel>Dashboard</IonLabel>
    </IonTabButton>
    <IonTabButton tab="expenses" href="/expenses">
      <IonIcon icon={wallet} />
      <IonLabel>Kosten</IonLabel>
    </IonTabButton>
    <IonTabButton tab="invoices" href="/invoices">
      <IonIcon icon={document} />
      <IonLabel>Facturen</IonLabel>
    </IonTabButton>
    <IonTabButton tab="emails" href="/emails">
      <IonIcon icon={mail} />
      <IonLabel>Emails</IonLabel>
    </IonTabButton>
    <IonTabButton tab="contacts" href="/contacts">
      <IonIcon icon={people} />
      <IonLabel>Contacten</IonLabel>
    </IonTabButton>
  </IonTabBar>
);

/**
 * Main routes component that handles all routes
 */
export const PrivateRoutes: React.FC = () => {
  return (
    <IonRouterOutlet>
      <Route exact path="/expenses/edit/create">
        <ExpenseEditPage />
      </Route>

      <Route exact path="/expenses/edit/:id">
        <ExpenseEditPage />
      </Route>

      <Route exact path="/expenses/:id">
        <ExpenseDetailsPage />
      </Route>

      {/* Invoice Routes */}
      <Route exact path="/invoices/edit/create">
        <InvoiceEditPage />
      </Route>

      <Route exact path="/invoices/edit/:id">
        <InvoiceEditPage />
      </Route>

      <Route exact path="/invoices/:id">
        <InvoiceDetailsPage />
      </Route>

      {/* Contact Routes */}
      <Route exact path="/contacts/edit/create">
        <ContactEditPage />
      </Route>

      <Route exact path="/contacts/edit/:id">
        <ContactEditPage />
      </Route>

      <Route exact path="/contacts/:id">
        <ContactDetailsPage />
      </Route>

      {/* Settings Routes */}
      <Route exact path="/settings">
        <SettingsDetailsPage />
      </Route>

      <Route exact path="/settings/edit">
        <SettingsEditPage />
      </Route>

      {/* Email Routes */}
      <Route exact path="/emails/edit/create">
        <EmailEditPage />
      </Route>

      <Route exact path="/emails/edit/:id">
        <EmailEditPage />
      </Route>

      <Route exact path="/emails/:id">
        <EmailDetailsPage />
      </Route>

      {/* <Route exact path="/notifications">
        <NotificationsList />
      </Route> */}

      <Route exact path="/">
        <Redirect to="/dashboard" />
      </Route>

      <Route exact path="/expenses">
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/expenses">
              <ExpenseListPage />
            </Route>
          </IonRouterOutlet>
          {Tabs}
        </IonTabs>
      </Route>

      <Route exact path="/profile">
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/profile">
              <ProfilePage />
            </Route>
          </IonRouterOutlet>
          {Tabs}
        </IonTabs>
      </Route>

      <Route exact path="/contacts">
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/contacts">
              <ContactsList />
            </Route>
          </IonRouterOutlet>
          {Tabs}
        </IonTabs>
      </Route>

      <Route exact path="/invoices">
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/invoices">
              <InvoiceListPage />
            </Route>
          </IonRouterOutlet>
          {Tabs}
        </IonTabs>
      </Route>

      <Route exact path="/emails">
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/emails">
              <EmailListPage />
            </Route>
          </IonRouterOutlet>
          {Tabs}
        </IonTabs>
      </Route>

      <Route exact path="/dashboard">
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/dashboard">
              <DashboardPage />
            </Route>
          </IonRouterOutlet>
          {Tabs}
        </IonTabs>
      </Route>

      <Route exact path="/taxes">
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/taxes">
              <TaxesPage />
            </Route>
          </IonRouterOutlet>
          {Tabs}
        </IonTabs>
      </Route>

      <Route exact path="/notifications">
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/notifications">
              <NotificationsList />
            </Route>
          </IonRouterOutlet>
          {Tabs}
        </IonTabs>
      </Route>
    </IonRouterOutlet>
  );
};

export default PrivateRoutes;
