import type { Id } from "../../domain/common";
import type { InteractionInput, Recommendation, RecommendationStrategy, TasteProfile } from "../../domain/taste";
import type { Address, AddressInput, ProfileUpdate, User } from "../../domain/user";

export interface ProfileService {
  updateProfile(update: ProfileUpdate): Promise<User>;
  getTasteProfile(): Promise<TasteProfile | null>;
  saveTasteProfile(profile: TasteProfile): Promise<void>;
  computeRecommendations(strategy?: RecommendationStrategy): Promise<Recommendation[]>;
  /** Recommendations for a visitor without account, from the questionnaire only. */
  recommendForVisitor(profile: TasteProfile): Promise<Recommendation[]>;
  recordInteraction(input: InteractionInput): Promise<void>;
  listAddresses(): Promise<Address[]>;
  saveAddress(address: AddressInput, id?: Id): Promise<Address>;
  deleteAddress(id: Id): Promise<void>;
}
