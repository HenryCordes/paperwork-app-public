import { StoredNotification } from "../types/notifications";
import { History } from "history";

export class NotificationNavigationService {
  public static navigateFromNotification(
    notification: StoredNotification,
    history: History
  ): void {
    switch (notification.type) {
      case "expense":
        if (notification.action === "edit" && notification.targetId) {
          history.push(`/expenses/edit/${notification.targetId}`);
        } else if (notification.targetId) {
          history.push(`/expenses/${notification.targetId}`);
        } else {
          history.push("/expenses");
        }
        break;

      case "invoice":
        if (notification.action === "edit" && notification.targetId) {
          history.push(`/invoices/edit/${notification.targetId}`);
        } else if (notification.targetId) {
          history.push(`/invoices/${notification.targetId}`);
        } else {
          history.push("/invoices");
        }
        break;

      case "vat_deadline":
        history.push("/taxes");
        break;

      case "general":
      default:
        history.push("/dashboard");
        break;
    }
  }
}
