import type { Localizer } from "../../../i18n/Localizer";
import { ErrorText } from "../ErrorText";
import type { UiButton, UiField, UiNode, UiText } from "../kit/UiKit";
import type { BoardContext, BoardSize } from "./BoardView";
import { BoardView } from "./BoardView";

/**
 * Base of the boards with a form (Template Method): subclasses build their fields and say what
 * submitting does; this class adds the error line, the Back and Submit buttons, Enter to submit
 * and the busy state while the request runs.
 */
export abstract class BoardFormView extends BoardView {
  override readonly closable = false;
  readonly size: BoardSize = "form";

  private error: UiText | null = null;
  private submitButton: UiButton | null = null;
  private busy = false;

  protected constructor(
    protected readonly i18n: Localizer,
    private readonly back: () => void,
  ) {
    super();
  }

  protected abstract fields(context: BoardContext): UiNode;

  protected abstract submitLabel(): string;

  /** A translated message when the form is not complete, or null when it can be sent. */
  protected validate(): string | null {
    return null;
  }

  /** Sends the form; a thrown error is shown on the board. */
  protected abstract send(): Promise<void>;

  content(context: BoardContext): UiNode {
    const column = context.kit.column();
    column.add(this.fields(context));
    this.error = context.kit.note("", "error");
    this.error.setVisible(false);
    column.add(this.error);
    return column;
  }

  override actions({ kit }: BoardContext): UiButton[] {
    this.submitButton = kit.button(this.submitLabel(), () => void this.run());
    return [kit.button(this.i18n.t("lobby.back"), () => !this.busy && this.back(), "secondary"), this.submitButton];
  }

  /** Enter in any of these fields sends the form. */
  protected submitOnEnter(...fields: UiField[]): void {
    fields.forEach((field) => field.onEnter(() => void this.run()));
  }

  /** The error line only takes room while it has something to say. */
  protected showError(text: string): void {
    this.error?.setText(text);
    this.error?.setVisible(text !== "");
  }

  private async run(): Promise<void> {
    if (this.busy) return;
    const invalid = this.validate();
    this.showError(invalid ?? "");
    if (invalid) return;
    this.busy = true;
    this.submitButton?.setEnabled(false);
    try {
      await this.send();
    } catch (error) {
      this.showError(ErrorText.of(this.i18n, error));
    } finally {
      this.busy = false;
      this.submitButton?.setEnabled(true);
    }
  }
}
