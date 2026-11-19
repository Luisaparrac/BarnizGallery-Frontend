import { BoardView, type BoardContext } from "../board/BoardView";
import type { UiButton, UiNode } from "../kit/UiKit";

/** An optional button of a message board, next to the close button. */
export interface MessageAction {
  label: string;
  run(): void;
}

/** A short board with a title, a sentence and maybe one action: errors, empty states, notices. */
export class MessageView extends BoardView {
  readonly size = "form" as const;

  constructor(
    readonly title: string,
    private readonly text: string,
    private readonly action: MessageAction | null = null,
  ) {
    super();
  }

  content({ kit }: BoardContext): UiNode {
    return kit.text(this.text);
  }

  override actions({ kit }: BoardContext): UiButton[] {
    return this.action ? [kit.button(this.action.label, () => this.action!.run())] : [];
  }
}
