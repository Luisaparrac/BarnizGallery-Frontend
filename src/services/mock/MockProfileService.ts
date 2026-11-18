import type { Id } from "../../domain/common";
import type { InteractionInput, Recommendation, RecommendationStrategy, TasteProfile } from "../../domain/taste";
import type { Address, AddressInput, ProfileUpdate, User } from "../../domain/user";
import { TokenStore } from "../api/TokenStore";
import type { ProfileService } from "../contracts/ProfileService";
import { MockDatabase } from "./MockDatabase";
import { recommender } from "./MockRecommender";
import { rules } from "./MockRules";
import { copy, latency, MockSession } from "./MockSession";
import { views } from "./MockViews";

export class MockProfileService implements ProfileService {
  private get db() {
    return MockDatabase.instance;
  }

  async updateProfile(update: ProfileUpdate): Promise<User> {
    await latency();
    const user = MockSession.requireUser();
    Object.assign(user, Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined)));
    this.db.audit("users", user.id, "U", user.id, "Perfil actualizado");
    this.db.save();
    const result = views.user(user);
    const session = TokenStore.load();
    if (session) TokenStore.save({ ...session, user: result });
    return copy(result);
  }

  async getTasteProfile(): Promise<TasteProfile | null> {
    await latency();
    const user = MockSession.requireUser();
    return copy(this.db.tables.tastes.find((row) => row.userId === user.id)?.profile ?? null);
  }

  async saveTasteProfile(profile: TasteProfile): Promise<void> {
    await latency();
    const user = MockSession.requireUser();
    const row = this.db.tables.tastes.find((entry) => entry.userId === user.id);
    if (row) {
      row.profile = profile;
      row.updatedAt = this.db.now();
    } else {
      this.db.tables.tastes.push({ userId: user.id, profile, updatedAt: this.db.now() });
    }
    this.db.save();
  }

  async computeRecommendations(strategy: RecommendationStrategy = "hybrid"): Promise<Recommendation[]> {
    await latency();
    const user = MockSession.requireUser();
    const profile = this.db.tables.tastes.find((row) => row.userId === user.id)?.profile ?? null;
    const result = recommender.recommend(profile, user.id, strategy);
    this.db.tables.recommendations = [
      ...this.db.tables.recommendations.filter((row) => row.userId !== user.id),
      ...result.map((entry) => ({ ...entry, id: this.db.nextId("recommendations"), userId: user.id })),
    ];
    this.db.save();
    return copy(result);
  }

  async recommendForVisitor(profile: TasteProfile): Promise<Recommendation[]> {
    await latency();
    return copy(recommender.recommend(profile, null, "profile"));
  }

  async recordInteraction(input: InteractionInput): Promise<void> {
    const user = MockSession.currentUser();
    if (!user) return;
    rules.recordInteraction(user.id, input);
    this.db.save();
  }

  async listAddresses(): Promise<Address[]> {
    await latency();
    const user = MockSession.requireUser();
    return copy(this.db.tables.addresses.filter((row) => row.userId === user.id).map(({ userId: _user, ...address }) => address));
  }

  async saveAddress(address: AddressInput, id?: Id): Promise<Address> {
    await latency();
    const user = MockSession.requireUser();
    const list = this.db.tables.addresses;
    const mine = list.filter((row) => row.userId === user.id);
    const isDefault = address.isDefault || mine.length === 0 || (mine.length === 1 && mine[0].id === id);
    if (isDefault) mine.forEach((row) => (row.isDefault = false));
    let row = id ? mine.find((entry) => entry.id === id) : undefined;
    if (row) Object.assign(row, address, { isDefault });
    else {
      row = { ...address, isDefault, id: this.db.nextId("addresses"), userId: user.id };
      list.push(row);
    }
    this.db.save();
    const { userId: _user, ...result } = row;
    return copy(result);
  }

  async deleteAddress(id: Id): Promise<void> {
    await latency();
    const user = MockSession.requireUser();
    this.db.tables.addresses = this.db.tables.addresses.filter((row) => !(row.id === id && row.userId === user.id));
    this.db.save();
  }
}
