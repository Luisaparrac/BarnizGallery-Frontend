import type { Id } from "../../domain/common";
import type { CustomRequest, CustomRequestInput, OfferInput } from "../../domain/customOrder";

export interface CustomOrderService {
  create(input: CustomRequestInput): Promise<CustomRequest>;
  update(id: Id, input: CustomRequestInput): Promise<CustomRequest>;
  /** Asks the AI for one more design (up to the limit in the settings). */
  generateDesign(id: Id): Promise<CustomRequest>;
  selectDesign(id: Id, designId: Id): Promise<CustomRequest>;
  publish(id: Id): Promise<CustomRequest>;
  cancel(id: Id): Promise<CustomRequest>;
  listMine(): Promise<CustomRequest[]>;
  get(id: Id): Promise<CustomRequest>;
  /** Customer accepts one offer; returns the request and the id of the deposit order. */
  acceptOffer(id: Id, offerId: Id): Promise<{ request: CustomRequest; orderId: Id }>;
  rejectOffer(id: Id, offerId: Id): Promise<CustomRequest>;
  /** Artisan: open requests (view v_open_custom_requests). */
  listOpen(): Promise<CustomRequest[]>;
  sendOffer(id: Id, offer: OfferInput): Promise<CustomRequest>;
  withdrawOffer(id: Id, offerId: Id): Promise<CustomRequest>;
  /** Artisan: requests the artisan has sent offers to, with their current status. */
  listAccepted(): Promise<CustomRequest[]>;
  /** Artisan: declines a request addressed to them or open to all (it leaves their "new" list). */
  decline(id: Id, reason: string | null): Promise<void>;
  /** Artisan: the requests the artisan declined, with the reason. */
  listDeclined(): Promise<CustomRequest[]>;
}
