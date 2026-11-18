import type { Id } from "../../domain/common";
import type { AppNotification } from "../../domain/messaging";
import type { NotificationService } from "../contracts/NotificationService";
import { HttpClient } from "./HttpClient";

export class ApiNotificationService implements NotificationService {
  private readonly http = HttpClient.shared;

  list(): Promise<AppNotification[]> {
    return this.http.get<AppNotification[]>("/api/notifications");
  }

  async unreadCount(): Promise<number> {
    const result = await this.http.get<{ count: number }>("/api/notifications/unread-count");
    return result.count;
  }

  async markRead(id: Id): Promise<void> {
    await this.http.post(`/api/notifications/${id}/read`);
  }

  async markAllRead(): Promise<void> {
    await this.http.post("/api/notifications/read-all");
  }
}
