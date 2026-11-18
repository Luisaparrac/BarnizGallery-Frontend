import type { Id } from "../../domain/common";
import type { AppNotification } from "../../domain/messaging";

export interface NotificationService {
  list(): Promise<AppNotification[]>;
  unreadCount(): Promise<number>;
  markRead(id: Id): Promise<void>;
  markAllRead(): Promise<void>;
}
