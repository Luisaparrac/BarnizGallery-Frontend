import type { Id } from "../../domain/common";
import type { InteractionInput, Recommendation, RecommendationStrategy, TasteProfile } from "../../domain/taste";
import type { Address, AddressInput, ProfileUpdate, User } from "../../domain/user";
import type { ProfileService } from "../contracts/ProfileService";
import { HttpClient } from "./HttpClient";

export class ApiProfileService implements ProfileService {
  private readonly http = HttpClient.shared;

  updateProfile(update: ProfileUpdate): Promise<User> {
    return this.http.patch<User>("/api/users/me", update);
  }

  getTasteProfile(): Promise<TasteProfile | null> {
    return this.http.get<TasteProfile | null>("/api/users/me/taste-profile");
  }

  async saveTasteProfile(profile: TasteProfile): Promise<void> {
    await this.http.put("/api/users/me/taste-profile", profile);
  }

  computeRecommendations(strategy: RecommendationStrategy = "hybrid"): Promise<Recommendation[]> {
    return this.http.post<Recommendation[]>(`/api/users/me/recommendations?strategy=${strategy}`);
  }

  recommendForVisitor(profile: TasteProfile): Promise<Recommendation[]> {
    return this.http.post<Recommendation[]>("/api/recommendations/preview", profile);
  }

  async recordInteraction(input: InteractionInput): Promise<void> {
    await this.http.post("/api/interactions", input);
  }

  listAddresses(): Promise<Address[]> {
    return this.http.get<Address[]>("/api/users/me/addresses");
  }

  saveAddress(address: AddressInput, id?: Id): Promise<Address> {
    return id ? this.http.put<Address>(`/api/users/me/addresses/${id}`, address) : this.http.post<Address>("/api/users/me/addresses", address);
  }

  deleteAddress(id: Id): Promise<void> {
    return this.http.delete(`/api/users/me/addresses/${id}`);
  }
}
