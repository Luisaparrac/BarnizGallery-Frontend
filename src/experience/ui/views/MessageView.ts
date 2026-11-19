import type { Control } from "@babylonjs/gui";
import { PanelView, type PanelContext } from "../PanelView";

/** An optional button of a message board, next to the close button. */
export interface MessageAction {
  label: string;
  run(): void;
}

/** A short board with a title, a sentence and maybe one action: errors, empty states, notices. */
export class MessageView extends PanelView {
  constructor(
    readonly title: string,
    private readonly text: string,
    private readonly action: MessageAction | null = null,
  ) {
    super();
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const text = kit.text(this.text);
    text.widthInPixels = width;
    return text;
  }

  protected override actions({ kit }: PanelContext): Control[] {
    return this.action ? [kit.button(this.action.label, () => this.action!.run(), "primary", 420)] : [];
  }
}
