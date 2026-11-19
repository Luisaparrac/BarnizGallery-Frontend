import type { Button, Control, InputText, TextBlock } from "@babylonjs/gui";
import type { Localizer } from "../../../i18n/Localizer";
import { ErrorText } from "../ErrorText";
import { PanelView, type PanelContext } from "../PanelView";
import { UiTheme } from "../UiTheme";

/**
 * Base of the boards with a form (Template Method): subclasses build their fields and say what
 * submitting does; this class adds the error line, the Back and Submit buttons, Enter to submit
 * and the busy state while the request is running.
 */
export abstract class FormView extends PanelView {
  override readonly closable = false;

  private error: TextBlock | null = null;
  private submitButton: Button | null = null;
  private busy = false;

  protected constructor(
    protected readonly i18n: Localizer,
    private readonly back: () => void,
  ) {
    super();
  }

  /** The fields of the form. */
  protected abstract fields(context: PanelContext, width: number): Control;

  protected abstract submitLabel(): string;

  /** A translated message when the form is not complete, or null when it can be sent. */
  protected validate(): string | null {
    return null;
  }

  /** Sends the form; a thrown error is shown on the board. */
  protected abstract submit(): Promise<void>;

  protected content(context: PanelContext, width: number): Control {
    const column = context.kit.column();
    column.addControl(this.fields(context, width));
    this.error = context.kit.text("", { small: true });
    this.error.color = UiTheme.color.accent;
    this.error.fontWeight = "600";
    this.error.widthInPixels = width;
    column.addControl(this.error);
    return column;
  }

  protected override actions({ kit }: PanelContext): Control[] {
    this.submitButton = kit.button(this.submitLabel(), () => void this.send(), "primary", 360);
    return [kit.button(this.i18n.t("lobby.back"), () => !this.busy && this.back(), "quiet", 280), this.submitButton];
  }

  /** Enter in any field sends the form. */
  protected submitOnEnter(...inputs: InputText[]): void {
    for (const input of inputs) {
      input.onKeyboardEventProcessedObservable.add((event) => {
        if (event.key === "Enter") void this.send();
      });
    }
  }

  protected showError(text: string): void {
    if (this.error) this.error.text = text;
  }

  private async send(): Promise<void> {
    if (this.busy) return;
    const invalid = this.validate();
    this.showError(invalid ?? "");
    if (invalid) return;
    this.busy = true;
    if (this.submitButton) this.submitButton.isEnabled = false;
    try {
      await this.submit();
    } catch (error) {
      this.showError(ErrorText.of(this.i18n, error));
    } finally {
      this.busy = false;
      if (this.submitButton) this.submitButton.isEnabled = true;
    }
  }
}
