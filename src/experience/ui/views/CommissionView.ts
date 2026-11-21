import type { Id } from "../../../domain/common";
import type { CustomOffer, CustomRequest } from "../../../domain/customOrder";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { BoardView, type BoardContext } from "../board/BoardView";
import { DesignFailureText } from "../DesignFailureText";
import { ErrorText } from "../ErrorText";
import type { UiBox, UiButton, UiKit, UiNode, UiShowable, UiText } from "../kit/UiKit";

export interface CommissionActions {
  back(): void;
  generate(): Promise<void>;
  selectDesign(designId: Id): Promise<void>;
  publish(): Promise<void>;
  accept(offerId: Id): Promise<void>;
  /** Pays the deposit of the accepted offer. */
  payDeposit(): Promise<void>;
}

/**
 * One custom order. As a draft: the AI designs in frames (generate more, choose one) and
 * Publish. Published: the masters' offers as cards and Accept. Accepted: pay the deposit.
 */
export class CommissionView extends BoardView {
  override readonly closable = true;
  readonly size = "piece" as const;
  readonly title: string;
  private status: UiText | null = null;
  private offerId: Id | null = null;
  private busy = false;
  // What changes while the AI generates a design (it can take a minute and each one spends a real image).
  private generateButton: UiButton | null = null;
  private publishButton: UiButton | null = null;
  private readonly chooseButtons: UiButton[] = [];
  private generatingNotice: UiText | null = null;
  private loadingCard: UiShowable | null = null;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly request: CustomRequest,
    private readonly maxDesigns: number,
    private readonly depositPercent: number,
    private readonly act: CommissionActions,
  ) {
    super();
    this.title = request.title;
    this.offerId = request.offers.find((offer) => offer.status === "SENT")?.id ?? null;
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large");
    const about = kit.column("small");
    about.add(kit.note(this.i18n.tx(`status.customRequest.${this.request.status}`), "success"));
    about.add(kit.text(this.request.description, true));
    if (this.request.offeredPrice) about.add(kit.note(`${this.i18n.t("custom.fieldPrice")}: ${this.format.money(this.request.offeredPrice, this.request.currency)}`));
    column.add(about);

    const status = this.request.status;
    if (status === "DRAFT" || status === "GENERATING") column.add(this.designs(kit));
    else if (status === "PUBLISHED" || status === "WITH_OFFERS") column.add(this.offers(kit));
    else if (status === "ACCEPTED") column.add(kit.text(this.i18n.t("custom.acceptedNote", { percent: this.depositPercent })));
    if (status !== "DRAFT" && this.selectedDesign()) column.add(kit.picture(this.selectedDesign()!, this.i18n.t("custom.chosen")));

    this.status = kit.note("", "error");
    this.status.setVisible(false);
    column.add(this.status);
    column.add(kit.link(`← ${this.i18n.t("custom.title")}`, () => this.act.back(), "ink"));
    return column;
  }

  override actions({ kit }: BoardContext): UiButton[] {
    const status = this.request.status;
    if (status === "DRAFT") {
      this.generateButton = kit.button(this.generateLabel(), () => void this.generate(), "secondary");
      this.generateButton.setEnabled(this.canGenerate());
      this.publishButton = kit.button(this.i18n.t("custom.publish"), () => void this.run(() => this.act.publish()));
      return [this.generateButton, this.publishButton];
    }
    if (status === "PUBLISHED" || status === "WITH_OFFERS") {
      const accept = kit.button(this.i18n.t("custom.accept"), () => void this.run(() => this.act.accept(this.offerId!)));
      accept.setEnabled(this.offerId !== null);
      return [accept];
    }
    if (status === "ACCEPTED") return [kit.button(this.i18n.t("shop.payDeposit"), () => void this.run(() => this.act.payDeposit()))];
    return [];
  }

  /** The AI proposals in frames; the chosen one is marked, the others can be chosen. */
  private designs(kit: UiKit): UiNode {
    const block = kit.column("medium");
    block.add(kit.section(this.i18n.t("custom.designs")));
    block.add(kit.note(this.i18n.t("custom.designsLead", { max: this.maxDesigns })));
    // A finished design is a picture (an URL or a data: URI); a failed one says why instead of a broken image.
    const shown = this.request.designs.filter((design) => design.status === "FAILED" || design.imageUrl);
    this.generatingNotice = kit.note(this.i18n.t("custom.generatingNotice"));
    this.generatingNotice.setVisible(false);
    block.add(this.generatingNotice);
    const row: UiBox = kit.row("medium");
    for (const design of shown) {
      const frame = kit.column("small");
      if (design.status === "FAILED" || !design.imageUrl) {
        frame.add(kit.note(DesignFailureText.of(this.i18n, design), "error"));
        row.add(frame);
        continue;
      }
      frame.add(kit.picture(design.imageUrl));
      if (design.isSelected) frame.add(kit.note(`✓ ${this.i18n.t("custom.chosen")}`, "success"));
      else {
        const choose = kit.button(this.i18n.t("custom.choose"), () => void this.run(() => this.act.selectDesign(design.id)), "secondary");
        this.chooseButtons.push(choose);
        frame.add(choose);
      }
      row.add(frame);
    }
    this.loadingCard = kit.loadingPicture(this.i18n.t("custom.generatingCard"));
    row.add(this.loadingCard);
    block.add(row);
    return block;
  }

  private offers(kit: UiKit): UiNode {
    const block = kit.column("medium");
    block.add(kit.section(this.i18n.t("custom.offers")));
    const open = this.request.offers.filter((offer) => offer.status === "SENT");
    if (!open.length) {
      block.add(kit.text(this.i18n.t("custom.noOffers"), true));
      return block;
    }
    const current = open.find((offer) => offer.id === this.offerId) ?? null;
    block.add(kit.choice(open, current, (offer) => [offer.masterName, this.offerLines(offer)], (offer) => (this.offerId = offer.id)));
    return block;
  }

  private offerLines(offer: CustomOffer): string[] {
    const lines = [`${this.format.money(offer.price, offer.currency)} · ${this.i18n.t("custom.days", { days: offer.estimatedDays })}`];
    if (offer.message) lines.push(offer.message);
    return lines;
  }

  private selectedDesign(): string | null {
    return this.request.designs.find((design) => design.isSelected)?.imageUrl ?? null;
  }

  /** One design at a time: the board says it is working until the request ends (a failure shows its reason). */
  private async generate(): Promise<void> {
    if (this.busy || !this.canGenerate()) return;
    this.setGenerating(true);
    await this.run(() => this.act.generate());
    this.setGenerating(false);
  }

  private setGenerating(on: boolean): void {
    this.generateButton?.setLabel(on ? this.i18n.t("custom.generating") : this.generateLabel());
    this.generateButton?.setEnabled(!on && this.canGenerate());
    this.publishButton?.setEnabled(!on);
    this.chooseButtons.forEach((button) => button.setEnabled(!on));
    this.generatingNotice?.setVisible(on);
    this.loadingCard?.setVisible(on);
  }

  private canGenerate(): boolean {
    return this.request.designs.length < this.maxDesigns;
  }

  private generateLabel(): string {
    return this.i18n.t("custom.generate", { count: this.request.designs.length + 1, max: this.maxDesigns });
  }

  private async run(step: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.status?.setVisible(false);
    try {
      await step();
    } catch (error) {
      this.status?.setText(ErrorText.of(this.i18n, error));
      this.status?.setVisible(true);
    } finally {
      this.busy = false;
    }
  }
}
