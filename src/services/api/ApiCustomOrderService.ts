import type { Id } from "../../domain/common";
import type { CustomRequest, CustomRequestInput, OfferInput } from "../../domain/customOrder";
import type { CustomOrderService } from "../contracts/CustomOrderService";
import { HttpClient } from "./HttpClient";

export class ApiCustomOrderService implements CustomOrderService {
  private readonly http = HttpClient.shared;
  private readonly base = "/api/custom-requests";

  create(input: CustomRequestInput): Promise<CustomRequest> {
    return this.http.post<CustomRequest>(this.base, input);
  }

  update(id: Id, input: CustomRequestInput): Promise<CustomRequest> {
    return this.http.put<CustomRequest>(`${this.base}/${id}`, input);
  }

  generateDesign(id: Id): Promise<CustomRequest> {
    return this.http.post<CustomRequest>(`${this.base}/${id}/designs`);
  }

  selectDesign(id: Id, designId: Id): Promise<CustomRequest> {
    return this.http.post<CustomRequest>(`${this.base}/${id}/designs/${designId}/select`);
  }

  publish(id: Id): Promise<CustomRequest> {
    return this.http.post<CustomRequest>(`${this.base}/${id}/publish`);
  }

  cancel(id: Id): Promise<CustomRequest> {
    return this.http.post<CustomRequest>(`${this.base}/${id}/cancel`);
  }

  listMine(): Promise<CustomRequest[]> {
    return this.http.get<CustomRequest[]>(this.base, { mine: true });
  }

  get(id: Id): Promise<CustomRequest> {
    return this.http.get<CustomRequest>(`${this.base}/${id}`);
  }

  acceptOffer(id: Id, offerId: Id): Promise<{ request: CustomRequest; orderId: Id }> {
    return this.http.post(`${this.base}/${id}/offers/${offerId}/accept`);
  }

  rejectOffer(id: Id, offerId: Id): Promise<CustomRequest> {
    return this.http.post<CustomRequest>(`${this.base}/${id}/offers/${offerId}/reject`);
  }

  listOpen(): Promise<CustomRequest[]> {
    return this.http.get<CustomRequest[]>("/api/artisan/custom-requests/open");
  }

  sendOffer(id: Id, offer: OfferInput): Promise<CustomRequest> {
    return this.http.post<CustomRequest>(`${this.base}/${id}/offers`, offer);
  }

  withdrawOffer(id: Id, offerId: Id): Promise<CustomRequest> {
    return this.http.post<CustomRequest>(`${this.base}/${id}/offers/${offerId}/withdraw`);
  }

  listAccepted(): Promise<CustomRequest[]> {
    return this.http.get<CustomRequest[]>("/api/artisan/custom-requests/accepted");
  }

  decline(id: Id, reason: string | null): Promise<void> {
    return this.http.post<void>(`${this.base}/${id}/decline`, { reason });
  }

  listDeclined(): Promise<CustomRequest[]> {
    return this.http.get<CustomRequest[]>("/api/artisan/custom-requests/declined");
  }
}
