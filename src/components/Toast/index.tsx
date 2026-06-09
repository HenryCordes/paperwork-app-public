import React from "react";
import { IonToast } from "@ionic/react";
import { ToastMessage } from "../../contexts/ToastContext";
import "./Toast.css";

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  toast,
  onDismiss,
  duration = 3000,
}) => {
  return (
    <IonToast
      isOpen={!!toast}
      message={toast?.message || ""}
      duration={duration}
      onDidDismiss={onDismiss}
      cssClass={`custom-toast custom-toast-${toast?.type || "info"}`}
      position="top"
      buttons={[
        {
          text: "✕",
          role: "cancel",
          handler: onDismiss,
        },
      ]}
    />
  );
};
