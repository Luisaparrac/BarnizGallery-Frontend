import type { Id } from "../../domain/common";
import type { AppNotification } from "../../domain/messaging";
import type { NotificationService } from "../contracts/NotificationService";
import { MockDatabase } from "./MockDatabase";
import { rules } from "./MockRules";
import { copy, latency, MockSession } from "./MockSession";

export class MockNotificationService implements NotificationService {
  private get db() {
    return MockDatabase.instance;
  }

  async list(): Promise<AppNotification[]> {
    await latency();
    const user = MockSession.requireUser();
    return copy(this.db.tables.notifications.filter((row) => row.userId === user.id).slice(0, 100).map(({ userId: _user, ...notification }) => notification));
  }

  async unreadCount(): Promise<number> {
    const user = MockSession.currentUser();
    if (!user) return 0;
    rules.syncAuctions();
    return this.db.tables.notifications.filter((row) => row.userId === user.id && !row.readAt).length;
  }

  async markRead(id: Id): Promise<void> {
    const user = MockSession.requireUser();
    const row = this.db.tables.notifications.find((entry) => entry.id === id && entry.userId === user.id);
    if (row && !row.readAt) row.readAt = this.db.now();
    this.db.save();
  }

  async markAllRead(): Promise<void> {
    await latency();
    const user = MockSession.requireUser();
    this.db.tables.notifications.filter((row) => row.userId === user.id && !row.readAt).forEach((row) => (row.readAt = this.db.now()));
    this.db.save();
  }
}
