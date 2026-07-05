import React from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import { IonApp, IonSplitPane, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import SideMenu from "./components/SideMenu";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import Reset from "./pages/Reset";
import PasswordReset from "./pages/PasswordReset";
import ErrorBoundary from "./ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import PrivateRoutes from "./routes/privateRoutes";
import { useSessionManager } from "./hooks/useSessionManager";
import { useAppInitialization } from "./hooks/useAppInitialization";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import "@ionic/react/css/palettes/dark.system.css";

/* Theme variables */
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => {
  return (
    <IonApp>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </IonApp>
  );
};

// Separate component for routes that uses the auth context
const AppRoutes: React.FC = () => {
  // Get auth service from our centralized hook
  const auth = useAuth();

  // Actively check authentication status to prevent stale token issues
  const isAuthenticated = auth.isAuthenticated();

  // Use the session manager to handle biometric authentication timing
  useSessionManager();

  // Initialize push notifications when user is authenticated
  console.log("[App AppRoutes] useAppInitialization called");
  useAppInitialization();

  return (
    <IonReactRouter>
      <Switch>
        <Route
          exact
          path="/login"
          render={() => {
            return <LoginPage />;
          }}
        />
        <Route
          exact
          path="/reset"
          render={() => {
            return <Reset />;
          }}
        />
        <Route
          exact
          path="/password-reset"
          render={() => {
            return <PasswordReset />;
          }}
        />

        {isAuthenticated ? (
          <Route
            path="/(expenses|profile|contacts|settings|invoices|scan|emails|dashboard|taxes|notifications)"
            render={() => {
              return (
                <IonSplitPane contentId="main">
                  <SideMenu />
                  <div id="main" className="ion-page">
                    <PrivateRoutes />
                  </div>
                </IonSplitPane>
              );
            }}
          />
        ) : (
          (() => {
            return null;
          })()
        )}

        <Route
          exact
          path="/"
          render={() => {
            const redirectTo = isAuthenticated ? "/dashboard" : "/login";
            return <Redirect to={redirectTo} />;
          }}
        />

        <Route
          render={() => {
            const redirectTo = isAuthenticated ? "/dashboard" : "/login";
            return <Redirect to={redirectTo} />;
          }}
        />
      </Switch>
    </IonReactRouter>
  );
};
export default App;
