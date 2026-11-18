import { Control, Rectangle, type StackPanel } from "@babylonjs/gui";
import type { UiKit } from "./UiKit";
import { UiTheme } from "./UiTheme";

/** What a view can ask of the board it is shown on. */
export interface PanelContext {
  kit: UiKit;
  /** Closes the board (the same as Esc). */
  close(): void;
  /** Label of the close button, already translated. */
  closeLabel: string;
}

/**
 * One screen shown on the 3D board (controls, piece, cart...). The sheet layout is fixed here and
 * every view fills the steps (Template Method): its content and, optionally, its action buttons.
 */
export abstract class PanelView {
  abstract readonly title: string;
  /** False for screens the visitor must answer (Esc and the close button are hidden). */
  readonly closable: boolean = true;

  protected abstract content(context: PanelContext, width: number): Control;

  /** Buttons at the bottom of the sheet, before the close button. */
  protected actions(_context: PanelContext): Control[] {
    return [];
  }

  /** Builds the whole sheet: title, content and the row of actions. */
  render(context: PanelContext, paperWidth: number, paperHeight: number): Control {
    const { kit } = context;
    const padding = UiTheme.panel.padding;
    const width = paperWidth - padding * 2;

    const sheet = new Rectangle("sheet");
    sheet.thickness = 0;
    sheet.widthInPixels = paperWidth;
    sheet.heightInPixels = paperHeight;

    const body = kit.column(UiTheme.panel.gap * 1.4);
    body.widthInPixels = width;
    body.topInPixels = padding;
    body.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    body.addControl(kit.title(this.title));
    body.addControl(this.content(context, width));
    sheet.addControl(body);

    const buttons = this.actionRow(context);
    buttons.topInPixels = -padding;
    buttons.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    buttons.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    buttons.leftInPixels = -padding;
    sheet.addControl(buttons);
    return sheet;
  }

  private actionRow(context: PanelContext): StackPanel {
    const row = context.kit.row();
    if (this.closable) row.addControl(context.kit.button(context.closeLabel, context.close, "quiet", 280));
    this.actions(context).forEach((control) => row.addControl(control));
    return row;
  }
}
