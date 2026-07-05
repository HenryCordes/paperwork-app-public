import React from "react";
import { Redirect } from "react-router-dom";

const SettingsPage: React.FC = () => {
  return <Redirect to="/settings/details" />;
};

export default SettingsPage;
