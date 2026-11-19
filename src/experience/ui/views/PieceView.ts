import type { ArtworkDetail } from "../../../domain/gallery";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";
import type { UiButton, UiNode, UiText } from "../kit/UiKit";

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
export class PieceView extends BoardView {
  private static readonly STORY_LENGTH = 420;

  readonly size = "piece" as const;
  readonly title: string;
  private notice: UiText | null = null;
  private cartButton: UiButton | null = null;
  private saveButton: UiButton | null = null;
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

  content({ kit }: BoardContext): UiNode {
    const { artwork } = this.detail;
    const photos = [...artwork.photos].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
    const gallery = kit.gallery(
      photos.map((photo) => photo.url),
      this.title,
    );

    const info = kit.column("medium");
    info.add(kit.text(`${this.i18n.t("artwork.by")} ${this.detail.masterName}`, true));
    info.add(kit.section(this.priceText()));
    const story = this.i18n.pick(artwork.historyEs, artwork.historyEn);
    if (story) info.add(kit.text(this.shorten(story)));
    const dimensions = this.format.centimeters(artwork.widthCm, artwork.heightCm, artwork.depthCm);
    if (dimensions) info.add(kit.note(`${this.i18n.t("artwork.dimensions")}: ${dimensions}`));
    if (!this.signedIn && this.forSale) info.add(kit.note(this.i18n.t("shop.signInToBuy")));
    this.notice = kit.note("", "success");
    this.notice.setVisible(false);
    info.add(this.notice);
    return kit.columns(gallery, info);
  }

  override actions({ kit }: BoardContext): UiButton[] {
    if (!this.signedIn) return this.forSale ? [kit.button(this.i18n.t("shop.signIn"), () => this.act.signIn())] : [];
    this.saveButton = kit.button(this.saveLabel(), () => void this.toggleSaved(), "secondary");
    const buttons = [this.saveButton];
    if (this.forSale) {
      this.cartButton = kit.button(this.i18n.t("artwork.addToCart"), () => void this.addToCart());
      buttons.push(this.cartButton);
    }
    return buttons;
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
    this.cartButton.setEnabled(false);
    try {
      await this.act.addToCart();
      this.added = true;
      this.say(this.i18n.t("artwork.addedToCart"), false);
      // The same button now takes the visitor to the cart.
      this.cartButton.setLabel(this.i18n.t("shop.seeCart"));
      this.cartButton.onClick(() => this.act.openCart());
    } catch (error) {
      this.say(ErrorText.of(this.i18n, error), true);
    } finally {
      this.cartButton.setEnabled(true);
    }
  }

  private async toggleSaved(): Promise<void> {
    if (!this.saveButton) return;
    this.saveButton.setEnabled(false);
    try {
      this.saved = await this.act.toggleSaved();
      this.saveButton.setLabel(this.saveLabel());
    } catch (error) {
      this.say(ErrorText.of(this.i18n, error), true);
    } finally {
      this.saveButton.setEnabled(true);
    }
  }

  private saveLabel(): string {
    return this.saved ? `✓ ${this.i18n.t("artwork.saved")}` : this.i18n.t("artwork.save");
  }

  private say(text: string, error: boolean): void {
    this.notice?.setText(text);
    this.notice?.setTone(error ? "error" : "success");
    this.notice?.setVisible(text !== "");
  }

  private shorten(text: string): string {
    return text.length <= PieceView.STORY_LENGTH ? text : `${text.slice(0, PieceView.STORY_LENGTH).replace(/\s+\S*$/, "")}…`;
  }
}
