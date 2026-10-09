import { Signal } from "../core/Signal";
import { t } from "../i18n/LocaleService";
import type { ApiStatus, CameraMode, Language } from "../model/models";
import { h } from "./dom";
import { LanguageSwitch } from "./LanguageSwitch";
import { StatusBadge } from "./StatusBadge";
import { UiComponent } from "./UiComponent";

/** Brand mark on the left; camera toggle, language switch and backend status on the right. */
export class TopBar extends UiComponent {
  readonly cameraToggleClicked = new Signal();
  readonly languagePicked = new Signal<Language>();
  readonly element: HTMLElement;

  private readonly languageSwitch = new LanguageSwitch();
  private readonly statusBadge = new StatusBadge();
  private readonly cameraButton: HTMLButtonElement;
  private cameraMode: CameraMode = "THIRD_PERSON";

  constructor() {
    super();
    this.cameraButton = h("button.pill", { type: "button", onclick: () => this.cameraToggleClicked.emit() });
    this.languageSwitch.picked.subscribe((language) => this.languagePicked.emit(language));
    this.element = h(
      "header.topbar",
      {},
      h("div.brand", {}, h("span.brand-mark", { textContent: "M" }), h("span", { textContent: "MUSEO" })),
      h("div.top-right", {}, this.cameraButton, this.languageSwitch.element, this.statusBadge.element),
    );
    this.refresh();
  }

  setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.refresh();
  }

  setStatus(status: ApiStatus): void {
    this.statusBadge.setStatus(status);
  }

  refresh(): void {
    this.cameraButton.textContent = `${this.cameraMode === "FIRST_PERSON" ? t("cam_first") : t("cam_third")}  [V]`;
    this.languageSwitch.refresh();
    this.statusBadge.refresh();
  }
}
