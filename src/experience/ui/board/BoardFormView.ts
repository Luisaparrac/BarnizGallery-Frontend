import type { Button, Control, InputText, TextBlock } from "@babylonjs/gui";
import type { Localizer } from "../../../i18n/Localizer";
import { ErrorText } from "../ErrorText";
import type { BoardContext } from "./BoardView";
import { BoardView } from "./BoardView";

/**
 * Base of the boards with a form (Template Method): subclasses build their fields and say what
 * submitting does; this class adds the error line, the Back and Submit buttons, Enter to submit
 * and the busy state while the request runs.
 */
export abstract class BoardFormView extends BoardView {
  override readonly closable = false;
  readonly size = "form" as const;

  private error: TextBlock | null = null;
  private submitButton: Button | null = null;
  private busy = false;
  private kit: BoardContext["kit"] | null = null;

  protected constructor(
    protected readonly i18n: Localizer,
    private readonly back: () => void,
  ) {
    super();
  }

  protected abstract fields(context: BoardContext, width: number): Control;

  protected abstract submitLabel(): string;

  /** A translated message when the form is not complete, or null when it can be sent. */
  protected validate(): string | null {
    return null;
  }

  /** Sends the form; a thrown error is shown on the board. */
  protected abstract submit(): Promise<void>;

  content(context: BoardContext, width: number): Control {
    this.kit = context.kit;
    const column = context.kit.column();
    column.addControl(this.fields(context, width));
    this.error = context.kit.note("", width, "error");
    this.error.isVisible = false;
    column.addControl(this.error);
    return column;
  }

  override actions({ kit }: BoardContext): Control[] {
    this.submitButton = kit.button(this.submitLabel(), () => void this.send(), "primary");
    return [kit.button(this.i18n.t("lobby.back"), () => !this.busy && this.back(), "secondary"), this.submitButton];
  }

  /** Enter in any field sends the form. */
  protected submitOnEnter(...inputs: InputText[]): void {
    for (const input of inputs) {
      input.onKeyboardEventProcessedObservable.add((event) => {
        if (event.key === "Enter") void this.send();
      });
    }
  }

  /** The error line only takes room while it has something to say. */
  protected showError(text: string): void {
    if (!this.error) return;
    this.error.text = text;
    this.error.isVisible = text !== "";
  }

  private async send(): Promise<void> {
    if (this.busy) return;
    const invalid = this.validate();
    this.showError(invalid ?? "");
    if (invalid) return;
    this.busy = true;
    if (this.submitButton && this.kit) this.kit.setEnabled(this.submitButton, false);
    try {
      await this.submit();
    } catch (error) {
      this.showError(ErrorText.of(this.i18n, error));
    } finally {
      this.busy = false;
      if (this.submitButton && this.kit) this.kit.setEnabled(this.submitButton, true);
    }
  }
}
