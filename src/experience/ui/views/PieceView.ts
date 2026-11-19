import { Control, Image, type Button, type Rectangle, type TextBlock } from "@babylonjs/gui";
import { ArtworkImageFactory } from "../../../art/ArtworkImageFactory";
import type { ArtworkDetail } from "../../../domain/gallery";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { ErrorText } from "../ErrorText";
import { PanelView, type PanelContext } from "../PanelView";
import { UiTheme } from "../UiTheme";

/** What the piece board can do; the purchase flow decides how. */
export interface PieceActions {
  addToCart(): Promise<void>;
  /** Saves or unsaves the piece; resolves with the new state. */
  toggleSaved(): Promise<boolean>;
  signIn(): void;
  /** Shows the cart (after adding the piece). */
  openCart(): void;
}

/**
 * Board of one piece: its photos (the big one changes with the thumbnails), master, price or
 * state, a bit of its story, and Add to cart and Save. Without a session it asks to sign in.
 */
export class PieceView extends PanelView {
  private static readonly PHOTO = 560;
  private static readonly THUMB = 96;
  private static readonly STORY_LENGTH = 320;

  readonly title: string;
  private notice: TextBlock | null = null;
  private cartButton: Button | null = null;
  private saveButton: Button | null = null;
  private saved: boolean;
  private added = false;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly detail: ArtworkDetail,
    private readonly signedIn: boolean,
    private readonly act: PieceActions,
  ) {
    super();
    this.title = i18n.pick(detail.artwork.titleEs, detail.artwork.titleEn);
    this.saved = detail.isFavorite;
  }

  /** The piece can be bought right now. */
  private get forSale(): boolean {
    const { artwork } = this.detail;
    return artwork.saleMode === "SALE" && artwork.status === "EXHIBITED" && artwork.stock > 0 && artwork.price !== null;
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const columns = kit.row(UiTheme.panel.gap * 2);
    columns.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    columns.addControl(this.gallery(kit));

    const info = kit.column();
    info.widthInPixels = width - PieceView.PHOTO - UiTheme.panel.gap * 2;
    info.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    const { artwork } = this.detail;
    info.addControl(this.line(kit.text(`${this.i18n.t("artwork.by")} ${this.detail.masterName}`, { muted: true }), info.widthInPixels));
    info.addControl(this.line(kit.subtitle(this.priceText()), info.widthInPixels));
    const story = this.i18n.pick(artwork.historyEs, artwork.historyEn);
    if (story) info.addControl(this.line(kit.text(this.shorten(story)), info.widthInPixels));
    if (!this.signedIn && this.forSale) info.addControl(this.line(kit.text(this.i18n.t("shop.signInToBuy"), { muted: true }), info.widthInPixels));
    this.notice = this.line(kit.text("", { small: true }), info.widthInPixels);
    this.notice.color = UiTheme.color.green;
    this.notice.fontWeight = "600";
    info.addControl(this.notice);
    columns.addControl(info);
    return columns;
  }

  protected override actions({ kit }: PanelContext): Control[] {
    if (!this.signedIn) return this.forSale ? [kit.button(this.i18n.t("shop.signIn"), () => this.act.signIn(), "primary", 400)] : [];
    this.saveButton = kit.button(this.saveLabel(), () => void this.toggleSaved(), "quiet", 300);
    const buttons: Control[] = [this.saveButton];
    if (this.forSale) {
      this.cartButton = kit.button(this.i18n.t("artwork.addToCart"), () => void this.addToCart(), "primary", 400);
      buttons.push(this.cartButton);
    }
    return buttons;
  }

  /** The big photo and, with more than one, a row of thumbnails that swap it. */
  private gallery(kit: PanelContext["kit"]): Control {
    const column = kit.column(14);
    column.widthInPixels = PieceView.PHOTO;
    const photos = [...this.detail.artwork.photos].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
    const main = kit.image(photos[0]?.url ?? "", PieceView.PHOTO, PieceView.PHOTO);
    column.addControl(main);
    if (photos.length > 1) {
      const thumbs = kit.row(12);
      thumbs.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      for (const photo of photos.slice(0, 5)) {
        const thumb = kit.image(photo.url, PieceView.THUMB, PieceView.THUMB);
        thumb.isPointerBlocker = true;
        thumb.hoverCursor = "pointer";
        thumb.onPointerClickObservable.add(() => this.showPhoto(main, photo.url));
        thumbs.addControl(thumb);
      }
      column.addControl(thumbs);
    }
    return column;
  }

  private showPhoto(frame: Rectangle, url: string): void {
    const picture = frame.children.find((child): child is Image => child instanceof Image);
    if (picture) picture.source = ArtworkImageFactory.resolve(url);
  }

  private priceText(): string {
    const { artwork } = this.detail;
    if (artwork.status === "SOLD" || (artwork.saleMode === "SALE" && artwork.stock <= 0)) return this.i18n.t("artwork.sold");
    if (artwork.status === "RESERVED") return this.i18n.t("artwork.reserved");
    if (artwork.saleMode === "AUCTION" || artwork.status === "IN_AUCTION") return this.i18n.t("artwork.inAuction");
    if (artwork.saleMode === "EXHIBITION" || artwork.price === null) return this.i18n.t("artwork.exhibitionOnly");
    return this.format.money(artwork.price, artwork.currency);
  }

  private async addToCart(): Promise<void> {
    if (this.added || !this.cartButton) return;
    this.cartButton.isEnabled = false;
    try {
      await this.act.addToCart();
      this.added = true;
      this.say(this.i18n.t("artwork.addedToCart"));
      // The same button now takes the visitor to the cart.
      this.relabel(this.cartButton, this.i18n.t("shop.seeCart"));
      this.cartButton.onPointerClickObservable.clear();
      this.cartButton.onPointerClickObservable.add(() => this.act.openCart());
    } catch (error) {
      this.say(ErrorText.of(this.i18n, error), true);
    } finally {
      this.cartButton.isEnabled = true;
    }
  }

  private async toggleSaved(): Promise<void> {
    if (!this.saveButton) return;
    this.saveButton.isEnabled = false;
    try {
      this.saved = await this.act.toggleSaved();
      this.relabel(this.saveButton, this.saveLabel());
    } catch (error) {
      this.say(ErrorText.of(this.i18n, error), true);
    } finally {
      this.saveButton.isEnabled = true;
    }
  }

  private saveLabel(): string {
    return this.saved ? `✓ ${this.i18n.t("artwork.saved")}` : this.i18n.t("artwork.save");
  }

  private say(text: string, error = false): void {
    if (!this.notice) return;
    this.notice.text = text;
    this.notice.color = error ? UiTheme.color.accent : UiTheme.color.green;
  }

  private relabel(button: Button, text: string): void {
    if (button.textBlock) button.textBlock.text = text;
  }

  private shorten(text: string): string {
    return text.length <= PieceView.STORY_LENGTH ? text : `${text.slice(0, PieceView.STORY_LENGTH).replace(/\s+\S*$/, "")}…`;
  }

  private line<T extends TextBlock>(block: T, width: number): T {
    block.widthInPixels = width;
    return block;
  }
}
