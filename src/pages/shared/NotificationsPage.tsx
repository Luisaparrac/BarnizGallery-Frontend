import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { AppEvents } from "../../core/AppEvents";
import type { AppNotification } from "../../domain/messaging";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

export function NotificationsPage() {
  const { i18n, format } = useLocale();
  const navigate = useNavigate();
  const list = useAsync(() => services.notification.list(), []);

  const open = async (notification: AppNotification) => {
    if (!notification.readAt) await services.notification.markRead(notification.id);
    AppEvents.notificationsChanged.emit();
    if (notification.link) navigate(notification.link);
    else void list.reload();
  };

  const markAll = async () => {
    await services.notification.markAllRead();
    AppEvents.notificationsChanged.emit();
    await list.reload();
  };

  return (
    <div className="container narrow">
      <PageHeader
        title={i18n.t("notifications.title")}
        actions={
          list.data?.some((notification) => !notification.readAt) ? (
            <button type="button" className="btn btn-quiet" onClick={() => void markAll()}>
              {i18n.t("notifications.markAll")}
            </button>
          ) : undefined
        }
      />
      {list.loading && !list.data && <Loading />}
      {list.error !== null && <ErrorNote error={list.error} />}
      {list.data && !list.data.length && <EmptyState title={i18n.t("notifications.empty")} />}
      <ul className="notification-list">
        {list.data?.map((notification) => (
          <li key={notification.id} className={notification.readAt ? "" : "is-unread"}>
            <button type="button" onClick={() => void open(notification)}>
              <strong>{notification.title}</strong>
              {notification.body && <span>{notification.body}</span>}
              <small className="muted">{format.relative(notification.createdAt)}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
