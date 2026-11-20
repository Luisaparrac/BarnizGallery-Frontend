import { AppEvents } from "../../core/AppEvents";
import { Signal } from "../../core/Signal";
import type { Id } from "../../domain/common";
import type { AppNotification, NotificationType } from "../../domain/messaging";
import { services } from "../../services/ServiceRegistry";
import type { VisitorSession } from "./VisitorSession";

/**
 * Watches the visitor's notifications (Observer): every few seconds, and whenever the app says they
 * changed, it reads them and tells how many are unread and which new ones arrived. The first read
 * only sets the starting point, so old notifications never pop up.
 */
export class NotificationCenter {
  /** The kinds that pop up as a toast when they arrive. */
  static readonly TOAST_TYPES: ReadonlySet<NotificationType> = new Set(["PAYMENT_APPROVED", "NEW_CUSTOM_OFFER", "OUTBID", "AUCTION_WON"]);
  private static readonly POLL_MS = 8000;

  /** Unread notifications; null when nobody is signed in. */
  readonly countChanged = new Signal<number | null>();
  /** A new notification of one of the TOAST_TYPES. */
  readonly arrived = new Signal<AppNotification>();

  private timer: number | null = null;
  /** Highest id already seen; null until the first read. */
  private lastSeen: Id | null = null;
  private readonly unsubscribe: (() => void)[] = [];

  constructor(private readonly session: VisitorSession) {
    this.unsubscribe.push(
      session.changed.subscribe(() => this.restart()),
      AppEvents.notificationsChanged.subscribe(() => void this.check()),
    );
    this.restart();
  }

  /** Reads the notifications now (after an action that may have created one). */
  async check(): Promise<void> {
    if (!this.session.user) {
      this.countChanged.emit(null);
      return;
    }
    try {
      const list = await services.notification.list();
      this.countChanged.emit(list.filter((item) => !item.readAt).length);
      const newest = list.reduce((max, item) => Math.max(max, item.id), 0);
      if (this.lastSeen !== null) {
        list
          .filter((item) => item.id > this.lastSeen! && !item.readAt && NotificationCenter.TOAST_TYPES.has(item.type))
          .sort((a, b) => a.id - b.id)
          .forEach((item) => this.arrived.emit(item));
      }
      this.lastSeen = Math.max(this.lastSeen ?? 0, newest);
    } catch {
      // A failed read leaves the counter as it was; the next one tries again.
    }
  }

  async list(): Promise<AppNotification[]> {
    return services.notification.list();
  }

  async markRead(id: Id): Promise<void> {
    await services.notification.markRead(id);
    await this.check();
  }

  async markAllRead(): Promise<void> {
    await services.notification.markAllRead();
    await this.check();
  }

  dispose(): void {
    this.stop();
    this.unsubscribe.forEach((stop) => stop());
  }

  private restart(): void {
    this.stop();
    this.lastSeen = null;
    void this.check();
    if (this.session.user) this.timer = window.setInterval(() => void this.check(), NotificationCenter.POLL_MS);
  }

  private stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }
}
