import { t } from "../i18n/LocaleService";
import { h } from "./dom";
import { UiComponent } from "./UiComponent";

/** Keyboard cheat-sheet in the bottom-left corner. */
export class ControlsPanel extends UiComponent {
  readonly element = h("aside.help");

  constructor() {
    super();
    this.refresh();
  }

  refresh(): void {
    const rows: [string, string][] = [
      ["W A S D", t("c_move")],
      ["Mouse", t("c_look")],
      ["Shift", t("c_run")],
      ["V", t("c_cam")],
      ["E", t("c_act")],
      ["Esc", t("c_free")],
    ];
    this.element.replaceChildren(
      h("div.help-title", { textContent: t("controls_title") }),
      ...rows.map(([key, label]) => h("div.help-row", {}, h("kbd", { textContent: key }), h("span", { textContent: label }))),
    );
  }
}
