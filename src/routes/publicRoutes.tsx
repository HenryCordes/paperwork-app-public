import React from "react";
import {
  Route,
  RouteProps,
  Switch,
} from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import Reset from "../pages/Reset";
import PasswordReset from "../pages/PasswordReset";

/**
 * Public routes that don't require authentication
 * If user is already authenticated, redirect to private route
 */
interface PublicRouteProps extends RouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({
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

/**
 * The public routes component - includes login, reset, and password-reset routes
 */
export const PublicRoutes: React.FC = () => {
  return (
    <Switch>
      <Route path="/reset" exact>
        <Reset />
      </Route>
      <Route path="/password-reset" exact>
        <PasswordReset />
      </Route>
      <Route path="/">
        <LoginPage />
      </Route>
    </Switch>
  );
};

export default PublicRoutes;
