import { t } from "../i18n/LocaleService";
import type { ApiStatus } from "../model/models";
import { h } from "./dom";
import { UiComponent } from "./UiComponent";

const LABELS = {
  connecting: "status_connecting",
  online: "status_online",
  demo: "status_demo",
  offline: "status_offline",
} as const;

/** Shows whether the backend is reachable. */
export class StatusBadge extends UiComponent {
  readonly element = h("div.status");
  private status: ApiStatus = "connecting";

  constructor() {
    super();
    this.refresh();
  }

  setStatus(status: ApiStatus): void {
    this.status = status;
    this.refresh();
  }

  refresh(): void {
    this.element.className = `status ${this.status}`;
    this.element.textContent = t(LABELS[this.status]);
  }
}
