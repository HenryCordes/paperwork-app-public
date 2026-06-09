import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  RefresherEventDetail,
  IonSkeletonText,
  IonCard,
  IonCardContent,
  IonCheckbox,
  // IonFooter,
} from "@ionic/react";
import {
  checkmarkCircleOutline,
  trashOutline,
  mailUnreadOutline,
  receiptOutline,
  documentTextOutline,
  calendarOutline,
  informationCircleOutline,
  mailOpenOutline,
} from "ionicons/icons";
import {
  useNotifications,
  useMarkAsRead,
  useDeleteNotification,
} from "../../../hooks/useNotificationCenter";
import { NotificationNavigationService } from "../../../services/notification-navigation.service";
import { StoredNotification } from "../../../types/notifications";
import MenuButton from "../../../components/MenuButton";
import "./Notifications.css";

const NotificationsList: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const history = useHistory();

  const { data, isLoading, refetch } = useNotifications({
    status: filter,
  });

  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await refetch();
    event.detail.complete();
  };

  const handleNotificationClick = async (notification: StoredNotification) => {
    if (selectionMode) {
      toggleSelection(notification._id);
      return;
    }

    if (!notification.read) {
      await markAsRead.mutateAsync({
        notificationId: notification._id,
        read: true,
      });
    }

    NotificationNavigationService.navigateFromNotification(
      notification,
      history
    );
  };

  const handleMarkAsRead = async (
    notification: StoredNotification,
    event: React.MouseEvent<HTMLIonItemOptionElement>
  ) => {
    event.stopPropagation();
    await markAsRead.mutateAsync({
      notificationId: notification._id,
      read: !notification.read,
    });
  };

  const handleDelete = async (
    notification: StoredNotification,
    event: React.MouseEvent<HTMLIonItemOptionElement>
  ) => {
    event.stopPropagation();
    await deleteNotification.mutateAsync(notification._id);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleMarkSelectedAsRead = async () => {
    for (const id of selectedIds) {
      await markAsRead.mutateAsync({
        notificationId: id,
        read: true,
      });
    }
    exitSelectionMode();
  };

  const handleMarkSelectedAsUnread = async () => {
    for (const id of selectedIds) {
      await markAsRead.mutateAsync({
        notificationId: id,
        read: false,
      });
    }
    exitSelectionMode();
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await deleteNotification.mutateAsync(id);
    }
    exitSelectionMode();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "expense":
        return receiptOutline;
      case "invoice":
        return documentTextOutline;
      case "vat_deadline":
        return calendarOutline;
      default:
        return informationCircleOutline;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Nu";
    if (diffMins < 60) return `${diffMins}m geleden`;
    if (diffHours < 24) return `${diffHours}u geleden`;
    if (diffDays < 7) return `${diffDays}d geleden`;

    return date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
    });
  };

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <MenuButton />
          </IonButtons>
          <IonTitle>Notificaties</IonTitle>
          <IonButtons slot="end">
            {selectionMode ? (
              <IonButton onClick={exitSelectionMode}>Annuleren</IonButton>
            ) : (
              <IonButton onClick={enterSelectionMode}>Selecteren</IonButton>
            )}
          </IonButtons>
        </IonToolbar>

        {selectionMode && (
          <IonToolbar className="no-padding">
            <IonButtons slot="start">
              <IonButton
                onClick={handleMarkSelectedAsRead}
                disabled={selectedIds.size <= 0}
              >
                <IonIcon slot="icon-only" icon={mailOpenOutline} />
              </IonButton>
              <IonButton
                onClick={handleMarkSelectedAsUnread}
                disabled={selectedIds.size <= 0}
              >
                <IonIcon slot="icon-only" icon={mailUnreadOutline} />
              </IonButton>
            </IonButtons>
            <IonButtons slot="end">
              <IonButton
                color="danger"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size <= 0}
              >
                <IonIcon slot="icon-only" icon={trashOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        )}
        <IonToolbar className={selectionMode ? "no-padding" : ""}>
          <IonSegment
            value={filter}
            onIonChange={(e) =>
              setFilter(e.detail.value as "all" | "unread" | "read")
            }
          >
            <IonSegmentButton value="all">
              <IonLabel>Alle</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="unread">
              <IonLabel>Ongelezen ({unreadCount})</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="read">
              <IonLabel>Gelezen</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading ? (
          <IonList>
            {[1, 2, 3, 4, 5].map((i) => (
              <IonItem key={i}>
                <IonLabel>
                  <h2>
                    <IonSkeletonText animated style={{ width: "60%" }} />
                  </h2>
                  <p>
                    <IonSkeletonText animated style={{ width: "80%" }} />
                  </p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        ) : notifications.length === 0 ? (
          <IonCard className="empty-state">
            <IonCardContent>
              <IonIcon icon={mailUnreadOutline} className="empty-state-icon" />
              <h2>Geen notificaties</h2>
              <p>
                {filter === "unread"
                  ? "Je hebt geen ongelezen notificaties"
                  : filter === "read"
                  ? "Je hebt geen gelezen notificaties"
                  : "Je hebt nog geen notificaties ontvangen"}
              </p>
            </IonCardContent>
          </IonCard>
        ) : (
          <IonList>
            {notifications.map((notification) =>
              selectionMode ? (
                <IonItem
                  key={notification._id}
                  button
                  onClick={() => handleNotificationClick(notification)}
                  className={`notification-item-selection ${
                    notification.read ? "" : "notification-unread"
                  }`}
                >
                  <IonCheckbox
                    slot="start"
                    className="notification-checkbox"
                    checked={selectedIds.has(notification._id)}
                    onIonChange={() => toggleSelection(notification._id)}
                  />
                  <IonLabel>
                    <h2
                      className={
                        notification.read ? "" : "notification-title-unread"
                      }
                    >
                      {notification.title}
                    </h2>
                    <p>{notification.body}</p>
                    <IonNote>{formatDate(notification.createdAt)}</IonNote>
                  </IonLabel>
                </IonItem>
              ) : (
                <IonItemSliding key={notification._id}>
                  <IonItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    className={notification.read ? "" : "notification-unread"}
                  >
                    <IonIcon
                      slot="start"
                      icon={getNotificationIcon(notification.type)}
                      className="notification-icon"
                    />
                    <IonLabel>
                      <h2
                        className={
                          notification.read ? "" : "notification-title-unread"
                        }
                      >
                        {notification.title}
                      </h2>
                      <p>{notification.body}</p>
                      <IonNote>{formatDate(notification.createdAt)}</IonNote>
                    </IonLabel>
                    {!notification.read && (
                      <div className="unread-indicator" slot="end" />
                    )}
                  </IonItem>

                  <IonItemOptions side="end">
                    <IonItemOption
                      color={notification.read ? "primary" : "success"}
                      onClick={(e) => handleMarkAsRead(notification, e)}
                    >
                      <IonIcon slot="icon-only" icon={checkmarkCircleOutline} />
                    </IonItemOption>
                    <IonItemOption
                      color="danger"
                      onClick={(e) => handleDelete(notification, e)}
                    >
                      <IonIcon slot="icon-only" icon={trashOutline} />
                    </IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              )
            )}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default NotificationsList;
