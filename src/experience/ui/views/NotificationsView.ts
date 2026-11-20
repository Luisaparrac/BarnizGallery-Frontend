import type { AppNotification, NotificationType } from "../../../domain/messaging";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { BoardView, type BoardContext } from "../board/BoardView";
import type { UiButton, UiNode } from "../kit/UiKit";

export interface NotificationsActions {
  /** Opens what the notification is about (and marks it as read). */
  open(notification: AppNotification): void;
  markAllRead(): Promise<void>;
}

/**
 * The visitor's notifications, newest first: an icon by kind, the text, how long ago, a dot when
 * unread, and "Mark all as read". A click opens the piece, order, commission or auction it is about.
 */
export class NotificationsView extends BoardView {
  private static readonly ICONS: Partial<Record<NotificationType, string>> = {
    PAYMENT_APPROVED: "💳",
    PAYMENT_REJECTED: "⚠️",
    NEW_CUSTOM_OFFER: "🖌️",
    OFFER_ACCEPTED: "🤝",
    OFFER_REJECTED: "✖️",
    OUTBID: "📈",
    AUCTION_WON: "🏆",
    MATCHING_AUCTION: "🔨",
    ORDER_SHIPPED: "📦",
    NEW_ORDER: "🧾",
    NEW_MESSAGE: "💬",
  };

  readonly size = "content" as const;
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly notifications: AppNotification[],
    private readonly act: NotificationsActions,
  ) {
    super();
    this.title = i18n.t("notifications.title");
  }

  static iconOf(type: NotificationType): string {
    return NotificationsView.ICONS[type] ?? "🔔";
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("medium");
    if (!this.notifications.length) {
      column.add(kit.text(this.i18n.t("notifications.empty"), true));
      return column;
    }
    const list = kit.column("small");
    for (const item of [...this.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      const unread = !item.readAt;
      const title = `${NotificationsView.iconOf(item.type)}  ${unread ? "● " : ""}${item.title}`;
      const details = [item.body, this.format.relative(item.createdAt)].filter((line): line is string => !!line);
      list.add(kit.option(title, details, false, () => this.act.open(item)));
    }
    column.add(list);
    return column;
  }

  override actions({ kit }: BoardContext): UiButton[] {
    if (!this.notifications.some((item) => !item.readAt)) return [];
    const button = kit.button(this.i18n.t("notifications.markAll"), () => {
      button.setEnabled(false);
      void this.act.markAllRead();
    });
    return [button];
  }
}
